# AquaBest — Backend Developer Handoff

## 1. Project Overview
AquaBest is a water-refilling station management system with Customer, Staff, Delivery, Manager, and Super Admin workflows.

## 2. Current Frontend Architecture
- **Framework:** React 19 + Vite 8 (`src/main.jsx`)
- **Business Roles:** `ManagementWeb.jsx`, `OwnerOperations.jsx`, `ManagerSimplified.jsx`, `StaffOperations.jsx`, `DeliveryOperations.jsx`
- **Shared Reporting:** `SalesReports.jsx` + `src/utils/buildSalesReportData.js` + `src/utils/reportDateUtils.js` + `src/utils/generateSalesReportPDF.js`
- **API Client:** `src/services/apiClient.js` (REST over Vite `/api` proxy)

## 3. Temporary Backend Architecture (Local Dev Only)
- **Runtime:** Node.js v24 + Express (`server/app.js`, `server/index.js`)
- **Database:** Built-in `node:sqlite` (`DatabaseSync`) stored at `server/data/aquabest-dev.sqlite`
- **Binding:** Strictly `127.0.0.1:8787` (never `0.0.0.0`, never deployed to GitHub Pages)
- **Migrations & Seed:** `server/db/migrate.js` + `server/db/migrations/001_initial.sql` + `server/db/seed.js`

## 4. What Is Implemented vs. Still Demo
- **Implemented in Temporary Backend:**
  - Persistent SQLite storage for Orders, Order Items, Products, Inventory, Inventory Movements, Expenses, Payments, Refills, Container Movements, Delivery Trips/Stops, and Audit Logs.
  - Transactional order creation with server-generated ISO UTC `created_at` / `updated_at` and `Asia/Manila` `business_date`.
  - Daily hourly chart (when `created_at` exists) + Daily Total fallback bar (when historical records lack timestamps).
- **Still Demo / Needs Production Replacement:**
  - `src/services/demoBusinessAuth.js` (`admin`/`admin`, `manager`/`manager`, `staff`/`staff`) is **not** real authentication.
  - Role enforcement must be implemented server-side with JWT/session auth and Row Level Security.
  - Delivery proof photos still use IndexedDB (`staffProofStorage.js`) until private object storage (e.g. Supabase Storage / S3) is wired.
  - Electronic payment verification (`GCash` / `Bank Transfer`) records `pending_verification` and requires real bank/e-wallet reconciliation.
