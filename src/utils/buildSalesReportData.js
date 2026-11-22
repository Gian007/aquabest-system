import { DEMO_PRODUCTS } from '../data/managerDemo.js';
import { getPeriodRange, filterByDateRange } from './reportDateUtils.js';

const sumAmounts = records =>
  records.reduce((total, record) => total + (Number(record.amount) || 0), 0);

function classifyPaymentMethod(order) {
  const value = String(order.paymentMethod || order.method || '').trim().toLowerCase();
  if (!value) return 'Not Specified';
  if (value === 'cash') return 'Cash';
  if (value.includes('gcash')) return 'GCash';
  if (value.includes('bank') || value.includes('transfer')) return 'Bank Transfer';
  if (value === 'other') return 'Other';
  return 'Other';
}

function createBreakdown(records, getLabel) {
  const groups = new Map();
  records.forEach(record => {
    const label = getLabel(record) || 'Not Specified';
    if (!groups.has(label)) {
      groups.set(label, { label, count: 0, amount: 0, collected: 0 });
    }
    const group = groups.get(label);
    group.count += 1;
    group.amount += Number(record.amount) || 0;
    if (record.paymentStatus === 'Paid') {
      group.collected += Number(record.amount) || 0;
    }
  });
  return Array.from(groups.values()).sort((a, b) => b.amount - a.amount);
}

export function buildSalesReportData({ orders = [], expenses = [], period = 'Weekly', anchorDate }) {
  const range = getPeriodRange(period, anchorDate, [...orders, ...expenses]);

  const periodOrders = period === 'All Time' ? [...orders] : filterByDateRange(orders, range.startDate, range.endDate);
  const periodExpenses = period === 'All Time' ? [...expenses] : filterByDateRange(expenses, range.startDate, range.endDate);

  const activeOrders = periodOrders.filter(o => o.status !== 'Cancelled');
  const cancelledOrders = periodOrders.filter(o => o.status === 'Cancelled');
  const activeExpenses = periodExpenses.filter(e => e.active !== false);
  const voidedExpenses = periodExpenses.filter(e => e.active === false);

  const paidOrders = activeOrders.filter(o => o.paymentStatus === 'Paid');
  const unpaidOrders = activeOrders.filter(o => o.paymentStatus !== 'Paid');

  const grossSales = sumAmounts(activeOrders);
  const verifiedCollected = sumAmounts(paidOrders);
  const outstandingBalance = sumAmounts(unpaidOrders);
  const recordedExpenses = sumAmounts(activeExpenses);

  const paidExpenses = activeExpenses.filter(e => e.paymentStatus === 'Paid');
  const unpaidExpenses = activeExpenses.filter(e => e.paymentStatus === 'Unpaid');
  const unclassifiedExpenses = activeExpenses.filter(e => e.paymentStatus !== 'Paid' && e.paymentStatus !== 'Unpaid');

  const paidExpenseTotal = sumAmounts(paidExpenses);
  const unpaidExpenseTotal = sumAmounts(unpaidExpenses);
  const unclassifiedExpenseTotal = sumAmounts(unclassifiedExpenses);

  const collectionsAfterPaidExpenses = verifiedCollected - paidExpenseTotal;

  const paymentMethods = ['Cash', 'GCash', 'Bank Transfer', 'Other', 'Not Specified'];
  const paymentBreakdown = paymentMethods.map(method => {
    const matching = activeOrders.filter(o => classifyPaymentMethod(o) === method);
    return {
      label: method,
      count: matching.length,
      amount: sumAmounts(matching),
      collected: sumAmounts(matching.filter(o => o.paymentStatus === 'Paid'))
    };
  });

  const sourceBreakdown = createBreakdown(activeOrders, o => o.source);
  const serviceBreakdown = createBreakdown(activeOrders, o => o.service);

  const productBreakdown = DEMO_PRODUCTS.map(product => {
    const quantity = activeOrders.reduce((total, order) => {
      const matching = (order.items || []).filter(item => item.sizeId === product.id);
      return total + matching.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    }, 0);
    return { ...product, quantity };
  });

  const receivables = unpaidOrders.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const transactions = periodOrders.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const periodLabel = period === 'All Time' ? 'All Recorded Time' : `${range.startDate} to ${range.endDate}`;

  return {
    meta: {
      period,
      periodLabel,
      startDate: range.startDate,
      endDate: range.endDate,
      generatedAt: new Date()
    },
    counts: {
      totalOrders: periodOrders.length,
      activeOrders: activeOrders.length,
      cancelledOrders: cancelledOrders.length,
      paidOrders: paidOrders.length,
      unpaidOrders: unpaidOrders.length
    },
    financials: {
      grossSales,
      verifiedCollected,
      outstandingBalance,
      recordedExpenses,
      paidExpenses: paidExpenseTotal,
      unpaidExpenses: unpaidExpenseTotal,
      unclassifiedExpenses: unclassifiedExpenseTotal,
      collectionsAfterPaidExpenses
    },
    breakdowns: {
      sources: sourceBreakdown,
      services: serviceBreakdown,
      paymentMethods: paymentBreakdown,
      products: productBreakdown
    },
    expenses: {
      all: periodExpenses,
      active: activeExpenses,
      voided: voidedExpenses,
      paid: paidExpenses,
      unpaid: unpaidExpenses,
      unclassified: unclassifiedExpenses
    },
    receivables,
    transactions
  };
}
