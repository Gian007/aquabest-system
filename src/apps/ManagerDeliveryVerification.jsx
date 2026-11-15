import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiCamera, FiX } from 'react-icons/fi';
import { STAFF_DEMO_KEYS } from '../services/staffDemoAdapter.js';
import { getLocalProof } from './staffProofStorage.js';
import { formatMoney } from '../data/managerDemo.js';
import './managerControl.css';
import './managerSimplified.css';
import './managerReview.css';

const REVIEW_KEY='aquabest-manager-delivery-verification-demo-v1';
const read=(key,fallback)=>{try{const val=JSON.parse(localStorage.getItem(key)||'null');return val===null?fallback:val;}catch{return fallback;}};
const qty=o=>Number(o.quantity)||((o.items||[]).reduce((n,i)=>n+(Number(i.quantity)||0),0));
const outcomes={delivered:'Delivered',picked:'Customer Pickup',failed:'Failed Visit'};
const time=()=>new Date().toLocaleString('en-PH');
export default function ManagerDeliveryVerification({go,managerOrders,onNotice}){
 const [staffOrders,setStaffOrders]=useState(()=>read(STAFF_DEMO_KEYS.orders,[]));
 const [reviews,setReviews]=useState(()=>read(REVIEW_KEY,{}));
 const [selected,setSelected]=useState('');
 const [note,setNote]=useState('');
 const [proof,setProof]=useState('');
 const [proofStatus,setProofStatus]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  const refresh=()=>setStaffOrders(read(STAFF_DEMO_KEYS.orders,[]));
  window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',visible);
  return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);document.removeEventListener('visibilitychange',visible);};
 },[]);
 useEffect(()=>()=>{if(proof)URL.revokeObjectURL(proof);},[proof]);
 const fromStaff=staffOrders.length>0;
 const records=(fromStaff?staffOrders:managerOrders.map(o=>({...o,stage:o.status==='Delivered'?'delivered':o.status==='Completed'?'picked':null,quantity:qty(o)}))).filter(o=>['delivered','picked','failed'].includes(o.stage)||o.issueReason||o.collectedAt);
 const current=records.find(o=>o.id===selected);
 const awaiting=records.filter(o=>!reviews[o.id]||reviews[o.id].result==='followup');
 const reviewed=records.filter(o=>reviews[o.id]?.result==='reviewed');
 const issues=records.filter(o=>o.stage==='failed'||o.issueReason||reviews[o.id]?.result==='followup');
 const open=async o=>{
  setSelected(o.id);setNote('');setError('');setLoading(true);setProofStatus('');
  setProof(prev=>{if(prev)URL.revokeObjectURL(prev);return '';});
  if(!fromStaff){setProofStatus('No Staff photo is available for Manager sample orders.');setLoading(false);return;}
  try{const found=await getLocalProof(o.id);if(found?.file)setProof(URL.createObjectURL(found.file));else setProofStatus('No photo saved for this order in this browser.');}
  catch{setProofStatus('Unable to read photo evidence from this browser.');}
  finally{setLoading(false);}
 };
 const close=()=>{setSelected('');setError('');setProof(prev=>{if(prev)URL.revokeObjectURL(prev);return '';});};
 const save=result=>{
  if(!current)return;
  if(result==='reviewed'&&current.stage==='failed'){setError('A failed visit cannot be marked as a successfully reviewed delivery. Use Needs Follow-up.');return;}
  if(result==='reviewed'&&current.podRecorded&&!proof){setError('Staff reported a proof photo, but it is not available here. Please review the evidence before approval.');return;}
  if(result==='followup'&&!note.trim()){setError('Enter the follow-up reason.');return;}
  const updated={...reviews,[current.id]:{result,reason:note.trim(),reviewer:'Manager',reviewedAt:time(),staff:current.deliveredBy||current.collectedBy||current.releasedBy||'Not recorded',reportedStage:current.stage}};
  try{localStorage.setItem(REVIEW_KEY,JSON.stringify(updated));}catch{setError('Could not save review on this browser.');return;}
  setReviews(updated);close();onNotice('Manager verification noted locally. Delivery and payment statuses were not changed.');
 };
 return <div className="manager-control manager-review">
  <div className="manager-control-title"><span>MANAGER CHECKS</span><h1>Delivery Verification</h1><p>Review reported deliveries, failed visits, expected gallons and available proof before marking the record checked.</p></div>
  <div className="manager-control-kpis">
   <div className="manager-control-metric"><div className="manager-control-metric-top">To Review</div><strong>{awaiting.length}</strong></div>
   <div className="manager-control-metric"><div className="manager-control-metric-top">Reviewed</div><strong>{reviewed.length}</strong></div>
   <div className="manager-control-metric"><div className="manager-control-metric-top">Issues / Follow-up</div><strong>{issues.length}</strong></div>
   <div className="manager-control-metric"><div className="manager-control-metric-top">Reported Outcomes</div><strong>{records.length}</strong></div>
  </div>
  <p className="manager-control-help">{fromStaff?'Reading Staff outcomes saved in this browser.':'Showing Manager demo orders; no Staff data found on this browser.'} No cross-device sync or automatic verification.</p>
  {records.length?records.map(o=><article className="manager-control-panel" key={o.id}>
   <div className="manager-control-order-head"><strong>{o.id} · {o.customer}</strong><span className={'manager-control-tag '+(reviews[o.id]?.result==='reviewed'?'ok':o.stage==='failed'?'danger':'')}>{reviews[o.id]?.result==='reviewed'?'Reviewed':reviews[o.id]?.result==='followup'?'Needs Follow-up':'To Review'}</span></div>
   <p className="manager-control-help">{o.address||o.customerReference||'Location not recorded'} · {o.deliveredBy||o.collectedBy||o.releasedBy||'Staff not recorded'}</p>
   <div className="manager-control-compare"><div><span>Expected</span><strong>{qty(o)}</strong></div><div><span>Collected</span><strong>{o.collectedQty??'—'}</strong></div><div><span>Outcome</span><strong>{outcomes[o.stage]||o.stage}</strong></div></div>
   <p className="manager-control-help">Reported: {o.deliveredAt||o.collectedAt||o.releasedAt||'Time unavailable'}</p>
   <button className="manager-control-secondary" onClick={()=>open(o)}>{reviews[o.id]?'Review Again':'Check Details & Proof'}</button>
  </article>):<div className="manager-control-panel"><p className="manager-control-empty">No delivery outcomes or failed visits to check yet.</p></div>}
  <p className="manager-control-help">Delivery status, review status and cash remittance are separate. A review confirms the Manager checked available records—not independent proof that the customer received water.</p>
  {current&&<div className="manager-simple-overlay" role="presentation" onClick={close}><section className="manager-simple-sheet" role="dialog" aria-modal="true" aria-label="Review delivery" onClick={e=>e.stopPropagation()}>
   <div className="manager-control-order-head"><h2>Check {current.id}</h2><button className="manager-control-secondary" onClick={close}><FiX/> Close</button></div>
   <p><strong>{current.customer}</strong> · {current.address||current.customerReference||'Location not recorded'}</p>
   <p>Outcome: {outcomes[current.stage]||current.stage} · {current.deliveredBy||current.collectedBy||current.releasedBy||'Staff not recorded'}</p>
   <p>Reported time: {current.deliveredAt||current.collectedAt||current.releasedAt||'Unknown'}</p>
   <div className="manager-control-compare"><div><span>Expected</span><strong>{qty(current)}</strong></div><div><span>Collected</span><strong>{current.collectedQty??'—'}</strong></div><div><span>Cash Reported</span><strong>{current.cashCollected==null?'—':formatMoney(current.cashCollected)}</strong></div></div>
   <div className="manager-review-photo"><strong><FiCamera/> Photo evidence</strong>{loading?<p>Loading local photo…</p>:proof?<img src={proof} alt={'Delivery evidence for '+current.id}/>:<p>{proofStatus||'Photo not available.'}</p>}</div>
   {reviews[current.id]&&<p className="manager-control-help">Previous review: {reviews[current.id].result} by {reviews[current.id].reviewer} at {reviews[current.id].reviewedAt}. {reviews[current.id].reason}</p>}
   <label className="manager-control-field"><span>Manager note (required if follow-up)</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Missing gallons, customer unavailable, wrong unit, missing proof…"/></label>
   {error&&<p className="manager-control-error" role="alert">{error}</p>}
   <div className="manager-review-actions"><button className="manager-control-secondary" onClick={()=>save('followup')}><FiAlertTriangle/> Needs Follow-up</button><button className="manager-control-primary" disabled={loading||current.stage==='failed'} onClick={()=>save('reviewed')}><FiCheckCircle/> Mark Reviewed</button></div>
  </section></div>}
 </div>;
}
