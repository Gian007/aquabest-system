import { DEMO_PRODUCTS } from '../data/managerDemo.js';
import {
  parseLocalDate,
  formatLocalDate,
  getTodayLocalDate,
  getPeriodRange,
  shiftAnchorDate,
  filterByDateRange
} from './reportDateUtils.js';
import { buildSalesReportData } from './buildSalesReportData.js';

const REFILL_COMPLETED_STATUSES = new Set(['Ready', 'Out for Delivery', 'Delivered', 'Completed']);
const REFILL_COMPLETED_STAGES = new Set(['ready', 'pickup', 'delivery', 'out', 'delivered', 'picked']);

function sumOrderQty(order) {
  if (Number.isFinite(Number(order?.quantity)) && Number(order.quantity) > 0) {
    return Number(order.quantity);
  }
  return (Array.isArray(order?.items) ? order.items : []).reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0),
    0
  );
}

function getOrderHour(order) {
  const raw = order?.time || order?.createdAt || order?.created_at;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const meridiem = (timeMatch[3] || '').toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour >= 0 && hour <= 23 ? hour : null;
  }
  if (value.includes('T')) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getHours();
  }
  return null;
}

export function resolveDashboardRange({
  period = 'Daily',
  anchorDate,
  customStart,
  customEnd,
  orders = [],
  expenses = [],
  todayStr = getTodayLocalDate()
}) {
  if (period === 'Custom') {
    const start = customStart && customStart <= todayStr ? customStart : todayStr;
    const rawEnd = customEnd && customEnd <= todayStr ? customEnd : start;
    const endDate = rawEnd < start ? start : rawEnd;
    return {
      startDate: start,
      endDate,
      label: start === endDate ? start : `${start} to ${endDate}`
    };
  }

  const safeAnchor = anchorDate && anchorDate <= todayStr ? anchorDate : todayStr;
  const range = getPeriodRange(period, safeAnchor, [...orders, ...expenses]);

  if (period === 'All Time') {
    const cappedEnd = range.endDate && range.endDate > todayStr ? todayStr : range.endDate;
    return {
      startDate: range.startDate,
      endDate: cappedEnd,
      label: 'All Recorded Time'
    };
  }

  // Never include future dates in historical periods
  const cappedEnd = range.endDate && range.endDate > todayStr ? todayStr : range.endDate;
  return {
    startDate: range.startDate,
    endDate: cappedEnd,
    label: range.startDate === cappedEnd ? range.startDate : `${range.startDate} to ${cappedEnd}`
  };
}

export function buildChartSeries({
  period,
  range,
  activeOrders = [],
  todayStr = getTodayLocalDate()
}) {
  if (period === 'Daily') {
    const hasHourly = activeOrders.some(o => getOrderHour(o) !== null);
    if (!hasHourly) {
      return { hasHourlyTimestamps: false, points: [] };
    }
    const points = Array.from({ length: 24 }, (_, hour) => {
      const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      const matching = activeOrders.filter(o => getOrderHour(o) === hour);
      return {
        label,
        fullLabel: `${label} (${range.startDate})`,
        revenue: matching.reduce((s, o) => s + (Number(o.amount) || 0), 0),
        orders: matching.length
      };
    });
    return { hasHourlyTimestamps: true, points };
  }

  if (period === 'Weekly' || period === 'Custom' || period === 'Monthly') {
    const start = parseLocalDate(range.startDate);
    const end = parseLocalDate(range.endDate);
    if (!start || !end || start > end) return { hasHourlyTimestamps: false, points: [] };

    const points = [];
    const cursor = new Date(start);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totalDays = Math.round((end - start) / 86400000) + 1;

    // Daily buckets for Weekly, Monthly, or Custom <= 31 days
    if (period !== 'Custom' || totalDays <= 31) {
      while (cursor <= end) {
        const ds = formatLocalDate(cursor);
        const dayOrders = activeOrders.filter(o => o.date === ds);
        points.push({
          label: period === 'Weekly' ? `${dayNames[cursor.getDay()]} ${ds.slice(8)}` : period === 'Monthly' ? String(cursor.getDate()) : ds.slice(5),
          fullLabel: `${dayNames[cursor.getDay()]}, ${ds}`,
          revenue: dayOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0),
          orders: dayOrders.length
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return { hasHourlyTimestamps: false, points };
    }

    // Weekly buckets for Custom 32..90 days
    if (totalDays <= 90) {
      while (cursor <= end) {
        const wkStart = formatLocalDate(cursor);
        const wkEndDate = new Date(cursor);
        wkEndDate.setDate(wkEndDate.getDate() + 6);
        if (wkEndDate > end) wkEndDate.setTime(end.getTime());
        const wkEnd = formatLocalDate(wkEndDate);
        const wkOrders = activeOrders.filter(o => o.date && o.date >= wkStart && o.date <= wkEnd);
        points.push({
          label: wkStart.slice(5),
          fullLabel: `${wkStart} to ${wkEnd}`,
          revenue: wkOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0),
          orders: wkOrders.length
        });
        cursor.setDate(cursor.getDate() + 7);
      }
      return { hasHourlyTimestamps: false, points };
    }
  }

  if (period === 'Yearly' && range.startDate) {
    const year = range.startDate.slice(0, 4);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const maxMonth = year === todayStr.slice(0, 4) ? Number(todayStr.slice(5, 7)) : 12;
    const points = months.slice(0, maxMonth).map((mName, idx) => {
      const prefix = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const mOrders = activeOrders.filter(o => o.date && o.date.startsWith(prefix));
      return {
        label: mName,
        fullLabel: `${mName} ${year}`,
        revenue: mOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0),
        orders: mOrders.length
      };
    });
    return { hasHourlyTimestamps: false, points };
  }

  // All Time or Custom > 90 days -> monthly, or yearly if > 24 months
  const monthKeys = Array.from(
    new Set(
      activeOrders
        .map(o => String(o.date || '').slice(0, 7))
        .filter(v => /^\d{4}-\d{2}$/.test(v))
    )
  ).sort();

  if (monthKeys.length > 24) {
    const yearKeys = Array.from(new Set(monthKeys.map(m => m.slice(0, 4)))).sort();
    const points = yearKeys.map(yr => {
      const yOrders = activeOrders.filter(o => o.date && o.date.startsWith(yr));
      return {
        label: yr,
        fullLabel: `Year ${yr}`,
        revenue: yOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0),
        orders: yOrders.length
      };
    });
    return { hasHourlyTimestamps: false, points };
  }

  const points = monthKeys.map(prefix => {
    const mOrders = activeOrders.filter(o => o.date && o.date.startsWith(prefix));
    return {
      label: prefix,
      fullLabel: prefix,
      revenue: mOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      orders: mOrders.length
    };
  });

  return { hasHourlyTimestamps: false, points };
}

export function buildGallonActivity({
  periodOrders = [],
  trips = [],
  stock = [],
  stockLog = []
}) {
  const activeOrders = periodOrders.filter(o => o.status !== 'Cancelled');

  // 1. Gallons Refilled: completed/ready refills excluding new container purchases
  const gallonsRefilled = activeOrders.reduce((sum, o) => {
    const isPurchase = o.ownership === 'store' && o.arrangement === 'purchase';
    if (isPurchase) return sum;
    const isRefillDone =
      REFILL_COMPLETED_STATUSES.has(o.status) ||
      REFILL_COMPLETED_STAGES.has(o.stage) ||
      Boolean(o.refillCompletedAt);
    return isRefillDone ? sum + sumOrderQty(o) : sum;
  }, 0);

  // 2. New Gallons Sold: explicit store-owned purchase orders only
  const newGallonsSold = activeOrders.reduce((sum, o) => {
    if (o.ownership === 'store' && o.arrangement === 'purchase') {
      return sum + sumOrderQty(o);
    }
    return sum;
  }, 0);

  // 3. Gallons Issued / Borrowed: explicit store-owned returnable orders only
  const gallonsBorrowed = activeOrders.reduce((sum, o) => {
    if (o.ownership === 'store' && o.arrangement === 'returnable') {
      return sum + sumOrderQty(o);
    }
    return sum;
  }, 0);

  // 4. Gallons Returned / Collected: from trip emptiesCollected + manual IN return logs
  const tripEmpties = trips.reduce((sum, t) => sum + (Number(t.emptiesCollected) || 0), 0);
  const stockReturnLogs = stockLog.reduce((sum, m) => {
    if (m.type === 'IN' && /return/i.test(String(m.reason || ''))) {
      return sum + (Number(m.quantity) || 0);
    }
    return sum;
  }, 0);
  const gallonsReturned = tripEmpties + stockReturnLogs;

  // 5. Outstanding Borrowed Gallons: cannot be reliably matched without customer borrow ledger IDs
  const outstandingBorrowed = null;

  // 6. Current Container Inventory
  const totalAvailableStock = stock.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  const stockItems = stock.map(s => {
    const prod = DEMO_PRODUCTS.find(p => p.id === s.id);
    return {
      id: s.id,
      label: prod ? `${prod.label} · ${prod.shape}` : s.id,
      quantity: Number(s.quantity) || 0,
      minimum: Number(s.minimum) || 0,
      low: (Number(s.quantity) || 0) < (Number(s.minimum) || 0)
    };
  });

  return {
    gallonsRefilled,
    newGallonsSold,
    gallonsBorrowed,
    gallonsReturned,
    outstandingBorrowed,
    totalAvailableStock,
    stockItems
  };
}

export function buildOwnerDashboardData({
  orders = [],
  expenses = [],
  trips = [],
  stock = [],
  stockLog = [],
  period = 'Daily',
  anchorDate,
  customStart,
  customEnd,
  todayStr = getTodayLocalDate()
}) {
  const safeAnchor = anchorDate && anchorDate <= todayStr ? anchorDate : todayStr;
  const range = resolveDashboardRange({
    period,
    anchorDate: safeAnchor,
    customStart,
    customEnd,
    orders,
    expenses,
    todayStr
  });

  // Use shared calculation utility for standard periods, or filter directly for Custom
  let periodOrders = [];
  let periodExpenses = [];
  let grossSales = 0;
  let verifiedCollected = 0;
  let outstandingBalance = 0;
  let recordedExpenses = 0;

  if (period === 'Custom' || (period !== 'All Time' && range.endDate < getPeriodRange(period, safeAnchor, orders).endDate)) {
    periodOrders = filterByDateRange(orders, range.startDate, range.endDate);
    periodExpenses = filterByDateRange(expenses, range.startDate, range.endDate);
    const activeOrders = periodOrders.filter(o => o.status !== 'Cancelled');
    grossSales = activeOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    verifiedCollected = activeOrders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + (Number(o.amount) || 0), 0);
    outstandingBalance = activeOrders.filter(o => o.paymentStatus === 'Unpaid').reduce((s, o) => s + (Number(o.amount) || 0), 0);
    recordedExpenses = periodExpenses.filter(e => e.active !== false).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  } else {
    const shared = buildSalesReportData({ orders, expenses, period, anchorDate: safeAnchor });
    periodOrders = shared.periodOrders;
    periodExpenses = shared.periodExpenses;
    grossSales = shared.grossSales;
    verifiedCollected = shared.verifiedCollected;
    outstandingBalance = shared.outstandingBalance;
    recordedExpenses = shared.recordedExpenses;
  }

  const activeOrders = periodOrders.filter(o => o.status !== 'Cancelled');

  // Previous equivalent period comparison (only when historical data exists)
  let previousComparison = null;
  if (['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(period)) {
    const prevAnchor = shiftAnchorDate(safeAnchor, period, -1);
    const prevRange = getPeriodRange(period, prevAnchor, orders);
    const prevOrders = filterByDateRange(orders, prevRange.startDate, prevRange.endDate).filter(o => o.status !== 'Cancelled');
    if (prevOrders.length > 0) {
      const prevSales = prevOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
      const deltaPct = prevSales > 0 ? ((grossSales - prevSales) / prevSales) * 100 : null;
      previousComparison = { prevSales, prevCount: prevOrders.length, deltaPct };
    }
  }

  const chart = buildChartSeries({ period, range, activeOrders, todayStr });
  const gallons = buildGallonActivity({ periodOrders, trips, stock, stockLog });

  // Unified Recent Business Activity feed
  const activity = [
    ...periodOrders.map(o => ({
      id: `ord-${o.id}`,
      date: o.date || '',
      ref: `${o.id} · ${o.customer || 'Walk-in'}`,
      type: o.status === 'Completed' ? 'Order Completed' : o.status === 'Delivered' ? 'Delivery Completed' : 'Order Recorded',
      detail: `${sumOrderQty(o)} container(s) • ${o.source || 'Station'}`,
      amount: Number(o.amount) || 0,
      status: o.status,
      paymentStatus: o.paymentStatus,
      order: o
    })),
    ...stockLog.map(m => ({
      id: `stk-${m.id}`,
      date: m.time || '',
      ref: m.orderId || m.productId,
      type: m.type === 'IN' ? 'Container Returned / Stock IN' : 'Container Issued / Stock OUT',
      detail: m.reason || 'Stock movement',
      quantity: m.quantity,
      status: m.type,
      order: null
    }))
  ].slice(0, 8);

  return {
    range,
    periodOrders,
    activeOrders,
    periodExpenses,
    financials: {
      grossSales,
      totalOrders: activeOrders.length,
      verifiedCollected,
      outstandingBalance,
      recordedExpenses
    },
    previousComparison,
    chart,
    gallons,
    activity
  };
}
