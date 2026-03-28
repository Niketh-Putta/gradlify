import fs from "node:fs";
import path from "node:path";

function parseDotEnv(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = parseDotEnv(path.resolve(process.cwd(), ".env"));
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

function normalizeAnswer(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\\times/g, "x")
    .replace(/[×✕]/g, "x")
    .replace(/−/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function cleanExtractedAnswer(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\*+|\*+$/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
}

function extractFinalAnswer(explanation) {
  const text = String(explanation ?? "");
  if (!text.trim()) return null;

  const directMatches = [];
  const directRegex = /(final|correct)\s*answer\s*:\s*([^\n]+)/gi;
  let match;
  while ((match = directRegex.exec(text)) !== null) {
    directMatches.push(cleanExtractedAnswer(match[2]));
  }
  if (directMatches.length > 0) return directMatches[directMatches.length - 1] || null;

  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (/^(final|correct)\s*answer\s*:?\s*$/i.test(line)) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const candidate = lines[j].trim();
        if (!candidate) continue;
        return cleanExtractedAnswer(candidate);
      }
    }
  }
  return null;
}

function ensureFinalAnswerLine(explanation, correctAnswer) {
  const correct = String(correctAnswer ?? "").trim();
  if (!correct) return String(explanation ?? "").trim();

  const rawLines = String(explanation ?? "").replace(/\r/g, "").split("\n");
  const kept = [];
  let skipNextLikelyAnswerLine = false;

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (skipNextLikelyAnswerLine) {
      if (trimmed && !/^step\s*\d+\s*:/i.test(trimmed)) {
        skipNextLikelyAnswerLine = false;
        continue;
      }
      skipNextLikelyAnswerLine = false;
    }

    const markerMatch = trimmed.match(/^(final|correct)\s*answer\s*:\s*(.*)$/i);
    if (markerMatch) {
      if (!markerMatch[2].trim()) skipNextLikelyAnswerLine = true;
      continue;
    }

    if (/^(final|correct)\s*answer\s*:?\s*$/i.test(trimmed)) {
      skipNextLikelyAnswerLine = true;
      continue;
    }

    if (/^(final|correct)$/i.test(trimmed) || /^answer\s*:?\s*$/i.test(trimmed)) {
      skipNextLikelyAnswerLine = true;
      continue;
    }

    kept.push(line);
  }

  while (kept.length > 0 && !kept[kept.length - 1].trim()) kept.pop();
  if (kept.length > 0) kept.push("");
  kept.push(`Final answer: ${correct}`);
  return kept.join("\n").trim();
}

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

async function fetchAllRows(table) {
  const rows = [];
  const limit = 1000;
  let offset = 0;
  while (true) {
    const res = await supabaseFetch(
      `/rest/v1/${table}?select=id,track,question,correct_answer,explanation&track=eq.11plus&order=id.asc&offset=${offset}&limit=${limit}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to fetch ${table}: ${res.status} ${body}`);
    }
    const batch = await res.json();
    if (!batch.length) break;
    rows.push(...batch);
    offset += limit;
  }
  return rows;
}

async function patchRow(table, id, payload) {
  const res = await supabaseFetch(`/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to patch ${table} id=${id}: ${res.status} ${body}`);
  }
}

async function auditAndFixTable(table) {
  const rows = await fetchAllRows(table);
  const stats = {
    table,
    scanned: rows.length,
    missing_correct_answer: 0,
    missing_final_answer: 0,
    mismatch: 0,
    updated: 0,
  };
  const preview = [];

  for (const row of rows) {
    const correct = String(row.correct_answer ?? "").trim();
    if (!correct) {
      stats.missing_correct_answer += 1;
      continue;
    }

    const extracted = extractFinalAnswer(row.explanation);
    const hasFinalAnswer = !!(extracted && extracted.trim());
    const matches = hasFinalAnswer && normalizeAnswer(extracted) === normalizeAnswer(correct);

    if (!hasFinalAnswer) stats.missing_final_answer += 1;
    if (hasFinalAnswer && !matches) stats.mismatch += 1;

    if (matches) continue;

    const repairedExplanation = ensureFinalAnswerLine(row.explanation, correct);
    if (repairedExplanation === String(row.explanation ?? "").trim()) continue;

    if (!DRY_RUN) {
      await patchRow(table, row.id, { explanation: repairedExplanation });
    }
    stats.updated += 1;

    if (preview.length < 25) {
      preview.push({
        id: row.id,
        question: String(row.question ?? "").slice(0, 160),
        correct_answer: correct,
        extracted_final_answer: extracted,
      });
    }
  }

  return { stats, preview };
}

async function main() {
  const exam = await auditAndFixTable("exam_questions");
  const extreme = await auditAndFixTable("extreme_questions");
  const report = {
    dry_run: DRY_RUN,
    generated_at: new Date().toISOString(),
    tables: [exam.stats, extreme.stats],
    totals: {
      scanned: exam.stats.scanned + extreme.stats.scanned,
      missing_correct_answer: exam.stats.missing_correct_answer + extreme.stats.missing_correct_answer,
      missing_final_answer: exam.stats.missing_final_answer + extreme.stats.missing_final_answer,
      mismatch: exam.stats.mismatch + extreme.stats.mismatch,
      updated: exam.stats.updated + extreme.stats.updated,
    },
  };

  fs.mkdirSync(path.resolve(process.cwd(), "tmp"), { recursive: true });
  fs.writeFileSync(
    path.resolve(process.cwd(), "tmp", "11plus_explanation_answer_consistency_report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), "tmp", "11plus_explanation_answer_consistency_preview.json"),
    JSON.stringify({ exam_questions: exam.preview, extreme_questions: extreme.preview }, null, 2),
    "utf8"
  );

  for (const tableStats of report.tables) {
    console.log(`Table: ${tableStats.table}`);
    console.log(`  Scanned: ${tableStats.scanned}`);
    console.log(`  Missing final answer: ${tableStats.missing_final_answer}`);
    console.log(`  Mismatch final answer: ${tableStats.mismatch}`);
    console.log(`  ${DRY_RUN ? "Would update" : "Updated"}: ${tableStats.updated}`);
  }
  console.log(`Total scanned: ${report.totals.scanned}`);
  console.log(`${DRY_RUN ? "Would update" : "Updated"} total: ${report.totals.updated}`);
  console.log("Saved report: tmp/11plus_explanation_answer_consistency_report.json");
  console.log("Saved preview: tmp/11plus_explanation_answer_consistency_preview.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
