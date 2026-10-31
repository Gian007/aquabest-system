import { useEffect, useRef, useState } from 'react';
import { FiBell, FiCalendar, FiCheck, FiChevronDown, FiClock, FiCoffee, FiAlertCircle } from 'react-icons/fi';
import { availabilityFor } from './EmployeeAvailability.jsx';

// Shared across all management role views. No auth / server persistence in preview.
export default function ManagementHeaderActions({name,entries,orders,onUpdate,onNotifications}){
 const [open,setOpen]=useState(false);
 const wrapper=useRef(null);
 const entry=entries[name]||{onDuty:true,onBreak:false,history:[]};
 const status=availabilityFor(name,entries,orders);
 const label=status.label==='Available'?'Online':status.label;
 useEffect(()=>{
  if(!open)return undefined;
  const key=e=>{if(e.key==='Escape')setOpen(false)};
  const outside=e=>{if(wrapper.current&&!wrapper.current.contains(e.target))setOpen(false)};
  document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);
  return ()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside)};
 },[open]);
 const change=(action)=>{
  // Busy is computed from a live active task, not an editable status.
  if(action==='offline'){
   if(status.active>0&&!window.confirm('You have an active refill task. Go offline anyway? The task will remain unfinished.'))return;
   onUpdate(name,{onDuty:false,onBreak:false});
  }else if(action==='online')onUpdate(name,{onDuty:true,onBreak:false});
  else if(action==='break'){
   if(status.active>0&&!window.confirm('You have an active refill task. Start break anyway? The task will remain unfinished.'))return;
   onUpdate(name,{onBreak:true});
  }else if(action==='endBreak')onUpdate(name,{onBreak:false});
  setOpen(false);
 };
 return <div className="mgmt-header-actions">
  <div className="mgmt-status-holder" ref={wrapper}>
   <button type="button" className="mgmt-status-trigger" aria-expanded={open} aria-haspopup="true" onClick={()=>setOpen(v=>!v)}>
    <span className={'mgmt-status-dot '+status.kind}/><span className="mgmt-status-label">{label}</span><FiChevronDown size={13}/>
   </button>
   {open&&<div className="mgmt-status-popover" role="group" aria-label="Availability settings">
    <strong>My Availability</strong>
    <p className="mgmt-sub">Online means available for tasks. Busy updates automatically.</p>
    <button type="button" disabled={entry.onDuty&&!entry.onBreak} onClick={()=>change('online')}><FiCheck/> Go Online {entry.onDuty&&!entry.onBreak&&<span className="mgmt-status-current">Current</span>}</button>
    <button type="button" disabled={!entry.onDuty||entry.onBreak} onClick={()=>change('break')}><FiCoffee/> Start Break</button>
    {entry.onBreak&&<button type="button" onClick={()=>change('endBreak')}><FiCheck/> End Break</button>}
    <button type="button" disabled={!entry.onDuty} onClick={()=>change('offline')}><FiClock/> Go Offline</button>
    <button type="button" disabled className="mgmt-status-schedule"><FiCalendar/> My Schedule <small>Coming soon</small></button>
    <div className="mgmt-status-details"><FiAlertCircle/> {status.active} active · {status.queued} queued · Last status update: {entry.updatedAt||'No changes yet'}</div>
   </div>}
  </div>
  <button className="mgmt-icobtn" aria-label="Notifications" title="Notifications" onClick={onNotifications}><FiBell/></button>
 </div>;
}
