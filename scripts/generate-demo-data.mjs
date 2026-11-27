import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '../src/data/demo/aquabest-demo-2026.json');

// Deterministic PRNG (Mulberry32) so the generated fixture is 100% reproducible
function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20261127);
const pick = arr => arr[Math.floor(rng() * arr.length)];

const PRODUCTS = [
  { id: 'round5', name: '5 Gallons Round', label: '5 Gallons', shape: 'Round Container', refillPrice: 35, containerPrice: 150, unit: 'gallon-container' },
  { id: 'slim25', name: '2.5 Gallons Slim', label: '2.5 Gallons', shape: 'Slim Container', refillPrice: 20, containerPrice: 100, unit: 'gallon-container' },
  { id: 'slim5', name: '5 Gallons Slim', label: '5 Gallons', shape: 'Slim Container', refillPrice: 35, containerPrice: 150, unit: 'gallon-container' }
];

const EMPLOYEES = [
  { id: 'emp-owner', name: 'Super Admin', fullName: 'Elena Morales', role: 'Super Admin', contact: '+63 917-000-0101 (Demo)', active: true, pos: true },
  { id: 'emp-manager', name: 'Manager', fullName: 'Marco Villanueva', role: 'Manager', contact: '+63 917-000-0102 (Demo)', active: true, pos: true },
  { id: 'emp-staffa', name: 'Staff A', fullName: 'Carlo Mendoza', role: 'Staff / Operations', contact: '+63 917-000-0103 (Demo)', active: true, pos: false },
  { id: 'emp-staffb', name: 'Staff B', fullName: 'Rina Bautista', role: 'Staff / Operations', contact: '+63 917-000-0104 (Demo)', active: true, pos: true },
  { id: 'emp-drivera', name: 'Driver A', fullName: 'Jomar Castillo', role: 'Staff / Operations', contact: '+63 917-000-0105 (Demo)', active: true, pos: false },
  { id: 'emp-driverb', name: 'Driver B', fullName: 'Paolo Navarro', role: 'Staff / Operations', contact: '+63 917-000-0106 (Demo)', active: true, pos: false }
];

const CUSTOMERS = [
  { id: 'CUST-001', name: 'Liza Navarro', type: 'Household', contact: '+63 917-000-1001', address: 'Block 4 Lot 12, Sampaguita St (Demo)' },
  { id: 'CUST-002', name: 'Dante Pascual', type: 'Household', contact: '+63 917-000-1002', address: 'Unit 3B, Narra Residences (Demo)' },
  { id: 'CUST-003', name: 'Mabini Dental Clinic', type: 'Commercial', contact: '+63 917-000-1003', address: '2F Plaza Commercial Bldg (Demo)' },
  { id: 'CUST-004', name: 'Grace Soriano', type: 'Household', contact: '+63 917-000-1004', address: '18 Acacia Lane, Brgy. San Isidro (Demo)' },
  { id: 'CUST-005', name: 'Kuya Ben Carinderia', type: 'Commercial', contact: '+63 917-000-1005', address: 'Corner Rizal & Mabini Ave (Demo)' },
  { id: 'CUST-006', name: 'Arnel Ocampo', type: 'Household', contact: '+63 917-000-1006', address: 'Phase 2, Molave Homes (Demo)' },
  { id: 'CUST-007', name: 'Teresita Aquino', type: 'Household', contact: '+63 917-000-1007', address: 'Lot 8, Jasmine Village (Demo)' },
  { id: 'CUST-008', name: 'Northgate Bakeshop', type: 'Commercial', contact: '+63 917-000-1008', address: 'Stall 5, Public Market Annex (Demo)' },
  { id: 'CUST-009', name: 'Ramon Delgado', type: 'Household', contact: '+63 917-000-1009', address: '42 Kamagong Drive (Demo)' },
  { id: 'CUST-010', name: 'Celine Mercado', type: 'Household', contact: '+63 917-000-1010', address: 'Apt 204, Banaba Court (Demo)' },
  { id: 'CUST-011', name: 'BrightSteps Tutorial Center', type: 'Commercial', contact: '+63 917-000-1011', address: 'Unit 102, Civic Arcade (Demo)' },
  { id: 'CUST-012', name: 'Nestor Salazar', type: 'Household', contact: '+63 917-000-1012', address: '91 Mahogany St (Demo)' },
  { id: 'CUST-013', name: 'Clarissa Lim-Tan', type: 'Household', contact: '+63 917-000-1013', address: 'Villa Verde Subd., Lot 21 (Demo)' },
  { id: 'CUST-014', name: 'MetroFit Gym Studio', type: 'Commercial', contact: '+63 917-000-1014', address: '3F Sunrise Hub (Demo)' },
  { id: 'CUST-015', name: 'Maribel Tolentino', type: 'Household', contact: '+63 917-000-1015', address: 'Block 9 Lot 3, Palmera Heights (Demo)' },
  { id: 'CUST-016', name: 'Ferdinand Cruz', type: 'Household', contact: '+63 917-000-1016', address: '15 Ilang-Ilang St (Demo)' },
  { id: 'CUST-017', name: 'Sta. Clara Pharmacy', type: 'Commercial', contact: '+63 917-000-1017', address: 'G/F Medical Plaza (Demo)' },
  { id: 'CUST-018', name: 'Walk-in Customer', type: 'Walk-in', contact: 'N/A', address: 'Station Counter' }
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function makeIsoManila(dateStr, hour, minute) {
  return `${dateStr}T${pad2(hour)}:${pad2(minute)}:00+08:00`;
}

// Build exact combination of items whose total equals `targetAmount` (multiple of 5 >= 20)
function buildItemsForAmount(targetAmount, isPurchase = false) {
  if (isPurchase) {
    // Purchase container prices: round5=150, slim5=150, slim25=100
    const items = [];
    let rem = targetAmount;
    if (rem >= 150) {
      const q = Math.floor(rem / 150);
      const sizeId = rng() > 0.4 ? 'round5' : 'slim5';
      items.push({ sizeId, quantity: q, unitPrice: 150, lineTotal: q * 150 });
      rem -= q * 150;
    }
    if (rem >= 100) {
      const q = Math.floor(rem / 100);
      items.push({ sizeId: 'slim25', quantity: q, unitPrice: 100, lineTotal: q * 100 });
      rem -= q * 100;
    }
    if (rem === 0 && items.length) return items;
  }

  // Standard refills: 35 (round5/slim5) and 20 (slim25)
  // Solve 35*a + 20*b = targetAmount
  for (let b = 0; b <= Math.floor(targetAmount / 20); b++) {
    const rest = targetAmount - b * 20;
    if (rest >= 0 && rest % 35 === 0) {
      const a = rest / 35;
      const items = [];
      if (a > 0) {
        if (a >= 3 && rng() > 0.55) {
          const rQty = Math.ceil(a / 2);
          const sQty = a - rQty;
          items.push({ sizeId: 'round5', quantity: rQty, unitPrice: 35, lineTotal: rQty * 35 });
          items.push({ sizeId: 'slim5', quantity: sQty, unitPrice: 35, lineTotal: sQty * 35 });
        } else {
          const sid = rng() > 0.42 ? 'round5' : 'slim5';
          items.push({ sizeId: sid, quantity: a, unitPrice: 35, lineTotal: a * 35 });
        }
      }
      if (b > 0) {
        items.push({ sizeId: 'slim25', quantity: b, unitPrice: 20, lineTotal: b * 20 });
      }
      return items;
    }
  }
  throw new Error(`Cannot decompose amount ${targetAmount} into valid AquaBest refill items`);
}

// Partition a target total into realistic order amounts (all expressible as 35a + 20b)
const VALID_REFILL_AMOUNTS = [55, 70, 90, 105, 125, 140, 160, 175, 195, 210, 245, 280, 315, 350, 385, 420];
function partitionAmount(total, approxCount, allowPurchases = false) {
  const amounts = [];
  let remaining = total;
  let count = 0;

  while (remaining > 0) {
    const slotsLeft = Math.max(1, approxCount - count);
    if (slotsLeft === 1) {
      // Finish exact remainder if decomposable
      if (canDecomposeRefill(remaining)) {
        amounts.push({ amount: remaining, isPurchase: false });
        remaining = 0;
        break;
      }
      // Adjust by stepping back one item
      const prev = amounts.pop();
      remaining += prev.amount;
      count--;
    }

    const avg = remaining / slotsLeft;
    // Try occasional container purchase (150 or 300)
    if (allowPurchases && count % 17 === 4 && remaining >= 350) {
      const pAmt = rng() > 0.5 ? 300 : 150;
      if (remaining - pAmt >= 70) {
        amounts.push({ amount: pAmt, isPurchase: true });
        remaining -= pAmt;
        count++;
        continue;
      }
    }

    const candidates = VALID_REFILL_AMOUNTS.filter(v => {
      const left = remaining - v;
      return left === 0 || (left >= 70 && (slotsLeft > 2 || canDecomposeRefill(left)));
    });
    if (!candidates.length) {
      // Fallback exact
      if (canDecomposeRefill(remaining)) {
        amounts.push({ amount: remaining, isPurchase: false });
        remaining = 0;
        break;
      }
      throw new Error(`Unable to partition remaining ${remaining}`);
    }
    // Prefer candidates near target average
    candidates.sort((x, y) => Math.abs(x - avg) - Math.abs(y - avg));
    const topBand = candidates.slice(0, Math.min(4, candidates.length));
    const chosen = pick(topBand);
    amounts.push({ amount: chosen, isPurchase: false });
    remaining -= chosen;
    count++;
  }
  return amounts;
}

function canDecomposeRefill(n) {
  if (n < 20 || n % 5 !== 0) return false;
  for (let b = 0; b <= Math.floor(n / 20); b++) {
    if ((n - b * 20) % 35 === 0) return true;
  }
  return false;
}

const orders = [];
const orderItems = [];
const payments = [];
const containerMovements = [];
const trips = [];
const deliveryStops = [];

let orderSeq = 2001;
let paySeq = 1001;
let cmovSeq = 1001;

const MONTHS = [
  {
    key: '2026-09',
    days: 30,
    paidTarget: 28950,
    unpaidTarget: 2900,
    paidCount: 158,
    unpaidCount: 15,
    cancelledCount: 3,
    sourceWeights: ['Walk-in', 'Walk-in', 'Messenger', 'Phone', 'Online'],
    borrowTargetOrders: 10
  },
  {
    key: '2026-10',
    days: 31,
    paidTarget: 39900,
    unpaidTarget: 2700,
    paidCount: 205,
    unpaidCount: 13,
    cancelledCount: 3,
    sourceWeights: ['Walk-in', 'Messenger', 'Messenger', 'Phone', 'Online', 'Online'],
    borrowTargetOrders: 13
  },
  {
    key: '2026-11',
    days: 27,
    paidTarget: 44650,
    unpaidTarget: 4250,
    paidCount: 225,
    unpaidCount: 19,
    cancelledCount: 2,
    sourceWeights: ['Walk-in', 'Messenger', 'Messenger', 'Phone', 'Online', 'Online', 'Walk-in'],
    borrowTargetOrders: 15
  }
];

const HOURS_POOL = [7, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18];
const NOV27_HOURS = [7, 8, 8, 9, 9, 10, 10, 11, 11, 12]; // Before 12:53 PM on Nov 27

const borrowedRecordPool = [];

function createCompletedOrder({ dateStr, monthKey, amount, isPurchase, paymentStatus, sourceOverride, hourOverride, borrowThis = false, missingTimestamp = false }) {
  const id = `AB-${orderSeq++}`;
  const source = sourceOverride || pick(['Walk-in', 'Messenger', 'Phone', 'Online']);
  const customer = source === 'Walk-in' && rng() > 0.55
    ? CUSTOMERS[17]
    : pick(CUSTOMERS.slice(0, 17));

  let service;
  let status;
  let assigned;
  if (source === 'Walk-in') {
    service = rng() > 0.18 ? 'Walk-in' : 'Pickup';
    status = 'Completed';
    assigned = pick(['Staff A', 'Staff B', 'Manager']);
  } else {
    service = pick(['Delivery', 'Pickup & Delivery', 'Drop-off & Delivery', 'Pickup']);
    status = service === 'Pickup' ? 'Completed' : 'Delivered';
    assigned = service === 'Pickup' ? pick(['Staff A', 'Staff B']) : pick(['Driver A', 'Driver B']);
  }

  const items = buildItemsForAmount(amount, isPurchase);
  const ownership = isPurchase ? 'store' : borrowThis ? 'store' : 'own';
  const arrangement = isPurchase ? 'purchase' : borrowThis ? 'returnable' : 'refill';

  const isNov27 = dateStr === '2026-11-27';
  const hour = hourOverride !== undefined ? hourOverride : pick(isNov27 ? NOV27_HOURS : HOURS_POOL);
  const minute = isNov27 && hour === 12 ? Math.floor(rng() * 35) : Math.floor(rng() * 55);
  const createdAt = missingTimestamp ? null : makeIsoManila(dateStr, hour, minute);
  const compMinute = Math.min(59, minute + 12);
  const completedAt = missingTimestamp ? null : makeIsoManila(dateStr, hour, compMinute);

  let paymentMethod = '';
  let reference = '';
  if (paymentStatus === 'Paid') {
    paymentMethod = source === 'Walk-in'
      ? (rng() > 0.25 ? 'Cash' : 'GCash')
      : (rng() > 0.45 ? 'GCash' : 'Cash');
    if (paymentMethod === 'GCash') {
      reference = `DEMO-GC-${monthKey.replace('-', '')}-${orderSeq}`;
    }
  } else {
    paymentMethod = rng() > 0.5 ? 'Cash' : 'GCash';
  }

  const order = {
    id,
    orderNumber: id,
    customerId: customer.id,
    customer: customer.name,
    source,
    service,
    status,
    paymentStatus,
    paymentMethod,
    method: paymentMethod,
    reference,
    amount,
    totalCents: amount * 100,
    ownership,
    arrangement,
    assigned,
    date: dateStr,
    business_date: dateStr,
    created_at: createdAt,
    createdAt,
    updated_at: completedAt || `${dateStr}T18:00:00+08:00`,
    completed_at: completedAt,
    notes: isPurchase
      ? 'Synthetic demo order · New AquaBest container purchase'
      : borrowThis
        ? 'Synthetic demo order · Returnable container issued'
        : missingTimestamp
          ? 'Synthetic historical demo order (timestamp not recorded)'
          : 'Synthetic demo refill order',
    is_demo: true,
    items: items.map(it => ({
      sizeId: it.sizeId,
      quantity: it.quantity,
      unit_price_cents: it.unitPrice * 100,
      line_total_cents: it.lineTotal * 100,
      ownership,
      arrangement
    }))
  };

  orders.push(order);

  items.forEach((it, idx) => {
    orderItems.push({
      id: `ITM-${id}-${idx + 1}`,
      order_id: id,
      product_id: it.sizeId,
      quantity: it.quantity,
      unit_price_cents: it.unitPrice * 100,
      line_total_cents: it.lineTotal * 100,
      ownership,
      arrangement
    });

    if (isPurchase) {
      containerMovements.push({
        id: `CMOV-${cmovSeq++}`,
        customer_id: customer.id,
        customer_name: customer.name,
        order_id: id,
        product_id: it.sizeId,
        quantity: it.quantity,
        movement_type: 'sold',
        related_movement_id: null,
        date: dateStr,
        recorded_at: completedAt || makeIsoManila(dateStr, 10, 0)
      });
    } else if (borrowThis) {
      const movId = `CMOV-${cmovSeq++}`;
      const mov = {
        id: movId,
        customer_id: customer.id,
        customer_name: customer.name,
        order_id: id,
        product_id: it.sizeId,
        quantity: it.quantity,
        movement_type: 'borrowed',
        related_movement_id: null,
        date: dateStr,
        recorded_at: completedAt || makeIsoManila(dateStr, 10, 0)
      };
      containerMovements.push(mov);
      borrowedRecordPool.push(mov);
    }
  });

  if (paymentStatus === 'Paid') {
    payments.push({
      id: `PAY-${paySeq++}`,
      order_id: id,
      customer_id: customer.id,
      customer_name: customer.name,
      method: paymentMethod,
      amount,
      amount_cents: amount * 100,
      status: 'paid',
      reference: reference || null,
      date: dateStr,
      recorded_at: completedAt || makeIsoManila(dateStr, 10, 15),
      verified_at: completedAt || makeIsoManila(dateStr, 10, 20)
    });
  }

  return order;
}

// Generate all three months of completed Paid & Unpaid orders
for (const m of MONTHS) {
  const paidParts = partitionAmount(m.paidTarget, m.paidCount, true);
  const unpaidParts = partitionAmount(m.unpaidTarget, m.unpaidCount, false);

  // Guarantee rich multi-source, multi-hour coverage on 2026-11-27 (today!)
  const nov27Reserve = m.key === '2026-11' ? 12 : 0;

  paidParts.forEach((part, idx) => {
    let dayNum;
    let sourceOverride;
    let hourOverride;
    if (m.key === '2026-11' && idx < nov27Reserve) {
      dayNum = 27;
      const presetSources = ['Walk-in', 'Messenger', 'Phone', 'Online'];
      sourceOverride = presetSources[idx % 4];
      hourOverride = [7, 8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12][idx];
    } else {
      dayNum = ((idx * 7) % m.days) + 1;
      sourceOverride = m.sourceWeights[idx % m.sourceWeights.length];
    }
    const dateStr = `${m.key}-${pad2(dayNum)}`;
    const borrowThis = !part.isPurchase && idx > 0 && idx % Math.max(8, Math.floor(paidParts.length / m.borrowTargetOrders)) === 0 && dayNum <= 24;
    const missingTimestamp = m.key === '2026-09' && dayNum === 2 && idx < 4;
    createCompletedOrder({
      dateStr,
      monthKey: m.key,
      amount: part.amount,
      isPurchase: part.isPurchase,
      paymentStatus: 'Paid',
      sourceOverride,
      hourOverride,
      borrowThis,
      missingTimestamp
    });
  });

  unpaidParts.forEach((part, idx) => {
    const dayNum = m.key === '2026-11' && idx < 2
      ? 27
      : Math.min(m.days, Math.max(1, Math.round(((idx + 1) / (unpaidParts.length + 1)) * m.days)));
    const dateStr = `${m.key}-${pad2(dayNum)}`;
    createCompletedOrder({
      dateStr,
      monthKey: m.key,
      amount: part.amount,
      isPurchase: false,
      paymentStatus: 'Unpaid',
      sourceOverride: pick(['Messenger', 'Phone', 'Online', 'Walk-in']),
      hourOverride: dayNum === 27 && m.key === '2026-11' ? (idx === 0 ? 9 : 11) : undefined
    });
  });

  // Add realistic Cancelled orders (excluded from financial totals)
  for (let c = 0; c < m.cancelledCount; c++) {
    const dayNum = Math.min(m.days, 5 + c * 9);
    const dateStr = `${m.key}-${pad2(dayNum)}`;
    const id = `AB-${orderSeq++}`;
    const cust = pick(CUSTOMERS.slice(0, 16));
    const amt = c % 2 === 0 ? 105 : 140;
    const items = buildItemsForAmount(amt, false);
    orders.push({
      id,
      orderNumber: id,
      customerId: cust.id,
      customer: cust.name,
      source: pick(['Messenger', 'Online', 'Phone']),
      service: 'Delivery',
      status: 'Cancelled',
      paymentStatus: 'Unpaid',
      paymentMethod: '',
      method: '',
      reference: '',
      amount: amt,
      totalCents: amt * 100,
      ownership: 'own',
      arrangement: 'refill',
      assigned: 'Unassigned',
      date: dateStr,
      business_date: dateStr,
      created_at: makeIsoManila(dateStr, 10 + c, 15),
      createdAt: makeIsoManila(dateStr, 10 + c, 15),
      updated_at: makeIsoManila(dateStr, 11 + c, 0),
      completed_at: null,
      notes: 'Cancelled by customer prior to dispatch (synthetic demo)',
      is_demo: true,
      items: items.map(it => ({
        sizeId: it.sizeId,
        quantity: it.quantity,
        unit_price_cents: it.unitPrice * 100,
        line_total_cents: it.lineTotal * 100,
        ownership: 'own',
        arrangement: 'refill'
      }))
    });
  }
}

// Add active in-progress operational orders on 2026-11-27 (NOT completed sales — powers Operations Queue & Trips)
const activeOperationalOrders = [
  { id: 'AB-2991', customer: CUSTOMERS[2], source: 'Online', service: 'Pickup & Delivery', status: 'Pending Confirmation', paymentStatus: 'Pending Verification', paymentMethod: 'GCash', reference: 'DEMO-GC-PEND-01', amount: 175, assigned: 'Unassigned', hour: 11, minute: 40, notes: 'Awaiting station confirmation & GCash verification (demo)' },
  { id: 'AB-2992', customer: CUSTOMERS[4], source: 'Messenger', service: 'Delivery', status: 'Preparing', paymentStatus: 'Unpaid', paymentMethod: 'Cash', reference: '', amount: 140, assigned: 'Staff A', hour: 11, minute: 50, notes: 'Currently refilling at Station Bay 1 (demo)' },
  { id: 'AB-2993', customer: CUSTOMERS[7], source: 'Phone', service: 'Delivery', status: 'Preparing', paymentStatus: 'Unpaid', paymentMethod: 'Cash', reference: '', amount: 105, assigned: 'Staff B', hour: 12, minute: 5, notes: 'Refill in progress (demo)' },
  { id: 'AB-2994', customer: CUSTOMERS[10], source: 'Online', service: 'Delivery', status: 'Ready', paymentStatus: 'Pending Verification', paymentMethod: 'GCash', reference: 'DEMO-GC-PEND-02', amount: 210, assigned: 'Driver A', hour: 12, minute: 15, notes: 'Packed and ready for dispatch (demo)' },
  { id: 'AB-2995', customer: CUSTOMERS[13], source: 'Messenger', service: 'Delivery', status: 'Out for Delivery', paymentStatus: 'Unpaid', paymentMethod: 'Cash', reference: '', amount: 245, assigned: 'Driver A', hour: 12, minute: 20, notes: 'En route on active trip TRIP-2026-1127-A (demo)' },
  { id: 'AB-2996', customer: CUSTOMERS[16], source: 'Phone', service: 'Pickup & Delivery', status: 'Out for Delivery', paymentStatus: 'Unpaid', paymentMethod: 'Cash', reference: '', amount: 105, assigned: 'Driver B', hour: 12, minute: 28, notes: 'En route on active trip TRIP-2026-1127-B (demo)' }
];

for (const ao of activeOperationalOrders) {
  const items = buildItemsForAmount(ao.amount, false);
  const ts = makeIsoManila('2026-11-27', ao.hour, ao.minute);
  orders.push({
    id: ao.id,
    orderNumber: ao.id,
    customerId: ao.customer.id,
    customer: ao.customer.name,
    source: ao.source,
    service: ao.service,
    status: ao.status,
    paymentStatus: ao.paymentStatus,
    paymentMethod: ao.paymentMethod,
    method: ao.paymentMethod,
    reference: ao.reference,
    amount: ao.amount,
    totalCents: ao.amount * 100,
    ownership: 'own',
    arrangement: 'refill',
    assigned: ao.assigned,
    date: '2026-11-27',
    business_date: '2026-11-27',
    created_at: ts,
    createdAt: ts,
    updated_at: ts,
    completed_at: null,
    notes: ao.notes,
    is_demo: true,
    items: items.map(it => ({
      sizeId: it.sizeId,
      quantity: it.quantity,
      unit_price_cents: it.unitPrice * 100,
      line_total_cents: it.lineTotal * 100,
      ownership: 'own',
      arrangement: 'refill'
    }))
  });
  if (ao.paymentStatus === 'Pending Verification') {
    payments.push({
      id: `PAY-${paySeq++}`,
      order_id: ao.id,
      customer_id: ao.customer.id,
      customer_name: ao.customer.name,
      method: ao.paymentMethod,
      amount: ao.amount,
      amount_cents: ao.amount * 100,
      status: 'pending_verification',
      reference: ao.reference,
      date: '2026-11-27',
      recorded_at: ts,
      verified_at: null
    });
  }
}

// Reconcile container returns against borrowed movements (leave a realistic outstanding borrowed balance!)
borrowedRecordPool.forEach((bMov, idx) => {
  // Return ~78% of borrowed batches so ~22% remain genuinely outstanding with customers
  if (idx % 5 !== 4) {
    const retDate = bMov.date <= '2026-11-20'
      ? `${bMov.date.slice(0, 8)}${pad2(Math.min(27, Number(bMov.date.slice(8)) + 3))}`
      : '2026-11-27';
    containerMovements.push({
      id: `CMOV-${cmovSeq++}`,
      customer_id: bMov.customer_id,
      customer_name: bMov.customer_name,
      order_id: bMov.order_id,
      product_id: bMov.product_id,
      quantity: bMov.quantity,
      movement_type: 'returned',
      related_movement_id: bMov.id,
      date: retDate,
      recorded_at: makeIsoManila(retDate, 15, 30)
    });
  }
});

// ---------------- EXPENSES (EXACT MONTHLY TARGETS + VOIDED EXAMPLES) ----------------
// Sep Active: 35,200 | Oct Active: 37,450 | Nov 1-27 Active: 40,300
const expenses = [
  // SEPTEMBER 2026 (Loss-making month — Active total: 35,200)
  { id: 'EXP-202609-01', date: '2026-09-02', category: 'Rent', description: 'Station commercial space monthly lease (Sep)', amount: 9500, paymentStatus: 'Paid', paymentMethod: 'Bank Transfer', reference: 'DEMO-BT-0901', active: true },
  { id: 'EXP-202609-02', date: '2026-09-05', category: 'Electricity', description: 'RO purification & booster pump electric bill', amount: 6400, paymentStatus: 'Paid', paymentMethod: 'GCash', reference: 'DEMO-GC-0905', active: true },
  { id: 'EXP-202609-03', date: '2026-09-08', category: 'Water treatment supplies', description: 'Sediment filters, carbon media, & sanitizing seals', amount: 3150, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202609-04', date: '2026-09-12', category: 'Maintenance', description: 'Emergency RO membrane flush & UV lamp replacement', amount: 2850, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202609-05', date: '2026-09-15', category: 'Wages', description: 'Operations & delivery staff mid-month payroll', amount: 5200, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202609-06', date: '2026-09-19', category: 'Fuel', description: 'Delivery tricycle & multicab fuel (Sep)', amount: 2150, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202609-07', date: '2026-09-24', category: 'Equipment', description: 'Replacement pressure gauge & dispensing valves', amount: 1150, paymentStatus: 'Unpaid', paymentMethod: '', reference: 'INV-SEP-409', active: true },
  { id: 'EXP-202609-08', date: '2026-09-28', category: 'Wages', description: 'Operations & delivery staff end-month payroll', amount: 4800, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202609-VOID', date: '2026-09-14', category: 'Other', description: 'Duplicate filter supply receipt (voided entry)', amount: 1200, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: 'VOID-0914', active: false },

  // OCTOBER 2026 (Recovery month — Active total: 37,450)
  { id: 'EXP-202610-01', date: '2026-10-02', category: 'Rent', description: 'Station commercial space monthly lease (Oct)', amount: 9500, paymentStatus: 'Paid', paymentMethod: 'Bank Transfer', reference: 'DEMO-BT-1002', active: true },
  { id: 'EXP-202610-02', date: '2026-10-06', category: 'Electricity', description: 'Purification system & lighting electric bill', amount: 6850, paymentStatus: 'Paid', paymentMethod: 'GCash', reference: 'DEMO-GC-1006', active: true },
  { id: 'EXP-202610-03', date: '2026-10-10', category: 'Water treatment supplies', description: 'Bottle caps, heat-shrink seals, & alkaline cartridges', amount: 3400, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202610-04', date: '2026-10-15', category: 'Wages', description: 'Operations & delivery staff mid-month payroll', amount: 5800, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202610-05', date: '2026-10-18', category: 'Delivery and transportation', description: 'Tricycle tire service & delivery crate straps', amount: 1450, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202610-06', date: '2026-10-22', category: 'Fuel', description: 'Delivery fleet fuel allocation (Oct)', amount: 2950, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202610-07', date: '2026-10-26', category: 'Maintenance', description: 'Scheduled tank sanitization & pump checkup', amount: 1700, paymentStatus: 'Unpaid', paymentMethod: '', reference: 'INV-OCT-118', active: true },
  { id: 'EXP-202610-08', date: '2026-10-30', category: 'Wages', description: 'Operations & delivery staff end-month payroll', amount: 5800, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202610-VOID', date: '2026-10-19', category: 'Supplies', description: 'Cancelled sticker order (voided entry)', amount: 950, paymentStatus: 'Unpaid', paymentMethod: '', reference: 'VOID-1019', active: false },

  // NOVEMBER 1–27, 2026 (Strong performance — Active total: 40,300)
  { id: 'EXP-202611-01', date: '2026-11-02', category: 'Rent', description: 'Station commercial space monthly lease (Nov)', amount: 9500, paymentStatus: 'Paid', paymentMethod: 'Bank Transfer', reference: 'DEMO-BT-1102', active: true },
  { id: 'EXP-202611-02', date: '2026-11-05', category: 'Electricity', description: 'High-output purification electric bill (Nov)', amount: 7450, paymentStatus: 'Paid', paymentMethod: 'GCash', reference: 'DEMO-GC-1105', active: true },
  { id: 'EXP-202611-03', date: '2026-11-09', category: 'Water treatment supplies', description: 'Bulk caps, seals, & multi-stage filter pack', amount: 4200, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202611-04', date: '2026-11-14', category: 'Fuel', description: 'Expanded delivery route fuel (Nov)', amount: 3650, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202611-05', date: '2026-11-15', category: 'Wages', description: 'Operations & delivery staff mid-month payroll + incentives', amount: 6400, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202611-06', date: '2026-11-20', category: 'Delivery and transportation', description: 'Multicab oil change & route maintenance', amount: 1900, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202611-07', date: '2026-11-24', category: 'Other', description: 'Water quality microbiological lab test fee', amount: 1100, paymentStatus: 'Unpaid', paymentMethod: '', reference: 'LAB-NOV-24', active: true },
  { id: 'EXP-202611-08', date: '2026-11-27', category: 'Wages', description: 'Operations & delivery staff end-month payroll', amount: 6100, paymentStatus: 'Paid', paymentMethod: 'Cash', reference: '', active: true },
  { id: 'EXP-202611-VOID', date: '2026-11-18', category: 'Equipment', description: 'Returned faulty faucet batch (voided entry)', amount: 1100, paymentStatus: 'Unpaid', paymentMethod: '', reference: 'VOID-1118', active: false }
];

// ---------------- INVENTORY & MOVEMENTS (EXACT RECONCILIATION) ----------------
const openingStock = {
  round5: { id: 'round5', label: '5 Gallons · Round Container', opening: 82, minimum: 15 },
  slim25: { id: 'slim25', label: '2.5 Gallons · Slim Container', opening: 26, minimum: 20 },
  slim5: { id: 'slim5', label: '5 Gallons · Slim Container', opening: 36, minimum: 12 }
};

const inventoryMovements = [
  { id: 'MOV-001', productId: 'round5', type: 'IN', quantity: 24, reason: 'Supplier restock — new 5G round containers', orderId: null, automatic: false, date: '2026-09-10', time: '2026-09-10T09:00:00+08:00' },
  { id: 'MOV-002', productId: 'slim5', type: 'IN', quantity: 18, reason: 'Supplier restock — new 5G slim containers', orderId: null, automatic: false, date: '2026-10-04', time: '2026-10-04T09:30:00+08:00' },
  { id: 'MOV-003', productId: 'slim25', type: 'OUT', quantity: 4, reason: 'Damaged spout inspection write-off (adjustment)', orderId: null, automatic: false, date: '2026-10-18', time: '2026-10-18T16:15:00+08:00' },
  { id: 'MOV-004', productId: 'round5', type: 'IN', quantity: 20, reason: 'Supplier restock — November demand buffer', orderId: null, automatic: false, date: '2026-11-06', time: '2026-11-06T08:45:00+08:00' },
  { id: 'MOV-005', productId: 'slim5', type: 'IN', quantity: 14, reason: 'Supplier restock — 5G slim containers', orderId: null, automatic: false, date: '2026-11-12', time: '2026-11-12T10:15:00+08:00' }
];

let movSeq = 6;
for (const cm of containerMovements) {
  if (cm.movement_type === 'sold' || cm.movement_type === 'borrowed') {
    inventoryMovements.push({
      id: `MOV-${String(movSeq++).padStart(3, '0')}`,
      productId: cm.product_id,
      type: 'OUT',
      quantity: cm.quantity,
      reason: cm.movement_type === 'borrowed' ? 'Returnable container issued' : 'New container sold',
      orderId: cm.order_id,
      automatic: true,
      date: cm.date,
      time: cm.recorded_at
    });
  } else if (cm.movement_type === 'returned') {
    inventoryMovements.push({
      id: `MOV-${String(movSeq++).padStart(3, '0')}`,
      productId: cm.product_id,
      type: 'IN',
      quantity: cm.quantity,
      reason: 'Customer returnable container returned',
      orderId: cm.order_id,
      automatic: false,
      date: cm.date,
      time: cm.recorded_at
    });
  }
}

// Compute current stock strictly from opening + IN - OUT
const currentQty = {
  round5: openingStock.round5.opening,
  slim25: openingStock.slim25.opening,
  slim5: openingStock.slim5.opening
};
for (const m of inventoryMovements) {
  currentQty[m.productId] += m.type === 'IN' ? m.quantity : -m.quantity;
}

// Ensure slim25 is genuinely low stock (< 20) via an authentic adjustment if needed
if (currentQty.slim25 >= 20) {
  const adj = currentQty.slim25 - 14;
  inventoryMovements.push({
    id: `MOV-${String(movSeq++).padStart(3, '0')}`,
    productId: 'slim25',
    type: 'OUT',
    quantity: adj,
    reason: 'Seasonal commercial event container allocation',
    orderId: null,
    automatic: false,
    date: '2026-11-23',
    time: '2026-11-23T14:20:00+08:00'
  });
  currentQty.slim25 -= adj;
}

// Keep round5 & slim5 well above minimum
if (currentQty.round5 < 45) {
  const add = 65 - currentQty.round5;
  inventoryMovements.push({
    id: `MOV-${String(movSeq++).padStart(3, '0')}`,
    productId: 'round5',
    type: 'IN',
    quantity: add,
    reason: 'Scheduled 5G round container replenishment',
    orderId: null,
    automatic: false,
    date: '2026-11-19',
    time: '2026-11-19T09:10:00+08:00'
  });
  currentQty.round5 += add;
}
if (currentQty.slim5 < 25) {
  const add = 34 - currentQty.slim5;
  inventoryMovements.push({
    id: `MOV-${String(movSeq++).padStart(3, '0')}`,
    productId: 'slim5',
    type: 'IN',
    quantity: add,
    reason: 'Scheduled 5G slim container replenishment',
    orderId: null,
    automatic: false,
    date: '2026-11-21',
    time: '2026-11-21T09:30:00+08:00'
  });
  currentQty.slim5 += add;
}

const inventory = Object.values(openingStock).map(item => ({
  id: item.id,
  label: item.label,
  openingQuantity: item.opening,
  quantity: currentQty[item.id],
  minimum: item.minimum
}));

const supplies = [
  { id: 'sup-caps', name: 'Tamper-Evident Bottle Caps (pack of 100)', quantity: 14, minimum: 10 },
  { id: 'sup-seals', name: 'Heat-Shrink Neck Seals (pack of 200)', quantity: 6, minimum: 8 },
  { id: 'sup-filter', name: '5-Micron Sediment Filter Cartridges', quantity: 9, minimum: 5 }
];

// ---------------- TRIPS & DELIVERY STOPS ----------------
trips.push(
  {
    id: 'TRIP-2026-1127-A',
    orderId: 'AB-2995',
    customer: 'MetroFit Gym Studio',
    address: '3F Sunrise Hub (Demo)',
    items: '7 × 5 Gallons Round Container',
    status: 'Out for Delivery',
    paymentStatus: 'Unpaid',
    amount: 245,
    driver: 'Driver A',
    expectedBottles: 7,
    bottlesLoaded: 7,
    emptiesCollected: 5,
    collectedCash: 0,
    remittance: 'Not collected',
    paymentMethod: 'Cash',
    reference: '',
    date: '2026-11-27',
    notes: 'Multi-stop commercial delivery in progress (demo)'
  },
  {
    id: 'TRIP-2026-1127-B',
    orderId: 'AB-2996',
    customer: 'Sta. Clara Pharmacy',
    address: 'G/F Medical Plaza (Demo)',
    items: '3 × 5 Gallons Slim Container',
    status: 'Out for Delivery',
    paymentStatus: 'Unpaid',
    amount: 105,
    driver: 'Driver B',
    expectedBottles: 3,
    bottlesLoaded: 3,
    emptiesCollected: 3,
    collectedCash: 0,
    remittance: 'Not collected',
    paymentMethod: 'Cash',
    reference: '',
    date: '2026-11-27',
    notes: 'Pickup & delivery route active (demo)'
  },
  {
    id: 'TRIP-2026-1127-C',
    orderId: 'AB-2994',
    customer: 'BrightSteps Tutorial Center',
    address: 'Unit 102, Civic Arcade (Demo)',
    items: '6 × 5 Gallons Round Container',
    status: 'Ready for Pickup',
    paymentStatus: 'Pending Verification',
    amount: 210,
    driver: 'Driver A',
    expectedBottles: 6,
    bottlesLoaded: 6,
    emptiesCollected: 0,
    collectedCash: 0,
    remittance: 'Not required',
    paymentMethod: 'GCash',
    reference: 'DEMO-GC-PEND-02',
    date: '2026-11-27',
    notes: 'GCash proof submitted — awaiting verification (demo)'
  },
  {
    id: 'TRIP-2026-1127-D',
    orderId: 'AB-2991',
    customer: 'Mabini Dental Clinic',
    address: '2F Plaza Commercial Bldg (Demo)',
    items: '5 × 5 Gallons Round Container',
    status: 'Assigned',
    paymentStatus: 'Pending Verification',
    amount: 175,
    driver: 'Driver B',
    expectedBottles: 5,
    bottlesLoaded: 0,
    emptiesCollected: 0,
    collectedCash: 0,
    remittance: 'Not required',
    paymentMethod: 'GCash',
    reference: 'DEMO-GC-PEND-01',
    date: '2026-11-27',
    notes: 'GCash reference awaiting station check (demo)'
  },
  {
    id: 'TRIP-2026-1126-A',
    orderId: 'AB-2601',
    customer: 'Northgate Bakeshop',
    address: 'Stall 5, Public Market Annex (Demo)',
    items: '8 × 5 Gallons Round Container',
    status: 'Delivered',
    paymentStatus: 'Collected',
    amount: 280,
    driver: 'Driver A',
    expectedBottles: 8,
    bottlesLoaded: 8,
    emptiesCollected: 8,
    collectedCash: 280,
    remittance: 'Awaiting Remittance',
    paymentMethod: 'Cash',
    reference: '',
    date: '2026-11-26',
    notes: 'COD cash collected — awaiting handover to manager (demo)'
  },
  {
    id: 'TRIP-2026-1126-B',
    orderId: 'AB-2602',
    customer: 'Kuya Ben Carinderia',
    address: 'Corner Rizal & Mabini Ave (Demo)',
    items: '6 × 5 Gallons Slim Container',
    status: 'Delivered',
    paymentStatus: 'Collected',
    amount: 210,
    driver: 'Driver B',
    expectedBottles: 6,
    bottlesLoaded: 6,
    emptiesCollected: 6,
    collectedCash: 210,
    remittance: 'Awaiting Remittance',
    paymentMethod: 'Cash',
    reference: '',
    date: '2026-11-26',
    notes: 'COD cash collected — awaiting remittance (demo)'
  },
  {
    id: 'TRIP-2026-1125-FAIL',
    orderId: 'AB-2590',
    customer: 'Ramon Delgado',
    address: '42 Kamagong Drive (Demo)',
    items: '3 × 5 Gallons Round Container',
    status: 'Failed Delivery',
    paymentStatus: 'Unpaid',
    amount: 105,
    driver: 'Driver A',
    expectedBottles: 3,
    bottlesLoaded: 3,
    emptiesCollected: 0,
    collectedCash: 0,
    remittance: 'Not collected',
    paymentMethod: 'Cash',
    reference: '',
    failureReason: 'Customer not available at gate — rescheduled for next run',
    date: '2026-11-25',
    notes: 'Returned full bottles to station bay (demo)'
  },
  {
    id: 'TRIP-2026-1028-DONE',
    orderId: 'AB-2380',
    customer: 'Liza Navarro',
    address: 'Block 4 Lot 12, Sampaguita St (Demo)',
    items: '4 × 5 Gallons Round Container',
    status: 'Delivered',
    paymentStatus: 'Paid',
    amount: 140,
    driver: 'Driver A',
    expectedBottles: 4,
    bottlesLoaded: 4,
    emptiesCollected: 4,
    collectedCash: 140,
    remittance: 'Remitted',
    paymentMethod: 'Cash',
    reference: '',
    date: '2026-10-28',
    notes: 'Completed & remitted October run (demo)'
  }
);

trips.forEach((t, idx) => {
  deliveryStops.push({
    id: `STOP-${String(idx + 1).padStart(3, '0')}`,
    trip_id: t.id,
    order_id: t.orderId,
    customer_name: t.customer,
    address: t.address,
    delivery_status: t.status,
    empties_collected: t.emptiesCollected,
    actual_cash_received_cents: t.collectedCash * 100,
    issue_reason: t.failureReason || null
  });
});

// Sort orders newest first for clean UI listing
orders.sort((a, b) => {
  const da = a.created_at || `${a.date}T00:00:00+08:00`;
  const db = b.created_at || `${b.date}T00:00:00+08:00`;
  return db.localeCompare(da) || b.id.localeCompare(a.id);
});

inventoryMovements.sort((a, b) => b.time.localeCompare(a.time));

const notifications = [
  { id: 'NOTIF-01', severity: 'critical', title: 'Low stock: 2.5 Gallons Slim Container', message: `Only ${currentQty.slim25} containers on hand (minimum threshold: 20).`, date: '2026-11-27', read: false },
  { id: 'NOTIF-02', severity: 'warning', title: '2 GCash proofs pending verification', message: 'Check references DEMO-GC-PEND-01 and DEMO-GC-PEND-02 before marking Paid.', date: '2026-11-27', read: false },
  { id: 'NOTIF-03', severity: 'warning', title: 'Driver COD cash awaiting remittance (₱490)', message: 'Driver A (₱280) and Driver B (₱210) have unremitted cash collections.', date: '2026-11-26', read: false },
  { id: 'NOTIF-04', severity: 'info', title: 'Failed delivery rescheduled', message: 'TRIP-2026-1125-FAIL reported gate closed; bottles returned safely.', date: '2026-11-25', read: true }
];

const dataset = {
  metadata: {
    name: 'AquaBest Three-Month Synthetic Demonstration Dataset',
    version: '2026.11.27-v1',
    synthetic: true,
    disclaimer: 'All customer names, contact numbers, orders, payments, expenses, and trips are synthetic demonstration records — never real business transactions.',
    timezone: 'Asia/Manila',
    coverage: { start: '2026-09-01', end: '2026-11-27' },
    scenarios: {
      '2026-09': { label: 'Loss-Making Month', targetCompletedSales: 31850, targetVerifiedCollected: 28950, targetUnpaidCompleted: 2900, targetExpenses: 35200, targetOperatingResult: -3350 },
      '2026-10': { label: 'Recovery & Stable Operations', targetCompletedSales: 42600, targetVerifiedCollected: 39900, targetUnpaidCompleted: 2700, targetExpenses: 37450, targetOperatingResult: 5150 },
      '2026-11': { label: 'Strong Business Performance (Nov 1–27)', targetCompletedSales: 48900, targetVerifiedCollected: 44650, targetUnpaidCompleted: 4250, targetExpenses: 40300, targetOperatingResult: 8600 }
    }
  },
  demo_as_of: '2026-11-27',
  business: {
    name: 'AquaBest Water Refilling Station (Demo)',
    branch: 'Main Station — Synthetic Demonstration Branch',
    currency: 'PHP',
    timezone: 'Asia/Manila'
  },
  operational_settings: {
    deliveryFee: '0',
    lowStock: '15',
    hours: '7:00 AM – 7:00 PM (Mon–Sun · Demo)'
  },
  employees: EMPLOYEES,
  customers: CUSTOMERS,
  products: PRODUCTS,
  orders,
  order_items: orderItems,
  payments,
  expenses,
  inventory,
  supplies,
  inventory_movements: inventoryMovements,
  container_movements: containerMovements,
  trips,
  delivery_stops: deliveryStops,
  notifications
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2));

// Immediate reconciliation printout
for (const mk of ['2026-09', '2026-10', '2026-11']) {
  const mOrders = orders.filter(o => o.date.startsWith(mk) && ['Completed', 'Delivered'].includes(o.status));
  const compSales = mOrders.reduce((s, o) => s + o.amount, 0);
  const paid = mOrders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + o.amount, 0);
  const unpaid = mOrders.filter(o => o.paymentStatus === 'Unpaid').reduce((s, o) => s + o.amount, 0);
  const exp = expenses.filter(e => e.date.startsWith(mk) && e.active !== false).reduce((s, e) => s + e.amount, 0);
  console.log(`${mk}: completedSales=₱${compSales} | paid=₱${paid} | unpaid=₱${unpaid} | expenses=₱${exp} | opResult=₱${compSales - exp} | count=${mOrders.length}`);
}
const borrowed = containerMovements.filter(c => c.movement_type === 'borrowed').reduce((s, c) => s + c.quantity, 0);
const returned = containerMovements.filter(c => c.movement_type === 'returned').reduce((s, c) => s + c.quantity, 0);
console.log(`Containers: borrowed=${borrowed}, returned=${returned}, outstanding=${borrowed - returned}`);
console.log('Inventory ending:', inventory.map(i => `${i.id}=${i.quantity}(min ${i.minimum})`).join(', '));
console.log(`Wrote ${OUT_PATH} (${orders.length} orders, ${expenses.length} expenses, ${inventoryMovements.length} stock movements)`);
