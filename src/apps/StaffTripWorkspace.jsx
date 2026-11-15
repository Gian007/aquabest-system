import { useEffect, useMemo, useState } from 'react';
import { FiCamera, FiClipboard, FiMapPin, FiTruck, FiWifiOff } from 'react-icons/fi';
import { formatMoney } from '../data/managerDemo.js';

const labelFor=o=>o.stage==='collectionClaimed'||o.stage==='collectionTransit'?'Collect':o.stage==='refilling'?'Refill':'Delivery';
const stageLabel=o=>o.stage==='out'?'Out for Delivery':o.stage==='delivery'?'Claimed — Ready to dispatch':o.stage==='collectionTransit'?'Return bottles to station':o.stage==='refilling'?'Refilling':'Ready to collect';
export default function StaffTripWorkspace({assigned,visibleAssigned,completed,trips,online,onDispatch,onComplete,onAction,onDetails,onCloseTrip,onIssue}){
 const [selected,setSelected]=useState([]);
 const [tab,setTab]=useState('active');
 const [tripDetails,setTripDetails]=useState(null);
 const allActiveTrips=trips.filter(t=>t.status!=='closed');
 const activeTrip=allActiveTrips[0];
 const tripOrders=activeTrip?[...assigned,...completed].filter(o=>o.tripId===activeTrip.id):[];
 const delivered=tripOrders.filter(o=>o.stage==='delivered');
 const waiting=tripOrders.filter(o=>o.stage==='out');
 const failed=tripOrders.filter(o=>o.stage==='failed');
 const available=visibleAssigned.filter(o=>o.stage==='delivery');
 const selectedValid=available.filter(o=>selected.includes(o.id));
 const otherTasks=visibleAssigned.filter(o=>o.stage!=='out');
 const completedOrders=completed.filter(o=>o.stage==='delivered'||o.stage==='picked');
 const visibleTrips=useMemo(()=>trips.slice().reverse(),[trips]);
 const availableKeys=available.map(o=>o.id).join('|');
 useEffect(()=>{setSelected(prev=>{const next=prev.filter(id=>availableKeys.split('|').includes(id));return next.length===prev.length?prev:next;});},[availableKeys]);
 return <div className="staffapp-trip-workspace">
  <div className="staffapp-trip-switch" role="group" aria-label="Task status">
   <button className={tab==='active'?'active':''} onClick={()=>setTab('active')}>Active ({assigned.length})</button>
   <button className={tab==='completed'?'active':''} onClick={()=>setTab('completed')}>Completed ({completedOrders.length})</button>
  </div>
  {tab==='active'?<>
   {activeTrip&&<section className="staffapp-trip-panel">
     <div className="staffapp-trip-head"><span><FiTruck/> ACTIVE DELIVERY TRIP</span><strong>{delivered.length}/{tripOrders.length} delivered</strong></div>
     <div className="staffapp-trip-meter"><span style={{width:(tripOrders.length?Math.round(100*delivered.length/tripOrders.length):0)+'%'}}/></div>
     <p>{waiting.length} remaining · {failed.length} issues · {online?'Network available':'No network detected'}</p>
     {!online&&<p className="staffapp-trip-offline"><FiWifiOff/> No network detected. This web demo saves delivery data on this device only; offline does not mean off duty.</p>}
     {waiting.map(o=><article className="staffapp-trip-stop" key={o.id}>
       <div><strong>{o.customer}</strong><small>{o.id} · {o.quantity||o.items?.reduce((n,i)=>n+i.quantity,0)} containers</small>{o.address&&<small><FiMapPin/> {o.address}</small>}</div>
       <button className="staffapp-primary" onClick={()=>onComplete(o.id)}><FiCamera/> Confirm Delivered</button><button className="staffapp-secondary" onClick={()=>onIssue(o.id)}>Report Issue</button>
     </article>)}
     <div className="staffapp-trip-actions"><button className="staffapp-secondary" onClick={()=>setTripDetails(activeTrip.id)}>Trip summary</button><button className="staffapp-primary" disabled={waiting.length>0||tripOrders.length===0} onClick={()=>onCloseTrip(activeTrip.id)}>Finish Trip</button></div>
    </section>}
   {available.length>0&&<section className="staffapp-dispatch-panel">
     <div className="staffapp-trip-head"><span><FiClipboard/> PREPARE DELIVERY</span><strong>{selectedValid.length} selected</strong></div>
     <p>Select several assigned deliveries, then dispatch them together. Each customer is confirmed separately afterward.</p>
     <div className="staffapp-dispatch-tools"><button onClick={()=>setSelected(available.map(o=>o.id))}>Select all ({available.length})</button><button onClick={()=>setSelected([])}>Clear selection</button></div>
     {available.map(o=><label className="staffapp-dispatch-item" key={o.id}><input type="checkbox" checked={selected.includes(o.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id))}/>
      <span><strong>{o.customer}</strong><small>{o.id} · {o.address||'No address provided'}</small></span></label>)}
     <button className="staffapp-primary staffapp-dispatch-submit" disabled={!selectedValid.length} onClick={()=>{if(window.confirm('Mark '+selectedValid.length+' selected orders Out for Delivery? You will confirm each handover individually.')){onDispatch(selectedValid.map(o=>o.id));setSelected([]);}}}><FiTruck/> Out for Delivery ({selectedValid.length})</button>
    </section>}
   <section className="staffapp-task-remaining">
    <h2>Other Assigned Tasks <small>{otherTasks.filter(o=>o.stage!=='delivery').length}</small></h2>
    {otherTasks.filter(o=>o.stage!=='delivery').map(o=><article key={o.id} className={'staffapp-task-mini staffapp-type-'+(labelFor(o)==='Collect'?'collection':labelFor(o)==='Refill'?'refill':'delivery')}>
      <div><span className="staffapp-mini-type">{labelFor(o)}</span><strong>{o.customer}</strong><small>{o.id} · {stageLabel(o)}</small></div>
      <div><button className="staffapp-secondary" onClick={()=>onDetails(o.id)}>Details</button>{onAction(o)}</div>
    </article>)}
    {!otherTasks.filter(o=>o.stage!=='delivery').length&&!available.length&&!activeTrip&&<p className="staffapp-muted">No assigned tasks. Claim new work in Queues.</p>}
   </section>
  </>:<>
   <section className="staffapp-task-remaining"><h2>Completed Orders</h2>
    {completedOrders.map(o=><article className="staffapp-task-mini" key={o.id}><div><strong>{o.customer}</strong><small>{o.id} · {o.stage==='delivered'?'Delivered':'Picked Up'} · {formatMoney(o.cashCollected||0)} cash</small><small>{o.proofStorage==='indexeddb'?'Proof saved on this device':'No saved proof'}</small></div><button className="staffapp-secondary" onClick={()=>onDetails(o.id)}>Details</button></article>)}
    {!completedOrders.length&&<p className="staffapp-muted">No completed tasks yet on this device.</p>}
   </section>
   <section className="staffapp-task-remaining"><h2>Trip History</h2>
    {visibleTrips.map(t=><button className="staffapp-trip-history" key={t.id} onClick={()=>setTripDetails(t.id)}><FiTruck/> {new Date(t.startedAt).toLocaleString('en-PH')} · {t.orderIds.length} stops · {t.status==='closed'?'Finished':'Active'}</button>)}
   </section>
  </>}
  {tripDetails&&<div className="staffapp-overlay" onClick={()=>setTripDetails(null)}><section className="staffapp-sheet staffapp-trip-summary" role="dialog" aria-modal="true" aria-label="Delivery trip summary" onClick={e=>e.stopPropagation()}>
   <div className="staffapp-sheet-head"><h2>Trip Summary</h2><button aria-label="Close summary" onClick={()=>setTripDetails(null)}>×</button></div>
   {(()=>{const trip=trips.find(t=>t.id===tripDetails),orders=[...assigned,...completed].filter(o=>o.tripId===tripDetails),total=orders.reduce((a,o)=>a+(o.stage==='delivered'?Number(o.cashCollected)||0:0),0);return trip?<><p className="staffapp-muted">{new Date(trip.startedAt).toLocaleString('en-PH')} · {trip.status==='closed'?'Finished':'Active'}</p>
    <div className="staffapp-trip-summary-stats"><div><b>{orders.filter(o=>o.stage==='delivered').length}</b><small>Delivered</small></div><div><b>{orders.filter(o=>o.stage==='out').length}</b><small>Pending</small></div><div><b>{orders.filter(o=>o.stage==='failed').length}</b><small>Issues</small></div></div>
    <p><strong>Cash collected: {formatMoney(total)}</strong></p><p>Proofs on device: {orders.filter(o=>o.proofStorage==='indexeddb').length}</p><p className="staffapp-muted">Remittance requires manager verification. No backend sync exists in this web demo.</p></>:null;})()}
   </section></div>}
 </div>;
}
