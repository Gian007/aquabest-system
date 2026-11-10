// Prototype fixture data only. Prices are illustrative, NOT AquaBest-approved.
export const DEMO_PRICES = {round5:35,slim25:20,slim5:35};
export const DEMO_PRODUCTS = [
  {id:'round5',label:'5 Gallons',shape:'Round Container'},
  {id:'slim25',label:'2.5 Gallons',shape:'Slim Container'},
  {id:'slim5',label:'5 Gallons',shape:'Slim Container'}
];
export const INITIAL_ORDERS = [
{id:'AB-1042',customer:'Maria Santos',source:'Online',items:[{sizeId:'round5',quantity:2}],status:'Pending Confirmation',paymentStatus:'Unpaid',amount:70,service:'Pickup & Delivery',assigned:'Unassigned',date:'2026-10-31'},
{id:'AB-1041',customer:'ABC Office',source:'Messenger',items:[{sizeId:'round5',quantity:5}],status:'Preparing',paymentStatus:'Unpaid',amount:175,service:'Delivery',assigned:'Staff A',date:'2026-10-31'},
{id:'AB-1040',customer:'John Reyes',source:'Walk-in',items:[{sizeId:'slim25',quantity:1}],status:'Completed',paymentStatus:'Paid',amount:20,service:'Walk-in',assigned:'Staff B',date:'2026-10-31'},
{id:'AB-1039',customer:'Sarah Lim',source:'Phone',items:[{sizeId:'slim5',quantity:3}],status:'Out for Delivery',paymentStatus:'Paid',amount:105,service:'Delivery',assigned:'Driver A',date:'2026-10-31'}
];
export const INITIAL_STOCK = [
{id:'round5',quantity:78,minimum:15},
{id:'slim25',quantity:14,minimum:20},
{id:'slim5',quantity:32,minimum:12}
];
export const formatMoney = amount => '₱'+Number(amount||0).toLocaleString('en-PH',{maximumFractionDigits:2});
export const orderSummary = items => (items||[]).map(({sizeId,quantity})=>{
 const item=DEMO_PRODUCTS.find(p=>p.id===sizeId);
 return quantity+' × '+(item?.label||sizeId)+' '+(item?.shape||'');
}).join(' • ');
