import {
  parseLocalDate,
  formatLocalDate,
  getTodayLocalDate,
  getPeriodRange
} from './reportDateUtils.js';

export const BUSINESS_TIMEZONE = 'Asia/Manila';

export const SOURCE_SERIES_META = Object.freeze({
  'Walk-in': { key: 'Walk-in', label: 'Walk-in', color: '#E67E22' },
  Messenger: { key: 'Messenger', label: 'Messenger', color: '#244EA3' },
  Phone: { key: 'Phone', label: 'Phone', color: '#7C3AED' },
  Online: { key: 'Online', label: 'Online', color: '#138358' },
  'Other / Unknown': { key: 'Other / Unknown', label: 'Other / Unknown', color: '#64748D' }
});

export const FULFILLMENT_SERIES_META = Object.freeze({
  Pickup: { key: 'Pickup', label: 'Pickup', color: '#138358' },
  Delivery: { key: 'Delivery', label: 'Delivery', color: '#244EA3' },
  'Other / Unknown': { key: 'Other / Unknown', label: 'Other / Unknown', color: '#64748D' }
});

const COMPLETED_STATUSES = new Set(['completed', 'delivered', 'picked up']);
const COMPLETED_STAGES = new Set(['delivered', 'picked']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCompletedSale(order) {
  if (!order || typeof order !== 'object') return false;
  const status = String(order.status || '').trim().toLowerCase();
  if (status === 'cancelled') return false;
  if (COMPLETED_STATUSES.has(status)) return true;
  const stage = String(order.stage || '').trim().toLowerCase();
  return COMPLETED_STAGES.has(stage);
}

export function classifyOrderSource(order) {
  const raw = String(order?.source || '').trim().toLowerCase();
  if (raw === 'walk-in' || raw === 'walk_in' || raw === 'walkin') return 'Walk-in';
  if (raw === 'messenger') return 'Messenger';
  if (raw === 'phone') return 'Phone';
  if (raw === 'online') return 'Online';
  return 'Other / Unknown';
}

export function classifyFulfillmentMode(order) {
  const raw = String(order?.service || order?.fulfillment || '').trim().toLowerCase();
  if (!raw) return 'Other / Unknown';
  if (raw.includes('delivery') || raw.includes('collect & return')) return 'Delivery';
  if (raw === 'pickup' || raw === 'walk-in' || raw === 'walk_in' || raw.includes('pickup')) return 'Pickup';
  return 'Other / Unknown';
}

function formatManilaDate(dateObj) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(dateObj);
  const get = type => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function getSaleTimestamp(order) {
  if (!isCompletedSale(order)) return null;
  const raw =
    order.completed_at ||
    order.completedAt ||
    order.sale_at ||
    order.saleAt ||
    order.created_at ||
    order.createdAt ||
    order.time ||
    null;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function getManilaSaleHour(order) {
  const raw = getSaleTimestamp(order);
  if (!raw) return null;

  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const meridiem = (timeMatch[3] || '').toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour >= 0 && hour <= 23 ? hour : null;
  }

  if (raw.includes('T') || /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: BUSINESS_TIMEZONE,
        hour: 'numeric',
        hour12: false
      }).format(parsed);
      const hr = Number(hourStr) % 24;
      return Number.isFinite(hr) ? hr : null;
    }
  }
  return null;
}

export function getManilaSaleDate(order) {
  const explicit = String(order?.business_date || order?.date || '').trim();
  if (DATE_PATTERN.test(explicit)) return explicit;

  const ts = getSaleTimestamp(order);
  if (ts) {
    const parsed = new Date(ts);
    if (!Number.isNaN(parsed.getTime())) {
      return formatManilaDate(parsed);
    }
  }
  return null;
}

function formatHourLabel(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function amountOf(order) {
  const val = Number(order?.amount);
  return Number.isFinite(val) ? val : 0;
}

function resolveChartRange({ period, anchorDate, customStart, customEnd, completedOrders, todayStr }) {
  if (period === 'Custom') {
    const start = DATE_PATTERN.test(String(customStart || '')) ? customStart : todayStr;
    const rawEnd = DATE_PATTERN.test(String(customEnd || '')) ? customEnd : start;
    const endDate = rawEnd < start ? start : rawEnd;
    return { startDate: start, endDate };
  }
  if (period === 'All Time') {
    const dates = completedOrders.map(getManilaSaleDate).filter(Boolean).sort();
    return { startDate: dates[0] || null, endDate: dates[dates.length - 1] || null };
  }
  const safeAnchor = DATE_PATTERN.test(String(anchorDate || '')) ? anchorDate : todayStr;
  return getPeriodRange(period, safeAnchor, completedOrders);
}

export function buildSalesChartData({
  orders = [],
  period = 'Daily',
  anchorDate,
  customStart,
  customEnd,
  breakdown = 'source',
  metric = 'revenue',
  todayStr = getTodayLocalDate()
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const allCompleted = safeOrders.filter(isCompletedSale);
  const range = resolveChartRange({
    period,
    anchorDate,
    customStart,
    customEnd,
    completedOrders: allCompleted,
    todayStr
  });

  const periodCompleted = period === 'All Time'
    ? allCompleted
    : allCompleted.filter(o => {
        const d = getManilaSaleDate(o);
        return Boolean(d && range.startDate && range.endDate && d >= range.startDate && d <= range.endDate);
      });

  const classifier = breakdown === 'fulfillment' ? classifyFulfillmentMode : classifyOrderSource;
  const metaMap = breakdown === 'fulfillment' ? FULFILLMENT_SERIES_META : SOURCE_SERIES_META;
  const baseKeys = breakdown === 'fulfillment'
    ? ['Pickup', 'Delivery']
    : ['Walk-in', 'Messenger', 'Phone', 'Online'];

  const hasOther = periodCompleted.some(o => classifier(o) === 'Other / Unknown');
  const seriesKeys = hasOther ? [...baseKeys, 'Other / Unknown'] : baseKeys;

  const createEmptyBucket = (label, fullLabel) => {
    const bySeries = {};
    for (const k of seriesKeys) {
      bySeries[k] = { revenue: 0, orders: 0 };
    }
    return { label, fullLabel, totalRevenue: 0, totalOrders: 0, bySeries };
  };

  const addOrderToBucket = (bucket, order) => {
    const k = classifier(order);
    const amt = amountOf(order);
    if (!bucket.bySeries[k]) {
      bucket.bySeries[k] = { revenue: 0, orders: 0 };
    }
    bucket.bySeries[k].revenue += amt;
    bucket.bySeries[k].orders += 1;
    bucket.totalRevenue += amt;
    bucket.totalOrders += 1;
  };

  let buckets = [];
  let hasHourlyTimestamps = false;
  let missingTimestampOrders = [];

  if (period === 'Daily') {
    buckets = Array.from({ length: 24 }, (_, hour) =>
      createEmptyBucket(formatHourLabel(hour), `${formatHourLabel(hour)} (${range.startDate || anchorDate})`)
    );
    const timestamped = [];
    for (const o of periodCompleted) {
      const hr = getManilaSaleHour(o);
      if (hr === null) {
        missingTimestampOrders.push(o);
      } else {
        timestamped.push(o);
        addOrderToBucket(buckets[hr], o);
      }
    }
    hasHourlyTimestamps = timestamped.length > 0;
  } else if (period === 'Weekly') {
    const start = parseLocalDate(range.startDate);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (start) {
      for (let i = 0; i < 7; i++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + i);
        const ds = formatLocalDate(cur);
        const bucket = createEmptyBucket(dayNames[i], `${dayNames[i]}, ${ds}`);
        periodCompleted.filter(o => getManilaSaleDate(o) === ds).forEach(o => addOrderToBucket(bucket, o));
        buckets.push(bucket);
      }
    }
  } else if (period === 'Monthly') {
    const start = parseLocalDate(range.startDate);
    const end = parseLocalDate(range.endDate);
    if (start && end) {
      const cur = new Date(start);
      while (cur <= end) {
        const ds = formatLocalDate(cur);
        const bucket = createEmptyBucket(String(cur.getDate()), ds);
        periodCompleted.filter(o => getManilaSaleDate(o) === ds).forEach(o => addOrderToBucket(bucket, o));
        buckets.push(bucket);
        cur.setDate(cur.getDate() + 1);
      }
    }
  } else if (period === 'Yearly') {
    const year = String(range.startDate || todayStr).slice(0, 4);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    buckets = months.map((mName, idx) => {
      const prefix = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const bucket = createEmptyBucket(mName, `${mName} ${year}`);
      periodCompleted.filter(o => (getManilaSaleDate(o) || '').startsWith(prefix)).forEach(o => addOrderToBucket(bucket, o));
      return bucket;
    });
  } else if (period === 'Custom') {
    const start = parseLocalDate(range.startDate);
    const end = parseLocalDate(range.endDate);
    if (start && end && start <= end) {
      const totalDays = Math.round((end - start) / 86400000) + 1;
      const cur = new Date(start);
      if (totalDays <= 31) {
        while (cur <= end) {
          const ds = formatLocalDate(cur);
          const bucket = createEmptyBucket(ds.slice(5), ds);
          periodCompleted.filter(o => getManilaSaleDate(o) === ds).forEach(o => addOrderToBucket(bucket, o));
          buckets.push(bucket);
          cur.setDate(cur.getDate() + 1);
        }
      } else if (totalDays <= 90) {
        while (cur <= end) {
          const wkStart = formatLocalDate(cur);
          const wkEndObj = new Date(cur);
          wkEndObj.setDate(wkEndObj.getDate() + 6);
          if (wkEndObj > end) wkEndObj.setTime(end.getTime());
          const wkEnd = formatLocalDate(wkEndObj);
          const bucket = createEmptyBucket(wkStart.slice(5), `${wkStart} to ${wkEnd}`);
          periodCompleted.filter(o => {
            const d = getManilaSaleDate(o);
            return d && d >= wkStart && d <= wkEnd;
          }).forEach(o => addOrderToBucket(bucket, o));
          buckets.push(bucket);
          cur.setDate(cur.getDate() + 7);
        }
      } else {
        const monthSet = new Set();
        while (cur <= end) {
          monthSet.add(formatLocalDate(cur).slice(0, 7));
          cur.setMonth(cur.getMonth() + 1, 1);
        }
        monthSet.add(range.endDate.slice(0, 7));
        buckets = Array.from(monthSet).sort().map(prefix => {
          const bucket = createEmptyBucket(prefix, prefix);
          periodCompleted.filter(o => (getManilaSaleDate(o) || '').startsWith(prefix)).forEach(o => addOrderToBucket(bucket, o));
          return bucket;
        });
      }
    }
  } else {
    // All Time: monthly for <= 24 distinct months, yearly for > 24 months
    const monthKeys = Array.from(
      new Set(periodCompleted.map(o => String(getManilaSaleDate(o) || '').slice(0, 7)).filter(v => /^\d{4}-\d{2}$/.test(v)))
    ).sort();

    if (monthKeys.length > 24) {
      const years = Array.from(new Set(monthKeys.map(m => m.slice(0, 4)))).sort();
      buckets = years.map(yr => {
        const bucket = createEmptyBucket(yr, `Year ${yr}`);
        periodCompleted.filter(o => (getManilaSaleDate(o) || '').startsWith(yr)).forEach(o => addOrderToBucket(bucket, o));
        return bucket;
      });
    } else {
      buckets = monthKeys.map(prefix => {
        const bucket = createEmptyBucket(prefix, prefix);
        periodCompleted.filter(o => (getManilaSaleDate(o) || '').startsWith(prefix)).forEach(o => addOrderToBucket(bucket, o));
        return bucket;
      });
    }
  }

  const series = seriesKeys.map(key => {
    const matching = periodCompleted.filter(o => classifier(o) === key);
    return {
      ...metaMap[key],
      totalRevenue: matching.reduce((s, o) => s + amountOf(o), 0),
      totalOrders: matching.length
    };
  });

  const totalRevenue = periodCompleted.reduce((s, o) => s + amountOf(o), 0);
  const totalOrders = periodCompleted.length;
  const plottedRevenue = buckets.reduce((s, b) => s + b.totalRevenue, 0);
  const plottedOrders = buckets.reduce((s, b) => s + b.totalOrders, 0);
  const missingTimestampRevenue = missingTimestampOrders.reduce((s, o) => s + amountOf(o), 0);

  return {
    period,
    range,
    breakdown,
    metric,
    buckets,
    series,
    totalRevenue,
    totalOrders,
    plottedRevenue,
    plottedOrders,
    hasHourlyTimestamps,
    hasMissingTimestamps: missingTimestampOrders.length > 0,
    missingTimestampCount: missingTimestampOrders.length,
    missingTimestampRevenue,
    hasPlottedData: buckets.some(b => (metric === 'revenue' ? b.totalRevenue : b.totalOrders) > 0)
  };
}
