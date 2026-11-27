import {useEffect,useState} from 'react';
import {FiBarChart2,FiUsers,FiDollarSign,FiCreditCard,FiSettings,FiShield,FiSave,FiClock,FiCheckCircle,FiActivity,FiPackage,FiTruck,FiClipboard,FiAlertTriangle,FiDroplet,FiMonitor} from 'react-icons/fi';
import {formatMoney} from '../data/managerDemo.js';
import EmployeeDirectory from './EmployeeDirectory.jsx';
import ProductCatalog from './ProductCatalog.jsx';
import SalesReports from './SalesReports.jsx';

// Only Owner-specific pages. POS, Orders, Delivery, Inventory and Payments reuse Manager pages.
function Title({eyebrow,title,description}){return <div className="mgmt-heading"><div className="overline">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>}
function Stat({title,value,Icon}){return <div className="mgmt-stat"><div className="mgmt-stat-top"><span>{title}</span><Icon size={17}/></div><strong>{value}</strong></div>}
const today=()=>new Date().toLocaleString('en-PH');
const STAFF_ORDERS_KEY='aquabest-staff-operations-demo-v1';
const STAFF_TRIPS_KEY='aquabest-staff-trips-demo-v1';
const readList=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}};
export default function OwnerOperations({page,go,orders,stock,trips,availability,onMessage,expenses,setExpenses}){
 const [settings,setSettings]=useState({deliveryFee:'0',lowStock:'15',hours:'Confirm operating hours with client'});
 const [draft,setDraft]=useState(settings);
 const [audit,setAudit]=useState([]);
 const [verification,setVerification]=useState([]);
 const [approvals,setApprovals]=useState([]);
 const [auditFilter,setAuditFilter]=useState('All');
 const [staffOrders,setStaffOrders]=useState(()=>readList(STAFF_ORDERS_KEY));
 const [staffTrips,setStaffTrips]=useState(()=>readList(STAFF_TRIPS_KEY));
 useEffect(()=>{const refresh=()=>{setStaffOrders(readList(STAFF_ORDERS_KEY));setStaffTrips(readList(STAFF_TRIPS_KEY));};window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);};},[]);
 const record=description=>{setAudit(old=>[{id:Date.now()+'-'+old.length,description,time:today()},...old]);onMessage(description+' (demo only)')};
 const paid=orders.filter(o=>o.paymentStatus==='Paid');
 const collected=paid.reduce((n,o)=>n+o.amount,0);
 const sales=orders.filter(o=>o.status!=='Cancelled').reduce((n,o)=>n+o.amount,0);
 const outstanding=orders.filter(o=>o.paymentStatus!=='Paid').reduce((n,o)=>n+o.amount,0);
 const remittance=trips.reduce((n,t)=>n+(t.remittance==='Awaiting Remittance'?t.collectedCash||0:0),0);
 const pendingElectronic=trips.filter(t=>t.paymentStatus==='Pending Verification'&&!verification.includes(t.id));
 const activity=orders.length+trips.length;
 const expenseTotal=expenses.filter(e=>e.active).reduce((n,e)=>n+e.amount,0);
 const operationalQueue=staffOrders.length?staffOrders:orders.map(o=>({...o,stage:({'Pending Confirmation':'waiting',Confirmed:'pending',Preparing:'refilling',Ready:'ready','Out for Delivery':'out',Delivered:'delivered',Completed:'picked',Cancelled:'failed'})[o.status]||'pending'}));
 const pendingCollection=operationalQueue.filter(o=>o.stage==='collection').length;
 const pendingRefill=operationalQueue.filter(o=>o.stage==='pending').length;
 const readyDelivery=operationalQueue.filter(o=>o.stage==='ready').length;
 const activeDelivery=operationalQueue.filter(o=>['delivery','out'].includes(o.stage)).length;
 const operationalIssues=operationalQueue.filter(o=>o.stage==='failed'||o.issueReason||o.issue).length;
 const activeOperationalTrips=staffTrips.length?staffTrips.filter(t=>t.status==='active').length:trips.filter(t=>!['Delivered','Failed Delivery','closed'].includes(t.status)).length;
 const action=(title,target)=><button className="mgmt-quick" onClick={()=>go(target)}>{title}</button>;
 const demo=<p className="mgmt-demo">Super Admin GUI prototype only • All values and access controls are local demo state. No real permissions, payments, expenses or pricing changes are applied to the business.</p>;
 return <>
 {page==='dashboard'&&<>
  <Title eyebrow="Executive overview" title="Super Admin Dashboard" description="Full business oversight, with access to help on any station operation."/>
  <div className="mgmt-stats"><Stat title="Sales (Demo)" value={formatMoney(sales)} Icon={FiBarChart2}/><Stat title="Verified Collected" value={formatMoney(collected)} Icon={FiDollarSign}/><Stat title="Unpaid / Unverified" value={formatMoney(outstanding)} Icon={FiClock}/><Stat title="Cash Pending Remittance" value={formatMoney(remittance)} Icon={FiCreditCard}/><Stat title="Active Expenses" value={formatMoney(expenseTotal)} Icon={FiCreditCard}/></div>
  <div className="mgmt-section-title"><h2>Live Queue Snapshot</h2><button className="mgmt-link" onClick={()=>go('queue')}>Open Operations Queue</button></div>
  <div className="mgmt-stats"><Stat title="Pending Collection" value={pendingCollection} Icon={FiTruck}/><Stat title="Pending Refill" value={pendingRefill} Icon={FiDroplet}/><Stat title="Ready Delivery" value={readyDelivery} Icon={FiPackage}/><Stat title="Active Delivery" value={activeDelivery} Icon={FiTruck}/></div>
  <div className="mgmt-notice">{operationalIssues} issue(s) need review · {activeOperationalTrips} active trip(s). Queue data is read from this browser only; it is not synced across phones.</div>
  <div className="mgmt-section-title"><h2>Business & Operations</h2></div><div className="mgmt-grid">{action('Operations Queue','queue')}{action('Staff Monitoring','staff')}{action('Trips & Pickups','collections')}{action('Sales & Reports','reports')}{action('Payments','payments')}{action('Employee Access','employees')}{action('Products & Services','products')}</div>
  <div className="mgmt-section-title"><h2>Business Snapshot</h2></div><div className="mgmt-card">
   <div className="mgmt-row"><span className="mgmt-sub">Recorded orders</span><strong>{orders.length}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Pending refill / preparation</span><strong>{orders.filter(o=>['Pending Confirmation','Confirmed','Preparing'].includes(o.status)).length}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Ready for pickup / delivery</span><strong>{orders.filter(o=>o.status==='Ready').length}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Active deliveries</span><strong>{activeDelivery}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Operational issues to review</span><strong>{operationalIssues}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Low stock items</span><strong>{stock.filter(s=>s.quantity<s.minimum).length}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Pending e-payment verification</span><strong>{pendingElectronic.length}</strong></div>
  </div>
  <div className="mgmt-section-title"><h2>Recent Transactions</h2><button className="mgmt-link" onClick={()=>go('orders')}>View Orders</button></div>
  <div className="mgmt-card">{orders.slice(0,4).map(o=><div className="mgmt-row" key={o.id}><div><div className="mgmt-row-title">{o.id} · {o.customer}</div><div className="mgmt-sub">{o.source} · {o.paymentStatus}</div></div><strong>{formatMoney(o.amount)}</strong></div>)}</div>{demo}
 </>}
 {page==='reports'&&<SalesReports orders={orders} expenses={expenses} setExpenses={setExpenses} onNotice={record} isOwner/>}
 {page==='employees'&&<EmployeeDirectory availability={availability} orders={orders} onEvent={record}/>}
  {page==='approvals'&&<>
  <Title eyebrow="Payment review" title="Payment Verification" description="Check submitted GCash/bank references and cash received from drivers."/>
  <div className="mgmt-notice">A reference number alone does not prove payment. Check the actual AquaBest account or physically count cash before acknowledging any transaction.</div>
  <div className="mgmt-section-title"><h2>GCash & Bank Transfers</h2></div>
  <div className="mgmt-card">{pendingElectronic.length?pendingElectronic.map(t=><div className="mgmt-row" key={t.id}><div><strong className="mgmt-row-title">{t.orderId} · {t.customer}</strong><p className="mgmt-sub">{t.paymentMethod} · {formatMoney(t.amount)} · Ref: {t.reference||'Missing'}</p><p className="mgmt-sub">Status: Pending verification</p></div><button className="mgmt-btn secondary" onClick={()=>{setVerification(old=>[...old,t.id]);record('Reviewed electronic payment proof for order '+t.orderId)}}>Mark Reviewed</button></div>):<div className="owner-empty"><FiCreditCard size={22}/><strong>No pending electronic payment proofs</strong><p>When a driver records a GCash or bank reference, it should appear here after the shared database is connected. This preview cannot verify real money.</p></div>}</div>
  <div className="mgmt-section-title"><h2>Cash Collected by Drivers</h2></div>
  <div className="mgmt-card">{trips.filter(t=>t.remittance==='Awaiting Remittance').length?trips.filter(t=>t.remittance==='Awaiting Remittance').map(t=><div className="mgmt-row" key={t.id}><div><strong className="mgmt-row-title">{t.orderId} · {t.driver}</strong><p className="mgmt-sub">{formatMoney(t.collectedCash||0)} collected · Pending handover</p></div><button className="mgmt-btn secondary" disabled={approvals.includes(t.id)} onClick={()=>{setApprovals(old=>[...old,t.id]);record('Reviewed pending cash remittance for order '+t.orderId)}}>{approvals.includes(t.id)?'Reviewed':'Mark Reviewed'}</button></div>):<div className="owner-empty"><FiDollarSign size={22}/><strong>No cash awaiting remittance</strong><p>Driver COD collections will be listed after delivery records synchronize with this workspace.</p></div>}</div>
  <div className="mgmt-notice">Mark Reviewed is a demo checklist only. It does not set an order to Paid or acknowledge a real remittance. Production verification requires validated bank/GCash transactions, counting cash, and an immutable audit trail.</div>{demo}
 </>}
  {page==='products'&&<ProductCatalog onEvent={record}/>}
 {page==='settings'&&<>
  <Title eyebrow="Configuration" title="Business Settings" description="Operating information, delivery fees and other business rules."/>
  <div className="mgmt-card"><strong>Store Operating Rules</strong><div className="mgmt-formgrid">{[['deliveryFee','Delivery fee (₱)'],['lowStock','Low-stock threshold'],['hours','Operating hours']].map(([key,l])=><div className="mgmt-field" key={key}><label>{l}</label><input value={draft[key]} onChange={e=>setDraft(old=>({...old,[key]:e.target.value}))}/></div>)}</div><div className="owner-actions"><button className="mgmt-btn" onClick={()=>{setSettings({...draft});record('Updated business operating settings')}}><FiSave/> Save Settings</button><button className="mgmt-btn secondary" onClick={()=>go('products')}>Manage Products & Prices</button></div><p className="mgmt-sub">Saved demo delivery fee: {settings.deliveryFee}</p></div>{demo}
 </>}
 {page==='audit'&&<>
  <Title eyebrow="Change history" title="Audit & Activity Logs" description="Who changed employee, product, payment or business settings, and when."/>
  <div className="mgmt-stats"><Stat title="Owner Actions" value={audit.length} Icon={FiShield}/><Stat title="Sample Operations" value={activity} Icon={FiActivity}/></div>
  <div className="mgmt-controls">{['All','Employees','Products','Expenses','Payments','Settings'].map(f=><button key={f} className={auditFilter===f?'active':''} onClick={()=>setAuditFilter(f)}>{f}</button>)}</div>
  <div className="mgmt-card">{audit.filter(e=>auditFilter==='All'||(auditFilter==='Employees'?/employee|profile|account|role/i.test(e.description):auditFilter==='Products'?/product/i.test(e.description):auditFilter==='Expenses'?/expense/i.test(e.description):auditFilter==='Payments'?/payment|remittance/i.test(e.description):/setting/i.test(e.description))).length?audit.filter(e=>auditFilter==='All'||(auditFilter==='Employees'?/employee|profile|account|role/i.test(e.description):auditFilter==='Products'?/product/i.test(e.description):auditFilter==='Expenses'?/expense/i.test(e.description):auditFilter==='Payments'?/payment|remittance/i.test(e.description):/setting/i.test(e.description))).map(e=><div className="mgmt-row" key={e.id}><div><strong className="mgmt-row-title">{e.description}</strong><p className="mgmt-sub">{e.time} · Demo Super Admin</p></div><FiCheckCircle color="#244ea3"/></div>):<div className="owner-empty"><FiShield size={22}/><strong>No changes found</strong><p>Try adding a product, updating an employee or recording an expense to generate demo audit activity.</p></div>}</div>
  <div className="mgmt-notice">For production, audit entries must be written server-side with employee identity and before/after values. Browser demo history is not tamper-proof.</div>{demo}
 </>}
  {page==='more'&&<>
  <Title eyebrow="Owner access" title="All Modules" description="Operational views and business administration."/>
  <div className="mgmt-more">{[
   [FiClipboard,'Operations Queue','queue','Operational task execution'],
   [FiTruck,'Trips & Pickups','collections','Delivery trips and customer pickups'],
   [FiClipboard,'Orders','orders','Order records and status tracking'],
   [FiMonitor,'POS','pos','Create and encode new orders'],
   [FiUsers,'Staff Monitoring','staff','Staff workload and availability'],
   [FiPackage,'Products & Services','products','Manage products, prices and availability'],
   [FiTruck,'Delivery','delivery','Dispatch assignments and drop-offs'],
   [FiPackage,'Inventory','inventory','Bottle stock and movement logs'],
   [FiCreditCard,'Payments','payments','Collections and unpaid balances'],
   [FiUsers,'Employees & Access','employees','Accounts and role permissions'],
   [FiSettings,'Settings','settings','Product prices and business rules'],
   [FiShield,'Audit Logs','audit','Administrative activity and audit history'],
   [FiAlertTriangle,'Verification','approvals','Electronic proofs and cash remittances']
  ].map(([Icon,title,target,desc])=><button key={target} onClick={()=>go(target)}><Icon/><strong>{title}</strong><small>{desc}</small></button>)}</div>{demo}
 </>}
 </>;
}
