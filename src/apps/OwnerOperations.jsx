import {useEffect,useMemo,useState} from 'react';
import {FiBarChart2,FiUsers,FiCreditCard,FiSettings,FiShield,FiSave,FiClock,FiCheckCircle,FiActivity,FiPackage,FiTruck,FiClipboard,FiAlertTriangle,FiDroplet,FiChevronRight,FiChevronDown,FiChevronUp,FiTrendingUp,FiInfo,FiSliders,FiArrowUp,FiArrowDown,FiRotateCcw,FiLayout,FiCheckSquare,FiGrid} from 'react-icons/fi';
import PesoIcon from '../components/PesoIcon.jsx';
import {formatMoney} from '../data/managerDemo.js';
import {getTodayLocalDate} from '../utils/reportDateUtils.js';
import {buildOwnerDashboardData} from '../utils/buildOwnerDashboardData.js';
import {
 DATE_RANGE_PRESETS,
 formatDateRangeDisplay,
 resolveDateRangePreset
} from '../utils/dateRangePresets.js';
import {
 DASHBOARD_SECTIONS,
 DASHBOARD_METRIC_OPTIONS,
 VALID_DEFAULT_METRICS,
 VALID_DENSITIES,
 getDefaultDashboardSettings,
 loadDashboardSettings,
 saveDashboardSettings,
 resetDashboardSettings,
 moveDashboardSection
} from '../utils/ownerDashboardSettings.js';
import DateRangeSelector from './DateRangeSelector.jsx';
import EmployeeDirectory from './EmployeeDirectory.jsx';
import ProductCatalog from './ProductCatalog.jsx';
import SalesReports from './SalesReports.jsx';

// Only Owner-specific pages. POS, Orders, Delivery, Inventory and Payments reuse Manager pages.
function Title({eyebrow,title,description}){return <div className="mgmt-heading"><div className="overline">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>}
function Stat({title,value,Icon}){return <div className="mgmt-stat"><div className="mgmt-stat-top"><span>{title}</span><Icon size={17}/></div><strong>{value}</strong></div>}
const today=()=>new Date().toLocaleString('en-PH');
const STAFF_ORDERS_KEY='aquabest-staff-operations-demo-v1';
const STAFF_TRIPS_KEY='aquabest-staff-trips-demo-v1';
const DEFAULT_PRESET_CHOICES=DATE_RANGE_PRESETS.filter(p=>p.id!=='custom');
const METRIC_GROUPS=['Business Performance','Gallon & Container Activity'];
const readList=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}};

export default function OwnerOperations({
 page,
 go,
 orders,
 stock,
 stockLog=[],
 containerMovements=[],
 trips,
 employees=[],
 availability,
 onMessage,
 onOpenOrder,
 expenses,
 setExpenses,
 isDemoMode=true,
 onResetDemoData
}){
 const [settings,setSettings]=useState({deliveryFee:'0',lowStock:'15',hours:'7:00 AM – 7:00 PM (Mon–Sun · Demo)'});
 const [draft,setDraft]=useState(settings);
 const [audit,setAudit]=useState([]);
 const [verification,setVerification]=useState([]);
 const [approvals,setApprovals]=useState([]);
 const [auditFilter,setAuditFilter]=useState('All');
 const [staffOrders,setStaffOrders]=useState(()=>readList(STAFF_ORDERS_KEY));
 const [staffTrips,setStaffTrips]=useState(()=>readList(STAFF_TRIPS_KEY));

 const todayStr=getTodayLocalDate();
 const [dashSettings,setDashSettings]=useState(()=>loadDashboardSettings());
 const [draftDashSettings,setDraftDashSettings]=useState(()=>loadDashboardSettings());
 const [custTab,setCustTab]=useState('sections');
 const [confirmResetDash,setConfirmResetDash]=useState(false);
 const [confirmResetDemo,setConfirmResetDemo]=useState(false);

 const [dateSelection,setDateSelection]=useState(()=>resolveDateRangePreset(loadDashboardSettings().defaultPreset,{todayStr}));
 const [chartMetric,setChartMetric]=useState(()=>loadDashboardSettings().defaultMetric);
 const [activeChartIdx,setActiveChartIdx]=useState(null);
 const [showSecondaryFinance,setShowSecondaryFinance]=useState(()=>loadDashboardSettings().showSecondaryFinance);
 const [showInventoryDetail,setShowInventoryDetail]=useState(()=>loadDashboardSettings().showContainerStock);
 const [showAllAlerts,setShowAllAlerts]=useState(false);

 useEffect(()=>{
  const refresh=()=>{setStaffOrders(readList(STAFF_ORDERS_KEY));setStaffTrips(readList(STAFF_TRIPS_KEY));};
  window.addEventListener('focus',refresh);
  window.addEventListener('storage',refresh);
  return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);};
 },[]);

 const record=description=>{setAudit(old=>[{id:Date.now()+'-'+old.length,description,time:today()},...old]);onMessage(description+(isDemoMode?' (demo only)':''))};

 const openCustomizeDashboard=()=>{
  setDraftDashSettings(dashSettings);
  setCustTab('sections');
  setConfirmResetDash(false);
  go('customize-dashboard');
 };

 const toggleDraftVisibility=key=>{
  setDraftDashSettings(prev=>({
   ...prev,
   visibility:{...prev.visibility,[key]:!prev.visibility[key]}
  }));
 };

 const toggleDraftMetric=key=>{
  setDraftDashSettings(prev=>({
   ...prev,
   metrics:{...prev.metrics,[key]:!prev.metrics[key]}
  }));
 };

 const restoreDraftDefaultVisibility=()=>{
  const defaults=getDefaultDashboardSettings();
  setDraftDashSettings(prev=>({...prev,visibility:{...defaults.visibility}}));
 };

 const restoreDraftDefaultArrangement=()=>{
  const defaults=getDefaultDashboardSettings();
  setDraftDashSettings(prev=>({
   ...prev,
   order:[...defaults.order],
   density:defaults.density,
   defaultPreset:defaults.defaultPreset,
   defaultPeriod:defaults.defaultPeriod,
   defaultMetric:defaults.defaultMetric,
   showSecondaryFinance:defaults.showSecondaryFinance,
   showContainerStock:defaults.showContainerStock
  }));
 };

 const handleSaveCustomizeDashboard=()=>{
  const saved=saveDashboardSettings(draftDashSettings);
  setDashSettings(saved);
  setDraftDashSettings(saved);
  setDateSelection(resolveDateRangePreset(saved.defaultPreset,{todayStr,records:orders}));
  setChartMetric(saved.defaultMetric);
  setShowSecondaryFinance(saved.showSecondaryFinance);
  setShowInventoryDetail(saved.showContainerStock);
  setActiveChartIdx(null);
  setConfirmResetDash(false);
  onMessage('Dashboard customization saved');
  go('dashboard');
 };

 const handleCancelCustomizeDashboard=()=>{
  setDraftDashSettings(dashSettings);
  setConfirmResetDash(false);
  go('settings');
 };

 const applyResetDash=()=>{
  const defaults=resetDashboardSettings();
  setDashSettings(defaults);
  setDraftDashSettings(defaults);
  setDateSelection(resolveDateRangePreset(defaults.defaultPreset,{todayStr,records:orders}));
  setChartMetric(defaults.defaultMetric);
  setShowSecondaryFinance(defaults.showSecondaryFinance);
  setShowInventoryDetail(defaults.showContainerStock);
  setActiveChartIdx(null);
  setConfirmResetDash(false);
  onMessage('Dashboard preferences reset to default');
 };

 const dashboardData=useMemo(()=>buildOwnerDashboardData({
  orders,
  expenses,
  trips,
  stock,
  stockLog,
  containerMovements,
  period:dateSelection.period,
  anchorDate:dateSelection.anchorDate,
  customStart:dateSelection.startDate,
  customEnd:dateSelection.endDate,
  todayStr
 }),[orders,expenses,trips,stock,stockLog,containerMovements,dateSelection,todayStr]);

 const latestOrderDate=useMemo(()=>{
  const dates=orders.map(o=>o.date).filter(Boolean).sort();
  return dates.length?dates[dates.length-1]:null;
 },[orders]);

 const unpaidOrders=orders.filter(o=>o.paymentStatus==='Unpaid'&&o.status!=='Cancelled');
 const outstanding=unpaidOrders.reduce((n,o)=>n+(Number(o.amount)||0),0);
 const remittance=trips.reduce((n,t)=>n+(t.remittance==='Awaiting Remittance'?t.collectedCash||0:0),0);
 const pendingElectronic=trips.filter(t=>t.paymentStatus==='Pending Verification'&&!verification.includes(t.id));
 const activity=orders.length+trips.length;
 const operationalQueue=staffOrders.length?staffOrders:orders.map(o=>({...o,stage:({'Pending Confirmation':'collection',Confirmed:'pending',Preparing:'pending',Ready:'ready','Out for Delivery':'out',Delivered:'delivered',Completed:'picked',Cancelled:'failed'})[o.status]||'pending'}));
 const pendingCollection=operationalQueue.filter(o=>o.stage==='collection').length;
 const pendingRefill=operationalQueue.filter(o=>o.stage==='pending').length;
 const readyDelivery=operationalQueue.filter(o=>o.stage==='ready').length;
 const activeDelivery=operationalQueue.filter(o=>['delivery','out'].includes(o.stage)).length;
 const failedTripsCount=trips.filter(t=>t.status==='Failed Delivery'||Boolean(t.failureReason)).length;
 const lowStockCount=stock.filter(s=>s.quantity<s.minimum).length;
 const activeOperationalTrips=staffTrips.length?staffTrips.filter(t=>t.status==='active').length:trips.filter(t=>!['Delivered','Failed Delivery','closed'].includes(t.status)).length;
 const attentionItems=[
  failedTripsCount>0&&{id:'issues',severity:'critical',title:`${failedTripsCount} failed or delayed delivery issue${failedTripsCount===1?'':'s'} requiring review`,meta:'Inspect delivery exceptions in Trips & Pickups',target:'collections',Icon:FiAlertTriangle},
  lowStockCount>0&&{id:'low-stock',severity:'critical',title:`${lowStockCount} low stock container size${lowStockCount===1?'':'s'}`,meta:'Review bottle inventory & minimum stock thresholds',target:'inventory',Icon:FiPackage},
  pendingElectronic.length>0&&{id:'verify',severity:'warning',title:`${pendingElectronic.length} pending payment verification${pendingElectronic.length===1?'':'s'}`,meta:'Review submitted GCash or bank references',target:'approvals',Icon:FiCreditCard},
  remittance>0&&{id:'remittance',severity:'warning',title:`${formatMoney(remittance)} driver cash awaiting remittance`,meta:'Confirm physical cash handover in Payment Verification',target:'approvals',Icon:PesoIcon},
  unpaidOrders.length>0&&{id:'unpaid',severity:'warning',title:`${unpaidOrders.length} unpaid order${unpaidOrders.length===1?'':'s'} (${formatMoney(outstanding)})`,meta:'Track outstanding customer balances in Payments',target:'payments',Icon:FiClock},
  activeDelivery>0&&{id:'active-delivery',severity:'info',title:`${activeDelivery} active delivery order${activeDelivery===1?'':'s'} in progress`,meta:`Across ${activeOperationalTrips} active trip${activeOperationalTrips===1?'':'s'} — monitor in Trips & Pickups`,target:'collections',Icon:FiTruck}
 ].filter(Boolean);
 const criticalAlerts=attentionItems.filter(a=>a.severity==='critical');
 const visibleAlerts=showAllAlerts?attentionItems:attentionItems.slice(0,3);
 const chartPts=dashboardData.chart.points;
 const chartValues=chartPts.map(p=>chartMetric==='revenue'?p.revenue:p.orders);
 const chartHasData=chartValues.some(v=>v>0);
 const chartMax=Math.max(chartMetric==='revenue'?100:4,...chartValues);
 const activeRangeLabel=formatDateRangeDisplay(dateSelection);
 const opResult=dashboardData.financials.recordedOperatingResult;
 const opResultSign=opResult>0?'positive':opResult<0?'negative':'neutral';
 const demo=<p className="mgmt-demo">{isDemoMode?'Static Demo Mode · Synthetic demonstration data (September–November 2026). Browser-local changes are not synchronized across devices and do not represent live transactions.':'Local API Mode · Connected to temporary SQLite backend for local integration testing and backend handoff.'}</p>;

 const jumpToLatestDate=()=>{
  if(!latestOrderDate)return;
  setDateSelection(resolveDateRangePreset('custom',{todayStr,customStart:latestOrderDate,customEnd:latestOrderDate,records:orders}));
  setActiveChartIdx(null);
 };

 const m=dashSettings.metrics||{};

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
     {m.recordedSales!==false&&(
      <div className="owner-finance-card">
       <span className="owner-kpi-top"><span>Recorded Sales</span><FiBarChart2 size={16} aria-hidden="true"/></span>
       <strong>{formatMoney(dashboardData.financials.completedSales)}</strong>
       <small>Completed sales in range (not all collected)</small>
      </div>
     )}
     {m.totalOrders!==false&&(
      <div className="owner-finance-card">
       <span className="owner-kpi-top"><span>Total Orders</span><FiClipboard size={16} aria-hidden="true"/></span>
       <strong>{dashboardData.financials.completedOrdersCount}</strong>
       <small>Completed orders in selected period</small>
      </div>
     )}
     {m.verifiedCollected!==false&&(
      <div className="owner-finance-card verified">
       <span className="owner-kpi-top"><span>Verified Collected</span><PesoIcon size={16} aria-hidden="true"/></span>
       <strong>{formatMoney(dashboardData.financials.verifiedCollectedCompleted)}</strong>
       <small>Completed sales explicitly marked Paid</small>
      </div>
     )}
     {m.unpaidBalance!==false&&(
      <div className="owner-finance-card pending">
       <span className="owner-kpi-top"><span>Unpaid Completed</span><FiClock size={16} aria-hidden="true"/></span>
       <strong>{formatMoney(dashboardData.financials.unpaidCompletedSales)}</strong>
       <small>Completed orders awaiting collection</small>
      </div>
     )}
    </div>

    <div className={`owner-op-result ${opResultSign}`} role="region" aria-label="Recorded Operating Result">
     <div className="owner-op-result-main">
      <span className="owner-op-result-label">Recorded Operating Result (Demo)</span>
      <strong>{opResult>0?'+':opResult<0?'-':''}{formatMoney(Math.abs(opResult))}</strong>
     </div>
     <div className="owner-op-result-meta">
      <span>Completed Sales ({formatMoney(dashboardData.financials.completedSales)}) − Active Expenses ({formatMoney(dashboardData.financials.recordedExpenses)})</span>
      <small>Operating indicator only — not an audited net profit calculation.</small>
     </div>
    </div>

    {showSecondaryFinance&&(
     <div className="owner-secondary-finance">
      <div><span>Active Recorded Expenses (Period)</span><strong>{formatMoney(dashboardData.financials.recordedExpenses)}</strong></div>
      <div><span>Cash Pending Remittance (Trips)</span><strong>{formatMoney(remittance)}</strong></div>
      <div><span>All Non-Cancelled Orders (Incl. Open)</span><strong>{formatMoney(dashboardData.financials.grossSales)}</strong></div>
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
       {activeRangeLabel} • {formatMoney(dashboardData.financials.completedSales)} ({dashboardData.financials.completedOrdersCount} completed sale{dashboardData.financials.completedOrdersCount===1?'':'s'})
       {dashboardData.previousComparison&&dashboardData.previousComparison.deltaPct!==null&&` • ${dashboardData.previousComparison.deltaPct>=0?'+':''}${dashboardData.previousComparison.deltaPct.toFixed(1)}% vs prev`}
      </p>
     </div>
     <div className="owner-metric-toggle" role="group" aria-label="Chart metric">
      <button type="button" className={chartMetric==='revenue'?'active':''} onClick={()=>{setChartMetric('revenue');setActiveChartIdx(null);}}>Revenue</button>
      <button type="button" className={chartMetric==='orders'?'active':''} onClick={()=>{setChartMetric('orders');setActiveChartIdx(null);}}>Order Count</button>
     </div>
    </div>
    <div className="owner-chart-box">
     {dateSelection.period==='Daily'&&!dashboardData.chart.hasHourlyTimestamps?(
      <div className="owner-chart-empty">
       <FiClock size={20} color="#244ea3" aria-hidden="true"/>
       <strong>{dashboardData.financials.completedOrdersCount>0?`Daily Completed Total: ${formatMoney(dashboardData.financials.completedSales)} (${dashboardData.financials.completedOrdersCount} sale${dashboardData.financials.completedOrdersCount===1?'':'s'})`:`No completed sales recorded for ${activeRangeLabel}`}</strong>
       <small>Hourly breakdown is unavailable when historical transaction timestamps are not recorded.</small>
       {dashboardData.financials.completedOrdersCount===0&&latestOrderDate&&latestOrderDate!==dateSelection.anchorDate&&(
        <button type="button" className="mgmt-btn secondary" onClick={jumpToLatestDate}>View latest recorded activity — {latestOrderDate}</button>
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
         const showLabel=i=>chartPts.length<=12||i===0||i===chartPts.length-1||i%4===0;
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
       <strong>No completed sales recorded for {activeRangeLabel}</strong>
       <small>Select another date range to explore historical activity.</small>
       {latestOrderDate&&(
        <button type="button" className="mgmt-btn secondary" onClick={jumpToLatestDate}>View latest recorded activity — {latestOrderDate}</button>
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
     {m.gallonsRefilled!==false&&(
      <div className="owner-gallon-card">
       <span>Gallons Refilled</span>
       <strong>{dashboardData.gallons.gallonsRefilled}</strong>
       <small>Completed refills in period</small>
      </div>
     )}
     {m.newGallonsSold!==false&&(
      <div className="owner-gallon-card">
       <span>New Gallons Sold</span>
       <strong>{dashboardData.gallons.newGallonsSold}</strong>
       <small>New containers sold (not refills)</small>
      </div>
     )}
     {m.gallonsBorrowed!==false&&(
      <div className="owner-gallon-card">
       <span>Gallons Issued / Borrowed</span>
       <strong>{dashboardData.gallons.gallonsBorrowed}</strong>
       <small>Returnable containers issued</small>
      </div>
     )}
     {m.gallonsReturned!==false&&(
      <div className="owner-gallon-card">
       <span>Gallons Returned / Collected</span>
       <strong>{dashboardData.gallons.gallonsReturned}</strong>
       <small>Empties collected & returns</small>
      </div>
     )}
     {m.outstandingBorrowed!==false&&(
      <div className={`owner-gallon-card ${dashboardData.gallons.outstandingBorrowed===null?'muted':''}`}>
       <span>Outstanding Borrowed</span>
       <strong>{dashboardData.gallons.outstandingBorrowed!==null?dashboardData.gallons.outstandingBorrowed:'Not Tracked'}</strong>
       <small>{dashboardData.gallons.outstandingBorrowed!==null?'Unreturned containers with customers':'Needs customer borrow-return IDs'}</small>
      </div>
     )}
     {dashSettings.visibility.containerStock&&m.availableGallonStock!==false&&(
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
      <p className="owner-dash-note"><FiInfo size={12} style={{verticalAlign:'-2px'}}/> Borrowed containers are tracked separately from new container sales and reconciled against return records.</p>
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
      <small>Awaiting confirmation / pickup</small>
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
       <p>No business activity recorded for {activeRangeLabel}.</p>
      </div>
     )}
    </div>
   </section>
  )
 };

 const visibleSectionCount=DASHBOARD_SECTIONS.filter(s=>draftDashSettings.visibility?.[s.id]).length;

 return <>
 {page==='dashboard'&&<div className={`owner-dash ${dashSettings.density==='compact'?'compact':''}`}>
  {/* 1. Monitoring-First Dashboard Header (No New Order, No Sales Reports, No Dashboard Settings button) */}
  <header className="owner-dash-header">
   <div className="owner-dash-title-row">
    <div>
     <h1>Super Admin Dashboard</h1>
     <p>Business Overview</p>
    </div>
   </div>

   {/* 2. Single Compact Date Range Dropdown */}
   <div className="owner-date-bar">
    <DateRangeSelector
     value={dateSelection}
     onChange={next=>{setDateSelection(next);setActiveChartIdx(null);}}
     records={orders}
     todayStr={todayStr}
    />
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

 {(page==='customize-dashboard'||page==='dashboard-settings')&&<div className="owner-dash-settings">
  <Title eyebrow="Settings › Customize Dashboard" title="Customize Dashboard" description="Choose which sections and metrics appear on your Super Admin Dashboard, and organize the layout to match your workflow."/>
  <div className="mgmt-notice">Personalization only — hiding a dashboard section or metric does not restrict module access or modify real role permissions.</div>

  <div className="owner-cust-tabs" role="tablist" aria-label="Customize Dashboard sections">
   <button type="button" role="tab" aria-selected={custTab==='sections'} className={`owner-cust-tab ${custTab==='sections'?'active':''}`} onClick={()=>setCustTab('sections')}>
    <FiCheckSquare size={15} aria-hidden="true"/> Sections
   </button>
   <button type="button" role="tab" aria-selected={custTab==='metrics'} className={`owner-cust-tab ${custTab==='metrics'?'active':''}`} onClick={()=>setCustTab('metrics')}>
    <FiGrid size={15} aria-hidden="true"/> Metrics
   </button>
   <button type="button" role="tab" aria-selected={custTab==='layout'} className={`owner-cust-tab ${custTab==='layout'?'active':''}`} onClick={()=>setCustTab('layout')}>
    <FiLayout size={15} aria-hidden="true"/> Layout
   </button>
  </div>

  {custTab==='sections'&&(
   <div className="mgmt-card" role="tabpanel" aria-label="Visible Dashboard Sections">
    <div className="owner-dash-section-head" style={{marginBottom:8}}>
     <div>
      <h2>Visible Dashboard Sections</h2>
      <p className="owner-dash-note">{visibleSectionCount} of {DASHBOARD_SECTIONS.length} main sections visible • Critical alerts stay accessible even if Needs Attention is hidden.</p>
     </div>
     <button type="button" className="mgmt-link" onClick={restoreDraftDefaultVisibility}>Restore Default Visibility</button>
    </div>
    <div className="owner-settings-list">
     {[
      ...DASHBOARD_SECTIONS,
      {id:'containerStock',label:'Container Stock Breakdown',description:'Show current available gallon stock and expandable per-size detail inside Gallon & Container Activity.'}
     ].map(item=>(
      <label key={item.id} className="owner-toggle-row">
       <span><strong>{item.label}</strong><small>{item.description}</small></span>
       <input type="checkbox" checked={Boolean(draftDashSettings.visibility?.[item.id])} onChange={()=>toggleDraftVisibility(item.id)}/>
      </label>
     ))}
    </div>
   </div>
  )}

  {custTab==='metrics'&&(
   <div className="mgmt-card" role="tabpanel" aria-label="Visible Metric Cards">
    <div className="owner-dash-section-head" style={{marginBottom:8}}>
     <div>
      <h2>Visible Metric Cards</h2>
      <p className="owner-dash-note">Select which KPI cards appear inside each dashboard section. At least one primary Business Performance card remains visible.</p>
     </div>
    </div>
    {METRIC_GROUPS.map(group=>(
     <div key={group} className="owner-metric-group">
      <h3 className="owner-metric-group-title">{group}</h3>
      <div className="owner-settings-list">
       {DASHBOARD_METRIC_OPTIONS.filter(opt=>opt.group===group).map(opt=>(
        <label key={opt.id} className="owner-toggle-row">
         <span><strong>{opt.label}</strong><small>{opt.description}</small></span>
         <input type="checkbox" checked={draftDashSettings.metrics?.[opt.id]!==false} onChange={()=>toggleDraftMetric(opt.id)}/>
        </label>
       ))}
      </div>
     </div>
    ))}
   </div>
  )}

  {custTab==='layout'&&(
   <>
    <div className="mgmt-card" role="tabpanel" aria-label="Dashboard Section Arrangement">
     <div className="owner-dash-section-head" style={{marginBottom:8}}>
      <div>
       <h2>Section Order</h2>
       <p className="owner-dash-note">Move sections up or down to match your priority from top to bottom.</p>
      </div>
      <button type="button" className="mgmt-link" onClick={restoreDraftDefaultArrangement}>Restore Default Arrangement</button>
     </div>
     <div className="owner-settings-list">
      {draftDashSettings.order.map((secId,idx)=>{
       const meta=DASHBOARD_SECTIONS.find(s=>s.id===secId);
       if(!meta)return null;
       return (
        <div key={secId} className="owner-order-row">
         <span><strong>{idx+1}. {meta.label}</strong><small>{draftDashSettings.visibility?.[secId]?'Visible on dashboard':'Hidden'}</small></span>
         <div className="owner-order-actions">
          <button type="button" className="mgmt-btn secondary" disabled={idx===0} aria-label={`Move ${meta.label} up`} onClick={()=>setDraftDashSettings(prev=>({...prev,order:moveDashboardSection(prev.order,secId,-1)}))}><FiArrowUp/></button>
          <button type="button" className="mgmt-btn secondary" disabled={idx===draftDashSettings.order.length-1} aria-label={`Move ${meta.label} down`} onClick={()=>setDraftDashSettings(prev=>({...prev,order:moveDashboardSection(prev.order,secId,1)}))}><FiArrowDown/></button>
         </div>
        </div>
       );
      })}
     </div>
    </div>

    <div className="mgmt-card" style={{marginTop:12}}>
     <div className="mgmt-section-title" style={{marginTop:0}}><h2>Default Display Preferences</h2></div>
     <div className="mgmt-formgrid">
      <div className="mgmt-field">
       <label>Default Date Range</label>
       <select value={draftDashSettings.defaultPreset} onChange={e=>{const preset=e.target.value;const meta=DEFAULT_PRESET_CHOICES.find(p=>p.id===preset);setDraftDashSettings(prev=>({...prev,defaultPreset:preset,defaultPeriod:meta?.period||'Daily'}));}}>
        {DEFAULT_PRESET_CHOICES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
       </select>
      </div>
      <div className="mgmt-field">
       <label>Default Chart Metric</label>
       <select value={draftDashSettings.defaultMetric} onChange={e=>setDraftDashSettings(prev=>({...prev,defaultMetric:e.target.value}))}>
        {VALID_DEFAULT_METRICS.map(metric=><option key={metric} value={metric}>{metric==='revenue'?'Revenue (₱)':'Order Count'}</option>)}
       </select>
      </div>
      <div className="mgmt-field">
       <label>Dashboard Density</label>
       <select value={draftDashSettings.density} onChange={e=>setDraftDashSettings(prev=>({...prev,density:e.target.value}))}>
        {VALID_DENSITIES.map(d=><option key={d} value={d}>{d==='comfortable'?'Comfortable':'Compact'}</option>)}
       </select>
      </div>
     </div>
     <div className="owner-settings-list" style={{marginTop:10}}>
      <label className="owner-toggle-row">
       <span><strong>Expand Secondary Financial Metrics by Default</strong><small>Show Expenses, Remittance, and Open Orders automatically.</small></span>
       <input type="checkbox" checked={Boolean(draftDashSettings.showSecondaryFinance)} onChange={e=>setDraftDashSettings(prev=>({...prev,showSecondaryFinance:e.target.checked}))}/>
      </label>
      <label className="owner-toggle-row">
       <span><strong>Expand Container Stock Detail by Default</strong><small>Show per-size inventory breakdown automatically.</small></span>
       <input type="checkbox" checked={Boolean(draftDashSettings.showContainerStock)} onChange={e=>setDraftDashSettings(prev=>({...prev,showContainerStock:e.target.checked}))}/>
      </label>
     </div>
    </div>
   </>
  )}

  <div className="owner-cust-footer">
   <div className="owner-actions">
    <button type="button" className="mgmt-btn" onClick={handleSaveCustomizeDashboard}><FiSave/> Save Changes</button>
    <button type="button" className="mgmt-btn secondary" onClick={handleCancelCustomizeDashboard}>Cancel</button>
    {!confirmResetDash&&(
     <button type="button" className="mgmt-btn secondary" onClick={()=>setConfirmResetDash(true)}><FiRotateCcw/> Reset to Default</button>
    )}
   </div>
   {confirmResetDash&&(
    <div className="owner-reset-confirm" role="alert">
     <span>Reset dashboard sections, metrics, and layout to defaults? Business data will not be deleted.</span>
     <button type="button" className="mgmt-btn" onClick={applyResetDash}>Confirm Reset</button>
     <button type="button" className="mgmt-btn secondary" onClick={()=>setConfirmResetDash(false)}>Keep Current</button>
    </div>
   )}
  </div>
  {demo}
 </div>}

 {page==='reports'&&<SalesReports orders={orders} expenses={expenses} setExpenses={setExpenses} onNotice={record} isOwner/>}
 {page==='employees'&&<EmployeeDirectory initialEmployees={employees} availability={availability} orders={orders} onEvent={record}/>}
 {page==='approvals'&&<>
  <Title eyebrow="Payment review" title="Payment Verification" description="Check submitted GCash/bank references and cash received from drivers."/>
  <div className="mgmt-notice">A reference number alone does not prove payment. Check the actual AquaBest account or physically count cash before acknowledging any transaction.</div>
  <div className="mgmt-section-title"><h2>GCash & Bank Transfers</h2></div>
  <div className="mgmt-card">{pendingElectronic.length?pendingElectronic.map(t=><div className="mgmt-row" key={t.id}><div><strong className="mgmt-row-title">{t.orderId} · {t.customer}</strong><p className="mgmt-sub">{t.paymentMethod} · {formatMoney(t.amount)} · Ref: {t.reference||'Missing'}</p><p className="mgmt-sub">Status: Pending verification</p></div><button className="mgmt-btn secondary" onClick={()=>{setVerification(old=>[...old,t.id]);record('Reviewed electronic payment proof for order '+t.orderId)}}>Mark Reviewed</button></div>):<div className="owner-empty"><FiCreditCard size={22}/><strong>No pending electronic payment proofs</strong><p>When a driver records a GCash or bank reference, it appears here for manual verification.</p></div>}</div>
  <div className="mgmt-section-title"><h2>Cash Collected by Drivers</h2></div>
  <div className="mgmt-card">{trips.filter(t=>t.remittance==='Awaiting Remittance').length?trips.filter(t=>t.remittance==='Awaiting Remittance').map(t=><div className="mgmt-row" key={t.id}><div><strong className="mgmt-row-title">{t.orderId} · {t.driver}</strong><p className="mgmt-sub">{formatMoney(t.collectedCash||0)} collected · Pending handover</p></div><button className="mgmt-btn secondary" disabled={approvals.includes(t.id)} onClick={()=>{setApprovals(old=>[...old,t.id]);record('Reviewed pending cash remittance for order '+t.orderId)}}>{approvals.includes(t.id)?'Reviewed':'Mark Reviewed'}</button></div>):<div className="owner-empty"><PesoIcon size={22}/><strong>No cash awaiting remittance</strong><p>Driver COD collections will be listed here when pending handover.</p></div>}</div>
  <div className="mgmt-notice">Mark Reviewed is a demo checklist only. It does not simulate bank or GCash verification or alter authoritative ledgers.</div>{demo}
 </>}
 {page==='products'&&<ProductCatalog onEvent={record}/>}
 {page==='settings'&&<>
  <Title eyebrow="Configuration" title="Business Settings" description="Operating information, delivery fees, and Super Admin Dashboard customization."/>
  <div className="mgmt-card owner-settings-entry">
   <div className="owner-settings-entry-copy">
    <strong><FiSliders size={16} aria-hidden="true"/> Dashboard Customization</strong>
    <p className="mgmt-sub">Show or hide dashboard sections and KPI cards, reorder layout priority, and set default date range and density.</p>
   </div>
   <button type="button" className="mgmt-btn" onClick={openCustomizeDashboard}>Customize Dashboard <FiChevronRight aria-hidden="true"/></button>
  </div>

  {isDemoMode&&onResetDemoData&&(
   <div className="mgmt-card owner-settings-entry" style={{marginTop:14}}>
    <div className="owner-settings-entry-copy">
     <strong><FiRotateCcw size={16} aria-hidden="true"/> Static Demo Dataset (Sep–Nov 2026)</strong>
     <p className="mgmt-sub">Changes made in Demo Mode are saved locally in this browser only. Reset to restore the original three-month demonstration dataset.</p>
    </div>
    {!confirmResetDemo?(
     <button type="button" className="mgmt-btn secondary" onClick={()=>setConfirmResetDemo(true)}><FiRotateCcw/> Reset Demo Data</button>
    ):(
     <div className="owner-reset-confirm" role="alert">
      <span>Restore original September–November 2026 demo records?</span>
      <button type="button" className="mgmt-btn" onClick={()=>{onResetDemoData();setConfirmResetDemo(false);}}>Confirm Reset</button>
      <button type="button" className="mgmt-btn secondary" onClick={()=>setConfirmResetDemo(false)}>Cancel</button>
     </div>
    )}
   </div>
  )}

  <div className="mgmt-card" style={{marginTop:14}}><strong>Store Operating Rules</strong><div className="mgmt-formgrid">{[['deliveryFee','Delivery fee (₱)'],['lowStock','Low-stock threshold'],['hours','Operating hours']].map(([key,l])=><div className="mgmt-field" key={key}><label>{l}</label><input value={draft[key]} onChange={e=>setDraft(old=>({...old,[key]:e.target.value}))}/></div>)}</div><div className="owner-actions"><button className="mgmt-btn" onClick={()=>{setSettings({...draft});record('Updated business operating settings')}}><FiSave/> Save Settings</button><button className="mgmt-btn secondary" onClick={()=>go('products')}>Manage Products & Prices</button></div><p className="mgmt-sub">Saved demo delivery fee: {settings.deliveryFee}</p></div>{demo}
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
  <div className="mgmt-more">{[[FiClipboard,'Operations Queue','queue','Operational task execution'],[FiUsers,'Staff Monitoring','staff','Staff workload and availability'],[FiTruck,'Trips & Pickups','collections','Delivery trips and customer pickups'],[FiPackage,'Products & Services','products','Manage products, prices and stock alerts'],[FiClipboard,'Orders','orders','Order records and status tracking'],[FiTruck,'Delivery','delivery','Dispatch assignments and drop-offs'],[FiPackage,'Inventory','inventory','Bottle stock and movement logs'],[FiCreditCard,'Payments','payments','Collections and unpaid balances'],[FiUsers,'Employees & Access','employees','Accounts and role permissions'],[FiSettings,'Settings','settings','Business rules, prices, and dashboard customization'],[FiShield,'Audit Logs','audit','Administrative activity and audit history'],[FiAlertTriangle,'Verification','approvals','Electronic proofs and cash remittances']].map(([Icon,title,target,desc])=><button key={target} onClick={()=>go(target)}><Icon/><strong>{title}</strong><small>{desc}</small></button>)}</div>{demo}
 </>}
 </>;
}
