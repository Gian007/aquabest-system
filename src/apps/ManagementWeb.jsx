import { useMemo, useState } from 'react';
import {
 FiHome,FiMonitor,FiClipboard,FiMenu,FiBell,FiDroplet,FiTruck,
 FiPackage,FiCreditCard,FiBarChart2,FiUsers,FiPlus,FiMinus,FiArrowRight,
 FiCheckCircle,FiClock,FiX,FiAlertTriangle,FiActivity,FiDollarSign,
 FiEdit3,FiRefreshCw,FiSave
} from 'react-icons/fi';
import logo from '../assets/AquaBest logo.png';
import { bottleOptions } from './Component_Customer/orderData.js';
import { DEMO_PRICES, DEMO_PRODUCTS, INITIAL_ORDERS, INITIAL_STOCK, formatMoney, orderSummary } from '../data/managerDemo.js';
import './managementWeb.css';

const modules=[
 ['dashboard','Dashboard',FiHome],['pos','POS',FiMonitor],['orders','Orders',FiClipboard],
 ['refill','Refill Tasks',FiDroplet],['delivery','Delivery',FiTruck],
 ['inventory','Inventory',FiPackage],['payments','Payments',FiCreditCard],
 ['reports','Sales Reports',FiBarChart2],['staff','Staff Tasks',FiUsers]
];
const stages=['Pending Confirmation','Confirmed','Preparing','Ready','Out for Delivery','Delivered','Completed'];
const initialSale=()=>({source:'Walk-in',customer:'',ownership:'own',arrangement:'purchase',service:'Walk-in',quantities:{round5:0,slim25:0,slim5:0},paymentMethod:'Cash',paymentStatus:'Paid',reference:'',notes:''});
const statusKind=s=>['Completed','Paid','Delivered','Ready'].includes(s)?'ok':['Pending Confirmation','Unpaid','Waiting'].includes(s)?'warn':'';
const Pill=({children})=><span className={'mgmt-pill '+statusKind(children)}>{children}</span>;
const Stat=({label,value,Icon})=><div className="mgmt-stat"><div className="mgmt-stat-top"><span>{label}</span><Icon size={17}/></div><strong>{value}</strong></div>;
const Heading=({kicker,title,subtitle})=><div className="mgmt-heading"><div className="overline">{kicker}</div><h1>{title}</h1><p>{subtitle}</p></div>;
const Section=({title,action,onClick})=><div className="mgmt-section-title"><h2>{title}</h2>{action&&<button className="mgmt-link" onClick={onClick}>{action} <FiArrowRight/></button>}</div>;
const Field=({label,children})=><div className="mgmt-field"><label>{label}</label>{children}</div>;
const today=()=>new Date().toISOString().slice(0,10);

export default function ManagementWeb(){
 const [page,setPage]=useState('dashboard');
 const [wireframe,setWireframe]=useState(false);
 const [orders,setOrders]=useState(INITIAL_ORDERS);
 const [stock,setStock]=useState(INITIAL_STOCK);
 const [sale,setSale]=useState(initialSale);
 const [filter,setFilter]=useState('All');
 const [selected,setSelected]=useState(null);
 const [assigned,setAssigned]=useState('Unassigned');
 const [nextStatus,setNextStatus]=useState('');
 const [notification,setNotification]=useState('');
 const [reportPeriod,setReportPeriod]=useState('Today');
 const [newStock,setNewStock]=useState({id:'round5',type:'IN',quantity:1});
 const [stockOpen,setStockOpen]=useState(false);
 const go=(p)=>{setPage(p);setSelected(null);window.scrollTo(0,0)};
 const active=orders.filter(o=>!['Completed','Cancelled'].includes(o.status));
 const payments=orders.filter(o=>o.paymentStatus==='Paid');
 const revenue=payments.reduce((sum,o)=>sum+o.amount,0);
 const unpaid=orders.filter(o=>o.paymentStatus!=='Paid').reduce((sum,o)=>sum+o.amount,0);
 const selectedTotal=useMemo(()=>Object.entries(sale.quantities).reduce((s,[id,quantity])=>s+quantity*(DEMO_PRICES[id]||0),0),[sale.quantities]);
 const selectedQty=Object.values(sale.quantities).reduce((a,b)=>a+b,0);
 const setSaleProp=(key,val)=>setSale(p=>({...p,[key]:val}));
 const updateQty=(id,change)=>setSale(p=>({...p,quantities:{...p.quantities,[id]:Math.max(0,Math.min(99,(p.quantities[id]||0)+change))}}));
 const startSale=()=>{setSale(initialSale());go('pos')};
 const saveSale=()=>{
  if(!selectedQty)return;
  const id='DEMO-'+String(Date.now()).slice(-6);
  const isPaid=sale.paymentStatus==='Paid';
  const record={id,customer:sale.customer.trim()||'Walk-in Customer',source:sale.source,items:Object.entries(sale.quantities).filter(([,q])=>q>0).map(([sizeId,quantity])=>({sizeId,quantity})),
   status:sale.service==='Walk-in'?(isPaid?'Completed':'Confirmed'):'Pending Confirmation',paymentStatus:sale.paymentStatus,method:sale.paymentMethod,
   reference:sale.reference,amount:selectedTotal,service:sale.service,ownership:sale.ownership,assigned:'Unassigned',date:today(),notes:sale.notes};
  setOrders(old=>[record,...old]);setNotification('Sample transaction '+id+' created locally. No real customer charged.');
  setSale(initialSale());go('orders');
 };
 const changeOrder=(id,patch)=>setOrders(old=>old.map(o=>o.id===id?{...o,...patch}:o));
 const openOrder=(order)=>{setSelected(order.id);setAssigned(order.assigned||'Unassigned');setNextStatus(order.status)};
 const current=orders.find(o=>o.id===selected);
 const applyOrder=()=>{if(!current)return;changeOrder(current.id,{status:nextStatus,assigned});setSelected(null);setNotification('Sample order updated locally.')};
 const applyPayment=()=>{if(!current)return;changeOrder(current.id,{paymentStatus:'Paid'});setSelected(null);setNotification('Demo payment recorded. Production requires actual payment verification.')};
 const adjustStock=()=>{let n=Number(newStock.quantity);if(!Number.isInteger(n)||n<1)return;setStock(old=>old.map(s=>s.id!==newStock.id?s:{...s,quantity:Math.max(0,s.quantity+(newStock.type==='IN'?n:-n))}));setStockOpen(false);setNotification('Demo inventory movement recorded locally.')};
 const filtered=orders.filter(o=>filter==='All'||(filter==='Unpaid'?o.paymentStatus!=='Paid':o.status===filter));
 const section=<div className="mgmt-demo">Prototype only • prices, names, sales, assignments and orders are sample values. Nothing is written to a backend.</div>;

 return <div className={"mgmt "+(wireframe?"mgmt-wireframe":"")}>
  <header className="mgmt-header"><div className="mgmt-header-inner">
    <div className="mgmt-brand"><img src={logo} alt="AquaBest"/><div><small>Management System</small><strong style={{fontSize:12,color:'#1b2f63'}}>Manager Workspace</strong></div></div>
    <div className="mgmt-actions"><button className="mgmt-mode-switch" aria-pressed={wireframe} onClick={()=>setWireframe(v=>!v)}>{wireframe?"UI Design":"Wireframe"}</button><button className="mgmt-icobtn" aria-label="Notifications" onClick={()=>go('notifications')}><FiBell/></button><button className="mgmt-icobtn" aria-label="More" onClick={()=>go('more')}><FiMenu/></button></div>
  </div></header>
  <div className="mgmt-body">
   <aside className="mgmt-sidebar" aria-label="Management sections">{modules.map(([id,label,Icon])=><button key={id} className={'mgmt-sidebtn '+(page===id?'active':'')} onClick={()=>go(id)}><Icon/> {label}</button>)}</aside>
   <main className="mgmt-main">
    {notification&&<div className="mgmt-notice" role="status">{notification} <button className="mgmt-link" onClick={()=>setNotification('')}>Dismiss</button></div>}
    {page==='dashboard'&&<>
      <Heading kicker="Manager workspace" title="Station Overview" subtitle="Quick access to daily orders, refills, payments and deliveries."/>
      <div className="mgmt-stats"><Stat label="Collected (Demo)" value={formatMoney(revenue)} Icon={FiDollarSign}/><Stat label="Orders" value={orders.length} Icon={FiClipboard}/><Stat label="Pending Refill" value={orders.filter(o=>['Confirmed','Preparing'].includes(o.status)).length} Icon={FiDroplet}/><Stat label="For Delivery" value={orders.filter(o=>o.service!=='Walk-in'&&!['Delivered','Completed','Cancelled'].includes(o.status)).length} Icon={FiTruck}/></div>
      <Section title="Quick Actions"/><div className="mgmt-grid">{[['New POS Sale',FiPlus,'pos'],['Manage Orders',FiClipboard,'orders'],['Refill Queue',FiDroplet,'refill'],['Dispatch',FiTruck,'delivery']].map(([label,Icon,id])=><button key={id} className="mgmt-quick" onClick={()=>id==='pos'?startSale():go(id)}><Icon/>{label}</button>)}</div>
      <Section title="Recent Orders" action="View All" onClick={()=>go('orders')}/><div className="mgmt-card">{orders.slice(0,4).map(o=><div key={o.id} className="mgmt-row"><div><div className="mgmt-row-title">{o.customer} · {o.id}</div><div className="mgmt-sub">{orderSummary(o.items)}</div></div><Pill>{o.status}</Pill></div>)}</div>
      <Section title="Sales Summary" action="View Reports" onClick={()=>go('reports')}/><div className="mgmt-card"><div className="mgmt-row"><span className="mgmt-sub">Collected payments</span><strong>{formatMoney(revenue)}</strong></div><div className="mgmt-row"><span className="mgmt-sub">Outstanding</span><strong>{formatMoney(unpaid)}</strong></div></div>{section}
    </>}
    {page==='pos'&&<>
      <Heading kicker="Counter / manual encoding" title="New POS Sale" subtitle="For walk-ins, customers calling the station, and Messenger orders."/>
      <div className="mgmt-card"><Section title="1. Transaction & Customer"/>
       <div className="mgmt-formgrid">
        <Field label="Order Source"><select value={sale.source} onChange={e=>setSaleProp('source',e.target.value)}>{['Walk-in','Messenger','Phone'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Customer Name"><input value={sale.customer} onChange={e=>setSaleProp('customer',e.target.value)} placeholder={sale.source==='Walk-in'?'Optional for walk-in':'Customer / contact name'} /></Field>
        <Field label="Containers"><select value={sale.ownership} onChange={e=>setSale(p=>({...p,ownership:e.target.value}))}><option value="own">Customer-owned (Refill)</option><option value="store">AquaBest-provided</option></select></Field>
        <Field label="Service / Fulfillment"><select value={sale.service} onChange={e=>setSaleProp('service',e.target.value)}><option>Walk-in</option><option>Pickup & Delivery</option><option>Drop-off & Delivery</option><option>Delivery</option></select></Field>
       </div>
       {sale.ownership==='store'&&<Field label="Container Arrangement"><select value={sale.arrangement} onChange={e=>setSaleProp('arrangement',e.target.value)}><option value="purchase">Purchase container</option><option value="returnable">Returnable / borrowed (policy pending)</option></select></Field>}
      </div>
      <div className="mgmt-card" style={{marginTop:12}}><Section title="2. Select Sizes & Quantities"/><p className="mgmt-sub">Same multi-size ordering as the customer site. Prices below are demo values.</p>
        {bottleOptions.map(p=><div className="mgmt-product" key={p.id}><img src={p.image} alt={p.name+' '+p.shape}/><div className="mgmt-product-info"><strong>{p.name}</strong><small>{p.shape} • {formatMoney(DEMO_PRICES[p.id])} demo</small></div><div className="mgmt-qty"><button onClick={()=>updateQty(p.id,-1)} disabled={!sale.quantities[p.id]} aria-label={'Remove '+p.name}><FiMinus/></button><span>{sale.quantities[p.id]}</span><button onClick={()=>updateQty(p.id,1)} aria-label={'Add '+p.name}><FiPlus/></button></div></div>)}
      </div>
      <div className="mgmt-card" style={{marginTop:12}}><Section title="3. Payment"/>
        <div className="mgmt-formgrid">
          <Field label="Payment Method"><select value={sale.paymentMethod} onChange={e=>setSaleProp('paymentMethod',e.target.value)}>{['Cash','GCash','Bank Transfer'].map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Payment Status"><select value={sale.paymentStatus} onChange={e=>setSaleProp('paymentStatus',e.target.value)}><option>Paid</option><option>Unpaid</option></select></Field>
          {sale.paymentMethod!=='Cash'&&<Field label="Payment Reference (optional)"><input placeholder="Reference number / proof note" value={sale.reference} onChange={e=>setSaleProp('reference',e.target.value)}/></Field>}
          <Field label="Internal note"><input placeholder="Special request or instructions" value={sale.notes} onChange={e=>setSaleProp('notes',e.target.value)}/></Field>
        </div>
      </div>
      <div className="mgmt-summary" style={{marginTop:12}}><strong>Transaction Summary</strong>{DEMO_PRODUCTS.filter(p=>sale.quantities[p.id]>0).map(p=><div key={p.id}><span>{p.label} · {p.shape} × {sale.quantities[p.id]}</span><b>{formatMoney(sale.quantities[p.id]*DEMO_PRICES[p.id])}</b></div>)}<div className="total"><span>Sample total</span><strong>{formatMoney(selectedTotal)}</strong></div></div>
      <div style={{display:'flex',gap:9,marginTop:14}}><button className="mgmt-btn secondary" onClick={()=>setSale(initialSale())}>Clear</button><button className="mgmt-btn" style={{flex:1}} disabled={!selectedQty} onClick={saveSale}><FiSave/> Save Demo Transaction</button></div>
      {section}
    </>}
    {page==='orders'&&<>
     <Heading kicker="Centralized order queue" title="Orders" subtitle="Online, walk-in, Messenger and phone orders in one place."/>
     <div className="mgmt-controls">{['All','Pending Confirmation','Confirmed','Preparing','Out for Delivery','Completed','Unpaid'].map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f}</button>)}</div>
     {filtered.map(o=><article className="mgmt-card mgmt-order" key={o.id}><div className="mgmt-order-head"><strong>{o.id} · {o.customer}</strong><Pill>{o.status}</Pill></div><p>{o.source} • {o.service} • {o.date}</p><p>{orderSummary(o.items)}</p><div className="mgmt-order-actions"><strong>{formatMoney(o.amount)} <span className="mgmt-sub">({o.paymentStatus})</span></strong><button className="mgmt-btn secondary" onClick={()=>openOrder(o)}>View Details <FiArrowRight/></button></div></article>)}
     {!filtered.length&&<div className="mgmt-card">No orders in this filter.</div>}
     <button className="mgmt-btn full" onClick={startSale}><FiPlus/> Encode Manual Order</button>{section}
    </>}
    {page==='refill'&&<>
     <Heading kicker="Preparation" title="Refill Tasks" subtitle="Track confirmed orders from preparation to ready for pickup or delivery."/>
     {orders.filter(o=>['Confirmed','Preparing','Ready'].includes(o.status)).map(o=><article className="mgmt-card mgmt-order" key={o.id}><div className="mgmt-order-head"><strong>{o.id} · {o.customer}</strong><Pill>{o.status}</Pill></div><p>{orderSummary(o.items)}</p><p>Assigned: {o.assigned}</p><button className="mgmt-btn secondary" onClick={()=>openOrder(o)}>Assign / Update <FiEdit3/></button></article>)}
     <div className="mgmt-notice">Staff will reuse this queue with permissions limited to assigned tasks.</div>{section}
    </>}
    {page==='delivery'&&<>
     <Heading kicker="Dispatch" title="Delivery Management" subtitle="Assign drivers, monitor drop-offs, and track collections."/>
     {orders.filter(o=>o.service!=='Walk-in'&&!['Completed','Cancelled'].includes(o.status)).map(o=><article className="mgmt-card mgmt-order" key={o.id}><div className="mgmt-order-head"><strong>{o.id} · {o.customer}</strong><Pill>{o.status}</Pill></div><p>{o.service} • {orderSummary(o.items)}</p><p>Assigned: {o.assigned}</p><button className="mgmt-btn secondary" onClick={()=>openOrder(o)}>Manage Delivery <FiTruck/></button></article>)}
     <div className="mgmt-notice">Delivery routes, coordinates, vehicle assignment and cash remittance are future integrations.</div>{section}
    </>}
    {page==='inventory'&&<>
     <Heading kicker="Stock control" title="Inventory & Bottles" subtitle="Available containers, minimum stock and movement recording."/>
     <div className="mgmt-stats"><Stat label="Total Bottles (Demo)" value={stock.reduce((a,s)=>a+s.quantity,0)} Icon={FiPackage}/><Stat label="Low Stock" value={stock.filter(s=>s.quantity<s.minimum).length} Icon={FiAlertTriangle}/></div>
     {stock.map(s=><div className="mgmt-card mgmt-order" key={s.id}><div className="mgmt-order-head"><strong>{DEMO_PRODUCTS.find(p=>p.id===s.id)?.label} · {DEMO_PRODUCTS.find(p=>p.id===s.id)?.shape}</strong><Pill>{s.quantity<s.minimum?'Low Stock':'Available'}</Pill></div><p>Quantity: {s.quantity} • Minimum: {s.minimum}</p></div>)}
     <button className="mgmt-btn full" onClick={()=>setStockOpen(true)}><FiPlus/> Record Stock IN / OUT</button>{section}
    </>}
    {page==='payments'&&<>
     <Heading kicker="Collections" title="Payments" subtitle="Keep payment status separate from order preparation."/>
     <div className="mgmt-stats"><Stat label="Paid Total" value={formatMoney(revenue)} Icon={FiDollarSign}/><Stat label="Outstanding" value={formatMoney(unpaid)} Icon={FiClock}/></div>
     {orders.map(o=><div className="mgmt-card mgmt-order" key={o.id}><div className="mgmt-order-head"><strong>{o.id} · {o.customer}</strong><Pill>{o.paymentStatus}</Pill></div><p>{o.source} • {formatMoney(o.amount)}</p>{o.paymentStatus!=='Paid'&&<button className="mgmt-btn secondary" onClick={()=>openOrder(o)}>Review Payment <FiCreditCard/></button>}</div>)}{section}
    </>}
    {page==='reports'&&<>
     <Heading kicker="Business insights" title="Sales Reports" subtitle="Demo summaries calculated from current sample transactions."/>
     <div className="mgmt-controls">{['Today','This Week','This Month'].map(x=><button key={x} className={reportPeriod===x?'active':''} onClick={()=>setReportPeriod(x)}>{x}</button>)}</div>
     <div className="mgmt-stats"><Stat label="Collected (Sample)" value={formatMoney(revenue)} Icon={FiDollarSign}/><Stat label="Paid Transactions" value={payments.length} Icon={FiCheckCircle}/><Stat label="Unpaid Balance" value={formatMoney(unpaid)} Icon={FiClock}/><Stat label="Total Orders" value={orders.length} Icon={FiClipboard}/></div>
     <Section title="Sample Sales Trend"/><div className="mgmt-card"><div className="mgmt-chart">{[55,74,40,89,62,100,81].map((height,i)=><div key={i}><b style={{height:height+'%'}}/><small>{['M','T','W','T','F','S','S'][i]}</small></div>)}</div></div>
     <Section title="Sales by Source"/><div className="mgmt-card">{['Walk-in','Online','Messenger','Phone'].map(source=><div className="mgmt-row" key={source}><span className="mgmt-sub">{source}</span><strong>{formatMoney(payments.filter(o=>o.source===source).reduce((a,o)=>a+o.amount,0))}</strong></div>)}</div>
     <div className="mgmt-notice">Date tabs and chart are visual demo controls. Verified sales reports will require real payment dates and database queries.</div>{section}
    </>}
    {page==='staff'&&<>
     <Heading kicker="Operations team" title="Staff Assignments" subtitle="Shared work queue, not a separate system for each role."/>
     {['Manager','Staff A · Refiller','Staff B · POS / Refill','Driver A · Delivery','Driver B · Delivery'].map(s=><div className="mgmt-card mgmt-order" key={s}><div className="mgmt-order-head"><strong>{s}</strong><FiUsers color="#244ea3"/></div><p>Role and task assignments are sample data, pending client confirmation.</p></div>)}{section}
    </>}
    {page==='notifications'&&<><Heading kicker="Alerts" title="Notifications" subtitle="Incoming order requests and stock warnings."/><div className="mgmt-card mgmt-row"><FiClipboard/><div><strong>Pending Online Order</strong><p className="mgmt-sub">New online order awaiting confirmation.</p></div><button className="mgmt-btn secondary" onClick={()=>go('orders')}>View</button></div><div className="mgmt-card mgmt-row" style={{marginTop:9}}><FiAlertTriangle/><div><strong>Low Stock Warning</strong><p className="mgmt-sub">Review inventory minimum quantities.</p></div><button className="mgmt-btn secondary" onClick={()=>go('inventory')}>View</button></div></>}
    {page==='more'&&<><Heading kicker="Manager access" title="More Modules" subtitle="Open another operational workspace."/><div className="mgmt-more">{modules.slice(3).map(([id,label,Icon])=><button key={id} onClick={()=>go(id)}><Icon/><strong>{label}</strong><small>Open {label.toLowerCase()}</small></button>)}</div>{section}</>}
   </main>
  </div>
  <nav className="mgmt-bottom" aria-label="Primary management navigation">{[['dashboard','Home',FiHome],['pos','POS',FiMonitor],['orders','Orders',FiClipboard],['more','More',FiMenu]].map(([id,label,Icon])=><button key={id} className={page===id||(id==='more'&&!['dashboard','pos','orders'].includes(page))?'active':''} onClick={()=>go(id)}><Icon/>{label}</button>)}</nav>
  {(current||stockOpen)&&<div className="mgmt-drawer" role="presentation" onClick={()=>{setSelected(null);setStockOpen(false)}}>
    <div className="mgmt-sheet" role="dialog" aria-modal="true" aria-label={stockOpen?'Stock movement':'Order details'} onClick={e=>e.stopPropagation()}>
      <div className="mgmt-sheet-head"><h2>{stockOpen?'Record Stock Movement':current?.id+' · '+current?.customer}</h2><button className="mgmt-icobtn" aria-label="Close" onClick={()=>{setSelected(null);setStockOpen(false)}}><FiX/></button></div>
      {stockOpen?<><Field label="Item"><select value={newStock.id} onChange={e=>setNewStock(p=>({...p,id:e.target.value}))}>{DEMO_PRODUCTS.map(p=><option value={p.id} key={p.id}>{p.label} · {p.shape}</option>)}</select></Field><Field label="Type"><select value={newStock.type} onChange={e=>setNewStock(p=>({...p,type:e.target.value}))}><option>IN</option><option>OUT</option></select></Field><Field label="Quantity"><input type="number" min="1" step="1" value={newStock.quantity} onChange={e=>setNewStock(p=>({...p,quantity:e.target.value}))}/></Field><button className="mgmt-btn full" style={{marginTop:12}} onClick={adjustStock}>Save Demo Movement</button></>:
       current&&<><p className="mgmt-sub">{current.source} • {current.service} • {current.date}</p>
        <div className="mgmt-card" style={{margin:'12px 0'}}><strong>Items</strong><p className="mgmt-sub">{orderSummary(current.items)}</p><div className="mgmt-row"><span>Total (demo)</span><strong>{formatMoney(current.amount)}</strong></div><div className="mgmt-row"><span>Payment</span><Pill>{current.paymentStatus}</Pill></div></div>
        <Field label="Order / Task Status"><select value={nextStatus} onChange={e=>setNextStatus(e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></Field>
        <Field label="Assigned Personnel"><select value={assigned} onChange={e=>setAssigned(e.target.value)}>{['Unassigned','Manager','Staff A','Staff B','Driver A','Driver B'].map(a=><option key={a}>{a}</option>)}</select></Field>
        <div className="mgmt-progress" style={{margin:'14px 0'}}>{stages.slice(0,5).map((s,i)=><div key={s} className={stages.indexOf(current.status)>=i?'done':''}>{stages.indexOf(current.status)>=i?<FiCheckCircle/>:<FiClock/>}{s}</div>)}</div>
        <button className="mgmt-btn full" onClick={applyOrder}><FiSave/> Save Demo Status</button>
        {current.paymentStatus!=='Paid'&&<button className="mgmt-btn full secondary" style={{marginTop:9}} onClick={applyPayment}><FiCreditCard/> Mark Paid (Demo)</button>}
       </>}
    </div>
  </div>}
 </div>;
}
