# AquaBest Three-Month Demonstration Dataset Guide

> **Synthetic Data Notice:** Every customer name, contact number, order, payment reference, expense, stock movement, container record, and delivery trip in this dataset is **100% synthetic demonstration data** generated for project adviser review and static GitHub Pages demonstration. No real customer or business transaction records are included.

---

## 1. Fixture Location & Bundling

- **Single Source of Truth:** `src/data/demo/aquabest-demo-2026.json`
- **Deterministic Generator Script:** `scripts/generate-demo-data.mjs`
- **JSON Schema:** `docs/schemas/aquabest-demo-data.schema.json`
- **Frontend Loader:** `src/services/managementDataAdapter.js` imports `aquabest-demo-2026.json` statically so Vite bundles it directly into the JavaScript build. No runtime HTTP fetch to `/aquabest-system/...` or `localhost` is required.

---

## 2. Date Coverage & Timezone

- **Coverage Window:** `2026-09-01` through `2026-11-27` (`demo_as_of: "2026-11-27"`)
- **Business Timezone:** `Asia/Manila` (`UTC+08:00`)
- **Future Transaction Rule:** Zero transactions are dated after `2026-11-27`.
- **Missing Timestamp Honesty:** Two historical orders on `2026-09-02` intentionally have `created_at: null` and `completed_at: null` to verify that hourly charts never fabricate timestamps for incomplete historical logs.

---

## 3. Three-Month Business Scenarios & Target Reconciliation

All totals below are computed dynamically from the underlying transaction and expense entries inside `src/data/demo/aquabest-demo-2026.json` (never hardcoded into UI cards):

| Period | Scenario | Completed Sales | Verified Collected | Unpaid Completed | Active Expenses | Recorded Operating Result (Demo) |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **September 2026** | Loss-Making Month | ₱31,850 | ₱28,950 | ₱2,900 | ₱35,200 | **-₱3,350** |
| **October 2026** | Recovery & Stable Operations | ₱42,600 | ₱39,900 | ₱2,700 | ₱37,450 | **+₱5,150** |
| **November 1–27, 2026** | Strong Business Performance | ₱48,900 | ₱44,650 | ₱4,250 | ₱40,300 | **+₱8,600** |
| **Three-Month Total** | Sep 1 – Nov 27, 2026 | **₱123,350** | **₱113,500** | **₱9,850** | **₱112,950** | **+₱10,400** |

### Scenario Highlights
- **September 2026 (Loss-Making):** Lower refill/delivery order volume (173 completed orders) combined with fixed rent, utilities, and emergency RO membrane/UV maintenance produces a negative operating result (`-₱3,350`). Includes 3 cancelled orders and 1 voided expense (both excluded from totals).
- **October 2026 (Recovery):** Steadier repeat commercial/household orders (218 completed orders), higher collection consistency (`₱39,900` paid), and controlled operating expenses (`₱37,450`) restore a positive operating result (`+₱5,150`).
- **November 1–27, 2026 (Strong Performance):** Peak volume (244 completed orders, including rich multi-hour, multi-source activity on `2026-11-27`), higher refill & delivery throughput, and expanded operating expenses (`₱40,300`) yield `+₱8,600`. Also includes 6 active in-progress operational orders on `2026-11-27` (`Pending Confirmation`, `Preparing`, `Ready`, `Out for Delivery`), 2 pending GCash verification proofs, 2 COD trips awaiting remittance (`₱490`), 1 failed delivery exception, and low stock on `2.5 Gallons Slim` (`18 < min 20`).

---

## 4. Financial Calculation Rules

1. **Completed Sales:** Sum of orders with status `Completed`, `Delivered`, or `Picked Up` (excludes `Pending Confirmation`, `Confirmed`, `Preparing`, `Ready`, `Out for Delivery`, and `Cancelled`).
2. **Verified Collected:** Sum of completed orders explicitly marked `paymentStatus: "Paid"`. Unpaid orders are never auto-marked paid.
3. **Unpaid Completed Sales:** Sum of completed orders marked `paymentStatus: "Unpaid"`.
4. **Active Recorded Expenses:** Sum of expenses where `active !== false`. Voided expenses (`active: false`) remain visible in audit/history but do not affect totals.
5. **Recorded Operating Result (Demo):** `Completed Sales − Active Recorded Expenses`. Explicitly labeled as a demonstration operating indicator, **not** an audited net profit calculation.
6. **Cash Pending Remittance:** Tracked separately on delivery trips (`remittance: "Awaiting Remittance"`), never merged into verified collected cash.

---

## 5. Data Structure & Relationships

- `orders` ↔ `order_items` (`order_id`), `customers` (`customerId`), `products` (`sizeId` / `product_id`)
- `payments` ↔ `orders` (`order_id`) and `customers` (`customer_id`)
- `inventory` (`openingQuantity`, `quantity`, `minimum`) ↔ `inventory_movements` (`openingQuantity + sum(IN) - sum(OUT) === quantity`)
- `container_movements` (`borrowed`, `returned`, `sold`) ↔ linked via `related_movement_id` (`sum(borrowed) - sum(returned) === outstandingBorrowed`)
- `trips` ↔ `delivery_stops` (`trip_id`, `order_id`)
- `employees`: Strictly preserves AquaBest's official **three-role model** (`Super Admin`, `Manager`, `Staff / Operations`) — no separate permanent `Delivery` role.

---

## 6. Updating & Resetting Demo Data

- **Regenerate Deterministic Fixture:**
  ```bash
  node scripts/generate-demo-data.mjs
  ```
- **Validate Financial, Inventory, and Container Reconciliation:**
  ```bash
  npm run validate:demo
  ```
- **Reset Demo State in Browser:**
  - Navigate to **More → Settings → Static Demo Dataset → Reset Demo Data** and confirm.
  - This clears `localStorage` key `aquabest-demo-workspace-2026-v1` and re-seeds cleanly from the bundled `aquabest-demo-2026.json`.
