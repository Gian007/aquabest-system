# AquaBest Super Admin Dashboard — Permanent Rules

> **Status:** Permanent project requirement. Future developers and coding agents MUST read this document before modifying the Super Admin Dashboard (`src/apps/OwnerOperations.jsx`, `src/utils/buildOwnerDashboardData.js`, or related dashboard styles).

## 1. Purpose
The Super Admin Dashboard is the **Business Command Center** for an AquaBest water-refilling station. It gives the station owner a fast, scannable overview of business performance without needing to open multiple modules.

It must prioritize:
- Business performance
- Financial overview
- Gallon and container movement
- Operational status
- Issues requiring attention
- Recent business activity

## 2. Approved Default Dashboard Sections & Order
The default section arrangement MUST use this exact order unless explicitly approved otherwise:

1. **Dashboard Header** (`Super Admin Dashboard`, short subtitle `Business Overview`, single primary action: `New Order`)
2. **Compact Date Range Selector** (ONE compact dropdown trigger defaulting to `Today`, e.g. `Today · Nov 27, 2026`)
3. **Business Performance Summary** (`summary`)
4. **Needs Attention** (`attention`)
5. **Sales Performance** (`salesChart`)
6. **Gallon & Container Activity** (`gallonActivity`)
7. **Operations Overview** (`operations`)
8. **Recent Business Activity** (`recentActivity`)

Stable section IDs (`summary`, `attention`, `salesChart`, `gallonActivity`, `operations`, `recentActivity`) MUST be preserved across updates so saved user arrangements never break.

## 2.1 Mandatory Navigation, Date Filter & Customization Rules
- **Dashboard Settings Placement:** Dashboard Settings must be accessed through `More > Settings > Customize Dashboard`. Do not render Dashboard Settings as a primary dashboard header action.
- **Single Compact Date Filter:** Dashboard and Sales Reports must use one compact date-range dropdown rather than displaying multiple permanent date-range buttons and separate navigation rows.
- **Viewing vs. Customization Separation:** Dashboard customization must be separate from dashboard viewing. The normal dashboard must remain focused on business information and operational actions.
- **No Redundant Navigation:** Do not duplicate `Reports` as a dashboard header button when `Reports` is already in the primary bottom navigation.

## 3. Dashboard Design Rules
- Maintain the AquaBest brand identity (`#1B2F63` navy, `#244EA3` primary blue, `#2AA9C5` aqua, `#EAF1FF` light tint, `#D9E2EC` borders).
- Preserve the existing shared management header, desktop sidebar, and mobile bottom navigation.
- Maintain consistent typography, spacing, colors, and card styling (`managementWeb.css`).
- Design mobile-first with zero page-level horizontal overflow and safe bottom clearance above the fixed mobile dock.
- Avoid unnecessary dashboard cards or decorative clutter.
- Do **not** duplicate the same business metrics in multiple sections (e.g. do not reintroduce a redundant `Business Snapshot`).
- Do **not** turn the Home Dashboard into a full Sales Reports page; Sales Reports remains its own dedicated module.
- Keep important information visible without excessive scrolling.
- Do **not** remove working module shortcuts or existing navigation.
- Do **not** introduce a different visual design system without explicit approval.

## 4. Data Integrity Rules
- All dashboard figures MUST be derived from their authoritative source (`orders`, `expenses`, `trips`, `stock`, `stockLog`, or the local/production API).
- Never hardcode demo numbers into calculation logic.
- Never fabricate operational counts, hourly timestamps, or container balances.
- Clearly distinguish **current-state metrics** (`Operations Overview`, `Available Gallon Stock`, `Outstanding Borrowed`) from **historical period metrics** (`Recorded Sales`, `Total Orders`, `Gallons Refilled`).
- Keep **Recorded Sales** separate from **Verified Collected**; never treat unpaid balances as collected cash.
- Keep **Borrowed / Returnable Containers** separate from **New Gallons Sold** and **Water Refills**.
- Do **not** calculate or display profit unless reliable, verified cost and expense records support it.

## 5. Regression Protection Rule
Any future dashboard update MUST preserve:
- Existing section visibility preferences (`visibility`).
- Existing section arrangement preferences (`order`).
- Existing navigation across Super Admin, Manager, and Staff.
- Existing saved user settings (migrate older schemas; never silently wipe valid preferences).
- Existing financial and operational calculations.
