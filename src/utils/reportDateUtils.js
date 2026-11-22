// Timezone-safe date utility functions for AquaBest reporting (Philippines UTC+8)

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseLocalDate(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDate() {
  return formatLocalDate(new Date());
}

export function getPeriodRange(period, anchorDate, records = []) {
  if (period === 'All Time') {
    const dates = records
      .map(r => r.date)
      .filter(v => DATE_PATTERN.test(String(v || '')))
      .sort();
    return {
      startDate: dates[0] || null,
      endDate: dates[dates.length - 1] || null
    };
  }

  const anchor = parseLocalDate(anchorDate);
  if (!anchor) {
    throw new Error('Invalid reporting date.');
  }

  const start = new Date(anchor);
  const end = new Date(anchor);

  if (period === 'Weekly') {
    start.setDate(start.getDate() - start.getDay());
    const weekEnd = new Date(start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(weekEnd)
    };
  }

  if (period === 'Monthly') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }

  if (period === 'Yearly') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end)
  };
}

export function shiftAnchorDate(anchorDate, period, step) {
  const date = parseLocalDate(anchorDate);
  if (!date || period === 'All Time') return anchorDate;

  if (period === 'Daily') {
    date.setDate(date.getDate() + step);
    return formatLocalDate(date);
  }
  if (period === 'Weekly') {
    date.setDate(date.getDate() + step * 7);
    return formatLocalDate(date);
  }
  if (period === 'Monthly') {
    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth() + step;
    const originalDay = date.getDate();
    const firstOfTargetMonth = new Date(targetYear, targetMonth, 1, 12);
    const lastDay = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, 0, 12).getDate();
    firstOfTargetMonth.setDate(Math.min(originalDay, lastDay));
    return formatLocalDate(firstOfTargetMonth);
  }
  if (period === 'Yearly') {
    const targetYear = date.getFullYear() + step;
    const month = date.getMonth();
    const originalDay = date.getDate();
    const lastDay = new Date(targetYear, month + 1, 0, 12).getDate();
    return formatLocalDate(new Date(targetYear, month, Math.min(originalDay, lastDay), 12));
  }
  return anchorDate;
}

export function filterByDateRange(records, startDate, endDate) {
  return records.filter(r => {
    if (!r.date || !startDate || !endDate) return false;
    return r.date >= startDate && r.date <= endDate;
  });
}
