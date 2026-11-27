import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_SETTINGS_KEY,
  DASHBOARD_SETTINGS_VERSION,
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

test('default dashboard settings match expected order, v2 schema, and safe defaults', () => {
  const defaults = getDefaultDashboardSettings();
  assert.equal(defaults.version, DASHBOARD_SETTINGS_VERSION);
  assert.equal(defaults.version, 2);
  assert.deepEqual(defaults.order, VALID_SECTION_IDS);
  assert.equal(defaults.defaultPeriod, 'Daily');
  assert.equal(defaults.defaultPreset, 'today');
  assert.equal(defaults.defaultMetric, 'revenue');
  assert.equal(defaults.density, 'comfortable');
  assert.equal(defaults.visibility.summary, true);
  assert.equal(defaults.metrics.recordedSales, true);
  assert.equal(defaults.metrics.gallonsRefilled, true);
});

test('corrupted or outdated saved settings fall back safely to defaults', () => {
  const corrupted = createMemoryStorage({ [DASHBOARD_SETTINGS_KEY]: '{not-valid-json' });
  assert.deepEqual(loadDashboardSettings(corrupted), getDefaultDashboardSettings());

  const outdated = createMemoryStorage({
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({ version: 999, defaultPeriod: 'Weekly' })
  });
  assert.deepEqual(loadDashboardSettings(outdated), getDefaultDashboardSettings());
});

test('saving and reloading settings preserves visibility, metrics, section order, and display preferences', () => {
  const storage = createMemoryStorage();
  const reordered = moveDashboardSection(VALID_SECTION_IDS, 'salesChart', -1);
  const custom = {
    ...getDefaultDashboardSettings(),
    order: reordered,
    defaultPeriod: 'Monthly',
    defaultPreset: 'this_month',
    defaultMetric: 'orders',
    density: 'compact',
    showSecondaryFinance: true,
    visibility: {
      ...getDefaultDashboardSettings().visibility,
      recentActivity: false
    },
    metrics: {
      ...getDefaultDashboardSettings().metrics,
      outstandingBorrowed: false,
      unpaidBalance: false
    }
  };

  saveDashboardSettings(custom, storage);
  const loaded = loadDashboardSettings(storage);
  assert.deepEqual(loaded.order, reordered);
  assert.equal(loaded.defaultPeriod, 'Monthly');
  assert.equal(loaded.defaultPreset, 'this_month');
  assert.equal(loaded.defaultMetric, 'orders');
  assert.equal(loaded.density, 'compact');
  assert.equal(loaded.showSecondaryFinance, true);
  assert.equal(loaded.visibility.recentActivity, false);
  assert.equal(loaded.metrics.outstandingBorrowed, false);
  assert.equal(loaded.metrics.unpaidBalance, false);
});

test('sanitizing prevents a completely blank dashboard or blank primary summary KPIs', () => {
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
    },
    metrics: {
      recordedSales: false,
      totalOrders: false,
      verifiedCollected: false,
      unpaidBalance: false
    }
  };
  const sanitized = sanitizeDashboardSettings(allOff);
  assert.equal(sanitized.visibility.summary, true);
  assert.equal(sanitized.metrics.recordedSales, true);
});

test('migrates v0 and v1 saved settings to v2 while preserving valid user preferences', () => {
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

  const migratedV0 = loadDashboardSettings(legacyStorage);
  assert.equal(migratedV0.version, 2);
  assert.equal(migratedV0.defaultPeriod, 'Weekly');
  assert.equal(migratedV0.defaultPreset, 'this_week');
  assert.equal(migratedV0.defaultMetric, 'orders');
  assert.equal(migratedV0.density, 'compact');
  assert.equal(migratedV0.visibility.salesChart, false);
  assert.equal(migratedV0.order[0], 'operations');
  assert.equal(migratedV0.order[1], 'summary');
  assert.equal(migratedV0.order.length, VALID_SECTION_IDS.length);

  const v1Storage = createMemoryStorage({
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({
      version: 1,
      defaultPeriod: 'Monthly',
      defaultMetric: 'revenue',
      density: 'comfortable',
      visibility: { recentActivity: false },
      order: ['salesChart', 'summary']
    })
  });
  const migratedV1 = loadDashboardSettings(v1Storage);
  assert.equal(migratedV1.version, 2);
  assert.equal(migratedV1.defaultPreset, 'this_month');
  assert.equal(migratedV1.visibility.recentActivity, false);
  assert.equal(migratedV1.metrics.recordedSales, true);
  assert.equal(migratedV1.order[0], 'salesChart');
});

test('resetting dashboard settings restores defaults without touching other storage keys', () => {
  const storage = createMemoryStorage({
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({ ...getDefaultDashboardSettings(), density: 'compact' }),
    'aquabest-staff-operations-demo-v1': JSON.stringify([{ id: 'ORD-1' }])
  });

  const reset = resetDashboardSettings(storage);
  assert.equal(reset.density, 'comfortable');
  assert.equal(reset.defaultPreset, 'today');
  assert.equal(storage.getItem(DASHBOARD_SETTINGS_KEY), null);
  assert.equal(storage.getItem('aquabest-staff-operations-demo-v1'), JSON.stringify([{ id: 'ORD-1' }]));
});
