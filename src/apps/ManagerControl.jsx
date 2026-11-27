import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiArrowRight, FiCheckCircle, FiClipboard, FiFilter, FiPackage, FiSearch, FiTruck, FiUsers } from 'react-icons/fi';
import PesoIcon from '../components/PesoIcon.jsx';
import { formatMoney, orderSummary } from '../data/managerDemo.js';
import './managerControl.css';

// Manager-only frontend prototype. These records do not sync with Staff phones.
const BATCH_KEY='aquabest-manager-collection-batches-demo-v1';
const REMIT_KEY='aquabest-manager-remittances-demo-v1';
function readArray(key){
 try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}
 catch{return [];}
}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* optional demo storage */}}
const countGallons=o=>(o.items||[]).reduce((sum,i)=>sum+(Number(i.quantity)||0),0);
const active=o=>!['Completed','Cancelled','Delivered'].includes(o.status);
const isDelivery=o=>o.service!=='Walk-in';
const statusGroup=s=>s==='Pending Confirmation'?'Waiting':s==='Confirmed'||s==='Preparing'?'Refill':s==='Ready'?'Ready':s==='Out for Delivery'?'Delivery':s==='Delivered'||s==='Completed'?'Completed':s;
const timeLabel=()=>new Date().toLocaleString('en-PH');
const Field=({name,children})=><label className="manager-control-field"><span>{name}</span>{children}</label>;
const MiniMetric=({label,value,Icon,tone})=><div className={'manager-control-metric '+(tone||'')}><div className="manager-control-metric-top"><span>{label}</span><Icon/></div><strong>{value}</strong></div>;

export default function ManagerControl({page,go,orders,availability,onOpenOrder,onNotice}){
 const [batches,setBatches]=useState(()=>readArray(BATCH_KEY));
 const [remittances,setRemittances]=useState(()=>readArray(REMIT_KEY));
 const [query,setQuery]=useState('');
 const [kind,setKind]=useState('All');
 const [batchSelection,setBatchSelection]=useState([]);
 const [batchName,setBatchName]=useState('Morning Collection');
 const [editingBatch,setEditingBatch]=useState(null);
 const [actual,setActual]=useState('');
 const [reason,setReason]=useState('');
 const [remitSelection,setRemitSelection]=useState([]);
 const [remitWorker,setRemitWorker]=useState('Staff A');
 const [submitted,setSubmitted]=useState('');
 const [remitNote,setRemitNote]=useState('');
 const [error,setError]=useState('');
 useEffect(()=>{persist(BATCH_KEY,batches)},[batches]);
 useEffect(()=>{persist(REMIT_KEY,remittances)},[remittances]);
 const ordered=useMemo(()=>[...orders], [orders]);
 const inBatch=new Set(batches.flatMap(b=>b.orderIds));
 const batchCandidates=ordered.filter(o=>isDelivery(o)&&active(o)&&!inBatch.has(o.id));
 const selectedBatchOrders=batchCandidates.filter(o=>batchSelection.includes(o.id));
 const selectedGallons=selectedBatchOrders.reduce((n,o)=>n+countGallons(o),0);
 const unresolved=batches.filter(b=>b.status==='issue');
 const readyRemit=ordered.filter(o=>isDelivery(o)&&o.paymentStatus!=='Paid'&&o.status!=='Cancelled'&&!remittances.some(r=>r.orderIds.includes(o.id)));
 const remitOrders=readyRemit.filter(o=>remitSelection.includes(o.id));
 const remitExpected=remitOrders.reduce((n,o)=>n+(Number(o.amount)||0),0);
 const totalGallons=ordered.reduce((n,o)=>n+countGallons(o),0);
 const statusCounts=['Waiting','Refill','Ready','Delivery','Completed'].map(label=>({label,count:ordered.filter(o=>statusGroup(o.status)===label).length}));
 const filtered=ordered.filter(o=>(kind==='All'||statusGroup(o.status)===kind)&&[o.id,o.customer,o.customerReference,o.source,o.assigned,o.service].join(' ').toLowerCase().includes(query.toLowerCase()));
 const sumRemitted=remittances.reduce((n,r)=>n+r.submitted,0);
 const logBatch=()=>{
  setError('');
  const ids=selectedBatchOrders.map(o=>o.id);
  if(!ids.length){setError('Select at least one delivery or collection order.');return;}
  const name=batchName.trim();
  if(!name){setError('Enter a batch name.');return;}
  setBatches(prev=>[{id:'BATCH-'+Date.now(),name,orderIds:ids,expected:selectedGallons,actual:null,status:'pending',reason:'',date:timeLabel()},...prev]);
  setBatchSelection([]);onNotice('Collection batch saved in this browser only.');
 };
 const saveBatch=()=>{
  setError('');
  const value=Number(actual),item=batches.find(b=>b.id===editingBatch);
  if(!item)return;
  if(actual.trim()===''||!Number.isInteger(value)||value<0||value>item.expected){setError('Enter the actual collected gallons from 0 to the expected total.');return;}
  if(value!==item.expected&&!reason.trim()){setError('A reason is required when the collected quantity does not match.');return;}
  setBatches(prev=>prev.map(b=>b.id===item.id?{...b,actual:value,reason:reason.trim(),status:value===b.expected?'matched':'issue',checkedAt:timeLabel()}:b));
  setEditingBatch(null);setActual('');setReason('');onNotice('Batch quantity comparison recorded locally; staff proof not yet connected.');
 };
 const reviewBatch=id=>{const item=batches.find(b=>b.id===id);if(!item)return;setEditingBatch(id);setActual(item.actual===null?'':String(item.actual));setReason(item.reason||'');setError('');};
 const submitRemit=()=>{
  setError('');
  const amount=Number(submitted);
  if(!remitOrders.length){setError('Choose at least one COD order.');return;}
  if(submitted.trim()===''||!Number.isFinite(amount)||amount<0){setError('Enter the cash actually submitted.');return;}
  if(Math.abs(amount-remitExpected)>0.009&&!remitNote.trim()){setError('Explain the difference before recording the remittance.');return;}
  setRemittances(prev=>[{id:'REM-'+Date.now(),employee:remitWorker,orderIds:remitOrders.map(o=>o.id),expected:remitExpected,submitted:amount,note:remitNote.trim(),date:timeLabel(),status:Math.abs(amount-remitExpected)<0.01?'Matched':'Needs review'},...prev]);
  setRemitSelection([]);setSubmitted('');setRemitNote('');onNotice('Demo remittance recorded locally. No payment has been verified on a server.');
 };
 const renderOrders=(list,empty)=><div className="manager-control-list">{list.length?list.map(o=><article className="manager-control-order" key={o.id}>
    <div className="manager-control-order-head"><strong>{o.id} · {o.customer}</strong><span className={'manager-control-tag '+(statusGroup(o.status)==='Completed'?'ok':'')}>{o.status}</span></div>
    <p>{o.customerReference?o.customerReference+' · ':''}{o.source} · {o.service}</p>
    <p>{orderSummary(o.items)} · {countGallons(o)} gallons</p>
    <div className="manager-control-order-bottom"><small>{o.assigned||'Unassigned'} · {o.paymentStatus}</small><button onClick={()=>onOpenOrder(o)}>Review <FiArrowRight/></button></div>
   </article>):<p className="manager-control-empty">{empty}</p>}</div>;
 return <div className="manager-control">
  {page==='dashboard'&&<>
   <div className="manager-control-title"><span>MANAGER WORKSPACE</span><h1>Operations Overview</h1><p>Monitor batches, queues, people and cash. Staff may claim open tasks without approval.</p></div>
   <div className="manager-control-kpis">
    <MiniMetric label="Orders in queue" value={ordered.filter(active).length} Icon={FiClipboard}/>
    <MiniMetric label="Gallons in orders" value={totalGallons} Icon={FiPackage}/>
    <MiniMetric label="Collection issues" value={unresolved.length} Icon={FiAlertTriangle} tone={unresolved.length?'alert':''}/>
    <MiniMetric label="Remittance entries" value={remittances.length} Icon={PesoIcon}/>
   </div>
   <div className="manager-control-banner"><FiAlertTriangle/><span>Browser-only management demo. Staff orders, collection photos and remittances are <strong>not synced</strong> across devices.</span></div>
   <h2>Daily Operations</h2>
   <div className="manager-control-actions">
    <button onClick={()=>go('queue')}><FiClipboard/> Operations Queue <FiArrowRight/></button>
    <button onClick={()=>go('collections')}><FiTruck/> Collection Batches <FiArrowRight/></button>
    <button onClick={()=>go('remittance')}><PesoIcon/> Cash Remittance <FiArrowRight/></button>
    <button onClick={()=>go('staff')}><FiUsers/> Staff Monitoring <FiArrowRight/></button>
   </div>
   <div className="manager-control-sectionhead"><h2>Queue at a Glance</h2><button onClick={()=>go('queue')}>View queue <FiArrowRight/></button></div>
   <div className="manager-control-chips">{statusCounts.map(s=><button key={s.label} onClick={()=>{setKind(s.label);go('queue')}}><strong>{s.count}</strong><span>{s.label}</span></button>)}</div>
   <div className="manager-control-sectionhead"><h2>Needs Attention</h2><button onClick={()=>go('collections')}>View batches <FiArrowRight/></button></div>
   <div className="manager-control-panel">{unresolved.length?unresolved.map(b=><div className="manager-control-alertrow" key={b.id}><FiAlertTriangle/><div><strong>{b.name}</strong><small>{b.expected-b.actual} missing gallons · {b.reason}</small></div><button onClick={()=>go('collections')}>Review</button></div>):<p className="manager-control-empty">No recorded collection discrepancies in this browser.</p>}</div>
   <div className="manager-control-sectionhead"><h2>Recent Orders</h2><button onClick={()=>go('orders')}>All orders <FiArrowRight/></button></div>
   {renderOrders(ordered.slice(0,3),'No orders available.')}
  </>}
  {page==='queue'&&<>
   <div className="manager-control-title"><span>OPERATIONS</span><h1>Operations Queue</h1><p>All order stages and responsible staff in one view. Claims happen in the Staff workspace.</p></div>
   <div className="manager-control-search"><FiSearch/><input aria-label="Search queue" placeholder="Search order, customer, unit, staff…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <div className="manager-control-filter"><FiFilter/>{['All','Waiting','Refill','Ready','Delivery','Completed'].map(x=><button key={x} className={kind===x?'active':''} onClick={()=>setKind(x)}>{x}{x!=='All'?' ('+statusCounts.find(s=>s.label===x)?.count+')':''}</button>)}</div>
   {renderOrders(filtered,'No matching orders.')}
  </>}
  {page==='collections'&&<>
   <div className="manager-control-title"><span>CONTAINER CONTROL</span><h1>Collection Batches</h1><p>Compare expected gallons against physical pickups. Flag missing pickups for follow-up.</p></div>
   <div className="manager-control-kpis"><MiniMetric label="Open batches" value={batches.filter(b=>b.status==='pending').length} Icon={FiTruck}/><MiniMetric label="Need review" value={unresolved.length} Icon={FiAlertTriangle} tone={unresolved.length?'alert':''}/></div>
   <section className="manager-control-panel"><h2>Create a collection batch</h2><p className="manager-control-help">Demo workflow: select eligible orders below. No real pickup is dispatched to Staff.</p>
    <Field name="Batch name"><input value={batchName} onChange={e=>setBatchName(e.target.value)} placeholder="Morning Collection"/></Field>
    <div className="manager-control-checks">{batchCandidates.length?batchCandidates.map(o=><label key={o.id}><input type="checkbox" checked={batchSelection.includes(o.id)} onChange={e=>setBatchSelection(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id))}/><span><strong>{o.customer}</strong><small>{o.id} · {o.customerReference||o.service} · {countGallons(o)} gallons</small></span></label>):<p className="manager-control-help">No unbatched delivery orders are available in the current demo.</p>}</div>
    <div className="manager-control-totals"><span>Selected: {selectedBatchOrders.length} orders</span><strong>{selectedGallons} gallons expected</strong></div>
    <button className="manager-control-primary" disabled={!selectedBatchOrders.length} onClick={logBatch}>Create Demo Batch</button>
   </section>
   <h2>Batch Reconciliation</h2>
   {batches.length?batches.map(b=><article key={b.id} className="manager-control-panel manager-control-batch">
    <div className="manager-control-order-head"><strong>{b.name}</strong><span className={'manager-control-tag '+(b.status==='matched'?'ok':b.status==='issue'?'danger':'')}>{b.status==='pending'?'Awaiting count':b.status==='issue'?'Difference':'Matched'}</span></div>
    <small>{b.date} · {b.orderIds.length} orders</small>
    <div className="manager-control-compare"><div><span>Expected</span><strong>{b.expected}</strong></div><div><span>Collected</span><strong>{b.actual===null?'—':b.actual}</strong></div><div><span>Missing</span><strong>{b.actual===null?'—':b.expected-b.actual}</strong></div></div>
    {b.reason&&<p className="manager-control-reason"><FiAlertTriangle/> {b.reason}</p>}
    <p className="manager-control-help">Orders: {b.orderIds.join(', ')} · Photo evidence pending Staff integration</p>
    <button className="manager-control-secondary" onClick={()=>reviewBatch(b.id)}>{b.actual===null?'Record Actual Collection':'Review / Correct Count'}</button>
    {editingBatch===b.id&&<div className="manager-control-inlineform"><Field name="Actually collected gallons"><input type="number" inputMode="numeric" min="0" max={b.expected} value={actual} onChange={e=>setActual(e.target.value)}/></Field><Field name="Reason if any gallons are missing"><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Customer unavailable, inaccessible unit, damaged gallon…"/></Field>
     <div className="manager-control-rowbuttons"><button onClick={()=>{setEditingBatch(null);setError('')}}>Cancel</button><button className="manager-control-primary" onClick={saveBatch}>Save Count</button></div></div>}
   </article>):<div className="manager-control-panel manager-control-empty">No batches recorded yet. Select orders to create one.</div>}
  </>}
  {page==='remittance'&&<>
   <div className="manager-control-title"><span>MANAGER FINANCE</span><h1>Cash Remittance</h1><p>Reconcile expected COD from selected orders against cash actually submitted. Record discrepancies rather than silently marking orders paid.</p></div>
   <div className="manager-control-kpis"><MiniMetric label="Entries recorded" value={remittances.length} Icon={FiClipboard}/><MiniMetric label="Cash received (demo)" value={formatMoney(sumRemitted)} Icon={PesoIcon}/></div>
   <section className="manager-control-panel"><h2>Record a Remittance</h2><p className="manager-control-help">Unpaid delivery orders are possible COD candidates, not verified cash debts. Select only the orders covered by this submission.</p>
    <Field name="Submitting employee"><select value={remitWorker} onChange={e=>setRemitWorker(e.target.value)}>{Object.keys(availability).filter(x=>x!=='Owner'&&x!=='Manager').map(name=><option key={name}>{name}</option>)}</select></Field>
    <div className="manager-control-checks">{readyRemit.length?readyRemit.map(o=><label key={o.id}><input type="checkbox" checked={remitSelection.includes(o.id)} onChange={e=>setRemitSelection(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id))}/><span><strong>{o.id} · {o.customer}</strong><small>{o.assigned||'Unassigned'} · {formatMoney(o.amount)} possible COD</small></span></label>):<p className="manager-control-help">No unrecorded COD candidate orders.</p>}</div>
    <div className="manager-control-totals"><span>{remitOrders.length} selected orders</span><strong>Expected {formatMoney(remitExpected)}</strong></div>
    <Field name="Cash actually submitted (₱)"><input type="number" min="0" step="0.01" inputMode="decimal" value={submitted} onChange={e=>setSubmitted(e.target.value)} placeholder="0.00"/></Field>
    <Field name="Notes / discrepancy explanation"><textarea value={remitNote} onChange={e=>setRemitNote(e.target.value)} placeholder="Required when expected cash does not match"/></Field>
    <button className="manager-control-primary" disabled={!remitOrders.length} onClick={submitRemit}>Record Demo Remittance</button>
   </section>
   <h2>Reconciliation History</h2>
   {remittances.length?remittances.map(r=><article className="manager-control-panel manager-control-batch" key={r.id}>
    <div className="manager-control-order-head"><strong>{r.employee}</strong><span className={'manager-control-tag '+(r.status==='Matched'?'ok':'danger')}>{r.status}</span></div>
    <small>{r.date} · {r.orderIds.join(', ')}</small>
    <div className="manager-control-compare"><div><span>Expected</span><strong>{formatMoney(r.expected)}</strong></div><div><span>Submitted</span><strong>{formatMoney(r.submitted)}</strong></div><div><span>Difference</span><strong>{formatMoney(r.submitted-r.expected)}</strong></div></div>
    {r.note&&<p className="manager-control-reason">{r.note}</p>}
    <p className="manager-control-help">Browser demo entry only. This does not verify payment, settle orders, or update sales reports.</p>
   </article>):<div className="manager-control-panel manager-control-empty">No remittance entries recorded yet.</div>}
  </>}
  {error&&['collections','remittance'].includes(page)&&<p className="manager-control-error" role="alert">{error}</p>}
 </div>;
}
