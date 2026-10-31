import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import CustomerWeb from './apps/CustomerWeb.jsx';
import ManagementWeb from './apps/ManagementWeb.jsx';

// Separate views for the customer site and the future manager APK.
// GitHub Pages: /aquabest-system/?view=manager or /?view=manager
const params = new URLSearchParams(window.location.search);
const isManager = params.get('view') === 'manager';
createRoot(document.getElementById('root')).render(
  <StrictMode>{isManager ? <ManagementWeb /> : <CustomerWeb />}</StrictMode>
);
