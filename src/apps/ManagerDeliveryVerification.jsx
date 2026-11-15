import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiCamera, FiSearch, FiX, FiTruck, FiPackage, FiShoppingBag } from 'react-icons/fi';
import { STAFF_DEMO_KEYS } from '../services/staffDemoAdapter.js';
import { getLocalProof } from './staffProofStorage.js';
import { formatMoney } from '../data/managerDemo.js';
import './managerControl.css';
import './managerSimplified.css';
import './managerReview.css';

// A Manager review is separate from the order's actual operational status and payment.
// These records are browser-local prototype data, NOT server-verified outcomes.
const KEY='aquabest-manager-delivery-verification-demo-v1';
const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value===null?fallback:value;}catch{return fallback;}};
const qty=o=>Number.isFinite(Number(o.quantity))&&o.quantity!==null&&o.quantity!==undefined?Number(o.quantity):(o.items||[]).reduce((n,i)=>n+(Number(i.quantity)||0),0);
const numberOrNull=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const when=()=>new Date().toLocaleString('en-PH');
const issueTypes=['Customer unavailable','Incomplete collection','Wrong address / unit','Incorrect delivery quantity','Damaged gallon','Required photo unavailable','Cash discrepancy','Other'];
const nextActions=['Contact customer','Reschedule visit','Investigate quantity','Arrange correction','Request proof','Refer to remittance','Other'];
function transaction(o){
 if(o.stage==='picked'||(o.service==='Pickup'&&!o.collectionRequired))return 'Pickup';
 if(o.stage==='collection'||o.stage==='collectionClaimed'||o.stage==='collectionTransit'||(o.collectionRequired&&!o.collectedAt&&o.stage==='failed'))return 'Collection';
 return 'Delivery';
}
function outcome(o){
 const type=transaction(o);
 if(o.stage==='failed')return 'Failed visit';
 if(type==='Pickup')return 'Customer pickup';
 if(type==='Collection')return o.collectedAt?'Collection recorded':'Collection awaiting result';
 return o.stage==='delivered'?'Delivered':o.collectedAt?'Collection recorded':'Result recorded';
}
function summary(o){
 const type=transaction(o),expected=qty(o),collected=numberOrNull(o.collectedQty),delivered=numberOrNull(o.deliveredQty);
 if(type==='Collection'){
  if(collected===null)return {tone:'neutral',title:'Collection quantity not recorded',detail:'No actual collection count submitted. This is not a confirmed shortage.',expected,actual:null,difference:null,actualLabel:'Collected'};
  const difference=expected-collected;
  return difference>0?{tone:'issue',title:difference+' gallon'+(difference!==1?'s':'')+' not collected',detail:'Recorded collection is lower than the expected quantity.',expected,actual:collected,difference,actualLabel:'Collected'}:
   difference<0?{tone:'issue',title:Math.abs(difference)+' extra gallon'+(Math.abs(difference)!==1?'s':'')+' reported',detail:'Collected quantity exceeds the recorded expectation.',expected,actual:collected,difference,actualLabel:'Collected'}:
   {tone:'good',title:'Collection quantity matched',detail:'Actual collection matches the expected gallons.',expected,actual:collected,difference:0,actualLabel:'Collected'};
 }
 if(type==='Pickup')return {tone:'neutral',title:o.stage==='picked'?'Customer pickup recorded':'Pickup result recorded',detail:'Empty-gallon collection and delivery photos are not automatically required for a station pickup.',expected,actual:null,difference:null,actualLabel:null};
 if(o.stage==='failed')return {tone:'issue',title:'Delivery attempt unsuccessful',detail:o.issueReason||'Staff reported an unsuccessful visit. The reason needs review.',expected,actual:delivered,difference:delivered===null?null:expected-delivered,actualLabel:'Delivered'};
 if(delivered===null)return {tone:'neutral',title:'Delivery marked complete; quantity not separately recorded',detail:'The Staff outcome is recorded, but there is no separate actual-delivered quantity field. Do not assume a shortage.',expected,actual:null,difference:null,actualLabel:'Delivered'};
 const difference=expected-delivered;
 return difference===0?{tone:'good',title:'Delivery quantity matched',detail:'Reported delivered count matches the order.',expected,actual:delivered,difference:0,actualLabel:'Delivered'}:
 {tone:'issue',title:difference>0?difference+' gallon(s) short':'More gallons reported than ordered',detail:'Reported quantity does not match the order.',expected,actual:delivered,difference,actualLabel:'Delivered'};
}
const labelFor=status=>status==='verified'?'Verified':status==='action_required'?'Action Required':status==='resolved'?'Resolved':'Pending Review';
export default function ManagerDeliveryVerification({managerOrders,onNotice}){
 const [staffOrders,setStaffOrders]=useState(()=>read(STAFF_DEMO_KEYS.orders,[]));
 const [reviews,setReviews]=useState(()=>{
  const saved=read(KEY,{});
  // Preserve existing demo reviews made before the structured review redesign.
  return Object.fromEntries(Object.entries(saved).map(([id,value])=>{
   if(!value||typeof value!=='object')return [id,{result:'pending'}];
   if(value.result==='followup')return [id,{...value,result:'action_required',issueType:value.issueType||'Other',nextAction:value.nextAction||'Investigate quantity',note:value.note||value.reason||''}];
   if(value.result==='reviewed')return [id,{...value,result:'verified'}];
   return [id,value];
  }));
 });
 const [category,setCategory]=useState('All');
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState('');
 const [issueType,setIssueType]=useState('');
 const [nextAction,setNextAction]=useState('');
 const [note,setNote]=useState('');
 const [proof,setProof]=useState('');
 const [proofMessage,setProofMessage]=useState('');
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  const refresh=()=>setStaffOrders(read(STAFF_DEMO_KEYS.orders,[]));
  window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',visible);
  return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);document.removeEventListener('visibilitychange',visible);};
 },[]);
 useEffect(()=>()=>{if(proof)URL.revokeObjectURL(proof);},[proof]);
 const fromStaff=staffOrders.length>0;
 const records=useMemo(()=>fromStaff?staffOrders.filter(o=>['delivered','picked','failed'].includes(o.stage)||o.collectedAt||o.issueReason):
  managerOrders.map(o=>({...o,quantity:qty(o),stage:o.status==='Delivered'?'delivered':o.status==='Completed'?'picked':null})).filter(o=>o.stage==='delivered'||o.stage==='picked'),[fromStaff,staffOrders,managerOrders]);
 const current=records.find(o=>o.id===selected);
 const currentSummary=current?summary(current):null;
 const currentReview=current?reviews[current.id]:null;
 const statusFor=o=>reviews[o.id]?.result||'pending';
 const counts={pending:records.filter(o=>statusFor(o)==='pending').length,action_required:records.filter(o=>statusFor(o)==='action_required').length,verified:records.filter(o=>statusFor(o)==='verified').length,resolved:records.filter(o=>statusFor(o)==='resolved').length};
 const filtered=records.filter(o=>(category==='All'||category===transaction(o)||(category==='Issues'&&(summary(o).tone==='issue'||o.issueReason||statusFor(o)==='action_required')))&&[o.id,o.customer,o.address,o.customerReference,o.deliveredBy,o.collectedBy,o.releasedBy].join(' ').toLowerCase().includes(search.toLowerCase()));
 const open=async o=>{
  setSelected(o.id);setIssueType(reviews[o.id]?.issueType||'');setNextAction(reviews[o.id]?.nextAction||'');setNote(reviews[o.id]?.note||'');setError('');
  setLoading(true);setProofMessage('');setProof(old=>{if(old)URL.revokeObjectURL(old);return '';});
  if(!fromStaff){setProofMessage('No Staff photo evidence exists for this Manager sample record.');setLoading(false);return;}
  try{const record=await getLocalProof(o.id);if(record?.file)setProof(URL.createObjectURL(record.file));else setProofMessage('No photo is stored for this order on this browser.');}
  catch{setProofMessage('Could not read local photo evidence.');}
  finally{setLoading(false);}
 };
 const close=()=>{setSelected('');setError('');setProof(old=>{if(old)URL.revokeObjectURL(old);return '';});};
 const save=(result)=>{
  if(!current)return;
  if(result==='action_required'&&(!issueType||!nextAction)){setError('Select an issue type and the next action. Notes are optional.');return;}
  if(result==='verified'){
   if(current.stage==='failed'||currentSummary?.tone==='issue'||(transaction(current)==='Collection'&&currentSummary?.actual===null)){setError('This outcome has an unresolved failure or missing quantity. Record an issue instead.');return;}
   if(current.podRecorded&&!proof){setError('Staff reported a photo, but it cannot be viewed in this browser. Request proof instead.');return;}
   if(currentReview?.result==='action_required'){setError('An open issue needs to be resolved before it can be verified.');return;}
  }
  if(result==='resolved'&&currentReview?.result!=='action_required'){setError('Only an open Action Required record can be marked Resolved.');return;}
  if(result==='resolved'&&!note.trim()){setError('Explain how the issue was resolved.');return;}
  const next={...reviews,[current.id]:{result,issueType:result==='action_required'?issueType:currentReview?.issueType||'',nextAction:result==='action_required'?nextAction:currentReview?.nextAction||'',note:note.trim(),reviewer:'Manager',reviewedAt:when(),sourceStage:current.stage,staff:current.deliveredBy||current.collectedBy||current.releasedBy||'Not recorded'}};
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{setError('Unable to save this review in this browser.');return;}
  setReviews(next);close();onNotice('Order review saved on this browser. No delivery, payment or Staff status was changed.');
 };
 return <div className="manager-control manager-review">
  <div className="manager-control-title"><span>MANAGER CHECKS</span><h1>Order Verification</h1><p>See exactly what happened, which quantity is unreported or different, and what needs follow-up.</p></div>
  <div className="manager-control-kpis">
   <div className="manager-control-metric"><div className="manager-control-metric-top">Pending Review</div><strong>{counts.pending}</strong></div>
   <div className="manager-control-metric"><div className="manager-control-metric-top">Action Required</div><strong>{counts.action_required}</strong></div>
   <div className="manager-control-metric"><div className="manager-control-metric-top">Verified</div><strong>{counts.verified}</strong></div>
   <div className="manager-control-metric"><div className="manager-control-metric-top">Resolved</div><strong>{counts.resolved}</strong></div>
  </div>
  <label className="manager-control-search"><FiSearch/><input aria-label="Search review orders" placeholder="Search order, customer or unit" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <div className="manager-review-tabs" role="group" aria-label="Transaction type">{['All','Delivery','Collection','Pickup','Issues'].map(t=><button type="button" key={t} className={category===t?'active':''} onClick={()=>setCategory(t)}>{t}</button>)}</div>
  <p className="manager-control-help">{fromStaff?'Reviewing Staff outcomes saved on this browser.':'Showing Manager sample orders. No Staff records found in this browser.'} Not synced across devices.</p>
  {filtered.length?filtered.map(o=>{const info=summary(o);const review=reviews[o.id];return <article className="manager-control-panel manager-review-card" key={o.id}>
   <div className="manager-control-order-head"><strong>{o.id} · {o.customer}</strong><span className={'manager-control-tag '+(review?.result==='verified'||review?.result==='resolved'?'ok':review?.result==='action_required'?'danger':'')}>{labelFor(statusFor(o))}</span></div>
   <p className="manager-control-help">{transaction(o)} · {o.address||o.customerReference||'Location not recorded'} · {o.deliveredBy||o.collectedBy||o.releasedBy||'Staff not recorded'}</p>
   <div className={'manager-review-summary '+info.tone}><strong>{info.tone==='issue'?<FiAlertTriangle/>:info.tone==='good'?<FiCheckCircle/>:null}{info.title}</strong><small>{info.detail}</small></div>
   {info.actualLabel&&<div className="manager-control-compare"><div><span>Expected</span><strong>{info.expected}</strong></div><div><span>{info.actualLabel}</span><strong>{info.actual??'Not reported'}</strong></div><div><span>Difference</span><strong>{info.difference===null?'Not known':Math.abs(info.difference)}</strong></div></div>}
   {review?.result==='action_required'&&<div className="manager-review-action-summary"><strong>{review.issueType}</strong><small>Next: {review.nextAction}</small></div>}
   <p className="manager-control-help">Reported {o.deliveredAt||o.collectedAt||o.releasedAt||o.failedAt||'time unavailable'}</p>
   <button className="manager-control-secondary" onClick={()=>open(o)}>{review?'View / Update Review':'Review Order'}</button>
  </article>;}):<div className="manager-control-panel"><p className="manager-control-empty">No matching order results yet.</p></div>}
  <p className="manager-control-help">A dash or unreported quantity is not a missing gallon. Actual operations, Manager review, and cash remittance are separate.</p>
  {current&&<div className="manager-simple-overlay" role="presentation" onClick={close}><section className="manager-simple-sheet manager-review-sheet" role="dialog" aria-modal="true" aria-label="Review order" onClick={e=>e.stopPropagation()}>
   <div className="manager-control-order-head"><h2>Review {current.id}</h2><button className="manager-control-secondary" onClick={close}><FiX/> Close</button></div>
   <p><strong>{current.customer}</strong> · {current.address||current.customerReference||'Location not recorded'}</p>
   <p>{transaction(current)} · {outcome(current)} · Staff: {current.deliveredBy||current.collectedBy||current.releasedBy||'Not recorded'}</p>
   <p>Reported time: {current.deliveredAt||current.collectedAt||current.releasedAt||current.failedAt||'Not recorded'}</p>
   <div className={'manager-review-summary '+currentSummary.tone}><strong>{currentSummary.tone==='issue'?<FiAlertTriangle/>:null}{currentSummary.title}</strong><small>{currentSummary.detail}</small></div>
   {currentSummary.actualLabel&&<div className="manager-control-compare"><div><span>Expected</span><strong>{currentSummary.expected}</strong></div><div><span>{currentSummary.actualLabel}</span><strong>{currentSummary.actual??'Not reported'}</strong></div><div><span>Difference</span><strong>{currentSummary.difference===null?'Not known':Math.abs(currentSummary.difference)}</strong></div></div>}
   {transaction(current)==='Delivery'&&<p className="manager-control-help">COD reported: {current.cashCollected==null?'Not recorded':formatMoney(current.cashCollected)} · Cash verification is handled separately.</p>}
   {current.issueReason&&<div className="manager-review-action-summary"><strong>Staff reported:</strong><small>{current.issueReason}</small></div>}
   <div className="manager-review-photo"><strong><FiCamera/> {transaction(current)==='Pickup'?'Supporting photo (optional)':'Photo evidence'}</strong>{loading?<p>Reading local proof…</p>:proof?<img src={proof} alt={'Staff evidence for '+current.id}/>:<p>{proofMessage||'No proof in this browser.'}{transaction(current)==='Pickup'?' No photo is normally required for station pickup.':''}</p>}</div>
   {currentReview&&<div className="manager-review-action-summary"><strong>Previous: {labelFor(currentReview.result)}</strong><small>{currentReview.issueType?currentReview.issueType+' · ':''}{currentReview.nextAction?currentReview.nextAction+' · ':''}{currentReview.note||'No extra note'} · {currentReview.reviewedAt}</small></div>}
   <div className="manager-review-issue-fields"><h3>Issue & Next Action</h3><p className="manager-control-help">Use these fields when action is required—not just free-text notes.</p>
    <label className="manager-control-field"><span>Issue type</span><select value={issueType} onChange={e=>setIssueType(e.target.value)}><option value="">Select the problem</option>{issueTypes.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="manager-control-field"><span>Next action</span><select value={nextAction} onChange={e=>setNextAction(e.target.value)}><option value="">Select what should happen</option>{nextActions.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="manager-control-field"><span>Additional notes / resolution</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional issue detail; required when resolving an existing issue"/></label>
   </div>
   {error&&<p className="manager-control-error" role="alert">{error}</p>}
   <div className="manager-review-actions">
    <button className="manager-control-secondary" onClick={()=>save('action_required')}><FiAlertTriangle/> Action Required</button>
    {currentReview?.result==='action_required'?<button className="manager-control-primary" onClick={()=>save('resolved')}><FiCheckCircle/> Mark Resolved</button>:<button className="manager-control-primary" disabled={loading} onClick={()=>save('verified')}><FiCheckCircle/> Verify Record</button>}
   </div>
  </section></div>}
 </div>;
}
