import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSalesReportData } from '../src/utils/buildSalesReportData.js';
import { buildOwnerDashboardData } from '../src/utils/buildOwnerDashboardData.js';
import { buildSalesChartData } from '../src/utils/buildSalesChartData.js';
import {
  createManagementDataAdapter,
  DEMO_WORKSPACE_STORAGE_KEY
} from '../src/services/managementDataAdapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_PATH = path.resolve(__dirname, '../src/data/demo/aquabest-demo-2026.json');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
}

test('three-month demo dataset reconciles exact September, October, and November financial targets', () => {
  const sep = buildSalesReportData({
    orders: dataset.orders,
    expenses: dataset.expenses,
    period: 'Monthly',
    anchorDate: '2026-09-15'
  });
  assert.equal(sep.completedSales, 31850);
  assert.equal(sep.verifiedCollectedCompleted, 28950);
  assert.equal(sep.unpaidCompletedSales, 2900);
  assert.equal(sep.recordedExpenses, 35200);
  assert.equal(sep.recordedOperatingResult, -3350);

  const oct = buildSalesReportData({
    orders: dataset.orders,
    expenses: dataset.expenses,
    period: 'Monthly',
    anchorDate: '2026-10-15'
  });
  assert.equal(oct.completedSales, 42600);
  assert.equal(oct.verifiedCollectedCompleted, 39900);
  assert.equal(oct.unpaidCompletedSales, 2700);
  assert.equal(oct.recordedExpenses, 37450);
  assert.equal(oct.recordedOperatingResult, 5150);

  const nov = buildSalesReportData({
    orders: dataset.orders,
    expenses: dataset.expenses,
    period: 'Monthly',
    anchorDate: '2026-11-27'
  });
  assert.equal(nov.completedSales, 48900);
  assert.equal(nov.verifiedCollectedCompleted, 44650);
  assert.equal(nov.unpaidCompletedSales, 4250);
  assert.equal(nov.recordedExpenses, 40300);
  assert.equal(nov.recordedOperatingResult, 8600);

  const all = buildSalesReportData({
    orders: dataset.orders,
    expenses: dataset.expenses,
    period: 'All Time',
    anchorDate: '2026-11-27'
  });
  assert.equal(all.completedSales, 123350);
  assert.equal(all.verifiedCollectedCompleted, 113500);
  assert.equal(all.unpaidCompletedSales, 9850);
  assert.equal(all.recordedExpenses, 112950);
  assert.equal(all.recordedOperatingResult, 10400);
});

test('Super Admin dashboard engine reconciles monthly scenarios and linked container borrowing', () => {
  const sepDash = buildOwnerDashboardData({
    orders: dataset.orders,
    expenses: dataset.expenses,
    trips: dataset.trips,
    stock: dataset.inventory,
    stockLog: dataset.inventory_movements,
    containerMovements: dataset.container_movements,
    period: 'Monthly',
    anchorDate: '2026-09-15',
    todayStr: '2026-11-27'
  });
  assert.equal(sepDash.financials.completedSales, 31850);
  assert.equal(sepDash.financials.recordedExpenses, 35200);
  assert.equal(sepDash.financials.recordedOperatingResult, -3350);

  const novDash = buildOwnerDashboardData({
    orders: dataset.orders,
    expenses: dataset.expenses,
    trips: dataset.trips,
    stock: dataset.inventory,
    stockLog: dataset.inventory_movements,
    containerMovements: dataset.container_movements,
    period: 'Monthly',
    anchorDate: '2026-11-27',
    todayStr: '2026-11-27'
  });
  assert.equal(novDash.financials.completedSales, 48900);
  assert.equal(novDash.financials.recordedExpenses, 40300);
  assert.equal(novDash.financials.recordedOperatingResult, 8600);

  const totalBorrowed = dataset.container_movements
    .filter(c => c.movement_type === 'borrowed' || c.movement_type === 'issued')
    .reduce((s, c) => s + c.quantity, 0);
  const totalReturned = dataset.container_movements
    .filter(c => c.movement_type === 'returned')
    .reduce((s, c) => s + c.quantity, 0);
  assert.ok(totalBorrowed > 0);
  assert.ok(totalReturned > 0);
  assert.equal(novDash.gallons.outstandingBorrowed, totalBorrowed - totalReturned);
});

test('inventory movements strictly reconcile from opening stock to ending inventory with low-stock item', () => {
  for (const item of dataset.inventory) {
    const movs = dataset.inventory_movements.filter(m => m.productId === item.id);
    const totalIn = movs.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0);
    const totalOut = movs.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0);
    assert.equal(
      item.openingQuantity + totalIn - totalOut,
      item.quantity,
      `Inventory mismatch for ${item.id}`
    );
  }
  assert.ok(dataset.inventory.some(i => i.quantity < i.minimum), 'Expected at least one low-stock container size');
});

test('data quality: no future dates, no duplicate order IDs, valid 3-role employees, and rich Nov 27 hourly chart', () => {
  const ids = new Set();
  for (const o of dataset.orders) {
    assert.equal(ids.has(o.id), false, `Duplicate order ID ${o.id}`);
    ids.add(o.id);
    assert.ok(o.date >= '2026-09-01' && o.date <= '2026-11-27', `Order date out of range: ${o.date}`);
  }
  for (const e of dataset.expenses) {
    assert.ok(e.date >= '2026-09-01' && e.date <= '2026-11-27', `Expense date out of range: ${e.date}`);
  }

  // Official three-role model preserved (no separate permanent Delivery role)
  const allowedRoles = new Set(['Super Admin', 'Manager', 'Staff / Operations']);
  for (const emp of dataset.employees) {
    assert.ok(allowedRoles.has(emp.role), `Unexpected employee role: ${emp.role}`);
  }

  // Rich Daily 24-hour multi-series chart on 2026-11-27 across all 4 sources & both fulfillment modes
  const dailySource = buildSalesChartData({
    orders: dataset.orders,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'source',
    metric: 'revenue',
    todayStr: '2026-11-27'
  });
  assert.equal(dailySource.buckets.length, 24);
  assert.equal(dailySource.hasHourlyTimestamps, true);
  assert.ok(dailySource.totalOrders >= 10);
  for (const sourceKey of ['Walk-in', 'Messenger', 'Phone', 'Online']) {
    const s = dailySource.series.find(x => x.key === sourceKey);
    assert.ok(s && s.totalOrders > 0, `Expected Nov 27 completed sales for ${sourceKey}`);
  }

  const dailyFulfillment = buildSalesChartData({
    orders: dataset.orders,
    period: 'Daily',
    anchorDate: '2026-11-27',
    breakdown: 'fulfillment',
    metric: 'revenue',
    todayStr: '2026-11-27'
  });
  assert.equal(dailyFulfillment.totalRevenue, dailySource.totalRevenue);
});

test('static Demo Mode adapter initializes once, persists mutations locally, and resets without network calls', async () => {
  const storage = createMemoryStorage();
  const adapter = createManagementDataAdapter({ mode: 'demo', storage });
  assert.equal(adapter.isDemo, true);

  const initial = await adapter.loadWorkspace();
  assert.equal(initial.mode, 'demo');
  assert.equal(initial.orders.length, dataset.orders.length);
  assert.ok(storage.getItem(DEMO_WORKSPACE_STORAGE_KEY));

  // Mutate in demo mode
  await adapter.createExpense({
    category: 'Fuel',
    description: 'Demo local fuel test',
    amount: 250,
    date: '2026-11-27',
    paymentStatus: 'Paid',
    paymentMethod: 'Cash'
  });

  // Reloading preserves browser-local mutation instead of overwriting it
  const reloaded = await adapter.loadWorkspace();
  assert.equal(reloaded.expenses.length, dataset.expenses.length + 1);

  // Explicit Reset Demo Data restores original fixture cleanly
  const reset = adapter.resetDemoData();
  assert.equal(reset.expenses.length, dataset.expenses.length);
});
