import { DEMO_PRODUCTS } from '../data/managerDemo.js';
import { getPeriodRange, filterByDateRange } from './reportDateUtils.js';
import { getPeriodLabel, getPeriodFilename } from './dateUtils.js';

const amountOf = record => {
  const amount = Number(record?.amount);
  return Number.isFinite(amount) ? amount : 0;
};

const sumAmounts = records => records.reduce((sum, record) => sum + amountOf(record), 0);
const isCancelled = order => String(order?.status || '').toLowerCase() === 'cancelled';
const isCompleted = order => ['completed', 'delivered', 'picked up'].includes(String(order?.status || '').trim().toLowerCase());
const isPaid = record => record?.paymentStatus === 'Paid';
const isUnpaid = record => record?.paymentStatus === 'Unpaid';

function labelOf(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Not Specified';
}

function classifyPaymentMethod(order) {
  const value = String(order?.paymentMethod || order?.method || '').trim().toLowerCase();
  if (value === 'cash') return 'Cash';
  if (value === 'gcash') return 'GCash';
  if (value.includes('bank') || value.includes('transfer')) return 'Bank Transfer';
  if (value === 'other') return 'Other';
  return 'Not Specified';
}

function createServiceBreakdown(records) {
  const groups = new Map();
  records.forEach(order => {
    const service = labelOf(order.service);
    if (!groups.has(service)) {
      groups.set(service, { service, orders: 0, gross: 0, verified: 0, outstanding: 0, unknownPayment: 0 });
    }
    const group = groups.get(service);
    const amount = amountOf(order);
    group.orders += 1;
    group.gross += amount;
    if (isPaid(order)) group.verified += amount;
    else if (isUnpaid(order)) group.outstanding += amount;
    else group.unknownPayment += amount;
  });
  return Array.from(groups.values()).sort((a, b) => b.gross - a.gross);
}

function createSourceBreakdown(records) {
  const knownSources = ['Walk-in', 'Online', 'Messenger', 'Phone'];
  const actualSources = records.map(order => labelOf(order.source));
  const sources = Array.from(new Set(knownSources.concat(actualSources)));
  return sources.map(source => {
    const matching = records.filter(order => labelOf(order.source) === source);
    return {
      source,
      count: matching.length,
      total: sumAmounts(matching),
      paid: sumAmounts(matching.filter(isPaid)),
      outstanding: sumAmounts(matching.filter(isUnpaid)),
      unknownPayment: sumAmounts(matching.filter(order => !isPaid(order) && !isUnpaid(order)))
    };
  });
}

function createPaymentBreakdown(records) {
  const result = {
    Cash: { recorded: 0, verified: 0, count: 0 },
    GCash: { recorded: 0, verified: 0, count: 0 },
    'Bank Transfer': { recorded: 0, verified: 0, count: 0 },
    Other: { recorded: 0, verified: 0, count: 0 },
    'Not Specified': { recorded: 0, verified: 0, count: 0 }
  };

  records.forEach(order => {
    const method = classifyPaymentMethod(order);
    const bucket = result[method];
    const amount = amountOf(order);
    bucket.recorded += amount;
    bucket.count += 1;
    if (isPaid(order)) bucket.verified += amount;
  });

  return result;
}

function createProductBreakdown(records) {
  const quantities = Object.create(null);
  let totalQuantity = 0;

  records.forEach(order => {
    (Array.isArray(order.items) ? order.items : []).forEach(item => {
      const quantity = Number(item.quantity);
      if (!item.sizeId || !Number.isFinite(quantity) || quantity <= 0) return;
      quantities[item.sizeId] = (quantities[item.sizeId] || 0) + quantity;
      totalQuantity += quantity;
    });
  });

  const list = DEMO_PRODUCTS.map(product => {
    const quantity = quantities[product.id] || 0;
    return {
      ...product,
      quantity,
      share: totalQuantity > 0 ? (quantity / totalQuantity) * 100 : 0
    };
  });
  return { list, maxQty: Math.max(0, ...list.map(product => product.quantity)) };
}

export function buildSalesReportData({
  orders = [],
  expenses = [],
  period = 'Weekly',
  anchorDate
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const range = getPeriodRange(period, anchorDate, safeOrders.concat(safeExpenses));

  const periodOrders = period === 'All Time'
    ? safeOrders.slice()
    : filterByDateRange(safeOrders, range.startDate, range.endDate);
  const periodExpenses = period === 'All Time'
    ? safeExpenses.slice()
    : filterByDateRange(safeExpenses, range.startDate, range.endDate);

  const activePeriodOrders = periodOrders.filter(order => !isCancelled(order));
  const completedPeriodOrders = activePeriodOrders.filter(isCompleted);
  const cancelledOrders = periodOrders.filter(isCancelled);
  const paidOrders = activePeriodOrders.filter(isPaid);
  const unpaidOrders = activePeriodOrders.filter(isUnpaid);
  const unknownPaymentOrders = activePeriodOrders.filter(order => !isPaid(order) && !isUnpaid(order));

  const activePeriodExpenses = periodExpenses.filter(expense => expense.active !== false);
  const paidExpenseRecords = activePeriodExpenses.filter(isPaid);
  const unpaidExpenseRecords = activePeriodExpenses.filter(isUnpaid);
  const unclassifiedExpenseRecords = activePeriodExpenses.filter(expense => !isPaid(expense) && !isUnpaid(expense));

  const grossSales = sumAmounts(activePeriodOrders);
  const completedSales = sumAmounts(completedPeriodOrders);
  const verifiedCollected = sumAmounts(paidOrders);
  const verifiedCollectedCompleted = sumAmounts(completedPeriodOrders.filter(isPaid));
  const unpaidCompletedSales = sumAmounts(completedPeriodOrders.filter(isUnpaid));
  const outstandingBalance = sumAmounts(unpaidOrders);
  const unknownPaymentBalance = sumAmounts(unknownPaymentOrders);

  const recordedExpenses = sumAmounts(activePeriodExpenses);
  const paidExpenses = sumAmounts(paidExpenseRecords);
  const unpaidExpenses = sumAmounts(unpaidExpenseRecords);
  const unrecordedStatusExpenses = sumAmounts(unclassifiedExpenseRecords);
  const collectionsAfterPaidExpenses = verifiedCollected - paidExpenses;
  // Recorded Operating Result (Demo): completed sales minus active recorded expenses (not audited net profit)
  const recordedOperatingResult = completedSales - recordedExpenses;

  const totalOrders = periodOrders.length;
  const cancelledOrdersCount = cancelledOrders.length;
  const paidOrdersCount = paidOrders.length;
  const unpaidOrdersCount = unpaidOrders.length;
  const unknownPaymentOrdersCount = unknownPaymentOrders.length;
  const avgTicket = paidOrdersCount > 0 ? verifiedCollected / paidOrdersCount : 0;

  const paymentBreakdown = createPaymentBreakdown(activePeriodOrders);
  const serviceBreakdown = createServiceBreakdown(activePeriodOrders);
  const sourceBreakdown = createSourceBreakdown(activePeriodOrders);
  const productBreakdown = createProductBreakdown(activePeriodOrders);

  const receivablesList = unpaidOrders.slice()
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .map(order => ({
      id: order.id || 'No Order ID',
      customer: order.customer || 'Walk-in',
      service: labelOf(order.service),
      date: order.date || 'Unspecified',
      amount: amountOf(order),
      paid: 0,
      balance: amountOf(order),
      paymentStatus: 'Unpaid'
    }));

  const transactionsList = periodOrders.slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map(order => ({
      id: order.id || 'No Order ID',
      date: order.date || 'Unspecified',
      customer: order.customer || 'Walk-in',
      source: labelOf(order.source),
      service: labelOf(order.service),
      amount: amountOf(order),
      paymentStatus: isPaid(order) ? 'Paid' : isUnpaid(order) ? 'Unpaid' : 'Not Recorded',
      status: order.status || 'Active'
    }));

  const expensesList = periodExpenses.map(expense => ({
    ...expense,
    active: expense.active !== false,
    paymentStatus: expense.paymentStatus || 'Not Recorded'
  }));

  return {
    periodRange: range,
    periodOrders,
    activePeriodOrders,
    periodExpenses,
    activePeriodExpenses,
    grossSales,
    completedSales,
    verifiedCollected,
    verifiedCollectedCompleted,
    unpaidCompletedSales,
    outstandingBalance,
    unknownPaymentBalance,
    recordedExpenses,
    paidExpenses,
    unpaidExpenses,
    unrecordedStatusExpenses,
    collectionsAfterPaidExpenses,
    recordedOperatingResult,
    totalOrders,
    cancelledOrdersCount,
    paidOrdersCount,
    unpaidOrdersCount,
    unknownPaymentOrdersCount,
    unknownPaymentOrders,
    avgTicket,
    paymentBreakdown,
    serviceBreakdown,
    productBreakdown,
    sourceBreakdown,
    receivablesList,
    transactionsList,
    expensesList,
    periodLabel: period === 'All Time' ? 'All Recorded Time' : getPeriodLabel(period, anchorDate),
    periodFilename: getPeriodFilename(period, anchorDate),
    dateGenerated: new Date().toLocaleString('en-PH')
  };
}
