# AquaBest Manager — interview-based mobile frontend (November 2026)

## Scope and ownership

The Manager is responsible for daily coordination, schedules, sales reports and physical cash remittance. Staff rotate across collection, refill and delivery rather than staying in fixed job titles. The transcript describes a shared group chat, two collection/delivery batches, customer gallon identifiers, and expected-versus-collected reconciliations.

The implemented Manager frontend is **a browser-local prototype**, not a production integration with Staff, Supabase or real devices. Do not enter real customer or cash data.

## Implemented in the Manager-only UI

- **Operations Overview**: compact queue metrics, gallon totals, issue alerts, quick actions, and recent orders.
- **Operations Queue**: search by order/customer/identifier/source/assignee, filter stages, inspect an order and open existing Manager order details.
- **Collection Batches**: select eligible demo delivery orders, calculate expected gallons, create named batch, enter actual collected gallons and mandatory discrepancy explanation if numbers differ.
- **Cash Remittance**: select unpaid delivery orders that might require COD, input cash submitted and employee, record expected/submitted difference and mandatory notes for mismatches. Recording does **not** verify payments or modify order paid status.
- **Staff Monitoring**: flexible operations staff, existing availability signals, unfinished task counts and a quick link to Operations Queue.
- **Manager POS**: optional Customer/Gallon ID field for tower/unit, customer name, business name, or street and block/lot. Original catalog, item pricing and payment calculations retained.
- **Mobile navigation**: Home, POS, Queue, More; other existing management modules remain accessible from More and the desktop sidebar.

## Known limitations / deferred integration

1. Manager orders come from `INITIAL_ORDERS` and manager-side state, whereas the Staff app uses its own browser-local storage. **Queue is not yet a live view of Staff activity.** Never imply a Staff order has been claimed, photographed or completed across devices.
2. Batch records and remittance entries are stored in localStorage under dedicated Manager demo keys only; refreshing same browser retains them, but other devices won't sync.
3. Staff proofs and failed collection photos are not wired into Manager review. The UI says pending Staff integration, rather than inventing a photo.
4. Product pricing remains sample data. Transcript references location-specific prices and mineral/purified/alkaline water, but actual full rate cards, delivery fees and business constraints require confirmation before changing POS prices.
5. Borrowed dispenser tracking, shift scheduling, customer-level collection exceptions, verified sales/date filtering, offline retry, and branch-specific stock are future phases.
6. Server endpoints must handle authentication, branch authorization, concurrent claims, verified statuses, durable photo proof upload, cash audit trails and reconciliation.

## Design rules honored

- Mobile-first; responsive grids with no horizontal page overflow.
- AquaBest navy `#1b2f63`, primary `#244ea3`, subtle borders `#d9e2ec`; 8px spacing, 12px inputs, 16px cards.
- Manager-specific CSS scoped to `.manager-control`.
- Preserve Staff and Admin/Owner modules, preexisting Manager POS/orders/inventory/payments/reports and all backend/Supabase code.
- Visible demo disclaimers around reconciliation, non-live queue and missing photos.

## Production-facing next actions

- Confirm roles `admin`, `manager`, `staff`, and branch/permission boundaries.
- Connect manager queue to one authoritative order lifecycle with Staff.
- Add per-unit expected/actual collection detail, missing-customer reasons and secure attempt photos.
- Add batch schedule, employee schedule/availability and flexible staff assignments.
- Implement real COD transactions, remittance reconciliation and manager confirmation.
- Link borrowed gallons/dispensers to customer identities and station locations.
- Test responsive UI, hardware camera proof, touch, login and backend error states on actual mobile devices.
