// Namespaced, versioned localStorage preferences for Super Admin Dashboard personalization.
// NOTE: Dashboard visibility settings are UI personalization only, NOT security permissions.

export const DASHBOARD_SETTINGS_KEY = 'aquabest-super-admin-dashboard-settings-v1';
export const DASHBOARD_SETTINGS_VERSION = 1;

export const DASHBOARD_SECTIONS = Object.freeze([
  { id: 'summary', label: 'Business Performance Summary', description: 'Recorded sales, total orders, verified collections, and unpaid balances.' },
  { id: 'attention', label: 'Needs Attention', description: 'Actionable alerts for operational issues, low stock, and pending verifications.' },
  { id: 'salesChart', label: 'Sales Performance Summary', description: 'Revenue and order-count trends across date ranges.' },
  { id: 'gallonActivity', label: 'Gallon & Container Activity', description: 'Period refills, new container sales, borrowed/returned gallons, and stock.' },
  { id: 'operations', label: 'Operations Overview', description: 'Live counts for collection, refill, ready, and active delivery queues.' },
  { id: 'recentActivity', label: 'Recent Business Activity', description: 'Compact feed of recent orders and container stock movements.' }
]);

export const VALID_SECTION_IDS = DASHBOARD_SECTIONS.map(s => s.id);
export const VALID_DEFAULT_PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'All Time'];
export const VALID_DEFAULT_METRICS = ['revenue', 'orders'];
export const VALID_DENSITIES = ['comfortable', 'compact'];

export function getDefaultDashboardSettings() {
  return {
    version: DASHBOARD_SETTINGS_VERSION,
    visibility: {
      summary: true,
      attention: true,
      salesChart: true,
      gallonActivity: true,
      containerStock: true,
      operations: true,
      recentActivity: true,
      quickActions: true
    },
    order: [...VALID_SECTION_IDS],
    defaultPeriod: 'Daily',
    defaultMetric: 'revenue',
    density: 'comfortable',
    showSecondaryFinance: false,
    showContainerStock: false
  };
}

export function migrateDashboardSettings(raw) {
  if (!raw || typeof raw !== 'object') return getDefaultDashboardSettings();
  // Reject unknown future schema versions cleanly
  if (typeof raw.version === 'number' && raw.version > DASHBOARD_SETTINGS_VERSION) {
    return getDefaultDashboardSettings();
  }

  // Support migrating legacy/unversioned or v0 objects while preserving valid user choices
  const legacyVisibility = { ...(raw.visibility && typeof raw.visibility === 'object' ? raw.visibility : {}) };
  if (typeof raw.showSalesChart === 'boolean' && legacyVisibility.salesChart === undefined) {
    legacyVisibility.salesChart = raw.showSalesChart;
  }
  if (typeof raw.showQuickActions === 'boolean' && legacyVisibility.quickActions === undefined) {
    legacyVisibility.quickActions = raw.showQuickActions;
  }

  return sanitizeDashboardSettings({
    ...raw,
    version: DASHBOARD_SETTINGS_VERSION,
    visibility: legacyVisibility,
    defaultPeriod: raw.defaultPeriod ?? raw.period,
    defaultMetric: raw.defaultMetric ?? raw.metric
  });
}

export function sanitizeDashboardSettings(raw) {
  const defaults = getDefaultDashboardSettings();
  if (!raw || typeof raw !== 'object') return defaults;

  const rawVis = raw.visibility && typeof raw.visibility === 'object' ? raw.visibility : {};
  const visibility = { ...defaults.visibility };
  for (const key of Object.keys(defaults.visibility)) {
    if (typeof rawVis[key] === 'boolean') {
      visibility[key] = rawVis[key];
    }
  }

  // Prevent a completely blank/unusable dashboard: ensure at least one main section stays visible
  const anyMainVisible = VALID_SECTION_IDS.some(id => visibility[id]);
  if (!anyMainVisible) {
    visibility.summary = true;
  }

  const rawOrder = Array.isArray(raw.order) ? raw.order : [];
  const seen = new Set();
  const order = [];
  for (const id of rawOrder) {
    if (VALID_SECTION_IDS.includes(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const id of VALID_SECTION_IDS) {
    if (!seen.has(id)) order.push(id);
  }

  return {
    version: DASHBOARD_SETTINGS_VERSION,
    visibility,
    order,
    defaultPeriod: VALID_DEFAULT_PERIODS.includes(raw.defaultPeriod) ? raw.defaultPeriod : defaults.defaultPeriod,
    defaultMetric: VALID_DEFAULT_METRICS.includes(raw.defaultMetric) ? raw.defaultMetric : defaults.defaultMetric,
    density: VALID_DENSITIES.includes(raw.density) ? raw.density : defaults.density,
    showSecondaryFinance: typeof raw.showSecondaryFinance === 'boolean' ? raw.showSecondaryFinance : defaults.showSecondaryFinance,
    showContainerStock: typeof raw.showContainerStock === 'boolean' ? raw.showContainerStock : defaults.showContainerStock
  };
}

export function loadDashboardSettings(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage || typeof storage.getItem !== 'function') {
    return getDefaultDashboardSettings();
  }
  try {
    const raw = storage.getItem(DASHBOARD_SETTINGS_KEY);
    if (!raw) return getDefaultDashboardSettings();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return getDefaultDashboardSettings();
    }
    if (typeof parsed.version === 'number' && parsed.version > DASHBOARD_SETTINGS_VERSION) {
      return getDefaultDashboardSettings();
    }
    return migrateDashboardSettings(parsed);
  } catch {
    return getDefaultDashboardSettings();
  }
}

export function saveDashboardSettings(settings, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const clean = sanitizeDashboardSettings(settings);
  if (!storage || typeof storage.setItem !== 'function') return clean;
  try {
    storage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(clean));
  } catch {
    // Ignore storage quota/availability errors in browser
  }
  return clean;
}

export function resetDashboardSettings(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const defaults = getDefaultDashboardSettings();
  if (storage && typeof storage.removeItem === 'function') {
    try {
      storage.removeItem(DASHBOARD_SETTINGS_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return defaults;
}

export function moveDashboardSection(order, sectionId, direction) {
  const list = Array.isArray(order) ? [...order] : [...VALID_SECTION_IDS];
  const idx = list.indexOf(sectionId);
  if (idx === -1) return list;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= list.length) return list;
  const [item] = list.splice(idx, 1);
  list.splice(targetIdx, 0, item);
  return list;
}
