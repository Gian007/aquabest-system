# AquaBest Staff — backend handoff (2026-11-15)

## Status

This repository is still a **frontend-only Staff prototype**. The changes in this
handoff do not activate backend authentication, Supabase, shared task locking,
server photo uploads, Capacitor, or device push notifications.

**Do not use demo users or the browser-local operational data for real employees,
customer details, payment collection, or production access.**

### What is preserved

- Single business login and role-based views (Owner/Manager/Staff)
- Staff Home, available Queues, Collection → Refill → Delivery, customer Pickup
- Assigned My Tasks, multi-order dispatch, per-customer delivery confirmation
- Delivery proof picker, local IndexedDB image storage, trip history
- Staff notification bell, activity List/Configure, local preferences, Settings/POS
- Existing Supabase code, Manager/Owner screens, customer website, and UI design

### Current frontend entry points

| Module | Responsibility | Future integration |
| --- | --- | --- |
| `src/main.jsx` | Business session router | Consume server-issued auth session |
| `src/apps/BusinessLogin.jsx` | Login UI; email format check and password field | Await real auth endpoint, handle errors |
| `src/services/demoBusinessAuth.js` | Hardcoded demo users and sessionStorage | **Replace**, never use in production |
| `src/services/staffDemoAdapter.js` | Browser-local Orders/Trips/Settings/Notifications storage | Implement authorized API methods |
| `src/apps/StaffOperations.jsx` | Staff workflow UI/state and mutations | Extract useStaffData hooks / server commands |
| `src/apps/StaffTripWorkspace.jsx` | Assigned deliveries, dispatch, trip summary | Server trip states and staff identity |
| `src/apps/staffProofStorage.js` | Proof Blob stored locally in IndexedDB | Durable upload, secure access, offline retry |
| `src/apps/StaffPOS.jsx` | Catalog and transaction form | Server catalog/prices and order submission |

## Real authentication requirements

1. Provide server-side email/password authentication, session expiration and logout.
2. Return **authenticated user ID, verified email, role, branch ID, active flag**.
3. Bind all Staff reads and mutations to the session's server-issued user ID.
4. Authorize actions on the server. UI filters and the `?view=business` URL
   are **not** permission checks.
5. Enforce roles/branch access for Owner, Manager, Staff.
6. Disable hardcoded demo credentials/sessionStorage role elevation in production.
7. Never store plaintext passwords or authenticate against values bundled in JS.

The current login accepts an email-shaped string, validates its syntax, and
awaits `onLogin`; only the original demo usernames (e.g. `staff` / `staff`)
can successfully sign in until an auth service is wired. **Email format
validation is not email ownership verification.**

## Proposed backend operations (not implemented)

- `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- `GET /branches/{branchId}/queue?stage=`, `GET /staff/me/tasks`
- `POST /orders/{id}/claim` with expected version / conflict response
- `POST /orders/{id}/collection` and `POST /orders/{id}/station-receipt`
- `POST /orders/{id}/refill-complete`; `POST /orders/{id}/pickup-complete`
- `POST /trips` (batch selected order IDs, idempotency key)
- `POST /trips/{id}/stops/{orderId}/confirm` (proof ID, payment, idempotency key)
- `POST /trips/{id}/stops/{orderId}/issue`, `POST /trips/{id}/close`
- `POST /orders/{id}/proof` with secure storage; `GET /orders/{id}/proof`
- `GET /staff/me/notifications`, `PATCH /notifications/{id}/read`
- `GET /staff/me/preferences`, `PUT /staff/me/preferences`

These are **suggested API contracts**, not existing URLs. Map them to the
eventual backend/Supabase system rather than assuming they exist.

## Workflow invariants

- The same Order ID is retained from customer-owned bottle Collection to
  station receipt, Refill, Delivery, and confirmation.
- Collection assignment is separate from Delivery assignment, pending real
  business policy; record the collecting employee as audit data.
- Multiple delivery orders can be dispatched **once as a batch trip**.
  Individual delivery completion requires per-customer proof and COD accounting.
- A staff member who loses internet is **not** automatically marked on break,
  returned to Queues, or re-assigned. Staff availability, activity, and
  connection are different fields.
- Every claim, batch dispatch, order transition and remittance must be
  authorized, validated, and concurrency-safe by the server.
- Do not treat a local cash entry as a verified payment/remittance.
- Uploaded proof must have size/type validation, access restrictions, retention
  policy, and idempotent uploads. Avoid unnecessary faces or private details.
- On transition failure, keep the local task pending sync with retriable
  operation ID rather than displaying success prematurely.

## Suggested rollout checklist

- [ ] Confirm actual employee identity, roles, branches and account management
- [ ] Build backend auth, password recovery and role/branch authorization
- [ ] Define authoritative product pricing and order/payment states
- [ ] Implement branch-scoped queue and transaction-based claim locking
- [ ] Implement Collection, Refill, Pickup, batch Trips and individual stops
- [ ] Implement audit logs, COD reconciliation and manager remittance approval
- [ ] Implement secure proof upload, view, retention and recovery
- [ ] Replace local adapters screen-by-screen; keep demo data separate
- [ ] Add realtime subscriptions, offline outbox and idempotent retry
- [ ] Add push notification delivery after real device identity exists
- [ ] Regression test mobile UI and permissions on real devices
- [ ] Only then evaluate Capacitor APK packaging and app-private filesystem

## Known prototype limitations

- Demo account and demo staff ID are not proof of identity.
- Existing browser localStorage and IndexedDB do not synchronize across devices.
- Clearing browser data can erase trip history and proof photos.
- Browser connectivity state does not guarantee the server is reachable.
- No real backend exists for the suggested operations above.
