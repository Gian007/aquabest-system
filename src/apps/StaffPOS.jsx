import { FiMinus, FiPlus, FiSave } from 'react-icons/fi';
import { bottleOptions } from './Component_Customer/orderData.js';
import { DEMO_PRICES, DEMO_PRODUCTS, formatMoney } from '../data/managerDemo.js';

// Same fields, products and AquaBest management styling as the original Manager POS.
// Staff transactions are routed to the isolated local demo queue, not to Supabase.
const Field=({label,children})=><div className="mgmt-field"><label>{label}</label>{children}</div>;
const Section=({title})=><div className="mgmt-section-title"><h2>{title}</h2></div>;
export const initialStaffSale=()=>({source:'Walk-in',customer:'',ownership:'own',arrangement:'purchase',service:'Walk-in',quantities:{round5:0,slim25:0,slim5:0},paymentMethod:'Cash',paymentStatus:'Unpaid',reference:'',notes:''});
export default function StaffPOS({sale,onChange,onSave,onClear}){
 const change=(key,value)=>onChange(prev=>({...prev,[key]:value}));
 const quantity=(id,delta)=>onChange(prev=>({...prev,quantities:{...prev.quantities,[id]:Math.max(0,Math.min(99,(prev.quantities[id]||0)+delta))}}));
 const qty=Object.values(sale.quantities).reduce((a,b)=>a+b,0);
 const total=Object.entries(sale.quantities).reduce((sum,[id,q])=>sum+q*(DEMO_PRICES[id]||0),0);
 return <div className="staffapp-pos">
  <div className="mgmt-card"><Section title="1. Transaction & Customer"/>
   <div className="mgmt-formgrid">
    <Field label="Order Source"><select value={sale.source} onChange={e=>change('source',e.target.value)}>{['Walk-in','Messenger','Phone'].map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Customer Name"><input value={sale.customer} onChange={e=>change('customer',e.target.value)} placeholder={sale.source==='Walk-in'?'Optional for walk-in':'Customer / contact name'}/></Field>
    <Field label="Containers"><select value={sale.ownership} onChange={e=>change('ownership',e.target.value)}><option value="own">Customer-owned (Refill)</option><option value="store">AquaBest-provided</option></select></Field>
    <Field label="Service / Fulfillment"><select value={sale.service} onChange={e=>change('service',e.target.value)}><option>Walk-in</option><option>Pickup & Delivery</option><option>Drop-off & Delivery</option><option>Delivery</option></select></Field>
   </div>
   {sale.ownership==='store'&&<Field label="Container Arrangement"><select value={sale.arrangement} onChange={e=>change('arrangement',e.target.value)}><option value="purchase">Purchase container</option><option value="returnable">Returnable / borrowed (policy pending)</option></select></Field>}
  </div>
  <div className="mgmt-card" style={{marginTop:12}}><Section title="2. Select Sizes & Quantities"/><p className="mgmt-sub">Same available products and demo prices as AquaBest Manager POS.</p>
   {bottleOptions.map(p=><div className="mgmt-product" key={p.id}><img src={p.image} alt={p.name+' '+p.shape}/><div className="mgmt-product-info"><strong>{p.name}</strong><small>{p.shape} • {formatMoney(DEMO_PRICES[p.id])} demo</small></div><div className="mgmt-qty"><button type="button" onClick={()=>quantity(p.id,-1)} disabled={!sale.quantities[p.id]} aria-label={'Remove '+p.name}><FiMinus/></button><span>{sale.quantities[p.id]}</span><button type="button" onClick={()=>quantity(p.id,1)} aria-label={'Add '+p.name}><FiPlus/></button></div></div>)}
  </div>
  <div className="mgmt-card" style={{marginTop:12}}><Section title="3. Payment"/><div className="mgmt-formgrid">
   <Field label="Payment Method"><select value={sale.paymentMethod} onChange={e=>change('paymentMethod',e.target.value)}>{['Cash','GCash','Bank Transfer'].map(x=><option key={x}>{x}</option>)}</select></Field>
   <Field label="Payment Status"><select value={sale.paymentStatus} onChange={e=>change('paymentStatus',e.target.value)}><option>Unpaid</option><option>Paid</option></select></Field>
   {sale.paymentMethod!=='Cash'&&<Field label="Payment Reference (optional)"><input placeholder="Reference number / proof note" value={sale.reference} onChange={e=>change('reference',e.target.value)}/></Field>}
   <Field label="Internal note"><input placeholder="Special request or instructions" value={sale.notes} onChange={e=>change('notes',e.target.value)}/></Field>
  </div></div>
  <div className="mgmt-summary" style={{marginTop:12}}><strong>Transaction Summary</strong>{DEMO_PRODUCTS.filter(p=>sale.quantities[p.id]>0).map(p=><div key={p.id}><span>{p.label} · {p.shape} × {sale.quantities[p.id]}</span><b>{formatMoney(sale.quantities[p.id]*DEMO_PRICES[p.id])}</b></div>)}<div className="total"><span>Sample total</span><strong>{formatMoney(total)}</strong></div></div>
  <div className="staffapp-pos-actions"><button className="mgmt-btn secondary" onClick={onClear}>Clear</button><button className="mgmt-btn" disabled={!qty} onClick={onSave}><FiSave/> Save Demo Transaction</button></div>
  <p className="mgmt-demo">Demo order only. Payment status is recorded, not verified. No real stock, billing, Supabase or backend changes. New orders appear in this browser's Refill Queue.</p>
 </div>;
}
