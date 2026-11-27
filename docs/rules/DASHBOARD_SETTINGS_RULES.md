# AquaBest Dashboard Settings & Customization — Permanent Rules

> **Status:** Permanent project requirement. Dashboard customization is a core feature and MUST NOT be removed, bypassed, or silently reset in future updates.

## 1. Purpose
Dashboard Settings allows the Super Admin to personalize the Business Command Center layout and default views without modifying business records or security permissions.

## 2. Required Customization Features
1. **Show or hide dashboard sections** (independent ON/OFF controls for `summary`, `attention`, `salesChart`, `gallonActivity`, `containerStock`, `operations`, `recentActivity`, and `quickActions`).
2. **Reorder dashboard sections** using accessible **Move Up** and **Move Down** controls.
3. **Select default date range** (`Daily`, `Weekly`, `Monthly`, `Yearly`, `All Time`).
4. **Select default chart metric** (`Revenue` or `Order Count`).
5. **Select dashboard density** (`Comfortable` or `Compact`).
6. **Show or hide secondary financial metrics** by default (`Cash Pending Remittance`, `Recorded Expenses`).
7. **Show or hide detailed container stock information** by default.
8. **Restore default dashboard settings** with explicit user confirmation.

## 3. Section Visibility Rules
- Each optional section has an independent boolean visibility flag.
- Hiding a section MUST NOT delete or alter any underlying business data.
- Hidden sections remain accessible and re-enableable through Dashboard Settings.
- Prevent a completely blank/unusable dashboard: if all main sections are disabled, keep `summary` enabled automatically.
- **Critical unresolved business alerts** (e.g., failed operational issues or low-stock container alerts) MUST remain accessible on the dashboard even when the optional `Needs Attention` section is hidden.

## 4. Section Arrangement Rules
- Use simple, reliable **Move Up** and **Move Down** buttons (do not introduce complex drag-and-drop unless explicitly approved).
- The dashboard MUST render sections directly from saved `order` preferences rather than a separately hardcoded JSX sequence.
- Selected order MUST persist across:
  - Browser refreshes.
  - Logging out and logging back in (local browser profile).
  - Navigating between dashboard modules.

## 5. Persistence & Safe Migration Rules
- Use a namespaced, versioned `localStorage` key: `aquabest-super-admin-dashboard-settings-v1` (with `version: 1` and future migration support in `src/utils/ownerDashboardSettings.js`).
- Safely handle missing, partial, or corrupted JSON without throwing runtime errors.
- Support forward migration from older versions (and legacy unversioned keys/objects) so valid user preferences are preserved rather than silently overwritten on startup.
- Never overwrite valid saved preferences with defaults during normal startup.
- Reset to Default MUST require explicit user confirmation and MUST NEVER delete orders, inventory, payments, employees, proof photos, or other business data.

## 6. Separation from Authorization & Security
- Dashboard personalization is **NOT** authorization or role-based access control.
- Hiding a widget or shortcut does not restrict access to underlying modules or APIs.
- Do **not** modify authentication, Manager restrictions, or Staff permissions via Dashboard Settings.

## 7. Regression Rule
Future dashboard changes MUST keep `src/utils/ownerDashboardSettings.js`, the `dashboard-settings` UI in `src/apps/OwnerOperations.jsx`, and the settings regression tests in `tests/ownerDashboardSettings.test.js` intact and passing.
