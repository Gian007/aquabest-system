/**
 * Staff browser-only demo storage adapter.
 *
 * This module is the boundary that will be replaced by an authenticated server
 * repository. Never store passwords, access tokens, or authoritative payments here.
 *
 * Keep the existing storage keys so previous demo work is not lost.
 */
export const STAFF_DEMO_KEYS=Object.freeze({
 orders:'aquabest-staff-operations-demo-v1',
 trips:'aquabest-staff-trips-demo-v1',
 settings:'aquabest-staff-dashboard-settings-v1',
 notifications:'aquabest-staff-notifications-demo-v1',
 notificationPrefs:'aquabest-staff-notification-prefs-v1'
});

export function loadStaffDemo(key, fallback){
 try{
  const value=JSON.parse(localStorage.getItem(key)||'null');
  return value===null?fallback:value;
 }catch{return fallback;}
}

export function saveStaffDemo(key, value){
 try{localStorage.setItem(key,JSON.stringify(value));return true;}
 catch{return false;}
}

/**
 * Backend interface checklist (not implemented):
 * signIn(email,password) -> authenticated user & server-managed session
 * getMyProfile() -> {id, email, role, branchId}
 * getQueue({branchId,status}) / getMyTasks()
 * claimTasks({orderIds,expectedVersions}) -> authoritative assignments
 * dispatchTrip({orderIds,idempotencyKey}) -> trip and order states
 * confirmDelivery({orderId,proofId,cashCollected,idempotencyKey})
 * uploadProof({orderId,file}) -> durable object storage
 * getNotifications() / markNotificationsRead(ids)
 * getSettings() / saveSettings(payload)
 *
 * All mutations must be authorized server-side. Local browser demo values
 * must never be treated as proof of identity, payment, or order ownership.
 */
