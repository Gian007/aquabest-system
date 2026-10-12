import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import CustomerWeb from './apps/CustomerWeb.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CustomerWeb />
  </StrictMode>
);
