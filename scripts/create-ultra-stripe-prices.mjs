#!/usr/bin/env node
/**
 * Creates new Stripe Prices for Gradlify Ultra (£249.99/mo, £2499.99/yr) in TEST and LIVE.
 * Stripe Price objects are immutable — this does not change existing subscriptions on old prices.
 *
 * Usage: node scripts/create-ultra-stripe-prices.mjs
 * Then update .env and run: ./scripts/sync-ultra-stripe-secrets.sh
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

async function createPair(mode, key, monthlyRef) {
  const product = await getProduct(key, monthlyRef);
  const monthly = await stripe(key, '/prices', {
    product,
    currency: 'gbp',
    'recurring[interval]': 'month',
    unit_amount: '24999',
    nickname: `Gradlify Ultra Monthly (${mode})`,
  });
  const annual = await stripe(key, '/prices', {
    product,
    currency: 'gbp',
    'recurring[interval]': 'year',
    unit_amount: '249999',
    nickname: `Gradlify Ultra Annual (${mode})`,
  });
  return { product, monthly: monthly.id, annual: annual.id };
}

const env = loadEnv();
const live = await createPair(
  'LIVE',
  env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_LIVE,
);
const test = await createPair(
  'TEST',
  env.STRIPE_SECRET_KEY_TEST || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_TEST,
);

console.log(JSON.stringify({ LIVE: live, TEST: test }, null, 2));
