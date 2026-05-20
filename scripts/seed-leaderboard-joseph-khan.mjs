#!/usr/bin/env node
/**
 * Seed a leaderboard demo user "joseph_khan" with 41 correct mock answers (11+ track).
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.functions.
 *
 * Optional env:
 *   JOSEPH_KHAN_EMAIL  — auth email (default: joseph.khan.<random>@gmail.com)
 *   JOSEPH_KHAN_PASSWORD — login password (default: random, printed once)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
};

loadEnvFile(path.resolve(__dirname, "..", ".env"));
loadEnvFile(path.resolve(__dirname, "..", ".env.functions"));

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const randomSuffix = randomBytes(4).toString("hex");
const email =
  process.env.JOSEPH_KHAN_EMAIL?.trim() ||
  `joseph.khan.${randomSuffix}@gmail.com`;
const password =
  process.env.JOSEPH_KHAN_PASSWORD?.trim() ||
  `Gk-${randomBytes(9).toString("base64url")}!`;
const displayName = "joseph_khan";
const targetScore = 41;
const track = "11plus";
/** After sprint reset — must be >= leaderboard_config.effective_start */
const mockCreatedAt = "2026-05-15T12:00:00.000Z";

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function adminFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...adminHeaders, ...(options.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  console.log("Creating auth user…");
  let userId = null;

  try {
    const created = await adminFetch("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName, name: displayName },
      }),
    });
    userId = created?.id ?? created?.user?.id ?? null;
  } catch (error) {
    const message = String(error.message || error);
    if (!message.includes("already") && !message.includes("422")) {
      throw error;
    }
    const listed = await adminFetch(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
    userId = listed?.users?.[0]?.id ?? null;
    if (!userId) throw error;
    console.log("User already exists, reusing:", userId);
  }

  if (!userId) {
    throw new Error("Could not resolve user id");
  }

  console.log("Updating profile…");
  await adminFetch(`/rest/v1/profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      full_name: displayName,
      track,
      tier: "free",
      plan: "free",
      updated_at: new Date().toISOString(),
    }),
  });

  console.log("Ensuring user_settings…");
  await adminFetch("/rest/v1/user_settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      show_on_global_leaderboard: true,
    }),
  }).catch(async () => {
    await adminFetch(`/rest/v1/user_settings?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ show_on_global_leaderboard: true }),
    });
  });

  const existingAttempts = await adminFetch(
    `/rest/v1/mock_attempts?user_id=eq.${userId}&track=eq.${track}&select=id&limit=5`,
  );

  if (Array.isArray(existingAttempts) && existingAttempts.length > 0) {
    const attemptId = existingAttempts[0].id;
    await adminFetch(`/rest/v1/mock_questions?attempt_id=eq.${attemptId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    await adminFetch(`/rest/v1/mock_attempts?id=eq.${attemptId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }

  console.log(`Seeding mock with ${targetScore} correct answers…`);
  const attempt = await adminFetch("/rest/v1/mock_attempts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      mode: "mock",
      status: "completed",
      title: "11+ Leaderboard seed",
      total_marks: targetScore,
      score: targetScore,
      duration_minutes: 30,
      track,
      created_at: mockCreatedAt,
    }),
  });

  const attemptId = Array.isArray(attempt) ? attempt[0]?.id : attempt?.id;
  if (!attemptId) {
    throw new Error("mock_attempt insert did not return id");
  }

  const questions = Array.from({ length: targetScore }, (_, idx) => ({
    attempt_id: attemptId,
    idx: idx + 1,
    topic: "Number",
    subtopic: "seed",
    prompt: `Seed question ${idx + 1}`,
    marks: 1,
    awarded_marks: 1,
    user_answer: "1",
    correct_answer: "1",
  }));

  await adminFetch("/rest/v1/mock_questions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(questions),
  });

  const verify = await adminFetch("/rest/v1/rpc/get_leaderboard_correct_global_for_track", {
    method: "POST",
    body: JSON.stringify({ p_period: "month", p_track: track }),
  });

  const row = Array.isArray(verify)
    ? verify.find((entry) => entry.user_id === userId)
    : null;

  console.log("\n--- joseph_khan leaderboard seed complete ---");
  console.log("user_id:", userId);
  console.log("email:", email);
  console.log("password:", password);
  console.log("display_name:", displayName);
  console.log("track:", track);
  console.log("leaderboard correct_count:", row?.correct_count ?? "(not listed yet)");
  console.log("leaderboard rank:", row?.rank ?? "(not listed yet)");
  console.log("\nNote: A real @gmail.com inbox must be created by you at https://mail.google.com if you need to log in with Gmail.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
