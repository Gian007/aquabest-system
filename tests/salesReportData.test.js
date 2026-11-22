import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ORDERS } from '../src/data/managerDemo.js';
import { buildSalesReportData } from '../src/utils/buildSalesReportData.js';
import { getPeriodRange } from '../src/utils/reportDateUtils.js';

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
