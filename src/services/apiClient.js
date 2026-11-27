// Frontend REST API client for the temporary local SQLite/Express backend.
// Communicates via Vite proxy (/api -> http://127.0.0.1:8787).

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
  } catch {
    throw new Error('Local backend is unreachable. Start it with: npm run dev:backend');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const apiClient = {
  health: () => request('/api/health'),
  getOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/orders${qs ? `?${qs}` : ''}`);
  },
  createOrder: payload => request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrder: (id, patch) => request(`/api/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  getInventory: () => request('/api/inventory'),
  recordInventoryMovement: payload => request('/api/inventory/movements', { method: 'POST', body: JSON.stringify(payload) }),

  getExpenses: () => request('/api/expenses'),
  createExpense: payload => request('/api/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  updateExpense: (id, patch) => request(`/api/expenses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  completeRefill: payload => request('/api/refills', { method: 'POST', body: JSON.stringify(payload) }),
  getContainerMovements: () => request('/api/container-movements'),
  recordContainerMovement: payload => request('/api/container-movements', { method: 'POST', body: JSON.stringify(payload) }),

  getTrips: () => request('/api/trips'),
  importDemo: payload => request('/api/import/demo', { method: 'POST', body: JSON.stringify(payload) })
};
