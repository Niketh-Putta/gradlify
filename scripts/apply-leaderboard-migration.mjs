#!/usr/bin/env node
/**
 * Applies leaderboard zero-score migration when DATABASE_URL or SUPABASE_DB_PASSWORD is set.
 * Usage:
 *   DATABASE_URL="postgresql://postgres.[ref]:[password]@...:5432/postgres" node scripts/apply-leaderboard-migration.mjs
 * Or add SUPABASE_DB_PASSWORD to .env and run: node scripts/apply-leaderboard-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const migrationPaths = [
  resolve(root, "supabase/migrations/20260516120000_leaderboard_include_zero_scores.sql"),
  resolve(root, "supabase/migrations/20260517120000_leaderboard_eligible_left_join_zeros.sql"),
];

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || "gknnfbalijxykqycopic";
const password = process.env.SUPABASE_DB_PASSWORD;
const databaseUrl =
  process.env.DATABASE_URL ||
  (password
    ? `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`
    : null);

if (!databaseUrl) {
  console.error(
    "Set DATABASE_URL or SUPABASE_DB_PASSWORD in the environment, then re-run this script.",
  );
  console.error("Or paste SQL in Supabase Dashboard → SQL Editor:");
  for (const path of migrationPaths) console.error(path);
  process.exit(1);
}

const sql = migrationPaths.map((path) => readFileSync(path, "utf8")).join("\n\n");

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Install pg: npm install --save-dev pg");
  process.exit(1);
}

const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(sql);
  console.log("Leaderboard migration applied successfully.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
