// Unified data adapter for AquaBest Management System.
// Supports two explicit execution modes with one shared data interface:
//   1. 'demo' (default / GitHub Pages): bundles src/data/demo/aquabest-demo-2026.json
//      with browser-local localStorage persistence and zero backend dependency.
//   2. 'api' (local development): connects to the existing Express + SQLite temporary backend
//      through src/services/apiClient.js.

import bundledDemoDataset from '../data/demo/aquabest-demo-2026.json' with { type: 'json' };
import { apiClient } from './apiClient.js';
import { DEMO_PRICES } from '../data/managerDemo.js';

export const DEMO_WORKSPACE_STORAGE_KEY = 'aquabest-demo-workspace-2026-v1';
export const DEMO_DATASET_VERSION = bundledDemoDataset.metadata?.version || '2026.11.27-v1';

export function getDataMode(overrideMode) {
  if (overrideMode === 'api' || overrideMode === 'demo') return overrideMode;
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const envMode = String(env.VITE_DATA_MODE || '').trim().toLowerCase();
  if (envMode === 'api' || envMode === 'demo') return envMode;
  if (String(env.MODE || '').trim().toLowerCase() === 'api') return 'api';
  return 'demo';
}

export function isDemoMode(overrideMode) {
  return getDataMode(overrideMode) === 'demo';
}

function cloneDataset() {
  return JSON.parse(JSON.stringify(bundledDemoDataset));
}

function getStorage(customStorage) {
  if (customStorage !== undefined) return customStorage;
  return typeof window !== 'undefined' ? window.localStorage : null;
}

function buildInitialDemoWorkspace() {
  const data = cloneDataset();
  return {
    version: DEMO_DATASET_VERSION,
    initializedAt: new Date().toISOString(),
    metadata: data.metadata,
    demoAsOf: data.demo_as_of,
    business: data.business,
    operationalSettings: data.operational_settings,
    employees: data.employees || [],
    customers: data.customers || [],
    products: data.products || [],
    orders: data.orders || [],
    expenses: data.expenses || [],
    stock: (data.inventory || []).map(item => ({
      id: item.id,
      label: item.label,
      openingQuantity: item.openingQuantity,
      quantity: item.quantity,
      minimum: item.minimum
    })),
    supplies: data.supplies || [],
    stockLog: data.inventory_movements || [],
    containerMovements: data.container_movements || [],
    trips: data.trips || [],
    notifications: data.notifications || []
  };
}

export function loadDemoWorkspace(customStorage) {
  const storage = getStorage(customStorage);
  if (storage && typeof storage.getItem === 'function') {
    try {
      const raw = storage.getItem(DEMO_WORKSPACE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === DEMO_DATASET_VERSION && Array.isArray(parsed.orders)) {
          return parsed;
        }
      }
    } catch {
      // Fall through to deterministic re-initialization
    }
  }
  const initial = buildInitialDemoWorkspace();
  saveDemoWorkspace(initial, storage);
  return initial;
}

export function saveDemoWorkspace(workspace, customStorage) {
  const storage = getStorage(customStorage);
  if (!storage || typeof storage.setItem !== 'function') return workspace;
  try {
    storage.setItem(DEMO_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // Ignore storage quota errors in restricted browsers
  }
  return workspace;
}

export function resetDemoWorkspace(customStorage) {
  const storage = getStorage(customStorage);
  if (storage && typeof storage.removeItem === 'function') {
    try {
      storage.removeItem(DEMO_WORKSPACE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  const fresh = buildInitialDemoWorkspace();
  saveDemoWorkspace(fresh, storage);
  return fresh;
}

function mutateDemoWorkspace(mutator, customStorage) {
  const current = loadDemoWorkspace(customStorage);
  const next = mutator(current);
  saveDemoWorkspace(next, customStorage);
  return next;
}

export function createManagementDataAdapter({ mode, storage } = {}) {
  const activeMode = getDataMode(mode);

  return {
    mode: activeMode,
    isDemo: activeMode === 'demo',
    demoMeta: bundledDemoDataset.metadata,

    async loadWorkspace() {
      if (activeMode === 'demo') {
        const ws = loadDemoWorkspace(storage);
        return {
          mode: 'demo',
          backendStatus: 'demo',
          backendError: '',
          ...ws
        };
      }

      // API Mode: connect to existing local Express + SQLite temporary backend
      const health = await apiClient.health();
      const [ordRes, expRes, invRes, cmovRes, tripsRes] = await Promise.all([
        apiClient.getOrders(),
        apiClient.getExpenses(),
        apiClient.getInventory(),
        apiClient.getContainerMovements().catch(() => ({ movements: [] })),
        apiClient.getTrips().catch(() => ({ trips: [] }))
      ]);

      const stock = Array.isArray(invRes.items)
        ? invRes.items.map(i => ({ id: i.id, quantity: i.quantity, minimum: i.minimum }))
        : [];
      const stockLog = Array.isArray(invRes.movements)
        ? invRes.movements.map(m => ({
            id: m.id,
            productId: m.product_id,
            type: m.movement_type,
            quantity: m.quantity,
            reason: m.reason,
            orderId: m.order_id,
            automatic: Boolean(m.order_id),
            time: m.created_at
          }))
        : [];

      return {
        mode: 'api',
        backendStatus: 'online',
        backendError: '',
        health,
        metadata: { name: 'AquaBest Temporary Local SQLite Backend', synthetic: true },
        demoAsOf: health.businessDate || new Date().toISOString().slice(0, 10),
        operationalSettings: bundledDemoDataset.operational_settings,
        employees: bundledDemoDataset.employees,
        supplies: bundledDemoDataset.supplies,
        orders: ordRes.orders || [],
        expenses: expRes.expenses || [],
        stock,
        stockLog,
        containerMovements: cmovRes.movements || [],
        trips: Array.isArray(tripsRes.trips) && tripsRes.trips.length
          ? tripsRes.trips.map(t => ({
              id: t.id,
              orderId: t.stops?.[0]?.order_id || t.id,
              customer: t.stops?.[0]?.customer_name || 'Assigned delivery',
              address: 'Local SQLite backend trip',
              items: `${t.stops?.length || 1} stop(s)`,
              status: t.trip_status || 'Out for Delivery',
              paymentStatus: 'Unpaid',
              amount: 0,
              driver: t.assigned_employee || 'Driver A',
              expectedBottles: 1,
              bottlesLoaded: 1,
              emptiesCollected: 0,
              collectedCash: Math.round((t.stops?.[0]?.actual_cash_received_cents || 0) / 100),
              remittance: t.remittance_status || 'Not collected'
            }))
          : bundledDemoDataset.trips.slice(0, 3),
        notifications: []
      };
    },

    async createOrder(payload) {
      if (activeMode === 'api') {
        const res = await apiClient.createOrder(payload);
        return { order: res.order };
      }

      const nowIso = new Date().toISOString();
      const id = `DEMO-${String(Date.now()).slice(-6)}`;
      const isPaid = payload.paymentStatus === 'Paid';
      const status = payload.service === 'Walk-in' ? (isPaid ? 'Completed' : 'Confirmed') : 'Pending Confirmation';
      const items = (payload.items || []).map(it => ({
        sizeId: it.sizeId,
        quantity: Number(it.quantity) || 0,
        unit_price_cents: (DEMO_PRICES[it.sizeId] || 35) * 100,
        line_total_cents: (Number(it.quantity) || 0) * (DEMO_PRICES[it.sizeId] || 35) * 100,
        ownership: payload.ownership || 'own',
        arrangement: payload.arrangement || 'refill'
      }));
      const amount = items.reduce((s, it) => s + Math.round(it.line_total_cents / 100), 0);
      const record = {
        id,
        orderNumber: id,
        customer: String(payload.customer || '').trim() || 'Walk-in Customer',
        source: payload.source || 'Walk-in',
        service: payload.service || 'Walk-in',
        status,
        paymentStatus: payload.paymentStatus || 'Unpaid',
        paymentMethod: payload.paymentMethod || 'Cash',
        method: payload.paymentMethod || 'Cash',
        reference: payload.reference || '',
        amount,
        totalCents: amount * 100,
        ownership: payload.ownership || 'own',
        arrangement: payload.arrangement || 'refill',
        assigned: 'Unassigned',
        date: payload.date || bundledDemoDataset.demo_as_of,
        business_date: payload.date || bundledDemoDataset.demo_as_of,
        created_at: nowIso,
        createdAt: nowIso,
        updated_at: nowIso,
        completed_at: status === 'Completed' ? nowIso : null,
        notes: payload.notes || '',
        is_demo: true,
        items
      };

      const nextWs = mutateDemoWorkspace(ws => {
        let nextStock = ws.stock;
        let nextLog = ws.stockLog;
        let nextContainerMov = ws.containerMovements || [];

        if (record.ownership === 'store') {
          nextStock = ws.stock.map(s => {
            const match = items.find(i => i.sizeId === s.id);
            return match ? { ...s, quantity: Math.max(0, s.quantity - match.quantity) } : s;
          });
          const movEvents = items.map(it => ({
            id: `${id}-${it.sizeId}`,
            productId: it.sizeId,
            type: 'OUT',
            quantity: it.quantity,
            reason: record.arrangement === 'returnable' ? 'Returnable container issued' : 'New container sold',
            orderId: id,
            automatic: true,
            date: record.date,
            time: nowIso
          }));
          const cmovEvents = items.map(it => ({
            id: `CMOV-${id}-${it.sizeId}`,
            customer_name: record.customer,
            order_id: id,
            product_id: it.sizeId,
            quantity: it.quantity,
            movement_type: record.arrangement === 'returnable' ? 'borrowed' : 'sold',
            related_movement_id: null,
            date: record.date,
            recorded_at: nowIso
          }));
          nextLog = [...movEvents, ...ws.stockLog];
          nextContainerMov = [...cmovEvents, ...nextContainerMov];
        }

        return {
          ...ws,
          orders: [record, ...ws.orders],
          stock: nextStock,
          stockLog: nextLog,
          containerMovements: nextContainerMov
        };
      }, storage);

      return { order: record, workspace: nextWs };
    },

    async updateOrder(id, patch) {
      if (activeMode === 'api') {
        const res = await apiClient.updateOrder(id, patch);
        return { order: res.order };
      }

      const nowIso = new Date().toISOString();
      let updated = null;
      const nextWs = mutateDemoWorkspace(ws => ({
        ...ws,
        orders: ws.orders.map(o => {
          if (o.id !== id) return o;
          const completedAt = ['Completed', 'Delivered', 'Picked Up'].includes(patch.status) && !o.completed_at
            ? nowIso
            : o.completed_at;
          updated = { ...o, ...patch, updated_at: nowIso, completed_at: completedAt };
          return updated;
        })
      }), storage);

      return { order: updated, workspace: nextWs };
    },

    async recordInventoryMovement({ productId, type, quantity, reason }) {
      if (activeMode === 'api') {
        const res = await apiClient.recordInventoryMovement({ productId, type, quantity, reason });
        return { movement: res.movement };
      }

      const nowIso = new Date().toISOString();
      const qty = Number(quantity);
      const movement = {
        id: `MAN-${Date.now()}`,
        productId,
        type,
        quantity: qty,
        reason,
        orderId: null,
        automatic: false,
        date: bundledDemoDataset.demo_as_of,
        time: nowIso
      };

      const nextWs = mutateDemoWorkspace(ws => ({
        ...ws,
        stock: ws.stock.map(s =>
          s.id === productId ? { ...s, quantity: s.quantity + (type === 'IN' ? qty : -qty) } : s
        ),
        stockLog: [movement, ...ws.stockLog]
      }), storage);

      return { movement, workspace: nextWs };
    },

    async createExpense(payload) {
      if (activeMode === 'api') {
        const res = await apiClient.createExpense(payload);
        return { expense: res.expense };
      }

      const expense = {
        ...payload,
        id: `EXP-DEMO-${Date.now()}`,
        amount: Number(payload.amount),
        active: true
      };
      const nextWs = mutateDemoWorkspace(ws => ({
        ...ws,
        expenses: [expense, ...ws.expenses]
      }), storage);
      return { expense, workspace: nextWs };
    },

    async updateExpense(id, patch) {
      if (activeMode === 'api') {
        const res = await apiClient.updateExpense(id, patch);
        return { expense: res.expense };
      }

      let updated = null;
      const nextWs = mutateDemoWorkspace(ws => ({
        ...ws,
        expenses: ws.expenses.map(e => {
          if (e.id !== id) return e;
          updated = { ...e, ...patch };
          return updated;
        })
      }), storage);
      return { expense: updated, workspace: nextWs };
    },

    persistTrips(nextTrips) {
      if (activeMode !== 'demo') return;
      mutateDemoWorkspace(ws => ({ ...ws, trips: nextTrips }), storage);
    },

    resetDemoData() {
      return resetDemoWorkspace(storage);
    }
  };
}

export const managementDataAdapter = createManagementDataAdapter();
