import express from 'express';
import crypto from 'node:crypto';

const VALID_SOURCES = new Set(['Walk-in', 'Online', 'Messenger', 'Phone']);
const VALID_SERVICES = new Set(['Walk-in', 'Pickup & Delivery', 'Drop-off & Delivery', 'Delivery', 'Collect & Return (Same Bottles)']);
const VALID_ORDER_STATUSES = new Set(['Pending Confirmation', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled']);
const VALID_PAYMENT_STATUSES = new Set(['Paid', 'Unpaid', 'Pending Verification', 'Not Recorded']);
const VALID_EXPENSE_CATEGORIES = new Set(['Fuel', 'Electricity', 'Supplies', 'Maintenance', 'Wages', 'Other']);
const VALID_CONTAINER_MOVEMENTS = new Set(['issued', 'borrowed', 'returned', 'sold']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function manilaDateToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function runTx(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function writeAudit(db, { entityType, entityId, action, beforeData = null, afterData = null }) {
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, before_data, after_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId('aud'),
    entityType,
    entityId,
    action,
    beforeData ? JSON.stringify(beforeData) : null,
    afterData ? JSON.stringify(afterData) : null,
    new Date().toISOString()
  );
}

function mapOrderRow(db, row) {
  if (!row) return null;
  const items = db.prepare(`
    SELECT product_id AS sizeId, quantity, unit_price_cents, line_total_cents, ownership, arrangement
    FROM order_items WHERE order_id = ?
  `).all(row.id);
  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: row.customer_name,
    customerId: row.customer_id,
    source: row.source,
    service: row.service,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method || '',
    method: row.payment_method || '',
    amount: Math.round(row.total_cents / 100),
    totalCents: row.total_cents,
    subtotalCents: row.subtotal_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    discountCents: row.discount_cents,
    notes: row.notes || '',
    assigned: row.assigned_employee || 'Unassigned',
    date: row.business_date,
    business_date: row.business_date,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    ownership: items[0]?.ownership || 'own',
    arrangement: items[0]?.arrangement || 'refill',
    items
  };
}

export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT COUNT(*) AS count FROM orders').get();
    res.json({
      ok: true,
      mode: 'local-sqlite-temp',
      ordersCount: row.count,
      serverTime: new Date().toISOString(),
      businessDate: manilaDateToday()
    });
  });

  // ---------------- ORDERS ----------------
  app.get('/api/orders', (req, res) => {
    const { startDate, endDate, status } = req.query;
    const clauses = [];
    const params = [];
    if (startDate && DATE_RE.test(String(startDate))) {
      clauses.push('business_date >= ?');
      params.push(String(startDate));
    }
    if (endDate && DATE_RE.test(String(endDate))) {
      clauses.push('business_date <= ?');
      params.push(String(endDate));
    }
    if (status) {
      clauses.push('status = ?');
      params.push(String(status));
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM orders ${where} ORDER BY COALESCE(created_at, business_date) DESC, rowid DESC`)
      .all(...params);
    res.json({ orders: rows.map(r => mapOrderRow(db, r)) });
  });

  app.get('/api/orders/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: mapOrderRow(db, row) });
  });

  app.post('/api/orders', (req, res) => {
    const body = req.body || {};
    const source = String(body.source || '').trim();
    const service = String(body.service || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentStatus = String(body.paymentStatus || 'Unpaid').trim();
    const paymentMethod = body.paymentMethod ? String(body.paymentMethod).trim() : null;
    const customerName = String(body.customer || 'Walk-in Customer').trim();
    const businessDate = DATE_RE.test(String(body.business_date || body.date || ''))
      ? String(body.business_date || body.date)
      : manilaDateToday();
    const ownership = body.ownership === 'store' ? 'store' : 'own';
    const arrangement = ownership === 'store'
      ? (body.arrangement === 'returnable' ? 'returnable' : 'purchase')
      : 'refill';

    if (!VALID_SOURCES.has(source)) return res.status(400).json({ error: 'Invalid order source.' });
    if (!VALID_SERVICES.has(service)) return res.status(400).json({ error: 'Invalid fulfillment service.' });
    if (!VALID_PAYMENT_STATUSES.has(paymentStatus)) return res.status(400).json({ error: 'Invalid payment status.' });
    if (!items.length) return res.status(400).json({ error: 'Order must contain at least one item.' });

    try {
      const created = runTx(db, () => {
        const now = new Date().toISOString();
        const orderId = body.id && typeof body.id === 'string' ? body.id.trim() : newId('AB');
        const duplicate = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
        if (duplicate) {
          const err = new Error(`Order ${orderId} already exists.`);
          err.statusCode = 409;
          throw err;
        }

        let subtotalCents = 0;
        const resolvedItems = items.map(item => {
          const qty = Number(item.quantity);
          if (!Number.isInteger(qty) || qty <= 0) {
            const err = new Error('Item quantity must be a positive integer.');
            err.statusCode = 400;
            throw err;
          }
          const prod = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(String(item.sizeId || item.product_id || ''));
          if (!prod) {
            const err = new Error(`Unknown product: ${item.sizeId || item.product_id}`);
            err.statusCode = 400;
            throw err;
          }
          const lineTotal = prod.price_cents * qty;
          subtotalCents += lineTotal;
          return { prod, qty, lineTotal };
        });

        // Verify and deduct store container stock if ownership === 'store'
        if (ownership === 'store') {
          for (const { prod, qty } of resolvedItems) {
            const inv = db.prepare('SELECT available_full_qty FROM inventory_items WHERE product_id = ?').get(prod.id);
            if (!inv || inv.available_full_qty < qty) {
              const err = new Error(`Insufficient stock for ${prod.name}.`);
              err.statusCode = 409;
              throw err;
            }
          }
        }

        const initialStatus = service === 'Walk-in'
          ? (paymentStatus === 'Paid' ? 'Completed' : 'Confirmed')
          : 'Pending Confirmation';

        db.prepare(`
          INSERT INTO orders (
            id, order_number, customer_name, source, service, status, payment_status,
            payment_method, subtotal_cents, delivery_fee_cents, discount_cents, total_cents,
            notes, assigned_employee, business_date, created_at, updated_at, completed_at, is_demo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          orderId,
          orderId,
          customerName,
          source,
          service,
          initialStatus,
          paymentStatus,
          paymentMethod,
          subtotalCents,
          subtotalCents,
          String(body.notes || ''),
          String(body.assigned || 'Unassigned'),
          businessDate,
          now,
          now,
          initialStatus === 'Completed' ? now : null
        );

        const insItem = db.prepare(`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents, line_total_cents, ownership, arrangement)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insInvMov = db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity, reason, order_id, created_at)
          VALUES (?, ?, 'OUT', ?, ?, ?, ?)
        `);
        const insContMov = db.prepare(`
          INSERT INTO container_movements (id, customer_name, order_id, product_id, quantity, movement_type, recorded_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const { prod, qty, lineTotal } of resolvedItems) {
          insItem.run(newId('itm'), orderId, prod.id, qty, prod.price_cents, lineTotal, ownership, arrangement);
          if (ownership === 'store') {
            db.prepare('UPDATE inventory_items SET available_full_qty = available_full_qty - ?, updated_at = ? WHERE product_id = ?')
              .run(qty, now, prod.id);
            const reason = arrangement === 'returnable' ? 'Returnable container issued' : 'New container sold';
            insInvMov.run(newId('mov'), prod.id, qty, reason, orderId, now);
            insContMov.run(newId('cmov'), customerName, orderId, prod.id, qty, arrangement === 'returnable' ? 'borrowed' : 'sold', now);
          }
        }

        const saved = mapOrderRow(db, db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId));
        writeAudit(db, { entityType: 'orders', entityId: orderId, action: 'order_created', afterData: saved });
        return saved;
      });
      res.status(201).json({ order: created });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.patch('/api/orders/:id', (req, res) => {
    const body = req.body || {};
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    const nextStatus = body.status !== undefined ? String(body.status) : existing.status;
    const nextPayment = body.paymentStatus !== undefined ? String(body.paymentStatus) : existing.payment_status;
    const nextAssigned = body.assigned !== undefined ? String(body.assigned) : existing.assigned_employee;

    if (!VALID_ORDER_STATUSES.has(nextStatus)) return res.status(400).json({ error: 'Invalid order status.' });
    if (!VALID_PAYMENT_STATUSES.has(nextPayment)) return res.status(400).json({ error: 'Invalid payment status.' });

    const now = new Date().toISOString();
    const completedAt = ['Completed', 'Delivered'].includes(nextStatus) && !existing.completed_at ? now : existing.completed_at;

    const updated = runTx(db, () => {
      db.prepare(`
        UPDATE orders
        SET status = ?, payment_status = ?, assigned_employee = ?, updated_at = ?, completed_at = ?
        WHERE id = ?
      `).run(nextStatus, nextPayment, nextAssigned, now, completedAt, existing.id);

      const after = mapOrderRow(db, db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id));
      writeAudit(db, { entityType: 'orders', entityId: existing.id, action: 'order_updated', beforeData: existing, afterData: after });
      return after;
    });

    res.json({ order: updated });
  });

  // ---------------- PRODUCTS & INVENTORY ----------------
  app.get('/api/products', (_req, res) => {
    const products = db.prepare('SELECT * FROM products WHERE active = 1').all();
    res.json({ products });
  });

  app.get('/api/inventory', (_req, res) => {
    const items = db.prepare(`
      SELECT i.product_id AS id, p.name, p.container_type, p.size_label,
             i.available_full_qty AS quantity, i.available_empty_qty AS emptyQuantity,
             i.minimum_threshold AS minimum, i.updated_at
      FROM inventory_items i
      JOIN products p ON p.id = i.product_id
    `).all();
    const movements = db.prepare('SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 100').all();
    res.json({ items, movements });
  });

  app.post('/api/inventory/movements', (req, res) => {
    const { productId, type, quantity, reason, orderId = null } = req.body || {};
    const qty = Number(quantity);
    if (!productId || !['IN', 'OUT'].includes(type)) return res.status(400).json({ error: 'Invalid product or movement type.' });
    if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ error: 'Quantity must be a positive integer.' });
    if (!String(reason || '').trim()) return res.status(400).json({ error: 'Reason is required.' });

    try {
      const movement = runTx(db, () => {
        const inv = db.prepare('SELECT * FROM inventory_items WHERE product_id = ?').get(String(productId));
        if (!inv) {
          const err = new Error('Inventory item not found.');
          err.statusCode = 404;
          throw err;
        }
        if (type === 'OUT' && inv.available_full_qty < qty) {
          const err = new Error('Insufficient stock.');
          err.statusCode = 409;
          throw err;
        }
        const now = new Date().toISOString();
        const delta = type === 'IN' ? qty : -qty;
        db.prepare('UPDATE inventory_items SET available_full_qty = available_full_qty + ?, updated_at = ? WHERE product_id = ?')
          .run(delta, now, productId);
        const id = newId('mov');
        db.prepare('INSERT INTO inventory_movements (id, product_id, movement_type, quantity, reason, order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(id, productId, type, qty, String(reason).trim(), orderId, now);
        return db.prepare('SELECT * FROM inventory_movements WHERE id = ?').get(id);
      });
      res.status(201).json({ movement });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ---------------- EXPENSES ----------------
  app.get('/api/expenses', (_req, res) => {
    const rows = db.prepare('SELECT * FROM expenses ORDER BY business_date DESC, created_at DESC').all();
    res.json({
      expenses: rows.map(r => ({
        id: r.id,
        category: r.category,
        description: r.description,
        amount: Math.round(r.amount_cents / 100),
        amountCents: r.amount_cents,
        paymentStatus: r.payment_status,
        paymentMethod: r.payment_method || '',
        reference: r.reference || '',
        date: r.business_date,
        active: Boolean(r.active),
        created_at: r.created_at,
        updated_at: r.updated_at
      }))
    });
  });

  app.post('/api/expenses', (req, res) => {
    const { category, description, amount, date, paymentStatus, paymentMethod = '', reference = '' } = req.body || {};
    const numAmount = Number(amount);
    if (!VALID_EXPENSE_CATEGORIES.has(String(category))) return res.status(400).json({ error: 'Invalid expense category.' });
    if (!String(description || '').trim()) return res.status(400).json({ error: 'Expense description is required.' });
    if (!Number.isFinite(numAmount) || numAmount <= 0) return res.status(400).json({ error: 'Amount must be positive.' });
    if (!DATE_RE.test(String(date || ''))) return res.status(400).json({ error: 'Valid YYYY-MM-DD date is required.' });
    if (!['Paid', 'Unpaid'].includes(String(paymentStatus))) return res.status(400).json({ error: 'Payment status must be Paid or Unpaid.' });
    if (paymentStatus === 'Paid' && !String(paymentMethod || '').trim()) return res.status(400).json({ error: 'Payment method is required for Paid expenses.' });

    const now = new Date().toISOString();
    const id = newId('EXP');
    const amountCents = Math.round(numAmount * 100);
    db.prepare(`
      INSERT INTO expenses (id, category, description, amount_cents, payment_status, payment_method, reference, business_date, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, category, String(description).trim(), amountCents, paymentStatus, paymentMethod || null, reference || null, date, now, now);

    res.status(201).json({
      expense: { id, category, description: String(description).trim(), amount: numAmount, paymentStatus, paymentMethod, reference, date, active: true, created_at: now, updated_at: now }
    });
  });

  app.patch('/api/expenses/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Expense not found.' });
    const body = req.body || {};
    const now = new Date().toISOString();
    const active = body.active !== undefined ? (body.active ? 1 : 0) : existing.active;
    const description = body.description !== undefined ? String(body.description).trim() : existing.description;
    const category = body.category !== undefined ? String(body.category) : existing.category;
    const amountCents = body.amount !== undefined ? Math.round(Number(body.amount) * 100) : existing.amount_cents;
    const paymentStatus = body.paymentStatus !== undefined ? String(body.paymentStatus) : existing.payment_status;
    const paymentMethod = body.paymentMethod !== undefined ? String(body.paymentMethod) : existing.payment_method;
    const reference = body.reference !== undefined ? String(body.reference) : existing.reference;
    const businessDate = body.date !== undefined ? String(body.date) : existing.business_date;

    if (!description || !Number.isFinite(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: 'Invalid expense update payload.' });
    }

    db.prepare(`
      UPDATE expenses
      SET category = ?, description = ?, amount_cents = ?, payment_status = ?, payment_method = ?, reference = ?, business_date = ?, active = ?, updated_at = ?
      WHERE id = ?
    `).run(category, description, amountCents, paymentStatus, paymentMethod || null, reference || null, businessDate, active, now, existing.id);

    res.json({
      expense: {
        id: existing.id, category, description, amount: Math.round(amountCents / 100),
        paymentStatus, paymentMethod: paymentMethod || '', reference: reference || '',
        date: businessDate, active: Boolean(active), updated_at: now
      }
    });
  });

  // ---------------- PAYMENTS ----------------
  app.get('/api/payments', (_req, res) => {
    res.json({ payments: db.prepare('SELECT * FROM payments ORDER BY recorded_at DESC').all() });
  });

  app.post('/api/payments', (req, res) => {
    const { orderId, method, amount, reference = '' } = req.body || {};
    const amountCents = Math.round(Number(amount) * 100);
    if (!orderId || !method || !Number.isFinite(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: 'orderId, method, and positive amount are required.' });
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(String(orderId));
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const now = new Date().toISOString();
    const id = newId('PAY');
    // Reference number never automatically marks payment as verified/paid
    const status = method === 'Cash' ? 'collected' : 'pending_verification';

    runTx(db, () => {
      db.prepare(`
        INSERT INTO payments (id, order_id, method, amount_cents, status, reference, recorded_at, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      `).run(id, orderId, method, amountCents, status, reference || null, now);
      db.prepare('UPDATE orders SET payment_status = ?, payment_method = ?, updated_at = ? WHERE id = ?')
        .run(status === 'pending_verification' ? 'Pending Verification' : 'Paid', method, now, orderId);
    });

    res.status(201).json({ payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(id) });
  });

  app.patch('/api/payments/:id/verification', (req, res) => {
    const { decision } = req.body || {};
    if (!['paid', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Decision must be paid or rejected.' });
    const pay = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!pay) return res.status(404).json({ error: 'Payment not found.' });

    const now = new Date().toISOString();
    runTx(db, () => {
      db.prepare('UPDATE payments SET status = ?, verified_at = ? WHERE id = ?').run(decision, now, pay.id);
      db.prepare('UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?')
        .run(decision === 'paid' ? 'Paid' : 'Unpaid', now, pay.order_id);
      writeAudit(db, { entityType: 'payments', entityId: pay.id, action: `payment_${decision}`, beforeData: pay, afterData: { status: decision } });
    });
    res.json({ payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(pay.id) });
  });

  // ---------------- REFILLS ----------------
  app.get('/api/refills', (_req, res) => {
    res.json({ refills: db.prepare('SELECT * FROM refill_records ORDER BY completed_at DESC').all() });
  });

  app.post('/api/refills', (req, res) => {
    const { orderId, productId, completedQuantity, assignedEmployee = 'Staff' } = req.body || {};
    const qty = Number(completedQuantity);
    if (!orderId || !productId || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'orderId, productId, and positive integer completedQuantity are required.' });
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(String(orderId));
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const now = new Date().toISOString();
    const id = newId('REF');
    const nextOrderStatus = order.service === 'Walk-in' ? 'Ready' : 'Ready';

    const refill = runTx(db, () => {
      db.prepare(`
        INSERT INTO refill_records (id, order_id, product_id, completed_quantity, assigned_employee, completed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, orderId, productId, qty, assignedEmployee, now);
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(nextOrderStatus, now, orderId);
      writeAudit(db, { entityType: 'refill_records', entityId: id, action: 'refill_completed', afterData: { orderId, productId, qty } });
      return db.prepare('SELECT * FROM refill_records WHERE id = ?').get(id);
    });
    res.status(201).json({ refill });
  });

  // ---------------- CONTAINER MOVEMENTS ----------------
  app.get('/api/container-movements', (_req, res) => {
    const movements = db.prepare('SELECT * FROM container_movements ORDER BY recorded_at DESC').all();
    res.json({ movements });
  });

  app.post('/api/container-movements', (req, res) => {
    const { customerName = '', orderId = null, productId, quantity, movementType, relatedMovementId = null } = req.body || {};
    const qty = Number(quantity);
    if (!productId || !VALID_CONTAINER_MOVEMENTS.has(movementType) || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Valid productId, movementType, and positive integer quantity are required.' });
    }

    const now = new Date().toISOString();
    const id = newId('CMOV');
    try {
      const movement = runTx(db, () => {
        db.prepare(`
          INSERT INTO container_movements (id, customer_name, order_id, product_id, quantity, movement_type, related_movement_id, recorded_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, customerName || null, orderId, productId, qty, movementType, relatedMovementId, now);
        return db.prepare('SELECT * FROM container_movements WHERE id = ?').get(id);
      });
      res.status(201).json({ movement });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ---------------- TRIPS & DELIVERY STOPS ----------------
  app.get('/api/trips', (_req, res) => {
    const trips = db.prepare('SELECT * FROM delivery_trips ORDER BY rowid DESC').all();
    const stops = db.prepare('SELECT * FROM delivery_stops').all();
    res.json({
      trips: trips.map(t => ({ ...t, stops: stops.filter(s => s.trip_id === t.id) }))
    });
  });

  app.post('/api/trips', (req, res) => {
    const { assignedEmployee, orderIds = [] } = req.body || {};
    if (!assignedEmployee || !Array.isArray(orderIds) || !orderIds.length) {
      return res.status(400).json({ error: 'assignedEmployee and non-empty orderIds are required.' });
    }
    const now = new Date().toISOString();
    const tripId = newId('TRIP');
    try {
      const trip = runTx(db, () => {
        db.prepare('INSERT INTO delivery_trips (id, assigned_employee, trip_status, started_at, remittance_status) VALUES (?, ?, ?, ?, ?)')
          .run(tripId, assignedEmployee, 'Out for Delivery', now, 'Not collected');
        const insStop = db.prepare('INSERT INTO delivery_stops (id, trip_id, order_id, delivery_status, actual_cash_received_cents) VALUES (?, ?, ?, ?, 0)');
        for (const oid of orderIds) {
          insStop.run(newId('STOP'), tripId, oid, 'Out for Delivery');
          db.prepare('UPDATE orders SET status = ?, assigned_employee = ?, updated_at = ? WHERE id = ?')
            .run('Out for Delivery', assignedEmployee, now, oid);
        }
        return db.prepare('SELECT * FROM delivery_trips WHERE id = ?').get(tripId);
      });
      res.status(201).json({ trip });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/trips/:id', (req, res) => {
    const trip = db.prepare('SELECT * FROM delivery_trips WHERE id = ?').get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    const { tripStatus, remittanceStatus } = req.body || {};
    const now = new Date().toISOString();
    db.prepare('UPDATE delivery_trips SET trip_status = ?, remittance_status = ?, completed_at = ? WHERE id = ?')
      .run(tripStatus || trip.trip_status, remittanceStatus || trip.remittance_status, tripStatus === 'Delivered' ? now : trip.completed_at, trip.id);
    res.json({ trip: db.prepare('SELECT * FROM delivery_trips WHERE id = ?').get(trip.id) });
  });

  app.post('/api/trips/:id/stops/:stopId/confirm', (req, res) => {
    const stop = db.prepare('SELECT * FROM delivery_stops WHERE id = ? AND trip_id = ?').get(req.params.stopId, req.params.id);
    if (!stop) return res.status(404).json({ error: 'Delivery stop not found.' });
    const { status = 'Delivered', cashReceived = 0, issueReason = null } = req.body || {};
    const now = new Date().toISOString();
    runTx(db, () => {
      db.prepare('UPDATE delivery_stops SET delivery_status = ?, actual_cash_received_cents = ?, completed_at = ?, issue_reason = ? WHERE id = ?')
        .run(status, Math.round(Number(cashReceived) * 100), now, issueReason, stop.id);
      db.prepare('UPDATE orders SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?')
        .run(status === 'Delivered' ? 'Delivered' : 'Cancelled', now, status === 'Delivered' ? now : null, stop.order_id);
    });
    res.json({ stop: db.prepare('SELECT * FROM delivery_stops WHERE id = ?').get(stop.id) });
  });

  // ---------------- REPORTS ----------------
  app.get('/api/reports/summary', (req, res) => {
    const { startDate, endDate } = req.query;
    const clauses = ["status != 'Cancelled'"];
    const params = [];
    if (startDate && DATE_RE.test(String(startDate))) {
      clauses.push('business_date >= ?');
      params.push(String(startDate));
    }
    if (endDate && DATE_RE.test(String(endDate))) {
      clauses.push('business_date <= ?');
      params.push(String(endDate));
    }
    const rows = db.prepare(`SELECT * FROM orders WHERE ${clauses.join(' AND ')}`).all(...params);
    const grossSales = rows.reduce((s, r) => s + r.total_cents, 0) / 100;
    const verifiedCollected = rows.filter(r => r.payment_status === 'Paid').reduce((s, r) => s + r.total_cents, 0) / 100;
    const outstandingBalance = rows.filter(r => r.payment_status === 'Unpaid').reduce((s, r) => s + r.total_cents, 0) / 100;
    res.json({ grossSales, verifiedCollected, outstandingBalance, orderCount: rows.length });
  });

  app.get('/api/reports/sales', (req, res) => {
    const rows = db.prepare("SELECT business_date, created_at, total_cents FROM orders WHERE status != 'Cancelled' ORDER BY business_date ASC").all();
    res.json({ series: rows.map(r => ({ date: r.business_date, created_at: r.created_at, amount: r.total_cents / 100 })) });
  });

  app.get('/api/reports/container-activity', (_req, res) => {
    const rows = db.prepare('SELECT movement_type, SUM(quantity) AS total FROM container_movements GROUP BY movement_type').all();
    const map = Object.fromEntries(rows.map(r => [r.movement_type, r.total]));
    const issued = (map.issued || 0) + (map.borrowed || 0);
    const returned = map.returned || 0;
    res.json({
      sold: map.sold || 0,
      issuedOrBorrowed: issued,
      returned,
      outstandingBorrowed: Math.max(0, issued - returned)
    });
  });

  // ---------------- SAFE DEMO IMPORT ----------------
  app.post('/api/import/demo', (req, res) => {
    const { orders = [], expenses = [] } = req.body || {};
    let importedOrders = 0;
    let skippedOrders = 0;
    let importedExpenses = 0;
    let skippedExpenses = 0;
    const now = new Date().toISOString();

    runTx(db, () => {
      for (const o of orders) {
        if (!o?.id || !DATE_RE.test(String(o.date || ''))) {
          skippedOrders++;
          continue;
        }
        const exists = db.prepare('SELECT id FROM orders WHERE id = ?').get(o.id);
        if (exists) {
          skippedOrders++;
          continue;
        }
        const cents = Math.round((Number(o.amount) || 0) * 100);
        db.prepare(`
          INSERT INTO orders (id, order_number, customer_name, source, service, status, payment_status, subtotal_cents, total_cents, assigned_employee, business_date, created_at, updated_at, is_demo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1)
        `).run(o.id, o.id, o.customer || 'Walk-in', o.source || 'Walk-in', o.service || 'Walk-in', o.status || 'Confirmed', o.paymentStatus || 'Unpaid', cents, cents, o.assigned || 'Unassigned', o.date, now);
        importedOrders++;
      }

      for (const e of expenses) {
        if (!e?.id || !DATE_RE.test(String(e.date || '')) || !(Number(e.amount) > 0)) {
          skippedExpenses++;
          continue;
        }
        const exists = db.prepare('SELECT id FROM expenses WHERE id = ?').get(e.id);
        if (exists) {
          skippedExpenses++;
          continue;
        }
        db.prepare(`
          INSERT INTO expenses (id, category, description, amount_cents, payment_status, payment_method, reference, business_date, active, created_at, updated_at, is_demo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(e.id, e.category || 'Other', e.description || 'Imported expense', Math.round(Number(e.amount) * 100), e.paymentStatus || 'Not Recorded', e.paymentMethod || null, e.reference || null, e.date, e.active === false ? 0 : 1, now, now);
        importedExpenses++;
      }
    });

    res.json({ importedOrders, skippedOrders, importedExpenses, skippedExpenses });
  });

  return app;
}
