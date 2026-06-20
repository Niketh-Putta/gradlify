#!/usr/bin/env node
/**
 * Seed mock 2 submitted results for the early cohort (maths + english).
 *
 * Participant names, emails and scores: docs/live-mock-2-cohort-scores.json
 *
 * Usage:
 *   node scripts/seed_live_mock2_cohort_results.mjs
 *   node scripts/seed_live_mock2_cohort_results.mjs --force
 *   node scripts/seed_live_mock2_cohort_results.mjs --remove-legacy
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const force = process.argv.includes("--force");
const removeLegacy = process.argv.includes("--remove-legacy");

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
const MOCK2_EVENT_SLUG = "both_subjects_live_mock_2";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const cohort = JSON.parse(readFileSync(resolve(repoRoot, "docs/live-mock-2-cohort-scores.json"), "utf8"));
const participants = cohort.participants;

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

async function rest(path, { method = "GET", body, prefer } = {}) {
  const headers = prefer ? { ...adminHeaders, Prefer: prefer } : adminHeaders;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWrongOption(options, correctId) {
  const wrong = options.find((o) => o.id !== correctId);
  return wrong?.id ?? "A";
}

function optionsSnapshot(options) {
  return options.map((o) => ({
    id: o.id,
    text: o.text,
    correct: Boolean(o.correct),
  }));
}

async function findUserIdByEmail(email) {
  const listed = await adminFetch(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
  return listed?.users?.[0]?.id ?? null;
}

async function ensureParticipantUser(participant) {
  const { name, email } = participant;
  let userId = await findUserIdByEmail(email);

  if (!userId) {
    const password = `Gk-${randomBytes(12).toString("base64url")}!`;
    try {
      const created = await adminFetch("/auth/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name, name, preferredName: name.split(" ")[0] },
        }),
      });
      userId = created?.id ?? created?.user?.id ?? null;
    } catch (error) {
      userId = await findUserIdByEmail(email);
      if (!userId) throw error;
    }
  }

  const preferredName = name.split(" ")[0];
  await rest("profiles", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      user_id: userId,
      full_name: name,
      track: "11plus",
      tier: "free",
      plan: "free",
      onboarding: { preferredName },
      updated_at: new Date().toISOString(),
    },
  }).catch(() => {});

  return { id: userId, email };
}

async function ensureSignup(userId, email) {
  const existing = await rest(
    `live_mock_exam_signups?mock_slug=eq.${MOCK2_EVENT_SLUG}&user_id=eq.${userId}&select=id`,
  );
  if (existing?.length) return;

  await rest("live_mock_exam_signups", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      mock_slug: MOCK2_EVENT_SLUG,
      user_id: userId,
      email,
      mock_starts_at: "2026-06-21T09:00:00+01:00",
    },
  });
}

async function loadPaperBundle(slug) {
  const papers = await rest(`live_mock_papers?slug=eq.${encodeURIComponent(slug)}&select=id,question_count,duration_minutes`);
  const paper = papers?.[0];
  if (!paper?.id) throw new Error(`Paper not found: ${slug}`);

  const sections = await rest(`live_mock_sections?paper_id=eq.${paper.id}&select=id,section_key`);
  const sectionById = new Map(sections.map((s) => [s.id, s.section_key]));

  const questions = await rest(
    `live_mock_questions?paper_id=eq.${paper.id}&select=id,section_id,question_number,question_type,stem,options,correct_answer&order=question_number.asc`,
  );

  return {
    paperId: paper.id,
    questionCount: paper.question_count ?? questions.length,
    durationMinutes: paper.duration_minutes ?? 50,
    questions: questions.map((q) => {
      const options = Array.isArray(q.options) ? q.options : [];
      const correct =
        options.find((o) => o.correct) ??
        options.find((o) => o.id === q.correct_answer) ??
        options[0];
      return {
        id: q.id,
        questionNumber: q.question_number,
        sectionKey: sectionById.get(q.section_id) ?? null,
        questionType: q.question_type,
        stem: q.stem,
        options,
        correctId: correct?.id ?? q.correct_answer,
        correctLabel: correct?.text ?? null,
      };
    }),
  };
}

async function deleteAttemptsForUser(userId, paperId) {
  const attempts = await rest(
    `live_mock_attempts?paper_id=eq.${paperId}&user_id=eq.${userId}&select=id`,
  );
  for (const row of attempts ?? []) {
    await rest(`live_mock_answers?attempt_id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" });
    await rest(`live_mock_attempts?id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" });
  }
}

async function deleteAllAttemptsForUser(userId) {
  const attempts = await rest(`live_mock_attempts?user_id=eq.${userId}&select=id`);
  for (const row of attempts ?? []) {
    await rest(`live_mock_answers?attempt_id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" });
    await rest(`live_mock_attempts?id=eq.${row.id}`, { method: "DELETE", prefer: "return=minimal" });
  }
}

async function removeLegacyPlaceholderAccounts() {
  const listed = await adminFetch("/auth/v1/admin/users?per_page=200");
  const legacy = (listed?.users ?? []).filter((u) =>
    typeof u.email === "string" && u.email.endsWith("@gradlify-cohort.local") && u.email.startsWith("mock2bot-"),
  );

  if (legacy.length === 0) {
    console.log("No legacy placeholder accounts to remove.");
    return;
  }

  console.log(`Removing ${legacy.length} legacy placeholder accounts…`);
  for (const user of legacy) {
    await deleteAllAttemptsForUser(user.id);
    await rest(`live_mock_exam_signups?user_id=eq.${user.id}`, { method: "DELETE", prefer: "return=minimal" }).catch(() => {});
    await adminFetch(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
    console.log(`  removed ${user.email}`);
  }
}

function buildAnswerRows({ questions, targetCorrect, attemptId, paperId, userId, submittedAt }) {
  const indices = shuffle(questions.map((_, i) => i));
  const correctSet = new Set(indices.slice(0, targetCorrect));

  return questions.map((q, qi) => {
    const isCorrect = correctSet.has(qi);
    const selected = isCorrect ? q.correctId : pickWrongOption(q.options, q.correctId);
    const selectedLabel = q.options.find((o) => o.id === selected)?.text ?? null;
    return {
      attempt_id: attemptId,
      paper_id: paperId,
      question_id: q.id,
      user_id: userId,
      question_number: q.questionNumber,
      section_key: q.sectionKey,
      question_type: q.questionType,
      stem_snapshot: q.stem,
      correct_option_id: q.correctId,
      correct_option_label: q.correctLabel,
      selected_option: selected,
      selected_option_label: selectedLabel,
      options_snapshot: optionsSnapshot(q.options),
      is_correct: isCorrect,
      answered_at: submittedAt,
    };
  });
}

async function seedPaperAttempt({
  userId,
  email,
  displayName,
  paper,
  targetCorrect,
  submittedAt,
  durationSeconds,
}) {
  if (force) {
    await deleteAttemptsForUser(userId, paper.paperId);
  }

  const existing = await rest(
    `live_mock_attempts?paper_id=eq.${paper.paperId}&user_id=eq.${userId}&select=id,status`,
  );
  if (existing?.length && !force) {
    console.log(`  skip ${displayName} on ${paper.paperId.slice(0, 8)} (attempt exists)`);
    return;
  }

  const attemptRows = await rest("live_mock_attempts", {
    method: "POST",
    prefer: "return=representation",
    body: {
      paper_id: paper.paperId,
      user_id: userId,
      user_email: email,
      status: "submitted",
      submitted_at: submittedAt,
      duration_seconds: durationSeconds,
      question_count: paper.questionCount,
      answered_count: paper.questionCount,
    },
  });

  const attemptId = attemptRows?.[0]?.id;
  if (!attemptId) throw new Error("Attempt insert did not return id");

  const answerRows = buildAnswerRows({
    questions: paper.questions,
    targetCorrect,
    attemptId,
    paperId: paper.paperId,
    userId,
    submittedAt,
  });

  await rest("live_mock_answers", {
    method: "POST",
    prefer: "return=minimal",
    body: answerRows,
  });

  const actualCorrect = answerRows.filter((r) => r.is_correct).length;
  console.log(`  ${displayName}: ${actualCorrect}/${paper.questionCount}`);
}

async function main() {
  if (removeLegacy || force) {
    await removeLegacyPlaceholderAccounts();
  }

  console.log(`Seeding ${participants.length} mock 2 results…`);

  const mathsPaper = await loadPaperBundle(cohort.maths_paper_slug);
  const englishPaper = await loadPaperBundle(cohort.english_paper_slug);
  const baseSubmitted = new Date("2026-06-21T10:15:00+01:00").getTime();

  for (let i = 0; i < participants.length; i += 1) {
    const p = participants[i];
    const { id, email } = await ensureParticipantUser(p);
    await ensureSignup(id, email);

    const submittedAt = new Date(baseSubmitted + i * 7 * 60 * 1000).toISOString();
    const durationSeconds = 2400 + Math.floor(Math.random() * 480);

    console.log(`${i + 1}. ${p.name} (${email}) — maths ${p.maths}/60, english ${p.english}/60`);

    await seedPaperAttempt({
      userId: id,
      email,
      displayName: p.name,
      paper: mathsPaper,
      targetCorrect: p.maths,
      submittedAt,
      durationSeconds,
    });

    await seedPaperAttempt({
      userId: id,
      email,
      displayName: p.name,
      paper: englishPaper,
      targetCorrect: p.english,
      submittedAt: new Date(new Date(submittedAt).getTime() + 20 * 60 * 1000).toISOString(),
      durationSeconds: durationSeconds + 60,
    });
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
