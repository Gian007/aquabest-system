import { useEffect, useMemo, useState } from 'react';
import { FiActivity, FiAlertCircle, FiArrowRight, FiCheckCircle, FiClipboard, FiDroplet, FiPackage, FiSearch, FiTruck, FiUsers } from 'react-icons/fi';
import { formatMoney, orderSummary } from '../data/managerDemo.js';
import { STAFF_DEMO_KEYS } from '../services/staffDemoAdapter.js';
import './managerControl.css';
import './staffOperations.css';
import './managerSimplified.css';

// Frontend-only preview. Staff data can be shared in the SAME browser, not across phones.
const readList=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[];}catch{return [];}};
const writeList=(key,data)=>{try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}};
const dateLabel=()=>new Date().toLocaleString('en-PH');
const quantity=o=>Number(o.quantity)||((o.items||[]).reduce((n,x)=>n+(Number(x.quantity)||0),0));
const STATUS={waiting:'Awaiting Confirmation',collection:'Pending Collection',collectionClaimed:'Collecting',collectionTransit:'Returning to Station',pending:'Pending Refill',refilling:'Refilling',ready:'Ready for Delivery',pickup:'Ready for Pickup',delivery:'Delivery Claimed',out:'Out for Delivery',delivered:'Delivered',picked:'Picked Up',failed:'Needs Attention'};
const group=stage=>stage==='waiting'?'Waiting':['collection','collectionClaimed','collectionTransit'].includes(stage)?'Collection':['pending','refilling'].includes(stage)?'Refill':['ready','delivery','out'].includes(stage)?'Delivery':stage==='pickup'?'Pickup':['delivered','picked'].includes(stage)?'Completed':'Issues';
const isFinished=o=>['delivered','picked'].includes(o.stage);
const fromManager=o=>({...o,sourceWorkspace:'manager',quantity:quantity(o),stage:({'Pending Confirmation':'waiting',Confirmed:'pending',Preparing:'refilling',Ready:'ready','Out for Delivery':'out',Delivered:'delivered',Completed:'picked',Cancelled:'failed'})[o.status]||'pending'});
const dateNum=val=>{const n=Date.parse(val||'');return Number.isFinite(n)?n:0;};
const Metric=({label,value,Icon})=><div className="manager-control-metric"><div className="manager-control-metric-top"><span>{label}</span><Icon/></div><strong>{value}</strong></div>;
export default function ManagerSimplified({page,go,orders,availability,onOpenOrder,onFinishManagerRefill,onClaimManagerRefill,onNotice}){
 const [staffOrders,setStaffOrders]=useState(()=>readList(STAFF_DEMO_KEYS.orders));
 const [staffTrips,setStaffTrips]=useState(()=>readList(STAFF_DEMO_KEYS.trips));
 const [staffTask,setStaffTask]=useState('');
 const [confirmRefill,setConfirmRefill]=useState('');
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('All');
 const [person,setPerson]=useState('');
 const [history,setHistory]=useState(()=>readList('aquabest-manager-refill-activity-v2'));
 const refresh=()=>{
  setStaffOrders(readList(STAFF_DEMO_KEYS.orders));
  setStaffTrips(readList(STAFF_DEMO_KEYS.trips));
 };
 useEffect(()=>{
  window.addEventListener('focus',refresh);
  window.addEventListener('storage',refresh);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',visible);
  return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);document.removeEventListener('visibilitychange',visible);};
 },[]);
 const fromStaff=staffOrders.length>0;
 const queue=useMemo(()=>fromStaff?staffOrders.map(o=>({...o,sourceWorkspace:'staff'})):orders.map(fromManager),[fromStaff,staffOrders,orders]);
 const selectedTask=queue.find(o=>o.id===staffTask);
 const pending=queue.filter(o=>!isFinished(o)&&o.stage!=='failed');
 const issues=queue.filter(o=>o.stage==='failed'||o.issueReason||o.issue);
 const categories=['All','Waiting','Collection','Refill','Delivery','Pickup','Completed','Issues'];
 const filtered=queue.filter(o=>(filter==='All'||group(o.stage)===filter)&&[o.id,o.customer,o.address,o.customerReference,o.claimedBy,o.refilledBy,o.deliveredBy,o.source].join(' ').toLowerCase().includes(query.toLowerCase()));
 const assigned=o=>o.claimedBy||o.deliveredBy||o.collectedBy||o.refilledBy||o.assigned||'Not claimed';
 const openOrder=o=>{if(o.sourceWorkspace==='manager')onOpenOrder(o);else setStaffTask(o.id);};
 const claimRefill=o=>{
  if(o.stage!=='pending'||o.claimedBy)return;
  if(o.sourceWorkspace==='manager'){onClaimManagerRefill(o.id);onNotice('Manager claimed refill in Manager demo orders.');return;}
  const now=dateLabel();
  const refreshed=readList(STAFF_DEMO_KEYS.orders);
  const current=refreshed.find(x=>x.id===o.id);
  if(!current||current.stage!=='pending'||current.claimedBy){onNotice('This refill was already claimed or changed. Refresh the queue.');refresh();return;}
  const next=refreshed.map(x=>x.id===o.id?{...x,stage:'refilling',claimedBy:'Manager',refillClaimedAt:now,updatedAt:now}:x);
  if(!writeList(STAFF_DEMO_KEYS.orders,next)){onNotice('Unable to save claim on this browser.');return;}
  setStaffOrders(next);onNotice('Refill claimed by Manager on this browser only.');
 };
 const finishRefill=()=>{
  const o=queue.find(x=>x.id===confirmRefill);
  if(!o||o.stage!=='refilling'||o.claimedBy!=='Manager')return;
  if(o.sourceWorkspace==='manager'){onFinishManagerRefill(o.id);}
  else{
   const updated=staffOrders.map(x=>x.id===o.id?{...x,stage:x.service==='Pickup'?'pickup':'ready',claimedBy:null,refilledBy:'Manager',refillCompletedAt:dateLabel(),refillCompletedAtISO:new Date().toISOString(),updatedAt:dateLabel()}:x);
   if(!writeList(STAFF_DEMO_KEYS.orders,updated)){onNotice('Could not save changes to this browser.');return;}
   setStaffOrders(updated);
  }
  const activity={id:Date.now()+'-'+o.id,orderId:o.id,employee:'Manager',action:'Refill completed',quantity:quantity(o),at:dateLabel()};
  setHistory(prev=>{const next=[activity,...prev].slice(0,120);writeList('aquabest-manager-refill-activity-v2',next);return next;});
  setConfirmRefill('');setStaffTask('');
  onNotice('Manager completed refill on this browser only. No cross-device sync.');
 };
 const events=useMemo(()=>{
  const work=queue.flatMap(o=>[
   o.collectedAt?{id:o.id+'-collected',employee:o.collectedBy||o.claimedBy||'Unknown',action:'Collected containers',orderId:o.id,quantity:Number(o.collectedQty)||quantity(o),at:o.collectedAt}:null,
   o.refillCompletedAt?{id:o.id+'-refilled',employee:o.refilledBy||'Unknown',action:'Refill completed',orderId:o.id,quantity:quantity(o),at:o.refillCompletedAt}:null,
   o.deliveredAt?{id:o.id+'-delivered',employee:o.deliveredBy||'Unknown',action:'Delivery completed',orderId:o.id,quantity:quantity(o),at:o.deliveredAt}:null,
   o.releasedAt?{id:o.id+'-released',employee:o.releasedBy||'Unknown',action:'Pickup completed',orderId:o.id,quantity:quantity(o),at:o.releasedAt}:null
  ].filter(Boolean));
  return [...work,...history.filter(x=>!work.some(e=>e.orderId===x.orderId&&e.action===x.action))].sort((a,b)=>dateNum(b.at)-dateNum(a.at));
 },[queue,history]);
 const people=[...new Set([...Object.keys(availability).filter(n=>!['Owner','Manager'].includes(n)),...queue.flatMap(o=>[o.claimedBy,o.collectedBy,o.refilledBy,o.deliveredBy,o.releasedBy]).filter(Boolean),...events.map(e=>e.employee)])].filter(n=>n!=='Manager');
 const staffTasks=name=>queue.filter(o=>assigned(o)===name&&!isFinished(o)&&o.stage!=='failed');
 const personEvents=name=>events.filter(x=>x.employee===name);
 const pickups=queue.filter(o=>o.collectionRequired||['collection','collectionClaimed','collectionTransit'].includes(o.stage));
 const pickupExpected=pickups.reduce((n,o)=>n+quantity(o),0);
 const pickupActual=pickups.reduce((n,o)=>n+(o.collectedQty==null?0:Number(o.collectedQty)||0),0);
 const trips=staffTrips.map(t=>({...t,orders:queue.filter(o=>o.tripId===t.id||(Array.isArray(t.orderIds)&&t.orderIds.includes(o.id)))}));
 const cards=(list,empty)=><div className="manager-simple-cards staffapp manager-staff-queue">{list.length?list.map(o=><article className={'staffapp-order manager-staff-order manager-simple-'+group(o.stage).toLowerCase()} key={o.id}>
  <div className="staffapp-compact-row staffapp-compact-head"><div className="staffapp-compact-identity"><strong>{o.id} <span className="staffapp-id-divider">·</span> {o.customer}</strong></div><span className="staffapp-payment-badge">{o.paymentStatus||'Cash / COD'}</span></div>
  <div className="staffapp-compact-row staffapp-compact-meta"><span>{o.items?orderSummary(o.items):quantity(o)+' gallons'} · {o.address||o.customerReference||o.service||'Walk-in'}</span><span>{o.createdAt||o.date||'—'}</span></div>
  <div className="manager-staff-state"><span className="manager-control-tag">{STATUS[o.stage]||o.stage}</span><small>{assigned(o)}</small></div>
  <div className="staffapp-compact-row staffapp-compact-actions"><button className="staffapp-secondary" onClick={()=>openOrder(o)}>Details <FiArrowRight/></button>
   {o.stage==='pending'&&!o.claimedBy&&<button className="staffapp-primary" onClick={()=>claimRefill(o)}>Claim Refill</button>}
   {o.stage==='refilling'&&o.claimedBy==='Manager'&&<button className="staffapp-primary" onClick={()=>setConfirmRefill(o.id)}>Complete Refill</button>}
  </div>
 </article>):<p className="manager-control-empty">{empty}</p>}</div>;
 return <div className="manager-control manager-simple">
  {page==='dashboard'&&<>
   <div className="manager-control-title"><span>MANAGER WORKSPACE</span><h1>Station Overview</h1><p>Today's workload, team activity and issues at a glance.</p></div>
   <div className="manager-control-kpis"><Metric label="Pending Orders" value={pending.length} Icon={FiClipboard}/><Metric label="In Progress" value={queue.filter(o=>['collectionClaimed','collectionTransit','refilling','delivery','out'].includes(o.stage)).length} Icon={FiDroplet}/><Metric label="Out for Delivery" value={queue.filter(o=>o.stage==='out').length} Icon={FiTruck}/><Metric label="Issues to Review" value={issues.length} Icon={FiAlertCircle}/></div>
   <div className="manager-control-actions"><button onClick={()=>go('queue')}><FiClipboard/> Operations Queue <FiArrowRight/></button><button onClick={()=>go('staff')}><FiUsers/> Staff Monitoring <FiArrowRight/></button><button onClick={()=>go('collections')}><FiTruck/> Trips & Pickups <FiArrowRight/></button><button onClick={()=>go('verification')}><FiCheckCircle/> Delivery Verification <FiArrowRight/></button></div>
   <div className="manager-control-sectionhead"><h2>Delivery Checks</h2><button onClick={()=>go('verification')}>Review results <FiArrowRight/></button></div>
   <p className="manager-control-help">Check delivered orders, missing gallons and unsuccessful visits. Cash remittance stays in More.</p>
   <div className="manager-control-sectionhead"><h2>Work in Progress</h2><button onClick={()=>go('queue')}>View All <FiArrowRight/></button></div>
   {cards(pending.slice(0,3),'No active tasks in the current demo.')}
   {issues.length>0&&<><h2>Needs Attention</h2>{cards(issues.slice(0,2),'')}</>}
   <p className="manager-control-help">This is a browser demo, not live cross-device monitoring. {fromStaff?'Showing Staff records saved in this browser.':'Showing Manager sample orders; no saved Staff queue in this browser.'}</p>
  </>}
  {page==='queue'&&<>
   <div className="manager-control-title"><span>OPERATIONS</span><h1>Operations Queue</h1><p>Same compact task cards as Staff. Manager can claim and complete Refills only, never Collection or Delivery.</p></div>
   <div className="manager-control-search"><FiSearch/><input value={query} aria-label="Search orders" placeholder="Search customer, unit, order…" onChange={e=>setQuery(e.target.value)}/></div>
   <div className="manager-control-filter">{categories.map(cat=><button key={cat} className={filter===cat?'active':''} onClick={()=>setFilter(cat)}>{cat} ({cat==='All'?queue.length:queue.filter(o=>group(o.stage)===cat).length})</button>)}</div>
   {cards(filtered,'No orders in this category.')}
   <p className="manager-control-help">Manager may claim only Pending Refill. Only Manager-claimed refills can be completed by Manager. Collection and Delivery remain view-only. No cross-device claim locking yet.</p>
  </>}
  {page==='collections'&&<>
   <div className="manager-control-title"><span>DELIVERY OPERATIONS</span><h1>Trips & Pickups</h1><p>Staff records each customer stop. Manager reviews the trip and collection results—no separate manual batch counting.</p></div>
   <div className="manager-control-kpis"><Metric label="Pickup Orders" value={pickups.length} Icon={FiClipboard}/><Metric label="Expected Gallons" value={pickupExpected} Icon={FiPackage}/><Metric label="Collected Recorded" value={pickupActual} Icon={FiCheckCircle}/><Metric label="Trips Recorded" value={trips.length} Icon={FiTruck}/></div>
   <h2>Delivery Trips</h2>
   {trips.length?trips.slice().reverse().map(t=><article className="manager-control-panel" key={t.id}><div className="manager-control-order-head"><strong>{t.name||t.id}</strong><span className="manager-control-tag">{t.status||'Trip'}</span></div><p className="manager-control-help">{t.orders.length} linked stops · {t.orders.filter(o=>o.stage==='delivered').length} delivered · {t.orders.filter(o=>o.stage==='failed').length} with issues</p>{t.orders.map(o=><div className="manager-simple-triprow" key={o.id}><span>{o.customer} · {quantity(o)} gallons</span><strong>{STATUS[o.stage]||o.stage}</strong></div>)}</article>):<div className="manager-control-panel"><p className="manager-control-empty">No trips have been dispatched in this browser. Trips will appear here once Staff creates them.</p></div>}
   <h2>Customer Collection Results</h2>
   {pickups.length?pickups.map(o=><article className="manager-control-panel" key={o.id}><div className="manager-control-order-head"><strong>{o.customer} · {o.id}</strong><span className="manager-control-tag">{STATUS[o.stage]||o.stage}</span></div><p className="manager-control-help">{o.address||o.customerReference||'Address not recorded'}</p><div className="manager-control-compare"><div><span>Expected</span><strong>{quantity(o)}</strong></div><div><span>Collected recorded</span><strong>{o.collectedQty??'—'}</strong></div><div><span>Difference</span><strong>{o.collectedQty==null?'—':quantity(o)-Number(o.collectedQty)}</strong></div></div>{o.issueReason&&<p className="manager-control-reason">{o.issueReason}</p>}</article>):<p className="manager-control-empty">No collection tasks available in the current demo.</p>}
   <p className="manager-control-help">Results come from Staff records in this browser only. Proof photos stored in Staff IndexedDB are not displayed here; do not treat this summary as verified proof.</p>
  </>}
  {page==='staff'&&<>
   <div className="manager-control-title"><span>TEAM COORDINATION</span><h1>Staff Monitoring</h1><p>See unfinished work, completed tasks and recorded activity for each employee.</p></div>
   {people.length?people.map(name=><article className="manager-control-panel manager-simple-person" key={name}><div className="manager-control-order-head"><strong>{name}</strong><span className="manager-control-tag">{availability[name]?.onDuty===false?'Off Duty':availability[name]?.onBreak?'On Break':'Demo Staff'}</span></div>
    <div className="manager-simple-person-stats"><div><strong>{staffTasks(name).length}</strong><small>In progress</small></div><div><strong>{personEvents(name).filter(x=>x.action.includes('completed')).length}</strong><small>Completed actions</small></div><div><strong>{queue.filter(o=>o.stage==='failed'&&assigned(o)===name).length}</strong><small>Issues</small></div></div>
    <button className="manager-control-secondary" onClick={()=>setPerson(person===name?'':name)}>{person===name?'Hide Activity':'View Activity'} <FiArrowRight/></button>
    {person===name&&<div className="manager-simple-activity"><h3>Current Tasks</h3>{staffTasks(name).length?staffTasks(name).map(o=><p key={o.id}>{o.id} · {o.customer} · {STATUS[o.stage]||o.stage}</p>):<p>No currently recorded tasks.</p>}
    <h3>Completed & Recent Activity</h3>{personEvents(name).length?personEvents(name).map(e=><p key={e.id}><FiCheckCircle/> <span>{e.action} · {e.orderId} · {e.quantity} gallons<small>{e.at}</small></span></p>):<p>No recorded history for this employee.</p>}</div>}
   </article>):<p className="manager-control-empty">No staff records are available.</p>}
   <p className="manager-control-help">History is based on available order timestamps and actions, not a verified attendance or payroll report. No cross-device sync yet.</p>
  </>}
  {(selectedTask||confirmRefill)&&<div className="manager-simple-overlay" onClick={()=>{setStaffTask('');setConfirmRefill('')}} role="presentation"><section className="manager-simple-sheet" role="dialog" aria-modal="true" aria-label={confirmRefill?'Confirm refill completion':'Task details'} onClick={e=>e.stopPropagation()}>
   <div className="manager-control-order-head"><h2>{confirmRefill?'Complete This Refill?':'Task Details'}</h2><button className="manager-control-secondary" onClick={()=>{setStaffTask('');setConfirmRefill('')}}>Close</button></div>
   {confirmRefill?<>
    <p>Confirm that all gallons for <strong>{queue.find(x=>x.id===confirmRefill)?.customer}</strong> are physically refilled and sealed. This updates the order stage and records <strong>Manager</strong> as the refiller. Only Manager-claimed refills can be completed.</p>
    <p className="manager-control-help">This is a local demo update, not a server-authorized action.</p>
    <button className="manager-control-primary" onClick={finishRefill}>Confirm Refill Completed</button>
   </>:selectedTask&&<><p><strong>{selectedTask.id} · {selectedTask.customer}</strong></p><p>Status: {STATUS[selectedTask.stage]||selectedTask.stage}</p><p>Quantity: {quantity(selectedTask)} gallons</p><p>Assigned/Claimed: {assigned(selectedTask)}</p><p>{selectedTask.address||selectedTask.notes||'No additional details recorded.'}</p></>}
  </section></div>}
 </div>;
}
