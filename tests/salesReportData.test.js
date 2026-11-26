import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ORDERS } from '../src/data/managerDemo.js';
import { buildSalesReportData } from '../src/utils/buildSalesReportData.js';
import { getPeriodRange, shiftAnchorDate } from '../src/utils/reportDateUtils.js';

test('October 31 demo totals match the four recorded orders', () => {
  const report = buildSalesReportData({
    orders: INITIAL_ORDERS,
    expenses: [],
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  assert.equal(report.grossSales, 370);
  assert.equal(report.verifiedCollected, 125);
  assert.equal(report.outstandingBalance, 245);
  assert.equal(report.totalOrders, 4);
  assert.equal(report.paidOrdersCount, 2);
  assert.equal(report.unpaidOrdersCount, 2);
  assert.equal(report.unknownPaymentOrdersCount, 0);
});

test('cancelled orders stay in the register but do not affect financial totals', () => {
  const report = buildSalesReportData({
    orders: [
      { id: 'A', date: '2026-10-31', amount: 100, paymentStatus: 'Paid', status: 'Cancelled' },
      { id: 'B', date: '2026-10-31', amount: 50, paymentStatus: 'Unpaid', status: 'Confirmed' }
    ],
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  assert.equal(report.grossSales, 50);
  assert.equal(report.verifiedCollected, 0);
  assert.equal(report.outstandingBalance, 50);
  assert.equal(report.cancelledOrdersCount, 1);
  assert.equal(report.transactionsList.length, 2);
  assert.equal(report.receivablesList.length, 1);
});

test('unknown order payment status is not silently counted as unpaid', () => {
  const report = buildSalesReportData({
    orders: [
      { id: 'A', date: '2026-10-31', amount: 80, paymentStatus: '', status: 'Confirmed' }
    ],
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  assert.equal(report.grossSales, 80);
  assert.equal(report.outstandingBalance, 0);
  assert.equal(report.unknownPaymentBalance, 80);
  assert.equal(report.unknownPaymentOrdersCount, 1);
  assert.equal(report.receivablesList.length, 0);
  assert.equal(report.transactionsList[0].paymentStatus, 'Not Recorded');
});

test('legacy active expenses count without assuming they are paid', () => {
  const report = buildSalesReportData({
    orders: INITIAL_ORDERS,
    expenses: [
      { id: 'E1', date: '2026-10-31', amount: 20, active: true, paymentStatus: 'Paid' },
      { id: 'E2', date: '2026-10-31', amount: 30, active: true, paymentStatus: 'Unpaid' },
      { id: 'E3', date: '2026-10-31', amount: 40 },
      { id: 'E4', date: '2026-10-31', amount: 99, active: false, paymentStatus: 'Paid' }
    ],
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  assert.equal(report.recordedExpenses, 90);
  assert.equal(report.paidExpenses, 20);
  assert.equal(report.unpaidExpenses, 30);
  assert.equal(report.unrecordedStatusExpenses, 40);
  assert.equal(report.collectionsAfterPaidExpenses, 105);
  assert.equal(report.expensesList.length, 4);
  assert.equal(report.expensesList.find(expense => expense.id === 'E3').active, true);
});

test('weekly date range correctly crosses month boundaries', () => {
  assert.deepEqual(
    getPeriodRange('Weekly', '2026-08-01', []),
    { startDate: '2026-07-26', endDate: '2026-08-01' }
  );
});

test('All Time includes every order even when the range contains no date records', () => {
  const orders = [
    { id: 'A', date: '2026-01-03', amount: 10, paymentStatus: 'Paid' },
    { id: 'B', date: '2026-03-10', amount: 20, paymentStatus: 'Unpaid' }
  ];
  const report = buildSalesReportData({ orders, period: 'All Time', anchorDate: '2026-01-03' });
  assert.equal(report.grossSales, 30);
  assert.equal(report.totalOrders, 2);
  assert.equal(report.periodOrders.length, 2);
});

test('month-end navigation clamps safely without skipping February', () => {
  assert.equal(shiftAnchorDate('2026-01-31', 'Monthly', 1), '2026-02-28');
  assert.equal(shiftAnchorDate('2026-03-31', 'Monthly', -1), '2026-02-28');
});

test('leap year dates and ranges are handled accurately', () => {
  assert.equal(shiftAnchorDate('2024-01-31', 'Monthly', 1), '2024-02-29');
  assert.deepEqual(
    getPeriodRange('Monthly', '2024-02-15', []),
    { startDate: '2024-02-01', endDate: '2024-02-29' }
  );
  assert.equal(shiftAnchorDate('2024-02-29', 'Yearly', 1), '2025-02-28');
});

test('year-end navigation transitions cleanly between December and January', () => {
  assert.equal(shiftAnchorDate('2026-12-31', 'Daily', 1), '2027-01-01');
  assert.equal(shiftAnchorDate('2027-01-01', 'Daily', -1), '2026-12-31');
  assert.equal(shiftAnchorDate('2026-12-15', 'Monthly', 1), '2027-01-15');
  assert.equal(shiftAnchorDate('2026-01-15', 'Monthly', -1), '2025-12-15');
  assert.equal(shiftAnchorDate('2026-06-15', 'Yearly', 1), '2027-06-15');
});

test('empty records produce zeroed metrics without crashing', () => {
  const weekly = buildSalesReportData({ orders: [], expenses: [], period: 'Weekly', anchorDate: '2026-10-31' });
  assert.equal(weekly.grossSales, 0);
  assert.equal(weekly.totalOrders, 0);
  assert.equal(weekly.collectionsAfterPaidExpenses, 0);

  const allTime = buildSalesReportData({ orders: [], expenses: [], period: 'All Time', anchorDate: '2026-10-31' });
  assert.equal(allTime.grossSales, 0);
  assert.equal(allTime.periodRange.startDate, null);
  assert.equal(allTime.periodRange.endDate, null);
});

test('mixed payment statuses separate Paid, Unpaid, Unknown, and Cancelled accurately', () => {
  const report = buildSalesReportData({
    orders: [
      { id: 'O1', date: '2026-10-31', amount: 100, paymentStatus: 'Paid', status: 'Completed' },
      { id: 'O2', date: '2026-10-31', amount: 75, paymentStatus: 'Unpaid', status: 'Pending' },
      { id: 'O3', date: '2026-10-31', amount: 50, paymentStatus: 'Pending Review', status: 'Confirmed' },
      { id: 'O4', date: '2026-10-31', amount: 200, paymentStatus: 'Paid', status: 'Cancelled' }
    ],
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  assert.equal(report.grossSales, 225);
  assert.equal(report.verifiedCollected, 100);
  assert.equal(report.outstandingBalance, 75);
  assert.equal(report.unknownPaymentBalance, 50);
  assert.equal(report.paidOrdersCount, 1);
  assert.equal(report.unpaidOrdersCount, 1);
  assert.equal(report.unknownPaymentOrdersCount, 1);
  assert.equal(report.cancelledOrdersCount, 1);
});

test('expense date filtering excludes expenses outside the selected period', () => {
  const report = buildSalesReportData({
    orders: [],
    expenses: [
      { id: 'E1', date: '2026-10-31', amount: 150, active: true, paymentStatus: 'Paid' },
      { id: 'E2', date: '2026-11-01', amount: 300, active: true, paymentStatus: 'Paid' },
      { id: 'E3', date: '2026-10-20', amount: 100, active: true, paymentStatus: 'Unpaid' }
    ],
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  assert.equal(report.recordedExpenses, 150);
  assert.equal(report.paidExpenses, 150);
  assert.equal(report.unpaidExpenses, 0);
  assert.equal(report.expensesList.length, 1);
});

test('source and service breakdowns keep Pickup & Delivery distinct from Delivery and Walk-in', () => {
  const report = buildSalesReportData({
    orders: INITIAL_ORDERS,
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  const byService = Object.fromEntries(report.serviceBreakdown.map(s => [s.service, s]));
  assert.equal(byService['Pickup & Delivery'].gross, 70);
  assert.equal(byService['Pickup & Delivery'].orders, 1);
  assert.equal(byService['Delivery'].gross, 280);
  assert.equal(byService['Delivery'].orders, 2);
  assert.equal(byService['Walk-in'].gross, 20);
  assert.equal(byService['Walk-in'].orders, 1);

  const bySource = Object.fromEntries(report.sourceBreakdown.map(s => [s.source, s]));
  assert.equal(bySource['Online'].total, 70);
  assert.equal(bySource['Messenger'].total, 175);
  assert.equal(bySource['Walk-in'].total, 20);
  assert.equal(bySource['Phone'].total, 105);
});

test('orders without paymentMethod are grouped under Not Specified', () => {
  const report = buildSalesReportData({
    orders: INITIAL_ORDERS,
    period: 'Daily',
    anchorDate: '2026-10-31'
  });

  assert.equal(report.paymentBreakdown['Not Specified'].count, 4);
  assert.equal(report.paymentBreakdown['Not Specified'].recorded, 370);
  assert.equal(report.paymentBreakdown['Not Specified'].verified, 125);
  assert.equal(report.paymentBreakdown['Cash'].count, 0);
  assert.equal(report.paymentBreakdown['GCash'].count, 0);
});
