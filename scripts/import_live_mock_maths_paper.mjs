#!/usr/bin/env node
/**
 * Import a live mock maths paper JSON into Supabase (papers, sections, questions).
 *
 * Usage:
 *   node scripts/import_live_mock_maths_paper.mjs docs/live-mock-2-maths-paper.json
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (repo root).
 */
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
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const jsonPath = resolve(repoRoot, process.argv[2] || "docs/live-mock-2-maths-paper.json");
const payload = JSON.parse(readFileSync(jsonPath, "utf8"));
const { paper, sections } = payload;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function rest(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: prefer ? { ...headers, Prefer: prefer } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function upsertPaper() {
  const row = {
    slug: paper.slug,
    title: paper.title,
    track: "11plus",
    subject: paper.subject ?? "maths",
    duration_minutes: paper.duration_minutes,
    question_count: paper.question_count,
    status: "published",
  };
  const existing = await rest(`live_mock_papers?slug=eq.${encodeURIComponent(paper.slug)}&select=id`);
  if (existing?.length) {
    const [updated] = await rest(`live_mock_papers?id=eq.${existing[0].id}`, {
      method: "PATCH",
      body: row,
      prefer: "return=representation",
    });
    return updated.id;
  }
  const [inserted] = await rest("live_mock_papers", {
    method: "POST",
    body: row,
    prefer: "return=representation",
  });
  return inserted.id;
}

async function upsertSection(paperId, section) {
  const row = {
    paper_id: paperId,
    section_order: section.section_order,
    section_key: section.section_key,
    title: section.title,
    instructions: section.instructions ?? null,
    passage_title: section.passage_title ?? null,
    passage_blocks: section.passage_blocks ?? [],
  };
  const existing = await rest(
    `live_mock_sections?paper_id=eq.${paperId}&section_key=eq.${encodeURIComponent(section.section_key)}&select=id`,
  );
  if (existing?.length) {
    const [updated] = await rest(`live_mock_sections?id=eq.${existing[0].id}`, {
      method: "PATCH",
      body: row,
      prefer: "return=representation",
    });
    return updated.id;
  }
  const [inserted] = await rest("live_mock_sections", {
    method: "POST",
    body: row,
    prefer: "return=representation",
  });
  return inserted.id;
}

async function upsertQuestion(paperId, sectionId, q) {
  const row = {
    paper_id: paperId,
    section_id: sectionId,
    question_number: q.question_number,
    question_type: q.question_type,
    stem: q.stem,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? null,
    topic: q.topic ?? null,
    subtopic: q.subtopic ?? null,
    difficulty: q.difficulty ?? null,
  };
  const existing = await rest(
    `live_mock_questions?paper_id=eq.${paperId}&question_number=eq.${q.question_number}&select=id`,
  );
  if (existing?.length) {
    await rest(`live_mock_questions?id=eq.${existing[0].id}`, {
      method: "PATCH",
      body: row,
      prefer: "return=minimal",
    });
    return "updated";
  }
  await rest("live_mock_questions", { method: "POST", body: row, prefer: "return=minimal" });
  return "inserted";
}

async function linkMock2Event(paperId) {
  const isMaths = paper.slug === "both_subjects_maths_mock_2";
  const isEnglish = paper.slug === "both_subjects_english_mock_2";
  if (!isMaths && !isEnglish) return;
  try {
    const mathsRow = await rest(`live_mock_papers?slug=eq.both_subjects_maths_mock_2&select=id`);
    const englishRow = await rest(`live_mock_papers?slug=eq.both_subjects_english_mock_2&select=id`);
    const mathsId = isMaths ? paperId : mathsRow?.[0]?.id;
    const englishId = isEnglish ? paperId : englishRow?.[0]?.id;
    const eventRow = {
      slug: "both_subjects_live_mock_2",
      title: "11+ maths and english mock 2",
      track: "11plus",
      starts_at: "2026-06-21T09:00:00+00:00",
      break_minutes: 15,
      maths_paper_id: mathsId ?? null,
      english_paper_id: englishId ?? null,
      access_rule: "registered",
      status: "published",
    };
    const existing = await rest(`live_mock_events?slug=eq.both_subjects_live_mock_2&select=id`);
    if (existing?.length) {
      await rest(`live_mock_events?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: eventRow,
        prefer: "return=minimal",
      });
      console.log("Linked mock 2 event (maths:", mathsId, "english:", englishId, ")");
    } else {
      await rest("live_mock_events", { method: "POST", body: eventRow, prefer: "return=minimal" });
      console.log("Created mock 2 event (maths:", mathsId, "english:", englishId, ")");
    }
  } catch (err) {
    console.warn("Skipped live_mock_events link (table may not exist yet):", err.message);
  }
}

async function main() {
  console.log("Importing", jsonPath);
  const paperId = await upsertPaper();
  console.log("Paper:", paper.slug, paperId);

  let inserted = 0;
  let updated = 0;
  for (const section of sections) {
    const sectionId = await upsertSection(paperId, section);
    for (const q of section.questions) {
      const result = await upsertQuestion(paperId, sectionId, q);
      if (result === "inserted") inserted += 1;
      else updated += 1;
    }
    console.log(`  Section ${section.section_key}: ${section.questions.length} questions`);
  }

  await linkMock2Event(paperId);
  console.log(`Done — ${inserted} inserted, ${updated} updated (${inserted + updated} total).`);
  if (payload.qa_review?.fit_for_11plus_maths || payload.qa_review?.fit_for_11plus_english) {
    console.log("QA status:", payload.qa_review.status);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
