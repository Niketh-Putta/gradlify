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

const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_OPTIONS = 5;
const TRACK_ARG = process.argv.includes("--track")
  ? (process.argv[process.argv.indexOf("--track") + 1] ?? "").trim().toLowerCase()
  : null;

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
    const key = normKey(opt);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(String(opt).trim());
  }
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
  const cands = [
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

  return uniqueOptions(cands);
}

function generateTextDistractors(correct, question) {
  const c = String(correct ?? "").trim();
  const q = String(question ?? "").toLowerCase();
  const out = [];

  const tfSet = new Set(["true", "false"]);
  if (tfSet.has(c.toLowerCase())) {
    out.push(c.toLowerCase() === "true" ? "False" : "True");
  }

  if (/smallest|minimum|least/.test(q) && /\d/.test(c)) {
    const numeric = generateNumericDistractors(c);
    out.push(...numeric);
  }

  if (/largest|maximum|greatest/.test(q) && /\d/.test(c)) {
    const numeric = generateNumericDistractors(c);
    out.push(...numeric);
  }

  // Word-level plausible alternatives for common MCQ statements.
  const canonical = c.toLowerCase();
  if (canonical.includes("always")) out.push(c.replace(/always/i, "sometimes"));
  if (canonical.includes("sometimes")) out.push(c.replace(/sometimes/i, "always"));
  if (canonical.includes("increase")) out.push(c.replace(/increase/i, "decrease"));
  if (canonical.includes("decrease")) out.push(c.replace(/decrease/i, "increase"));
  if (canonical.includes("greater")) out.push(c.replace(/greater/i, "less"));
  if (canonical.includes("less")) out.push(c.replace(/less/i, "greater"));

  if (out.length < 6) {
    out.push("Cannot be determined");
    out.push("None of the above");
  }

  return uniqueOptions(out);
}

function fillToFive({ question, correctAnswer, wrongAnswers, allAnswers }) {
  const correct = String(correctAnswer ?? "").trim();
  if (!correct) return null;

  const existingWrong = parseArray(wrongAnswers);
  const existingAll = parseArray(allAnswers);
  const unique = uniqueOptions([correct, ...existingWrong, ...existingAll]);
  const withoutCorrect = unique.filter((o) => normKey(o) !== normKey(correct));

  if (withoutCorrect.length >= TARGET_OPTIONS - 1) {
    const normalizedWrong = withoutCorrect.slice(0, TARGET_OPTIONS - 1);
    const normalizedAll = uniqueOptions([correct, ...normalizedWrong]).slice(0, TARGET_OPTIONS);
    return {
      changed: normKey(JSON.stringify(normalizedWrong)) !== normKey(JSON.stringify(existingWrong)) ||
        normKey(JSON.stringify(normalizedAll)) !== normKey(JSON.stringify(existingAll)),
      wrong_answers: normalizedWrong,
      all_answers: normalizedAll,
    };
  }

  const generated = uniqueOptions([
    ...generateNumericDistractors(correct),
    ...generateTextDistractors(correct, question),
  ]).filter((o) => normKey(o) !== normKey(correct));

  const mergedWrong = uniqueOptions([...withoutCorrect, ...generated]).slice(0, TARGET_OPTIONS - 1);

  if (mergedWrong.length < TARGET_OPTIONS - 1) {
    // Last-resort deterministic fillers while preserving option style.
    const fallbacks = ["0", "1", "2", "3", "4", "5"];
    for (const f of fallbacks) {
      if (mergedWrong.length >= TARGET_OPTIONS - 1) break;
      if (normKey(f) === normKey(correct)) continue;
      if (!mergedWrong.some((o) => normKey(o) === normKey(f))) mergedWrong.push(f);
    }
  }

  const finalAll = uniqueOptions([correct, ...mergedWrong]).slice(0, TARGET_OPTIONS);
  return {
    changed: true,
    wrong_answers: mergedWrong,
    all_answers: finalAll,
  };
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
  const trackFilter = TRACK_ARG ? `&track=eq.${encodeURIComponent(TRACK_ARG)}` : "";
  while (true) {
    const to = from + size - 1;
    const res = await supabaseFetch(
      `/rest/v1/exam_questions?select=id,track,question,correct_answer,wrong_answers,all_answers,subtopic,question_type&order=id.asc&offset=${from}&limit=${size}${trackFilter}`,
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
  const candidates = [];
  for (const row of rows) {
    const correct = String(row.correct_answer ?? "").trim();
    if (!correct) continue;
    const wrong = parseArray(row.wrong_answers);
    const all = parseArray(row.all_answers);
    const uniq = uniqueOptions([correct, ...wrong, ...all]);
    if (uniq.length < TARGET_OPTIONS) candidates.push(row);
  }

  console.log(`Scanned ${rows.length} questions${TRACK_ARG ? ` on track=${TRACK_ARG}` : ""}`);
  console.log(`Found ${candidates.length} questions with fewer than ${TARGET_OPTIONS} options`);

  let updated = 0;
  const sample = [];

  for (const row of candidates) {
    const next = fillToFive({
      question: row.question,
      correctAnswer: row.correct_answer,
      wrongAnswers: row.wrong_answers,
      allAnswers: row.all_answers,
    });
    if (!next || !next.changed) continue;

    if (sample.length < 12) {
      sample.push({
        id: row.id,
        subtopic: row.subtopic,
        question_type: row.question_type,
        correct_answer: row.correct_answer,
        wrong_answers: next.wrong_answers,
        all_answers: next.all_answers,
      });
    }

    if (!DRY_RUN) {
      await patchQuestion(row.id, {
        wrong_answers: next.wrong_answers,
        all_answers: next.all_answers,
      });
    }
    updated += 1;
  }

  fs.mkdirSync(path.resolve(process.cwd(), "tmp"), { recursive: true });
  fs.writeFileSync(
    path.resolve(process.cwd(), "tmp", "missing_options_fill_preview.json"),
    JSON.stringify(sample, null, 2),
    "utf8"
  );

  console.log(`${DRY_RUN ? "Would update" : "Updated"} ${updated} questions`);
  console.log("Preview saved to tmp/missing_options_fill_preview.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
