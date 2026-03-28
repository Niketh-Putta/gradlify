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

const APPLY = process.argv.includes("--apply");
const REPAIR_EXPLANATIONS = process.argv.includes("--repair-explanations");
const DRY_RUN = !APPLY;
const TRACK_ARG = (() => {
  const idx = process.argv.indexOf("--track");
  if (idx === -1) return null;
  return String(process.argv[idx + 1] || "").trim().toLowerCase() || null;
})();
const TARGET_OPTIONS = 5;
const TARGET_WRONG = 4;

function parseArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // no-op
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const body = trimmed.slice(1, -1);
      if (!body) return [];
      const out = [];
      const regex = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
      let match;
      while ((match = regex.exec(body)) !== null) {
        const part = (match[1] ?? match[2] ?? "").trim();
        if (part) out.push(part.replace(/\\"/g, '"'));
      }
      return out;
    }
    return [trimmed];
  }
  return [];
}

function normKey(s) {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueOptions(options) {
  const out = [];
  const seen = new Set();
  for (const opt of options) {
    const text = String(opt ?? "").trim();
    if (!text) continue;
    const key = normKey(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function decodeEntities(text) {
  return String(text ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function normalizeTextArtifacts(text) {
  let out = decodeEntities(String(text ?? ""));
  out = out.replace(/\\?texttimes(?=[A-Za-z0-9])/gi, "\\times ");
  out = out.replace(/\\?texttimes\b/gi, "\\times");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function countDecimals(raw) {
  const match = String(raw).match(/\.(\d+)/);
  return match ? match[1].length : 0;
}

function parseNumericLike(text) {
  const t = String(text ?? "").trim();
  const frac = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    return {
      kind: "fraction",
      num: Number(frac[1]),
      den: Number(frac[2]),
      valid: Number(frac[2]) !== 0,
    };
  }

  const simple = t.match(/^([£$€]?)\s*(-?\d+(?:\.\d+)?)\s*(%?)$/);
  if (simple) {
    return {
      kind: "number",
      prefix: simple[1] || "",
      value: Number(simple[2]),
      suffix: simple[3] || "",
      decimals: countDecimals(simple[2]),
      valid: Number.isFinite(Number(simple[2])),
    };
  }

  const unit = t.match(/^([£$€]?)\s*(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:\^\d+|[²³])?)$/);
  if (unit) {
    return {
      kind: "number",
      prefix: unit[1] || "",
      value: Number(unit[2]),
      suffix: unit[3] || "",
      decimals: countDecimals(unit[2]),
      valid: Number.isFinite(Number(unit[2])),
    };
  }

  return { kind: "other", valid: false };
}

function formatNumber(value, decimals, prefix = "", suffix = "") {
  const rounded = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  return `${prefix}${rounded}${suffix}`.trim();
}

function generateNumericDistractors(correct) {
  const parsed = parseNumericLike(correct);
  if (!parsed.valid) return [];

  if (parsed.kind === "fraction") {
    const { num, den } = parsed;
    const candidates = [
      `${num + 1}/${den}`,
      `${num - 1}/${den}`,
      `${num}/${den + 1}`,
      den !== 1 ? `${num}/${den - 1}` : null,
      `${den}/${num === 0 ? 1 : num}`,
      `${num + 2}/${den}`,
    ].filter(Boolean);
    return uniqueOptions(candidates);
  }

  const step = parsed.decimals > 0 ? Math.pow(10, -parsed.decimals) : 1;
  const n = parsed.value;
  const candidates = [
    n - step,
    n + step,
    n - 2 * step,
    n + 2 * step,
    n - 1,
    n + 1,
    n * 10,
    n / 10,
    n + 5 * step,
    n - 5 * step,
  ]
    .filter((v) => Number.isFinite(v))
    .map((v) => formatNumber(v, parsed.decimals, parsed.prefix, parsed.suffix));
  return uniqueOptions(candidates);
}

function generateTextDistractors(correct, question) {
  const c = String(correct ?? "").trim();
  const q = String(question ?? "").toLowerCase();
  const out = [];
  const lower = c.toLowerCase();

  if (lower === "true") out.push("False");
  if (lower === "false") out.push("True");
  if (lower.includes("always")) out.push(c.replace(/always/i, "sometimes"));
  if (lower.includes("sometimes")) out.push(c.replace(/sometimes/i, "always"));
  if (lower.includes("increase")) out.push(c.replace(/increase/i, "decrease"));
  if (lower.includes("decrease")) out.push(c.replace(/decrease/i, "increase"));
  if (lower.includes("greater")) out.push(c.replace(/greater/i, "less"));
  if (lower.includes("less")) out.push(c.replace(/less/i, "greater"));

  if (/smallest|minimum|least|largest|maximum|greatest/.test(q) && /\d/.test(c)) {
    out.push(...generateNumericDistractors(c));
  }

  if (out.length < 6) {
    out.push("Cannot be determined");
    out.push("None of the above");
  }
  return uniqueOptions(out);
}

function normalizeOptions(row) {
  const correct = normalizeTextArtifacts(row.correct_answer || "");
  if (!correct) return null;

  const wrong = parseArray(row.wrong_answers).map(normalizeTextArtifacts);
  const all = parseArray(row.all_answers).map(normalizeTextArtifacts);
  const unique = uniqueOptions([correct, ...wrong, ...all]);
  const wrongWithoutCorrect = unique.filter((o) => normKey(o) !== normKey(correct));

  const generated = uniqueOptions([
    ...generateNumericDistractors(correct),
    ...generateTextDistractors(correct, row.question || ""),
  ]).filter((o) => normKey(o) !== normKey(correct));

  const mergedWrong = uniqueOptions([...wrongWithoutCorrect, ...generated]).slice(0, TARGET_WRONG);

  if (mergedWrong.length < TARGET_WRONG) {
    const fallbacks = ["0", "1", "2", "3", "4", "5"];
    for (const f of fallbacks) {
      if (mergedWrong.length >= TARGET_WRONG) break;
      if (normKey(f) === normKey(correct)) continue;
      if (!mergedWrong.some((o) => normKey(o) === normKey(f))) mergedWrong.push(f);
    }
  }

  const normalizedAll = uniqueOptions([correct, ...mergedWrong]).slice(0, TARGET_OPTIONS);
  return {
    correct_answer: correct,
    wrong_answers: mergedWrong,
    all_answers: normalizedAll,
  };
}

function needsExplanationRepair(explanation) {
  const e = String(explanation ?? "").trim();
  if (!e) return true;
  const lines = e.split(/\n+/).filter(Boolean);
  if (e.length < 45 || lines.length < 2) return true;
  if (/(^|\b)(todo|tbd|placeholder|coming soon|n\/a)(\b|$)/i.test(e)) return true;
  return false;
}

function buildExplanation(correctAnswer) {
  const answer = normalizeTextArtifacts(correctAnswer || "");
  return [
    "Step 1: Identify the key values and operation the question is asking for.",
    "Step 2: Apply the method carefully and simplify the result.",
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

async function fetchAllQuestions() {
  const out = [];
  const size = 1000;
  let from = 0;
  while (true) {
    const trackFilter = TRACK_ARG ? `&track=eq.${encodeURIComponent(TRACK_ARG)}` : "";
    const res = await supabaseFetch(
      `/rest/v1/exam_questions?select=id,track,question,correct_answer,wrong_answers,all_answers,explanation,subtopic,question_type&order=id.asc&offset=${from}&limit=${size}${trackFilter}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to fetch rows: ${res.status} ${body}`);
    }
    const batch = await res.json();
    if (!batch.length) break;
    out.push(...batch);
    from += size;
  }
  return out;
}

async function patchQuestion(id, payload) {
  const res = await supabaseFetch(`/rest/v1/exam_questions?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to patch id=${id}: ${res.status} ${body}`);
  }
}

async function main() {
  const rows = await fetchAllQuestions();
  const report = {
    scanned: rows.length,
    generation_text_issues: 0,
    option_issues: 0,
    explanation_issues: 0,
    updated_rows: 0,
  };
  const preview = [];

  for (const row of rows) {
    const payload = {};

    const questionNormalized = normalizeTextArtifacts(row.question || "");
    const hadQuestionArtifact = questionNormalized !== String(row.question || "").trim();
    if (hadQuestionArtifact) {
      payload.question = questionNormalized;
      report.generation_text_issues += 1;
    }

    const optionFix = normalizeOptions(row);
    if (!optionFix) continue;
    const oldCorrect = normalizeTextArtifacts(row.correct_answer || "");
    const oldWrong = parseArray(row.wrong_answers).map(normalizeTextArtifacts);
    const oldAll = parseArray(row.all_answers).map(normalizeTextArtifacts);
    const optionChanged =
      normKey(JSON.stringify(optionFix.wrong_answers)) !== normKey(JSON.stringify(oldWrong)) ||
      normKey(JSON.stringify(optionFix.all_answers)) !== normKey(JSON.stringify(oldAll)) ||
      normKey(optionFix.correct_answer) !== normKey(oldCorrect);

    if (optionChanged) {
      payload.correct_answer = optionFix.correct_answer;
      payload.wrong_answers = optionFix.wrong_answers;
      payload.all_answers = optionFix.all_answers;
      report.option_issues += 1;
    }

    const explanationRaw = String(row.explanation ?? "");
    const normalizedExplanation = normalizeTextArtifacts(explanationRaw);
    const explanationHasArtifact = /&(?:gt|lt|amp|quot|apos|nbsp);|texttimes/i.test(explanationRaw);
    if (REPAIR_EXPLANATIONS && needsExplanationRepair(explanationRaw)) {
      payload.explanation = buildExplanation(optionFix.correct_answer);
      report.explanation_issues += 1;
    } else if (explanationHasArtifact && normalizedExplanation !== explanationRaw.trim()) {
      payload.explanation = normalizedExplanation;
      report.explanation_issues += 1;
    }

    if (Object.keys(payload).length === 0) continue;
    if (!DRY_RUN) {
      await patchQuestion(row.id, payload);
    }
    report.updated_rows += 1;

    if (preview.length < 20) {
      preview.push({
        id: row.id,
        subtopic: row.subtopic,
        question_type: row.question_type,
        payload,
      });
    }
  }

  fs.mkdirSync(path.resolve(process.cwd(), "tmp"), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), "tmp", "question_bank_audit_fix_report.json"), JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(path.resolve(process.cwd(), "tmp", "question_bank_audit_fix_preview.json"), JSON.stringify(preview, null, 2), "utf8");

  console.log(`Scanned ${report.scanned} questions`);
  console.log(`Generation/text issues fixed: ${report.generation_text_issues}`);
  console.log(`Option issues fixed: ${report.option_issues}`);
  console.log(`Explanation issues fixed: ${report.explanation_issues}`);
  console.log(`${DRY_RUN ? "Would update" : "Updated"} ${report.updated_rows} rows`);
  if (!REPAIR_EXPLANATIONS) {
    console.log("Explanation rewrite is disabled unless you pass --repair-explanations.");
  }
  console.log("Saved report: tmp/question_bank_audit_fix_report.json");
  console.log("Saved preview: tmp/question_bank_audit_fix_preview.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
