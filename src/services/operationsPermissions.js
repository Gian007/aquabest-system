// Role & permission matrix for AquaBest shared operations.
// Maps legacy 'owner' to canonical 'super_admin' while keeping the three enforced roles:
// 'super_admin', 'manager', and 'staff'.

export const CANONICAL_ROLES = Object.freeze(['super_admin', 'manager', 'staff']);

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'owner' || value === 'super_admin') return 'super_admin';
  if (value === 'manager') return 'manager';
  if (value === 'staff' || value === 'delivery') return 'staff';
  return null;
}

export function getTaskTypeForStage(stage) {
  if (['collection', 'collectionClaimed', 'collectionTransit'].includes(stage)) return 'collection';
  if (['pending', 'refilling'].includes(stage)) return 'refill';
  if (['ready', 'delivery', 'out'].includes(stage)) return 'delivery';
  if (stage === 'pickup') return 'pickup';
  return null;
}

export function canClaimTask(role, taskTypeOrStage) {
  const canonical = normalizeRole(role);
  if (!canonical) return false;

  const taskType = ['collection', 'refill', 'delivery', 'pickup'].includes(taskTypeOrStage)
    ? taskTypeOrStage
    : getTaskTypeForStage(taskTypeOrStage);

  if (!taskType) return false;
  if (canonical === 'super_admin') return true;
  if (canonical === 'manager') {
    // Manager may assist with refill and pickup handoff, but CANNOT claim delivery or collection.
    return taskType === 'refill' || taskType === 'pickup';
  }
  // Staff can claim normal operational tasks.
  return true;
}

export function canVerifyPayments(role) {
  const canonical = normalizeRole(role);
  return canonical === 'super_admin' || canonical === 'manager';
}

export function canApproveRemittance(role) {
  const canonical = normalizeRole(role);
  return canonical === 'super_admin' || canonical === 'manager';
}

export function canManageEmployees(role) {
  return normalizeRole(role) === 'super_admin';
}

export function canViewAuditLogs(role) {
  const canonical = normalizeRole(role);
  return canonical === 'super_admin' || canonical === 'manager';
}

const VALID_STAGE_TRANSITIONS = Object.freeze({
  waiting: ['collection', 'pending', 'failed'],
  collection: ['collectionClaimed', 'failed'],
  collectionClaimed: ['collectionTransit', 'collection', 'failed'],
  collectionTransit: ['pending', 'failed'],
  pending: ['refilling', 'failed'],
  refilling: ['ready', 'pickup', 'pending', 'failed'],
  ready: ['delivery', 'failed'],
  delivery: ['out', 'ready', 'failed'],
  out: ['delivered', 'failed'],
  pickup: ['picked', 'failed'],
  delivered: [],
  picked: [],
  failed: ['waiting', 'collection', 'pending', 'ready']
});

export function isValidStageTransition(currentStage, nextStage) {
  const allowed = VALID_STAGE_TRANSITIONS[currentStage];
  return Array.isArray(allowed) && allowed.includes(nextStage);
}
