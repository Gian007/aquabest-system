import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ORDERS, INITIAL_STOCK } from '../src/data/managerDemo.js';
import { buildOwnerDashboardData, resolveDashboardRange } from '../src/utils/buildOwnerDashboardData.js';

test('date range caps future dates to todayStr', () => {
  const range = resolveDashboardRange({
    period: 'Monthly',
    anchorDate: '2026-11-27',
    todayStr: '2026-11-27'
  });
  assert.equal(range.startDate, '2026-11-01');
  assert.equal(range.endDate, '2026-11-27');
});

test('custom date range filters orders and excludes cancelled from sales totals', () => {
  const data = buildOwnerDashboardData({
    orders: [
      ...INITIAL_ORDERS,
      { id: 'AB-9999', date: '2026-10-31', amount: 500, status: 'Cancelled', paymentStatus: 'Paid', items: [{ sizeId: 'round5', quantity: 5 }] }
    ],
    stock: INITIAL_STOCK,
    period: 'Custom',
    customStart: '2026-10-31',
    customEnd: '2026-10-31',
    todayStr: '2026-11-27'
  });

  assert.equal(data.financials.grossSales, 370);
  assert.equal(data.financials.totalOrders, 4);
  assert.equal(data.financials.verifiedCollected, 125);
  assert.equal(data.financials.outstandingBalance, 245);
});

test('gallon activity separates completed refills from pending refills and new container sales', () => {
  const data = buildOwnerDashboardData({
    orders: [
      { id: 'O1', date: '2026-11-27', amount: 70, status: 'Pending Confirmation', paymentStatus: 'Unpaid', ownership: 'own', items: [{ sizeId: 'round5', quantity: 2 }] },
      { id: 'O2', date: '2026-11-27', amount: 105, status: 'Completed', paymentStatus: 'Paid', ownership: 'own', items: [{ sizeId: 'round5', quantity: 3 }] },
      { id: 'O3', date: '2026-11-27', amount: 200, status: 'Completed', paymentStatus: 'Paid', ownership: 'store', arrangement: 'purchase', items: [{ sizeId: 'round5', quantity: 4 }] },
      { id: 'O4', date: '2026-11-27', amount: 70, status: 'Delivered', paymentStatus: 'Paid', ownership: 'store', arrangement: 'returnable', items: [{ sizeId: 'slim5', quantity: 2 }] }
    ],
    trips: [{ id: 'T1', emptiesCollected: 3 }],
    stock: INITIAL_STOCK,
    stockLog: [{ id: 'S1', type: 'IN', quantity: 2, reason: 'Customer bottle return', time: '2026-11-27' }],
    period: 'Daily',
    anchorDate: '2026-11-27',
    todayStr: '2026-11-27'
  });

  // O2 (3) + O4 (2) = 5 completed refills; O1 is pending, O3 is new container purchase
  assert.equal(data.gallons.gallonsRefilled, 5);
  assert.equal(data.gallons.newGallonsSold, 4);
  assert.equal(data.gallons.gallonsBorrowed, 2);
  assert.equal(data.gallons.gallonsReturned, 5);
  assert.equal(data.gallons.outstandingBorrowed, null);
  assert.equal(data.gallons.totalAvailableStock, 124);
});

test('daily chart does not invent hourly points when timestamps are absent', () => {
  const data = buildOwnerDashboardData({
    orders: INITIAL_ORDERS,
    period: 'Daily',
    anchorDate: '2026-10-31',
    todayStr: '2026-11-27'
  });
  assert.equal(data.chart.hasHourlyTimestamps, false);
  assert.equal(data.chart.points.length, 0);
});

test('daily chart aggregates 24 hourly buckets when valid timestamps exist', () => {
  const data = buildOwnerDashboardData({
    orders: [
      { id: 'H1', date: '2026-11-27', time: '09:15', amount: 70, status: 'Completed', paymentStatus: 'Paid' },
      { id: 'H2', date: '2026-11-27', time: '14:30', amount: 105, status: 'Completed', paymentStatus: 'Paid' }
    ],
    period: 'Daily',
    anchorDate: '2026-11-27',
    todayStr: '2026-11-27'
  });
  assert.equal(data.chart.hasHourlyTimestamps, true);
  assert.equal(data.chart.points.length, 24);
  assert.equal(data.chart.points[9].revenue, 70);
  assert.equal(data.chart.points[9].orders, 1);
  assert.equal(data.chart.points[14].revenue, 105);
  assert.equal(data.chart.points[14].orders, 1);
});

test('weekly, monthly, yearly, and all-time chart aggregations produce accurate buckets', () => {
  const orders = [
    { id: 'W1', date: '2026-10-25', amount: 100, status: 'Completed', paymentStatus: 'Paid' },
    { id: 'W2', date: '2026-10-31', amount: 200, status: 'Completed', paymentStatus: 'Paid' }
  ];

  const weekly = buildOwnerDashboardData({ orders, period: 'Weekly', anchorDate: '2026-10-31', todayStr: '2026-11-27' });
  assert.equal(weekly.chart.points.length, 7);
  assert.equal(weekly.chart.points[0].revenue, 100);
  assert.equal(weekly.chart.points[6].revenue, 200);

  const monthly = buildOwnerDashboardData({ orders, period: 'Monthly', anchorDate: '2026-10-15', todayStr: '2026-11-27' });
  assert.equal(monthly.chart.points.length, 31);
  assert.equal(monthly.chart.points[30].orders, 1);

  const yearly = buildOwnerDashboardData({ orders, period: 'Yearly', anchorDate: '2026-10-15', todayStr: '2026-11-27' });
  assert.equal(yearly.chart.points.length, 11); // Jan..Nov 2026 (no Dec future month)
  assert.equal(yearly.chart.points[9].revenue, 300);

  const allTime = buildOwnerDashboardData({ orders, period: 'All Time', anchorDate: '2026-11-27', todayStr: '2026-11-27' });
  assert.equal(allTime.chart.points.length, 1);
  assert.equal(allTime.chart.points[0].label, '2026-10');
});
