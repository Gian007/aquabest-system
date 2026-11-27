import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryOperationsStore, OperationsError } from '../src/services/operationsService.js';
import { canClaimTask, normalizeRole } from '../src/services/operationsPermissions.js';

const SUPER_ADMIN = { id: 'emp-admin', role: 'super_admin', active: true };
const LEGACY_OWNER = { id: 'emp-owner', role: 'owner', active: true };
const MANAGER = { id: 'emp-mgr', role: 'manager', active: true };
const STAFF_1 = { id: 'emp-s1', role: 'staff', active: true };
const STAFF_2 = { id: 'emp-s2', role: 'staff', active: true };

test('role permissions enforce super_admin, manager restrictions, and staff access', () => {
  assert.equal(normalizeRole('owner'), 'super_admin');
  assert.equal(canClaimTask('super_admin', 'collection'), true);
  assert.equal(canClaimTask('super_admin', 'delivery'), true);
  assert.equal(canClaimTask('super_admin', 'refill'), true);

  assert.equal(canClaimTask('manager', 'refill'), true);
  assert.equal(canClaimTask('manager', 'pickup'), true);
  assert.equal(canClaimTask('manager', 'collection'), false);
  assert.equal(canClaimTask('manager', 'delivery'), false);

  assert.equal(canClaimTask('staff', 'collection'), true);
  assert.equal(canClaimTask('staff', 'delivery'), true);
  assert.equal(canClaimTask('staff', 'refill'), true);
});

test('manager is blocked from claiming delivery or collection tasks on the server boundary', async () => {
  const store = createInMemoryOperationsStore({
    orders: [
      { id: 'ORD-1', stage: 'collection', version: 1, claimedBy: null },
      { id: 'ORD-2', stage: 'ready', version: 1, claimedBy: null },
      { id: 'ORD-3', stage: 'pending', version: 1, claimedBy: null }
    ]
  });

  await assert.rejects(
    () => store.claimTask({ orderId: 'ORD-1', expectedVersion: 1, targetStage: 'collectionClaimed', actor: MANAGER }),
    err => err instanceof OperationsError && err.code === 'FORBIDDEN'
  );

  await assert.rejects(
    () => store.claimTask({ orderId: 'ORD-2', expectedVersion: 1, targetStage: 'delivery', actor: MANAGER }),
    err => err instanceof OperationsError && err.code === 'FORBIDDEN'
  );

  const refillClaim = await store.claimTask({
    orderId: 'ORD-3',
    expectedVersion: 1,
    targetStage: 'refilling',
    actor: MANAGER
  });
  assert.equal(refillClaim.claimedBy, MANAGER.id);
  assert.equal(refillClaim.version, 2);

  // Super Admin (including normalized legacy 'owner') can claim delivery
  const ownerClaim = await store.claimTask({
    orderId: 'ORD-2',
    expectedVersion: 1,
    targetStage: 'delivery',
    actor: LEGACY_OWNER
  });
  assert.equal(ownerClaim.claimedBy, LEGACY_OWNER.id);
});

test('concurrent claim on the same task fails atomically with CONFLICT', async () => {
  const store = createInMemoryOperationsStore({
    orders: [{ id: 'ORD-10', stage: 'ready', version: 1, claimedBy: null }]
  });

  const first = await store.claimTask({
    orderId: 'ORD-10',
    expectedVersion: 1,
    targetStage: 'delivery',
    actor: STAFF_1
  });
  assert.equal(first.claimedBy, STAFF_1.id);
  assert.equal(first.version, 2);

  await assert.rejects(
    () => store.claimTask({
      orderId: 'ORD-10',
      expectedVersion: 1,
      targetStage: 'delivery',
      actor: STAFF_2
    }),
    err => err instanceof OperationsError && err.code === 'CONFLICT'
  );

  const snap = store.getSnapshot();
  assert.equal(snap.orders[0].claimedBy, STAFF_1.id);
  assert.equal(snap.orders[0].version, 2);
});

test('task transitions enforce ownership, valid stages, and record before/after audit logs', async () => {
  const store = createInMemoryOperationsStore({
    orders: [{ id: 'ORD-20', stage: 'pending', version: 1, claimedBy: null }]
  });

  const claimed = await store.claimTask({
    orderId: 'ORD-20',
    expectedVersion: 1,
    targetStage: 'refilling',
    actor: STAFF_1
  });

  // Unowned employee cannot advance someone else's task
  await assert.rejects(
    () => store.transitionTask({
      orderId: 'ORD-20',
      expectedVersion: claimed.version,
      nextStage: 'ready',
      actor: STAFF_2
    }),
    err => err instanceof OperationsError && err.code === 'FORBIDDEN'
  );

  // Invalid jump directly to delivered from refilling is blocked
  await assert.rejects(
    () => store.transitionTask({
      orderId: 'ORD-20',
      expectedVersion: claimed.version,
      nextStage: 'delivered',
      actor: STAFF_1
    }),
    err => err instanceof OperationsError && err.code === 'INVALID_TRANSITION'
  );

  const ready = await store.transitionTask({
    orderId: 'ORD-20',
    expectedVersion: claimed.version,
    nextStage: 'ready',
    actor: STAFF_1
  });
  assert.equal(ready.stage, 'ready');
  assert.equal(ready.claimedBy, null);
  assert.equal(ready.version, 3);

  const logs = store.getSnapshot().auditLogs;
  assert.equal(logs[0].action, 'task_transitioned');
  assert.equal(logs[0].beforeData.stage, 'refilling');
  assert.equal(logs[0].afterData.stage, 'ready');
  assert.equal(logs[0].actorId, STAFF_1.id);
});

test('submitted payment proof and cash remittance require manager/super_admin verification', async () => {
  const store = createInMemoryOperationsStore();

  const payment = await store.submitPaymentProof({
    orderId: 'ORD-30',
    method: 'gcash',
    reference: 'GCASH-998877',
    amountCents: 17500,
    actor: STAFF_1
  });
  assert.equal(payment.status, 'pending_verification');

  // Staff cannot self-verify electronic payment
  await assert.rejects(
    () => store.verifyPayment({ paymentId: payment.id, decision: 'paid', actor: STAFF_1 }),
    err => err instanceof OperationsError && err.code === 'FORBIDDEN'
  );

  const verified = await store.verifyPayment({
    paymentId: payment.id,
    decision: 'paid',
    actor: MANAGER
  });
  assert.equal(verified.status, 'paid');
  assert.equal(verified.verifiedBy, MANAGER.id);

  // Cash remittance
  const remit = await store.submitCashRemittance({
    employeeId: STAFF_1.id,
    paymentIds: [payment.id],
    amountCents: 17500,
    actor: STAFF_1
  });
  assert.equal(remit.status, 'awaiting_remittance');

  await assert.rejects(
    () => store.verifyCashRemittance({ remittanceId: remit.id, decision: 'approved', actor: STAFF_2 }),
    err => err instanceof OperationsError && err.code === 'FORBIDDEN'
  );

  const approvedRemit = await store.verifyCashRemittance({
    remittanceId: remit.id,
    decision: 'approved',
    actor: SUPER_ADMIN
  });
  assert.equal(approvedRemit.status, 'approved');
  assert.equal(approvedRemit.receivedBy, SUPER_ADMIN.id);
});

test('only super_admin can invite employees and update roles', async () => {
  const store = createInMemoryOperationsStore({
    employees: [{ id: 'emp-s1', fullName: 'Staff One', role: 'staff', active: true }]
  });

  await assert.rejects(
    () => store.inviteEmployee({ email: 'new@aquabest.ph', fullName: 'New', role: 'staff', actor: MANAGER }),
    err => err instanceof OperationsError && err.code === 'FORBIDDEN'
  );

  const inv = await store.inviteEmployee({
    email: 'new@aquabest.ph',
    fullName: 'New Staff',
    role: 'manager',
    actor: SUPER_ADMIN
  });
  assert.equal(inv.status, 'pending');
  assert.equal(inv.role, 'manager');

  await assert.rejects(
    () => store.updateEmployeeRole({ employeeId: 'emp-s1', newRole: 'manager', actor: MANAGER }),
    err => err instanceof OperationsError && err.code === 'FORBIDDEN'
  );

  const updatedEmp = await store.updateEmployeeRole({
    employeeId: 'emp-s1',
    newRole: 'manager',
    actor: SUPER_ADMIN
  });
  assert.equal(updatedEmp.role, 'manager');
});

test('failed network requests reject cleanly without mutating authoritative state', async () => {
  const store = createInMemoryOperationsStore({
    orders: [{ id: 'ORD-99', stage: 'pending', version: 1, claimedBy: null }],
    transport: async () => {
      throw new Error('Request timed out');
    }
  });

  await assert.rejects(
    () => store.claimTask({ orderId: 'ORD-99', expectedVersion: 1, targetStage: 'refilling', actor: STAFF_1 }),
    err => err instanceof OperationsError && err.code === 'NETWORK_ERROR'
  );

  await assert.rejects(
    () => store.uploadDeliveryProof({
      orderId: 'ORD-99',
      file: { type: 'image/jpeg', size: 2048 },
      actor: STAFF_1,
      storageAdapter: { upload: async () => ({ bucket: 'delivery-proofs', path: 'x' }) }
    }),
    err => err instanceof OperationsError && err.code === 'NETWORK_ERROR'
  );

  const snap = store.getSnapshot();
  assert.equal(snap.orders[0].stage, 'pending');
  assert.equal(snap.orders[0].claimedBy, null);
  assert.equal(snap.orders[0].version, 1);
  assert.equal(snap.proofs.length, 0);
  assert.equal(snap.auditLogs.length, 0);
});
