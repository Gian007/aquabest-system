# AquaBest Sales Reports & Graph — Permanent Rules

> **Status:** Permanent project requirement. Future developers and coding agents MUST read this file before changing `src/apps/SalesReports.jsx`, `src/utils/buildSalesChartData.js`, `src/utils/buildSalesReportData.js`, or PDF export logic.

## 1. Completed Sales Recognition vs. Payment Collection
- **Completed Sales Chart (Actual Sales):**
  - Only orders in authoritative completed/fulfilled states count as completed sales on the Sales Performance graph: `Completed`, `Delivered`, `Picked Up` (or stage `delivered`, `picked`).
  - **Excluded from completed-sales chart:** `Cancelled`, `Pending Confirmation`, `Confirmed`, `Preparing`, `Ready`, `Out for Delivery` (until actually completed).
  - **Unpaid completed sales** still count as completed revenue on the graph. Revenue recognition and payment collection are separate accounting events.
- **Financial Summary KPIs (`buildSalesReportData.js` & PDFs):**
  - `Gross Sales` = all non-cancelled recorded orders in the selected period.
  - `Verified Collected` = non-cancelled orders explicitly marked `Paid` (never auto-verify submitted proofs).
  - `Outstanding Balance` = non-cancelled orders explicitly marked `Unpaid` (missing/unknown statuses are tracked separately as `Not Recorded`).
  - `Recorded Expenses` = active expenses (`active !== false`); voided expenses stay in the audit ledger only.
  - `Collections After Paid Expenses` = `Verified Collected - Paid Expenses` (cash-flow indicator only, never labeled Net Profit).
- **Single Source of Truth:** Screen KPIs and both PDF formats MUST consume the exact same `buildSalesReportData()` output. Never compute independent totals in PDF code.

## 2. Timestamp & Timezone Rules
- **Business Timezone:** `Asia/Manila` (UTC+8) for all calendar date boundaries and hourly aggregation.
- Newly created/completed orders store:
  - `created_at`: authoritative UTC ISO 8601 order creation timestamp.
  - `updated_at`: authoritative UTC ISO 8601 last update timestamp.
  - `completed_at` (or `sale_at`): authoritative UTC ISO 8601 sale completion timestamp (walk-in sale completion, delivery completion, or pickup completion).
  - `business_date`: local `Asia/Manila` business date in `YYYY-MM-DD`.
- For the Sales Graph, prefer `completed_at` / `sale_at`; only fall back to `created_at` / `time` on records that are already in a completed status. Never use creation time as a sale timestamp for pending orders.

## 3. Daily Graph — Hourly Multi-Line Design (STRICT)
- **NO single oversized "Daily Total" bar chart.** The single-bar Daily Total fallback is prohibited.
- The Daily graph MUST always render a **24-hour multi-series line chart** (`12 AM`, `1 AM`, ..., `11 PM`) in `Asia/Manila` timezone.
- **Metric Toggle:** `Revenue` (default, formatted in PHP `₱`) | `Order Count`.
- **Breakdown Selector:** `Order Source` | `Fulfillment Mode`.
  - **Order Source Series & Fixed Colors (consistent across ALL periods):**
    - `Walk-in`: Orange (`#E67E22`)
    - `Messenger`: Blue (`#244EA3`)
    - `Phone`: Purple (`#7C3AED`)
    - `Online`: Green (`#138358`)
    - `Other / Unknown`: Neutral gray (`#64748D`) — displayed **only** when actual records contain Other/Unknown values.
  - **Fulfillment Mode Series & Fixed Colors (consistent across ALL periods):**
    - `Delivery`: Blue (`#244EA3`) — includes `Delivery`, `Pickup & Delivery`, `Drop-off & Delivery`, `Collect & Return (Same Bottles)`.
    - `Pickup`: Green (`#138358`) — includes `Pickup` and station counter `Walk-in`.
    - `Other / Unknown`: Neutral gray (`#64748D`) — displayed **only** when actual records lack a known fulfillment mode.
  - **Zero Double-Counting Invariant:** Every completed sale belongs to exactly one Source bucket AND exactly one Fulfillment bucket. Switching between `Order Source` and `Fulfillment Mode` MUST preserve identical total revenue and identical total order count.

## 4. Historical Records Without Timestamps
- Never invent, randomize, or evenly distribute revenue across 24 hours when timestamps are missing.
- Keep the 24-hour chart layout and horizontal axis visible (with no fabricated lines).
- Display the exact disclosure message:
  > `"Hourly breakdown unavailable for historical records because transaction times were not recorded."`
- If valid completed-sale totals exist for the selected day, display a compact summary of the completed total above or below the graph.

## 5. Multi-Period Aggregation & Single Date Filter Rules
- **Mandatory Single Date Filter:** Dashboard and Sales Reports must use one compact date-range dropdown rather than displaying multiple permanent date-range buttons and separate navigation rows.
- **Automatic Chart Grouping by Selected Preset:**
  - **Today / Yesterday (`Daily`):** 24 hourly buckets (`12 AM`–`11 PM`) in `Asia/Manila`.
  - **This Week / Last Week (`Weekly`):** 7 daily buckets (Sunday through Saturday).
  - **This Month / Last Month (`Monthly`):** 1 bucket per calendar day (handling 28/29/30/31-day months & leap years).
  - **This Year (`Yearly`):** 12 monthly buckets (`Jan`–`Dec`).
  - **All Time:** Monthly buckets (`<= 24` months) or Yearly buckets (`> 24` months).
  - **Custom Range:** Strictly bounded to `[startDate, endDate]` — daily (`<= 31` days), weekly (`32–90` days), or monthly (`> 90` days).
- All presets MUST support both `Revenue` / `Order Count` and `Order Source` / `Fulfillment Mode`.
- Previous/Next stepping (when available inside the date-range interaction) MUST respect local calendar math and never enter future dates.

## 6. Layout, Mobile Safety & Preserved Sections
- Preserve `Sales Breakdown`, `Transactions`, `Expenses`, KPI cards, financial integrity notice, and PDF export controls (`Financial Summary` 1-page PDF and `Complete Financial Report` multi-page PDF).
- Both Manager and Super Admin MUST continue rendering the same shared `SalesReports.jsx` component.
- On mobile, horizontal scrolling is permitted **only** inside the chart viewport (`.sales-chart-viewport`); the page itself MUST never horizontally overflow, and bottom navigation MUST not cover report content.

## 7. Mandatory Regression Tests
Every change to reporting or chart logic MUST pass `tests/salesReportData.test.js` and `tests/salesChartData.test.js`, verifying completed-sale inclusion, pending/cancelled exclusion, unpaid completed sale inclusion, Asia/Manila timezone conversion, missing timestamp handling, all 6 periods, source/fulfillment breakdown invariants, and zero double-counting.
