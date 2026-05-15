/**
 * Applies leaderboard zero-reset migration to remote Supabase.
 * Uses (in order): SUPABASE_DB_PASSWORD / DATABASE_URL via pg, then Management API + SUPABASE_ACCESS_TOKEN.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260515180000_leaderboard_zero_all_scores.sql",
);

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env in project root");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function projectRefFromUrl(url) {
  const m = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? "";
}

function buildPoolerUrls(ref, password) {
  const enc = encodeURIComponent(password);
  const regions = [
    "eu-west-1",
    "eu-west-2",
    "eu-central-1",
    "us-east-1",
    "us-west-1",
    "ap-southeast-1",
  ];
  return regions.flatMap((region) => [
    `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
  ]);
}

async function runViaPg(connectionString, sql) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function runViaManagementApi(token, projectRef, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${body}`);
  }
  return body;
}

async function verifyReset(supabaseUrl, serviceRoleKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await sb.rpc("get_leaderboard_correct_global_for_track", {
    p_period: "month",
    p_track: "11plus",
  });
  if (error) throw new Error(`Verify RPC failed: ${error.message}`);
  const top = (data ?? []).slice(0, 3);
  console.log("Top leaderboard after reset:", top.length ? top : "(empty)");
  if (top.length > 0 && Number(top[0].correct_count) > 0) {
    console.warn("Warning: leaderboard still has non-zero scores.");
  } else {
    console.log("Leaderboard reset verified.");
  }
}

async function main() {
  const env = loadEnv();
  const sql = fs.readFileSync(migrationPath, "utf8");
  const projectRef =
    env.VITE_SUPABASE_PROJECT_ID || projectRefFromUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectRef || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing VITE_SUPABASE_PROJECT_ID, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  const dbPassword = env.SUPABASE_DB_PASSWORD || env.POSTGRES_PASSWORD;
  const databaseUrl = env.DATABASE_URL || env.SUPABASE_DB_URL;

  let applied = false;

  if (databaseUrl) {
    console.log("Applying migration via DATABASE_URL…");
    await runViaPg(databaseUrl, sql);
    applied = true;
  } else if (dbPassword) {
    const urls = buildPoolerUrls(projectRef, dbPassword);
    let lastErr;
    for (const url of urls) {
      try {
        console.log("Trying pooler connection…");
        await runViaPg(url, sql);
        applied = true;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!applied) throw lastErr ?? new Error("All pooler connection attempts failed");
  }

  if (!applied && env.SUPABASE_ACCESS_TOKEN) {
    try {
      console.log("Applying migration via Supabase Management API…");
      await runViaManagementApi(env.SUPABASE_ACCESS_TOKEN, projectRef, sql);
      applied = true;
    } catch (e) {
      console.warn("Management API failed:", e.message || e);
    }
  }

  if (!applied && dbPassword) {
    const { execSync } = await import("node:child_process");
    console.log("Applying via supabase db push…");
    execSync(
      `npx supabase@latest db push --linked --include-all --yes -p ${JSON.stringify(dbPassword)}`,
      { cwd: root, stdio: "inherit", env: { ...process.env, SUPABASE_DB_PASSWORD: dbPassword } },
    );
    applied = true;
  }

  if (!applied) {
    throw new Error(
      "Could not connect to Postgres. Add SUPABASE_DB_PASSWORD (from Supabase Dashboard → Project Settings → Database) " +
        "or refresh SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens) in .env, then re-run:\n" +
        "  node scripts/apply-leaderboard-reset.mjs",
    );
  }

  console.log("Migration applied successfully.");
  await verifyReset(supabaseUrl, serviceRoleKey);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
