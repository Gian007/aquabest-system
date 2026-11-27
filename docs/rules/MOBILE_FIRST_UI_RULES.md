# AquaBest Mobile-First UI Rules (Permanent Standard)

> **Status:** Mandatory permanent frontend engineering standard. Future developers and coding agents **MUST** read this file before modifying any AquaBest frontend layout, component, chart, or stylesheet.

---

## 1. Mobile-First Design Principles

1. **Design and validate the mobile layout before desktop.** Mobile phones are the primary daily interface for AquaBest staff, drivers, managers, and owners.
2. **Desktop adapts from mobile — never the reverse.** Expand grids and spacing progressively at wider breakpoints rather than shrinking a desktop layout onto a phone.
3. **Prioritize real phone ergonomics** (thumb reach, clean vertical scan flow, generous hit zones).
4. **Never assume users have a large screen.** Every screen must be immediately usable at `320px–390px` width.
5. **Never sacrifice readability to squeeze more information onto one row.**
6. **Prefer clear vertical grouping over cramped horizontal bars.**
7. **Maintain consistent spacing, typography, color tokens, and card patterns** across modules.
8. **Preserve the AquaBest brand identity** (`#1B2F63` navy, `#244EA3` primary blue, `#2AA9C5` aqua, `#EAF1FF` light tint, `#F8FBFF` page surface, `#D9E2EC` borders).

---

## 2. Responsive Layout Rules

- **Zero horizontal page overflow** across all viewports (`320px` through `1440px`).
- **Zero clipped text** and **zero overlapping labels, amounts, badges, icons, or controls**.
- **No fixed desktop pixel widths** (`width: 600px`, `min-width: 540px` outside an explicit chart scroll container) that break narrow mobile screens.
- Cards and containers must include `min-width: 0` in flex/grid parents so children resize cleanly.
- Grid columns must collapse gracefully (e.g., 1 column at `320px–479px`, 2 columns at `480px–899px`, multi-column at `900px+`).
- Long customer names, addresses, or category labels must wrap safely (`overflow-wrap: break-word`).
- Currency and numeric values must remain intact (`white-space: nowrap`) and right-aligned in summary rows so they never collide with labels.
- Tables must have an intentional mobile card/row presentation instead of squished columns.
- **Bottom navigation protection:** Fixed mobile bottom navigation must never cover page content or action buttons; account for `env(safe-area-inset-bottom, 0px)`.
- Forms must remain scrollable and usable when the mobile on-screen keyboard is open.

---

## 3. Typography Rules

- Use legible mobile font sizes (`13px–14px` body/controls, `11px–12px` supporting labels; avoid illegible sub-10px text).
- Establish a clear visual hierarchy: page title → section title → primary figure → supporting context.
- **Always use tabular numbers (`font-variant-numeric: tabular-nums`)** for currency, KPI totals, and order counts.
- **Never fix a broken layout by shrinking font sizes.** Fix the flex/grid structure, grouping, or breakpoints instead.
- Keep line height comfortable (`1.35–1.5`) so wrapped multi-line labels remain easy to scan.
- Prevent currency symbols and numbers from breaking across lines mid-figure.

---

## 4. Buttons & Touch Interaction Rules

- **Touch targets should be at least `44px` tall** (`min-height: 44px`) for primary buttons, segmented controls, filter chips, and dropdown triggers.
- Every interactive control MUST have clear `active`, `inactive`, `hover`/`focus-visible`, `disabled`, and `loading` states.
- **Never render decorative controls that do nothing.** Every clickable chip, legend item, or filter must perform a real action.
- Active filters must be visually unmistakable (distinct fill/border/indicator, plus `aria-pressed` or `aria-selected`).
- Dropdowns and popovers must fit cleanly within `100vw` on mobile (`width: min(..., calc(100vw - 24px))`) and remain easy to tap on touchscreens.
- Maintain clear gaps (`>= 6px–8px`) between adjacent tap targets to avoid accidental taps.
- Keep primary workflow actions easy to reach without excessive horizontal scrolling.

---

## 5. Charts & Analytics Rules

- Charts must be responsive and use available width cleanly on both mobile and desktop.
- **Summary & breakdown rows must never concatenate inline.** Display a clear summary hero (headline total + count) followed by structured, separated rows or cards with right-aligned tabular figures.
- **Consistent series color semantics:**
  - Order Source: `Walk-in` (`#E67E22` Orange), `Messenger` (`#244EA3` Blue), `Phone` (`#7C3AED` Purple), `Online` (`#138358` Green), `Other / Unknown` (`#64748D` Neutral gray — only when present in actual data).
  - Fulfillment Mode: `Pickup` (`#138358` Green), `Delivery` (`#244EA3` Blue), `Other / Unknown` (`#64748D` — only when present in actual data).
- **Mandatory `All` + single-series isolation:** When a chart supports series filtering, include an `All` option and allow isolating any individual series cleanly (only one selection active at a time). Switching breakdown dimensions (`Order Source` ↔ `Fulfillment Mode`) MUST reset selection to `All`.
- **Metric formatting integrity:** Never show currency symbols (`₱`) on an `Order Count` chart axis, summary, breakdown, or tooltip.
- **Touch-friendly tooltips:** Place active point details in a dedicated, non-clipped summary card below the chart viewport so tapped points are always readable on phones without getting scrolled off-screen.
- **Data honesty:** Never fabricate hourly timestamps for records that lack them; never mix `Recorded Sales` with `Verified Collected`; never double-count completed sales across breakdowns.

---

## 6. Component & CSS Reuse Rules

- Reuse existing AquaBest CSS variables (`--a-navy`, `--a-primary`, `--a-aqua`, `--a-line`, `--a-muted`) and shared UI primitives (`DateRangeSelector`, `mgmt-card`, `mgmt-btn`).
- Avoid duplicating stylesheet rules across modules.
- Avoid unnecessary inline styles that bypass responsive CSS media queries.
- Keep responsive overrides neatly scoped to their component classes — never add broad global selectors that unintentionally mutate unrelated pages.

---

## 7. Mandatory Viewport Validation Checklist

Every future AquaBest frontend change MUST be checked across these viewport widths before merging or deploying:

| Category | Required Widths | Primary Check Focus |
| :--- | :--- | :--- |
| **Narrow Mobile** | `320px`, `360px` | Zero horizontal page overflow, single-column collapse, zero clipped amounts or overlapping labels |
| **Standard Mobile** | `375px`, `390px`, `430px` | Touch target size (`>= 44px`), comfortable spacing, bottom nav clearance, readable charts & tooltips |
| **Tablet** | `768px` | Balanced 2-column grids, clean control grouping |
| **Desktop** | `1024px`, `1440px` | Balanced horizontal utilization, no excessively stretched empty chart space |

> **Special Rule for `320px`:** The `320px` viewport is mandatory for catching subtle overflow, awkward wrapping, and amount truncation. Never skip `320px`.
