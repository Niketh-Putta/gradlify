#!/usr/bin/env node
/**
 * 11+ smoke checks: Stripe prices, edge stripe-price API, UI constants, public assets.
 * GCSE routes/tools are intentionally out of scope.
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

async function getPrice(key, id) {
  if (!key || !id) return null;
  const r = await fetch(`https://api.stripe.com/v1/prices/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Stripe ${id}: ${JSON.stringify(json)}`);
  return json;
}

const env = loadEnv();
const checks = [];
const assert = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) console.error('✗', name, detail);
  else console.log('✓', name, detail || '');
};

const liveKey = env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY;
const testKey = env.STRIPE_SECRET_KEY_TEST;

const ULTRA_PRICE_IDS = {
  liveMonthly: env.STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_LIVE,
  liveAnnual: env.STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_LIVE,
  testMonthly: env.STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_TEST,
  testAnnual: env.STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_TEST,
};

const [lm, la, tm, ta, pw, pa] = await Promise.all([
  getPrice(liveKey, ULTRA_PRICE_IDS.liveMonthly),
  getPrice(liveKey, ULTRA_PRICE_IDS.liveAnnual),
  getPrice(testKey, ULTRA_PRICE_IDS.testMonthly),
  getPrice(testKey, ULTRA_PRICE_IDS.testAnnual),
  getPrice(liveKey, env.STRIPE_PRICE_11PLUS_WEEKLY_LIVE || 'price_1Tj1g4QYWoowhxMZAH866USC'),
  getPrice(liveKey, env.STRIPE_PRICE_11PLUS_ANNUAL_LIVE || 'price_1TmF6EQYWoowhxMZvthLKq6K'),
]);

if (lm) assert('ultra live monthly (24999 pence)', lm.unit_amount === 24999, String(lm.unit_amount));
if (la) assert('ultra live annual (249999 pence)', la.unit_amount === 249999, String(la.unit_amount));
if (tm) assert('ultra test monthly', tm.unit_amount === 24999, String(tm.unit_amount));
if (ta) assert('ultra test annual', ta.unit_amount === 249999, String(ta.unit_amount));
assert('premium live weekly', pw.unit_amount === 899, String(pw.unit_amount));
assert('premium live annual', pa.unit_amount === 24999, String(pa.unit_amount));

for (const file of ['Srinika_winner.mov', 'Vivaan_winner.mp4', 'videos/exam-readiness.mov']) {
  assert(`public/${file}`, fs.existsSync(path.join(root, 'public', file)));
}
assert('no duplicate root Srinika', !fs.existsSync(path.join(root, 'Srinika_winner.mov')));
assert('no duplicate root Vivaan', !fs.existsSync(path.join(root, 'Vivaan_winner.mp4')));

const anon = env.VITE_SUPABASE_ANON_KEY;
const base = env.VITE_SUPABASE_URL;
for (const [plan, expected] of [
  ['weekly', 899],
  ['yearly', 24999],
]) {
  const res = await fetch(`${base}/functions/v1/stripe-price?plan=${plan}`, {
    headers: { Authorization: `Bearer ${anon}`, apikey: anon },
  });
  const data = await res.json();
  assert(`stripe-price ${plan}`, res.ok && data.unit_amount === expected, JSON.stringify(data));
}

const landing = fs.readFileSync(path.join(root, 'src/components/LandingPage.tsx'), 'utf8');
const offerPrice = fs.readFileSync(path.join(root, 'src/components/OfferPrice.tsx'), 'utf8');
assert('LandingPage uses shared offer pricing', landing.includes('OfferPrice') && offerPrice.includes('PREMIUM_PRICING'));
assert('LandingPage no stale £99.99', !landing.includes('99.99'));

const pricing = fs.readFileSync(path.join(root, 'src/lib/pricing.ts'), 'utf8');
assert('pricing annual £249.99', pricing.includes('annual: 249.99'));
assert('pricing annualPerWeek £4.81', pricing.includes('annualPerWeek: 4.81'));

const terms = fs.readFileSync(path.join(root, 'src/pages/Terms.tsx'), 'utf8');
assert('Terms uses PREMIUM_PRICING', terms.includes('PREMIUM_PRICING'));
assert('Terms no stale £7.99', !terms.includes('7.99'));

const failed = checks.filter((c) => !c.ok).length;
if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} 11+ checks passed`);
