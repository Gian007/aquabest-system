import {DEMO_PRODUCTS,DEMO_PRICES,INITIAL_ORDERS,INITIAL_STOCK} from '../../data/managerDemo.js';
import {DATA_VERSION,newId,isoNow} from '../dataContract.js';
// Fake records only. The browser owns this storage; GitHub Pages cannot receive database writes.
export function seedMockDatabase(){
 const now=isoNow();
 const products=DEMO_PRODUCTS.map(p=>({id:p.id,name:p.label+' '+p.shape,category:'water_refill',description:'Sample refill product',price_cents:Math.round(DEMO_PRICES[p.id]*100),active:true,channels:['walk_in','online'],image_url:null,created_at:now,updated_at:now}));
 const employees=[
  ['owner1','Owner 1','owner'],['owner2','Owner 2','owner'],['manager','Manager','manager'],
  ['staff-a','Staff A','staff'],['staff-b','Staff B','staff'],['driver-a','Driver A','delivery'],['driver-b','Driver B','delivery']
 ].map(([id,name,role])=>({id,name,role,active:true,availability:'online',created_at:now}));
 const names=Array.from(new Set(INITIAL_ORDERS.map(o=>o.customer)));
 const customers=names.map(name=>({id:newId('customer'),name,phone:null,created_at:now}));
 const orders=INITIAL_ORDERS.map(o=>{
  const customer=customers.find(c=>c.name===o.customer);
  const source=({Online:'online','Walk-in':'walk_in',Messenger:'messenger',Phone:'phone'})[o.source]||'walk_in';
  const status=({ 'Pending Confirmation':'pending_confirmation',Confirmed:'confirmed',Preparing:'preparing',Ready:'ready','Out for Delivery':'out_for_delivery',Delivered:'delivered',Completed:'completed'})[o.status]||'pending_confirmation';
  const employee=employees.find(e=>e.name===o.assigned);
  return {id:o.id,customer_id:customer?.id||null,source,status,payment_status:o.paymentStatus==='Paid'?'paid':'unpaid',
   assigned_employee_id:employee?.id||null,fulfillment:o.service==='Walk-in'?'walk_in':'delivery',
   total_cents:Math.round(o.amount*100),notes:'Sample order',created_at:now,updated_at:now};
 });
 const order_items=INITIAL_ORDERS.flatMap(o=>o.items.map(i=>{
  const product=products.find(p=>p.id===i.sizeId);
  return {id:newId('item'),order_id:o.id,...{product_id:product?.id||i.sizeId,product_name:product?.name||i.sizeId,quantity:i.quantity,unit_price_cents:product?.price_cents||0,line_total_cents:(product?.price_cents||0)*i.quantity}};
 }));
 const inventory=INITIAL_STOCK.map(s=>({product_id:s.id,on_hand:s.quantity,minimum:s.minimum,updated_at:now}));
 return {version:DATA_VERSION,customers,addresses:[],employees,products,orders,order_items,
  refill_tasks:[],delivery_trips:[],trip_stops:[],payments:[],cash_remittances:[],
  inventory,stock_movements:[],expenses:[],attendance_logs:[],status_events:[],audit_logs:[]};
}
