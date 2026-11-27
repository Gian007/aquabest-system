-- AquaBest Temporary Local SQLite Schema (Migration 001)
-- Local development & backend handoff reference only.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_number TEXT,
  address TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'staff')),
  active INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  container_type TEXT NOT NULL,
  size_label TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  source TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  payment_method TEXT,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  notes TEXT,
  assigned_employee TEXT,
  business_date TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  ownership TEXT NOT NULL DEFAULT 'own' CHECK (ownership IN ('own', 'store')),
  arrangement TEXT NOT NULL DEFAULT 'refill' CHECK (arrangement IN ('refill', 'purchase', 'returnable'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('pending_verification', 'collected', 'paid', 'rejected', 'refunded')),
  reference TEXT,
  recorded_at TEXT NOT NULL,
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('Paid', 'Unpaid', 'Not Recorded')),
  payment_method TEXT,
  reference TEXT,
  business_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_items (
  product_id TEXT PRIMARY KEY REFERENCES products(id),
  available_full_qty INTEGER NOT NULL CHECK (available_full_qty >= 0),
  available_empty_qty INTEGER NOT NULL DEFAULT 0 CHECK (available_empty_qty >= 0),
  minimum_threshold INTEGER NOT NULL CHECK (minimum_threshold >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  refill_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refill_records (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  completed_quantity INTEGER NOT NULL CHECK (completed_quantity > 0),
  assigned_employee TEXT,
  completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS container_movements (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('issued', 'borrowed', 'returned', 'sold')),
  related_movement_id TEXT REFERENCES container_movements(id) ON DELETE SET NULL,
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_trips (
  id TEXT PRIMARY KEY,
  assigned_employee TEXT NOT NULL,
  trip_status TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  remittance_status TEXT NOT NULL DEFAULT 'Not collected'
);

CREATE TABLE IF NOT EXISTS delivery_stops (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES delivery_trips(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_status TEXT NOT NULL,
  actual_cash_received_cents INTEGER NOT NULL DEFAULT 0 CHECK (actual_cash_received_cents >= 0),
  completed_at TEXT,
  issue_reason TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_data TEXT,
  after_data TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(business_date);
CREATE INDEX IF NOT EXISTS idx_container_customer ON container_movements(customer_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
