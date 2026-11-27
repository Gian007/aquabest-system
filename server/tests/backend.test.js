import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { seedDemoData } from '../db/seed.js';
import { createApp } from '../app.js';

async function startTestServer(db) {
  const app = createApp(db);
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('migrations and demo seed are idempotent and preserve historical null created_at', () => {
  const db = openDatabase(':memory:');
  const first = runMigrations(db);
  assert.equal(first.length, 1);
  const second = runMigrations(db);
  assert.equal(second.length, 0);

  seedDemoData(db);
  seedDemoData(db);
  const orders = db.prepare('SELECT * FROM orders').all();
  assert.equal(orders.length, 4);
  assert.equal(orders.every(o => o.created_at === null), true);
  db.close();
});

test('SQLite persists orders across database close and reopen', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aquabest-test-'));
  const dbFile = path.join(tmpDir, 'test.sqlite');

  let db = openDatabase(dbFile);
  seedDemoData(db);
  let { server, baseUrl } = await startTestServer(db);

  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: 'Persist Test',
      source: 'Walk-in',
      service: 'Walk-in',
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      ownership: 'own',
      items: [{ sizeId: 'round5', quantity: 2 }]
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.ok(created.order.created_at);
  assert.equal(created.order.amount, 70);

  await new Promise(r => server.close(r));
  db.close();

  // Reopen same file
  db = openDatabase(dbFile);
  ({ server, baseUrl } = await startTestServer(db));
  const listRes = await fetch(`${baseUrl}/api/orders/${created.order.id}`);
  assert.equal(listRes.status, 200);
  const fetched = await listRes.json();
  assert.equal(fetched.order.customer, 'Persist Test');

  await new Promise(r => server.close(r));
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('rejects invalid payloads, prevents duplicates, and handles payments, expenses, refills, and containers', async () => {
  const db = openDatabase(':memory:');
  seedDemoData(db);
  const { server, baseUrl } = await startTestServer(db);

  try {
    // Invalid payload
    const badRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'InvalidSource', service: 'Walk-in', items: [] })
    });
    assert.equal(badRes.status, 400);

    // Duplicate ID prevention
    const dupRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'AB-1042', source: 'Walk-in', service: 'Walk-in', items: [{ sizeId: 'round5', quantity: 1 }] })
    });
    assert.equal(dupRes.status, 409);

    // Payment proof stays pending_verification until explicitly verified
    const payRes = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'AB-1042', method: 'GCash', amount: 70, reference: 'REF-123' })
    });
    assert.equal(payRes.status, 201);
    const payBody = await payRes.json();
    assert.equal(payBody.payment.status, 'pending_verification');

    const verifyRes = await fetch(`${baseUrl}/api/payments/${payBody.payment.id}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'paid' })
    });
    assert.equal(verifyRes.status, 200);
    assert.equal((await verifyRes.json()).payment.status, 'paid');

    // Expense create & void
    const expRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'Fuel', description: 'Gasoline', amount: 150, date: '2026-10-31', paymentStatus: 'Paid', paymentMethod: 'Cash' })
    });
    assert.equal(expRes.status, 201);
    const expId = (await expRes.json()).expense.id;

    const voidRes = await fetch(`${baseUrl}/api/expenses/${expId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false })
    });
    assert.equal(voidRes.status, 200);
    assert.equal((await voidRes.json()).expense.active, false);

    // Container issue & return calculation
    await fetch(`${baseUrl}/api/container-movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Maria', productId: 'round5', quantity: 4, movementType: 'borrowed' })
    });
    await fetch(`${baseUrl}/api/container-movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Maria', productId: 'round5', quantity: 1, movementType: 'returned' })
    });
    const contReport = await (await fetch(`${baseUrl}/api/reports/container-activity`)).json();
    assert.equal(contReport.issuedOrBorrowed, 4);
    assert.equal(contReport.returned, 1);
    assert.equal(contReport.outstandingBorrowed, 3);

    // Refill & inventory movement
    const refRes = await fetch(`${baseUrl}/api/refills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'AB-1041', productId: 'round5', completedQuantity: 5, assignedEmployee: 'Staff A' })
    });
    assert.equal(refRes.status, 201);

    // Safe import skips duplicates
    const impRes = await (await fetch(`${baseUrl}/api/import/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: [{ id: 'AB-1042', date: '2026-10-31', amount: 999 }], expenses: [] })
    })).json();
    assert.equal(impRes.skippedOrders, 1);
    assert.equal(impRes.importedOrders, 0);
  } finally {
    await new Promise(r => server.close(r));
    db.close();
  }
});
