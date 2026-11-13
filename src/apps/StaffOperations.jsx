import { useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiArrowLeft, FiBell, FiCamera, FiCheck, FiCheckCircle, FiChevronDown, FiClipboard, FiDroplet, FiHome, FiLogOut, FiMapPin, FiPhone, FiSearch, FiShoppingCart, FiTruck, FiX, FiSettings, FiMenu, FiArrowUp, FiArrowDown, FiPlus, FiPackage } from 'react-icons/fi';
import logo from '../assets/AquaBest logo.png';
import ManagementHeaderActions from './ManagementHeaderActions.jsx';
import { useEmployeeAvailability } from './EmployeeAvailability.jsx';
import StaffPOS, { initialStaffSale } from './StaffPOS.jsx';
import { DEMO_PRICES, DEMO_PRODUCTS, formatMoney } from '../data/managerDemo.js';
import './managementWeb.css';
import './staffOperations.css';

// Isolated, browser-local demo adapter. Supabase and production business data are untouched.
// To share edits across phones later, replace only this adapter with an authorized API.
const STORE_KEY='aquabest-staff-operations-demo-v1';
const SETTINGS_KEY='aquabest-staff-dashboard-settings-v1';
const widgetCatalog=[
 {id:'active',label:'Active Task Pin'},
 {id:'quick',label:'Quick Walk-in POS'},
 {id:'urgent',label:'Urgent Queue Preview'},
 {id:'shift',label:'Shift & Stock Snapshot'}
];
const defaultSettings={
 widgets:[{id:'active',enabled:true},{id:'quick',enabled:true},{id:'urgent',enabled:true},{id:'shift',enabled:false}],
 previewCount:2,
 shortcuts:[{id:'round5',label:'Round Refill',quantity:1},{id:'slim5',label:'Slim Refill',quantity:1},{id:'slim25',label:'2.5 Gal Slim',quantity:1}]
};
const readSettings=()=>{try{
 const found=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');
 if(!found)return defaultSettings;
 return {...defaultSettings,...found,widgets:widgetCatalog.map(w=>found.widgets?.find(v=>v.id===w.id)||defaultSettings.widgets.find(v=>v.id===w.id)),shortcuts:Array.isArray(found.shortcuts)?found.shortcuts.filter(v=>DEMO_PRODUCTS.some(p=>p.id===v.id)).slice(0,4):defaultSettings.shortcuts};
}catch{return defaultSettings;}};
const elapsed=(o,clock)=>{const entered=o.createdAtISO?new Date(o.createdAtISO):new Date();
 if(!o.createdAtISO&&o.createdAt){const m=o.createdAt.match(/(\\d+):(\\d+)\\s*(AM|PM)/i);if(m){entered.setHours(Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0),Number(m[2]),0,0);}}
 const mins=Math.max(0,Math.floor((clock-entered.getTime())/60000));return {mins,label:mins<60?mins+'m ago':Math.floor(mins/60)+'h '+(mins%60)+'m ago'};};
const orderItems=o=>(o.items?.length?o.items:[{sizeId:'round5',quantity:o.quantity||1}]).map(item=>{const p=DEMO_PRODUCTS.find(x=>x.id===item.sizeId);return item.quantity+' × '+(p?.label==='2.5 Gallons'?'2.5 Gal':'5 Gal')+' ('+(p?.shape?.startsWith('Round')?'Round':'Slim')+')';}).join(' · ');
const badgeText=o=>o.paymentStatus==='Paid'?'Paid • '+(o.service==='Pickup'?'Pickup':o.address||'Delivery'):(o.paymentMethod==='GCash'?'GCash pending':'COD')+' • '+(o.service==='Pickup'?'Pickup':o.address||'Delivery');

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
 const [settings,setSettings]=useState(readSettings);
 const [sale,setSale]=useState(initialStaffSale);
 const [clock,setClock]=useState(Date.now());
 const [dragging,setDragging]=useState(null);
 const {entries:availability,update:updateAvailability}=useEmployeeAvailability();
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
 const touchStart=useRef(null);
 useEffect(()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(orders));}catch{setNotice('Browser storage is unavailable; changes may not persist.');}},[orders]);
 useEffect(()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{/* Local demo preferences only */}},[settings]);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),60000);return ()=>clearInterval(id);},[]);
 const setWidget=(id,enabled)=>setSettings(prev=>({...prev,widgets:prev.widgets.map(w=>w.id===id?{...w,enabled}:w)}));
 const moveWidget=(id,delta)=>setSettings(prev=>{const list=[...prev.widgets],i=list.findIndex(w=>w.id===id),j=i+delta;if(i<0||j<0||j>=list.length)return prev;[list[i],list[j]]=[list[j],list[i]];return {...prev,widgets:list};});
 const reorderWidget=(from,to)=>setSettings(prev=>{const list=[...prev.widgets],a=list.findIndex(w=>w.id===from),b=list.findIndex(w=>w.id===to);if(a<0||b<0)return prev;const [item]=list.splice(a,1);list.splice(b,0,item);return {...prev,widgets:list};});
 const setShortcut=(index,key,value)=>setSettings(prev=>({...prev,shortcuts:prev.shortcuts.map((item,i)=>i===index?{...item,[key]:value}:item)}));
 const addQuick=(item)=>{setSale(prev=>({...prev,source:'Walk-in',service:'Walk-in',quantities:{...prev.quantities,[item.id]:Math.min(99,(prev.quantities[item.id]||0)+Number(item.quantity||1))}}));setNotice(item.label+' added to POS draft.');};
 const saveSale=()=>{const entries=Object.entries(sale.quantities).filter(([,q])=>q>0);if(!entries.length)return;
 const id='DEMO-'+String(Date.now());
 const service=sale.service==='Walk-in'?'Pickup':'Delivery';
 const createdAtISO=new Date().toISOString();
 const itemList=entries.map(([sizeId,quantity])=>({sizeId,quantity}));
 const amount=entries.reduce((sum,[id,q])=>sum+q*(DEMO_PRICES[id]||0),0);
 setOrders(prev=>[{id,customer:sale.customer.trim()||'Walk-in Customer',phone:'',source:sale.source,items:itemList,quantity:entries.reduce((sum,[,q])=>sum+q,0),service,address:'',notes:sale.notes,amount,stage:'pending',claimedBy:null,createdAtISO,createdAt:new Date().toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'}),paymentMethod:sale.paymentMethod,paymentStatus:sale.paymentStatus,ownership:sale.ownership,reference:sale.reference},...prev]);
 setSale(initialStaffSale());setTab('refill');show('queue');setNotice(id+' saved to Refill Queue (this browser only).');
 };

 const mine=orders.filter(o=>o.claimedBy==='staff'&&['refilling','delivery','out'].includes(o.stage));
 const pending=orders.filter(o=>o.stage==='pending');
 const ready=orders.filter(o=>o.stage==='ready');
 const pickup=orders.filter(o=>o.stage==='pickup');
 const count={refill:pending.length,delivery:ready.length,pickup:pickup.length};
 const show=(p)=>{setPage(p);setDetail(null);setNotice('');setSelected([]);window.scrollTo({top:0,behavior:'smooth'});};
 const update=(ids,change,message)=>{setOrders(prev=>prev.map(o=>ids.includes(o.id)?{...o,...change,updatedAt:now()}:o));setSelected([]);setDetail(null);if(message)setNotice(message);};
 const claimRefill=(id)=>update([id],{stage:'refilling',claimedBy:'staff',refillClaimedAt:now()},'Refill task added to My Tasks.');
 const completeRefill=(id)=>{const o=orders.find(v=>v.id===id);if(!o)return;update([id],{stage:o.service==='Pickup'?'pickup':'ready',claimedBy:null,refilledBy:'staff',refillCompletedAt:now()},'Refill completed. Order moved to '+(o.service==='Pickup'?'Pickup':'Delivery')+' queue.');};
 const claimDelivery=()=>{const valid=ready.filter(o=>selected.includes(o.id)).map(o=>o.id);if(!valid.length)return;update(valid,{stage:'delivery',claimedBy:'staff',deliveryClaimedAt:now()});show('tasks');setNotice(valid.length+' delivery order(s) added to My Tasks.');};
 const completePickup=(id)=>{if(window.confirm('Confirm that the customer received this order?'))update([id],{stage:'picked',releasedBy:'staff',releasedAt:now()},'Pickup confirmed.');};
 const startDelivery=(id)=>update([id],{stage:'out',dispatchedAt:now()},'Order marked Out for Delivery.');
 const startProof=(id)=>{setCameraOrder(id);setCash('');setRemarks('');setPhoto(null);setDetail(id);};
 const saveDelivery=()=>{if(!cameraOrder||!photo){setNotice('A delivery photo is required before completion.');return;}const parsed=Number(cash);if(!cash.trim()||!Number.isFinite(parsed)||parsed<0){setNotice('Enter the actual COD cash collected (0 if none).');return;}update([cameraOrder],{stage:'delivered',deliveredBy:'staff',deliveredAt:now(),cashCollected:parsed,podRecorded:true,remittance:'Pending manager verification'},'Delivery recorded. Cash remittance still requires manager verification.');setCameraOrder(null);setPhoto(null);};
 const detailOrder=orders.find(o=>o.id===detail);
 const list=page==='tasks'?mine:page==='history'?orders.filter(o=>['delivered','picked','failed'].includes(o.stage)):page==='queue'?(tab==='refill'?pending:tab==='delivery'?ready:pickup):[];
 const filtered=useMemo(()=>list.filter(o=>(o.id+' '+o.customer+' '+o.address+' '+o.source).toLowerCase().includes(search.toLowerCase())).slice().sort((a,b)=>elapsed(b,clock).mins-elapsed(a,clock).mins),[list,search,clock]);
 const title=({home:'Operations Dashboard',queue:'Operations Queue',tasks:'My Tasks',history:'Completed History',pos:'New POS Sale',more:'More',settings:'Customize Dashboard',notifications:'Notifications'})[page]||'Operations';
 const myRefill=mine.filter(o=>o.stage==='refilling').length,myDelivery=mine.filter(o=>o.stage==='delivery'||o.stage==='out').length;
 return <div className="staffapp">
  <header className="mgmt-header staffapp-shared-header"><div className="mgmt-header-inner">
    <button className="mgmt-brand mgmt-brand-button" aria-label="AquaBest — Go to Dashboard" onClick={()=>show('home')}><img src={logo} alt="AquaBest"/><span className="mgmt-brand-label"><small>Management System</small><strong>Staff Operations</strong></span></button>
    <div className="mgmt-header-end"><ManagementHeaderActions name="Staff A" entries={availability} orders={mine.map(o=>({id:o.id,assigned:'Staff A',status:o.stage==='refilling'?'Preparing':'Out for Delivery'}))} onUpdate={updateAvailability} onNotifications={()=>show('notifications')}/>
     <button className="mgmt-header-logout" onClick={onLogout} aria-label="Log out of business workspace" title="Log out of business workspace"><FiLogOut aria-hidden="true"/><span>Log Out</span></button>
    </div>
   </div></header>
  <main className="staffapp-main">
   <div className="staffapp-title"><div><h1>{title}</h1><p>Refill, delivery & customer pickup</p></div><span className="staffapp-demo">Demo • This device only</span></div>
   {notice&&<div className="staffapp-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notice"><FiX/></button></div>}
   {page==='home'&&<>
    <div className="staffapp-stats">
     <button onClick={()=>{setTab('refill');show('queue')}}><FiDroplet/><b>{count.refill}</b><small>Pending Refill</small></button>
     <button onClick={()=>{setTab('delivery');show('queue')}}><FiTruck/><b>{count.delivery}</b><small>Ready Delivery</small></button>
     <button onClick={()=>{setTab('pickup');show('queue')}}><FiCheckCircle/><b>{count.pickup}</b><small>Ready Pickup</small></button>
     <button onClick={()=>show('tasks')}><FiClipboard/><b>{mine.length}</b><small>My Tasks</small></button>
    </div>
    <div className="staffapp-widget-heading"><h2>My Dashboard</h2><button onClick={()=>show('settings')} aria-label="Customize Dashboard"><FiSettings/> Customize</button></div>
    <div className="staffapp-widgets">{settings.widgets.filter(w=>w.enabled&&(w.id!=='active'||mine.length>0)).map(w=>
     w.id==='active'?<section className="staffapp-panel staffapp-widget" key={w.id}><h2><FiClipboard/> Continue My Tasks <span className="staffapp-widget-count">{mine.length}</span></h2><p>{myRefill} refill • {myDelivery} delivery tasks waiting for you</p><button className="staffapp-primary" onClick={()=>show('tasks')}>Open My Tasks</button></section>
     :w.id==='quick'?<section className="staffapp-panel staffapp-widget" key={w.id}><h2><FiShoppingCart/> Quick Walk-in POS</h2><p>Tap to add items to your current POS draft.</p><div className="staffapp-quick-pos">{settings.shortcuts.map((item,i)=><button key={i} onClick={()=>addQuick(item)}><FiPlus/> {item.label||DEMO_PRODUCTS.find(p=>p.id===item.id)?.label} <small>{formatMoney(DEMO_PRICES[item.id])} × {item.quantity}</small></button>)}</div><div className="staffapp-widget-footer"><small>{Object.values(sale.quantities).reduce((a,b)=>a+b,0)} item(s) in draft</small><button className="staffapp-primary" onClick={()=>show('pos')}>Review POS</button></div></section>
     :w.id==='urgent'?<section className="staffapp-panel staffapp-widget" key={w.id}><h2><FiBell/> Next Up · Oldest Orders</h2><p>Oldest unclaimed refill or delivery orders. Not automatically marked urgent.</p>{[...pending,...ready].sort((a,b)=>elapsed(b,clock).mins-elapsed(a,clock).mins).slice(0,settings.previewCount).map(o=><div className="staffapp-next-row" key={o.id}><div><strong>{o.id} · {o.customer}</strong><small>{orderItems(o)} • {elapsed(o,clock).label}</small></div><button onClick={()=>o.stage==='pending'?claimRefill(o.id):(setSelected([o.id]),setTab('delivery'),show('queue'))}>{o.stage==='pending'?'Claim Refill':'View Delivery'}</button></div>)}</section>
     :<section className="staffapp-panel staffapp-widget" key={w.id}><h2><FiPackage/> Shift & Stock Snapshot</h2><p>On-duty status: {availability['Staff A']?.onDuty===false?'Offline':'Online'} • Claimed tasks: {mine.length}</p><p>Stock quantities are not connected to staff demo data. View inventory through a future authorized integration.</p></section>
    )}</div>
   </>
   {(page==='queue'||page==='tasks'||page==='history')&&<>
    {page==='queue'&&<div className="staffapp-tabs">{[['refill','Refill',FiDroplet],['delivery','Delivery',FiTruck],['pickup','Pickup',FiCheckCircle]].map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setSelected([]);setSearch('')}}><Icon/>{label}<span>{count[id]}</span></button>)}</div>}
    {page==='tasks'&&<div className="staffapp-tasks-summary"><span><FiDroplet/> {myRefill} Refill</span><span><FiTruck/> {myDelivery} Delivery</span><span>{mine.length} Active</span></div>}
    <label className="staffapp-search"><FiSearch/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, customer or address" aria-label="Search orders"/></label>
    <div className="staffapp-list">{filtered.length===0&&<div className="staffapp-empty"><FiCheckCircle/><strong>No matching orders</strong><p>Try another queue or search.</p></div>}
    {filtered.map(o=><article className="staffapp-order" key={o.id} onTouchStart={page==='queue'&&tab==='delivery'?e=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY,id:o.id};}:undefined} onTouchEnd={page==='queue'&&tab==='delivery'?e=>{const start=touchStart.current;if(!start||start.id!==o.id)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;touchStart.current=null;if(dx>90&&Math.abs(dx)>Math.abs(dy)*1.5)setSelected(prev=>prev.includes(o.id)?prev:[...prev,o.id]);}:undefined}>
      <div className="staffapp-order-top"><div className="staffapp-order-id">{page==='queue'&&tab==='delivery'&&<input type="checkbox" aria-label={'Select '+o.id} checked={selected.includes(o.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id))}/>}<strong>{o.id}</strong></div><span className="staffapp-payment-badge">{badgeText(o)}</span></div>
      <div className="staffapp-order-person">{o.customer}</div><div className="staffapp-order-meta"><span><FiDroplet/> {orderItems(o)}</span><span>{o.service}</span><span className={elapsed(o,clock).mins>15?'staffapp-overdue':''}>{o.createdAt} • {elapsed(o,clock).label}</span></div>
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
   {page==='pos'&&<StaffPOS sale={sale} onChange={setSale} onSave={saveSale} onClear={()=>setSale(initialStaffSale())}/>}
   {page==='more'&&<div className="staffapp-more">
     <button onClick={()=>show('settings')}><FiSettings/> <span><strong>Customize Dashboard</strong><small>Widgets and Quick POS items</small></span></button>
     <button onClick={()=>show('history')}><FiActivity/> <span><strong>Completed History</strong><small>Pickup and delivery records</small></span></button>
     <button onClick={()=>show('notifications')}><FiBell/> <span><strong>Notifications</strong><small>Demo announcements</small></span></button>
     <button onClick={onLogout}><FiLogOut/> <span><strong>Log Out</strong><small>Exit business workspace</small></span></button>
   </div>}
   {page==='notifications'&&<section className="staffapp-panel"><h2>Notifications</h2><p>Shared live notifications aren't connected yet. My Tasks badge counts locally claimed active tasks.</p></section>}
   {page==='settings'&&<div className="staffapp-customize">
     <section className="staffapp-panel"><h2>Home Screen Widgets</h2><p>Turn widgets on or off. Drag on desktop, or use arrows to reorder on mobile. Active tasks stay above other widgets when enabled.</p>
      {settings.widgets.map((w,i)=><div key={w.id} className="staffapp-setting-row" draggable onDragStart={()=>setDragging(w.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragging)reorderWidget(dragging,w.id);setDragging(null);}} onDragEnd={()=>setDragging(null)}>
       <label><input type="checkbox" checked={w.enabled} onChange={e=>setWidget(w.id,e.target.checked)}/><span>{widgetCatalog.find(v=>v.id===w.id).label}</span></label>
       <div><button aria-label={'Move '+w.id+' up'} disabled={i===0} onClick={()=>moveWidget(w.id,-1)}><FiArrowUp/></button><button aria-label={'Move '+w.id+' down'} disabled={i===settings.widgets.length-1} onClick={()=>moveWidget(w.id,1)}><FiArrowDown/></button></div>
      </div>)}
      <label className="staffapp-setting-select">Queue preview count <select value={settings.previewCount} onChange={e=>setSettings(prev=>({...prev,previewCount:Number(e.target.value)}))}><option value={2}>Top 2</option><option value={3}>Top 3</option></select></label>
     </section>
     <section className="staffapp-panel"><h2>Manage Quick-Tap Items</h2><p>Choose from the original POS catalog. Prices follow the existing demo catalog and cannot be edited independently here.</p>
      {settings.shortcuts.map((item,i)=><div className="staffapp-shortcut-row" key={i}>
       <strong>Slot {i+1}</strong><select aria-label={'Product for slot '+(i+1)} value={item.id} onChange={e=>setShortcut(i,'id',e.target.value)}>{DEMO_PRODUCTS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.shape} ({formatMoney(DEMO_PRICES[p.id])})</option>)}</select>
       <input aria-label={'Short label '+(i+1)} maxLength={20} value={item.label} onChange={e=>setShortcut(i,'label',e.target.value)} placeholder="Short button label"/>
       <label>Default qty <input type="number" min="1" max="20" value={item.quantity} onChange={e=>setShortcut(i,'quantity',Math.max(1,Math.min(20,Number(e.target.value)||1)))}/></label>
       <button className="staffapp-remove-slot" onClick={()=>setSettings(prev=>({...prev,shortcuts:prev.shortcuts.filter((_,j)=>j!==i)}))}>Remove</button>
      </div>)}
      {settings.shortcuts.length<4&&<button className="staffapp-secondary" onClick={()=>setSettings(prev=>({...prev,shortcuts:[...prev.shortcuts,{id:DEMO_PRODUCTS[0].id,label:DEMO_PRODUCTS[0].label,quantity:1}]}))}><FiPlus/> Add Slot</button>}
     </section>
    </div>}
   <p className="staffapp-disclaimer">Frontend prototype only. Saved changes stay in this browser; they do not update GitHub, Supabase or other employees' phones. Demo account is not secure production authentication.</p>
  </main>
  <nav className="staffapp-bottom" aria-label="Staff navigation">{[['home','Home',FiHome],['queue','Queues',FiDroplet],['tasks','My Tasks',FiClipboard],['pos','POS',FiShoppingCart],['more','More',FiMenu]].map(([id,label,Icon])=><button key={id} className={page===id||(id==='more'&&['settings','history','notifications'].includes(page))?'active':''} onClick={()=>show(id)}><span className="staffapp-nav-icon"><Icon/>{id==='tasks'&&mine.length>0&&<em>{mine.length}</em>}</span><small>{label}</small></button>)}</nav>
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
