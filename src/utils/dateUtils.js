// Timezone-safe date utility functions for AquaBest reporting in the Philippines (UTC+8)

export function getTodayLocalStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-');
  if (parts.length < 3) return new Date();
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

export function formatToLocalISO(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return 'Unspecified';
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Sunday through Saturday week range for an anchor date string YYYY-MM-DD
export function getWeekRange(dateStr) {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  return {
    startStr: formatToLocalISO(sunday),
    endStr: formatToLocalISO(saturday),
    startDate: sunday,
    endDate: saturday
  };
}

// Safely navigate periods without JavaScript month-end overflow
export function shiftPeriod(anchorDateStr, period, step) {
  const d = parseLocalDate(anchorDateStr);

  if (period === 'Daily') {
    d.setDate(d.getDate() + step);
    return formatToLocalISO(d);
  }

  if (period === 'Weekly') {
    d.setDate(d.getDate() + step * 7);
    return formatToLocalISO(d);
  }

  if (period === 'Monthly') {
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth();
    const currentDay = d.getDate();

    // Target year and month
    const targetMonthIndex = currentMonth + step;
    const targetDateFirst = new Date(currentYear, targetMonthIndex, 1);
    const targetYear = targetDateFirst.getFullYear();
    const targetMonth = targetDateFirst.getMonth();

    // Days in target month
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const safeDay = Math.min(currentDay, daysInTargetMonth);

    const result = new Date(targetYear, targetMonth, safeDay);
    return formatToLocalISO(result);
  }

  if (period === 'Yearly') {
    const currentYear = d.getFullYear() + step;
    const currentMonth = d.getMonth();
    const currentDay = d.getDate();
    const daysInTargetMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const safeDay = Math.min(currentDay, daysInTargetMonth);
    const result = new Date(currentYear, currentMonth, safeDay);
    return formatToLocalISO(result);
  }

  return anchorDateStr;
}

export function isWithinPeriod(itemDateStr, period, anchorDateStr) {
  if (!itemDateStr) return false;
  if (period === 'All Time') return true;

  if (period === 'Daily') {
    return itemDateStr === anchorDateStr;
  }

  if (period === 'Weekly') {
    const { startStr, endStr } = getWeekRange(anchorDateStr);
    return itemDateStr >= startStr && itemDateStr <= endStr;
  }

  if (period === 'Monthly') {
    const prefix = anchorDateStr.slice(0, 7); // YYYY-MM
    return itemDateStr.startsWith(prefix);
  }

  if (period === 'Yearly') {
    const year = anchorDateStr.slice(0, 4); // YYYY
    return itemDateStr.startsWith(year);
  }

  return true;
}

export function getPeriodLabel(period, anchorDateStr) {
  if (period === 'All Time') return 'All Recorded Time';
  if (period === 'Daily') return formatDateLabel(anchorDateStr);
  if (period === 'Weekly') {
    const { startStr, endStr } = getWeekRange(anchorDateStr);
    return `${formatDateLabel(startStr)} – ${formatDateLabel(endStr)}`;
  }
  if (period === 'Monthly') {
    const d = parseLocalDate(anchorDateStr);
    return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  }
  if (period === 'Yearly') {
    return `Year ${anchorDateStr.slice(0, 4)}`;
  }
  return anchorDateStr;
}

export function getPeriodFilename(period, anchorDateStr) {
  if (period === 'All Time') return 'All_Time';
  if (period === 'Daily') return `Daily_${anchorDateStr}`;
  if (period === 'Weekly') {
    const { startStr, endStr } = getWeekRange(anchorDateStr);
    return `${startStr}_to_${endStr}`;
  }
  if (period === 'Monthly') {
    return `Monthly_${anchorDateStr.slice(0, 7)}`;
  }
  if (period === 'Yearly') {
    return `Year_${anchorDateStr.slice(0, 4)}`;
  }
  return anchorDateStr;
}
