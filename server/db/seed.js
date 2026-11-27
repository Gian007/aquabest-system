import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './connection.js';
import { runMigrations } from './migrate.js';

const DEMO_TIMESTAMP = '2026-10-31T00:00:00.000Z';

export function seedDemoData(db) {
  runMigrations(db);
  const now = new Date().toISOString();

  db.exec('BEGIN');
  try {
    const insertProduct = db.prepare(`
      INSERT OR IGNORE INTO products (id, name, container_type, size_label, price_cents, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertProduct.run('round5', '5 Gallons Round', 'Round Container', '5 Gallons', 3500);
    insertProduct.run('slim25', '2.5 Gallons Slim', 'Slim Container', '2.5 Gallons', 2000);
    insertProduct.run('slim5', '5 Gallons Slim', 'Slim Container', '5 Gallons', 3500);

    const insertInv = db.prepare(`
      INSERT OR IGNORE INTO inventory_items (product_id, available_full_qty, available_empty_qty, minimum_threshold, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertInv.run('round5', 78, 12, 15, now);
    insertInv.run('slim25', 14, 4, 20, now);
    insertInv.run('slim5', 32, 8, 12, now);

    const insertEmp = db.prepare(`
      INSERT OR IGNORE INTO employees (id, name, role, active, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, 1, 1, ?, ?)
    `);
    insertEmp.run('emp-admin', 'Super Admin (Demo)', 'super_admin', DEMO_TIMESTAMP, now);
    insertEmp.run('emp-manager', 'Station Manager (Demo)', 'manager', DEMO_TIMESTAMP, now);
    insertEmp.run('emp-staff-a', 'Staff A (Demo)', 'staff', DEMO_TIMESTAMP, now);
    insertEmp.run('emp-staff-b', 'Staff B (Demo)', 'staff', DEMO_TIMESTAMP, now);
    insertEmp.run('emp-driver-a', 'Driver A (Demo)', 'staff', DEMO_TIMESTAMP, now);

    // Illustrative October 31, 2026 orders intentionally have created_at = NULL
    // so historical Daily fallback mode (without invented hourly timestamps) is preserved honestly.
    const demoOrders = [
      { id: 'AB-1042', customer: 'Maria Santos', source: 'Online', service: 'Pickup & Delivery', status: 'Pending Confirmation', payment_status: 'Unpaid', assigned: 'Unassigned', total_cents: 7000, date: '2026-10-31', sizeId: 'round5', qty: 2, unit_cents: 3500 },
      { id: 'AB-1041', customer: 'ABC Office', source: 'Messenger', service: 'Delivery', status: 'Preparing', payment_status: 'Unpaid', assigned: 'Staff A', total_cents: 17500, date: '2026-10-31', sizeId: 'round5', qty: 5, unit_cents: 3500 },
      { id: 'AB-1040', customer: 'John Reyes', source: 'Walk-in', service: 'Walk-in', status: 'Completed', payment_status: 'Paid', assigned: 'Staff B', total_cents: 2000, date: '2026-10-31', sizeId: 'slim25', qty: 1, unit_cents: 2000 },
      { id: 'AB-1039', customer: 'Sarah Lim', source: 'Phone', service: 'Delivery', status: 'Out for Delivery', payment_status: 'Paid', assigned: 'Driver A', total_cents: 10500, date: '2026-10-31', sizeId: 'slim5', qty: 3, unit_cents: 3500 }
    ];

    const insertOrder = db.prepare(`
      INSERT OR IGNORE INTO orders (
        id, order_number, customer_name, source, service, status, payment_status,
        payment_method, subtotal_cents, delivery_fee_cents, discount_cents, total_cents,
        notes, assigned_employee, business_date, created_at, updated_at, completed_at, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, ?, 'Illustrative demo order', ?, ?, NULL, ?, ?, 1)
    `);
    const insertItem = db.prepare(`
      INSERT OR IGNORE INTO order_items (
        id, order_id, product_id, quantity, unit_price_cents, line_total_cents, ownership, arrangement
      ) VALUES (?, ?, ?, ?, ?, ?, 'own', 'refill')
    `);

    for (const o of demoOrders) {
      insertOrder.run(
        o.id, o.id, o.customer, o.source, o.service, o.status, o.payment_status,
        o.total_cents, o.total_cents, o.assigned, o.date, now,
        o.status === 'Completed' ? DEMO_TIMESTAMP : null
      );
      insertItem.run(`item-${o.id}`, o.id, o.sizeId, o.qty, o.unit_cents, o.total_cents);
    }

    const insertTrip = db.prepare(`
      INSERT OR IGNORE INTO delivery_trips (id, assigned_employee, trip_status, started_at, completed_at, remittance_status)
      VALUES (?, ?, ?, ?, NULL, ?)
    `);
    insertTrip.run('TRIP-001', 'Driver A', 'Out for Delivery', DEMO_TIMESTAMP, 'Not required');

    const insertStop = db.prepare(`
      INSERT OR IGNORE INTO delivery_stops (id, trip_id, order_id, delivery_status, actual_cash_received_cents, completed_at, issue_reason)
      VALUES (?, ?, ?, ?, ?, NULL, NULL)
    `);
    insertStop.run('STOP-001', 'TRIP-001', 'AB-1039', 'Out for Delivery', 0);

    db.exec('COMMIT');
    return { seeded: true };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = openDatabase();
  seedDemoData(db);
  console.log('Seeded illustrative AquaBest demo records idempotently.');
  db.close();
}
