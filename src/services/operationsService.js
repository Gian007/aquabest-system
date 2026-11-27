import {
  normalizeRole,
  canClaimTask,
  canVerifyPayments,
  canApproveRemittance,
  canManageEmployees,
  isValidStageTransition,
  getTaskTypeForStage
} from './operationsPermissions.js';

export class OperationsError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'OperationsError';
    this.code = code;
    this.details = details;
  }
}

const ALLOWED_PROOF_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

function requireActor(actor) {
  const role = normalizeRole(actor?.role);
  if (!actor?.id || !role) {
    throw new OperationsError('UNAUTHORIZED', 'Authenticated employee identity and valid role are required.');
  }
  if (actor.active === false) {
    throw new OperationsError('FORBIDDEN', 'Inactive employee accounts cannot perform operations.');
  }
  return { ...actor, role };
}

function validateProofFile(file) {
  if (!file || typeof file !== 'object') {
    throw new OperationsError('VALIDATION_ERROR', 'A valid delivery proof image file is required.');
  }
  const type = String(file.type || '').toLowerCase();
  if (!ALLOWED_PROOF_MIME_TYPES.has(type)) {
    throw new OperationsError('VALIDATION_ERROR', 'Delivery proof must be a JPEG, PNG, or WebP image.');
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PROOF_BYTES) {
    throw new OperationsError('VALIDATION_ERROR', 'Delivery proof size must be between 1 byte and 5 MB.');
  }
}

/**
 * In-memory authoritative operations store for deterministic testing and local simulation.
 * Enforces optimistic locking (version checks), role permissions, payment separation,
 * and immutable before/after audit logging.
 */
export function createInMemoryOperationsStore({
  orders = [],
  trips = [],
  payments = [],
  remittances = [],
  employees = [],
  invitations = [],
  proofs = [],
  auditLogs = [],
  transport = null
} = {}) {
  const state = {
    orders: orders.map(o => ({ version: 1, ...o })),
    trips: trips.map(t => ({ ...t })),
    payments: payments.map(p => ({ ...p })),
    remittances: remittances.map(r => ({ ...r })),
    employees: employees.map(e => ({ ...e })),
    invitations: invitations.map(i => ({ ...i })),
    proofs: proofs.map(p => ({ ...p })),
    auditLogs: auditLogs.map(a => ({ ...a }))
  };

  let seq = 1;
  const nextId = prefix => `${prefix}-${Date.now().toString(36)}-${seq++}`;
  const nowIso = () => new Date().toISOString();

  const runTransport = async (opName) => {
    if (typeof transport === 'function') {
      try {
        await transport(opName);
      } catch (err) {
        throw new OperationsError('NETWORK_ERROR', err?.message || `Network failure during ${opName}.`);
      }
    }
  };

  const appendAudit = ({ actor, action, entityName, entityId, beforeData, afterData }) => {
    const entry = {
      id: nextId('audit'),
      actorId: actor.id,
      actorRole: actor.role,
      action,
      entityName,
      entityId,
      beforeData: beforeData ? structuredClone(beforeData) : null,
      afterData: afterData ? structuredClone(afterData) : null,
      createdAt: nowIso()
    };
    state.auditLogs.unshift(entry);
    return entry;
  };

  return {
    getSnapshot: () => structuredClone(state),

    async claimTask({ orderId, expectedVersion, targetStage, actor }) {
      const authActor = requireActor(actor);
      await runTransport('claimTask');

      const idx = state.orders.findIndex(o => o.id === orderId);
      if (idx === -1) {
        throw new OperationsError('NOT_FOUND', `Order ${orderId} was not found.`);
      }

      const current = state.orders[idx];
      const taskType = getTaskTypeForStage(current.stage) || getTaskTypeForStage(targetStage);
      if (!canClaimTask(authActor.role, taskType)) {
        throw new OperationsError(
          'FORBIDDEN',
          `Role "${authActor.role}" is not permitted to claim "${taskType}" tasks.`
        );
      }

      if (current.version !== expectedVersion) {
        throw new OperationsError(
          'CONFLICT',
          `Task ${orderId} was updated by another user (expected v${expectedVersion}, found v${current.version}).`
        );
      }

      if (current.claimedBy && current.claimedBy !== authActor.id) {
        throw new OperationsError(
          'CONFLICT',
          `Task ${orderId} is already claimed by another employee.`
        );
      }

      if (!isValidStageTransition(current.stage, targetStage)) {
        throw new OperationsError(
          'INVALID_TRANSITION',
          `Cannot transition task from "${current.stage}" to "${targetStage}".`
        );
      }

      const before = structuredClone(current);
      const updated = {
        ...current,
        stage: targetStage,
        claimedBy: authActor.id,
        claimedByRole: authActor.role,
        version: current.version + 1,
        updatedAt: nowIso()
      };
      state.orders[idx] = updated;

      appendAudit({
        actor: authActor,
        action: 'task_claimed',
        entityName: 'orders',
        entityId: orderId,
        beforeData: before,
        afterData: updated
      });

      return structuredClone(updated);
    },

    async transitionTask({ orderId, expectedVersion, nextStage, actor, patch = {} }) {
      const authActor = requireActor(actor);
      await runTransport('transitionTask');

      const idx = state.orders.findIndex(o => o.id === orderId);
      if (idx === -1) {
        throw new OperationsError('NOT_FOUND', `Order ${orderId} was not found.`);
      }

      const current = state.orders[idx];
      if (current.version !== expectedVersion) {
        throw new OperationsError(
          'CONFLICT',
          `Task ${orderId} version mismatch (expected v${expectedVersion}, found v${current.version}).`
        );
      }

      if (
        current.claimedBy &&
        current.claimedBy !== authActor.id &&
        authActor.role !== 'super_admin'
      ) {
        throw new OperationsError('FORBIDDEN', 'Only the assigned employee or Super Admin can advance this task.');
      }

      if (!isValidStageTransition(current.stage, nextStage)) {
        throw new OperationsError(
          'INVALID_TRANSITION',
          `Invalid stage transition: "${current.stage}" -> "${nextStage}".`
        );
      }

      const before = structuredClone(current);
      const shouldReleaseClaim = ['ready', 'pickup', 'pending', 'delivered', 'picked', 'failed'].includes(nextStage);
      const updated = {
        ...current,
        ...patch,
        stage: nextStage,
        claimedBy: shouldReleaseClaim ? null : current.claimedBy,
        version: current.version + 1,
        updatedAt: nowIso()
      };
      state.orders[idx] = updated;

      appendAudit({
        actor: authActor,
        action: 'task_transitioned',
        entityName: 'orders',
        entityId: orderId,
        beforeData: before,
        afterData: updated
      });

      return structuredClone(updated);
    },

    async uploadDeliveryProof({ orderId, tripId = null, file, actor, storageAdapter = null }) {
      const authActor = requireActor(actor);
      validateProofFile(file);
      await runTransport('uploadDeliveryProof');

      if (!storageAdapter || typeof storageAdapter.upload !== 'function') {
        throw new OperationsError(
          'STORAGE_NOT_CONFIGURED',
          'Secure object storage adapter is not configured.'
        );
      }

      const uploadResult = await storageAdapter.upload({
        bucket: 'delivery-proofs',
        path: `${orderId}/${nextId('proof')}`,
        file
      });

      const proofRecord = {
        id: nextId('proof'),
        orderId,
        tripId,
        storageBucket: uploadResult.bucket || 'delivery-proofs',
        storagePath: uploadResult.path,
        mimeType: file.type,
        byteSize: file.size,
        uploadedBy: authActor.id,
        createdAt: nowIso()
      };
      state.proofs.unshift(proofRecord);

      appendAudit({
        actor: authActor,
        action: 'delivery_proof_uploaded',
        entityName: 'delivery_proofs',
        entityId: proofRecord.id,
        beforeData: null,
        afterData: proofRecord
      });

      return structuredClone(proofRecord);
    },

    async submitPaymentProof({ orderId, method, reference, amountCents, actor }) {
      const authActor = requireActor(actor);
      if (!['gcash', 'bank_transfer'].includes(method)) {
        throw new OperationsError('VALIDATION_ERROR', 'Electronic proof requires gcash or bank_transfer.');
      }
      if (!String(reference || '').trim()) {
        throw new OperationsError('VALIDATION_ERROR', 'Payment reference number is required.');
      }
      await runTransport('submitPaymentProof');

      const payment = {
        id: nextId('pay'),
        orderId,
        method,
        reference: String(reference).trim(),
        amountCents: Number(amountCents) || 0,
        status: 'pending_verification',
        submittedBy: authActor.id,
        verifiedBy: null,
        verifiedAt: null,
        createdAt: nowIso()
      };
      state.payments.unshift(payment);

      appendAudit({
        actor: authActor,
        action: 'payment_proof_submitted',
        entityName: 'payments',
        entityId: payment.id,
        beforeData: null,
        afterData: payment
      });

      return structuredClone(payment);
    },

    async verifyPayment({ paymentId, decision, reason = '', actor }) {
      const authActor = requireActor(actor);
      if (!canVerifyPayments(authActor.role)) {
        throw new OperationsError('FORBIDDEN', 'Only Super Admin or Manager can verify payments.');
      }
      if (!['paid', 'rejected'].includes(decision)) {
        throw new OperationsError('VALIDATION_ERROR', 'Verification decision must be "paid" or "rejected".');
      }
      await runTransport('verifyPayment');

      const idx = state.payments.findIndex(p => p.id === paymentId);
      if (idx === -1) {
        throw new OperationsError('NOT_FOUND', `Payment ${paymentId} not found.`);
      }

      const before = structuredClone(state.payments[idx]);
      if (before.status !== 'pending_verification') {
        throw new OperationsError('CONFLICT', `Payment ${paymentId} is already "${before.status}".`);
      }

      const updated = {
        ...before,
        status: decision,
        verifiedBy: authActor.id,
        verifiedAt: nowIso(),
        rejectedReason: decision === 'rejected' ? String(reason || 'Rejected by reviewer') : null
      };
      state.payments[idx] = updated;

      appendAudit({
        actor: authActor,
        action: decision === 'paid' ? 'payment_verified' : 'payment_rejected',
        entityName: 'payments',
        entityId: paymentId,
        beforeData: before,
        afterData: updated
      });

      return structuredClone(updated);
    },

    async submitCashRemittance({ employeeId, paymentIds = [], amountCents, actor }) {
      const authActor = requireActor(actor);
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
        throw new OperationsError('VALIDATION_ERROR', 'Remittance amount must be positive integer centavos.');
      }
      await runTransport('submitCashRemittance');

      const remittance = {
        id: nextId('remit'),
        employeeId: employeeId || authActor.id,
        paymentIds: [...paymentIds],
        amountCents,
        status: 'awaiting_remittance',
        submittedAt: nowIso(),
        receivedBy: null,
        receivedAt: null
      };
      state.remittances.unshift(remittance);

      appendAudit({
        actor: authActor,
        action: 'cash_remittance_submitted',
        entityName: 'cash_remittances',
        entityId: remittance.id,
        beforeData: null,
        afterData: remittance
      });

      return structuredClone(remittance);
    },

    async verifyCashRemittance({ remittanceId, decision, actor }) {
      const authActor = requireActor(actor);
      if (!canApproveRemittance(authActor.role)) {
        throw new OperationsError('FORBIDDEN', 'Only Super Admin or Manager can approve cash remittances.');
      }
      if (!['approved', 'discrepancy'].includes(decision)) {
        throw new OperationsError('VALIDATION_ERROR', 'Decision must be "approved" or "discrepancy".');
      }
      await runTransport('verifyCashRemittance');

      const idx = state.remittances.findIndex(r => r.id === remittanceId);
      if (idx === -1) {
        throw new OperationsError('NOT_FOUND', `Remittance ${remittanceId} not found.`);
      }

      const before = structuredClone(state.remittances[idx]);
      if (before.status !== 'awaiting_remittance') {
        throw new OperationsError('CONFLICT', `Remittance ${remittanceId} is already "${before.status}".`);
      }

      const updated = {
        ...before,
        status: decision,
        receivedBy: authActor.id,
        receivedAt: nowIso()
      };
      state.remittances[idx] = updated;

      appendAudit({
        actor: authActor,
        action: 'cash_remittance_verified',
        entityName: 'cash_remittances',
        entityId: remittanceId,
        beforeData: before,
        afterData: updated
      });

      return structuredClone(updated);
    },

    async inviteEmployee({ email, fullName, role, branchId = 'main', actor }) {
      const authActor = requireActor(actor);
      if (!canManageEmployees(authActor.role)) {
        throw new OperationsError('FORBIDDEN', 'Only Super Admin can invite employees.');
      }
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new OperationsError('VALIDATION_ERROR', 'A valid employee email is required.');
      }
      const targetRole = normalizeRole(role);
      if (!targetRole) {
        throw new OperationsError('VALIDATION_ERROR', 'Role must be super_admin, manager, or staff.');
      }
      await runTransport('inviteEmployee');

      const invitation = {
        id: nextId('inv'),
        email: cleanEmail,
        fullName: String(fullName || '').trim(),
        role: targetRole,
        branchId,
        status: 'pending',
        invitedBy: authActor.id,
        createdAt: nowIso()
      };
      state.invitations.unshift(invitation);

      appendAudit({
        actor: authActor,
        action: 'employee_invited',
        entityName: 'employee_invitations',
        entityId: invitation.id,
        beforeData: null,
        afterData: invitation
      });

      return structuredClone(invitation);
    },

    async updateEmployeeRole({ employeeId, newRole, active = true, actor }) {
      const authActor = requireActor(actor);
      if (!canManageEmployees(authActor.role)) {
        throw new OperationsError('FORBIDDEN', 'Only Super Admin can update employee roles.');
      }
      const targetRole = normalizeRole(newRole);
      if (!targetRole) {
        throw new OperationsError('VALIDATION_ERROR', 'Role must be super_admin, manager, or staff.');
      }
      await runTransport('updateEmployeeRole');

      const idx = state.employees.findIndex(e => e.id === employeeId);
      if (idx === -1) {
        throw new OperationsError('NOT_FOUND', `Employee ${employeeId} not found.`);
      }

      const before = structuredClone(state.employees[idx]);
      const updated = {
        ...before,
        role: targetRole,
        active: Boolean(active),
        updatedAt: nowIso()
      };
      state.employees[idx] = updated;

      appendAudit({
        actor: authActor,
        action: 'employee_role_updated',
        entityName: 'employees',
        entityId: employeeId,
        beforeData: before,
        afterData: updated
      });

      return structuredClone(updated);
    }
  };
}

/**
 * Supabase RPC & Storage integration adapter.
 * Ready to bind once @supabase/supabase-js and VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are configured.
 */
export function createSupabaseOperationsAdapter({ client, storageBucket = 'delivery-proofs' } = {}) {
  const requireClient = () => {
    if (!client) {
      throw new OperationsError(
        'BACKEND_NOT_CONFIGURED',
        'Supabase client is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'
      );
    }
    return client;
  };

  return {
    async claimTask({ orderId, expectedVersion, targetStage }) {
      const sb = requireClient();
      const { data, error } = await sb.rpc('claim_operational_task', {
        p_order_id: orderId,
        p_expected_version: expectedVersion,
        p_target_stage: targetStage
      });
      if (error) {
        const code = error.code === '40901' ? 'CONFLICT' : error.code === '42501' ? 'FORBIDDEN' : 'NETWORK_ERROR';
        throw new OperationsError(code, error.message, error);
      }
      return data;
    },

    async uploadDeliveryProof({ orderId, file }) {
      validateProofFile(file);
      const sb = requireClient();
      const path = `${orderId}/${Date.now()}.jpg`;
      const { data, error } = await sb.storage.from(storageBucket).upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (error) throw new OperationsError('NETWORK_ERROR', error.message, error);
      return { bucket: storageBucket, path: data.path };
    },

    async verifyPayment({ paymentId, decision, reason = '' }) {
      const sb = requireClient();
      const { data, error } = await sb.rpc('verify_payment_record', {
        p_payment_id: paymentId,
        p_decision: decision,
        p_reason: reason
      });
      if (error) throw new OperationsError('NETWORK_ERROR', error.message, error);
      return data;
    },

    async verifyCashRemittance({ remittanceId, decision }) {
      const sb = requireClient();
      const { data, error } = await sb.rpc('reconcile_cash_remittance', {
        p_remittance_id: remittanceId,
        p_decision: decision
      });
      if (error) throw new OperationsError('NETWORK_ERROR', error.message, error);
      return data;
    }
  };
}
