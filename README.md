# aquabest-system
A management system for water stations. Handles station operations, inventory tracking, and ordering.

## Management UI prototype

The customer website is unchanged at the repository's existing URL.

Open the **Manager UI prototype** on GitHub Pages using:
`https://gian007.github.io/aquabest-system/?view=manager`

Local development:
```bash
npm install
npm run dev
```
Then open the local Vite URL with `?view=manager` (the default is customer).

Manager modules: Dashboard, POS, Orders, Refill Tasks, Delivery, Inventory & Bottles, Payments, Sales Reports, and Staff Tasks. Responsive mobile-first navigation uses Home/POS/Orders/More; desktop shows a full sidebar.

### Design rules
- Inter, primary `#244EA3`, navy `#1B2F63`, aqua `#2AA9C5`, background `#F8FBFF`, border `#D9E2EC`
- 8px spacing rhythm, 16px card radius, 12px form/button radius
- All icons are `react-icons/fi`; bottle assets are reused from `src/assets/WaterBottleSize`.

### Important: Prototype, not production
Management access is a **preview route with no authentication**. The `view=manager` URL is PUBLIC and must not expose real customer/financial data. Orders, payment collection, POS prices, stock and reports use local demo fixtures and React state only. No server request, real payment, OTP or database write occurs. Values in `src/data/managerDemo.js` are illustrative and **NOT approved AquaBest prices**.

Before production: separate management hosting/release, implement Supabase Auth and staff authorization, server-side role permissions/RLS, validated prices, immutable payment audit trail, true order/delivery status workflows and verified financial reports. For the future Capacitor build, target the management view explicitly rather than relying on a public query parameter.
