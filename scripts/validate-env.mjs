#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

const parseEnv = (filePath) => {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
};

const env = parseEnv(envPath);

const has = (...keys) => keys.some((key) => Boolean(env[key]?.trim()));

const groups = [
  {
    name: "Browser app",
    required: [
      ["VITE_SUPABASE_URL"],
      ["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"],
    ],
    optional: [["VITE_GOOGLE_CLIENT_ID"], ["VITE_DISCORD_INVITE_URL"], ["VITE_TESTING_MODE"]],
  },
  {
    name: "Supabase admin/scripts",
    required: [["SUPABASE_URL", "VITE_SUPABASE_URL"], ["SUPABASE_SERVICE_ROLE_KEY"]],
    optional: [["SUPABASE_ACCESS_TOKEN"], ["VITE_SUPABASE_PROJECT_ID"]],
  },
  {
    name: "Supabase Edge Functions",
    required: [
      ["SUPABASE_URL", "VITE_SUPABASE_URL"],
      ["SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"],
      ["SUPABASE_SERVICE_ROLE_KEY"],
    ],
    optional: [["OPENAI_API_KEY"], ["GEMINI_API_KEY"], ["RESEND_API_KEY"], ["GOOGLE_CLIENT_ID", "VITE_GOOGLE_CLIENT_ID"]],
  },
  {
    name: "Stripe",
    required: [["ENVIRONMENT"], ["STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY_LIVE"]],
    optional: [
      ["STRIPE_WEBHOOK_SECRET_TEST", "STRIPE_WEBHOOK_SECRET_LIVE", "STRIPE_WEBHOOK_SECRET"],
      ["STRIPE_PRICE_11PLUS_MONTHLY_TEST", "STRIPE_PRICE_11PLUS_MONTHLY_LIVE"],
      ["STRIPE_PRICE_11PLUS_WEEKLY_TEST", "STRIPE_PRICE_11PLUS_WEEKLY_LIVE"],
      ["STRIPE_PRICE_11PLUS_ANNUAL_TEST", "STRIPE_PRICE_11PLUS_ANNUAL_LIVE"],
      ["APP_BASE_URL"],
    ],
  },
];

let missingCount = 0;

console.log("Checking .env wiring without printing secret values...\n");

for (const group of groups) {
  console.log(group.name);
  for (const keys of group.required) {
    const ok = has(...keys);
    if (!ok) missingCount += 1;
    console.log(`  ${ok ? "OK" : "MISSING"} ${keys.join(" or ")}`);
  }
  for (const keys of group.optional) {
    console.log(`  ${has(...keys) ? "OK" : "optional"} ${keys.join(" or ")}`);
  }
  console.log("");
}

if (missingCount > 0) {
  console.error(`${missingCount} required env setting${missingCount === 1 ? "" : "s"} missing.`);
  process.exit(1);
}

console.log("All required env wiring is present.");
