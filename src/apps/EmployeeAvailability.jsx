import { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiCoffee, FiBriefcase, FiCalendar, FiUsers, FiAlertCircle } from 'react-icons/fi';

// Local demo state only. Real availability must come from authenticated staff records.
const KEY='aquabest-demo-employee-availability-v1';
const PEOPLE=['Owner','Manager','Staff A','Staff B','Driver A'];
const defaults=()=>Object.fromEntries(PEOPLE.map(name=>[name,{onDuty:true,onBreak:false,updatedAt:null,history:[]}]));
function read(){
 try {
  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  if(stored&&typeof stored==='object')return {...defaults(),...stored};
 }catch{/* demo storage may be disabled */}
 return defaults();
}
export function useEmployeeAvailability(){
 const [entries,setEntries]=useState(read);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(entries))}catch{/* storage optional */}},[entries]);
 useEffect(()=>{
  const onStorage=e=>{if(e.key===KEY)setEntries(read())};
  window.addEventListener('storage',onStorage);
  return ()=>window.removeEventListener('storage',onStorage);
 },[]);
 const update=(name,change)=>{
  if(!PEOPLE.includes(name))return;
  setEntries(old=>{
   const current=old[name]||{onDuty:true,onBreak:false,history:[]};
   const next={...current,...change};
   const event={id:Date.now(),time:new Date().toLocaleString('en-PH'),description:!next.onDuty?'Clocked out (demo)':!current.onDuty?'Clocked in (demo)':next.onBreak?'Started break':'Ended break'};
   next.updatedAt=event.time;
   next.history=[event,...(current.history||[])].slice(0,25);
   return {...old,[name]:next};
  });
 };
 return {entries,update};
}
export function availabilityFor(name,entries,orders){
 if(!PEOPLE.includes(name))return {label:'Not tracked yet',kind:'neutral',assignable:true,active:0,queued:0};
 const entry=entries[name]||{onDuty:true,onBreak:false};
 const assigned=orders.filter(o=>o.assigned===name&&!['Completed','Cancelled'].includes(o.status));
 const active=assigned.filter(o=>name.startsWith('Driver')?['Loaded','Out for Delivery'].includes(o.status):o.status==='Preparing').length;
 const queued=assigned.filter(o=>name.startsWith('Driver')?['Assigned','Ready for Dispatch'].includes(o.status):['Pending Confirmation','Confirmed','Ready'].includes(o.status)).length;
 if(!entry.onDuty)return {label:'Offline',kind:'neutral',assignable:false,active,queued};
 if(entry.onBreak)return {label:'On Break',kind:'break',assignable:false,active,queued};
 if(active>0)return {label:name.startsWith('Driver')?'On Delivery':'Busy',kind:'busy',assignable:!name.startsWith('Driver'),active,queued};
 return {label:'Available',kind:'available',assignable:true,active,queued};
}
export function AvailabilityPill({status}){
 return <span className={'availability-pill '+status.kind}><span className="availability-dot"/>{status.label}</span>;
}
export function MyWorkStatus({name,entries,orders,onUpdate}){
 const entry=entries[name]||{onDuty:true,onBreak:false,history:[]};
 const status=availabilityFor(name,entries,orders);
 return <section className="mgmt-card availability-card" aria-label="My work status">
  <div className="mgmt-section-title" style={{margin:'0 0 10px'}}><h2>My Work Status</h2><AvailabilityPill status={status}/></div>
  <p className="mgmt-sub">Busy is automatic while a refill is Preparing. Break and duty status are manual.</p>
  <div className="availability-actions">
   <button className="mgmt-btn secondary" onClick={()=>onUpdate(name,{onDuty:!entry.onDuty,onBreak:false})}>
    <FiClock/>{entry.onDuty?'Go Offline':'Go On Duty'}
   </button>
   <button className="mgmt-btn secondary" disabled={!entry.onDuty} onClick={()=>onUpdate(name,{onBreak:!entry.onBreak})}>
    <FiCoffee/>{entry.onBreak?'End Break':'Take Break'}
   </button>
   <button className="mgmt-btn secondary" disabled title="Scheduling will be implemented later"><FiCalendar/> My Schedule (Soon)</button>
  </div>
  <div className="availability-meta"><span><FiBriefcase/> {status.active} active · {status.queued} queued</span><span><FiClock/> Last manual change: {entry.updatedAt||'Not recorded'}</span></div>
  {entry.history?.length>0&&<details className="availability-history"><summary>Recent status changes</summary>{entry.history.slice(0,5).map(e=><div key={e.id+e.time} className="mgmt-sub">{e.time} · {e.description}</div>)}</details>}
 </section>;
}
export function TeamAvailability({entries,orders}){
 return <section className="mgmt-card" aria-label="Employee availability">
  <div className="mgmt-section-title" style={{margin:'0 0 6px'}}><h2><FiUsers/> Employee Availability</h2></div>
  <p className="mgmt-sub">Sample staff. Updates are local to this browser, not synced across employees' phones.</p>
  {PEOPLE.map(name=>{
   const status=availabilityFor(name,entries,orders);
   return <div className="mgmt-row" key={name}>
    <div><div className="mgmt-row-title">{name}</div><div className="mgmt-sub">{status.active} active · {status.queued} queued {status.queued>=3?'· High queue':''}</div></div>
    <AvailabilityPill status={status}/>
   </div>;
  })}
  <div className="availability-hint"><FiAlertCircle/> On Break / Offline staff cannot receive new assignments. Busy staff can be queued (soft limit: 3 waiting).</div>
  <p className="mgmt-sub" style={{margin:'8px 0 0'}}>Driver status is derived from demo trips; real shift scheduling and cross-device updates are coming later.</p>
 </section>;
}
