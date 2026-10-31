import { useState } from 'react';
import { FiTruck, FiPackage, FiCreditCard, FiClock, FiCheckCircle, FiArrowRight, FiAlertTriangle, FiMapPin, FiFileText, FiRefreshCcw, FiHistory } from 'react-icons/fi';
import { formatMoney } from '../data/managerDemo.js';

// Demo trips only. Vehicle/route details and addresses are intentionally not fabricated as live data.
export const INITIAL_DELIVERY_TRIPS=[
 {id:'TRIP-001',orderId:'AB-1039',customer:'Sarah Lim',contact:'Sample contact not available',address:'Address pending validation',items:'3 × 5 Gallons (Slim)',status:'Out for Delivery',payment:'Paid',amount:105,driver:'Driver A',bottlesLoaded:3,emptiesCollected:0,collected:0,remittance:'Not required',notes:'Demo record'},
 {id:'TRIP-002',orderId:'AB-1047',customer:'Demo Customer A',contact:'Sample contact not available',address:'Address pending validation',items:'2 × 5 Gallons (Round)',status:'Assigned',payment:'Cash on Delivery',amount:70,driver:'Driver A',bottlesLoaded:0,emptiesCollected:0,collected:0,remittance:'Not collected',notes:'Customer-owned container delivery'},
 {id:'TRIP-003',orderId:'AB-1048',customer:'Demo Customer B',contact:'Sample contact not available',address:'Address pending validation',items:'1 × 2.5 Gallons (Slim)',status:'Ready for Dispatch',payment:'Cash on Delivery',amount:20,driver:'Driver A',bottlesLoaded:0,emptiesCollected:0,collected:0,remittance:'Not collected',notes:'Customer-owned container delivery'}
];
const TRIP_STEPS=['Assigned','Ready for Dispatch','Loaded','Out for Delivery','Delivered'];
const terminal=['Delivered','Failed Delivery','Returned to Station'];
function Summary({title,value,Icon}){return <div className="mgmt-stat"><div className="mgmt-stat-top"><span>{title}</span><Icon size={17}/></div><strong>{value}</strong></div>}
function Title({tag,title,description}){return <div className="mgmt-heading"><div className="overline">{tag}</div><h1>{title}</h1><p>{description}</p></div>}
function Label({children}){return <span className="mgmt-pill">{children}</span>}
export default function DeliveryOperations({page,go,trips,setTrips,driver='Driver A',onMessage}){
 const [selected,setSelected]=useState(null);
 const [tab,setTab]=useState('Active');
 const [bottleCount,setBottleCount]=useState('0');
 const [actionReason,setActionReason]=useState('');
 const [collectionAmount,setCollectionAmount]=useState('');
 const [collectionRef,setCollectionRef]=useState('');
 const [bottleLog,setBottleLog]=useState([]);
 const [collectionLog,setCollectionLog]=useState([]);
 const [workHistory,setWorkHistory]=useState([]);
 const mine=trips.filter(t=>t.driver===driver);
 const active=mine.filter(t=>!terminal.includes(t.status));
 const completed=mine.filter(t=>terminal.includes(t.status));
 const cashToRemit=mine.reduce((sum,t)=>sum+(t.remittance==='Awaiting Remittance'?t.collected:0),0);
 const chosen=mine.find(t=>t.id===selected);
 const open=(id)=>{setSelected(id);setBottleCount('0');setActionReason('');setCollectionAmount('');setCollectionRef('')};
 const update=(id,patch,description)=>{
  setTrips(old=>old.map(t=>t.id===id?{...t,...patch}:t));
  setWorkHistory(old=>[{id:Date.now()+'-'+old.length,description,time:new Date().toLocaleString('en-PH')},...old]);
  onMessage(description+' (demo only)');
 };
 const transition=(trip,next)=>{
  const current=TRIP_STEPS.indexOf(trip.status),index=TRIP_STEPS.indexOf(next);
  if(index!==current+1)return;
  if(next==='Loaded'&&trip.bottlesLoaded===0){onMessage('Confirm loaded bottles in Bottle Handling before dispatch.');return}
  if(next==='Delivered'&&trip.payment==='Cash on Delivery'&&trip.collected<trip.amount){onMessage('Record full COD collection before marking delivered, or report an issue.');return}
  update(trip.id,{status:next},trip.orderId+' → '+next);setSelected(null);
 };
 const recordBottles=(trip,type)=>{
  const n=Number(bottleCount);
  if(!Number.isInteger(n)||n<1||n>100){onMessage('Enter a valid bottle count (1–100).');return}
  if(type==='loaded'&&trip.bottlesLoaded+n>100){onMessage('Check loaded bottle quantity.');return}
  const desc=type==='loaded'?'Filled bottles loaded':type==='empty'?'Empty bottles collected':'AquaBest-owned bottles returned';
  if(type==='returned'&&!actionReason.trim()){onMessage('Enter a return/handover note.');return}
  const patch=type==='loaded'?{bottlesLoaded:trip.bottlesLoaded+n}:type==='empty'?{emptiesCollected:trip.emptiesCollected+n}:{};
  update(trip.id,patch,desc+' ('+n+') for '+trip.orderId);
  setBottleLog(old=>[{id:Date.now(),trip:trip.id,description:desc,quantity:n,note:actionReason.trim(),time:new Date().toLocaleString('en-PH')},...old]);
  setBottleCount('0');setActionReason('');
 };
 const collect=(trip)=>{
  const amount=Number(collectionAmount);
  if(trip.payment!=='Cash on Delivery'||trip.collected>=trip.amount){onMessage('This order has no outstanding COD amount.');return}
  if(!Number.isFinite(amount)||amount<=0||amount>trip.amount-trip.collected){onMessage('Amount must be greater than zero and no more than outstanding COD.');return}
  const newTotal=trip.collected+amount;
  update(trip.id,{collected:newTotal,remittance:'Awaiting Remittance'},'Cash collected: '+formatMoney(amount)+' for '+trip.orderId);
  setCollectionLog(old=>[{id:Date.now(),trip:trip.id,amount,reference:collectionRef.trim(),time:new Date().toLocaleString('en-PH')},...old]);setCollectionAmount('');setCollectionRef('');
 };
 const card=trip=><article className="mgmt-card mgmt-order" key={trip.id}>
  <div className="mgmt-order-head"><strong>{trip.customer} · {trip.orderId}</strong><Label>{trip.status}</Label></div>
  <p>{trip.items}</p><p><FiMapPin/> {trip.address}</p>
  <div className="mgmt-order-actions"><span className="mgmt-sub">{trip.payment==='Paid'?'Paid (demo)':'COD '+formatMoney(trip.amount-trip.collected)+' due'}</span><button className="mgmt-btn secondary" onClick={()=>open(trip.id)}>View Details <FiArrowRight/></button></div>
 </article>;
 return <>
  {page==='dashboard'&&<>
   <Title tag="Delivery workspace" title="My Delivery Overview" description="Assigned trips, pickup and handover activity for today."/>
   <div className="mgmt-stats"><Summary title="Assigned Trips" value={mine.length} Icon={FiTruck}/><Summary title="Active Trips" value={active.length} Icon={FiClock}/><Summary title="Completed Trips" value={completed.length} Icon={FiCheckCircle}/><Summary title="Cash to Remit" value={formatMoney(cashToRemit)} Icon={FiCreditCard}/></div>
   <div className="mgmt-section-title"><h2>Quick Actions</h2></div><div className="mgmt-grid">
    <button className="mgmt-quick" onClick={()=>go('deliveries')}><FiTruck/> My Deliveries</button>
    <button className="mgmt-quick" onClick={()=>go('bottles')}><FiPackage/> Bottle Handling</button>
    <button className="mgmt-quick" onClick={()=>go('collections')}><FiCreditCard/> Collections</button>
    <button className="mgmt-quick" onClick={()=>go('history')}><FiHistory/> Trip History</button>
   </div>
   <div className="mgmt-section-title"><h2>Current Trips</h2><button className="mgmt-link" onClick={()=>go('deliveries')}>View All <FiArrowRight/></button></div>
   {active.map(card)}
  </>}
  {page==='deliveries'&&<>
   <Title tag="Delivery operations" title="My Deliveries" description="Only trips assigned to you. Confirm each handover and delivery stage."/>
   <div className="mgmt-controls">{['Active','Completed','All'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
   {(tab==='Active'?active:tab==='Completed'?completed:mine).map(card)}
   {!mine.length&&<div className="mgmt-card">No delivery trips have been assigned yet.</div>}
  </>}
  {page==='bottles'&&<>
   <Title tag="Container handover" title="Bottle Handling" description="Log loaded bottles, customer empties and AquaBest returns without double counting."/>
   <div className="mgmt-notice">Bottle movements are trip records only in this demo. Real inventory sync needs manager confirmation and Supabase.</div>
   {active.map(t=><div className="mgmt-card mgmt-order" key={t.id}><div className="mgmt-order-head"><strong>{t.orderId} · {t.customer}</strong><Label>{t.status}</Label></div><p>Loaded: {t.bottlesLoaded} · Collected empties: {t.emptiesCollected}</p><button className="mgmt-btn secondary" onClick={()=>open(t.id)}>Record Bottle Handover</button></div>)}
   <div className="mgmt-section-title"><h2>Recent Bottle Movements</h2></div><div className="mgmt-card">{bottleLog.length?bottleLog.map(l=><div className="mgmt-row" key={l.id}><div><strong className="mgmt-row-title">{l.description} · {l.trip}</strong><div className="mgmt-sub">{l.time} · {l.note||'No note'}</div></div><Label>× {l.quantity}</Label></div>):<p className="mgmt-sub">No bottle movements yet.</p>}</div>
  </>}
  {page==='collections'&&<>
   <Title tag="COD and remittances" title="Collections" description="Record money received from customers, then submit to the manager for confirmation."/>
   <div className="mgmt-stats"><Summary title="Cash to Remit" value={formatMoney(cashToRemit)} Icon={FiCreditCard}/><Summary title="Recorded Collections" value={collectionLog.length} Icon={FiFileText}/></div>
   {mine.filter(t=>t.payment==='Cash on Delivery').map(t=><article className="mgmt-card mgmt-order" key={t.id}><div className="mgmt-order-head"><strong>{t.orderId} · {t.customer}</strong><Label>{t.remittance}</Label></div><p>COD: {formatMoney(t.amount)} · Collected: {formatMoney(t.collected)}</p><button className="mgmt-btn secondary" onClick={()=>open(t.id)}>Review Collection</button></article>)}
   <button className="mgmt-btn full" disabled={!cashToRemit} onClick={()=>onMessage('Remittance request noted for demo. Manager receipt confirmation requires backend integration.')}>Submit Cash Remittance Request</button>
   <div className="mgmt-section-title"><h2>Collection Records</h2></div>
   <div className="mgmt-card">{collectionLog.length?collectionLog.map(l=><div className="mgmt-row" key={l.id}><div><strong className="mgmt-row-title">{l.trip} · {formatMoney(l.amount)}</strong><div className="mgmt-sub">{l.time} · {l.reference||'Cash received'}</div></div><Label>Collected</Label></div>):<p className="mgmt-sub">No new collections in this session.</p>}</div>
  </>}
  {page==='history'&&<>
   <Title tag="Read-only records" title="Delivery History" description="Completed, failed, and returned trips, plus your recent actions."/>
   {completed.length?completed.map(card):<div className="mgmt-card"><p className="mgmt-sub">No completed trips yet.</p></div>}
   <div className="mgmt-section-title"><h2>My Activity</h2></div><div className="mgmt-card">{workHistory.length?workHistory.map(h=><div className="mgmt-row" key={h.id}><div><strong className="mgmt-row-title">{h.description}</strong><div className="mgmt-sub">{h.time}</div></div></div>):<p className="mgmt-sub">No activity in this session yet.</p>}</div>
  </>}
  {page==='more'&&<>
   <Title tag="Delivery access" title="More Modules" description="Your trip support, payment and account tools."/>
   <div className="mgmt-more">
    {[[FiPackage,'Bottle Handling','bottles'],[FiCreditCard,'Collections','collections'],[FiHistory,'Delivery History','history'],[FiTruck,'My Deliveries','deliveries']].map(([Icon,label,target])=><button key={target} onClick={()=>go(target)}><Icon/><strong>{label}</strong><small>Open {label.toLowerCase()}</small></button>)}
   </div>
  </>}
  {selected&&chosen&&<div className="mgmt-drawer" role="presentation" onClick={()=>setSelected(null)}><div className="mgmt-sheet" role="dialog" aria-modal="true" aria-label="Trip details" onClick={e=>e.stopPropagation()}>
   <div className="mgmt-sheet-head"><h2>{chosen.orderId} · {chosen.customer}</h2><button className="mgmt-icobtn" aria-label="Close" onClick={()=>setSelected(null)}>✕</button></div>
   <p className="mgmt-sub">{chosen.items} · {chosen.address}</p><p className="mgmt-sub">{chosen.notes}</p><div className="mgmt-notice">Customer address and contact are demo placeholders. Navigation opens once real addresses are connected.</div>
   <button className="mgmt-btn secondary" disabled title="Awaiting verified address"><FiMapPin/> Open in Maps (Soon)</button>
   <div className="mgmt-section-title"><h2>Delivery Progress</h2></div>
   <div className="mgmt-progress">{TRIP_STEPS.map((step,i)=><div key={step} className={TRIP_STEPS.indexOf(chosen.status)>=i?'done':''}>{TRIP_STEPS.indexOf(chosen.status)>=i?<FiCheckCircle/>:<FiClock/>}{step}</div>)}</div>
   {TRIP_STEPS.indexOf(chosen.status)>=0&&TRIP_STEPS.indexOf(chosen.status)<TRIP_STEPS.length-1&&<button className="mgmt-btn full" style={{marginTop:12}} onClick={()=>transition(chosen,TRIP_STEPS[TRIP_STEPS.indexOf(chosen.status)+1])}><FiArrowRight/> Confirm: {TRIP_STEPS[TRIP_STEPS.indexOf(chosen.status)+1]}</button>}
   {chosen.status==='Out for Delivery'&&<div className="mgmt-field" style={{marginTop:12}}><label>Failed delivery reason</label><input value={actionReason} onChange={e=>setActionReason(e.target.value)} placeholder="e.g., Customer unavailable"/><button className="mgmt-btn secondary" disabled={!actionReason.trim()} onClick={()=>{update(chosen.id,{status:'Failed Delivery'},'Delivery failed: '+actionReason.trim());setSelected(null)}}><FiAlertTriangle/> Report Failed Delivery</button></div>}
   <div className="mgmt-section-title"><h2>Bottle Handover</h2></div>
   <p className="mgmt-sub">Loaded: {chosen.bottlesLoaded} · Empty bottles collected: {chosen.emptiesCollected}</p>
   {!terminal.includes(chosen.status)&&<><div className="mgmt-field"><label>Number of containers</label><input type="number" min="1" max="100" value={bottleCount} onChange={e=>setBottleCount(e.target.value)}/></div><div className="mgmt-field"><label>Handover / return note (required for returns)</label><input value={actionReason} onChange={e=>setActionReason(e.target.value)} placeholder="Notes about bottles"/></div>
   <div className="delivery-actions"><button className="mgmt-btn secondary" onClick={()=>recordBottles(chosen,'loaded')}><FiPackage/> Loaded</button><button className="mgmt-btn secondary" onClick={()=>recordBottles(chosen,'empty')}><FiRefreshCcw/> Empties</button><button className="mgmt-btn secondary" onClick={()=>recordBottles(chosen,'returned')}>Returned</button></div></>}
   {chosen.payment==='Cash on Delivery'&&chosen.collected<chosen.amount&&<><div className="mgmt-section-title"><h2>COD Collection</h2></div><p className="mgmt-sub">Outstanding: {formatMoney(chosen.amount-chosen.collected)}</p><div className="mgmt-field"><label>Cash collected</label><input type="number" min="0" value={collectionAmount} onChange={e=>setCollectionAmount(e.target.value)}/></div><div className="mgmt-field"><label>Reference / note (optional)</label><input value={collectionRef} onChange={e=>setCollectionRef(e.target.value)}/></div><button className="mgmt-btn full secondary" onClick={()=>collect(chosen)}><FiCreditCard/> Record Collection</button></>}
   <p className="mgmt-demo">Prototype only · No real delivery, customer contact, stock change or payment processing.</p>
  </div></div>}
 </>;
}
