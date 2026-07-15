#!/usr/bin/env node
/**
 * Smoke-check live mock payment stack before go-live.
 * Usage: node scripts/verify_live_mock_payments.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function loadEnv() {
  for (const name of [".env.functions", ".env"]) {
    const envPath = resolve(repoRoot, name);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const MOCKS = ["both_subjects_live_mock", "both_subjects_live_mock_2"];

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing SUPABASE_URL / anon key");
  process.exit(1);
}

let failed = false;

async function invokeSignupCount(mockSlug) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/live-mock-signup-count`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ mockSlug }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

console.log("Live mock payment verification\n");

for (const mockSlug of MOCKS) {
  try {
    const data = await invokeSignupCount(mockSlug);
    const ok =
      data.currentPriceGbp === 14.99 &&
      typeof data.count === "number" &&
      typeof data.displayedCount === "number" &&
      data.promoCode == null &&
      data.promoSpotsRemaining === 0;

    console.log(`${mockSlug}:`);
    console.log(`  signups (real): ${data.count}`);
    console.log(`  displayed: ${data.displayedCount}`);
    console.log(`  price: £${data.currentPriceGbp}`);
    console.log(`  promos: disabled (full price only)`);
    console.log(ok ? "  ✓ edge function OK" : "  ✗ unexpected response shape");

    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.log(`${mockSlug}: ✗ ${error instanceof Error ? error.message : error}`);
  }
}

console.log(failed ? "\nFAILED - fix before go-live.\n" : "\nAll payment checks passed.\n");
process.exit(failed ? 1 : 0);
