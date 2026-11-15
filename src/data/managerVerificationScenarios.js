/**
 * EXPLICITLY SYNTHETIC Manager Order Verification showcase.
 * All customer names, addresses, timestamps, amounts and outcomes below are fictitious.
 * Never treat as real orders, staff actions, collected cash, or photo proof.
 * Kept separate from Staff/Manager order stores so QA cannot change live workflow.
 */
export const MANAGER_VERIFICATION_SCENARIOS=[
 // Staff A — successful delivery, partial customer-owned collection, successful pickup.
 {id:'DEMO-V101',customer:'Alex Rivera (Sample)',source:'Phone',service:'Delivery',address:'Tower 1, Unit 311 (Sample)',quantity:4,stage:'delivered',deliveredQty:4,deliveredBy:'Staff A',deliveredAt:'11/16/2026, 9:20:00 AM',cashCollected:140,paymentMethod:'Cash',scenarioLabel:'Delivery completed — quantity matched'},
 {id:'DEMO-V102',customer:'Jamie Cruz (Sample)',source:'Messenger',service:'Delivery',address:'Tower 2, Unit 204 (Sample)',quantity:5,collectedQty:3,collectionRequired:true,stage:'collectionTransit',collectedBy:'Staff A',collectedAt:'11/16/2026, 9:48:00 AM',issueReason:'Only 3 empty gallons were available; 2 were not handed over.',scenarioLabel:'Partial empty-container collection — 2 uncollected'},
 {id:'DEMO-V103',customer:'Sam Torres (Sample)',source:'Walk-in',service:'Pickup',address:'Station counter (Sample)',quantity:2,stage:'picked',releasedBy:'Staff A',releasedAt:'11/16/2026, 10:10:00 AM',scenarioLabel:'Customer picked up order — no delivery proof required'},
 // Staff B — no customer at location, completed delivery without recorded quantity, missing collection count.
 {id:'DEMO-V104',customer:'Taylor Reyes (Sample)',source:'Messenger',service:'Delivery',address:'Tower 3, Unit 506 (Sample)',quantity:3,stage:'failed',claimedBy:'Staff B',issueReason:'Customer unavailable; no answer at the unit.',failedAt:'11/16/2026, 10:40:00 AM',scenarioLabel:'Failed delivery attempt — customer unavailable'},
 {id:'DEMO-V105',customer:'Casey Lim (Sample)',source:'Phone',service:'Delivery',address:'Block 5, Lot 12 (Sample)',quantity:3,stage:'delivered',deliveredBy:'Staff B',deliveredAt:'11/16/2026, 11:15:00 AM',cashCollected:105,scenarioLabel:'Delivery recorded — actual gallon quantity not submitted'},
 {id:'DEMO-V106',customer:'Morgan Dela Cruz (Sample)',source:'Phone',service:'Delivery',address:'Tower 1, Unit 702 (Sample)',quantity:4,collectionRequired:true,stage:'collectionTransit',collectedBy:'Staff B',collectedAt:'11/16/2026, 11:30:00 AM',scenarioLabel:'Collection result entered — actual collected count missing'},
 // Staff C — wrong address, wrong delivered quantity, matched return and damage complaint.
 {id:'DEMO-V107',customer:'Jordan Santos (Sample)',source:'Phone',service:'Delivery',address:'Tower 6, Unit 310 (Sample)',quantity:2,stage:'failed',claimedBy:'Staff C',issueReason:'Wrong unit number reported; destination needs confirmation.',failedAt:'11/16/2026, 12:05:00 PM',scenarioLabel:'Failed visit — wrong unit'},
 {id:'DEMO-V108',customer:'Robin Garcia (Sample)',source:'Messenger',service:'Delivery',address:'Tower 4, Unit 210 (Sample)',quantity:5,deliveredQty:4,stage:'delivered',deliveredBy:'Staff C',deliveredAt:'11/16/2026, 12:40:00 PM',issueReason:'Four filled gallons released; one gallon still needs delivery.',scenarioLabel:'Delivery quantity mismatch — 1 gallon short'},
 {id:'DEMO-V109',customer:'Dana Bautista (Sample)',source:'Phone',service:'Delivery',address:'Block 8, Lot 2 (Sample)',quantity:2,collectedQty:2,collectionRequired:true,stage:'collectionTransit',collectedBy:'Staff C',collectedAt:'11/16/2026, 1:00:00 PM',scenarioLabel:'Empty-container collection — quantity matched'},
 {id:'DEMO-V110',customer:'Avery Mendoza (Sample)',source:'Messenger',service:'Delivery',address:'Tower 7, Unit 809 (Sample)',quantity:2,deliveredQty:2,stage:'delivered',deliveredBy:'Staff C',deliveredAt:'11/16/2026, 1:35:00 PM',issueReason:'Customer reported one gallon container with visible damage; inspect before replacement.',scenarioLabel:'Delivery quantity matched — damaged gallon complaint'}
].map(order=>({...order,sourceWorkspace:'manager-verification-sample',isDemoScenario:true}));
