import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import CustomerWeb from './apps/CustomerWeb.jsx';
import ManagementWeb from './apps/ManagementWeb.jsx';
import SupabaseTest from './apps/SupabaseTest.jsx';

// Customer remains the default. Management previews share the same app shell.
// ?view=manager | staff | delivery | owner (all public demo routes; not authenticated).
// ?view=dbtest is a temporary Supabase connection check.
const params = new URLSearchParams(window.location.search);
const view = params.get('view');
const isManagement = view === 'manager' || view === 'staff' || view === 'delivery' || view === 'owner';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {view === 'dbtest' ? <SupabaseTest /> : isManagement ? <ManagementWeb role={view} /> : <CustomerWeb />}
  </StrictMode>
);