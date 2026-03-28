import fs from "node:fs";
import path from "node:path";

function parseDotEnv(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  });
  return out;
}

const env = parseDotEnv(path.resolve(process.cwd(), ".env"));
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const L = (s) => String(s ?? "");

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

function normalizeTemplate(text) {
  let s = L(text).toLowerCase();
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/£\s*\d+(?:,\d{3})*(?:\.\d+)?/g, "<C>");
  s = s.replace(/\b\d+(?:\.\d+)?\s*%/g, "<P>");
  s = s.replace(/\b\d+(?:\.\d+)?\s*(?:mm|cm|m|km|g|kg|ml|l|litre|litres|hour|hours|h|min|mins|minute|minutes|s|sec|secs|°)\b/gi, "<U>");
  s = s.replace(/(?<![a-z])[-+]?\d+(?:\.\d+)?(?![a-z])/gi, "<N>");
  s = s.replace(/\\\(|\\\)|\\\[|\\\]/g, "");
  s = s.replace(/\$/g, "");
  return s;
}

function isFormulaic(question) {
  const q = L(question).trim();
  const lower = q.toLowerCase();
  if (q.length > 90) return false;
  const starters = [
    "calculate",
    "find",
    "solve",
    "simplify",
    "evaluate",
    "write",
    "convert",
    "factorise",
    "expand",
    "work out",
  ];
  if (!starters.some((s) => lower.startsWith(s))) return false;
  const hasContext = /£|km|cm|m\b|kg|ml|l\b|hours|minutes|%|temperature|speed|distance|time|diagram|graph|table/i.test(q);
  return !hasContext;
}

async function fetchAll() {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const res = await supabaseFetch(
      `/rest/v1/exam_questions?select=id,question,explanation,subtopic,tier,question_type,correct_answer,wrong_answers,all_answers,calculator,difficulty,marks,estimated_time_sec,image_url,image_alt&offset=${from}&limit=${pageSize}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Fetch failed: ${res.status} ${text}`);
    }
    const batch = await res.json();
    if (!batch.length) break;
    rows.push(...batch);
    from += pageSize;
  }
  return rows;
}

const MIN_Q_LEN = 60;
const MIN_E_LEN = 180;
const MIN_E_LINES = 3;

function scoreRow(row, templateCounts) {
  const question = L(row.question).trim();
  const explanation = L(row.explanation).trim();
  const qLen = question.length;
  const eLen = explanation.length;
  const eLines = explanation.split(/\n+/).filter(Boolean).length;
  const template = normalizeTemplate(question);
  const templateCount = templateCounts.get(template) || 1;

  let score = 0;
  if (qLen < MIN_Q_LEN) score += 2;
  if (eLen < MIN_E_LEN) score += 2;
  if (eLines < MIN_E_LINES) score += 1;
  if (isFormulaic(question)) score += 2;
  if (templateCount > 4) score += 2;

  return {
    score,
    qLen,
    eLen,
    eLines,
    template,
    templateCount,
  };
}

async function main() {
  const rows = await fetchAll();
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.subtopic || "unknown"}__${row.tier || "unknown"}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const report = [];
  const weakRows = [];

  for (const [key, list] of grouped.entries()) {
    const templateCounts = new Map();
    for (const row of list) {
      const template = normalizeTemplate(row.question);
      templateCounts.set(template, (templateCounts.get(template) || 0) + 1);
    }

    const scored = list
      .map((row) => {
        const metrics = scoreRow(row, templateCounts);
        return { row, ...metrics };
      })
      .sort((a, b) => b.score - a.score || a.qLen - b.qLen);

    const weak = scored.filter((r) => r.score >= 3);

    report.push({
      key,
      subtopic: list[0]?.subtopic || "unknown",
      tier: list[0]?.tier || "unknown",
      total: list.length,
      weakCount: weak.length,
      topTemplateCount: Math.max(...Array.from(templateCounts.values())),
    });

    for (const item of weak) {
      weakRows.push({
        id: item.row.id,
        subtopic: item.row.subtopic,
        tier: item.row.tier,
        question_type: item.row.question_type,
        score: item.score,
        qLen: item.qLen,
        eLen: item.eLen,
        eLines: item.eLines,
        templateCount: item.templateCount,
        question: item.row.question,
      });
    }
  }

  report.sort((a, b) => b.weakCount - a.weakCount || a.subtopic.localeCompare(b.subtopic));
  weakRows.sort((a, b) => b.score - a.score || a.qLen - b.qLen);

  const outDir = path.resolve(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "exam_questions_quality_report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, "exam_questions_quality_weak_rows.json"), JSON.stringify(weakRows, null, 2));

  console.log(`Audited ${rows.length} rows across ${grouped.size} subtopic+tier groups.`);
  console.log(`Weak rows flagged: ${weakRows.length}`);
  console.log(`Report saved to tmp/exam_questions_quality_report.json`);
  console.log(`Weak rows saved to tmp/exam_questions_quality_weak_rows.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
