#!/usr/bin/env node
/** Patch mock 1 maths explanation em dashes in Supabase. */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function loadEnv() {
  for (const name of [".env", ".env.functions"]) {
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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function rest(path, { method = "GET", body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
}

const patches = [
  {
    q: 41,
    explanation:
      "The prime cards are 2, 3, 5 and 7, that is 4 out of 5 cards, so the probability is 4/5.",
  },
  {
    q: 48,
    explanation:
      "There are 5 × 4 = 20 such numbers. The primes are 23, 37, 53, 73 and 83, 5 of them, so the probability is 5/20 = 1/4.",
  },
];

const [paper] = await (
  await fetch(`${SUPABASE_URL}/rest/v1/live_mock_papers?slug=eq.both_subjects_maths&select=id`, { headers })
).json();

for (const patch of patches) {
  await rest(`live_mock_questions?paper_id=eq.${paper.id}&question_number=eq.${patch.q}`, {
    method: "PATCH",
    body: { explanation: patch.explanation },
  });
  console.log(`Patched mock 1 maths Q${patch.q}`);
}

console.log("Done.");
