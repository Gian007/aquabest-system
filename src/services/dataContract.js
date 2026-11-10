// AquaBest shared contract v1 — backend-agnostic values (Laravel / Supabase / mock).
// Dates: ISO 8601 UTC strings; money: PHP centavos (integers); IDs: strings.
// Keep workflow statuses separate from payment verification / remittance.
export const DATA_VERSION=1;
export const ROLES=['owner','manager','staff','delivery','customer'];
export const ORDER_SOURCES=['online','walk_in','messenger','phone'];
export const ORDER_STATUSES=['pending_confirmation','confirmed','preparing','ready','out_for_delivery','delivered','completed','cancelled'];
export const PAYMENT_STATUSES=['unpaid','pending_verification','collected','paid','rejected','refunded'];
export const PAYMENT_METHODS=['cash','gcash','bank_transfer'];
export const DELIVERY_STATUSES=['assigned','ready_for_pickup','out_for_delivery','delivered','failed_delivery'];
export const STOCK_DIRECTIONS=['in','out'];
export const EMPLOYEE_AVAILABILITY=['online','on_break','offline']; // busy and on_delivery are derived

export function assert(condition,message){if(!condition)throw new Error(message)}
export function positiveInt(value,name='Quantity'){
 const n=Number(value);assert(Number.isSafeInteger(n)&&n>0,name+' must be a positive whole number');return n;
}
export function cents(value){assert(Number.isSafeInteger(value)&&value>=0,'Money must be nonnegative integer centavos');return value}
export function newId(prefix='id'){
 // crypto.randomUUID works in modern HTTPS browsers; fallback is demo-only.
 const uuid=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 return prefix+'-'+uuid;
}
export const isoNow=()=>new Date().toISOString();
export function productPriceSnapshot(product,quantity){
 const q=positiveInt(quantity);const unit=cents(product.price_cents);
 return {product_id:product.id,product_name:product.name,quantity:q,unit_price_cents:unit,line_total_cents:unit*q};
}
