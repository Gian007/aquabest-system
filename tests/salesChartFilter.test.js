import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesChartData } from '../src/utils/buildSalesChartData.js';
import {
  ALL_SERIES_KEY,
  getAvailableSeriesOptions,
  filterChartSeriesView
} from '../src/utils/salesChartFilter.js';

const SAMPLE_ORDERS = [
  { id: 'S1', date: '2026-11-27', completed_at: '2026-11-27T08:10:00+08:00', source: 'Walk-in', service: 'Walk-in', status: 'Completed', paymentStatus: 'Paid', amount: 1105 },
  { id: 'S2', date: '2026-11-27', completed_at: '2026-11-27T09:15:00+08:00', source: 'Messenger', service: 'Delivery', status: 'Delivered', paymentStatus: 'Paid', amount: 1130 },
  { id: 'S3', date: '2026-11-27', completed_at: '2026-11-27T10:30:00+08:00', source: 'Phone', service: 'Pickup & Delivery', status: 'Delivered', paymentStatus: 'Unpaid', amount: 810 },
  { id: 'S4', date: '2026-11-27', completed_at: '2026-11-27T11:45:00+08:00', source: 'Online', service: 'Pickup', status: 'Completed', paymentStatus: 'Paid', amount: 1375 },
  // Excluded statuses must never enter completed chart totals
  { id: 'S5', date: '2026-11-27', created_at: '2026-11-27T12:00:00+08:00', source: 'Online', service: 'Delivery', status: 'Pending Confirmation', paymentStatus: 'Unpaid', amount: 500 },
  { id: 'S6', date: '2026-11-27', created_at: '2026-11-27T12:15:00+08:00', source: 'Walk-in', service: 'Walk-in', status: 'Cancelled', paymentStatus: 'Paid', amount: 700 }
];

test('Order Source series controls expose All plus color-coded Walk-in, Messenger, Phone, Online', () => {
  const chart = buildSalesChartData({
    orders: SAMPLE_ORDERS,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    metric: 'revenue',
    todayStr: '2026-11-27'
  });

  const options = getAvailableSeriesOptions(chart);
  assert.deepEqual(options.map(o => o.key), ['all', 'Walk-in', 'Messenger', 'Phone', 'Online']);
  assert.equal(options.find(o => o.key === 'Walk-in').color, '#E67E22');
  assert.equal(options.find(o => o.key === 'Messenger').color, '#244EA3');
  assert.equal(options.find(o => o.key === 'Phone').color, '#7C3AED');
  assert.equal(options.find(o => o.key === 'Online').color, '#138358');

  // All view combines every source accurately
  const allView = filterChartSeriesView(chart, ALL_SERIES_KEY, 'revenue');
  assert.equal(allView.isFiltered, false);
  assert.equal(allView.visibleSeries.length, 4);
  assert.equal(allView.displayedRevenue, 4420);
  assert.equal(allView.displayedOrders, 4);

  // Isolating each source individually updates visibleSeries, summary, and max scale
  for (const [key, expectedRev] of [['Walk-in', 1105], ['Messenger', 1130], ['Phone', 810], ['Online', 1375]]) {
    const view = filterChartSeriesView(chart, key, 'revenue');
    assert.equal(view.isFiltered, true);
    assert.equal(view.visibleSeries.length, 1);
    assert.equal(view.visibleSeries[0].key, key);
    assert.equal(view.displayedRevenue, expectedRev);
    assert.equal(view.displayedOrders, 1);
    assert.equal(view.seriesMaxVal, expectedRev);
  }
});

test('Fulfillment Mode exposes All, Pickup, Delivery and isolates cleanly without double counting', () => {
  const chart = buildSalesChartData({
    orders: SAMPLE_ORDERS,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'fulfillment',
    metric: 'revenue',
    todayStr: '2026-11-27'
  });

  const options = getAvailableSeriesOptions(chart);
  assert.deepEqual(options.map(o => o.key), ['all', 'Pickup', 'Delivery']);

  const allView = filterChartSeriesView(chart, ALL_SERIES_KEY, 'revenue');
  const pickupView = filterChartSeriesView(chart, 'Pickup', 'revenue');
  const deliveryView = filterChartSeriesView(chart, 'Delivery', 'revenue');

  assert.equal(allView.displayedRevenue, 4420);
  assert.equal(pickupView.displayedRevenue, 2480); // S1 (1105) + S4 (1375)
  assert.equal(deliveryView.displayedRevenue, 1940); // S2 (1130) + S3 (810)
  assert.equal(pickupView.displayedRevenue + deliveryView.displayedRevenue, allView.displayedRevenue);
  assert.equal(pickupView.displayedOrders + deliveryView.displayedOrders, allView.displayedOrders);

  // Selecting a non-existent source key after switching to fulfillment safely falls back to All
  const fallbackView = filterChartSeriesView(chart, 'Messenger', 'revenue');
  assert.equal(fallbackView.activeKey, ALL_SERIES_KEY);
  assert.equal(fallbackView.visibleSeries.length, 2);
});

test('Order Count metric calculates integer counts and handles empty data and large values safely', () => {
  const countChart = buildSalesChartData({
    orders: SAMPLE_ORDERS,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    metric: 'orders',
    todayStr: '2026-11-27'
  });
  const countView = filterChartSeriesView(countChart, 'Walk-in', 'orders');
  assert.equal(countView.displayedOrders, 1);
  assert.equal(countView.seriesMaxVal, 1);

  // Empty period handling
  const emptyChart = buildSalesChartData({
    orders: [],
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    metric: 'revenue',
    todayStr: '2026-11-27'
  });
  const emptyView = filterChartSeriesView(emptyChart, ALL_SERIES_KEY, 'revenue');
  assert.equal(emptyView.displayedRevenue, 0);
  assert.equal(emptyView.displayedOrders, 0);
  assert.equal(emptyView.hasVisibleData, false);

  // Large currency values & Other/Unknown source
  const largeChart = buildSalesChartData({
    orders: [
      { id: 'BIG1', date: '2026-11-27', completed_at: '2026-11-27T09:00:00+08:00', source: 'Corporate Partner Channel', service: 'Delivery', status: 'Completed', paymentStatus: 'Paid', amount: 125450 }
    ],
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    metric: 'revenue',
    todayStr: '2026-11-27'
  });
  const opts = getAvailableSeriesOptions(largeChart);
  assert.ok(opts.some(o => o.key === 'Other / Unknown'));
  const bigView = filterChartSeriesView(largeChart, 'Other / Unknown', 'revenue');
  assert.equal(bigView.displayedRevenue, 125450);
  assert.equal(bigView.seriesMaxVal, 125450);
});
