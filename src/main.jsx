import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import CustomerWeb from './apps/CustomerWeb.jsx';
import ManagementWeb from './apps/ManagementWeb.jsx';

// Customer remains the default. Management previews share the same app shell.
// ?view=manager | staff | delivery | owner (all public demo routes; not authenticated).
const params = new URLSearchParams(window.location.search);
const view = params.get('view');
const isManagement = view === 'manager' || view === 'staff' || view === 'delivery' || view === 'owner';
createRoot(document.getElementById('root')).render(
  <StrictMode>{isManagement ? <ManagementWeb role={view} /> : <CustomerWeb />}</StrictMode>
);
