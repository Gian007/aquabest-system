# AquaBest Shared Operations — Backend Integration Boundary

## Current Workspace Readiness

1. **No backend environment is configured in this workspace:**
   - `.env` / `.env.local` is not present (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset).
   - `@supabase/supabase-js` is not installed in `package.json`.
   - No live Supabase project, PostgreSQL database, or Storage bucket is accessible from this workspace.
2. **Demo safety preserved:**
   - `src/services/demoBusinessAuth.js` and `src/services/staffDemoAdapter.js` remain intact so the existing local demo continues working without breaking.
   - Do **not** claim multi-device sync, server-side authorization, or production security until the steps below are completed and verified against a live backend.

## Implemented Boundary Files

- `src/services/operationsPermissions.js` — Enforces `super_admin`, `manager`, and `staff` role permissions (Manager can assist with refill/pickup but cannot claim `collection` or `delivery`) and stage transition validation.
- `src/services/operationsService.js` — Shared repository boundary (`createInMemoryOperationsStore` + `createSupabaseOperationsAdapter`) with atomic version-checked task claiming, `CONFLICT` / `FORBIDDEN` / `NETWORK_ERROR` handling, proof file validation (JPEG/PNG/WebP ≤ 5 MB), payment proof separation (`pending_verification` -> `paid`/`rejected`), cash remittance reconciliation, employee invitations/role updates (`super_admin` only), and before/after audit logging.
- `backend/schema/aquabest-operations-v2.sql` — PostgreSQL/Supabase migration extending `aquabest-postgres-v1.sql` with `orders.version`, `employee_invitations`, `delivery_proofs`, `claim_operational_task`, `verify_payment_record`, `reconcile_cash_remittance`, and RLS policies.
- `.env.example` — Required Vite environment variables.
- `tests/operationsWorkflow.test.js` — Automated regression tests for permissions, concurrent claims, task transitions, payment verification, and network failures.

## Exact Commands & Setup Required to Activate Shared Backend

1. **Install Supabase client:**
   ```bash
   npm install @supabase/supabase-js
   ```
2. **Create `.env` from `.env.example`:**
   ```bash
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings.
3. **Apply SQL schemas in Supabase SQL Editor (in order):**
   - `backend/schema/aquabest-postgres-v1.sql`
   - `backend/schema/aquabest-operations-v2.sql`
4. **Create private Storage bucket:**
   - Bucket name: `delivery-proofs` (Public: **OFF**, authenticated upload/signed URL read policies).
5. **Provision initial `super_admin` employee record** linked to a real Supabase Auth user (`auth.uid()`).
6. **Verify live connection:**
   - Start `npm run dev` and test `testSupabaseConnection()` from `src/services/supabaseClient.js`.
