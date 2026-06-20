#!/usr/bin/env node
/**
 * Full QA audit for live mock 1 vs mock 2 question banks in Supabase.
 *
 * Usage: node scripts/audit_live_mock_papers.mjs
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
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const MOCK1 = {
  label: "Mock 1",
  maths: "both_subjects_maths",
  english: "both_subjects_english",
};
const MOCK2 = {
  label: "Mock 2",
  maths: "both_subjects_maths_mock_2",
  english: "both_subjects_english_mock_2",
};

function normStem(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s%£./-]/g, "")
    .trim();
}

function normOptionText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function auditQuestion(q, paperSlug) {
  const issues = [];
  const opts = Array.isArray(q.options) ? q.options : [];
  const correctFlags = opts.filter((o) => o.correct);
  const letter = String(q.correct_answer || "").trim();

  if (opts.length < 4) issues.push(`Q${q.question_number}: only ${opts.length} options`);
  if (correctFlags.length !== 1) {
    issues.push(`Q${q.question_number}: ${correctFlags.length} correct flags (expected 1)`);
  }
  const flagged = correctFlags[0];
  if (letter && flagged && flagged.id !== letter) {
    issues.push(`Q${q.question_number}: correct_answer=${letter} but flagged id=${flagged.id}`);
  }
  if (!letter) issues.push(`Q${q.question_number}: missing correct_answer`);

  const texts = opts.map((o) => normOptionText(o.text));
  const dupTexts = texts.filter((t, i) => texts.indexOf(t) !== i);
  if (dupTexts.length) issues.push(`Q${q.question_number}: duplicate option text`);

  const ids = opts.map((o) => String(o.id));
  if (new Set(ids).size !== ids.length) issues.push(`Q${q.question_number}: duplicate option ids`);

  if (!String(q.stem || "").trim()) issues.push(`Q${q.question_number}: empty stem`);
  if (!String(q.explanation || "").trim()) issues.push(`Q${q.question_number}: missing explanation`);
  if (String(q.explanation || "").includes("—")) issues.push(`Q${q.question_number}: em dash in explanation`);

  if (paperSlug.includes("english") && String(q.explanation || "").length < 40) {
    issues.push(`Q${q.question_number}: explanation very short (${String(q.explanation).length} chars)`);
  }

  return issues;
}

async function loadPaperQuestions(slug) {
  const papers = await rest(
    `live_mock_papers?slug=eq.${encodeURIComponent(slug)}&select=id,slug,title,question_count`,
  );
  const paper = papers?.[0];
  if (!paper) throw new Error(`Paper not found: ${slug}`);
  const questions = await rest(
    `live_mock_questions?paper_id=eq.${paper.id}&select=question_number,question_type,stem,options,correct_answer,explanation&order=question_number.asc`,
  );
  return { paper, questions: questions || [] };
}

function stemOverlap(a, b) {
  return normStem(a) === normStem(b);
}

async function auditMock(mock) {
  console.log(`\n=== ${mock.label} ===`);
  for (const subject of ["maths", "english"]) {
    const slug = mock[subject];
    const { paper, questions } = await loadPaperQuestions(slug);
    console.log(`\n${subject.toUpperCase()} · ${slug} · ${questions.length}/${paper.question_count} questions`);

    const allIssues = [];
    for (const q of questions) {
      allIssues.push(...auditQuestion(q, slug));
    }

    const stems = questions.map((q) => normStem(q.stem));
    const dupStems = stems.filter((s, i) => s && stems.indexOf(s) !== i);
    if (dupStems.length) allIssues.push(`duplicate stems within paper (${dupStems.length} dupes)`);

    if (allIssues.length === 0) {
      console.log("  ✓ All structural checks passed");
    } else {
      console.log(`  ✗ ${allIssues.length} issue(s):`);
      for (const issue of allIssues.slice(0, 30)) console.log(`    - ${issue}`);
      if (allIssues.length > 30) console.log(`    ... and ${allIssues.length - 30} more`);
    }
  }
}

async function compareMocks() {
  console.log("\n=== MOCK 1 vs MOCK 2 CONTENT DIVIDE ===");
  const pairs = [
    ["maths", MOCK1.maths, MOCK2.maths],
    ["english", MOCK1.english, MOCK2.english],
  ];

  for (const [subject, slug1, slug2] of pairs) {
    const [{ questions: q1 }, { questions: q2 }] = await Promise.all([
      loadPaperQuestions(slug1),
      loadPaperQuestions(slug2),
    ]);

    const overlaps = [];
    for (const a of q1) {
      for (const b of q2) {
        if (stemOverlap(a.stem, b.stem)) {
          overlaps.push({
            mock1: a.question_number,
            mock2: b.question_number,
            stem: String(a.stem).slice(0, 80),
          });
        }
      }
    }

    const exact = overlaps;

    console.log(`\n${subject.toUpperCase()}:`);
    console.log(`  Mock 1 questions: ${q1.length}`);
    console.log(`  Mock 2 questions: ${q2.length}`);
    console.log(`  Exact duplicate stems: ${exact.length}`);

    if (exact.length) {
      console.log("  EXACT MATCHES (must fix):");
      for (const o of exact.slice(0, 15)) {
        console.log(`    M1 Q${o.mock1} ↔ M2 Q${o.mock2}: ${o.stem}…`);
      }
    } else {
      console.log("  ✓ No duplicate stems between mock 1 and mock 2");
    }
  }
}

await auditMock(MOCK1);
await auditMock(MOCK2);
await compareMocks();
console.log("\nDone.\n");
