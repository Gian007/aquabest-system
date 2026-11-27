# AquaBest Temporary REST API Contract

Base URL (local dev): `http://127.0.0.1:8787` (proxied at `/api` via Vite).

## Health
- `GET /api/health` → `{ ok: true, mode: "local-sqlite-temp", ordersCount, serverTime, businessDate }`

## Orders
- `GET /api/orders?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&status=...` → `{ orders: [...] }`
- `GET /api/orders/:id` → `{ order }` or `404`
- `POST /api/orders`
  - Request: `{ source, service, customer, paymentStatus, paymentMethod?, ownership?, arrangement?, date?, items: [{ sizeId, quantity }] }`
  - Response `201`: `{ order }` (includes server-generated `created_at`, `updated_at`, `business_date`)
  - Errors: `400` invalid source/service/items, `409` duplicate ID or insufficient store container stock.
- `PATCH /api/orders/:id`
  - Request: `{ status?, paymentStatus?, assigned? }`
  - Response `200`: `{ order }`

## Products & Inventory
- `GET /api/products` → `{ products }`
- `GET /api/inventory` → `{ items, movements }`
- `POST /api/inventory/movements` → `{ productId, type: "IN"|"OUT", quantity, reason, orderId? }` → `201 { movement }`

## Expenses
- `GET /api/expenses` → `{ expenses }`
- `POST /api/expenses` → `{ category, description, amount, date, paymentStatus, paymentMethod?, reference? }` → `201 { expense }`
- `PATCH /api/expenses/:id` → `{ active?, description?, category?, amount?, paymentStatus?, paymentMethod?, reference?, date? }` → `200 { expense }`

## Payments
- `GET /api/payments` → `{ payments }`
- `POST /api/payments` → `{ orderId, method, amount, reference? }` (sets `pending_verification` for non-Cash) → `201 { payment }`
- `PATCH /api/payments/:id/verification` → `{ decision: "paid"|"rejected" }` → `200 { payment }`

## Refills, Container Movements, Trips & Reports
- `GET /api/refills`, `POST /api/refills` (`{ orderId, productId, completedQuantity, assignedEmployee }`)
- `GET /api/container-movements`, `POST /api/container-movements` (`{ customerName?, orderId?, productId, quantity, movementType: "issued"|"borrowed"|"returned"|"sold" }`)
- `GET /api/trips`, `POST /api/trips`, `PATCH /api/trips/:id`, `POST /api/trips/:id/stops/:stopId/confirm`
- `GET /api/reports/summary?startDate=&endDate=`
- `GET /api/reports/sales`
- `GET /api/reports/container-activity`
- `POST /api/import/demo` (`{ orders, expenses }` — skips existing IDs, never overwrites)
