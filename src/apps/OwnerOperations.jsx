import {useEffect,useMemo,useState} from 'react';
import {FiBarChart2,FiUsers,FiDollarSign,FiCreditCard,FiSettings,FiShield,FiSave,FiClock,FiCheckCircle,FiActivity,FiPackage,FiTruck,FiClipboard,FiAlertTriangle,FiDroplet,FiChevronRight,FiChevronDown,FiChevronUp,FiCalendar,FiTrendingUp,FiInfo,FiSliders,FiArrowUp,FiArrowDown,FiRotateCcw} from 'react-icons/fi';
import {formatMoney} from '../data/managerDemo.js';
import {getTodayLocalDate,shiftAnchorDate} from '../utils/reportDateUtils.js';
import {buildOwnerDashboardData} from '../utils/buildOwnerDashboardData.js';
import {
 DASHBOARD_SECTIONS,
 VALID_DEFAULT_METRICS,
 VALID_DEFAULT_PERIODS,
 VALID_DENSITIES,
 loadDashboardSettings,
 saveDashboardSettings,
 resetDashboardSettings,
 moveDashboardSection
} from '../utils/ownerDashboardSettings.js';
import EmployeeDirectory from './EmployeeDirectory.jsx';
import ProductCatalog from './ProductCatalog.jsx';
import SalesReports from './SalesReports.jsx';

// Only Owner-specific pages. POS, Orders, Delivery, Inventory and Payments reuse Manager pages.
function Title({eyebrow,title,description}){return <div className="mgmt-heading"><div className="overline">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>}
function Stat({title,value,Icon}){return <div className="mgmt-stat"><div className="mgmt-stat-top"><span>{title}</span><Icon size={17}/></div><strong>{value}</strong></div>}
const today=()=>new Date().toLocaleString('en-PH');
const STAFF_ORDERS_KEY='aquabest-staff-operations-demo-v1';
const STAFF_TRIPS_KEY='aquabest-staff-trips-demo-v1';
const DASH_PERIODS=['Daily','Weekly','Monthly','Yearly','All Time','Custom'];
const readList=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}};
export default function OwnerOperations({page,go,orders,stock,stockLog=[],trips,availability,onMessage,onOpenOrder,expenses,setExpenses}){
 const [settings,setSettings]=useState({deliveryFee:'0',lowStock:'15',hours:'Confirm operating hours with client'});
 const [draft,setDraft]=useState(settings);
 const [audit,setAudit]=useState([]);
 const [verification,setVerification]=useState([]);
 const [approvals,setApprovals]=useState([]);
 const [auditFilter,setAuditFilter]=useState('All');
 const [staffOrders,setStaffOrders]=useState(()=>readList(STAFF_ORDERS_KEY));
 const [staffTrips,setStaffTrips]=useState(()=>readList(STAFF_TRIPS_KEY));
 const [dashSettings,setDashSettings]=useState(()=>loadDashboardSettings());
 const [confirmResetDash,setConfirmResetDash]=useState(false);
 const todayStr=getTodayLocalDate();
 const [dashPeriod,setDashPeriod]=useState(()=>loadDashboardSettings().defaultPeriod);
 const [dashAnchor,setDashAnchor]=useState(todayStr);
 const [customStart,setCustomStart]=useState(todayStr);
 const [customEnd,setCustomEnd]=useState(todayStr);
 const [chartMetric,setChartMetric]=useState(()=>loadDashboardSettings().defaultMetric);
 const [activeChartIdx,setActiveChartIdx]=useState(null);
 const [showSecondaryFinance,setShowSecondaryFinance]=useState(()=>loadDashboardSettings().showSecondaryFinance);
 const [showInventoryDetail,setShowInventoryDetail]=useState(()=>loadDashboardSettings().showContainerStock);
 const [showAllAlerts,setShowAllAlerts]=useState(false);
 useEffect(()=>{const refresh=()=>{setStaffOrders(readList(STAFF_ORDERS_KEY));setStaffTrips(readList(STAFF_TRIPS_KEY));};window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);};},[]);
 const record=description=>{setAudit(old=>[{id:Date.now()+'-'+old.length,description,time:today()},...old]);onMessage(description+' (demo only)')};
 const updateDashSettings=updater=>{
  setDashSettings(prev=>{
   const next=saveDashboardSettings(typeof updater==='function'?updater(prev):updater);
   return next;
  });
 };
 const toggleDashVisibility=key=>{
  updateDashSettings(prev=>({
   ...prev,
   visibility:{...prev.visibility,[key]:!prev.visibility[key]}
  }));
 };
 const applyResetDash=()=>{
  const defaults=resetDashboardSettings();
  setDashSettings(defaults);
  setDashPeriod(defaults.defaultPeriod);
  setChartMetric(defaults.defaultMetric);
  setShowSecondaryFinance(defaults.showSecondaryFinance);
  setShowInventoryDetail(defaults.showContainerStock);
  setConfirmResetDash(false);
  onMessage('Dashboard preferences reset to default');
 };
 const dashboardData=useMemo(()=>buildOwnerDashboardData({orders,expenses,trips,stock,stockLog,period:dashPeriod,anchorDate:dashAnchor,customStart,customEnd,todayStr}),[orders,expenses,trips,stock,stockLog,dashPeriod,dashAnchor,customStart,customEnd,todayStr]);
 const latestOrderDate=useMemo(()=>{const dates=orders.map(o=>o.date).filter(Boolean).sort();return dates.length?dates[dates.length-1]:null;},[orders]);
 const unpaidOrders=orders.filter(o=>o.paymentStatus!=='Paid'&&o.status!=='Cancelled');
 const outstanding=orders.filter(o=>o.paymentStatus!=='Paid').reduce((n,o)=>n+o.amount,0);
 const remittance=trips.reduce((n,t)=>n+(t.remittance==='Awaiting Remittance'?t.collectedCash||0:0),0);
 const pendingElectronic=trips.filter(t=>t.paymentStatus==='Pending Verification'&&!verification.includes(t.id));
 const activity=orders.length+trips.length;
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
 const criticalAlerts=attentionItems.filter(a=>a.severity==='critical');
 const visibleAlerts=showAllAlerts?attentionItems:attentionItems.slice(0,3);
 const chartPts=dashboardData.chart.points;
 const chartValues=chartPts.map(p=>chartMetric==='revenue'?p.revenue:p.orders);
 const chartHasData=chartValues.some(v=>v>0);
 const chartMax=Math.max(chartMetric==='revenue'?100:4,...chartValues);
 const demo=<p className="mgmt-demo">Super Admin GUI prototype only • All values and access controls are local demo state. No real permissions, payments, expenses or pricing changes are applied to the business.</p>;
 const sectionRenderers={
  summary:()=>(
   <section key="summary" className="owner-dash-section" aria-label="Business Performance Summary">
    <div className="owner-dash-section-head">
     <h2>Business Performance Summary</h2>
     <button type="button" className="mgmt-link" onClick={()=>setShowSecondaryFinance(v=>!v)}>
      {showSecondaryFinance?'Hide Secondary':'Secondary Details'} {showSecondaryFinance?<FiChevronUp/>:<FiChevronDown/>}
     </button>
    </div>
    <div className="owner-kpi-grid">
     <div className="owner-finance-card">
      <span className="owner-kpi-top"><span>Recorded Sales</span><FiBarChart2 size={16} aria-hidden="true"/></span>
      <strong>{formatMoney(dashboardData.financials.grossSales)}</strong>
      <small>Non-cancelled orders in range (not all collected)</small>
     </div>
     <div className="owner-finance-card">
      <span className="owner-kpi-top"><span>Total Orders</span><FiClipboard size={16} aria-hidden="true"/></span>
      <strong>{dashboardData.financials.totalOrders}</strong>
      <small>Active orders in selected period</small>
     </div>
     <div className="owner-finance-card verified">
      <span className="owner-kpi-top"><span>Verified Collected</span><FiDollarSign size={16} aria-hidden="true"/></span>
      <strong>{formatMoney(dashboardData.financials.verifiedCollected)}</strong>
      <small>Orders explicitly marked Paid</small>
     </div>
     <div className="owner-finance-card pending">
      <span className="owner-kpi-top"><span>Unpaid / Unverified</span><FiClock size={16} aria-hidden="true"/></span>
      <strong>{formatMoney(dashboardData.financials.outstandingBalance)}</strong>
      <small>Unpaid balances not yet collected</small>
     </div>
    </div>
    {showSecondaryFinance&&(
     <div className="owner-secondary-finance">
      <div><span>Cash Pending Remittance (Trips)</span><strong>{formatMoney(remittance)}</strong></div>
      <div><span>Recorded Expenses (Period)</span><strong>{formatMoney(dashboardData.financials.recordedExpenses)}</strong></div>
     </div>
    )}
   </section>
  ),
  attention:()=>(
   <section key="attention" className="owner-dash-section" aria-label="Needs Attention">
    <div className="owner-dash-section-head">
     <h2>Needs Attention</h2>
     {attentionItems.length>3&&(
      <button type="button" className="mgmt-link" onClick={()=>setShowAllAlerts(v=>!v)}>
       {showAllAlerts?'Show Less':`View All (${attentionItems.length})`}
      </button>
     )}
    </div>
    {visibleAlerts.length>0?(
     <div className="owner-attention-list">
      {visibleAlerts.map(({id,severity,title,meta,target,Icon})=>(
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
  ),
  salesChart:()=>(
   <section key="salesChart" className="owner-dash-section" aria-label="Sales Performance Graph">
    <div className="owner-dash-section-head">
     <div>
      <h2>Sales Performance</h2>
      <p className="owner-dash-note">
       {dashPeriod} • {dashboardData.range.label} • {formatMoney(dashboardData.financials.grossSales)} ({dashboardData.financials.totalOrders} order{dashboardData.financials.totalOrders===1?'':'s'})
       {dashboardData.previousComparison&&dashboardData.previousComparison.deltaPct!==null&&` • ${dashboardData.previousComparison.deltaPct>=0?'+':''}${dashboardData.previousComparison.deltaPct.toFixed(1)}% vs prev`}
      </p>
     </div>
     <div className="owner-metric-toggle" role="group" aria-label="Chart metric">
      <button type="button" className={chartMetric==='revenue'?'active':''} onClick={()=>{setChartMetric('revenue');setActiveChartIdx(null);}}>Revenue</button>
      <button type="button" className={chartMetric==='orders'?'active':''} onClick={()=>{setChartMetric('orders');setActiveChartIdx(null);}}>Order Count</button>
     </div>
    </div>
    <div className="owner-chart-box">
     {dashPeriod==='Daily'&&!dashboardData.chart.hasHourlyTimestamps?(
      <div className="owner-chart-empty">
       <FiClock size={20} color="#244ea3" aria-hidden="true"/>
       <strong>{dashboardData.financials.totalOrders>0?`Daily Total: ${formatMoney(dashboardData.financials.grossSales)} (${dashboardData.financials.totalOrders} order${dashboardData.financials.totalOrders===1?'':'s'})`:`No transactions recorded for ${dashboardData.range.label}`}</strong>
       <small>Hourly chart breakdown is unavailable because transaction timestamps are not recorded in local fixtures.</small>
       {dashboardData.financials.totalOrders===0&&latestOrderDate&&latestOrderDate!==dashAnchor&&(
        <button type="button" className="mgmt-btn secondary" onClick={()=>setDashAnchor(latestOrderDate)}>View latest recorded activity — {latestOrderDate}</button>
       )}
      </div>
     ):chartHasData?(
      <div className="owner-chart-scroll">
       <svg viewBox="0 0 560 175" className="owner-svg-chart" role="img" aria-label={`Sales performance ${chartMetric} chart`}>
        {[0,0.5,1].map((pct,i)=>{
         const y=145-pct*115;
         return <g key={i}><line x1="46" y1={y} x2="544" y2={y} stroke="#e6edf5" strokeDasharray="3 3"/><text x="40" y={y+3} textAnchor="end" fontSize="9" fill="#64748d">{chartMetric==='revenue'?formatMoney(Math.round(chartMax*pct)):Math.round(chartMax*pct)}</text></g>;
        })}
        {(()=>{
         const stepX=(544-56)/Math.max(1,chartPts.length-1);
         const showLabel=i=>chartPts.length<=12||i===0||i===chartPts.length-1||i%5===0;
         if(chartMetric==='orders'){
          const barW=Math.max(8,Math.min(28,Math.floor(420/Math.max(1,chartPts.length))));
          return chartPts.map((pt,i)=>{
           const cx=chartPts.length===1?300:56+i*stepX;
           const barH=(pt.orders/chartMax)*115;
           const y=145-barH;
           return (
            <g key={i} style={{cursor:'pointer'}} onClick={()=>setActiveChartIdx(i)} onMouseEnter={()=>setActiveChartIdx(i)}>
             {showLabel(i)&&<text x={cx} y="164" textAnchor="middle" fontSize="9" fill="#64748d">{pt.label}</text>}
             <rect x={cx-barW/2} y={Math.min(143,y)} width={barW} height={Math.max(2,barH)} rx="3" fill={activeChartIdx===i?'#2aa9c5':'#244ea3'}/>
            </g>
           );
          });
         }
         const pts=chartPts.map((pt,i)=>({
          x:chartPts.length===1?300:56+i*stepX,
          y:145-(pt.revenue/chartMax)*115,
          pt
         }));
         const d=pts.map((p,i)=>`${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
         return <>
          {pts.length>1&&<path d={d} fill="none" stroke="#244ea3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
          {pts.map((p,i)=>(
           <g key={i}>
            {showLabel(i)&&<text x={p.x} y="164" textAnchor="middle" fontSize="9" fill="#64748d">{p.pt.label}</text>}
            <circle cx={p.x} cy={p.y} r={activeChartIdx===i?5.5:3.5} fill={activeChartIdx===i?'#2aa9c5':'#244ea3'} stroke="#fff" strokeWidth="1.5"/>
            <circle cx={p.x} cy={p.y} r="18" fill="transparent" style={{cursor:'pointer'}} onClick={()=>setActiveChartIdx(i)} onMouseEnter={()=>setActiveChartIdx(i)}/>
           </g>
          ))}
         </>;
        })()}
       </svg>
       {activeChartIdx!==null&&chartPts[activeChartIdx]&&(
        <div className="owner-chart-tooltip">
         <strong>{chartPts[activeChartIdx].fullLabel}:</strong>{' '}
         {chartMetric==='revenue'?formatMoney(chartPts[activeChartIdx].revenue):`${chartPts[activeChartIdx].orders} order(s)`}
        </div>
       )}
      </div>
     ):(
      <div className="owner-chart-empty">
       <FiTrendingUp size={20} color="#64748d" aria-hidden="true"/>
       <strong>No transactions recorded for {dashboardData.range.label}</strong>
       <small>Select another date range or record a new order in POS.</small>
       {latestOrderDate&&(
        <button type="button" className="mgmt-btn secondary" onClick={()=>{setDashPeriod('Daily');setDashAnchor(latestOrderDate);setActiveChartIdx(null);}}>View latest recorded activity — {latestOrderDate}</button>
       )}
      </div>
     )}
    </div>
   </section>
  ),
  gallonActivity:()=>(
   <section key="gallonActivity" className="owner-dash-section" aria-label="Gallon and Container Activity">
    <div className="owner-dash-section-head">
     <h2>Gallon & Container Activity</h2>
     {dashSettings.visibility.containerStock&&(
      <button type="button" className="mgmt-link" onClick={()=>setShowInventoryDetail(v=>!v)}>
       {showInventoryDetail?'Hide Stock':'Container Stock'} {showInventoryDetail?<FiChevronUp/>:<FiChevronDown/>}
      </button>
     )}
    </div>
    <div className="owner-gallon-grid">
     <div className="owner-gallon-card">
      <span>Gallons Refilled</span>
      <strong>{dashboardData.gallons.gallonsRefilled}</strong>
      <small>Completed refills in period</small>
     </div>
     <div className="owner-gallon-card">
      <span>New Gallons Sold</span>
      <strong>{dashboardData.gallons.newGallonsSold}</strong>
      <small>New containers sold (not refills)</small>
     </div>
     <div className="owner-gallon-card">
      <span>Gallons Issued / Borrowed</span>
      <strong>{dashboardData.gallons.gallonsBorrowed}</strong>
      <small>Returnable containers issued</small>
     </div>
     <div className="owner-gallon-card">
      <span>Gallons Returned / Collected</span>
      <strong>{dashboardData.gallons.gallonsReturned}</strong>
      <small>Empties collected & returns</small>
     </div>
     <div className="owner-gallon-card muted">
      <span>Outstanding Borrowed</span>
      <strong>Not Tracked</strong>
      <small>Needs customer borrow-return IDs</small>
     </div>
     {dashSettings.visibility.containerStock&&(
      <div className="owner-gallon-card">
       <span>Available Gallon Stock (Current)</span>
       <strong>{dashboardData.gallons.totalAvailableStock}</strong>
       <small>{lowStockCount>0?`${lowStockCount} low-stock size(s)`:'All sizes above minimum'}</small>
      </div>
     )}
    </div>
    {dashSettings.visibility.containerStock&&showInventoryDetail&&(
     <div className="owner-inventory-detail">
      {dashboardData.gallons.stockItems.map(item=>(
       <div key={item.id} className="owner-inv-row">
        <span>{item.label}</span>
        <strong className={item.low?'low':''}>{item.quantity} on hand <small>(min {item.minimum})</small></strong>
       </div>
      ))}
      <p className="owner-dash-note"><FiInfo size={12} style={{verticalAlign:'-2px'}}/> Empty vs. full separation, damaged/repair counts, and per-customer outstanding borrowed gallons require dedicated container-ledger fields.</p>
     </div>
    )}
   </section>
  ),
  operations:()=>(
   <section key="operations" className="owner-dash-section" aria-label="Operations Overview">
    <div className="owner-dash-section-head">
     <h2>Operations Overview</h2>
     <button type="button" className="mgmt-link" onClick={()=>go('queue')}>Open Queue</button>
    </div>
    <div className="owner-kpi-grid">
     <button type="button" className="owner-kpi-card" onClick={()=>go('queue')}>
      <span className="owner-kpi-top"><span>Pending Collection</span><FiTruck size={16} aria-hidden="true"/></span>
      <strong>{pendingCollection}</strong>
      <small>Awaiting pickup</small>
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
   </section>
  ),
  recentActivity:()=>(
   <section key="recentActivity" className="owner-dash-section" aria-label="Recent Business Activity">
    <div className="owner-dash-section-head">
     <h2>Recent Business Activity</h2>
     <button type="button" className="mgmt-link" onClick={()=>go('orders')}>View All</button>
    </div>
    <div className="owner-tx-list">
     {dashboardData.activity.length>0?dashboardData.activity.slice(0,5).map(item=>(
      <button key={item.id} type="button" className="owner-tx-row" onClick={()=>item.order&&onOpenOrder?onOpenOrder(item.order):go('orders')}>
       <div className="owner-tx-info">
        <strong>{item.type} · {item.ref}</strong>
        <small>{item.detail} • {item.date||'Unspecified'}</small>
        <div className="owner-tx-badges">
         <span className={`mgmt-pill ${item.status==='Completed'||item.status==='Delivered'||item.status==='IN'?'ok':item.status==='Pending Confirmation'?'warn':''}`}>{item.status}</span>
         {item.paymentStatus&&<span className={`mgmt-pill ${item.paymentStatus==='Paid'?'ok':'warn'}`}>{item.paymentStatus}</span>}
        </div>
       </div>
       <div className="owner-tx-amount">
        <strong>{item.amount!==undefined?formatMoney(item.amount):`${item.quantity} qty`}</strong>
        <FiChevronRight size={16} aria-hidden="true"/>
       </div>
      </button>
     )):(
      <div className="owner-empty" style={{padding:18}}>
       <p>No business activity recorded for {dashboardData.range.label}.</p>
      </div>
     )}
    </div>
   </section>
  )
 };
 return <>
 {page==='dashboard'&&<div className={`owner-dash ${dashSettings.density==='compact'?'compact':''}`}>
  {/* 1. Dashboard Header */}
  <header className="owner-dash-header">
   <div className="owner-dash-title-row">
    <div>
     <h1>Super Admin Dashboard</h1>
     <p>Business Overview</p>
    </div>
    {dashSettings.visibility.quickActions&&(
     <div className="owner-dash-quick-links">
      <button type="button" className="mgmt-btn secondary" onClick={()=>go('pos')}>New Order</button>
      <button type="button" className="mgmt-btn secondary" onClick={()=>go('reports')}>Sales Reports</button>
      <button type="button" className="mgmt-btn secondary" onClick={()=>go('dashboard-settings')}><FiSliders size={14} aria-hidden="true"/> Dashboard Settings</button>
     </div>
    )}
   </div>

   {/* 2. Date Range Controls */}
   <div className="owner-date-controls">
    <div className="owner-period-pills" role="tablist" aria-label="Dashboard date range">
     {DASH_PERIODS.map(p=>(
      <button key={p} type="button" className={dashPeriod===p?'active':''} onClick={()=>{setDashPeriod(p);setActiveChartIdx(null);}}>{p}</button>
     ))}
    </div>

    {dashPeriod==='Custom'?(
     <div className="owner-custom-range">
      <label><span>From</span><input type="date" max={todayStr} value={customStart} onChange={e=>setCustomStart(e.target.value||todayStr)}/></label>
      <label><span>To</span><input type="date" max={todayStr} min={customStart} value={customEnd} onChange={e=>setCustomEnd(e.target.value||customStart)}/></label>
     </div>
    ):dashPeriod!=='All Time'&&(
     <div className="owner-date-nav">
      <button type="button" className="mgmt-btn secondary" onClick={()=>{setDashAnchor(shiftAnchorDate(dashAnchor,dashPeriod,-1));setActiveChartIdx(null);}}>Prev</button>
      <label className="owner-date-picker" title="Select business date">
       <FiCalendar size={14} aria-hidden="true"/>
       <span>{dashboardData.range.label}</span>
       <input type="date" max={todayStr} value={dashAnchor} onChange={e=>{if(e.target.value){setDashAnchor(e.target.value>todayStr?todayStr:e.target.value);setActiveChartIdx(null);}}}/>
      </label>
      <button type="button" className="mgmt-btn secondary" disabled={shiftAnchorDate(dashAnchor,dashPeriod,1)>todayStr} onClick={()=>{const next=shiftAnchorDate(dashAnchor,dashPeriod,1);if(next<=todayStr){setDashAnchor(next);setActiveChartIdx(null);}}}>Next</button>
     </div>
    )}
   </div>
  </header>

  {/* Critical unresolved alerts remain accessible even if Needs Attention is hidden */}
  {!dashSettings.visibility.attention&&criticalAlerts.length>0&&(
   <div className="owner-attention-list" aria-label="Critical Alerts">
    {criticalAlerts.map(({id,title,meta,target,Icon})=>(
     <button key={id} type="button" className="owner-attention-item critical" onClick={()=>go(target)}>
      <span className="owner-attention-icon"><Icon size={17} aria-hidden="true"/></span>
      <span className="owner-attention-body"><strong>{title}</strong><small>{meta}</small></span>
      <FiChevronRight className="owner-attention-chevron" aria-hidden="true"/>
     </button>
    ))}
   </div>
  )}

  {dashSettings.order.map(id=>dashSettings.visibility[id]?sectionRenderers[id]?.():null)}
  {demo}
 </div>}
 {page==='dashboard-settings'&&<div className="owner-dash-settings">
  <Title eyebrow="Personalization" title="Dashboard Settings" description="Choose which sections appear on your Super Admin Dashboard, rearrange their order, and set default display preferences."/>
  <div className="mgmt-notice">Personalization only — hiding a dashboard section does not restrict access to underlying modules or modify role permissions.</div>

  <div className="mgmt-card">
   <div className="mgmt-section-title" style={{marginTop:0}}><h2>Visible Sections & Controls</h2></div>
   <div className="owner-settings-list">
    {[
     ...DASHBOARD_SECTIONS,
     {id:'containerStock',label:'Container Stock',description:'Show current available gallon inventory inside Gallon & Container Activity.'},
     {id:'quickActions',label:'Quick Actions',description:'Show New Order, Sales Reports, and Dashboard Settings buttons in header.'}
    ].map(item=>(
     <label key={item.id} className="owner-toggle-row">
      <span><strong>{item.label}</strong><small>{item.description}</small></span>
      <input type="checkbox" checked={Boolean(dashSettings.visibility[item.id])} onChange={()=>toggleDashVisibility(item.id)}/>
     </label>
    ))}
   </div>
  </div>

  <div className="mgmt-card" style={{marginTop:14}}>
   <div className="mgmt-section-title" style={{marginTop:0}}><h2>Section Arrangement</h2></div>
   <div className="owner-settings-list">
    {dashSettings.order.map((secId,idx)=>{
     const meta=DASHBOARD_SECTIONS.find(s=>s.id===secId);
     if(!meta)return null;
     return (
      <div key={secId} className="owner-order-row">
       <span><strong>{idx+1}. {meta.label}</strong><small>{dashSettings.visibility[secId]?'Visible':'Hidden'}</small></span>
       <div className="owner-order-actions">
        <button type="button" className="mgmt-btn secondary" disabled={idx===0} aria-label={`Move ${meta.label} up`} onClick={()=>updateDashSettings(prev=>({...prev,order:moveDashboardSection(prev.order,secId,-1)}))}><FiArrowUp/></button>
        <button type="button" className="mgmt-btn secondary" disabled={idx===dashSettings.order.length-1} aria-label={`Move ${meta.label} down`} onClick={()=>updateDashSettings(prev=>({...prev,order:moveDashboardSection(prev.order,secId,1)}))}><FiArrowDown/></button>
       </div>
      </div>
     );
    })}
   </div>
  </div>

  <div className="mgmt-card" style={{marginTop:14}}>
   <div className="mgmt-section-title" style={{marginTop:0}}><h2>Display Preferences</h2></div>
   <div className="mgmt-formgrid">
    <div className="mgmt-field">
     <label>Default Date Range</label>
     <select value={dashSettings.defaultPeriod} onChange={e=>{const val=e.target.value;updateDashSettings(prev=>({...prev,defaultPeriod:val}));setDashPeriod(val);}}>
      {VALID_DEFAULT_PERIODS.map(p=><option key={p} value={p}>{p}</option>)}
     </select>
    </div>
    <div className="mgmt-field">
     <label>Default Chart Metric</label>
     <select value={dashSettings.defaultMetric} onChange={e=>{const val=e.target.value;updateDashSettings(prev=>({...prev,defaultMetric:val}));setChartMetric(val);}}>
      {VALID_DEFAULT_METRICS.map(m=><option key={m} value={m}>{m==='revenue'?'Revenue (₱)':'Order Count'}</option>)}
     </select>
    </div>
    <div className="mgmt-field">
     <label>Dashboard Density</label>
     <select value={dashSettings.density} onChange={e=>updateDashSettings(prev=>({...prev,density:e.target.value}))}>
      {VALID_DENSITIES.map(d=><option key={d} value={d}>{d==='comfortable'?'Comfortable':'Compact'}</option>)}
     </select>
    </div>
   </div>
   <div className="owner-settings-list" style={{marginTop:10}}>
    <label className="owner-toggle-row">
     <span><strong>Expand Secondary Financial Metrics by Default</strong><small>Show Cash Pending Remittance and Recorded Expenses automatically.</small></span>
     <input type="checkbox" checked={dashSettings.showSecondaryFinance} onChange={e=>{const v=e.target.checked;updateDashSettings(prev=>({...prev,showSecondaryFinance:v}));setShowSecondaryFinance(v);}}/>
    </label>
    <label className="owner-toggle-row">
     <span><strong>Expand Container Stock Detail by Default</strong><small>Show per-size inventory breakdown automatically.</small></span>
     <input type="checkbox" checked={dashSettings.showContainerStock} onChange={e=>{const v=e.target.checked;updateDashSettings(prev=>({...prev,showContainerStock:v}));setShowInventoryDetail(v);}}/>
    </label>
   </div>
  </div>

  <div className="owner-actions" style={{marginTop:16}}>
   <button type="button" className="mgmt-btn" onClick={()=>go('dashboard')}>Back to Dashboard</button>
   {!confirmResetDash?(
    <button type="button" className="mgmt-btn secondary" onClick={()=>setConfirmResetDash(true)}><FiRotateCcw/> Reset to Default</button>
   ):(
    <div className="owner-reset-confirm">
     <span>Reset layout & preferences? Business data will not be deleted.</span>
     <button type="button" className="mgmt-btn" onClick={applyResetDash}>Confirm Reset</button>
     <button type="button" className="mgmt-btn secondary" onClick={()=>setConfirmResetDash(false)}>Cancel</button>
    </div>
   )}
  </div>
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
  <div className="mgmt-card"><strong>Store Operating Rules</strong><div className="mgmt-formgrid">{[['deliveryFee','Delivery fee (₱)'],['lowStock','Low-stock threshold'],['hours','Operating hours']].map(([key,l])=><div className="mgmt-field" key={key}><label>{l}</label><input value={draft[key]} onChange={e=>setDraft(old=>({...old,[key]:e.target.value}))}/></div>)}</div><div className="owner-actions"><button className="mgmt-btn" onClick={()=>{setSettings({...draft});record('Updated business operating settings')}}><FiSave/> Save Settings</button><button className="mgmt-btn secondary" onClick={()=>go('products')}>Manage Products & Prices</button><button className="mgmt-btn secondary" onClick={()=>go('dashboard-settings')}><FiSliders/> Dashboard Settings</button></div><p className="mgmt-sub">Saved demo delivery fee: {settings.deliveryFee}</p></div>{demo}
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
  <div className="mgmt-more">{[[FiClipboard,'Operations Queue','queue','Operational task execution'],[FiUsers,'Staff Monitoring','staff','Staff workload and availability'],[FiTruck,'Trips & Pickups','collections','Delivery trips and customer pickups'],[FiPackage,'Products & Services','products','Manage products, prices and stock alerts'],[FiClipboard,'Orders','orders','Order records and status tracking'],[FiTruck,'Delivery','delivery','Dispatch assignments and drop-offs'],[FiPackage,'Inventory','inventory','Bottle stock and movement logs'],[FiCreditCard,'Payments','payments','Collections and unpaid balances'],[FiUsers,'Employees & Access','employees','Accounts and role permissions'],[FiSettings,'Settings','settings','Product prices and business rules'],[FiSliders,'Dashboard Settings','dashboard-settings','Customize dashboard sections and layout'],[FiShield,'Audit Logs','audit','Administrative activity and audit history'],[FiAlertTriangle,'Verification','approvals','Electronic proofs and cash remittances']].map(([Icon,title,target,desc])=><button key={target} onClick={()=>go(target)}><Icon/><strong>{title}</strong><small>{desc}</small></button>)}</div>{demo}
 </>}
 </>;
}
