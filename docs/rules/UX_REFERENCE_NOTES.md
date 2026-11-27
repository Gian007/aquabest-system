# AquaBest UX Reference Notes (Research & Pattern Analysis)

> Research conducted using official product documentation and web references prior to implementing the Super Admin Dashboard Information Architecture rework.

## 1. Shopify Analytics Overview Dashboard
- **Source URL:** https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard
- **Reference Type:** Official Shopify Help Center documentation (text/structure inspected via web search; live authenticated admin screenshots were not accessed).
- **Useful UX Patterns:**
  - Single top-level **Date range menu** (calendar icon + human-readable preset label like *Today*, *Last 7 days*, *Month to date*) instead of multiple rows of period buttons.
  - Clear visual separation between quick-scan overview cards on the home dashboard and deeper tabular reports in the dedicated Reports module.
  - Explicit separation of **Custom range** inside the same date menu so default viewing stays uncluttered.
- **How It Applies to AquaBest:**
  - Replace the two permanent rows (`Daily | Weekly | Monthly | Yearly | All Time | Custom` + `Prev | Date | Next`) with **one compact Date Range dropdown** defaulting to `Today · [Date]`.
  - Keep the Home Dashboard focused on high-level business oversight while full ledgers, PDF exports, and detailed breakdowns live in **Reports** (accessible via the bottom navigation).
- **What NOT to Copy:**
  - Do not introduce ShopifyQL query editors, multi-currency conversion selectors, or complex drag-and-drop canvas editors (too technical for a water-refilling station owner).

## 2. Shopify Overview Dashboard Customization
- **Source URL:** https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/customizing-overview-dashboard
- **Reference Type:** Official Shopify Help Center documentation.
- **Useful UX Patterns:**
  - Separating **dashboard viewing mode** from **customization mode**, so configuration controls do not clutter everyday operational monitoring.
  - Explicit **Save** / **Cancel** confirmation workflow when editing layout preferences.
- **How It Applies to AquaBest:**
  - Remove the `Dashboard Settings` button from the primary Dashboard header.
  - Place **Customize Dashboard** cleanly inside `More > Settings > Customize Dashboard` with three focused tabs (**Sections**, **Metrics**, **Layout**) plus **Save Changes**, **Cancel**, and **Reset to Default** (with confirmation).
- **What NOT to Copy:**
  - Do not use complex freeform drag-and-drop card resizing on mobile; use reliable **Move Up / Move Down** buttons and toggle switches.

## 3. Shopify Custom Reports & Time Ranges
- **Source URL:** https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/custom-reports/time-ranges
- **Reference Type:** Official Shopify Help Center documentation.
- **Useful UX Patterns:**
  - Distinguishing **date range selection** (e.g. *Today*, *This Week*, *This Month*) from **chart grouping interval** (hourly vs. daily vs. monthly), automatically choosing a sensible interval so non-technical owners do not have to configure technical chart granularity manually.
  - Keeping fixed and custom calendar ranges inside one unified picker.
- **How It Applies to AquaBest:**
  - `Today` / `Yesterday` automatically group **Hourly** (24-hour multi-line chart).
  - `This Week` / `Last Week` / `This Month` / `Last Month` automatically group **Daily**.
  - `This Year` automatically groups **Monthly**.
  - `All Time` groups **Monthly** (or **Yearly** for > 24 months); `Custom Range` adapts automatically based on selected span.
- **What NOT to Copy:**
  - Do not expose minute-level live event scrubbing or complex rolling-window configuration checkboxes.

## 4. Stripe Dashboard Home Page Charts
- **Source URL:** https://support.stripe.com/questions/dashboard-home-page-charts-for-business-insights
- **Reference Type:** Official Stripe Support documentation.
- **Useful UX Patterns:**
  - Explicit financial honesty: home charts display quick operational insights while accounting-grade reconciliation belongs in Financial Reports, and off-system/unverified amounts are clearly distinguished from settled funds.
  - Single dropdown date selector paired with clean metric focus rather than dense multi-control toolbars.
- **How It Applies to AquaBest:**
  - Maintain unmistakable distinction between **Recorded Sales**, **Verified Collected**, **Unpaid / Unverified**, and **Active Expenses**.
  - Never imply recorded sales equal collected cash, and never label sales minus expenses as net profit.
- **What NOT to Copy:**
  - Do not copy Stripe's financial/API developer terminology (`gross volume`, `payout settlement`, `FX estimates`). Use plain language tailored to a Philippine water-refilling station.

## 5. Square Dashboard / Mobile POS Analytics Patterns
- **Source Reference:** Square Dashboard mobile POS UX pattern research (`squareup.com`, `uxpatterns.dev`).
- **Useful UX Patterns:**
  - Presets first (*Today*, *Yesterday*, *This Week*, *This Month*) for 1-tap pulse checks, with **Custom Range** launching a clean inline/bottom-sheet date range form (`Start Date`, `End Date`, `Apply`, `Cancel`).
  - Always display the resolved date range explicitly on the selector trigger (e.g., `Today · Nov 27, 2026` or `Nov 1 – Nov 27, 2026`) so the owner never guesses what timeframe cards and charts represent.
  - Thumb-friendly >= 44px tap targets and clear separation above mobile bottom navigation.
- **What NOT to Copy:**
  - Do not copy Square's monochrome dark branding; strictly preserve AquaBest's blue/aqua/navy identity.
