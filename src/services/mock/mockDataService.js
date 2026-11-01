import {seedMockDatabase} from './seed.js';
import {DATA_VERSION,assert,newId,isoNow,positiveInt,productPriceSnapshot,ORDER_SOURCES,ORDER_STATUSES,PAYMENT_METHODS} from '../dataContract.js';

// Shared only inside ONE browser profile/origin. localStorage events sync browser tabs;
// different devices require a hosted backend. Do not store real customer data here.
const KEY='aquabest-mock-db-v1';
const CHANGE='aquabest:mock-data-changed';
const copy=v=>JSON.parse(JSON.stringify(v));
function load(){
 try{const raw=localStorage.getItem(KEY);if(raw){const value=JSON.parse(raw);if(value?.version===DATA_VERSION)return value}}
 catch{/* blocked storage resets demo state */}
 return seedMockDatabase();
}
let state=load();
const subscribers=new Set();
function signal(){for(const fn of subscribers)fn()}
function persist(next){state=next;try{localStorage.setItem(KEY,JSON.stringify(state))}catch{/* unavailable storage */}signal()}
if(typeof window!=='undefined'){
 window.addEventListener('storage',event=>{if(event.key===KEY){state=load();signal()}});
 window.addEventListener(CHANGE,()=>{state=load();signal()});
}
function transact(fn){
 const draft=copy(state);
 const result=fn(draft);
 persist(draft);
 return copy(result);
}
const audit=(db,action,entity_id,details={})=>db.audit_logs.unshift({id:newId('audit'),action,entity_id,details,actor_id:'demo',created_at:isoNow()});
const list=name=>copy(state[name]);
export const mockDataService={
 backend:'mock-browser',
 subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn)},
 snapshot(){return copy(state)},
 resetDemo(){persist(seedMockDatabase())},
 async getOrders(){return list('orders').map(o=>({...o,items:state.order_items.filter(i=>i.order_id===o.id).map(copy)}))},
 async getOrder(id){return (await this.getOrders()).find(o=>o.id===id)||null},
 async getProducts({includeInactive=false}={}){return list('products').filter(p=>includeInactive||p.active)},
 async getEmployees(){return list('employees')},
 async getInventory(){return list('inventory')},
 async getDeliveryTrips(){return list('delivery_trips')},
 async getPayments(){return list('payments')},
 async getExpenses(){return list('expenses')},
 async getAudit(){return list('audit_logs')},
 async createOrder(payload){
  assert(payload&&ORDER_SOURCES.includes(payload.source),'Invalid order source');
  assert(Array.isArray(payload.items)&&payload.items.length>0,'Order needs items');
  return transact(db=>{
   const items=payload.items.map(i=>{
    const product=db.products.find(p=>p.id===i.product_id&&p.active);
    assert(product,'Product unavailable: '+i.product_id);
    return productPriceSnapshot(product,i.quantity);
   });
   const order={id:newId('order'),customer_id:payload.customer_id||null,source:payload.source,
    fulfillment:payload.fulfillment||'delivery',assigned_employee_id:null,status:'pending_confirmation',
    payment_status:'unpaid',total_cents:items.reduce((n,i)=>n+i.line_total_cents,0),
    notes:String(payload.notes||''),created_at:isoNow(),updated_at:isoNow()};
   db.orders.unshift(order);
   for(const item of items)db.order_items.push({id:newId('item'),order_id:order.id,...item});
   audit(db,'order_created',order.id,{source:order.source});
   return {...order,items};
  });
 },
 async updateOrderStatus(id,status){
  assert(ORDER_STATUSES.includes(status),'Invalid order status');
  const transitions={
   pending_confirmation:['confirmed','cancelled'],confirmed:['preparing','cancelled'],
   preparing:['ready','cancelled'],ready:['out_for_delivery','completed','cancelled'],
   out_for_delivery:['delivered','cancelled'],delivered:['completed'],completed:[],cancelled:[]
  };
  return transact(db=>{
   const order=db.orders.find(o=>o.id===id);assert(order,'Order not found');
   assert(transitions[order.status].includes(status),'Invalid transition: '+order.status+' → '+status);
   const old=order.status;order.status=status;order.updated_at=isoNow();
   audit(db,'order_status_changed',id,{from:old,to:status});return order;
  });
 },
 async assignOrder(id,employeeId){
  return transact(db=>{
   const order=db.orders.find(o=>o.id===id);const emp=db.employees.find(e=>e.id===employeeId);
   assert(order,'Order not found');assert(emp?.active,'Employee inactive or not found');
   assert(!['completed','cancelled'].includes(order.status),'Cannot assign closed order');
   order.assigned_employee_id=employeeId;order.updated_at=isoNow();
   audit(db,'order_assigned',id,{employee_id:employeeId});return order;
  });
 },
 async recordStockMovement({product_id,direction,quantity,reason,order_id=null}){
  const q=positiveInt(quantity);assert(['in','out'].includes(direction),'Invalid stock direction');
  assert(typeof reason==='string'&&reason.trim(),'Reason is required');
  return transact(db=>{
   const row=db.inventory.find(i=>i.product_id===product_id);assert(row,'Stock item not found');
   if(direction==='out')assert(row.on_hand>=q,'Insufficient stock');
   const record={id:newId('stock'),product_id,direction,quantity:q,reason:reason.trim(),order_id,created_at:isoNow()};
   row.on_hand+=direction==='in'?q:-q;row.updated_at=record.created_at;db.stock_movements.unshift(record);
   audit(db,'stock_movement',record.id,{product_id,direction,quantity:q});return record;
  });
 },
 async submitPaymentProof({order_id,method,reference}){
  assert(['gcash','bank_transfer'].includes(method),'Use GCash or bank transfer');
  assert(typeof reference==='string'&&reference.trim(),'Reference required');
  return transact(db=>{
   const order=db.orders.find(o=>o.id===order_id);assert(order,'Order not found');
   assert(order.payment_status==='unpaid','Order already has a payment record');
   const payment={id:newId('payment'),order_id,method,reference:reference.trim(),amount_cents:order.total_cents,status:'pending_verification',created_at:isoNow()};
   db.payments.push(payment);order.payment_status='pending_verification';
   audit(db,'payment_proof_submitted',payment.id,{order_id});return payment;
  });
 },
 async recordCashCollection({order_id,amount_cents}){
  assert(PAYMENT_METHODS.includes('cash'),'Unsupported method');
  return transact(db=>{
   const order=db.orders.find(o=>o.id===order_id);assert(order,'Order not found');
   assert(order.payment_status==='unpaid','Order not available for cash collection');
   assert(Number.isSafeInteger(amount_cents)&&amount_cents>=order.total_cents,'Cash amount below order total');
   const payment={id:newId('payment'),order_id,method:'cash',amount_cents:order.total_cents,received_cents:amount_cents,status:'collected',created_at:isoNow()};
   db.payments.push(payment);order.payment_status='collected';
   audit(db,'cash_collected',payment.id,{order_id});return payment;
  });
 },
 async addExpense({category,description,amount_cents,date}){
  assert(category&&description&&date,'Complete expense fields');
  assert(Number.isSafeInteger(amount_cents)&&amount_cents>0,'Invalid expense amount');
  return transact(db=>{
   const row={id:newId('expense'),category,description,amount_cents,date,active:true,created_at:isoNow()};
   db.expenses.unshift(row);audit(db,'expense_created',row.id);return row;
  });
 }
};
