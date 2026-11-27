-- AquaBest Operations v2 Migration (PostgreSQL / Supabase)
-- Builds on aquabest-postgres-v1.sql with:
-- 1. Canonical roles: super_admin, manager, staff
-- 2. Optimistic locking (orders.version) & atomic task claiming RPC
-- 3. Persistent delivery_proofs metadata for private Supabase Storage bucket
-- 4. Payment verification & cash remittance reconciliation RPCs
-- 5. Employee invitations & immutable server-side audit_logs
-- 6. Row Level Security (RLS) policies

-- 1. Role normalization on employees
alter table if exists employees
  drop constraint if exists employees_primary_role_check;

update employees
  set primary_role = case
    when primary_role = 'owner' then 'super_admin'
    when primary_role = 'delivery' then 'staff'
    else primary_role
  end;

alter table if exists employees
  add column if not exists email text unique,
  add column if not exists branch_id text not null default 'main',
  add constraint employees_primary_role_check
    check (primary_role in ('super_admin', 'manager', 'staff'));

-- 2. Employee invitations (Super Admin only)
create table if not exists employee_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role text not null check (role in ('super_admin', 'manager', 'staff')),
  branch_id text not null default 'main',
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references employees(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 3. Optimistic locking & operational tracking on orders
alter table if exists orders
  add column if not exists branch_id text not null default 'main',
  add column if not exists stage text not null default 'waiting',
  add column if not exists version integer not null default 1,
  add column if not exists collected_by uuid references employees(id),
  add column if not exists refilled_by uuid references employees(id),
  add column if not exists delivered_by uuid references employees(id);

-- 4. Persistent delivery proof metadata (binary stored in private Storage bucket 'delivery-proofs')
create table if not exists delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  trip_id uuid references delivery_trips(id),
  storage_bucket text not null default 'delivery-proofs',
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  uploaded_by uuid not null references employees(id),
  created_at timestamptz not null default now()
);

-- 5. Helper to resolve current authenticated employee
create or replace function current_employee()
returns employees
language sql
stable
security definer
as $$
  select * from employees
  where auth_user_id = auth.uid()
    and active = true
  limit 1;
$$;

-- 6. Atomic task claiming RPC (prevents concurrent double-claims & enforces Manager restrictions)
create or replace function claim_operational_task(
  p_order_id uuid,
  p_expected_version integer,
  p_target_stage text
)
returns orders
language plpgsql
security definer
as $$
declare
  v_emp employees;
  v_before orders;
  v_after orders;
begin
  v_emp := current_employee();
  if v_emp.id is null then
    raise exception 'Unauthorized employee session' using errcode = '42501';
  end if;

  if v_emp.primary_role = 'manager' and p_target_stage in ('collectionClaimed', 'collectionTransit', 'delivery', 'out') then
    raise exception 'Managers cannot claim delivery or collection tasks' using errcode = '42501';
  end if;

  select * into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_before.version <> p_expected_version or (v_before.assigned_employee_id is not null and v_before.assigned_employee_id <> v_emp.id) then
    raise exception 'Conflict: task was already claimed or modified' using errcode = '40901';
  end if;

  update orders
  set assigned_employee_id = v_emp.id,
      stage = p_target_stage,
      version = version + 1,
      updated_at = now()
  where id = p_order_id
    and version = p_expected_version
  returning * into v_after;

  insert into audit_logs (id, actor_employee_id, action, entity_name, entity_id, before_data, after_data)
  values (gen_random_uuid(), v_emp.id, 'task_claimed', 'orders', p_order_id::text, to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$;

-- 7. Payment verification RPC (never auto-verifies submitted proof)
create or replace function verify_payment_record(
  p_payment_id uuid,
  p_decision text,
  p_reason text default null
)
returns payments
language plpgsql
security definer
as $$
declare
  v_emp employees;
  v_before payments;
  v_after payments;
begin
  v_emp := current_employee();
  if v_emp.primary_role not in ('super_admin', 'manager') then
    raise exception 'Only Super Admin or Manager can verify payments' using errcode = '42501';
  end if;

  if p_decision not in ('paid', 'rejected') then
    raise exception 'Invalid verification decision';
  end if;

  select * into v_before from payments where id = p_payment_id for update;
  if not found or v_before.status <> 'pending_verification' then
    raise exception 'Payment is not pending verification' using errcode = '40901';
  end if;

  update payments
  set status = p_decision,
      verified_by = v_emp.id,
      verified_at = now()
  where id = p_payment_id
  returning * into v_after;

  update orders
  set payment_status = p_decision,
      updated_at = now()
  where id = v_after.order_id;

  insert into audit_logs (id, actor_employee_id, action, entity_name, entity_id, before_data, after_data)
  values (gen_random_uuid(), v_emp.id, 'payment_' || p_decision, 'payments', p_payment_id::text, to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$;

-- 8. Cash remittance reconciliation RPC
create or replace function reconcile_cash_remittance(
  p_remittance_id uuid,
  p_decision text
)
returns cash_remittances
language plpgsql
security definer
as $$
declare
  v_emp employees;
  v_before cash_remittances;
  v_after cash_remittances;
begin
  v_emp := current_employee();
  if v_emp.primary_role not in ('super_admin', 'manager') then
    raise exception 'Only Super Admin or Manager can reconcile cash remittances' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'discrepancy') then
    raise exception 'Invalid remittance decision';
  end if;

  select * into v_before from cash_remittances where id = p_remittance_id for update;
  if not found or v_before.status <> 'awaiting_remittance' then
    raise exception 'Remittance is not awaiting verification' using errcode = '40901';
  end if;

  update cash_remittances
  set status = p_decision,
      received_by = v_emp.id,
      received_at = now()
  where id = p_remittance_id
  returning * into v_after;

  insert into audit_logs (id, actor_employee_id, action, entity_name, entity_id, before_data, after_data)
  values (gen_random_uuid(), v_emp.id, 'cash_remittance_' || p_decision, 'cash_remittances', p_remittance_id::text, to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$;

-- 9. Enable Row Level Security across operational tables
alter table employees enable row level security;
alter table employee_invitations enable row level security;
alter table orders enable row level security;
alter table delivery_trips enable row level security;
alter table trip_stops enable row level security;
alter table delivery_proofs enable row level security;
alter table payments enable row level security;
alter table cash_remittances enable row level security;
alter table expenses enable row level security;
alter table audit_logs enable row level security;

-- Audit logs are append-only via SECURITY DEFINER RPCs; Super Admin & Manager can read
create policy audit_logs_read_policy on audit_logs
  for select using (
    exists (
      select 1 from employees e
      where e.auth_user_id = auth.uid()
        and e.active = true
        and e.primary_role in ('super_admin', 'manager')
    )
  );
