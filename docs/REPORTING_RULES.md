# AquaBest Reporting & Gallon Rules

## 1. Financial Calculations
- **Gross Sales:** Sum of `orders.total_cents` where `status != 'Cancelled'`.
- **Verified Collected:** Sum of non-cancelled orders where `payment_status = 'Paid'`.
- **Outstanding Balance:** Sum of non-cancelled orders where `payment_status = 'Unpaid'`. Orders with missing/unknown statuses are tracked separately and never silently marked `Unpaid`.
- **Recorded Expenses:** Sum of active expenses (`active = 1`). Voided expenses (`active = 0`) remain in audit ledgers only.
- **Collections After Paid Expenses:** `Verified Collected - Paid Expenses` (cash-flow indicator, not net profit).

## 2. Timezone & Daily Sales Graph
- **Business Timezone:** `Asia/Manila` (UTC+8).
- `business_date` is stored as `YYYY-MM-DD` local calendar date.
- `created_at` is stored in ISO 8601 UTC.
- **Daily Mode 1 (Hourly):** When orders in the selected day have `created_at` timestamps, group into 24 hourly buckets (`12 AM`–`11 PM`) in `Asia/Manila`.
- **Daily Mode 2 (Daily Total Fallback):** When historical orders lack `created_at`, render a single `Daily Total` bar with the actual total revenue and order count, plus a disclosure that timestamps are missing. Never invent hourly distributions.

## 3. Gallon & Container Tracking
- **Water Refills:** Completed refill quantities (`refill_records` or completed orders with `arrangement != 'purchase'`).
- **New Gallons Sold:** Orders with `ownership = 'store'` and `arrangement = 'purchase'` (`container_movements.movement_type = 'sold'`).
- **Issued / Borrowed:** `container_movements` with `movement_type IN ('issued', 'borrowed')`.
- **Returned:** `container_movements` with `movement_type = 'returned'`.
- **Outstanding Borrowed:** `SUM(issued + borrowed) - SUM(returned)`.
