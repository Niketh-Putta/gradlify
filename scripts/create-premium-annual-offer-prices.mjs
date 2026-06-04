#!/usr/bin/env node
/**
 * Creates new Stripe annual Prices for Gradlify Premium (£199.99/yr) in TEST and LIVE.
 * Stripe Price objects are immutable, so changing billing requires creating new Prices
 * and updating Supabase Edge Function secrets to use the new price IDs.
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

async function createAnnual(mode, key, monthlyRef) {
  if (!key || !monthlyRef) return null;
  const product = await getProduct(key, monthlyRef);
  const annual = await stripe(key, '/prices', {
    product,
    currency: 'gbp',
    'recurring[interval]': 'year',
    unit_amount: '19999',
    nickname: `Gradlify Premium Annual Limited Time Offer (${mode})`,
    'metadata[plan]': 'premium',
    'metadata[interval]': 'annual',
    'metadata[offer]': 'limited_time_199_99',
  });
  return { product, annual: annual.id };
}

const env = loadEnv();
const live = await createAnnual(
  'LIVE',
  env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_MONTHLY_LIVE || env.STRIPE_PRICE_MONTHLY_LIVE,
);
const test = await createAnnual(
  'TEST',
  env.STRIPE_SECRET_KEY_TEST || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_MONTHLY_TEST || env.STRIPE_PRICE_MONTHLY_TEST,
);

console.log(JSON.stringify({ LIVE: live, TEST: test }, null, 2));
