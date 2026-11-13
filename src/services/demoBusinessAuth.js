// Frontend demonstration ONLY. This is not authentication or authorization.
// Never store real passwords or use this for production access.
export const DEMO_BUSINESS_ACCOUNTS = Object.freeze([
  { username: 'admin', password: 'admin', role: 'owner', label: 'Owner / Admin' },
  { username: 'manager', password: 'manager', role: 'manager', label: 'Manager' },
  { username: 'staff', password: 'staff', role: 'staff', label: 'Operations Staff (Refill + Delivery)' },
]);

const SESSION_KEY = 'aquabest-business-demo-session-v1';
export function loginDemoBusiness(username, password) {
  const account = DEMO_BUSINESS_ACCOUNTS.find(
    (entry) => entry.username === username.trim().toLowerCase() && entry.password === password
  );
  if (!account) return null;
  const session = { role: account.role, username: account.username, label: account.label };
  try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* browser storage unavailable */ }
  return session;
}
export function getDemoBusinessSession() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
    return DEMO_BUSINESS_ACCOUNTS.some((a) => a.username === value?.username && a.role === value?.role)
      ? { username: value.username, role: value.role, label: value.label }
      : null;
  } catch { return null; }
}
export function logoutDemoBusiness() {
  try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* browser storage unavailable */ }
}
