import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DATE_RANGE_PRESETS,
  formatDateRangeDisplay,
  resolveDateRangePreset,
  stepDateSelection,
  canStepForward
} from '../src/utils/dateRangePresets.js';

const TODAY = '2026-11-27';

test('date range presets expose all required presets including Today and Custom Range', () => {
  const ids = DATE_RANGE_PRESETS.map(p => p.id);
  assert.deepEqual(ids, [
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_year',
    'all_time',
    'custom'
  ]);
});

test('resolveDateRangePreset computes accurate ranges and chart periods for every preset', () => {
  const today = resolveDateRangePreset('today', { todayStr: TODAY });
  assert.equal(today.period, 'Daily');
  assert.equal(today.startDate, TODAY);
  assert.equal(today.endDate, TODAY);
  assert.equal(formatDateRangeDisplay(today), 'Today · Nov 27, 2026');

  const yesterday = resolveDateRangePreset('yesterday', { todayStr: TODAY });
  assert.equal(yesterday.period, 'Daily');
  assert.equal(yesterday.startDate, '2026-11-26');
  assert.equal(yesterday.endDate, '2026-11-26');
  assert.equal(formatDateRangeDisplay(yesterday), 'Yesterday · Nov 26, 2026');

  const thisWeek = resolveDateRangePreset('this_week', { todayStr: TODAY });
  assert.equal(thisWeek.period, 'Weekly');
  assert.equal(thisWeek.startDate, '2026-11-22');
  assert.equal(thisWeek.endDate, TODAY);
  assert.match(formatDateRangeDisplay(thisWeek), /^This Week · Nov 22 – Nov 27, 2026$/);

  const lastWeek = resolveDateRangePreset('last_week', { todayStr: TODAY });
  assert.equal(lastWeek.period, 'Weekly');
  assert.equal(lastWeek.startDate, '2026-11-15');
  assert.equal(lastWeek.endDate, '2026-11-21');

  const thisMonth = resolveDateRangePreset('this_month', { todayStr: TODAY });
  assert.equal(thisMonth.period, 'Monthly');
  assert.equal(thisMonth.startDate, '2026-11-01');
  assert.equal(thisMonth.endDate, TODAY);

  const lastMonth = resolveDateRangePreset('last_month', { todayStr: TODAY });
  assert.equal(lastMonth.period, 'Monthly');
  assert.equal(lastMonth.startDate, '2026-10-01');
  assert.equal(lastMonth.endDate, '2026-10-31');

  const thisYear = resolveDateRangePreset('this_year', { todayStr: TODAY });
  assert.equal(thisYear.period, 'Yearly');
  assert.equal(thisYear.startDate, '2026-01-01');
  assert.equal(thisYear.endDate, TODAY);

  const allTime = resolveDateRangePreset('all_time', {
    todayStr: TODAY,
    records: [{ date: '2025-04-12' }, { date: '2026-11-20' }]
  });
  assert.equal(allTime.period, 'All Time');
  assert.equal(formatDateRangeDisplay(allTime), 'All Time');
});

test('custom range uses Daily period for single day, Custom for multi-day, and clamps invalid/future dates', () => {
  const singleDay = resolveDateRangePreset('custom', {
    todayStr: TODAY,
    customStart: '2026-11-10',
    customEnd: '2026-11-10'
  });
  assert.equal(singleDay.period, 'Daily');
  assert.equal(singleDay.anchorDate, '2026-11-10');
  assert.equal(formatDateRangeDisplay(singleDay), 'Nov 10, 2026');

  const multiDay = resolveDateRangePreset('custom', {
    todayStr: TODAY,
    customStart: '2026-11-01',
    customEnd: '2026-11-15'
  });
  assert.equal(multiDay.period, 'Custom');
  assert.equal(formatDateRangeDisplay(multiDay), 'Nov 1 – Nov 15, 2026');

  const inverted = resolveDateRangePreset('custom', {
    todayStr: TODAY,
    customStart: '2026-11-20',
    customEnd: '2026-11-10'
  });
  assert.equal(inverted.startDate, '2026-11-20');
  assert.equal(inverted.endDate, '2026-11-20');
  assert.equal(inverted.period, 'Daily');

  const future = resolveDateRangePreset('custom', {
    todayStr: TODAY,
    customStart: '2026-12-30',
    customEnd: '2026-12-31'
  });
  assert.equal(future.startDate, TODAY);
  assert.equal(future.endDate, TODAY);
});

test('stepDateSelection moves cleanly across ranges and blocks stepping past today', () => {
  const today = resolveDateRangePreset('today', { todayStr: TODAY });
  assert.equal(canStepForward(today, TODAY), false);
  assert.deepEqual(stepDateSelection(today, 1, TODAY), today);

  const backOne = stepDateSelection(today, -1, TODAY);
  assert.equal(backOne.preset, 'yesterday');
  assert.equal(backOne.startDate, '2026-11-26');
  assert.equal(canStepForward(backOne, TODAY), true);

  const forwardAgain = stepDateSelection(backOne, 1, TODAY);
  assert.equal(forwardAgain.preset, 'today');
  assert.equal(forwardAgain.startDate, TODAY);

  const allTime = resolveDateRangePreset('all_time', { todayStr: TODAY });
  assert.equal(canStepForward(allTime, TODAY), false);
});
