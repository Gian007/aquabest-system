import { useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiArrowLeft, FiBell, FiCamera, FiCheck, FiCheckCircle, FiChevronDown, FiClipboard, FiDroplet, FiHome, FiLogOut, FiMapPin, FiPhone, FiSearch, FiShoppingCart, FiTruck, FiX } from 'react-icons/fi';
import logo from '../assets/AquaBest logo.png';
import './staffOperations.css';

// Isolated, browser-local demo adapter. Supabase and production business data are untouched.
// To share edits across phones later, replace only this adapter with an authorized API.
const STORE_KEY='aquabest-staff-operations-demo-v1';
const seed=[
 {id:'AB-1024',customer:'Juan Dela Cruz',phone:'0917 123 4567',source:'Phone',quantity:3,service:'Delivery',address:'Brgy. San Isidro',notes:'Call before arrival.',amount:120,stage:'pending',claimedBy:null,createdAt:'10:12 AM'},
 {id:'AB-1025',customer:'Maria Santos',phone:'0918 234 5678',source:'Messenger',quantity:5,service:'Pickup',address:'',notes:'Customer will collect at station.',amount:200,stage:'pending',claimedBy:null,createdAt:'10:18 AM'},
 {id:'AB-1026',customer:'Ana Cruz',phone:'0920 345 6789',source:'Walk-in',quantity:2,service:'Delivery',address:'Bagong Silang',notes:'Please ring the bell.',amount:80,stage:'ready',claimedBy:null,createdAt:'10:20 AM'},
 {id:'AB-1027',customer:'Ramon Garcia',phone:'',source:'Phone',quantity:3,service:'Delivery',address:'Fairview, QC',notes:'Leave at gate only after confirming customer.',amount:120,stage:'ready',claimedBy:null,createdAt:'10:21 AM'},
 {id:'AB-1028',customer:'Peter Reyes',phone:'',source:'Walk-in',quantity:2,service:'Pickup',address:'',notes:'Customer pickup.',amount:80,stage:'pickup',claimedBy:null,createdAt:'10:23 AM'}
];
const read=()=>{try{const value=JSON.parse(localStorage.getItem(STORE_KEY)||'null');return Array.isArray(value)?value:seed;}catch{return seed;}};
const labels={pending:'Pending Refill',refilling:'Refill Claimed',ready:'Ready for Delivery',pickup:'Ready for Pickup',delivery:'Delivery Claimed',out:'Out for Delivery',delivered:'Delivered',picked:'Picked Up',failed:'Delivery Issue'};
const now=()=>new Date().toLocaleString('en-PH');
export default function StaffOperations({onLogout}){
 const [orders,setOrders]=useState(read);
 const [page,setPage]=useState('home');
 const [tab,setTab]=useState('refill');
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState([]);
 const [detail,setDetail]=useState(null);
 const [notice,setNotice]=useState('');
 const [cash,setCash]=useState('');
 const [photo,setPhoto]=useState(null);
 const [remarks,setRemarks]=useState('');
 const [cameraOrder,setCameraOrder]=useState(null);
 const fileRef=useRef(null);
 useEffect(()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(orders));}catch{setNotice('Browser storage is unavailable; changes may not persist.');}},[orders]);
 const mine=orders.filter(o=>o.claimedBy==='staff'&&['refilling','delivery','out'].includes(o.stage));
 const pending=orders.filter(o=>o.stage==='pending');
 const ready=orders.filter(o=>o.stage==='ready');
 const pickup=orders.filter(o=>o.stage==='pickup');
 const count={refill:pending.length,delivery:ready.length,pickup:pickup.length};
 const show=(p)=>{setPage(p);setDetail(null);setNotice('');setSelected([]);window.scrollTo({top:0,behavior:'smooth'});};
 const update=(ids,change,message)=>{setOrders(prev=>prev.map(o=>ids.includes(o.id)?{...o,...change,updatedAt:now()}:o));setSelected([]);setDetail(null);if(message)setNotice(message);};
 const claimRefill=(id)=>update([id],{stage:'refilling',claimedBy:'staff',refillClaimedAt:now()},'Refill task added to My Tasks.');
 const completeRefill=(id)=>{const o=orders.find(v=>v.id===id);if(!o)return;update([id],{stage:o.service==='Pickup'?'pickup':'ready',claimedBy:null,refilledBy:'staff',refillCompletedAt:now()},'Refill completed. Order moved to '+(o.service==='Pickup'?'Pickup':'Delivery')+' queue.');};
 const claimDelivery=()=>{const valid=ready.filter(o=>selected.includes(o.id)).map(o=>o.id);if(!valid.length)return;update(valid,{stage:'delivery',claimedBy:'staff',deliveryClaimedAt:now()},valid.length+' delivery order(s) added to My Tasks.');show('tasks');};
 const completePickup=(id)=>{if(window.confirm('Confirm that the customer received this order?'))update([id],{stage:'picked',releasedBy:'staff',releasedAt:now()},'Pickup confirmed.');};
 const startDelivery=(id)=>update([id],{stage:'out',dispatchedAt:now()},'Order marked Out for Delivery.');
 const startProof=(id)=>{setCameraOrder(id);setCash('');setRemarks('');setPhoto(null);setDetail(id);};
 const saveDelivery=()=>{if(!cameraOrder||!photo){setNotice('A delivery photo is required before completion.');return;}const parsed=Number(cash);if(!cash.trim()||!Number.isFinite(parsed)||parsed<0){setNotice('Enter the actual COD cash collected (0 if none).');return;}update([cameraOrder],{stage:'delivered',deliveredBy:'staff',deliveredAt:now(),cashCollected:parsed,podRecorded:true,remittance:'Pending manager verification'},'Delivery recorded. Cash remittance still requires manager verification.');setCameraOrder(null);setPhoto(null);};
 const detailOrder=orders.find(o=>o.id===detail);
 const list=page==='tasks'?mine:page==='history'?orders.filter(o=>['delivered','picked','failed'].includes(o.stage)):page==='queue'?(tab==='refill'?pending:tab==='delivery'?ready:pickup):[];
 const filtered=useMemo(()=>list.filter(o=>(o.id+' '+o.customer+' '+o.address+' '+o.source).toLowerCase().includes(search.toLowerCase())).slice().sort((a,b)=>a.id.localeCompare(b.id)),[list,search]);
 const title=page==='home'?'Operations Dashboard':page==='queue'?'Operations Queue':page==='tasks'?'My Tasks':page==='history'?'Completed History':'Staff POS';
 const myRefill=mine.filter(o=>o.stage==='refilling').length,myDelivery=mine.filter(o=>o.stage==='delivery'||o.stage==='out').length;
 return <div className="staffapp">
  <header className="staffapp-header"><button className="staffapp-brand" onClick={()=>show('home')} aria-label="AquaBest home"><img src={logo} alt="AquaBest"/></button><span>Staff Operations</span><button className="staffapp-logout" onClick={onLogout} title="Log out" aria-label="Log out"><FiLogOut/></button></header>
  <main className="staffapp-main">
   <div className="staffapp-title"><div><h1>{title}</h1><p>Refill, delivery & customer pickup</p></div><span className="staffapp-demo">Demo • This device only</span></div>
   {notice&&<div className="staffapp-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notice"><FiX/></button></div>}
   {page==='home'&&<><div className="staffapp-stats">
    <button onClick={()=>{setTab('refill');show('queue')}}><FiDroplet/><b>{count.refill}</b><small>Pending Refill</small></button>
    <button onClick={()=>{setTab('delivery');show('queue')}}><FiTruck/><b>{count.delivery}</b><small>Ready Delivery</small></button>
    <button onClick={()=>{setTab('pickup');show('queue')}}><FiCheckCircle/><b>{count.pickup}</b><small>Ready Pickup</small></button>
    <button onClick={()=>show('tasks')}><FiClipboard/><b>{mine.length}</b><small>My Tasks</small></button>
   </div><section className="staffapp-panel"><h2>Available work</h2><p>Choose a queue to claim available orders. All claimed refills and deliveries appear in My Tasks.</p><div className="staffapp-quick"><button onClick={()=>{setTab('refill');show('queue')}}><FiDroplet/> Refill Queue</button><button onClick={()=>{setTab('delivery');show('queue')}}><FiTruck/> Delivery Queue</button><button onClick={()=>{setTab('pickup');show('queue')}}><FiCheckCircle/> Customer Pickup</button><button onClick={()=>show('tasks')}><FiClipboard/> My Tasks {mine.length>0&&<em>{mine.length}</em>}</button></div></section></>}
   {(page==='queue'||page==='tasks'||page==='history')&&<>
    {page==='queue'&&<div className="staffapp-tabs">{[['refill','Refill',FiDroplet],['delivery','Delivery',FiTruck],['pickup','Pickup',FiCheckCircle]].map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setSelected([]);setSearch('')}}><Icon/>{label}<span>{count[id]}</span></button>)}</div>}
    {page==='tasks'&&<div className="staffapp-tasks-summary"><span><FiDroplet/> {myRefill} Refill</span><span><FiTruck/> {myDelivery} Delivery</span><span>{mine.length} Active</span></div>}
    <label className="staffapp-search"><FiSearch/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, customer or address" aria-label="Search orders"/></label>
    <div className="staffapp-list">{filtered.length===0&&<div className="staffapp-empty"><FiCheckCircle/><strong>No matching orders</strong><p>Try another queue or search.</p></div>}
    {filtered.map(o=><article className="staffapp-order" key={o.id}>
      <div className="staffapp-order-top"><div className="staffapp-order-id">{page==='queue'&&tab==='delivery'&&<input type="checkbox" aria-label={'Select '+o.id} checked={selected.includes(o.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id))}/>}<strong>{o.id}</strong></div><span className={'staffapp-status '+o.stage}>{labels[o.stage]}</span></div>
      <div className="staffapp-order-person">{o.customer}</div><div className="staffapp-order-meta"><span><FiDroplet/> {o.quantity} × 5 Gallon</span><span>{o.service}</span><span>{o.createdAt}</span></div>
      {page==='tasks'&&<div className="staffapp-ownership">Claimed by you • {o.stage==='refilling'?'Refill':'Delivery'}</div>}
      <div className="staffapp-order-actions"><button className="staffapp-secondary" onClick={()=>setDetail(o.id)}>Details <FiChevronDown/></button>
      {page==='queue'&&tab==='refill'&&<button className="staffapp-primary" onClick={()=>claimRefill(o.id)}>Claim Refill</button>}
      {page==='queue'&&tab==='pickup'&&<button className="staffapp-primary" onClick={()=>completePickup(o.id)}>Confirm Pickup</button>}
      {page==='queue'&&tab==='delivery'&&<button className="staffapp-primary" onClick={()=>setSelected(p=>p.includes(o.id)?p.filter(id=>id!==o.id):[...p,o.id])}>{selected.includes(o.id)?'Unselect':'Select'}</button>}
      {page==='tasks'&&o.stage==='refilling'&&<button className="staffapp-primary" onClick={()=>completeRefill(o.id)}>Complete Refill</button>}
      {page==='tasks'&&o.stage==='delivery'&&<button className="staffapp-primary" onClick={()=>startDelivery(o.id)}>Out for Delivery</button>}
      {page==='tasks'&&o.stage==='out'&&<button className="staffapp-primary" onClick={()=>startProof(o.id)}><FiCamera/> Confirm Delivery</button>}
      </div>
     </article>)}</div>
    {page==='queue'&&tab==='delivery'&&selected.length>0&&<div className="staffapp-selection"><span><b>{selected.length}</b> selected <button onClick={()=>setSelected([])}>Clear</button></span><button onClick={claimDelivery}>Claim Selected ({selected.length})</button></div>}
   </>}
   {page==='pos'&&<section className="staffapp-panel"><h2>POS / Add Order</h2><p>The existing POS and backend are intentionally unchanged in this phase. Queue records here are demo samples only; a shared POS connection will be added in a later approved phase.</p><button className="staffapp-primary" onClick={()=>show('queue')}>Go to Queues</button></section>}
   <p className="staffapp-disclaimer">Frontend prototype only. Saved changes stay in this browser; they do not update GitHub, Supabase or other employees' phones. Demo account is not secure production authentication.</p>
  </main>
  <nav className="staffapp-bottom" aria-label="Staff navigation">{[['home','Home',FiHome],['queue','Queues',FiDroplet],['tasks','My Tasks',FiClipboard],['pos','POS',FiShoppingCart],['history','History',FiActivity]].map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>show(id)}><span className="staffapp-nav-icon"><Icon/>{id==='tasks'&&mine.length>0&&<em>{mine.length}</em>}</span><small>{label}</small></button>)}</nav>
  {detailOrder&&<div className="staffapp-overlay" onClick={()=>{setDetail(null);setCameraOrder(null);setPhoto(null)}}><section className="staffapp-sheet" role="dialog" aria-modal="true" aria-label="Order details" onClick={e=>e.stopPropagation()}>
   <div className="staffapp-sheet-head"><h2>{cameraOrder?'Confirm Delivery':detailOrder.id}</h2><button aria-label="Close" onClick={()=>{setDetail(null);setCameraOrder(null);setPhoto(null)}}><FiX/></button></div>
   <div className="staffapp-sheet-row"><b>Customer</b><span>{detailOrder.customer}</span></div>
   <div className="staffapp-sheet-row"><b>Contact</b><span>{detailOrder.phone||'Not provided'}</span></div>
   <div className="staffapp-sheet-row"><b>Quantity</b><span>{detailOrder.quantity} × 5 Gallon</span></div>
   <div className="staffapp-sheet-row"><b>Type</b><span>{detailOrder.service}</span></div>
   <div className="staffapp-sheet-row"><b>Source</b><span>{detailOrder.source}</span></div>
   <div className="staffapp-sheet-row"><b>Status</b><span>{labels[detailOrder.stage]}</span></div>
   {detailOrder.address&&<div className="staffapp-sheet-info"><FiMapPin/> {detailOrder.address}</div>}
   {detailOrder.notes&&<div className="staffapp-sheet-info">Notes: {detailOrder.notes}</div>}
   <div className="staffapp-sheet-row"><b>Payment (demo)</b><span>COD • ₱{detailOrder.amount}</span></div>
   {cameraOrder&&<div className="staffapp-proof"><h3>Proof of Delivery</h3><p>Take a picture of the delivered containers. Avoid faces and private details.</p><input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];setPhoto(f||null)}} aria-label="Take delivery photo"/>{photo&&<span className="staffapp-photo-ok"><FiCheck/> Photo selected: {photo.name}</span>}<label>COD cash collected (₱)<input type="number" min="0" step="0.01" value={cash} onChange={e=>setCash(e.target.value)} placeholder="Enter actual cash"/></label><label>Remarks (optional)<textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Delivery notes"/></label><p className="staffapp-disclaimer">Demo only: photo is required for this confirmation but image bytes are not uploaded or retained. Do not use this as production proof.</p><button className="staffapp-primary" onClick={saveDelivery} disabled={!photo}>Submit Delivery</button></div>}
  </section></div>}
 </div>;
}
