#!/usr/bin/env node
/**
 * Creates Stripe weekly Prices for Gradlify Premium (£8.99/week) in TEST and LIVE.
 * Uses the same product as the existing monthly price. Checkout has automatic_tax disabled.
 * tax_behavior=exclusive keeps the listed price as the charge (no VAT added at checkout).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  }
  return env;
}

async function stripe(key, pathSuffix, body) {
  const res = await fetch(`https://api.stripe.com/v1${pathSuffix}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

async function getProduct(key, priceId) {
  const res = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json.product;
}

async function createWeekly(mode, key, monthlyRef) {
  if (!key || !monthlyRef) return null;
  const product = await getProduct(key, monthlyRef);
  const weekly = await stripe(key, '/prices', {
    product,
    currency: 'gbp',
    'recurring[interval]': 'week',
    unit_amount: '899',
    tax_behavior: 'exclusive',
    nickname: `Gradlify Premium Weekly (${mode})`,
    'metadata[plan]': 'premium',
    'metadata[interval]': 'weekly',
  });
  return { product, weekly: weekly.id };
}

const env = loadEnv();
const live = await createWeekly(
  'LIVE',
  env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_MONTHLY_LIVE || env.STRIPE_PRICE_MONTHLY_LIVE,
);
const test = await createWeekly(
  'TEST',
  env.STRIPE_SECRET_KEY_TEST || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_MONTHLY_TEST || env.STRIPE_PRICE_MONTHLY_TEST,
);

console.log(JSON.stringify({ LIVE: live, TEST: test }, null, 2));
console.log('\nAdd to .env and Supabase edge secrets:');
if (test?.weekly) console.log(`STRIPE_PRICE_11PLUS_WEEKLY_TEST=${test.weekly}`);
if (live?.weekly) console.log(`STRIPE_PRICE_11PLUS_WEEKLY_LIVE=${live.weekly}`);
