-- AquaBest v1 relational design (PostgreSQL / future Supabase).
-- SCHEMA REFERENCE ONLY: review with backend developer before execution.
-- Laravel can implement equivalent tables with migrations.
-- Do not deploy without authentication, authorization policies and indexes review.

create table customers(
 id uuid primary key, full_name text not null, phone text unique, created_at timestamptz not null default now()
);
create table customer_addresses(
 id uuid primary key, customer_id uuid not null references customers(id), label text,
 street text not null, barangay text, city text, landmark text,
 is_default boolean not null default false
);
create table employees(
 id uuid primary key, auth_user_id uuid unique,
 full_name text not null, phone text, primary_role text not null
 check(primary_role in ('owner','manager','staff','delivery')),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table employee_permissions(
 employee_id uuid not null references employees(id), permission text not null,
 granted_by uuid references employees(id), primary key(employee_id,permission)
);
create table employee_status_events(
 id uuid primary key, employee_id uuid not null references employees(id),
 status text not null check(status in ('online','on_break','offline')),
 changed_at timestamptz not null default now()
);
create table employee_attendance(
 id uuid primary key, employee_id uuid not null references employees(id),
 time_in timestamptz not null, time_out timestamptz,
 check(time_out is null or time_out>=time_in)
);
create table products(
 id uuid primary key, name text not null, description text, category text not null,
 price_cents bigint not null check(price_cents>=0), active boolean not null default true,
 image_url text, channels text[] not null default '{"walk_in","online"}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table orders(
 id uuid primary key, customer_id uuid references customers(id),
 address_id uuid references customer_addresses(id), source text not null,
 status text not null check(status in ('pending_confirmation','confirmed','preparing','ready','out_for_delivery','delivered','completed','cancelled')),
 payment_status text not null check(payment_status in ('unpaid','pending_verification','collected','paid','rejected','refunded')),
 fulfillment text not null, assigned_employee_id uuid references employees(id),
 total_cents bigint not null check(total_cents>=0), notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table order_items(
 id uuid primary key, order_id uuid not null references orders(id),
 product_id uuid references products(id), product_name text not null,
 quantity integer not null check(quantity>0),
 unit_price_cents bigint not null check(unit_price_cents>=0),
 line_total_cents bigint not null check(line_total_cents>=0)
);
create table refill_tasks(
 id uuid primary key, order_id uuid not null references orders(id),
 assigned_employee_id uuid references employees(id),
 status text not null, started_at timestamptz, finished_at timestamptz
);
create table delivery_trips(
 id uuid primary key, lead_driver_id uuid references employees(id),
 assistant_id uuid references employees(id),
 status text not null, created_at timestamptz not null default now()
);
create table trip_stops(
 id uuid primary key, trip_id uuid not null references delivery_trips(id),
 order_id uuid not null references orders(id),
 sequence_no integer not null, status text not null,
 filled_bottles_loaded integer not null default 0 check(filled_bottles_loaded>=0),
 empties_collected integer not null default 0 check(empties_collected>=0),
 unique(trip_id,order_id)
);
create table payments(
 id uuid primary key, order_id uuid not null references orders(id),
 method text not null check(method in ('cash','gcash','bank_transfer')),
 status text not null check(status in ('pending_verification','collected','paid','rejected','refunded')),
 amount_cents bigint not null check(amount_cents>0), reference text,
 received_by uuid references employees(id), verified_by uuid references employees(id),
 created_at timestamptz not null default now(), verified_at timestamptz
);
create table cash_remittances(
 id uuid primary key, employee_id uuid not null references employees(id),
 amount_cents bigint not null check(amount_cents>0), status text not null,
 submitted_at timestamptz, received_by uuid references employees(id), received_at timestamptz
);
create table cash_remittance_payments(
 remittance_id uuid not null references cash_remittances(id),
 payment_id uuid not null unique references payments(id),
 primary key(remittance_id,payment_id)
);
create table inventory(
 product_id uuid primary key references products(id),
 on_hand integer not null check(on_hand>=0),
 minimum integer not null check(minimum>=0), updated_at timestamptz not null default now()
);
create table stock_movements(
 id uuid primary key, product_id uuid not null references products(id),
 direction text not null check(direction in ('in','out')),
 quantity integer not null check(quantity>0),
 reason text not null, order_id uuid references orders(id),
 employee_id uuid references employees(id), created_at timestamptz not null default now()
);
create table expenses(
 id uuid primary key, category text not null, description text not null,
 amount_cents bigint not null check(amount_cents>0), expense_date date not null,
 active boolean not null default true, created_by uuid references employees(id),
 created_at timestamptz not null default now()
);
create table audit_logs(
 id uuid primary key, actor_employee_id uuid references employees(id),
 action text not null, entity_name text not null, entity_id text not null,
 before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);

create index orders_customer_created on orders(customer_id,created_at desc);
create index orders_status on orders(status);
create index order_items_order on order_items(order_id);
create index trips_driver on delivery_trips(lead_driver_id);
create index payments_order on payments(order_id);
create index stock_movements_product on stock_movements(product_id,created_at desc);
create index audit_logs_entity on audit_logs(entity_name,entity_id,created_at desc);

-- IMPORTANT: Supabase requires explicit RLS and role-aware policies before exposing these tables.
-- NEVER deploy this schema as publicly writable; API writes require server-side validation.
