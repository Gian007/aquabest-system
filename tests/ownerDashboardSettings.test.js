import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_SETTINGS_KEY,
  VALID_SECTION_IDS,
  getDefaultDashboardSettings,
  loadDashboardSettings,
  saveDashboardSettings,
  resetDashboardSettings,
  moveDashboardSection,
  sanitizeDashboardSettings
} from '../src/utils/ownerDashboardSettings.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, val) => map.set(key, String(val)),
    removeItem: key => map.delete(key)
  };
}

test('default dashboard settings match expected order and safe defaults', () => {
  const defaults = getDefaultDashboardSettings();
  assert.deepEqual(defaults.order, VALID_SECTION_IDS);
  assert.equal(defaults.defaultPeriod, 'Daily');
  assert.equal(defaults.defaultMetric, 'revenue');
  assert.equal(defaults.density, 'comfortable');
  assert.equal(defaults.visibility.summary, true);
});

test('corrupted or outdated saved settings fall back safely to defaults', () => {
  const corrupted = createMemoryStorage({ [DASHBOARD_SETTINGS_KEY]: '{not-valid-json' });
  assert.deepEqual(loadDashboardSettings(corrupted), getDefaultDashboardSettings());

  const outdated = createMemoryStorage({
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({ version: 999, defaultPeriod: 'Weekly' })
  });
  assert.deepEqual(loadDashboardSettings(outdated), getDefaultDashboardSettings());
});

test('saving and reloading settings preserves visibility, section order, and display preferences', () => {
  const storage = createMemoryStorage();
  const reordered = moveDashboardSection(VALID_SECTION_IDS, 'salesChart', -1);
  const custom = {
    ...getDefaultDashboardSettings(),
    order: reordered,
    defaultPeriod: 'Monthly',
    defaultMetric: 'orders',
    density: 'compact',
    showSecondaryFinance: true,
    visibility: {
      ...getDefaultDashboardSettings().visibility,
      recentActivity: false
    }
  };

  saveDashboardSettings(custom, storage);
  const loaded = loadDashboardSettings(storage);
  assert.deepEqual(loaded.order, reordered);
  assert.equal(loaded.defaultPeriod, 'Monthly');
  assert.equal(loaded.defaultMetric, 'orders');
  assert.equal(loaded.density, 'compact');
  assert.equal(loaded.showSecondaryFinance, true);
  assert.equal(loaded.visibility.recentActivity, false);
});

test('sanitizing prevents a completely blank dashboard when all sections are toggled off', () => {
  const allOff = {
    visibility: {
      summary: false,
      attention: false,
      salesChart: false,
      gallonActivity: false,
      containerStock: false,
      operations: false,
      recentActivity: false,
      quickActions: false
    }
  };
  const sanitized = sanitizeDashboardSettings(allOff);
  assert.equal(sanitized.visibility.summary, true);
});

test('migrates older/legacy saved settings while preserving valid user preferences', () => {
  const legacyStorage = createMemoryStorage({
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({
      version: 0,
      period: 'Weekly',
      metric: 'orders',
      density: 'compact',
      showSalesChart: false,
      order: ['operations', 'summary']
    })
  });

  const migrated = loadDashboardSettings(legacyStorage);
  assert.equal(migrated.version, 1);
  assert.equal(migrated.defaultPeriod, 'Weekly');
  assert.equal(migrated.defaultMetric, 'orders');
  assert.equal(migrated.density, 'compact');
  assert.equal(migrated.visibility.salesChart, false);
  assert.equal(migrated.order[0], 'operations');
  assert.equal(migrated.order[1], 'summary');
  assert.equal(migrated.order.length, VALID_SECTION_IDS.length);
});

test('resetting dashboard settings restores defaults without touching other storage keys', () => {
  const storage = createMemoryStorage({
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({ ...getDefaultDashboardSettings(), density: 'compact' }),
    'aquabest-staff-operations-demo-v1': JSON.stringify([{ id: 'ORD-1' }])
  });

  const reset = resetDashboardSettings(storage);
  assert.equal(reset.density, 'comfortable');
  assert.equal(storage.getItem(DASHBOARD_SETTINGS_KEY), null);
  assert.equal(storage.getItem('aquabest-staff-operations-demo-v1'), JSON.stringify([{ id: 'ORD-1' }]));
});
