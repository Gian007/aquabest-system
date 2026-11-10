import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import CustomerWeb from './apps/CustomerWeb.jsx';
import ManagementWeb from './apps/ManagementWeb.jsx';
import BusinessLogin from './apps/BusinessLogin.jsx';
import { getDemoBusinessSession, loginDemoBusiness, logoutDemoBusiness } from './services/demoBusinessAuth.js';

// Business roles share one sign-in. Legacy ?view=role URLs cannot grant a role.
// This is frontend demonstration only, NOT production authorization.
const view = new URLSearchParams(window.location.search).get('view');
const businessViews = ['business', 'login', 'manager', 'staff', 'delivery', 'owner'];
function App() {
  const [session, setSession] = useState(getDemoBusinessSession);
  const signIn = (username, password) => {
    const next = loginDemoBusiness(username, password);
    if (!next) return false;
    setSession(next);
    window.history.replaceState({}, '', import.meta.env.BASE_URL + '?view=business');
    return true;
  };
  const signOut = () => {
    logoutDemoBusiness();
    setSession(null);
    window.history.replaceState({}, '', import.meta.env.BASE_URL + '?view=business');
  };
  if (!businessViews.includes(view)) return <CustomerWeb />;
  return session
    ? <ManagementWeb key={session.role + ':' + session.username} role={session.role} onLogout={signOut} />
    : <BusinessLogin onLogin={signIn} />;
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
