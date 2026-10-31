import {useMemo,useState} from 'react';
import {FiBarChart2,FiUsers,FiDollarSign,FiCreditCard,FiSettings,FiShield,FiSave,FiClock,FiCheckCircle,FiActivity,FiPackage,FiTruck,FiClipboard,FiAlertTriangle} from 'react-icons/fi';
import {formatMoney} from '../data/managerDemo.js';
import EmployeeDirectory from './EmployeeDirectory.jsx';
import ProductCatalog from './ProductCatalog.jsx';
import ExpenseReport from './ExpenseReport.jsx';

// Only Owner-specific pages. POS, Orders, Delivery, Inventory and Payments reuse Manager pages.
function Title({eyebrow,title,description}){return <div className="mgmt-heading"><div className="overline">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>}
function Stat({title,value,Icon}){return <div className="mgmt-stat"><div className="mgmt-stat-top"><span>{title}</span><Icon size={17}/></div><strong>{value}</strong></div>}
const today=()=>new Date().toLocaleString('en-PH');
export default function OwnerOperations({page,go,orders,stock,trips,availability,onMessage,expenses,setExpenses}){
 const [settings,setSettings]=useState({deliveryFee:'0',lowStock:'15',hours:'Confirm operating hours with client'});
 const [draft,setDraft]=useState(settings);
 const [audit,setAudit]=useState([]);
 const [verification,setVerification]=useState([]);
 const [period,setPeriod]=useState('All Demo Data');
 const [approvals,setApprovals]=useState([]);
 const record=description=>{setAudit(old=>[{id:Date.now()+'-'+old.length,description,time:today()},...old]);onMessage(description+' (demo only)')};
 const paid=orders.filter(o=>o.paymentStatus==='Paid');
 const collected=paid.reduce((n,o)=>n+o.amount,0);
 const sales=orders.filter(o=>o.status!=='Cancelled').reduce((n,o)=>n+o.amount,0);
 const outstanding=orders.filter(o=>o.paymentStatus!=='Paid').reduce((n,o)=>n+o.amount,0);
 const remittance=trips.reduce((n,t)=>n+(t.remittance==='Awaiting Remittance'?t.collectedCash||0:0),0);
 const pendingElectronic=trips.filter(t=>t.paymentStatus==='Pending Verification'&&!verification.includes(t.id));
 const activity=orders.length+trips.length;
 const expenseTotal=expenses.filter(e=>e.active).reduce((n,e)=>n+e.amount,0);
 const action=(title,target)=><button className="mgmt-quick" onClick={()=>go(target)}>{title}</button>;
 const demo=<p className="mgmt-demo">Owner GUI prototype only • All values and access controls are local demo state. No real permissions, payments, expenses or pricing changes are applied to the business.</p>;
 return <>
 {page==='dashboard'&&<>
  <Title eyebrow="Executive overview" title="Owner Dashboard" description="Station-wide business performance, collections, inventory and activity."/>
  <div className="mgmt-stats"><Stat title="Sales (Demo)" value={formatMoney(sales)} Icon={FiBarChart2}/><Stat title="Verified Collected" value={formatMoney(collected)} Icon={FiDollarSign}/><Stat title="Unpaid / Unverified" value={formatMoney(outstanding)} Icon={FiClock}/><Stat title="Cash Pending Remittance" value={formatMoney(remittance)} Icon={FiCreditCard}/></div>
  <div className="mgmt-section-title"><h2>Owner Shortcuts</h2></div><div className="mgmt-grid">{action('Sales & Reports','reports')}{action('Payments','payments')}{action('Employee Access','employees')}{action('Products & Services','products')}</div>
  <div className="mgmt-section-title"><h2>Business Snapshot</h2></div><div className="mgmt-card">
   <div className="mgmt-row"><span className="mgmt-sub">Recorded orders</span><strong>{orders.length}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Active deliveries</span><strong>{trips.filter(t=>!['Delivered','Failed Delivery'].includes(t.status)).length}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Low stock items</span><strong>{stock.filter(s=>s.quantity<s.minimum).length}</strong></div>
   <div className="mgmt-row"><span className="mgmt-sub">Pending e-payment verification</span><strong>{pendingElectronic.length}</strong></div>
  </div>
  <div className="mgmt-section-title"><h2>Recent Transactions</h2><button className="mgmt-link" onClick={()=>go('orders')}>View Orders</button></div>
  <div className="mgmt-card">{orders.slice(0,4).map(o=><div className="mgmt-row" key={o.id}><div><div className="mgmt-row-title">{o.id} · {o.customer}</div><div className="mgmt-sub">{o.source} · {o.paymentStatus}</div></div><strong>{formatMoney(o.amount)}</strong></div>)}</div>{demo}
 </>}
 {page==='reports'&&<>
  <Title eyebrow="Business intelligence" title="Sales & Financial Reports" description="Separate billed sales, verified collection, unpaid orders and expenses."/>
  <div className="mgmt-controls">{['All Demo Data','Today (Preview)','This Week (Preview)'].map(p=><button key={p} className={period===p?'active':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div>
  <div className="mgmt-stats"><Stat title="Gross Sales" value={formatMoney(sales)} Icon={FiBarChart2}/><Stat title="Verified Collected" value={formatMoney(collected)} Icon={FiDollarSign}/><Stat title="Outstanding" value={formatMoney(outstanding)} Icon={FiClock}/><Stat title="Expenses Recorded" value={formatMoney(expenseTotal)} Icon={FiCreditCard}/></div>
  <div className="mgmt-card"><strong>Estimated Margin (Demo)</strong><p className="mgmt-sub">Verified collection minus recorded expenses, not actual net profit.</p><h2 style={{color:'#1b2f63',marginTop:10}}>{formatMoney(collected-expenseTotal)}</h2></div>
  <div className="mgmt-section-title"><h2>Sales by Source</h2></div><div className="mgmt-card">{['Online','Walk-in','Messenger','Phone'].map(source=><div className="mgmt-row" key={source}><span className="mgmt-sub">{source}</span><strong>{formatMoney(orders.filter(o=>o.source===source).reduce((n,o)=>n+o.amount,0))}</strong></div>)}</div>
  <ExpenseReport expenses={expenses} setExpenses={setExpenses} onEvent={record}/>
  <div className="mgmt-notice">Date filter buttons are visual preview only until payment timestamps are stored in the database. Profit is not calculated from complete costs yet.</div>{demo}
 </>}
 {page==='employees'&&<EmployeeDirectory availability={availability} orders={orders} onEvent={record}/>}
  {page==='approvals'&&<>
  <Title eyebrow="Financial controls" title="Payment Verification" description="Review electronic payment references and cash remittance records."/>
  <div className="mgmt-card"><strong>Electronic Proofs</strong>{pendingElectronic.length?pendingElectronic.map(t=><div className="mgmt-row" key={t.id}><div><div className="mgmt-row-title">{t.orderId} · {t.paymentMethod}</div><div className="mgmt-sub">Reference: {t.reference||'Missing'} · {formatMoney(t.amount)}</div></div><button className="mgmt-btn secondary" onClick={()=>{setVerification(old=>[...old,t.id]);record('Marked payment proof reviewed for '+t.orderId+' (demo only)')}}>Review</button></div>):<p className="mgmt-sub">No pending electronic proofs in this demo session.</p>}</div>
  <div className="mgmt-section-title"><h2>Driver Cash Remittance</h2></div>
  <div className="mgmt-card">{trips.filter(t=>t.remittance==='Awaiting Remittance').map(t=><div className="mgmt-row" key={t.id}><div><strong>{t.orderId}</strong><div className="mgmt-sub">{formatMoney(t.collectedCash||0)} held by driver</div></div><button className="mgmt-btn secondary" disabled={approvals.includes(t.id)} onClick={()=>{setApprovals(old=>[...old,t.id]);record('Marked remittance review requested for '+t.orderId)}}>{approvals.includes(t.id)?'Reviewed':'Review'}</button></div>)}</div>
  <div className="mgmt-notice">Review actions do not verify money or change financial status. Actual approvals require proof validation and shared backend audit records.</div>{demo}
 </>}
 {page==='products'&&<ProductCatalog onEvent={record}/>}
 {page==='settings'&&<>
  <Title eyebrow="Configuration" title="Business Settings" description="Operating information, delivery fees and other business rules."/>
  <div className="mgmt-card"><strong>Store Operating Rules</strong><div className="mgmt-formgrid">{[['deliveryFee','Delivery fee (₱)'],['lowStock','Low-stock threshold'],['hours','Operating hours']].map(([key,l])=><div className="mgmt-field" key={key}><label>{l}</label><input value={draft[key]} onChange={e=>setDraft(old=>({...old,[key]:e.target.value}))}/></div>)}</div><div className="owner-actions"><button className="mgmt-btn" onClick={()=>{setSettings({...draft});record('Updated business operating settings')}}><FiSave/> Save Settings</button><button className="mgmt-btn secondary" onClick={()=>go('products')}>Manage Products & Prices</button></div><p className="mgmt-sub">Saved demo delivery fee: {settings.deliveryFee}</p></div>{demo}
 </>}
  {page==='audit'&&<>
  <Title eyebrow="Transparency" title="Audit & Activity Logs" description="See demo owner actions and recent administrative changes."/>
  <div className="mgmt-stats"><Stat title="Owner Actions" value={audit.length} Icon={FiShield}/><Stat title="Sample Operational Records" value={activity} Icon={FiActivity}/></div>
  <div className="mgmt-card">{audit.length?audit.map(e=><div className="mgmt-row" key={e.id}><div><strong className="mgmt-row-title">{e.description}</strong><div className="mgmt-sub">{e.time} · Demo Owner</div></div><FiCheckCircle color="#244ea3"/></div>):<p className="mgmt-sub">No owner configuration changes yet.</p>}</div>{demo}
 </>}
 {page==='more'&&<>
  <Title eyebrow="Owner access" title="All Modules" description="Operational views and business administration."/>
  <div className="mgmt-more">{[[FiPackage,'Products & Services','products'],[FiClipboard,'Orders','orders'],[FiTruck,'Delivery','delivery'],[FiPackage,'Inventory','inventory'],[FiCreditCard,'Payments','payments'],[FiUsers,'Employees','employees'],[FiSettings,'Settings','settings'],[FiShield,'Audit Logs','audit'],[FiAlertTriangle,'Verification','approvals']].map(([Icon,title,target])=><button key={target} onClick={()=>go(target)}><Icon/><strong>{title}</strong><small>Open {title.toLowerCase()}</small></button>)}</div>{demo}
 </>}
 </>;
}
