import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSalesChartData,
  SOURCE_SERIES_META,
  FULFILLMENT_SERIES_META,
  isCompletedSale
} from '../src/utils/buildSalesChartData.js';

const COMPLETED_ORDERS_WITH_TIMESTAMPS = [
  // 2026-11-27T01:15:00Z = 09:15 AM Asia/Manila (hour 9)
  { id: 'S1', date: '2026-11-27', completed_at: '2026-11-27T01:15:00.000Z', source: 'Walk-in', service: 'Walk-in', status: 'Completed', paymentStatus: 'Paid', amount: 70 },
  // 2026-11-27T02:30:00Z = 10:30 AM Asia/Manila (hour 10) — Unpaid completed delivery!
  { id: 'S2', date: '2026-11-27', completed_at: '2026-11-27T02:30:00.000Z', source: 'Messenger', service: 'Delivery', status: 'Delivered', paymentStatus: 'Unpaid', amount: 175 },
  // 2026-11-27T06:00:00Z = 02:00 PM Asia/Manila (hour 14)
  { id: 'S3', date: '2026-11-27', completed_at: '2026-11-27T06:00:00.000Z', source: 'Phone', service: 'Delivery', status: 'Delivered', paymentStatus: 'Paid', amount: 105 },
  // 2026-11-27T09:45:00Z = 05:45 PM Asia/Manila (hour 17)
  { id: 'S4', date: '2026-11-27', completed_at: '2026-11-27T09:45:00.000Z', source: 'Online', service: 'Pickup', status: 'Completed', paymentStatus: 'Paid', amount: 140 },
  // Pending & Cancelled orders (MUST be excluded from completed sales chart)
  { id: 'P1', date: '2026-11-27', created_at: '2026-11-27T01:20:00.000Z', source: 'Walk-in', service: 'Walk-in', status: 'Pending Confirmation', paymentStatus: 'Unpaid', amount: 300 },
  { id: 'P2', date: '2026-11-27', created_at: '2026-11-27T03:00:00.000Z', source: 'Messenger', service: 'Delivery', status: 'Preparing', paymentStatus: 'Unpaid', amount: 250 },
  { id: 'P3', date: '2026-11-27', created_at: '2026-11-27T04:00:00.000Z', source: 'Online', service: 'Delivery', status: 'Out for Delivery', paymentStatus: 'Paid', amount: 200 },
  { id: 'C1', date: '2026-11-27', completed_at: '2026-11-27T05:00:00.000Z', source: 'Phone', service: 'Delivery', status: 'Cancelled', paymentStatus: 'Paid', amount: 500 }
];

test('1-6, 9-12, 14: Daily hourly revenue & order-count by Order Source in Asia/Manila with completed-only filtering', () => {
  const revChart = buildSalesChartData({
    orders: COMPLETED_ORDERS_WITH_TIMESTAMPS,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    metric: 'revenue',
    todayStr: '2026-11-27'
  });

  // Always 24 hourly buckets (12 AM to 11 PM)
  assert.equal(revChart.buckets.length, 24);
  assert.equal(revChart.buckets[0].label, '12 AM');
  assert.equal(revChart.buckets[23].label, '11 PM');
  assert.equal(revChart.hasHourlyTimestamps, true);
  assert.equal(revChart.hasMissingTimestamps, false);

  // Completed sales only (S1 + S2 unpaid + S3 + S4 = 490; excludes P1, P2, P3, C1)
  assert.equal(revChart.totalRevenue, 490);
  assert.equal(revChart.totalOrders, 4);

  // Asia/Manila hour mapping & per-source revenue series
  assert.equal(revChart.buckets[9].bySeries['Walk-in'].revenue, 70);
  assert.equal(revChart.buckets[10].bySeries['Messenger'].revenue, 175); // unpaid completed sale included
  assert.equal(revChart.buckets[14].bySeries['Phone'].revenue, 105);
  assert.equal(revChart.buckets[17].bySeries['Online'].revenue, 140);

  // Order count check
  const countChart = buildSalesChartData({
    orders: COMPLETED_ORDERS_WITH_TIMESTAMPS,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    metric: 'orders',
    todayStr: '2026-11-27'
  });
  assert.equal(countChart.buckets[9].bySeries['Walk-in'].orders, 1);
  assert.equal(countChart.buckets[10].bySeries['Messenger'].orders, 1);
  assert.equal(countChart.buckets[14].bySeries['Phone'].orders, 1);
  assert.equal(countChart.buckets[17].bySeries['Online'].orders, 1);

  // Fixed color mapping & Other/Unknown omitted when unused
  assert.equal(SOURCE_SERIES_META['Walk-in'].color, '#E67E22');
  assert.equal(SOURCE_SERIES_META.Messenger.color, '#244EA3');
  assert.equal(SOURCE_SERIES_META.Phone.color, '#7C3AED');
  assert.equal(SOURCE_SERIES_META.Online.color, '#138358');
  assert.equal(revChart.series.some(s => s.key === 'Other / Unknown'), false);
});

test('7-8, 20: Fulfillment Mode separates Pickup and Delivery without double counting across breakdown modes', () => {
  const sourceChart = buildSalesChartData({
    orders: COMPLETED_ORDERS_WITH_TIMESTAMPS,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    todayStr: '2026-11-27'
  });

  const fulfillmentChart = buildSalesChartData({
    orders: COMPLETED_ORDERS_WITH_TIMESTAMPS,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'fulfillment',
    todayStr: '2026-11-27'
  });

  const pickup = fulfillmentChart.series.find(s => s.key === 'Pickup');
  const delivery = fulfillmentChart.series.find(s => s.key === 'Delivery');
  // Pickup = S1 (Walk-in 70) + S4 (Pickup 140) = 210
  // Delivery = S2 (Messenger Delivery 175) + S3 (Phone Delivery 105) = 280
  assert.equal(pickup.totalRevenue, 210);
  assert.equal(pickup.totalOrders, 2);
  assert.equal(delivery.totalRevenue, 280);
  assert.equal(delivery.totalOrders, 2);

  // Zero double-counting across modes
  assert.equal(fulfillmentChart.totalRevenue, sourceChart.totalRevenue);
  assert.equal(fulfillmentChart.totalOrders, sourceChart.totalOrders);
  assert.equal(FULFILLMENT_SERIES_META.Pickup.color, '#138358');
  assert.equal(FULFILLMENT_SERIES_META.Delivery.color, '#244EA3');
});

test('13: Historical records without timestamps keep 24-hour axis without fabricating hourly data', () => {
  const historical = [
    { id: 'AB-1040', date: '2026-10-31', source: 'Walk-in', service: 'Walk-in', status: 'Completed', paymentStatus: 'Paid', amount: 20 }
  ];

  const chart = buildSalesChartData({
    orders: historical,
    period: 'Daily',
    anchorDate: '2026-10-31',
    breakdown: 'source',
    todayStr: '2026-11-27'
  });

  assert.equal(chart.buckets.length, 24);
  assert.equal(chart.hasHourlyTimestamps, false);
  assert.equal(chart.hasMissingTimestamps, true);
  assert.equal(chart.hasPlottedData, false);
  assert.equal(chart.plottedRevenue, 0);
  assert.equal(chart.totalRevenue, 20);
  assert.equal(chart.totalOrders, 1);
  assert.equal(chart.buckets.every(b => b.totalRevenue === 0), true);
});

test('15-19: Weekly, Monthly, Yearly, All Time, and Custom date range aggregations', () => {
  const multiDateOrders = [
    { id: 'M1', date: '2026-10-25', source: 'Walk-in', service: 'Walk-in', status: 'Completed', paymentStatus: 'Paid', amount: 50 },
    { id: 'M2', date: '2026-10-31', source: 'Messenger', service: 'Delivery', status: 'Delivered', paymentStatus: 'Unpaid', amount: 150 },
    { id: 'M3', date: '2026-11-10', source: 'Online', service: 'Pickup', status: 'Completed', paymentStatus: 'Paid', amount: 100 }
  ];

  const weekly = buildSalesChartData({ orders: multiDateOrders, period: 'Weekly', anchorDate: '2026-10-31', todayStr: '2026-11-27' });
  assert.equal(weekly.buckets.length, 7);
  assert.equal(weekly.totalRevenue, 200);
  assert.equal(weekly.buckets[0].bySeries['Walk-in'].revenue, 50);
  assert.equal(weekly.buckets[6].bySeries['Messenger'].revenue, 150);

  const monthly = buildSalesChartData({ orders: multiDateOrders, period: 'Monthly', anchorDate: '2026-10-15', todayStr: '2026-11-27' });
  assert.equal(monthly.buckets.length, 31);
  assert.equal(monthly.totalRevenue, 200);

  const yearly = buildSalesChartData({ orders: multiDateOrders, period: 'Yearly', anchorDate: '2026-10-15', todayStr: '2026-11-27' });
  assert.equal(yearly.buckets.length, 12);
  assert.equal(yearly.buckets[9].totalRevenue, 200);
  assert.equal(yearly.buckets[10].totalRevenue, 100);

  const allTime = buildSalesChartData({ orders: multiDateOrders, period: 'All Time', anchorDate: '2026-11-27', todayStr: '2026-11-27' });
  assert.equal(allTime.buckets.length, 2);
  assert.equal(allTime.totalRevenue, 300);

  const custom = buildSalesChartData({
    orders: multiDateOrders,
    period: 'Custom',
    customStart: '2026-10-30',
    customEnd: '2026-11-10',
    todayStr: '2026-11-27'
  });
  assert.equal(custom.totalRevenue, 250);
  assert.equal(custom.totalOrders, 2);
});

test('isCompletedSale excludes pending, preparing, ready, out-for-delivery, and cancelled orders', () => {
  assert.equal(isCompletedSale({ status: 'Completed' }), true);
  assert.equal(isCompletedSale({ status: 'Delivered' }), true);
  assert.equal(isCompletedSale({ status: 'Picked Up' }), true);
  assert.equal(isCompletedSale({ status: 'Pending Confirmation' }), false);
  assert.equal(isCompletedSale({ status: 'Confirmed' }), false);
  assert.equal(isCompletedSale({ status: 'Preparing' }), false);
  assert.equal(isCompletedSale({ status: 'Ready' }), false);
  assert.equal(isCompletedSale({ status: 'Out for Delivery' }), false);
  assert.equal(isCompletedSale({ status: 'Cancelled' }), false);
});
