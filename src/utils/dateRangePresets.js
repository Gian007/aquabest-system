import {
  parseLocalDate,
  getTodayLocalDate,
  getPeriodRange,
  shiftAnchorDate
} from './reportDateUtils.js';

export const DATE_RANGE_PRESETS = Object.freeze([
  { id: 'today', label: 'Today', period: 'Daily' },
  { id: 'yesterday', label: 'Yesterday', period: 'Daily' },
  { id: 'this_week', label: 'This Week', period: 'Weekly' },
  { id: 'last_week', label: 'Last Week', period: 'Weekly' },
  { id: 'this_month', label: 'This Month', period: 'Monthly' },
  { id: 'last_month', label: 'Last Month', period: 'Monthly' },
  { id: 'this_year', label: 'This Year', period: 'Yearly' },
  { id: 'all_time', label: 'All Time', period: 'All Time' },
  { id: 'custom', label: 'Custom Range', period: 'Custom' }
]);

export function formatShortDate(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr || '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortMonthDay(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr || '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateRangeDisplay({ preset, startDate, endDate }) {
  if (preset === 'all_time') return 'All Time';
  if (!startDate) return 'Select Date';
  const effectiveEnd = endDate || startDate;

  const presetMeta = DATE_RANGE_PRESETS.find(p => p.id === preset);
  if (startDate === effectiveEnd) {
    if (preset === 'today') return `Today · ${formatShortDate(startDate)}`;
    if (preset === 'yesterday') return `Yesterday · ${formatShortDate(startDate)}`;
    return formatShortDate(startDate);
  }

  const sameYear = startDate.slice(0, 4) === effectiveEnd.slice(0, 4);
  const rangeText = sameYear
    ? `${formatShortMonthDay(startDate)} – ${formatShortDate(effectiveEnd)}`
    : `${formatShortDate(startDate)} – ${formatShortDate(effectiveEnd)}`;

  if (presetMeta && preset !== 'custom') {
    return `${presetMeta.label} · ${rangeText}`;
  }
  return rangeText;
}

export function resolveDateRangePreset(preset, { todayStr = getTodayLocalDate(), customStart, customEnd, records = [] } = {}) {
  if (preset === 'today') {
    return { preset: 'today', period: 'Daily', anchorDate: todayStr, startDate: todayStr, endDate: todayStr };
  }
  if (preset === 'yesterday') {
    const yest = shiftAnchorDate(todayStr, 'Daily', -1);
    return { preset: 'yesterday', period: 'Daily', anchorDate: yest, startDate: yest, endDate: yest };
  }
  if (preset === 'this_week') {
    const range = getPeriodRange('Weekly', todayStr, records);
    const cappedEnd = range.endDate > todayStr ? todayStr : range.endDate;
    return { preset: 'this_week', period: 'Weekly', anchorDate: todayStr, startDate: range.startDate, endDate: cappedEnd };
  }
  if (preset === 'last_week') {
    const prevWeekAnchor = shiftAnchorDate(todayStr, 'Weekly', -1);
    const range = getPeriodRange('Weekly', prevWeekAnchor, records);
    return { preset: 'last_week', period: 'Weekly', anchorDate: prevWeekAnchor, startDate: range.startDate, endDate: range.endDate };
  }
  if (preset === 'this_month') {
    const range = getPeriodRange('Monthly', todayStr, records);
    const cappedEnd = range.endDate > todayStr ? todayStr : range.endDate;
    return { preset: 'this_month', period: 'Monthly', anchorDate: todayStr, startDate: range.startDate, endDate: cappedEnd };
  }
  if (preset === 'last_month') {
    const prevMonthAnchor = shiftAnchorDate(todayStr, 'Monthly', -1);
    const range = getPeriodRange('Monthly', prevMonthAnchor, records);
    return { preset: 'last_month', period: 'Monthly', anchorDate: prevMonthAnchor, startDate: range.startDate, endDate: range.endDate };
  }
  if (preset === 'this_year') {
    const range = getPeriodRange('Yearly', todayStr, records);
    const cappedEnd = range.endDate > todayStr ? todayStr : range.endDate;
    return { preset: 'this_year', period: 'Yearly', anchorDate: todayStr, startDate: range.startDate, endDate: cappedEnd };
  }
  if (preset === 'all_time') {
    const range = getPeriodRange('All Time', todayStr, records);
    return { preset: 'all_time', period: 'All Time', anchorDate: todayStr, startDate: range.startDate, endDate: range.endDate };
  }

  // Custom Range
  const start = customStart && customStart <= todayStr ? customStart : todayStr;
  const rawEnd = customEnd && customEnd <= todayStr ? customEnd : start;
  const endDate = rawEnd < start ? start : rawEnd;
  // Single-day custom range uses Daily period so hourly chart still works cleanly
  const period = start === endDate ? 'Daily' : 'Custom';
  return { preset: 'custom', period, anchorDate: start, startDate: start, endDate };
}

export function stepDateSelection(selection, step, todayStr = getTodayLocalDate()) {
  if (!selection || selection.preset === 'all_time') return selection;
  const currentPeriod = selection.period === 'Custom' ? 'Daily' : selection.period;
  const baseAnchor = selection.anchorDate || selection.startDate || todayStr;
  const nextAnchor = shiftAnchorDate(baseAnchor, currentPeriod, step);
  if (step > 0 && nextAnchor > todayStr) return selection;

  if (currentPeriod === 'Daily') {
    const yest = shiftAnchorDate(todayStr, 'Daily', -1);
    const nextPreset = nextAnchor === todayStr ? 'today' : nextAnchor === yest ? 'yesterday' : 'custom';
    return { preset: nextPreset, period: 'Daily', anchorDate: nextAnchor, startDate: nextAnchor, endDate: nextAnchor };
  }

  const range = getPeriodRange(currentPeriod, nextAnchor, []);
  const cappedEnd = range.endDate > todayStr ? todayStr : range.endDate;
  return {
    preset: 'custom',
    period: currentPeriod,
    anchorDate: nextAnchor,
    startDate: range.startDate,
    endDate: cappedEnd
  };
}

export function canStepForward(selection, todayStr = getTodayLocalDate()) {
  if (!selection || selection.preset === 'all_time') return false;
  const currentPeriod = selection.period === 'Custom' ? 'Daily' : selection.period;
  const baseAnchor = selection.anchorDate || selection.startDate || todayStr;
  const nextAnchor = shiftAnchorDate(baseAnchor, currentPeriod, 1);
  return nextAnchor <= todayStr;
}

export function periodToDefaultPreset(period) {
  if (period === 'Weekly') return 'this_week';
  if (period === 'Monthly') return 'this_month';
  if (period === 'Yearly') return 'this_year';
  if (period === 'All Time') return 'all_time';
  return 'today';
}
