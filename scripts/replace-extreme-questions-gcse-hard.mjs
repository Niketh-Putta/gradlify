/*
Replace ALL rows in public.extreme_questions with GCSE-only hard questions.
Source: exam_questions difficulty 5 (then 4), filtered for GCSE-friendly wording.

Run:
  node scripts/replace-extreme-questions-gcse-hard.mjs
*/

import fs from "node:fs";
import path from "node:path";

function parseDotEnv(envPath) {
  const out = {};
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    out[key] = value;
  });
  return out;
}

const env = parseDotEnv(path.resolve(process.cwd(), ".env"));
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

async function getCount(table, filterQuery = "") {
  const endpoint = `/rest/v1/${table}?select=id${filterQuery ? `&${filterQuery}` : ""}`;
  const res = await supabaseFetch(endpoint, { method: "HEAD", headers: { Prefer: "count=exact" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Count failed: ${res.status} ${text}`);
  }
  const range = res.headers.get("content-range") || "";
  const match = range.match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function fetchExamCandidates({ difficulty }) {
  const endpoint =
    `/rest/v1/exam_questions?select=` +
    [
      "id",
      "question",
      "correct_answer",
      "wrong_answers",
      "all_answers",
      "image_url",
      "image_alt",
      "explanation",
      "explain_on",
      "question_type",
      "subtopic",
      "tier",
      "calculator",
      "difficulty",
    ].join(",") +
    `&difficulty=eq.${difficulty}&image_url=is.null&limit=1000`;

  const res = await supabaseFetch(endpoint, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch exam candidates: ${res.status} ${text}`);
  }
  return res.json();
}

const BANNED_KEYWORDS = [
  "mod",
  "congruent",
  "euler",
  "totient",
  "phi(",
  "fermat",
  "crt",
  "chinese remainder",
  "order of",
  "binary string",
  "derangement",
  "induction",
  "complex",
  "matrix",
  "log",
  "ln",
];

function looksNonGcse(text) {
  const hay = text.toLowerCase();
  return BANNED_KEYWORDS.some((kw) => hay.includes(kw));
}

function cleanHcfLcm(text) {
  return text
    .replace(/\bgcd\b/gi, "HCF")
    .replace(/\blcm\b/gi, "LCM")
    .replace(/HCF\(([^)]+)\)/gi, "HCF of $1")
    .replace(/LCM\(([^)]+)\)/gi, "LCM of $1");
}

function normalizeText(text) {
  const cleaned = cleanHcfLcm(String(text || "").trim());
  return cleaned.replace(/\s+/g, " ").replace(/\s+\n/g, "\n").trim();
}

function hasPlaceholderAnswers(row) {
  const answers = Array.isArray(row.all_answers) ? row.all_answers : [];
  return answers.some((a) => String(a).toLowerCase().includes("different answer"));
}

function makeRow({ question, correct, wrong, explanation }) {
  const wrongAnswers = [...wrong];
  const allAnswers = [correct, ...wrongAnswers];
  return {
    question,
    correct_answer: correct,
    wrong_answers: wrongAnswers,
    all_answers: allAnswers,
    explanation,
    explain_on: "always",
    image_url: null,
    image_alt: null,
  };
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickGcseRows(allCandidates, targetCount) {
  const picked = [];
  const typeCounts = new Map();
  const subtopicCounts = new Map();
  const MAX_PER_TYPE = 20;
  const MAX_PER_SUBTOPIC = 7;

  for (const row of allCandidates) {
    if (picked.length >= targetCount) break;
    const question = normalizeText(row.question || "");
    const correct = normalizeText(row.correct_answer || "");
    const explanation = normalizeText(row.explanation || "");
    const allAnswers = Array.isArray(row.all_answers) ? row.all_answers.map(normalizeText) : [];
    const wrongAnswers = Array.isArray(row.wrong_answers) ? row.wrong_answers.map(normalizeText) : [];

    if (!question || !correct) continue;
    if (!explanation || explanation.length < 140) continue;
    if (looksNonGcse(`${question}\n${explanation}`)) continue;
    if (hasPlaceholderAnswers(row)) continue;
    if (wrongAnswers.length < 3) continue;

    const type = String(row.question_type || "Mixed");
    const subtopic = String(row.subtopic || "unknown");

    if ((typeCounts.get(type) || 0) >= MAX_PER_TYPE) continue;
    if ((subtopicCounts.get(subtopic) || 0) >= MAX_PER_SUBTOPIC) continue;

    picked.push(
      makeRow({
        question,
        correct,
        wrong: wrongAnswers.slice(0, 3),
        explanation,
      })
    );
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    subtopicCounts.set(subtopic, (subtopicCounts.get(subtopic) || 0) + 1);
  }

  return picked;
}

async function deleteAllExtreme() {
  const res = await supabaseFetch("/rest/v1/extreme_questions?id=not.is.null", {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Delete failed: ${res.status} ${text}`);
  }
}

async function main() {
  const beforeCount = await getCount("extreme_questions");
  console.log(`extreme_questions before: ${beforeCount}`);

  const difficulty5 = await fetchExamCandidates({ difficulty: 5 });
  const difficulty4 = await fetchExamCandidates({ difficulty: 4 });

  const candidates = shuffle([...difficulty5, ...difficulty4]);
  const selected = pickGcseRows(candidates, 100);

  if (selected.length < 100) {
    throw new Error(`Not enough GCSE-friendly hard questions found (picked ${selected.length}/100).`);
  }

  await deleteAllExtreme();

  const insertRes = await supabaseFetch("/rest/v1/extreme_questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(selected),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text().catch(() => "");
    throw new Error(`Insert failed: ${insertRes.status} ${text}`);
  }

  const afterCount = await getCount("extreme_questions");
  console.log(`extreme_questions after: ${afterCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
