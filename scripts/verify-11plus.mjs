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
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  }
  return env;
}

async function getPrice(key, id) {
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

const [lm, la, tm, ta, pm, pa] = await Promise.all([
  getPrice(liveKey, env.STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_LIVE),
  getPrice(liveKey, env.STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_LIVE),
  getPrice(testKey, env.STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_TEST),
  getPrice(testKey, env.STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_TEST),
  getPrice(liveKey, env.STRIPE_PRICE_11PLUS_MONTHLY_LIVE),
  getPrice(liveKey, env.STRIPE_PRICE_11PLUS_ANNUAL_LIVE),
]);

assert('ultra live monthly (24999 pence)', lm.unit_amount === 24999, String(lm.unit_amount));
assert('ultra live annual (249999 pence)', la.unit_amount === 249999, String(la.unit_amount));
assert('ultra test monthly', tm.unit_amount === 24999, String(tm.unit_amount));
assert('ultra test annual', ta.unit_amount === 249999, String(ta.unit_amount));
assert('premium live monthly', pm.unit_amount === 1999, String(pm.unit_amount));
assert('premium live annual', pa.unit_amount === 24999, String(pa.unit_amount));

for (const file of ['Srinika_winner.mov', 'Vivaan_winner.mp4', 'videos/exam-readiness.mov']) {
  assert(`public/${file}`, fs.existsSync(path.join(root, 'public', file)));
}
assert('no duplicate root Srinika', !fs.existsSync(path.join(root, 'Srinika_winner.mov')));
assert('no duplicate root Vivaan', !fs.existsSync(path.join(root, 'Vivaan_winner.mp4')));

const anon = env.VITE_SUPABASE_ANON_KEY;
const base = env.VITE_SUPABASE_URL;
for (const [plan, expected] of [
  ['monthly', 1999],
  ['yearly', 24999],
]) {
  const res = await fetch(`${base}/functions/v1/stripe-price?plan=${plan}`, {
    headers: { Authorization: `Bearer ${anon}`, apikey: anon },
  });
  const data = await res.json();
  assert(`stripe-price ${plan}`, res.ok && data.unit_amount === expected, JSON.stringify(data));
}

const landing = fs.readFileSync(path.join(root, 'src/components/LandingPage.tsx'), 'utf8');
assert('LandingPage uses pricing constants', landing.includes('ULTRA_PRICING') && landing.includes('PREMIUM_PRICING'));
assert('LandingPage no stale £99.99', !landing.includes('99.99'));

const terms = fs.readFileSync(path.join(root, 'src/pages/Terms.tsx'), 'utf8');
assert('Terms uses PREMIUM_PRICING', terms.includes('PREMIUM_PRICING'));
assert('Terms no stale £7.99', !terms.includes('7.99'));

const failed = checks.filter((c) => !c.ok).length;
if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} 11+ checks passed`);
