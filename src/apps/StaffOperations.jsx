import { useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiArrowLeft, FiBell, FiCamera, FiCheck, FiCheckCircle, FiChevronDown, FiClipboard, FiDroplet, FiHome, FiLogOut, FiMapPin, FiPhone, FiSearch, FiShoppingCart, FiTruck, FiX, FiSettings, FiMenu, FiArrowUp, FiArrowDown, FiPlus, FiPackage, FiArrowRight, FiTarget, FiFilter, FiTrash2, FiList, FiSliders, FiEye, FiCheckSquare } from 'react-icons/fi';
import logo from '../assets/AquaBest logo.png';
import ManagementHeaderActions from './ManagementHeaderActions.jsx';
import { useEmployeeAvailability } from './EmployeeAvailability.jsx';
import StaffPOS, { initialStaffSale } from './StaffPOS.jsx';
import { bottleOptions } from './Component_Customer/orderData.js';
import { DEMO_PRICES, DEMO_PRODUCTS, formatMoney } from '../data/managerDemo.js';
import './managementWeb.css';
import './staffOperations.css';

// Isolated, browser-local demo adapter. Supabase and production business data are untouched.
// To share edits across phones later, replace only this adapter with an authorized API.
const STORE_KEY='aquabest-staff-operations-demo-v1';
const SETTINGS_KEY='aquabest-staff-dashboard-settings-v1';
const NOTIFICATIONS_KEY='aquabest-staff-notifications-demo-v1';
const NOTIFICATION_PREFS_KEY='aquabest-staff-notification-prefs-v1';
const notificationTypes=[{id:'orders',label:'New orders and queue changes'},{id:'collection',label:'Collection updates'},{id:'refill',label:'Refill updates'},{id:'delivery',label:'Delivery and pickup updates'}];
const notificationType=message=>/collect|container.*station/i.test(message)?'collection':/refill/i.test(message)?'refill':/deliver|pickup|remittance/i.test(message)?'delivery':'orders';
const readNotificationPrefs=()=>{try{return {...{orders:true,collection:true,refill:true,delivery:true},...JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY)||'{}')};}catch{return {orders:true,collection:true,refill:true,delivery:true};}};
const compactCount=n=>n>99?'99+':String(n);
const readNotifications=()=>{try{const n=JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)||'[]');return Array.isArray(n)?n:[];}catch{return [];}};
const widgetCatalog=[
 {id:'active',label:'Active Task Pin'},
 {id:'quick',label:'Quick Walk-in POS'},
 {id:'urgent',label:'Urgent Queue Preview'},
 {id:'shift',label:'Shift & Stock Snapshot'}
];
const defaultSettings={
 widgets:[{id:'active',enabled:true},{id:'quick',enabled:true},{id:'urgent',enabled:true},{id:'shift',enabled:false}],
 previewCount:2,
 dailyTarget:40, // Editable example target, not live shift data.
 shortcuts:[{id:'round5',label:'Round Refill',quantity:1},{id:'slim5',label:'Slim Refill',quantity:1},{id:'slim25',label:'2.5 Gal Slim',quantity:1},{id:'round5',label:'Round ×2',quantity:2}]
};
const readSettings=()=>{try{
 const found=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');
 if(!found)return defaultSettings;
 return {...defaultSettings,...found,widgets:[...(Array.isArray(found.widgets)?found.widgets.filter(v=>widgetCatalog.some(w=>w.id===v.id)):[]),...defaultSettings.widgets.filter(v=>!found.widgets?.some(w=>w.id===v.id))],shortcuts:Array.isArray(found.shortcuts)?found.shortcuts.filter(v=>DEMO_PRODUCTS.some(p=>p.id===v.id)).slice(0,4):defaultSettings.shortcuts};
}catch{return defaultSettings;}};
const elapsed=(o,clock)=>{const entered=o.createdAtISO?new Date(o.createdAtISO):new Date();
 if(!o.createdAtISO&&o.createdAt){const m=o.createdAt.match(/(\d+):(\d+)\s*(AM|PM)/i);if(m){entered.setHours(Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0),Number(m[2]),0,0);}}
 const mins=Math.max(0,Math.floor((clock-entered.getTime())/60000));return {mins,label:mins<60?mins+'m ago':Math.floor(mins/60)+'h '+(mins%60)+'m ago'};};
const orderItems=o=>(o.items?.length?o.items:[{sizeId:'round5',quantity:o.quantity||1}]).map(item=>{const p=DEMO_PRODUCTS.find(x=>x.id===item.sizeId);return item.quantity+' × '+(p?.label==='2.5 Gallons'?'2.5 Gal':'5 Gal')+' ('+(p?.shape?.startsWith('Round')?'Round':'Slim')+')';}).join(' · ');
const quickProductImage=id=>bottleOptions.find(p=>p.id===id)?.image;
const activeType=o=>['collectionClaimed','collectionTransit'].includes(o.stage)?'collection':o.stage==='refilling'?'refill':['delivery','out'].includes(o.stage)?'delivery':'pickup';
const activeTypeLabel=o=>activeType(o)==='collection'?'Collect':activeType(o)==='refill'?'Refill':activeType(o)==='delivery'?'Delivery':'Pickup';
const getOrderQuantity=o=>o.items?.length?o.items.reduce((sum,item)=>sum+Number(item.quantity||0),0):Number(o.quantity||0);
const badgeText=o=>o.paymentStatus==='Paid'?'Paid • '+(o.service==='Pickup'?'Pickup':o.address||'Delivery'):(o.paymentMethod==='GCash'?'GCash pending':'COD')+' • '+(o.service==='Pickup'?'Pickup':o.address||'Delivery');

const seed=[
 {id:'AB-1024',customer:'Juan Dela Cruz',phone:'0917 123 4567',source:'Phone',quantity:3,service:'Delivery',address:'Brgy. San Isidro',notes:'Call before arrival.',amount:120,stage:'pending',claimedBy:null,createdAt:'10:12 AM'},
 {id:'AB-1025',customer:'Maria Santos',phone:'0918 234 5678',source:'Messenger',quantity:5,service:'Pickup',address:'',notes:'Customer will collect at station.',amount:200,stage:'pending',claimedBy:null,createdAt:'10:18 AM'},
 {id:'AB-1026',customer:'Ana Cruz',phone:'0920 345 6789',source:'Walk-in',quantity:2,service:'Delivery',address:'Bagong Silang',notes:'Please ring the bell.',amount:80,stage:'ready',claimedBy:null,createdAt:'10:20 AM'},
 {id:'AB-1027',customer:'Ramon Garcia',phone:'',source:'Phone',quantity:3,service:'Delivery',address:'Fairview, QC',notes:'Leave at gate only after confirming customer.',amount:120,stage:'ready',claimedBy:null,createdAt:'10:21 AM'},
 {id:'AB-1028',customer:'Peter Reyes',phone:'',source:'Walk-in',quantity:2,service:'Pickup',address:'',notes:'Customer pickup.',amount:80,stage:'pickup',claimedBy:null,createdAt:'10:23 AM'},
 {id:'AB-1029',customer:'Lea Mendoza',phone:'0919 555 2301',source:'Messenger',quantity:2,service:'Delivery',address:'Brgy. Commonwealth',notes:'Collect and return same 2 Round gallons.',amount:80,stage:'collection',claimedBy:null,collectionRequired:true,createdAt:'10:25 AM'}
];
const read=()=>{try{const value=JSON.parse(localStorage.getItem(STORE_KEY)||'null');return Array.isArray(value)?value:seed;}catch{return seed;}};
const labels={collection:'Pending Collection',collectionClaimed:'Collection Claimed',collectionTransit:'Returning to Station',pending:'Pending Refill',refilling:'Refill Claimed',ready:'Ready for Delivery',pickup:'Ready for Pickup',delivery:'Delivery Claimed',out:'Out for Delivery',delivered:'Delivered',picked:'Picked Up',failed:'Delivery Issue'};
const now=()=>new Date().toLocaleString('en-PH');
export default function StaffOperations({onLogout}){
 const [orders,setOrders]=useState(read);
 const [notifications,setNotifications]=useState(readNotifications);
 const [notificationPrefs,setNotificationPrefs]=useState(readNotificationPrefs);
 const [notificationOpen,setNotificationOpen]=useState(false);
 const [notificationView,setNotificationView]=useState('list');
 const [toast,setToast]=useState(null);
 const [collectionForm,setCollectionForm]=useState(null);
 const [collectionQty,setCollectionQty]=useState('');
 const [collectionCondition,setCollectionCondition]=useState('Good');
 const [collectionError,setCollectionError]=useState('');
 const [settings,setSettings]=useState(readSettings);
 const [sale,setSale]=useState(initialStaffSale);
 const [clock,setClock]=useState(Date.now());
 const [dragging,setDragging]=useState(null);
 const {entries:availability,update:updateAvailability}=useEmployeeAvailability();
 const [page,setPage]=useState('home');
 const [tab,setTab]=useState('all');
 const [taskFilter,setTaskFilter]=useState('all');
 const [search,setSearch]=useState('');
 const [categoryOpen,setCategoryOpen]=useState(false);
 const [advancedOpen,setAdvancedOpen]=useState(false);
 const [sortOrder,setSortOrder]=useState('oldest');
 const [stageFilter,setStageFilter]=useState('all');
 const [draftSort,setDraftSort]=useState('oldest');
 const [draftStage,setDraftStage]=useState('all');
 const [selected,setSelected]=useState([]);
 const [selectedCollection,setSelectedCollection]=useState([]);
 const [detail,setDetail]=useState(null);
 const [notice,setNotice]=useState('');
 const [cash,setCash]=useState('');
 const [photo,setPhoto]=useState(null);
 const [remarks,setRemarks]=useState('');
 const [cameraOrder,setCameraOrder]=useState(null);
 const fileRef=useRef(null);
 const touchStart=useRef(null);
 useEffect(()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(orders));}catch{setNotice('Browser storage is unavailable; changes may not persist.');}},[orders]);
 useEffect(()=>{try{localStorage.setItem(NOTIFICATIONS_KEY,JSON.stringify(notifications));}catch{/* demo only */}},[notifications]);
 useEffect(()=>{try{localStorage.setItem(NOTIFICATION_PREFS_KEY,JSON.stringify(notificationPrefs));}catch{/* demo only */}},[notificationPrefs]);
 useEffect(()=>{if(!notificationOpen)return;const close=e=>{if(e.key==='Escape')setNotificationOpen(false)};document.addEventListener('keydown',close);return ()=>document.removeEventListener('keydown',close)},[notificationOpen]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),6500);return ()=>clearTimeout(timer);},[toast]);
 const notify=(message)=>{const type=notificationType(message);const event={id:Date.now()+'-'+Math.random().toString(36).slice(2,7),message,type,read:false,time:new Date().toLocaleString('en-PH')};setNotifications(prev=>[event,...prev].slice(0,60));if(notificationPrefs[type]!==false)setToast(event);};
 const markNotificationsRead=(ids)=>setNotifications(prev=>prev.map(n=>ids.includes(n.id)?{...n,read:true}:n));
 const deleteNotification=(id)=>setNotifications(prev=>prev.filter(n=>n.id!==id));
 const notificationUnread=notifications.filter(n=>!n.read).length;
 const openNotificationPage=(view='list')=>{setNotificationView(view);show('notifications');};


 useEffect(()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{/* Local demo preferences only */}},[settings]);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),60000);return ()=>clearInterval(id);},[]);
 const setWidget=(id,enabled)=>setSettings(prev=>({...prev,widgets:prev.widgets.map(w=>w.id===id?{...w,enabled}:w)}));
 const moveWidget=(id,delta)=>setSettings(prev=>{const list=[...prev.widgets],i=list.findIndex(w=>w.id===id),j=i+delta;if(i<0||j<0||j>=list.length)return prev;[list[i],list[j]]=[list[j],list[i]];return {...prev,widgets:list};});
 const reorderWidget=(from,to)=>setSettings(prev=>{const list=[...prev.widgets],a=list.findIndex(w=>w.id===from),b=list.findIndex(w=>w.id===to);if(a<0||b<0)return prev;const [item]=list.splice(a,1);list.splice(b,0,item);return {...prev,widgets:list};});
 const setShortcut=(index,key,value)=>setSettings(prev=>({...prev,shortcuts:prev.shortcuts.map((item,i)=>i===index?{...item,[key]:value}:item)}));
 const addQuick=(item)=>{setSale(prev=>({...prev,source:'Walk-in',service:'Walk-in',quantities:{...prev.quantities,[item.id]:Math.min(99,(prev.quantities[item.id]||0)+Number(item.quantity||1))}}));setNotice(item.label+' added to POS draft.');};
 const saveSale=()=>{const entries=Object.entries(sale.quantities).filter(([,q])=>q>0);if(!entries.length)return;
 const id='DEMO-'+String(Date.now());
 const collectionRequired=sale.service==='Collect & Return (Same Bottles)';
 if(collectionRequired&&sale.ownership!=='own'){setNotice('Collection & Return requires customer-owned bottles.');return;}
 if(collectionRequired&&(!sale.customer.trim()||!sale.phone?.trim()||!sale.address?.trim())){setNotice('Customer name, phone and collection address are required for Collection & Return.');notify('Collection order needs customer name, phone and address before saving.');return;}
 const service=sale.service==='Walk-in'?'Pickup':'Delivery';
 const createdAtISO=new Date().toISOString();
 const itemList=entries.map(([sizeId,quantity])=>({sizeId,quantity}));
 const amount=entries.reduce((sum,[id,q])=>sum+q*(DEMO_PRICES[id]||0),0);
 setOrders(prev=>[{id,customer:sale.customer.trim()||'Walk-in Customer',phone:collectionRequired?sale.phone.trim():'',source:sale.source,items:itemList,quantity:entries.reduce((sum,[,q])=>sum+q,0),service,address:collectionRequired?sale.address.trim():'',notes:sale.notes,amount,stage:collectionRequired?'collection':'pending',collectionRequired,claimedBy:null,createdAtISO,createdAt:new Date().toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'}),paymentMethod:sale.paymentMethod,paymentStatus:sale.paymentStatus,ownership:sale.ownership,reference:sale.reference},...prev]);
 setSale(initialStaffSale());show('queue');setTab(collectionRequired?'collection':'refill');setNotice(id+' saved to '+(collectionRequired?'Collection':'Refill')+' Queue (this browser only).');notify(id+' is ready for '+(collectionRequired?'collection':'refill')+'.');
 };

 const mine=orders.filter(o=>o.claimedBy==='staff'&&['collectionClaimed','collectionTransit','refilling','delivery','out'].includes(o.stage));
 const collection=orders.filter(o=>o.stage==='collection');
 const pending=orders.filter(o=>o.stage==='pending');
 const ready=orders.filter(o=>o.stage==='ready');
 const pickup=orders.filter(o=>o.stage==='pickup');
 const count={all:collection.length+pending.length+ready.length+pickup.length,collection:collection.length,refill:pending.length,delivery:ready.length,pickup:pickup.length};
 const categoryOf=o=>['collection','collectionClaimed','collectionTransit'].includes(o.stage)?'collection':o.stage==='pending'||o.stage==='refilling'?'refill':o.stage==='pickup'||o.stage==='picked'?'pickup':'delivery';
 const show=(p)=>{setNotificationOpen(false);setCategoryOpen(false);setAdvancedOpen(false);setStageFilter('all');if(p==='queue'&&page!=='queue')setTab('all');if(p==='tasks'&&page!=='tasks')setTaskFilter('all');setSearch('');setPage(p);setDetail(null);setNotice('');setSelected([]);setSelectedCollection([]);window.scrollTo({top:0,behavior:'smooth'});};
 const update=(ids,change,message)=>{setOrders(prev=>prev.map(o=>ids.includes(o.id)?{...o,...change,updatedAt:now()}:o));setSelected([]);setDetail(null);if(message){setNotice(message);notify(message);}};
 const claimCollections=()=>{const valid=collection.filter(o=>selectedCollection.includes(o.id)).map(o=>o.id);if(!valid.length)return;update(valid,{stage:'collectionClaimed',claimedBy:'staff',collectedBy:'staff',collectionClaimedAt:now()},valid.length+' collection task(s) added to My Tasks.');setSelectedCollection([]);};
 const openCollection=(o,mode)=>{setCollectionError('');setCollectionForm({id:o.id,mode});setCollectionQty(String(mode==='site'?o.quantity:o.collectedQty??o.quantity));setCollectionCondition(o.containerCondition||'Good');};
 const confirmCollection=()=>{const o=orders.find(x=>x.id===collectionForm?.id);if(!o)return;const qty=Number(collectionQty);if(!Number.isInteger(qty)||qty!==getOrderQuantity(o)){setCollectionError('The collected quantity must match the order. If bottles are missing or damaged, contact the manager before proceeding.');return;}if(collectionForm.mode==='site')update([o.id],{stage:'collectionTransit',collectedQty:qty,containerCondition:collectionCondition,collectedAt:now()},'Empty containers collected. Return them to station.');else if(qty!==Number(o.collectedQty)){setCollectionError('Station received quantity must match the collected quantity. Record an issue with the manager.');return;}else update([o.id],{stage:'pending',claimedBy:null,receivedAtStation:now(),stationReceivedQty:qty,containerCondition:collectionCondition},'Customer-owned containers received. Refill Queue updated.');setCollectionForm(null);setCollectionError('');};
 const claimRefill=(id)=>update([id],{stage:'refilling',claimedBy:'staff',refillClaimedAt:now()},'Refill task added to My Tasks.');
 const completeRefill=(id)=>{const o=orders.find(v=>v.id===id);if(!o)return;update([id],{stage:o.service==='Pickup'?'pickup':'ready',claimedBy:null,refilledBy:'staff',refillCompletedAt:now(),refillCompletedAtISO:new Date().toISOString()},'Refill completed. Order moved to '+(o.service==='Pickup'?'Pickup':'Delivery')+' queue.');};
 const claimDelivery=()=>{const valid=ready.filter(o=>selected.includes(o.id)).map(o=>o.id);if(!valid.length)return;update(valid,{stage:'delivery',claimedBy:'staff',deliveryClaimedAt:now()},valid.length+' delivery order(s) added to My Tasks.');show('tasks');};
 const completePickup=(id)=>{if(window.confirm('Confirm that the customer received this order?'))update([id],{stage:'picked',releasedBy:'staff',releasedAt:now()},'Pickup confirmed.');};
 const startDelivery=(id)=>update([id],{stage:'out',dispatchedAt:now()},'Order marked Out for Delivery.');
 const startProof=(id)=>{setCameraOrder(id);setCash('');setRemarks('');setPhoto(null);setDetail(id);};
 const saveDelivery=()=>{if(!cameraOrder||!photo){setNotice('A delivery photo is required before completion.');return;}const parsed=Number(cash);if(!cash.trim()||!Number.isFinite(parsed)||parsed<0){setNotice('Enter the actual COD cash collected (0 if none).');return;}update([cameraOrder],{stage:'delivered',deliveredBy:'staff',deliveredAt:now(),cashCollected:parsed,podRecorded:true,remittance:'Pending manager verification'},'Delivery recorded. Cash remittance still requires manager verification.');setCameraOrder(null);setPhoto(null);};
 const detailOrder=orders.find(o=>o.id===detail);
 const list=page==='tasks'?mine.filter(o=>taskFilter==='all'||(taskFilter==='collection'?['collectionClaimed','collectionTransit'].includes(o.stage):taskFilter==='refill'?o.stage==='refilling':['delivery','out'].includes(o.stage))):page==='history'?orders.filter(o=>['delivered','picked','failed'].includes(o.stage)):page==='queue'?(tab==='all'?[...collection,...pending,...ready,...pickup]:tab==='collection'?collection:tab==='refill'?pending:tab==='delivery'?ready:pickup):[];
 const stageGroup=o=>['collectionClaimed','refilling','delivery'].includes(o.stage)?'claimed':['collectionTransit','out'].includes(o.stage)?'progress':'waiting';
 const filtered=useMemo(()=>list.filter(o=>(o.id+' '+o.customer+' '+o.address+' '+o.source).toLowerCase().includes(search.toLowerCase())&&(stageFilter==='all'||(stageFilter==='overdue'?elapsed(o,clock).mins>15:stageGroup(o)===stageFilter))).slice().sort((a,b)=>sortOrder==='oldest'?elapsed(b,clock).mins-elapsed(a,clock).mins:elapsed(a,clock).mins-elapsed(b,clock).mins),[list,search,clock,sortOrder,stageFilter]);
 const title=({home:'Operations Dashboard',queue:'Operations Queue',tasks:'My Tasks',history:'Completed History',pos:'POS',more:'More',settings:'Customize Dashboard',notifications:'Notifications'})[page]||'Operations';
 const myCollection=mine.filter(o=>['collectionClaimed','collectionTransit'].includes(o.stage)).length;
 const myRefill=mine.filter(o=>o.stage==='refilling').length,myDelivery=mine.filter(o=>o.stage==='delivery'||o.stage==='out').length;
 const nextActive=mine.find(o=>o.stage==='collectionClaimed')||mine.find(o=>o.stage==='collectionTransit')||mine.find(o=>o.stage==='refilling')||mine.find(o=>o.stage==='delivery')||mine.find(o=>o.stage==='out');
 const todayKey=new Date(clock).toLocaleDateString('en-CA');
 const gallonsToday=orders.filter(o=>o.refillCompletedAtISO&&new Date(o.refillCompletedAtISO).toLocaleDateString('en-CA')===todayKey).reduce((sum,o)=>sum+getOrderQuantity(o),0);
 const dailyTarget=Math.max(1,Number(settings.dailyTarget)||40);
 const taskCurrent=page==='tasks'?(filtered.find(o=>['out','collectionTransit'].includes(o.stage))||filtered[0]):null;
 const upcomingTasks=page==='tasks'?filtered.filter(o=>o.id!==taskCurrent?.id):[];
 const taskAction=(o)=>o.stage==='collectionClaimed'?<button className="staffapp-primary" onClick={()=>openCollection(o,'site')}>Confirm Collection</button>
 :o.stage==='collectionTransit'?<button className="staffapp-primary" onClick={()=>openCollection(o,'station')}>Received at Station</button>
 :o.stage==='refilling'?<button className="staffapp-primary" onClick={()=>completeRefill(o.id)}>Complete Refill</button>
 :o.stage==='delivery'?<button className="staffapp-primary" onClick={()=>startDelivery(o.id)}>Out for Delivery</button>
 :o.stage==='out'?<button className="staffapp-primary" onClick={()=>startProof(o.id)}><FiCamera aria-hidden="true"/> Confirm Delivery</button>:null;

 const isTasks=page==='tasks';
 const currentCategory=isTasks?taskFilter:tab;
 const categories=isTasks?[
  {id:'all',label:'All Active',count:mine.length,icon:FiClipboard},
  {id:'collection',label:'Collect',count:myCollection,icon:FiPackage},
  {id:'refill',label:'Refill',count:myRefill,icon:FiDroplet},
  {id:'delivery',label:'Delivery',count:myDelivery,icon:FiTruck}
 ]:[
  {id:'all',label:'All',count:count.all,icon:FiClipboard},
  {id:'collection',label:'Collect',count:count.collection,icon:FiPackage},
  {id:'refill',label:'Refill',count:count.refill,icon:FiDroplet},
  {id:'delivery',label:'Delivery',count:count.delivery,icon:FiTruck},
  {id:'pickup',label:'Pickup',count:count.pickup,icon:FiCheckCircle}
 ];
 const chosenCategory=categories.find(c=>c.id===currentCategory)||categories[0];
 const pendingElsewhere=categories.filter(c=>c.id!=='all'&&c.id!==currentCategory&&c.count>0).reduce((sum,c)=>sum+c.count,0);
 const otherPending=categories.filter(c=>c.id!=='all'&&c.id!==currentCategory&&c.count>0).length;
 const chooseCategory=id=>{if(isTasks)setTaskFilter(id);else {setTab(id);setSelected([]);setSelectedCollection([]);}setSearch('');setCategoryOpen(false);setStageFilter('all');setSortOrder('oldest');};
 const openAdvanced=()=>{setDraftSort(sortOrder);setDraftStage(stageFilter);setCategoryOpen(false);setAdvancedOpen(true);};
 const applyAdvanced=()=>{setSortOrder(draftSort);setStageFilter(draftStage);setAdvancedOpen(false);};

 return <div className="staffapp">
  <header className="mgmt-header staffapp-shared-header"><div className="mgmt-header-inner">
    <button className="mgmt-brand mgmt-brand-button" aria-label="AquaBest — Go to Dashboard" onClick={()=>show('home')}><img src={logo} alt="AquaBest"/><span className="mgmt-brand-label"><small>Management System</small><strong>Staff Operations</strong></span></button>
    <div className="mgmt-header-end"><ManagementHeaderActions name="Staff A" entries={availability} orders={mine.map(o=>({id:o.id,assigned:'Staff A',status:o.stage==='refilling'?'Preparing':'Out for Delivery'}))} onUpdate={updateAvailability} onNotifications={()=>setNotificationOpen(v=>!v)}/>
     {notificationOpen&&<div className="staffapp-notification-popover" role="dialog" aria-label="Recent Staff Notifications">
      <div className="staffapp-popover-heading"><strong>Notifications {notificationUnread>0&&<span>{compactCount(notificationUnread)}</span>}</strong><button aria-label="Close notifications" onClick={()=>setNotificationOpen(false)}><FiX/></button></div>
      <div className="staffapp-popover-items">
       {notifications.length?notifications.slice(0,5).map(n=><div key={n.id} className={'staffapp-popover-item '+(n.read?'is-read':'is-unread')}>
        <FiBell aria-hidden="true"/><div><strong>{n.message}</strong><small>{n.time}</small></div>
        <button type="button" aria-label={'Mark notification as read: '+n.message} onClick={()=>markNotificationsRead([n.id])}>{n.read?<FiCheck/>:<FiCheckCircle/>}</button>
       </div>):<p className="staffapp-muted">No recent activity in this browser.</p>}
      </div>
      <div className="staffapp-popover-footer"><button onClick={()=>openNotificationPage('list')}><FiList/> See all</button><button onClick={()=>markNotificationsRead(notifications.map(n=>n.id))} disabled={!notificationUnread}><FiCheckSquare/> Mark all read</button><button onClick={()=>openNotificationPage('configure')}><FiSettings/> Configure</button></div>
     </div>}
     <button className="mgmt-header-logout" onClick={onLogout} aria-label="Log out of business workspace" title="Log out of business workspace"><FiLogOut aria-hidden="true"/><span>Log Out</span></button>
    </div>
   </div></header>
  <main className="staffapp-main">
   <div className="staffapp-title"><div><h1>{title}</h1><p>Refill, delivery & customer pickup</p></div><span className="staffapp-demo">Demo • This device only</span></div>
   {notice&&<div className="staffapp-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notice"><FiX/></button></div>}
   {page==='home'&&<>
    <div className="staffapp-stats">
     <button onClick={()=>{show('queue');setTab('refill')}}><FiDroplet/><b>{count.refill}</b><small>Pending Refill <FiArrowRight aria-hidden="true"/></small></button>
     <button onClick={()=>{show('queue');setTab('delivery')}}><FiTruck/><b>{count.delivery}</b><small>Ready Delivery <FiArrowRight aria-hidden="true"/></small></button>
     <button onClick={()=>{show('queue');setTab('pickup')}}><FiCheckCircle/><b>{count.pickup}</b><small>Ready Pickup <FiArrowRight aria-hidden="true"/></small></button>
     <button onClick={()=>show('tasks')}><FiClipboard/><b>{mine.length}</b><small>My Tasks <FiArrowRight aria-hidden="true"/></small></button>
    </div>
    <div className="staffapp-widget-heading"><h2>My Dashboard</h2><button onClick={()=>show('settings')} aria-label="Customize Dashboard"><FiSettings/> Customize</button></div>
    <div className="staffapp-widgets">{settings.widgets.filter(w=>w.enabled&&(w.id!=='active'||mine.length>0)).sort((a,b)=>a.id==='active'?-1:b.id==='active'?1:0).map(w=>
     w.id==='active'?<section className="staffapp-panel staffapp-widget staffapp-widget-active" key={w.id}>
       <h2><FiClipboard/> Active Task Pin <span className="staffapp-widget-count">{mine.length}</span></h2>
       {nextActive&&<div className={'staffapp-pinned-task staffapp-pinned-task-'+activeType(nextActive)}><div><div className="staffapp-pinned-heading"><strong>{nextActive.id} · {nextActive.customer}</strong><span className={'staffapp-next-type staffapp-next-type-'+activeType(nextActive)}>{activeTypeLabel(nextActive)}</span></div><small>{orderItems(nextActive)}</small></div>
       <button className="staffapp-primary" onClick={()=>nextActive.stage==='collectionClaimed'?openCollection(nextActive,'site'):nextActive.stage==='collectionTransit'?openCollection(nextActive,'station'):nextActive.stage==='refilling'?completeRefill(nextActive.id):nextActive.stage==='delivery'?startDelivery(nextActive.id):startProof(nextActive.id)}>
       {nextActive.stage==='collectionClaimed'?'Confirm Collection':nextActive.stage==='collectionTransit'?'Received at Station':nextActive.stage==='refilling'?'Complete Refill':nextActive.stage==='delivery'?'Out for Delivery':'Confirm Delivery'}</button></div>}
       {mine.length>1&&<button className="staffapp-widget-textlink" onClick={()=>show('tasks')}>View all {mine.length} tasks <FiArrowRight/></button>}
      </section>
     :w.id==='quick'?<section className="staffapp-panel staffapp-widget" key={w.id}><h2><FiShoppingCart/> Quick Walk-in POS</h2>
       <div className="staffapp-quick-pos">{settings.shortcuts.map((item,i)=><button key={i} onClick={()=>addQuick(item)} aria-label={'Add '+(item.quantity||1)+' '+(item.label||DEMO_PRODUCTS.find(p=>p.id===item.id)?.label)+' to POS'}><span className="staffapp-quick-pos-content">{quickProductImage(item.id)&&<img className="staffapp-quick-pos-image" src={quickProductImage(item.id)} alt="" loading="lazy"/>}<span className="staffapp-quick-pos-copy"><strong><FiPlus aria-hidden="true"/> {item.label||DEMO_PRODUCTS.find(p=>p.id===item.id)?.label}</strong><small>{formatMoney(DEMO_PRICES[item.id])} × {item.quantity}</small></span></span></button>)}</div>
       <div className="staffapp-widget-footer"><small>{Object.values(sale.quantities).reduce((a,b)=>a+b,0)} in draft</small><button className="staffapp-widget-textlink" onClick={()=>show('pos')}>Review POS <FiArrowRight/></button></div>
      </section>
     :w.id==='urgent'?<section className="staffapp-panel staffapp-widget" key={w.id}><h2><FiBell/> Next Up · Oldest Orders</h2>
       {[...collection,...pending,...ready].sort((a,b)=>elapsed(b,clock).mins-elapsed(a,clock).mins).slice(0,settings.previewCount).map(o=><div className={'staffapp-next-row staffapp-next-row-'+categoryOf(o)} key={o.id}>
        <div className="staffapp-next-details">
         <span className="staffapp-next-heading"><strong>{o.id} · {o.customer}</strong><span className={'staffapp-next-type staffapp-next-type-'+categoryOf(o)}>{o.stage==='collection'?'Collect':o.stage==='pending'?'Refill':'Delivery'}</span></span>
         <small>{orderItems(o)} · {elapsed(o,clock).label}</small>
        </div>
        <button type="button" aria-label={'Claim '+(o.stage==='collection'?'collection':o.stage==='pending'?'refill':'delivery')+' for '+o.id} onClick={()=>o.stage==='collection'?update([o.id],{stage:'collectionClaimed',claimedBy:'staff',collectedBy:'staff',collectionClaimedAt:now()},'Collection added to My Tasks.'):o.stage==='pending'?claimRefill(o.id):update([o.id],{stage:'delivery',claimedBy:'staff',deliveryClaimedAt:now()},'Delivery added to My Tasks.')}>{o.stage==='collection'?'Claim Collect':o.stage==='pending'?'Claim Refill':'Claim Delivery'}</button>
       </div>)}
       {![...collection,...pending,...ready].length&&<p className="mgmt-sub">No unclaimed refill or delivery orders.</p>}
      </section>
     :<section className="staffapp-panel staffapp-widget staffapp-widget-shift" key={w.id}><h2><FiTarget/> Shift & Stock Snapshot</h2>
       <div className="staffapp-shift-stats"><div><small>Refilled today (demo)</small><strong>{gallonsToday} / {dailyTarget} gal</strong></div><div><small>Clean containers</small><strong>Not tracked</strong></div><div><small>Seals remaining</small><strong>Not tracked</strong></div></div>
       <div className="staffapp-shift-progress" role="progressbar" aria-label="Demo gallons refilled today versus target" aria-valuenow={Math.min(gallonsToday,dailyTarget)} aria-valuemin={0} aria-valuemax={dailyTarget}><span style={{width:Math.min(100,Math.round(gallonsToday/dailyTarget*100))+'%'}}/></div>
       <small className="staffapp-muted">Only refills completed in this browser are counted; inventory and seals have no connected data source.</small>
      </section>
    )}</div>
   </>}
   {(page==='queue'||page==='tasks'||page==='history')&&<>
    {(page==='queue'||page==='tasks')&&<div className="staffapp-filter-controls">
      <div className="staffapp-category-wrap">
       <button type="button" className="staffapp-category-trigger" aria-expanded={categoryOpen} aria-haspopup="listbox" onClick={()=>{setCategoryOpen(v=>!v);setAdvancedOpen(false);}}>
        {chosenCategory&&<chosenCategory.icon aria-hidden="true"/>}
        <span className="staffapp-category-name">{chosenCategory.label} ({chosenCategory.count})</span>
        <FiChevronDown className="staffapp-category-chevron" aria-hidden="true"/>
        {otherPending>0&&<span className="staffapp-category-alert" aria-label={pendingElsewhere+' tasks in other categories'}>{otherPending}</span>}
       </button>
       {categoryOpen&&<div className="staffapp-category-menu" role="listbox" aria-label="Select work category">
         <p className="staffapp-menu-hint">{otherPending>0?'You have unfinished work in other categories.':'Choose a category to view tasks.'}</p>
         {categories.map(c=><button type="button" role="option" aria-selected={currentCategory===c.id} key={c.id} onClick={()=>chooseCategory(c.id)}>
           <c.icon aria-hidden="true"/><span>{c.label}</span>
           <span className="staffapp-category-option-count">{c.count}</span>
           {currentCategory===c.id?<FiCheck aria-label="Selected"/>:c.count>0?<span className="staffapp-category-pending-dot" aria-label="Pending work"/>:null}
          </button>)}
        </div>}
      </div>
      <button type="button" className="staffapp-filter-trigger" aria-expanded={advancedOpen} onClick={openAdvanced}><FiFilter aria-hidden="true"/> Filter{(stageFilter!=='all'||sortOrder!=='oldest')&&<span className="staffapp-filter-active-dot" aria-label="Filters active"/>}</button>
     </div>}
    <label className="staffapp-search"><FiSearch/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, customer or address" aria-label="Search orders"/></label>
    {page==='tasks'&&<div className="staffapp-personal-tasks">
      <div className="staffapp-task-workload"><span>Your current workload</span><strong>{filtered.length} {filtered.length===1?'task':'tasks'}</strong></div>
      {taskCurrent?<section className={'staffapp-current-task staffapp-type-'+categoryOf(taskCurrent)}>
       <div className="staffapp-current-task-header"><span><FiClipboard/> CURRENT TASK</span><span className={'staffapp-next-type staffapp-next-type-'+categoryOf(taskCurrent)}>{activeTypeLabel(taskCurrent)}</span></div>
       <h2>{taskCurrent.customer}</h2>
       <p className="staffapp-current-task-sub">{taskCurrent.id} · {labels[taskCurrent.stage]}</p>
       <p className="staffapp-current-task-quantity">{orderItems(taskCurrent)}</p>
       {taskCurrent.address&&<p className="staffapp-current-task-address"><FiMapPin/> {taskCurrent.address}</p>}
       <div className="staffapp-current-task-buttons"><button className="staffapp-secondary" onClick={()=>setDetail(taskCurrent.id)}>Details <FiChevronDown/></button>{taskAction(taskCurrent)}</div>
      </section>:<div className="staffapp-empty staffapp-task-empty"><FiCheckCircle/><strong>No tasks in this view</strong><p>Choose another category or claim work from Queues.</p><button className="staffapp-secondary" onClick={()=>show('queue')}>Open Queues</button></div>}
      {upcomingTasks.length>0&&<section className="staffapp-up-next"><div className="staffapp-up-next-heading"><h2>Up Next</h2><span>{upcomingTasks.length} remaining</span></div>
       {upcomingTasks.map(o=><div key={o.id} className={'staffapp-up-next-row staffapp-type-'+categoryOf(o)}>
        <div className="staffapp-up-next-info"><strong>{o.customer}</strong><span>{o.id} · {orderItems(o)}</span><span className={'staffapp-next-type staffapp-next-type-'+categoryOf(o)}>{activeTypeLabel(o)} · {labels[o.stage]}</span></div>
        <div className="staffapp-up-next-actions"><button className="staffapp-secondary" onClick={()=>setDetail(o.id)}>Details</button>{taskAction(o)}</div>
       </div>)}
      </section>}
     </div>}
     {page!=='tasks'&&<div className="staffapp-list">{filtered.length===0&&<div className="staffapp-empty"><FiCheckCircle/><strong>No matching orders</strong><p>Try another queue or search.</p></div>}
    {filtered.map(o=><article className={"staffapp-order staffapp-type-"+categoryOf(o)} key={o.id}
      onTouchStart={page==='queue'&&((tab==='delivery'&&o.stage==='ready')||(tab==='collection'&&o.stage==='collection')||(tab==='all'&&['ready','collection'].includes(o.stage)))?e=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY,id:o.id};}:undefined}
      onTouchEnd={page==='queue'&&((tab==='delivery'&&o.stage==='ready')||(tab==='collection'&&o.stage==='collection')||(tab==='all'&&['ready','collection'].includes(o.stage)))?e=>{const start=touchStart.current;if(!start||start.id!==o.id)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;touchStart.current=null;if(dx>90&&Math.abs(dx)>Math.abs(dy)*1.5){if(o.stage==='collection')setSelectedCollection(prev=>prev.includes(o.id)?prev:[...prev,o.id]);else setSelected(prev=>prev.includes(o.id)?prev:[...prev,o.id]);}}:undefined}>
      <div className="staffapp-compact-row staffapp-compact-head">
       <div className="staffapp-compact-identity">{page==='queue'&&['ready','collection'].includes(o.stage)&&<input type="checkbox" aria-label={'Select '+o.id} checked={(o.stage==='collection'?selectedCollection:selected).includes(o.id)} onChange={e=>o.stage==='collection'?setSelectedCollection(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id)):setSelected(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id))}/>}
        <strong>{o.id} <span className="staffapp-id-divider">·</span> {o.customer}</strong></div>
       <span className="staffapp-payment-badge" title={badgeText(o)}>{badgeText(o)}</span>
      </div>
      <div className="staffapp-compact-row staffapp-compact-meta"><span>{orderItems(o)}</span><span className={elapsed(o,clock).mins>15&&!['delivered','picked'].includes(o.stage)?'staffapp-overdue':''}>{o.createdAt||'—'} · {elapsed(o,clock).label}</span></div>
      <div className="staffapp-compact-row staffapp-compact-actions">
       <button className="staffapp-secondary" onClick={()=>setDetail(o.id)}>Details <FiChevronDown/></button>
       {page==='queue'&&o.stage==='collection'&&<button className="staffapp-primary" onClick={()=>setSelectedCollection(prev=>prev.includes(o.id)?prev.filter(id=>id!==o.id):[...prev,o.id])}>{selectedCollection.includes(o.id)?'Unselect':'Select Collection'}</button>}
       {page==='queue'&&o.stage==='pending'&&<button className="staffapp-primary" onClick={()=>claimRefill(o.id)}>Claim Refill</button>}
       {page==='queue'&&o.stage==='pickup'&&<button className="staffapp-primary" onClick={()=>completePickup(o.id)}>Confirm Pickup</button>}
       {page==='queue'&&o.stage==='ready'&&<button className="staffapp-primary" onClick={()=>setSelected(p=>p.includes(o.id)?p.filter(id=>id!==o.id):[...p,o.id])}>{selected.includes(o.id)?'Unselect':'Select Delivery'}</button>}
       {page==='tasks'&&o.stage==='collectionClaimed'&&<button className="staffapp-primary" onClick={()=>openCollection(o,'site')}>Confirm Collection</button>}
       {page==='tasks'&&o.stage==='collectionTransit'&&<button className="staffapp-primary" onClick={()=>openCollection(o,'station')}>Received at Station</button>}
       {page==='tasks'&&o.stage==='refilling'&&<button className="staffapp-primary" onClick={()=>completeRefill(o.id)}>Complete Refill</button>}
       {page==='tasks'&&o.stage==='delivery'&&<button className="staffapp-primary" onClick={()=>startDelivery(o.id)}>Out for Delivery</button>}
       {page==='tasks'&&o.stage==='out'&&<button className="staffapp-primary" onClick={()=>startProof(o.id)}><FiCamera/> Confirm Delivery</button>}
      </div>
     </article>)}</div>}
    {page==='queue'&&(tab==='delivery'||tab==='all')&&selected.length>0&&<div className="staffapp-selection"><span><b>{selected.length}</b> selected <button onClick={()=>setSelected([])}>Clear</button></span><button onClick={claimDelivery}>Claim Selected ({selected.length})</button></div>}
    {page==='queue'&&(tab==='collection'||tab==='all')&&selectedCollection.length>0&&<div className="staffapp-selection"><span><b>{selectedCollection.length}</b> collection(s) selected <button onClick={()=>setSelectedCollection([])}>Clear</button></span><button onClick={claimCollections}>Claim Collections ({selectedCollection.length})</button></div>}
   </>}
   {page==='pos'&&<StaffPOS sale={sale} onChange={setSale} onSave={saveSale} onClear={()=>setSale(initialStaffSale())}/>}
   {page==='more'&&<div className="staffapp-more">
     <button onClick={()=>show('settings')}><FiSettings/> <span><strong>Customize Dashboard</strong><small>Widgets and Quick POS items</small></span></button>
     <button onClick={()=>show('history')}><FiActivity/> <span><strong>Completed History</strong><small>Pickup and delivery records</small></span></button>
     <button onClick={()=>show('notifications')}><FiBell/> <span><strong>Notifications</strong><small>Demo announcements</small></span></button>
     <button onClick={onLogout}><FiLogOut/> <span><strong>Log Out</strong><small>Exit business workspace</small></span></button>
   </div>}
   {page==='notifications'&&<section className="staffapp-panel staffapp-notification-list">
      <h2>Staff Notifications</h2>
      <div className="staffapp-notification-tabs" role="tablist" aria-label="Notification options">
       <button role="tab" aria-selected={notificationView==='list'} className={notificationView==='list'?'active':''} onClick={()=>setNotificationView('list')}>List {notificationUnread>0&&<span>{compactCount(notificationUnread)}</span>}</button>
       <button role="tab" aria-selected={notificationView==='configure'} className={notificationView==='configure'?'active':''} onClick={()=>setNotificationView('configure')}>Configure</button>
      </div>
      {notificationView==='list'?<>
       <div className="staffapp-notification-actions"><button onClick={()=>markNotificationsRead(notifications.map(n=>n.id))} disabled={!notificationUnread}><FiCheckSquare/> Mark all read</button><button onClick={()=>setNotifications([])} disabled={!notifications.length}><FiTrash2/> Clear all</button></div>
       {notifications.length?notifications.map(n=><div key={n.id} className={'staffapp-notification-entry '+(n.read?'is-read':'is-unread')}>
        <span className="staffapp-notification-entry-icon"><FiBell/></span><div className="staffapp-notification-entry-body"><strong>{n.message}</strong><small>{n.time}</small></div>
        <div className="staffapp-notification-entry-actions"><button onClick={()=>markNotificationsRead([n.id])} disabled={n.read} aria-label={'Mark as read: '+n.message}><FiCheck/></button><button onClick={()=>deleteNotification(n.id)} aria-label={'Delete: '+n.message}><FiX/></button></div>
       </div>):<p className="staffapp-muted">No recent notifications in this browser.</p>}</>
      :<><p className="staffapp-muted">Choose which events create in-app popups. Events are still saved in List. Email and phone notifications are not connected to this demo.</p>
       <div className="staffapp-notification-config-heading"><span>Event</span><span>In-app</span><span>Email</span><span>Mobile</span></div>
       {notificationTypes.map(t=><div className="staffapp-notification-config-row" key={t.id}>
        <strong>{t.label}</strong><label><input type="checkbox" aria-label={t.label+' in-app'} checked={notificationPrefs[t.id]!==false} onChange={e=>setNotificationPrefs(prev=>({...prev,[t.id]:e.target.checked}))}/></label>
        <span title="Email notifications not connected">—</span><span title="Mobile push notifications not connected">—</span>
       </div>)}
      </>}
      <p className="staffapp-muted">Local demo activity only. No cross-device or push notifications.</p>
     </section>}
   {page==='settings'&&<div className="staffapp-customize">
     <section className="staffapp-panel"><h2>Dashboard & Quick POS Customization</h2><h3 className="staffapp-settings-subhead">Home Screen Widgets</h3><p>Turn widgets on or off. Drag on desktop, or use arrows to reorder on mobile. Active tasks stay above other widgets when enabled.</p>
      {settings.widgets.map((w,i)=><div key={w.id} className="staffapp-setting-row" draggable onDragStart={()=>setDragging(w.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragging)reorderWidget(dragging,w.id);setDragging(null);}} onDragEnd={()=>setDragging(null)}>
       <label className="staffapp-switch-label"><input type="checkbox" role="switch" checked={w.enabled} onChange={e=>setWidget(w.id,e.target.checked)}/><span>{widgetCatalog.find(v=>v.id===w.id).label}</span></label>
       <div><button aria-label={'Move '+w.id+' up'} disabled={i===0} onClick={()=>moveWidget(w.id,-1)}><FiArrowUp/></button><button aria-label={'Move '+w.id+' down'} disabled={i===settings.widgets.length-1} onClick={()=>moveWidget(w.id,1)}><FiArrowDown/></button></div>
      </div>)}
      <label className="staffapp-setting-select">Queue preview count <select value={settings.previewCount} onChange={e=>setSettings(prev=>({...prev,previewCount:Number(e.target.value)}))}><option value={2}>Top 2</option><option value={3}>Top 3</option></select></label>
      <label className="staffapp-setting-select">Daily refill target (gallons) <input aria-label="Daily refill target" type="number" min="1" max="9999" value={settings.dailyTarget??40} onChange={e=>setSettings(prev=>({...prev,dailyTarget:Math.max(1,Math.min(9999,Number(e.target.value)||1))}))}/></label>
     </section>
     <section className="staffapp-panel"><h2>Manage Quick-Tap Items</h2><p>Up to four slots. Choose from the original POS catalog. Prices follow the existing demo catalog and cannot be edited independently here.</p>
      {settings.shortcuts.map((item,i)=><div className="staffapp-shortcut-row" key={i}>
       <strong>Slot {i+1}</strong><select aria-label={'Product for slot '+(i+1)} value={item.id} onChange={e=>setShortcut(i,'id',e.target.value)}>{DEMO_PRODUCTS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.shape} ({formatMoney(DEMO_PRICES[p.id])})</option>)}</select>
       <input aria-label={'Short label '+(i+1)} maxLength={20} value={item.label} onChange={e=>setShortcut(i,'label',e.target.value)} placeholder="Short button label"/>
       <label>Default qty <input type="number" min="1" max="20" value={item.quantity} onChange={e=>setShortcut(i,'quantity',Math.max(1,Math.min(20,Number(e.target.value)||1)))}/></label>
       <button type="button" className="staffapp-remove-slot" aria-label={'Remove quick tap slot '+(i+1)} onClick={()=>setSettings(prev=>({...prev,shortcuts:prev.shortcuts.filter((_,j)=>j!==i)}))}>Remove</button>
      </div>)}
      {settings.shortcuts.length<4&&<button className="staffapp-secondary" onClick={()=>setSettings(prev=>({...prev,shortcuts:[...prev.shortcuts,{id:DEMO_PRODUCTS[0].id,label:DEMO_PRODUCTS[0].label,quantity:1}]}))}><FiPlus/> Add Slot</button>}
     </section>
    </div>}
   {toast&&<aside className="staffapp-toast" role="status" aria-live="polite">
      <FiBell className="staffapp-toast-icon"/><div><strong>Staff update</strong><p>{toast.message}</p><button type="button" onClick={()=>{setToast(null);show('notifications')}}>Show More <FiArrowRight/></button></div>
      <button className="staffapp-toast-close" aria-label="Dismiss notification" onClick={()=>setToast(null)}><FiX/></button>
     </aside>}
   <p className="staffapp-disclaimer">Frontend prototype only. Saved changes stay in this browser; they do not update GitHub, Supabase or other employees' phones. Demo account is not secure production authentication.</p>
  </main>
  <nav className="staffapp-bottom" aria-label="Staff navigation">{[['home','Home',FiHome],['queue','Queues',FiDroplet],['tasks','My Tasks',FiClipboard],['pos','POS',FiShoppingCart],['more','More',FiMenu]].map(([id,label,Icon])=><button key={id} className={page===id||(id==='more'&&['settings','history','notifications'].includes(page))?'active':''} onClick={()=>show(id)}><span className="staffapp-nav-icon"><Icon/>{id==='tasks'&&mine.length>0&&<em>{compactCount(mine.length)}</em>}</span><small>{label}</small></button>)}</nav>
  {advancedOpen&&<div className="staffapp-filter-backdrop" onClick={()=>setAdvancedOpen(false)}>
   <section className="staffapp-filter-sheet" role="dialog" aria-modal="true" aria-label="Advanced task filters" onClick={e=>e.stopPropagation()}>
    <div className="staffapp-filter-sheet-head"><h2>Filter {isTasks?'Tasks':'Queue'}</h2><button aria-label="Close filters" onClick={()=>setAdvancedOpen(false)}><FiX/></button></div>
    <fieldset><legend>Sort by</legend>
      <label><input type="radio" name="staff-sort" checked={draftSort==='oldest'} onChange={()=>setDraftSort('oldest')}/> Oldest first</label>
      <label><input type="radio" name="staff-sort" checked={draftSort==='newest'} onChange={()=>setDraftSort('newest')}/> Newest first</label>
    </fieldset>
    <fieldset><legend>Work stage</legend>
      {(isTasks?[['all','All stages'],['claimed','Claimed / Not started'],['progress','In progress']]:[['all','All available'],['overdue','Waiting over 15 minutes']]).map(([id,label])=><label key={id}><input type="radio" name="staff-stage" checked={draftStage===id} onChange={()=>setDraftStage(id)}/> {label}</label>)}
    </fieldset>
    <div className="staffapp-filter-sheet-actions"><button className="staffapp-secondary" onClick={()=>{setDraftSort('oldest');setDraftStage('all');}}>Reset</button><button className="staffapp-primary" onClick={applyAdvanced}>Apply Filters</button></div>
   </section>
  </div>}
  {collectionForm&&<div className="staffapp-overlay" onClick={()=>setCollectionForm(null)}><section className="staffapp-sheet" role="dialog" aria-modal="true" aria-label="Confirm customer empty containers" onClick={e=>e.stopPropagation()}>
    <div className="staffapp-sheet-head"><h2>{collectionForm.mode==='site'?'Confirm Collection':'Confirm Station Receipt'}</h2><button aria-label="Close" onClick={()=>setCollectionForm(null)}><FiX/></button></div>
    <p className="staffapp-muted">Order {collectionForm.id} · Keep the customer's exact containers linked to this order. No bottle exchange.</p>
    <label className="staffapp-collection-field">Number of customer containers <input type="number" min="1" max={getOrderQuantity(orders.find(o=>o.id===collectionForm.id)||{})} value={collectionQty} onChange={e=>setCollectionQty(e.target.value)}/></label>
    <label className="staffapp-collection-field">Container condition <select value={collectionCondition} onChange={e=>setCollectionCondition(e.target.value)}><option>Good</option><option>Needs inspection</option><option>Damaged</option></select></label>
    {collectionForm.mode==='station'&&<p className="staffapp-muted">Collected: {orders.find(o=>o.id===collectionForm.id)?.collectedQty||0} container(s). Check that the station receives the same quantity.</p>}
    {collectionError&&<p role="alert" className="staffapp-collection-error">{collectionError}</p>}
    <button className="staffapp-primary" onClick={confirmCollection}>{collectionForm.mode==='site'?'Collected from Customer':'Received at Station'}</button>
   </section></div>}
  {detailOrder&&<div className="staffapp-overlay" onClick={()=>{setDetail(null);setCameraOrder(null);setPhoto(null)}}><section className="staffapp-sheet" role="dialog" aria-modal="true" aria-label="Order details" onClick={e=>e.stopPropagation()}>
   <div className="staffapp-sheet-head"><h2>{cameraOrder?'Confirm Delivery':detailOrder.id}</h2><button aria-label="Close" onClick={()=>{setDetail(null);setCameraOrder(null);setPhoto(null)}}><FiX/></button></div>
   <div className="staffapp-sheet-row"><b>Customer</b><span>{detailOrder.customer}</span></div>
   <div className="staffapp-sheet-row"><b>Contact</b><span>{detailOrder.phone||'Not provided'}</span></div>
   <div className="staffapp-sheet-row"><b>Items</b><span>{orderItems(detailOrder)}</span></div>
   <div className="staffapp-sheet-row"><b>Type</b><span>{detailOrder.collectionRequired?'Collect & Return':detailOrder.service}</span></div>
   {detailOrder.collectionRequired&&<><div className="staffapp-sheet-row"><b>Collected by</b><span>{detailOrder.collectedBy||'Not yet claimed'}</span></div><div className="staffapp-sheet-row"><b>Empty containers received</b><span>{detailOrder.stationReceivedQty??'Awaiting collection'} </span></div></>}
   <div className="staffapp-sheet-row"><b>Source</b><span>{detailOrder.source}</span></div>
   <div className="staffapp-sheet-row"><b>Status</b><span>{labels[detailOrder.stage]}</span></div>
   {detailOrder.address&&<div className="staffapp-sheet-info"><FiMapPin/> {detailOrder.address}</div>}
   {detailOrder.notes&&<div className="staffapp-sheet-info">Notes: {detailOrder.notes}</div>}
   <div className="staffapp-sheet-row"><b>Payment (demo)</b><span>COD • ₱{detailOrder.amount}</span></div>
   {cameraOrder&&<div className="staffapp-proof"><h3>Proof of Delivery</h3><p>Take a picture of the delivered containers. Avoid faces and private details.</p><input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];setPhoto(f||null)}} aria-label="Take delivery photo"/>{photo&&<span className="staffapp-photo-ok"><FiCheck/> Photo selected: {photo.name}</span>}<label>COD cash collected (₱)<input type="number" min="0" step="0.01" value={cash} onChange={e=>setCash(e.target.value)} placeholder="Enter actual cash"/></label><label>Remarks (optional)<textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Delivery notes"/></label><p className="staffapp-disclaimer">Demo only: photo is required for this confirmation but image bytes are not uploaded or retained. Do not use this as production proof.</p><button className="staffapp-primary" onClick={saveDelivery} disabled={!photo}>Submit Delivery</button></div>}
  </section></div>}
 </div>;
}
