# AquaBest Shared Data Foundation (v1)

## Goal
One data contract for Customer, Manager, Staff/Refiller, Delivery and Owner. The backend developer may choose **Laravel REST**, **Supabase BaaS**, or another service. React imports `src/services/dataService.js` and never imports database drivers inside pages.

## State today
- `src/services/dataContract.js`: stable IDs, enums, integer centavos, ISO timestamps and validation.
- `src/services/mock/seed.js`: normalized fake sample data mapped from the current GUI fixtures.
- `src/services/mock/mockDataService.js`: asynchronous browser mock repository, order status transitions, product-price snapshots, basic inventory IN/OUT, payment proofs, cash collections and audit events.
- `backend/schema/aquabest-postgres-v1.sql`: **reference** schema for PostgreSQL / Supabase or Laravel-equivalent migrations. Not executed.
- `src/services/dataService.js`: one import path, currently points at the mock adapter.

The existing role GUIs have **not been migrated** from React local state to this service yet. This commit is data foundation only; it must not break the currently deployed preview. Next phase: gradually replace each role's local state with the adapter, preserving UI behavior.

## Frontend service contract
```js
import {dataService} from '../services/dataService.js';

const products = await dataService.getProducts();
const order = await dataService.createOrder({
  source:'online',
  items:[{product_id:'round5',quantity:2}],
  fulfillment:'delivery'
});
const orders = await dataService.getOrders();
await dataService.updateOrderStatus(order.id,'confirmed');
```
Orders calculate totals using catalog snapshot prices; clients cannot directly override billed total. An order has many order items; a delivery trip has one or more stops; payments are separate from fulfillment and from cash remittance.

## Migration contract with backend developer
Agree on:
1. Identifiers (UUID in SQL, string in frontend), timestamps (ISO UTC), money (integer **centavos**).
2. Exact status transitions and permission matrix for each employee role.
3. Routes/data responses (or Supabase table adapter) matching async service methods.
4. Server-side atomic inventory movements, idempotent order submission, payment confirmation, and stock reservation/release timing.
5. Auth: real employee/customer identity; never take actor role or total price from untrusted browser input. Supabase RLS or Laravel policies.
6. Data migration from mock fixtures to approved product catalog, inventory counts and client-verified prices.

## Limitations and safety
- GitHub Pages cannot execute server code or persist shared database writes.
- Browser mock `localStorage` shares a browser profile across tabs; different devices do **not** share state. It is mutable, insecure, and unsuitable for PII or money.
- The SQL schema is a review artifact, not a deployed database; auth/RLS and transaction-safe backend functions are still required.
- Payments with an e-wallet/bank reference are **pending verification** until validated; cash collected is distinct from confirmed cash remittance.
- Attendance is not derived from online/offline availability.
- Real inventory must be based on physical bottle release/return, with no duplicate stock-out from a status edit.
- Existing UI demos remain public and their contents are fake.
