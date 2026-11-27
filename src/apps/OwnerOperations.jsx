import {useEffect,useState} from 'react';
import {FiBarChart2,FiUsers,FiDollarSign,FiCreditCard,FiSettings,FiShield,FiSave,FiClock,FiCheckCircle,FiActivity,FiPackage,FiTruck,FiClipboard,FiAlertTriangle,FiDroplet,FiChevronRight} from 'react-icons/fi';
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
export default function OwnerOperations({page,go,orders,stock,trips,availability,onMessage,onOpenOrder,expenses,setExpenses}){
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
 const unpaidOrders=orders.filter(o=>o.paymentStatus!=='Paid'&&o.status!=='Cancelled');
 const outstanding=orders.filter(o=>o.paymentStatus!=='Paid').reduce((n,o)=>n+o.amount,0);
 const remittance=trips.reduce((n,t)=>n+(t.remittance==='Awaiting Remittance'?t.collectedCash||0:0),0);
 const pendingElectronic=trips.filter(t=>t.paymentStatus==='Pending Verification'&&!verification.includes(t.id));
 const activity=orders.length+trips.length;
 const expenseTotal=expenses.filter(e=>e.active!==false).reduce((n,e)=>n+e.amount,0);
 const operationalQueue=staffOrders.length?staffOrders:orders.map(o=>({...o,stage:({'Pending Confirmation':'waiting',Confirmed:'pending',Preparing:'refilling',Ready:'ready','Out for Delivery':'out',Delivered:'delivered',Completed:'picked',Cancelled:'failed'})[o.status]||'pending'}));
 const pendingCollection=operationalQueue.filter(o=>o.stage==='collection').length;
 const pendingRefill=operationalQueue.filter(o=>o.stage==='pending').length;
 const readyDelivery=operationalQueue.filter(o=>o.stage==='ready').length;
 const activeDelivery=operationalQueue.filter(o=>['delivery','out'].includes(o.stage)).length;
 const operationalIssues=operationalQueue.filter(o=>o.stage==='failed'||o.issueReason||o.issue).length;
 const lowStockCount=stock.filter(s=>s.quantity<s.minimum).length;
 const activeOperationalTrips=staffTrips.length?staffTrips.filter(t=>t.status==='active').length:trips.filter(t=>!['Delivered','Failed Delivery','closed'].includes(t.status)).length;
 const attentionItems=[
  operationalIssues>0&&{id:'issues',severity:'critical',title:`${operationalIssues} operational issue${operationalIssues===1?'':'s'} requiring review`,meta:'Check failed or flagged tasks in Operations Queue',target:'queue',Icon:FiAlertTriangle},
  lowStockCount>0&&{id:'low-stock',severity:'critical',title:`${lowStockCount} low stock container${lowStockCount===1?'':'s'}`,meta:'Review bottle inventory & catalog thresholds',target:'products',Icon:FiPackage},
  pendingElectronic.length>0&&{id:'verify',severity:'warning',title:`${pendingElectronic.length} pending payment verification${pendingElectronic.length===1?'':'s'}`,meta:'Review submitted GCash or bank references',target:'approvals',Icon:FiCreditCard},
  unpaidOrders.length>0&&{id:'unpaid',severity:'warning',title:`${unpaidOrders.length} unpaid order${unpaidOrders.length===1?'':'s'} (${formatMoney(outstanding)})`,meta:'Track outstanding customer balances in Payments',target:'payments',Icon:FiClock},
  activeDelivery>0&&{id:'active-delivery',severity:'info',title:`${activeDelivery} active delivery order${activeDelivery===1?'':'s'} in progress`,meta:`Across ${activeOperationalTrips} active trip${activeOperationalTrips===1?'':'s'} — monitor in Trips & Pickups`,target:'collections',Icon:FiTruck}
 ].filter(Boolean);
 const shortcuts=[
  ['queue','Operations Queue','Live task execution & claiming',FiClipboard],
  ['staff','Staff Monitoring','Workload & availability',FiUsers],
  ['collections','Trips & Pickups','Delivery trips & customer pickups',FiTruck],
  ['orders','Orders','Order records & status tracking',FiClipboard],
  ['reports','Sales & Reports','Revenue, expenses & PDF exports',FiBarChart2],
  ['payments','Payments','Collections & unpaid balances',FiCreditCard],
  ['employees','Employee Access','Accounts & role permissions',FiUsers],
  ['products','Products & Services','Catalog, pricing & stock alerts',FiPackage]
 ];
 const demo=<p className="mgmt-demo">Super Admin GUI prototype only • All values and access controls are local demo state. No real permissions, payments, expenses or pricing changes are applied to the business.</p>;
 return <>
 {page==='dashboard'&&<div className="owner-dash">
  {/* A. Dashboard Header */}
  <header className="owner-dash-header">
   <h1>Super Admin Dashboard</h1>
   <p>Business overview and operational control.</p>
  </header>

  {/* B. Needs Attention */}
  <section className="owner-dash-section" aria-label="Needs Attention">
   <div className="owner-dash-section-head">
    <h2>Needs Attention</h2>
    {attentionItems.length>0&&<span className="owner-dash-count">{attentionItems.length} item{attentionItems.length===1?'':'s'}</span>}
   </div>
   {attentionItems.length>0?(
    <div className="owner-attention-list">
     {attentionItems.map(({id,severity,title,meta,target,Icon})=>(
      <button key={id} type="button" className={`owner-attention-item ${severity}`} onClick={()=>go(target)}>
       <span className="owner-attention-icon"><Icon size={17} aria-hidden="true"/></span>
       <span className="owner-attention-body">
        <strong>{title}</strong>
        <small>{meta}</small>
       </span>
       <FiChevronRight className="owner-attention-chevron" aria-hidden="true"/>
      </button>
     ))}
    </div>
   ):(
    <div className="owner-attention-ok" role="status">
     <FiCheckCircle size={18} aria-hidden="true"/>
     <div>
      <strong>Everything looks good</strong>
      <small>No operational issues, low-stock alerts, or pending verifications right now.</small>
     </div>
    </div>
   )}
  </section>

  {/* C. Operational Overview */}
  <section className="owner-dash-section" aria-label="Operational Overview">
   <div className="owner-dash-section-head">
    <h2>Operational Overview</h2>
    <button type="button" className="mgmt-link" onClick={()=>go('queue')}>Open Queue</button>
   </div>
   <div className="owner-kpi-grid">
    <button type="button" className="owner-kpi-card" onClick={()=>go('queue')}>
     <span className="owner-kpi-top"><span>Pending Collection</span><FiTruck size={16} aria-hidden="true"/></span>
     <strong>{pendingCollection}</strong>
     <small>Orders awaiting pickup</small>
    </button>
    <button type="button" className="owner-kpi-card" onClick={()=>go('queue')}>
     <span className="owner-kpi-top"><span>Pending Refill</span><FiDroplet size={16} aria-hidden="true"/></span>
     <strong>{pendingRefill}</strong>
     <small>Station refill queue</small>
    </button>
    <button type="button" className="owner-kpi-card" onClick={()=>go('queue')}>
     <span className="owner-kpi-top"><span>Ready Delivery</span><FiPackage size={16} aria-hidden="true"/></span>
     <strong>{readyDelivery}</strong>
     <small>Ready for dispatch</small>
    </button>
    <button type="button" className="owner-kpi-card" onClick={()=>go('collections')}>
     <span className="owner-kpi-top"><span>Active Delivery</span><FiTruck size={16} aria-hidden="true"/></span>
     <strong>{activeDelivery}</strong>
     <small>{activeOperationalTrips} active trip{activeOperationalTrips===1?'':'s'}</small>
    </button>
   </div>
   <p className="owner-dash-note">
    {activeDelivery} active delivery order{activeDelivery===1?'':'s'} across {activeOperationalTrips} active trip{activeOperationalTrips===1?'':'s'} (one trip can carry multiple orders). Local browser queue only.
   </p>
  </section>

  {/* D. Financial Overview */}
  <section className="owner-dash-section" aria-label="Financial Overview">
   <div className="owner-dash-section-head">
    <h2>Financial Overview</h2>
    <button type="button" className="mgmt-link" onClick={()=>go('reports')}>Sales & Reports</button>
   </div>
   <div className="owner-finance-grid">
    <div className="owner-finance-card">
     <span className="owner-kpi-top"><span>Recorded Sales</span><FiBarChart2 size={16} aria-hidden="true"/></span>
     <strong>{formatMoney(sales)}</strong>
     <small>Non-cancelled orders (not yet all collected)</small>
    </div>
    <div className="owner-finance-card verified">
     <span className="owner-kpi-top"><span>Verified Collected</span><FiDollarSign size={16} aria-hidden="true"/></span>
     <strong>{formatMoney(collected)}</strong>
     <small>Orders marked Paid</small>
    </div>
    <div className="owner-finance-card pending">
     <span className="owner-kpi-top"><span>Unpaid / Unverified</span><FiClock size={16} aria-hidden="true"/></span>
     <strong>{formatMoney(outstanding)}</strong>
     <small>Awaiting customer payment</small>
    </div>
    <div className="owner-finance-card pending">
     <span className="owner-kpi-top"><span>Cash Pending Remittance</span><FiCreditCard size={16} aria-hidden="true"/></span>
     <strong>{formatMoney(remittance)}</strong>
     <small>Driver COD awaiting handover</small>
    </div>
    <div className="owner-finance-card">
     <span className="owner-kpi-top"><span>Active Expenses</span><FiCreditCard size={16} aria-hidden="true"/></span>
     <strong>{formatMoney(expenseTotal)}</strong>
     <small>Recorded station operating expenses</small>
    </div>
   </div>
  </section>

  {/* E. Business & Operations Shortcuts */}
  <section className="owner-dash-section" aria-label="Business and Operations Shortcuts">
   <div className="owner-dash-section-head">
    <h2>Business & Operations</h2>
   </div>
   <div className="owner-shortcut-grid">
    {shortcuts.map(([target,title,desc,Icon])=>(
     <button key={target} type="button" className="owner-shortcut-card" onClick={()=>go(target)}>
      <span className="owner-shortcut-icon"><Icon size={18} aria-hidden="true"/></span>
      <span className="owner-shortcut-text">
       <strong>{title}</strong>
       <small>{desc}</small>
      </span>
     </button>
    ))}
   </div>
  </section>

  {/* F. Recent Transactions */}
  <section className="owner-dash-section" aria-label="Recent Transactions">
   <div className="owner-dash-section-head">
    <h2>Recent Transactions</h2>
    <button type="button" className="mgmt-link" onClick={()=>go('orders')}>View All</button>
   </div>
   <div className="owner-tx-list">
    {orders.slice(0,4).map(o=>(
     <button key={o.id} type="button" className="owner-tx-row" onClick={()=>onOpenOrder?onOpenOrder(o):go('orders')}>
      <div className="owner-tx-info">
       <strong>{o.id} · {o.customer||'Walk-in Customer'}</strong>
       <small>{o.source} • {o.service} • {o.date}</small>
       <div className="owner-tx-badges">
        <span className={`mgmt-pill ${o.status==='Completed'||o.status==='Delivered'?'ok':o.status==='Pending Confirmation'?'warn':''}`}>{o.status}</span>
        <span className={`mgmt-pill ${o.paymentStatus==='Paid'?'ok':'warn'}`}>{o.paymentStatus}</span>
       </div>
      </div>
      <div className="owner-tx-amount">
       <strong>{formatMoney(o.amount)}</strong>
       <FiChevronRight size={16} aria-hidden="true"/>
      </div>
     </button>
    ))}
   </div>
  </section>
  {demo}
 </div>}
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
  <div className="mgmt-more">{[[FiClipboard,'Operations Queue','queue'],[FiUsers,'Staff Monitoring','staff'],[FiTruck,'Trips & Pickups','collections'],[FiPackage,'Products & Services','products'],[FiClipboard,'Orders','orders'],[FiTruck,'Delivery','delivery'],[FiPackage,'Inventory','inventory'],[FiCreditCard,'Payments','payments'],[FiUsers,'Employees & Access','employees'],[FiSettings,'Settings','settings'],[FiShield,'Audit Logs','audit'],[FiAlertTriangle,'Verification','approvals']].map(([Icon,title,target])=><button key={target} onClick={()=>go(target)}><Icon/><strong>{title}</strong><small>Open {title.toLowerCase()}</small></button>)}</div>{demo}
 </>}
 </>;
}
