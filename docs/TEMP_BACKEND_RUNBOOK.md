# AquaBest Temporary Local Backend Runbook

This runbook documents how to run, verify, and reset the existing **local Express + SQLite temporary backend** (`server/`) used for local integration testing and backend developer handoff.

> **Execution Mode Separation:**
> - **GitHub Pages (Static Demo Mode):** Uses `VITE_DATA_MODE=demo` (`npm run build:pages`) and bundles `src/data/demo/aquabest-demo-2026.json`. It **never** calls `localhost` or waits for this backend.
> - **Local Development (API Mode):** Uses `VITE_DATA_MODE=api` (`npm run dev:api`) and connects through the Vite `/api` proxy to this temporary backend.

---

## 1. Prerequisites

- **Node.js 22.x** (uses built-in `node:sqlite`, no native C++ build toolchain required)
- **npm 10+**

---

## 2. Installation

```bash
npm ci
```

---

## 3. Starting the Temporary Backend

```bash
npm run dev:backend
```

Runs `node server/index.js`, automatically executes SQLite migrations (`server/db/migrate.js`) and idempotent seeding (`server/db/seed.js`), and binds strictly to loopback (`127.0.0.1:8787`).

---

## 4. Database Location

- **Default SQLite File:** `server/data/aquabest-dev.sqlite` (WAL journal mode)
- **Override Path:** Set environment variable `SQLITE_PATH` before starting (e.g., `SQLITE_PATH=./tmp/test.sqlite`).
- **Migrations:** `server/db/migrations/001_initial.sql` (manual run: `npm run db:migrate`)
- **Seed Script:** `server/db/seed.js` (manual run: `npm run db:seed`)

---

## 5. Environment Configuration

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `API_PORT` | `8787` | Port for Express backend (`server/index.js`) |
| `SQLITE_PATH` | `server/data/aquabest-dev.sqlite` | SQLite database file path |
| `VITE_DATA_MODE` | `demo` | Frontend data source: `demo` (static JSON) or `api` (local SQLite backend) |

No committed `.env` files are required: `npm run dev:api` passes `--mode api` (`import.meta.env.MODE === 'api'`), `npm run build:pages` passes `--mode demo`, and `VITE_DATA_MODE=api` / `VITE_DATA_MODE=demo` are also honored when set explicitly.

---

## 6. API Base URL & Vite Proxy

- **Backend Direct URL:** `http://127.0.0.1:8787`
- **Frontend Proxied Base:** `/api` (configured in `vite.config.js` to proxy `/api` → `http://127.0.0.1:8787`)

---

## 7. Health Check

```bash
curl http://127.0.0.1:8787/api/health
```

Expected response:
```json
{
  "ok": true,
  "mode": "local-sqlite-temp",
  "ordersCount": 4,
  "serverTime": "...",
  "businessDate": "2026-11-27"
}
```

---

## 8. Available Endpoints

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health & order count |
| `GET` | `/api/orders` | List orders (supports `startDate`, `endDate`, `status`) |
| `GET` | `/api/orders/:id` | Get single order with items |
| `POST` | `/api/orders` | Create order (validates & deducts store container stock atomically) |
| `PATCH` | `/api/orders/:id` | Update order status, payment status, or assignee |
| `GET` | `/api/products` | List active bottle/refill products |
| `GET` | `/api/inventory` | List current inventory & recent movements |
| `POST` | `/api/inventory/movements` | Record stock `IN` / `OUT` movement with required reason |
| `GET` | `/api/expenses` | List operating expenses |
| `POST` | `/api/expenses` | Create operating expense |
| `PATCH` | `/api/expenses/:id` | Update or void (`active: false`) an expense |
| `GET` | `/api/payments` | List recorded payments |
| `POST` | `/api/payments` | Record payment (electronic refs default to `pending_verification`) |
| `PATCH` | `/api/payments/:id/verification` | Approve (`paid`) or reject (`rejected`) electronic payment |
| `GET` | `/api/refills` | List completed refill records |
| `POST` | `/api/refills` | Record completed refill for an order |
| `GET` | `/api/container-movements` | List container borrow/return/sale ledger |
| `POST` | `/api/container-movements` | Record container `issued`, `borrowed`, `returned`, or `sold` |
| `GET` | `/api/trips` | List delivery trips with stops |
| `POST` | `/api/trips` | Dispatch new delivery trip |
| `PATCH` | `/api/trips/:id` | Update trip or remittance status |
| `POST` | `/api/trips/:id/stops/:stopId/confirm` | Confirm stop delivery or failure |
| `GET` | `/api/reports/summary` | Financial summary by date range |
| `GET` | `/api/reports/sales` | Dated/timestamped sales series |
| `GET` | `/api/reports/container-activity` | Container sold/borrowed/returned/outstanding totals |
| `POST` | `/api/import/demo` | Safely import demo orders/expenses idempotently |

---

## 9. Starting the Frontend in API Mode

1. Terminal 1 — Start the temporary SQLite backend:
   ```bash
   npm run dev:backend
   ```
2. Terminal 2 — Start Vite in API Mode:
   ```bash
   npm run dev:api
   ```
3. Open `http://localhost:5173/aquabest-system/?view=business` and sign in. The top banner will display **`API MODE — Local Temporary SQLite Backend (127.0.0.1:8787)`**.

---

## 10. Verifying Frontend & Backend Connectivity

1. Run backend automated tests:
   ```bash
   npm run test:backend
   ```
2. Verify live health endpoint returns `"ok": true`.
3. Create an expense or order in API Mode, refresh the browser, and confirm persistence in SQLite.

---

## 11. Resetting Temporary Test Data

Stop the backend server, delete the local SQLite database files, and restart:

```powershell
# PowerShell
Remove-Item server/data/aquabest-dev.sqlite* -Force -ErrorAction SilentlyContinue
npm run dev:backend
```

```bash
# macOS / Linux
rm -f server/data/aquabest-dev.sqlite*
npm run dev:backend
```

---

## 12. Known Limitations

- Local loopback (`127.0.0.1`) only — **not** hardened for public production hosting.
- No real authentication, JWT/session authorization, or payment gateway (GCash/bank) webhook verification.
- Designed strictly as a handoff reference for the future production backend (Laravel / Supabase / PostgreSQL).
