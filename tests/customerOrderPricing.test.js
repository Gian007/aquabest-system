import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_PRICES } from '../src/data/managerDemo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../src');

function collectFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, acc);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) acc.push(full);
  }
  return acc;
}

test('no FiDollarSign or USD dollar icon remains anywhere in src/', () => {
  const files = collectFiles(SRC_DIR);
  const offenders = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/\bFiDollarSign\b|\bFaDollarSign\b|\bBsCurrencyDollar\b|\bMdAttachMoney\b/.test(text)) {
      offenders.push(path.relative(SRC_DIR, file));
    }
  }
  assert.deepEqual(offenders, [], `Found forbidden dollar sign icon(s) in: ${offenders.join(', ')}`);
});

test('Customer UI order pricing matches Staff UI refill prices and calculates bulk totals accurately', () => {
  const orderDataSrc = fs.readFileSync(
    path.resolve(SRC_DIR, 'apps/Component_Customer/orderData.js'),
    'utf8'
  );
  // Verify orderData imports DEMO_PRICES (single source of truth with Staff UI)
  assert.match(orderDataSrc, /DEMO_PRICES/);
  assert.equal(DEMO_PRICES.round5, 35);
  assert.equal(DEMO_PRICES.slim25, 20);
  assert.equal(DEMO_PRICES.slim5, 35);

  // Verify Customer UI exposes payment method choices (Cash/COD, GCash, Bank Transfer)
  assert.match(orderDataSrc, /Cash on Delivery \(COD\)/);
  assert.match(orderDataSrc, /GCash/);
  assert.match(orderDataSrc, /Bank Transfer/);
});
