import { useEffect, useMemo, useState } from 'react';
import { FiActivity, FiAlertCircle, FiArrowRight, FiCamera, FiCheckCircle, FiClipboard, FiDroplet, FiPackage, FiSearch, FiTruck, FiUsers, FiChevronDown, FiCheck, FiFilter, FiX } from 'react-icons/fi';
import { formatMoney, orderSummary } from '../data/managerDemo.js';
import { STAFF_DEMO_KEYS } from '../services/staffDemoAdapter.js';
import './managerControl.css';
import './staffOperations.css';
import './managerSimplified.css';
import { saveLocalProof } from './staffProofStorage.js';

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
export default function ManagerSimplified({page,go,orders,availability,onOpenOrder,onFinishManagerRefill,onClaimManagerRefill,onNotice,isOwner=false}){
 const [staffOrders,setStaffOrders]=useState(()=>readList(STAFF_DEMO_KEYS.orders));
 const [staffTrips,setStaffTrips]=useState(()=>readList(STAFF_DEMO_KEYS.trips));
 const [staffTask,setStaffTask]=useState('');
 const [confirmRefill,setConfirmRefill]=useState('');
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('All');
 const [queueCategoryOpen,setQueueCategoryOpen]=useState(false);
 const [queueFilterOpen,setQueueFilterOpen]=useState(false);
 const [queueStatus,setQueueStatus]=useState('all');
 const [queueSort,setQueueSort]=useState('oldest');
 const [person,setPerson]=useState('');
 const [history,setHistory]=useState(()=>readList('aquabest-manager-refill-activity-v2'));
 const actor=isOwner?'Super Admin':'Manager';
 const [ownerAction,setOwnerAction]=useState(null);
 const [ownerCollectionQty,setOwnerCollectionQty]=useState('');
 const [ownerCollectionCondition,setOwnerCollectionCondition]=useState('Good');
 const [ownerActionError,setOwnerActionError]=useState('');
 const [ownerDeliveryPhoto,setOwnerDeliveryPhoto]=useState(null);
 const [ownerDeliveryCash,setOwnerDeliveryCash]=useState('');
 const [ownerDeliveryRemarks,setOwnerDeliveryRemarks]=useState('');
 const [ownerDeliverySaving,setOwnerDeliverySaving]=useState(false);
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
 const filtered=queue.filter(o=>(filter==='All'||group(o.stage)===filter)&&
   (queueStatus==='all'||(queueStatus==='available'&&['waiting','collection','pending','ready','pickup'].includes(o.stage)&&!o.claimedBy)||(queueStatus==='inprogress'&&['collectionClaimed','collectionTransit','refilling','delivery','out'].includes(o.stage))||(queueStatus==='finished'&&isFinished(o)))&&
   [o.id,o.customer,o.address,o.customerReference,o.claimedBy,o.refilledBy,o.deliveredBy,o.source].join(' ').toLowerCase().includes(query.toLowerCase()))
  .sort((a,b)=>{const x=Date.parse(a.createdAtISO||a.date||a.createdAt||'')||0,y=Date.parse(b.createdAtISO||b.date||b.createdAt||'')||0;return queueSort==='newest'?y-x:x-y;});
 const queueCategories=[
  {id:'All',label:'All',Icon:FiClipboard},
  {id:'Collection',label:'Collect',Icon:FiPackage},
  {id:'Refill',label:'Refill',Icon:FiDroplet},
  {id:'Delivery',label:'Delivery',Icon:FiTruck},
  {id:'Pickup',label:'Pickup',Icon:FiCheckCircle},
  {id:'Waiting',label:'Awaiting Confirmation',Icon:FiClipboard},
  {id:'Completed',label:'Completed',Icon:FiCheckCircle},
  {id:'Issues',label:'Issues',Icon:FiAlertCircle}
 ];
 const categoryCount=id=>id==='All'?queue.length:queue.filter(o=>group(o.stage)===id).length;
 const chosenCategory=queueCategories.find(x=>x.id===filter)||queueCategories[0];
 const openQueueCategory=()=>{setQueueCategoryOpen(v=>!v);setQueueFilterOpen(false);};
 const openQueueFilter=()=>{setQueueFilterOpen(v=>!v);setQueueCategoryOpen(false);};
 const paymentBadge=o=>o.paymentStatus==='Paid'?'Paid · '+(o.service==='Pickup'?'Pickup':o.address||'Delivery'):(o.paymentMethod==='GCash'?'GCash pending':'COD')+' · '+(o.service==='Pickup'?'Pickup':o.address||'Delivery');
 const assigned=o=>o.claimedBy||o.deliveredBy||o.collectedBy||o.refilledBy||o.assigned||'Not claimed';
 const openOrder=o=>{if(o.sourceWorkspace==='manager')onOpenOrder(o);else setStaffTask(o.id);};
 const saveStaffOrder=(id,patch,message)=>{
  const latest=readList(STAFF_DEMO_KEYS.orders);
  const current=latest.find(x=>x.id===id);
  if(!current){onNotice('This task is no longer available. Refresh the queue.');refresh();return false;}
  const next=latest.map(x=>x.id===id?{...x,...patch,updatedAt:dateLabel()}:x);
  if(!writeList(STAFF_DEMO_KEYS.orders,next)){onNotice('Unable to save this change in the current browser.');return false;}
  setStaffOrders(next);
  if(message)onNotice(message);
  return true;
 };
 const claimRefill=o=>{
  if(o.stage!=='pending'||o.claimedBy)return;
  if(o.sourceWorkspace==='manager'){onClaimManagerRefill(o.id,actor);onNotice(actor+' claimed refill in the demo queue.');return;}
  saveStaffOrder(o.id,{stage:'refilling',claimedBy:actor,refillClaimedAt:dateLabel()},actor+' claimed refill on this browser only.');
 };
 const finishRefill=()=>{
  const o=queue.find(x=>x.id===confirmRefill);
  if(!o||o.stage!=='refilling'||o.claimedBy!==actor)return;
  if(o.sourceWorkspace==='manager'){onFinishManagerRefill(o.id,actor);}
  else if(!saveStaffOrder(o.id,{stage:o.service==='Pickup'?'pickup':'ready',claimedBy:null,refilledBy:actor,refillCompletedAt:dateLabel(),refillCompletedAtISO:new Date().toISOString()},actor+' completed refill on this browser only.'))return;
  const activity={id:Date.now()+'-'+o.id,orderId:o.id,employee:actor,action:'Refill completed',quantity:quantity(o),at:dateLabel()};
  setHistory(prev=>{const next=[activity,...prev].slice(0,120);writeList('aquabest-manager-refill-activity-v2',next);return next;});
  setConfirmRefill('');setStaffTask('');
  onNotice(actor+' completed refill. No cross-device sync.');
 };
 const claimCollection=o=>{
  if(!isOwner||o.sourceWorkspace!=='staff'||o.stage!=='collection'||o.claimedBy)return;
  saveStaffOrder(o.id,{stage:'collectionClaimed',claimedBy:actor,collectedBy:actor,collectionClaimedAt:dateLabel()},'Collection task claimed by Super Admin on this browser.');
 };
 const claimDelivery=o=>{
  if(!isOwner||o.sourceWorkspace!=='staff'||o.stage!=='ready'||o.claimedBy)return;
  saveStaffOrder(o.id,{stage:'delivery',claimedBy:actor,deliveryClaimedAt:dateLabel()},'Delivery task claimed by Super Admin on this browser.');
 };
 const openOwnerCollection=(o,mode)=>{
  setOwnerAction({id:o.id,type:mode==='site'?'collectionSite':'collectionStation'});
  setOwnerCollectionQty(String(mode==='site'?quantity(o):(o.collectedQty??quantity(o))));
  setOwnerCollectionCondition(o.containerCondition||'Good');
  setOwnerActionError('');
 };
 const saveOwnerCollection=()=>{
  const o=queue.find(x=>x.id===ownerAction?.id);
  const value=Number(ownerCollectionQty);
  if(!o)return;
  if(!Number.isInteger(value)||value!==quantity(o)){setOwnerActionError('The quantity must match the expected gallons. If there is a shortage or damaged container, record it for follow-up instead of confirming a match.');return;}
  if(ownerAction.type==='collectionSite'){
   const saved=saveStaffOrder(o.id,{stage:'collectionTransit',collectedQty:value,containerCondition:ownerCollectionCondition,collectedAt:dateLabel()},'Collection recorded. Return the empty containers to the station.');
   if(saved)setOwnerAction(null);
   return;
  }
  if(value!==Number(o.collectedQty)){setOwnerActionError('The quantity received at the station must match the collection record.');return;}
  const saved=saveStaffOrder(o.id,{stage:'pending',claimedBy:null,receivedAtStation:dateLabel(),stationReceivedQty:value,containerCondition:ownerCollectionCondition},'Containers received at the station. The order is now in the refill queue.');
  if(saved)setOwnerAction(null);
 };
 const dispatchOwnerDelivery=o=>{
  if(!isOwner||o.sourceWorkspace!=='staff'||o.stage!=='delivery'||o.claimedBy!==actor)return;
  const latestOrders=readList(STAFF_DEMO_KEYS.orders),current=latestOrders.find(x=>x.id===o.id);
  if(!current||current.stage!=='delivery'||current.claimedBy!==actor){onNotice('This delivery was already changed. Refresh the queue.');refresh();return;}
  const latestTrips=readList(STAFF_DEMO_KEYS.trips);
  const active=latestTrips.find(t=>t.status==='active');
  const tripId=active?.id||'TRIP-'+Date.now();
  const nextTrips=active?latestTrips.map(t=>t.id===tripId?{...t,orderIds:[...new Set([...(t.orderIds||[]),o.id])]}:t):[...latestTrips,{id:tripId,orderIds:[o.id],startedAt:new Date().toISOString(),status:'active'}];
  const nextOrders=latestOrders.map(x=>x.id===o.id?{...x,stage:'out',tripId,dispatchedAt:dateLabel(),updatedAt:dateLabel()}:x);
  if(!writeList(STAFF_DEMO_KEYS.trips,nextTrips)||!writeList(STAFF_DEMO_KEYS.orders,nextOrders)){onNotice('Could not save the delivery trip in this browser.');return;}
  setStaffTrips(nextTrips);setStaffOrders(nextOrders);onNotice('Delivery started. Confirm the customer handover and save photo proof before marking it complete.');
 };
 const openOwnerDelivery=(o)=>{setOwnerAction({id:o.id,type:'delivery'});setOwnerDeliveryPhoto(null);setOwnerDeliveryCash('');setOwnerDeliveryRemarks('');setOwnerActionError('');};
 const saveOwnerDelivery=async()=>{
  const o=queue.find(x=>x.id===ownerAction?.id);
  if(!o||o.sourceWorkspace!=='staff'||o.stage!=='out'||o.claimedBy!==actor)return;
  if(!ownerDeliveryPhoto){setOwnerActionError('Choose a delivery photo before completion.');return;}
  const cash=Number(ownerDeliveryCash);
  if(ownerDeliveryCash.trim()===''||!Number.isFinite(cash)||cash<0){setOwnerActionError('Enter the actual COD cash collected (use 0 if no cash was collected).');return;}
  setOwnerDeliverySaving(true);setOwnerActionError('');
  try{
   await saveLocalProof(o.id,ownerDeliveryPhoto);
   const latest=readList(STAFF_DEMO_KEYS.orders),current=latest.find(x=>x.id===o.id);
   if(!current||current.stage!=='out'||current.claimedBy!==actor){setOwnerActionError('The order changed before it could be completed. Photo remains saved on this device; refresh and review the order.');return;}
   const next=latest.map(x=>x.id===o.id?{...x,stage:'delivered',deliveredBy:actor,deliveredAt:dateLabel(),cashCollected:cash,podRecorded:true,proofStorage:'indexeddb',proofSavedAt:new Date().toISOString(),remarks:ownerDeliveryRemarks,remittance:'Pending manager verification',updatedAt:dateLabel()}:x);
   if(!writeList(STAFF_DEMO_KEYS.orders,next)){setOwnerActionError('Photo was saved, but the order update could not be saved in this browser. Do not repeat the delivery; refresh and review it.');return;}
   setStaffOrders(next);setOwnerAction(null);onNotice('Delivery completed with photo proof and cash record saved on this device only.');
  }catch(error){setOwnerActionError(error?.message||'Could not save delivery proof. The order was not marked complete.');}
  finally{setOwnerDeliverySaving(false);}
 };
 const reportOwnerDeliveryIssue=o=>{
  const reason=window.prompt('What happened with this delivery? Enter a reason; this will not mark it delivered.');
  if(reason===null)return;
  if(!reason.trim()){onNotice('Enter an issue reason before reporting.');return;}
  saveStaffOrder(o.id,{stage:'failed',issueReason:reason.trim(),failedAt:dateLabel()},'Delivery issue recorded for '+o.id+'. Review it before ending the trip.');
 };
 const confirmOwnerPickup=o=>{
  if(!isOwner||o.sourceWorkspace!=='staff'||o.stage!=='pickup')return;
  if(!window.confirm('Confirm that the customer received '+o.id+'?'))return;
  saveStaffOrder(o.id,{stage:'picked',releasedBy:actor,releasedAt:dateLabel()},'Customer pickup confirmed on this browser.');
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
 const people=[...new Set([...Object.keys(availability).filter(n=>!['Owner','Manager','Super Admin'].includes(n)),...queue.flatMap(o=>[o.claimedBy,o.collectedBy,o.refilledBy,o.deliveredBy,o.releasedBy]).filter(Boolean),...events.map(e=>e.employee)])].filter(n=>n!=='Manager'&&n!=='Super Admin');
 const staffTasks=name=>queue.filter(o=>assigned(o)===name&&!isFinished(o)&&o.stage!=='failed');
 const personEvents=name=>events.filter(x=>x.employee===name);
 const pickups=queue.filter(o=>o.collectionRequired||['collection','collectionClaimed','collectionTransit'].includes(o.stage));
 const pickupExpected=pickups.reduce((n,o)=>n+quantity(o),0);
 const pickupActual=pickups.reduce((n,o)=>n+(o.collectedQty==null?0:Number(o.collectedQty)||0),0);
 const trips=staffTrips.map(t=>({...t,orders:queue.filter(o=>o.tripId===t.id||(Array.isArray(t.orderIds)&&t.orderIds.includes(o.id)))}));
 const cards=(list,empty)=><div className="manager-simple-cards staffapp manager-staff-queue">{list.length?list.map(o=><article className={'staffapp-order manager-staff-order staffapp-type-'+(group(o.stage)==='Collection'?'collection':group(o.stage)==='Refill'?'refill':group(o.stage)==='Pickup'?'pickup':'delivery')+' manager-simple-'+group(o.stage).toLowerCase()} key={o.id}>
  <div className="staffapp-compact-row staffapp-compact-head"><div className="staffapp-compact-identity"><strong>{o.id} <span className="staffapp-id-divider">·</span> {o.customer}</strong></div><span className="staffapp-payment-badge" title={paymentBadge(o)}>{paymentBadge(o)}</span></div>
  <div className="staffapp-compact-row staffapp-compact-meta"><span>{o.items?orderSummary(o.items):quantity(o)+' gallons'} · {o.address||o.customerReference||o.service||'Walk-in'}</span><span>{o.createdAt||o.date||'—'}</span></div>
  <div className="manager-staff-state"><small>{STATUS[o.stage]||o.stage} · {assigned(o)}</small></div>
  <div className="staffapp-compact-row staffapp-compact-actions"><button className="staffapp-secondary" onClick={()=>openOrder(o)}>Details <FiChevronDown/></button>
   {isOwner&&o.sourceWorkspace==='staff'&&o.stage==='collection'&&!o.claimedBy&&<button className="staffapp-primary" onClick={()=>claimCollection(o)}>Claim Collect</button>}
   {isOwner&&o.sourceWorkspace==='staff'&&o.stage==='collectionClaimed'&&o.claimedBy===actor&&<button className="staffapp-primary" onClick={()=>openOwnerCollection(o,'site')}>Confirm Collection</button>}
   {isOwner&&o.sourceWorkspace==='staff'&&o.stage==='collectionTransit'&&o.claimedBy===actor&&<button className="staffapp-primary" onClick={()=>openOwnerCollection(o,'station')}>Received at Station</button>}
   {o.stage==='pending'&&!o.claimedBy&&<button className="staffapp-primary" onClick={()=>claimRefill(o)}>Claim Refill</button>}
   {o.stage==='refilling'&&o.claimedBy===actor&&<button className="staffapp-primary" onClick={()=>setConfirmRefill(o.id)}>Complete Refill</button>}
   {isOwner&&o.sourceWorkspace==='staff'&&o.stage==='ready'&&!o.claimedBy&&<button className="staffapp-primary" onClick={()=>claimDelivery(o)}>Claim Delivery</button>}
   {isOwner&&o.sourceWorkspace==='staff'&&o.stage==='delivery'&&o.claimedBy===actor&&<button className="staffapp-primary" onClick={()=>dispatchOwnerDelivery(o)}>Out for Delivery</button>}
   {isOwner&&o.sourceWorkspace==='staff'&&o.stage==='out'&&o.claimedBy===actor&&<><button className="staffapp-primary" onClick={()=>openOwnerDelivery(o)}><FiCamera/> Confirm Delivery</button><button className="staffapp-secondary" onClick={()=>reportOwnerDeliveryIssue(o)}>Report Issue</button></>}
   {isOwner&&o.sourceWorkspace==='staff'&&o.stage==='pickup'&&<button className="staffapp-primary" onClick={()=>confirmOwnerPickup(o)}>Confirm Pickup</button>}
  </div>
 </article>):<p className="manager-control-empty">{empty}</p>}</div>;
 return <div className="manager-control manager-simple">
  {page==='dashboard'&&<>
   <div className="manager-control-title"><span>{isOwner?'SUPER ADMIN WORKSPACE':'MANAGER WORKSPACE'}</span><h1>{isOwner?'Business Overview':'Station Overview'}</h1><p>Today's workload, team activity and issues at a glance.</p></div>
   <div className="manager-control-kpis"><Metric label="Pending Orders" value={pending.length} Icon={FiClipboard}/><Metric label="In Progress" value={queue.filter(o=>['collectionClaimed','collectionTransit','refilling','delivery','out'].includes(o.stage)).length} Icon={FiDroplet}/><Metric label="Out for Delivery" value={queue.filter(o=>o.stage==='out').length} Icon={FiTruck}/><Metric label="Issues to Review" value={issues.length} Icon={FiAlertCircle}/></div>
   <div className="manager-control-actions"><button onClick={()=>go('queue')}><FiClipboard/> Operations Queue <FiArrowRight/></button><button onClick={()=>go('staff')}><FiUsers/> Staff Monitoring <FiArrowRight/></button><button onClick={()=>go('collections')}><FiTruck/> Trips & Pickups <FiArrowRight/></button><button onClick={()=>go('verification')}><FiCheckCircle/> Delivery Verification <FiArrowRight/></button></div>
   <div className="manager-control-sectionhead"><h2>Delivery Checks</h2><button onClick={()=>go('verification')}>Review results <FiArrowRight/></button></div>
   <p className="manager-control-help">Check delivered orders, missing gallons and unsuccessful visits. Cash remittance stays in More.</p>
   <div className="manager-control-sectionhead"><h2>Work in Progress</h2><button onClick={()=>go('queue')}>View All <FiArrowRight/></button></div>
   {cards(pending.slice(0,3),'No active tasks in the current demo.')}
   {issues.length>0&&<><h2>Needs Attention</h2>{cards(issues.slice(0,2),'')}</>}
   <p className="manager-control-help">This is a browser demo, not live cross-device monitoring. {fromStaff?'Showing Staff records saved in this browser.':'Showing Manager sample orders; no saved Staff queue in this browser.'}</p>
  </>}
  {page==='queue'&&<section className="manager-queue-page staffapp">
   <div className="staffapp-title manager-queue-title"><div><h1>Operations Queue</h1><p>Refill, delivery & customer pickup</p></div><span className="staffapp-demo">Demo · This device only</span></div>
   <div className="staffapp-filter-controls">
    <div className="staffapp-category-wrap">
     <button type="button" className="staffapp-category-trigger" aria-expanded={queueCategoryOpen} aria-haspopup="listbox" onClick={openQueueCategory}>
      <chosenCategory.Icon aria-hidden="true"/><span className="staffapp-category-name">{chosenCategory.label} ({categoryCount(chosenCategory.id)})</span><FiChevronDown className="staffapp-category-chevron" aria-hidden="true"/>
      {queueCategories.filter(c=>c.id!==filter&&c.id!=='All'&&categoryCount(c.id)>0).length>0&&<span className="staffapp-category-alert" aria-label="Tasks in other categories">{queueCategories.filter(c=>c.id!==filter&&c.id!=='All'&&categoryCount(c.id)>0).length}</span>}
     </button>
     {queueCategoryOpen&&<div className="staffapp-category-menu" role="listbox" aria-label="Select work category"><p className="staffapp-menu-hint">Choose a category to view its orders.</p>{queueCategories.map(c=><button type="button" role="option" aria-selected={filter===c.id} key={c.id} onClick={()=>{setFilter(c.id);setQueueCategoryOpen(false);setQuery('');setQueueStatus('all')}}><c.Icon aria-hidden="true"/><span>{c.label}</span><span className="staffapp-category-option-count">{categoryCount(c.id)}</span>{filter===c.id&&<FiCheck aria-label="Selected"/>}</button>)}</div>}
    </div>
    <button type="button" className="staffapp-filter-trigger" aria-expanded={queueFilterOpen} onClick={openQueueFilter}><FiFilter aria-hidden="true"/> Filter{(queueStatus!=='all'||queueSort!=='oldest')&&<span className="manager-queue-filter-dot" aria-label="Filters active"/>}</button>
   </div>
   {queueFilterOpen&&<div className="manager-queue-filter-panel"><div className="manager-queue-filter-heading"><strong>Filter & Sort</strong><button type="button" aria-label="Close filters" onClick={()=>setQueueFilterOpen(false)}><FiX/></button></div>
    <label>Status<select value={queueStatus} onChange={e=>setQueueStatus(e.target.value)}><option value="all">All statuses</option><option value="available">Available / Unclaimed</option><option value="inprogress">In progress</option><option value="finished">Completed</option></select></label>
    <label>Order<select value={queueSort} onChange={e=>setQueueSort(e.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label>
    <div className="manager-queue-filter-actions"><button onClick={()=>{setQueueStatus('all');setQueueSort('oldest')}}>Reset</button><button onClick={()=>setQueueFilterOpen(false)}>Apply</button></div>
   </div>}
   <label className="staffapp-search"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search order, customer or address" aria-label="Search orders"/></label>
   <div className="manager-queue-results">{cards(filtered,'No matching orders. Try another queue or search.')}</div>
   <p className="manager-control-help manager-queue-note">{isOwner?'Super Admin can claim collection, refill and delivery work, and confirm customer pickups. Delivery completion requires a photo and a cash record. All changes are saved on this browser only.':'Manager can only claim Pending Refill and complete their own refill tasks. Collection and Delivery remain view-only. Changes are saved on this browser, not other employees\' devices.'}</p>
  </section>}
  {page==='collections'&&<>
   <div className="manager-control-title"><span>{isOwner?'SUPER ADMIN OPERATIONS':'DELIVERY OPERATIONS'}</span><h1>Trips & Pickups</h1><p>{isOwner?'Review delivery trips, customer collections and recorded quantity differences.':'Staff records each customer stop. Manager reviews the trip and collection results—no separate manual batch counting.'}</p></div>
   <div className="manager-control-kpis"><Metric label="Pickup Orders" value={pickups.length} Icon={FiClipboard}/><Metric label="Expected Gallons" value={pickupExpected} Icon={FiPackage}/><Metric label="Collected Recorded" value={pickupActual} Icon={FiCheckCircle}/><Metric label="Trips Recorded" value={trips.length} Icon={FiTruck}/></div>
   <h2>Delivery Trips</h2>
   {trips.length?trips.slice().reverse().map(t=><article className="manager-control-panel" key={t.id}><div className="manager-control-order-head"><strong>{t.name||t.id}</strong><span className="manager-control-tag">{t.status||'Trip'}</span></div><p className="manager-control-help">{t.orders.length} linked stops · {t.orders.filter(o=>o.stage==='delivered').length} delivered · {t.orders.filter(o=>o.stage==='failed').length} with issues</p>{t.orders.map(o=><div className="manager-simple-triprow" key={o.id}><span>{o.customer} · {quantity(o)} gallons</span><strong>{STATUS[o.stage]||o.stage}</strong></div>)}</article>):<div className="manager-control-panel"><p className="manager-control-empty">No trips have been dispatched in this browser. Trips will appear here once Staff creates them.</p></div>}
   <h2>Customer Collection Results</h2>
   {pickups.length?pickups.map(o=><article className="manager-control-panel" key={o.id}><div className="manager-control-order-head"><strong>{o.customer} · {o.id}</strong><span className="manager-control-tag">{STATUS[o.stage]||o.stage}</span></div><p className="manager-control-help">{o.address||o.customerReference||'Address not recorded'}</p><div className="manager-control-compare"><div><span>Expected</span><strong>{quantity(o)}</strong></div><div><span>Collected recorded</span><strong>{o.collectedQty??'—'}</strong></div><div><span>Difference</span><strong>{o.collectedQty==null?'—':quantity(o)-Number(o.collectedQty)}</strong></div></div>{o.issueReason&&<p className="manager-control-reason">{o.issueReason}</p>}</article>):<p className="manager-control-empty">No collection tasks available in the current demo.</p>}
   <p className="manager-control-help">Results come from Staff records in this browser only. Proof photos stored in Staff IndexedDB are not displayed here; do not treat this summary as verified proof.</p>
  </>}
  {page==='staff'&&<>
   <div className="manager-control-title"><span>{isOwner?'SUPER ADMIN TEAM VIEW':'TEAM COORDINATION'}</span><h1>Staff Monitoring</h1><p>See unfinished work, completed tasks and recorded activity for each employee.</p></div>
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
    <p>Confirm that all gallons for <strong>{queue.find(x=>x.id===confirmRefill)?.customer}</strong> are physically refilled and sealed. This updates the order stage and records <strong>{actor}</strong> as the refiller. Only {actor}-claimed refills can be completed.</p>
    <p className="manager-control-help">This is a local demo update, not a server-authorized action.</p>
    <button className="manager-control-primary" onClick={finishRefill}>Confirm Refill Completed</button>
   </>:selectedTask&&<><p><strong>{selectedTask.id} · {selectedTask.customer}</strong></p><p>Status: {STATUS[selectedTask.stage]||selectedTask.stage}</p><p>Quantity: {quantity(selectedTask)} gallons</p><p>Assigned/Claimed: {assigned(selectedTask)}</p><p>{selectedTask.address||selectedTask.notes||'No additional details recorded.'}</p></>}
  </section></div>}
  {ownerAction&&<div className="manager-simple-overlay" role="presentation" onClick={()=>{if(!ownerDeliverySaving)setOwnerAction(null);}}><section className="manager-simple-sheet" role="dialog" aria-modal="true" aria-label={ownerAction.type.startsWith('collection')?'Collection confirmation':'Delivery confirmation'} onClick={e=>e.stopPropagation()}>
   <div className="manager-control-order-head"><h2>{ownerAction.type==='collectionSite'?'Confirm Customer Collection':ownerAction.type==='collectionStation'?'Confirm Return to Station':'Confirm Delivery'}</h2><button className="manager-control-secondary" disabled={ownerDeliverySaving} onClick={()=>setOwnerAction(null)}>Close</button></div>
   <p><strong>{queue.find(x=>x.id===ownerAction.id)?.id} · {queue.find(x=>x.id===ownerAction.id)?.customer}</strong></p>
   {ownerAction.type.startsWith('collection')?<>
    <p className="manager-control-help">Expected quantity: {quantity(queue.find(x=>x.id===ownerAction.id)||{})} gallons. Record the actual count before confirming.</p>
    <label className="manager-control-field"><span>{ownerAction.type==='collectionSite'?'Gallons collected from customer':'Gallons received at station'}</span><input type="number" min="0" step="1" inputMode="numeric" value={ownerCollectionQty} onChange={e=>{setOwnerCollectionQty(e.target.value);setOwnerActionError('');}}/></label>
    <label className="manager-control-field"><span>Container condition</span><select value={ownerCollectionCondition} onChange={e=>setOwnerCollectionCondition(e.target.value)}><option>Good</option><option>Damaged</option><option>Needs Cleaning</option></select></label>
    {ownerActionError&&<p className="manager-control-error" role="alert">{ownerActionError}</p>}
    <button className="manager-control-primary" onClick={saveOwnerCollection}>{ownerAction.type==='collectionSite'?'Save Collection & Return to Station':'Confirm Received at Station'}</button>
   </>:<>
    <p className="manager-control-help">A delivery is not complete until the customer handover is recorded with photo proof. Enter 0 for cash if no COD cash was collected.</p>
    <label className="manager-control-field"><span>Delivery photo (required)</span><input type="file" accept="image/*" capture="environment" onChange={e=>{setOwnerDeliveryPhoto(e.target.files?.[0]||null);setOwnerActionError('');}}/></label>
    <label className="manager-control-field"><span>Actual COD cash collected (₱)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={ownerDeliveryCash} onChange={e=>{setOwnerDeliveryCash(e.target.value);setOwnerActionError('');}} placeholder="0.00"/></label>
    <label className="manager-control-field"><span>Delivery note (optional)</span><textarea value={ownerDeliveryRemarks} onChange={e=>setOwnerDeliveryRemarks(e.target.value)} placeholder="Customer handover or delivery note"/></label>
    {ownerActionError&&<p className="manager-control-error" role="alert">{ownerActionError}</p>}
    <button className="manager-control-primary" disabled={ownerDeliverySaving} onClick={saveOwnerDelivery}>{ownerDeliverySaving?'Saving proof…':'Save Photo & Confirm Delivery'}</button>
   </>}
   <p className="manager-control-help">Demo only: proof and task updates stay in this browser. No server or other phone is updated.</p>
  </section></div>}
 </div>;
}
