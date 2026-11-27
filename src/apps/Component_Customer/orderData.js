import bottle25 from '../../assets/WaterBottleSize/bottle_2.5.png';
import bottle5 from '../../assets/WaterBottleSize/bottle_5.png';
import bottle5Round from '../../assets/WaterBottleSize/bottle_5_round.png';
import { DEMO_PRICES, formatMoney } from '../../data/managerDemo.js';

export const CUSTOMER_REFILL_PRICES = Object.freeze({ ...DEMO_PRICES });
export const CUSTOMER_PURCHASE_PRICES = Object.freeze({
  round5: 150,
  slim25: 100,
  slim5: 150
});

export const bottleOptions = [
  { id: 'round5', name: '5 Gallons', shape: 'Round Container', image: bottle5Round, refillPrice: CUSTOMER_REFILL_PRICES.round5, purchasePrice: CUSTOMER_PURCHASE_PRICES.round5 },
  { id: 'slim25', name: '2.5 Gallons', shape: 'Slim Container', image: bottle25, refillPrice: CUSTOMER_REFILL_PRICES.slim25, purchasePrice: CUSTOMER_PURCHASE_PRICES.slim25 },
  { id: 'slim5', name: '5 Gallons', shape: 'Slim Container', image: bottle5, refillPrice: CUSTOMER_REFILL_PRICES.slim5, purchasePrice: CUSTOMER_PURCHASE_PRICES.slim5 },
];

export const serviceOptions = {
  own: [
    { id: 'pickup-return', name: 'Pickup & Delivery', detail: 'AquaBest picks up empty containers, refills, and delivers them.' },
    { id: 'dropoff-return', name: 'Drop-off & Delivery', detail: 'You drop off empties; AquaBest delivers after refilling.' },
    { id: 'walkin', name: 'Walk-in', detail: 'You drop off and collect your containers at the station.' },
  ],
  store: [
    { id: 'delivery', name: 'Delivery', detail: 'AquaBest delivers the requested containers to you.' },
    { id: 'walkin', name: 'Walk-in Pickup', detail: 'You collect the containers at the station.' },
  ],
};

export const CUSTOMER_PAYMENT_METHODS = Object.freeze([
  {
    id: 'Cash',
    labelDelivery: 'Cash on Delivery (COD)',
    labelPickup: 'Cash upon Pickup',
    detailDelivery: 'Pay in cash directly to the delivery rider when your order arrives.',
    detailPickup: 'Pay in cash at the station counter when collecting your containers.',
    requiresReference: false
  },
  {
    id: 'GCash',
    labelDelivery: 'GCash (Manual Transfer)',
    labelPickup: 'GCash (Manual Transfer)',
    detailDelivery: 'Send via GCash to the station number; verified manually by staff (no third-party gateway).',
    detailPickup: 'Send via GCash and show your reference at the counter (verified manually by staff).',
    requiresReference: true
  },
  {
    id: 'Bank Transfer',
    labelDelivery: 'Bank Transfer (Manual)',
    labelPickup: 'Bank Transfer (Manual)',
    detailDelivery: 'Transfer to the station bank account; verified manually by staff before marking paid.',
    detailPickup: 'Transfer to the station bank account and present reference at pickup.',
    requiresReference: true
  }
]);

export const getUnitPrice = (sizeId, ownership = 'own', arrangement = 'purchase') => {
  if (ownership === 'store' && arrangement === 'purchase') {
    return CUSTOMER_PURCHASE_PRICES[sizeId] ?? DEMO_PRICES[sizeId] ?? 0;
  }
  return CUSTOMER_REFILL_PRICES[sizeId] ?? 0;
};

export const calculateLineTotal = (sizeId, quantity, ownership = 'own', arrangement = 'purchase') => {
  const qty = Math.max(0, Number(quantity) || 0);
  return qty * getUnitPrice(sizeId, ownership, arrangement);
};

export const calculateOrderTotal = (quantities = {}, ownership = 'own', arrangement = 'purchase') =>
  bottleOptions.reduce(
    (sum, item) => sum + calculateLineTotal(item.id, quantities[item.id] || 0, ownership, arrangement),
    0
  );

export const getPaymentMethodLabel = (methodId = 'Cash', delivery = true) => {
  const found = CUSTOMER_PAYMENT_METHODS.find((m) => m.id === methodId) || CUSTOMER_PAYMENT_METHODS[0];
  return delivery ? found.labelDelivery : found.labelPickup;
};

export const formatCustomerMoney = formatMoney;
export const countBottles = (quantities) => Object.values(quantities).reduce((sum, n) => sum + n, 0);
export const selectedBottles = (quantities) => bottleOptions.filter((item) => (quantities[item.id] || 0) > 0);
export const isDelivery = (service) => service !== 'walkin';
