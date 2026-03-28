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
const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const GENERIC_PATTERN = "Identify the key values and operation the question is asking for";
const PAGE_SIZE = 500;
const PATCH_CONCURRENCY = 25;

function compactQuestion(raw) {
  return String(raw ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function methodHint(question, questionType, subtopic) {
  const q = String(question ?? "").toLowerCase();
  const topic = `${String(questionType ?? "")} ${String(subtopic ?? "")}`.toLowerCase();
  if (q.includes("how many") || q.includes("number of")) {
    return "Count systematically and avoid missing or double-counting cases.";
  }
  if (q.includes("probability")) {
    return "Use probability = favorable outcomes / total outcomes, then simplify if needed.";
  }
  if (q.includes("%") || q.includes("percent") || q.includes("percentage")) {
    return "Convert the percentage to a multiplier or fraction and compute carefully.";
  }
  if (q.includes("ratio") || q.includes(":") || topic.includes("ratio")) {
    return "Set up the ratio relationship first, then simplify to the required form.";
  }
  if (q.includes("mean") || topic.includes("statistics")) {
    return "Use the definition (mean = total / number of values) and check the final form.";
  }
  if (q.includes("area") || q.includes("perimeter") || q.includes("volume") || topic.includes("geometry")) {
    return "Choose the correct formula, substitute the values, and simplify with units.";
  }
  if (q.includes("angle") || q.includes("bearing")) {
    return "Apply the relevant angle facts to form an equation, then solve it.";
  }
  if (q.includes("solve") || /\bx\b/.test(q) || topic.includes("algebra")) {
    return "Form the equation from the given information and isolate the unknown step by step.";
  }
  return "Use the given values, apply the correct method, and simplify to the requested format.";
}

function buildExplanation(row) {
  const question = compactQuestion(row.question);
  const promptSummary = question.length > 220 ? `${question.slice(0, 217).trim()}...` : question;
  const answer = String(row.correct_answer ?? "").trim();
  return [
    `Step 1: Identify the target and key values in the question: ${promptSummary}`,
    `Step 2: ${methodHint(question, row.question_type, row.subtopic)}`,
    `Final answer: ${answer}`,
  ].join("\n");
}

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

async function fetchCorruptedRows() {
  const out = [];
  let offset = 0;
  while (true) {
    const res = await supabaseFetch(
      `/rest/v1/exam_questions?select=id,question,correct_answer,explanation,question_type,subtopic&track=eq.11plus&explanation=like.*${encodeURIComponent(
        GENERIC_PATTERN,
      )}*&order=id.asc&offset=${offset}&limit=${PAGE_SIZE}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to fetch rows: ${res.status} ${body}`);
    }
    const batch = await res.json();
    if (!batch.length) break;
    out.push(...batch);
    offset += PAGE_SIZE;
  }
  return out;
}

async function patchRow(id, explanation) {
  const res = await supabaseFetch(`/rest/v1/exam_questions?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ explanation }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to patch id=${id}: ${res.status} ${body}`);
  }
}

async function main() {
  const rows = await fetchCorruptedRows();
  const report = {
    dry_run: DRY_RUN,
    scanned_corrupted_rows: rows.length,
    updated: 0,
    generated_at: new Date().toISOString(),
  };
  const preview = [];

  for (let i = 0; i < rows.length; i += PATCH_CONCURRENCY) {
    const chunk = rows.slice(i, i + PATCH_CONCURRENCY);
    const updates = chunk.map(async (row) => {
      const nextExplanation = buildExplanation(row);
      if (!nextExplanation || nextExplanation === String(row.explanation ?? "").trim()) return;
      if (!DRY_RUN) {
        await patchRow(row.id, nextExplanation);
      }
      report.updated += 1;
      if (preview.length < 25) {
        preview.push({
          id: row.id,
          question_preview: compactQuestion(row.question).slice(0, 120),
          explanation_preview: nextExplanation.slice(0, 180).replace(/\n/g, "\\n"),
        });
      }
    });
    await Promise.all(updates);
  }

  fs.mkdirSync(path.resolve(process.cwd(), "tmp"), { recursive: true });
  fs.writeFileSync(
    path.resolve(process.cwd(), "tmp", "11plus_generic_explanation_repair_report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), "tmp", "11plus_generic_explanation_repair_preview.json"),
    JSON.stringify(preview, null, 2),
    "utf8",
  );

  console.log(`Corrupted rows found: ${report.scanned_corrupted_rows}`);
  console.log(`${DRY_RUN ? "Would update" : "Updated"} rows: ${report.updated}`);
  console.log("Saved report: tmp/11plus_generic_explanation_repair_report.json");
  console.log("Saved preview: tmp/11plus_generic_explanation_repair_preview.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
