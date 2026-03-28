#!/usr/bin/env node
/*
  Backfill billing sync for users whose Stripe status is trialing/active
  but plan/tier are stale.

  Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.functions.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
};

loadEnvFile(path.resolve(__dirname, '..', '.env'));
loadEnvFile(path.resolve(__dirname, '..', '.env.functions'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
};

const listMismatches = async () => {
  const params = new URLSearchParams({
    select: 'user_id,plan,tier,stripe_subscription_status,current_period_end',
    'stripe_subscription_status': 'in.(trialing,active)',
    or: '(tier.neq.premium,plan.eq.free)',
    limit: '1000',
  });

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles?${params.toString()}`;
  return fetchJson(url, { headers });
};

const syncUser = async (userId) => {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/billing-sync`;
  return fetchJson(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });
};

const main = async () => {
  const rows = await listMismatches();
  if (!rows.length) {
    console.log('No mismatches found.');
    return;
  }

  console.log(`Found ${rows.length} mismatches. Syncing...`);
  for (const row of rows) {
    try {
      const result = await syncUser(row.user_id);
      console.log(`Synced ${row.user_id}:`, result?.stripe_subscription_status ?? 'ok');
    } catch (err) {
      console.error(`Failed ${row.user_id}:`, err.message);
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
