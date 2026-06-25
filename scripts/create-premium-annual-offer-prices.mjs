#!/usr/bin/env node
/**
 * Creates new Stripe annual Prices for Gradlify Premium (£249.99/yr) in TEST and LIVE.
 * Stripe Price objects are immutable, so changing billing requires creating new Prices
 * and updating Supabase Edge Function secrets to use the new price IDs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = {};
  for (const file of ['.env', '.env.functions']) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
    }
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

async function createAnnual(mode, key, priceRef) {
  if (!key || !priceRef) return null;
  const product = await getProduct(key, priceRef);
  const annual = await stripe(key, '/prices', {
    product,
    currency: 'gbp',
    'recurring[interval]': 'year',
    unit_amount: '24999',
    nickname: `Gradlify Premium Annual (${mode})`,
    'metadata[plan]': 'premium',
    'metadata[interval]': 'annual',
    'metadata[offer]': 'annual_249_99',
  });
  return { product, annual: annual.id };
}

const env = loadEnv();
const live = await createAnnual(
  'LIVE',
  env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_WEEKLY_LIVE ||
    env.STRIPE_PRICE_WEEKLY_LIVE ||
    'price_1Tj1g4QYWoowhxMZAH866USC',
);
const test = await createAnnual(
  'TEST',
  env.STRIPE_SECRET_KEY_TEST || env.STRIPE_SECRET_KEY,
  env.STRIPE_PRICE_11PLUS_WEEKLY_TEST ||
    env.STRIPE_PRICE_WEEKLY_TEST ||
    'price_1Tj1g5HZeiDDkqObijVVbv6C',
);

console.log(JSON.stringify({ LIVE: live, TEST: test }, null, 2));
