import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BACKUP_DIR = path.resolve(ROOT, "backups", "11plus_questions_20260217_093238");
const EXAM_FILE = path.join(BACKUP_DIR, "exam_questions_11plus.json");
const EXTREME_FILE = path.join(BACKUP_DIR, "extreme_questions_11plus_challenge.json");

if (!fs.existsSync(EXAM_FILE) || !fs.existsSync(EXTREME_FILE)) {
  throw new Error("Missing 11+ backup files in backups/11plus_questions_20260217_093238");
}

const now = new Date();
const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const MIGRATION_NAME = `${stamp}_fix_11plus_question_rendering_and_answers.sql`;
const MIGRATION_PATH = path.resolve(ROOT, "supabase", "migrations", MIGRATION_NAME);

const examRows = JSON.parse(fs.readFileSync(EXAM_FILE, "utf8"));
const extremeRows = JSON.parse(fs.readFileSync(EXTREME_FILE, "utf8"));

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
  out = out
    .replace(/\/n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\?texttimes(?=[A-Za-z0-9])/gi, "\\times ")
    .replace(/\\?texttimes\b/gi, "\\times")
    .replace(/\\rightarrow|\\Rightarrow|Rightarrow|rightarrow|ightarrow/g, "->")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ");
  out = out
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
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

function parseArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
    } catch {
      return [value.trim()];
    }
  }
  return [];
}

function uniqueAnswers(values) {
  const out = [];
  const seen = new Set();
  for (const v of values) {
    const raw = String(v ?? "").trim();
    if (!raw) continue;
    const key = normalizeAnswer(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

function extractFinalAnswer(explanation) {
  const text = String(explanation ?? "");
  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    const m = line.match(/^(final|correct)\s*(answer|result)\s*:\s*(.+)$/i);
    if (m) return m[3].trim();
  }
  return null;
}

function numericValue(raw) {
  const s = String(raw ?? "").trim().replace(/,/g, "");
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return null;
}

function generateNumericDistractors(correct) {
  const n = numericValue(correct);
  if (n == null || !Number.isFinite(n)) return [];
  const isInt = Number.isInteger(n);
  const step = isInt ? 1 : 0.1;
  const out = [
    n + step,
    n - step,
    n + step * 2,
    n - step * 2,
    n + 1,
    n - 1,
    n * 10,
    n / 10,
  ]
    .filter((v) => Number.isFinite(v))
    .map((v) => (isInt ? String(Math.round(v)) : String(Number(v.toFixed(2)))));
  return uniqueAnswers(out);
}

function computeExpectedAnswer(question) {
  const q = String(question ?? "").trim();

  let m = q.match(/round(?:\s+the)?\s+number\s+(-?\d+(?:\.\d+)?)\s+to\s+(one|two|three|\d+)\s+decimal place/i);
  if (m) {
    const value = Number(m[1]);
    const digitsWord = m[2].toLowerCase();
    const digits =
      digitsWord === "one" ? 1 : digitsWord === "two" ? 2 : digitsWord === "three" ? 3 : Number(digitsWord);
    if (Number.isFinite(value) && Number.isInteger(digits)) {
      return { kind: "rounding", expected: value.toFixed(digits), confidence: "high" };
    }
  }

  m = q.match(/what is\s+(-?\d+(?:\.\d+)?)%\s+of\s+(-?\d+(?:\.\d+)?)/i);
  if (m) {
    const pct = Number(m[1]);
    const base = Number(m[2]);
    if (Number.isFinite(pct) && Number.isFinite(base)) {
      const val = (pct / 100) * base;
      const expected = Number.isInteger(val) ? String(val) : String(Number(val.toFixed(2)));
      return { kind: "percentage", expected, confidence: "high" };
    }
  }

  m = q.match(/product of three consecutive positive integers is\s+(\d+)\.\s*what is the sum/i);
  if (m) {
    const target = Number(m[1]);
    if (Number.isFinite(target)) {
      for (let n = 1; n <= 200; n += 1) {
        if (n * (n + 1) * (n + 2) === target) {
          return { kind: "consecutive_product", expected: String(n + (n + 1) + (n + 2)), confidence: "high" };
        }
      }
    }
  }

  return null;
}

function fixOptionSets(correct, wrongAnswers, allAnswers) {
  let correctClean = normalizeTextArtifacts(String(correct ?? "").trim());
  if (!correctClean) return { correct: correctClean, wrongAnswers, allAnswers };

  const wrongClean = uniqueAnswers(wrongAnswers.map((w) => normalizeTextArtifacts(w))).filter(
    (w) => normalizeAnswer(w) !== normalizeAnswer(correctClean),
  );
  const allWasNull = !allAnswers || allAnswers.length === 0;
  const allCleanInput = uniqueAnswers(allAnswers.map((a) => normalizeTextArtifacts(a)));

  const wrongLooksHealthy = wrongClean.length === 4;
  const allLooksHealthy =
    allWasNull ||
    (allCleanInput.length === 5 && allCleanInput.some((a) => normalizeAnswer(a) === normalizeAnswer(correctClean)));

  if (wrongLooksHealthy && allLooksHealthy) {
    return {
      correct: correctClean,
      wrongAnswers: wrongClean,
      allAnswers: allWasNull ? allAnswers : allCleanInput,
    };
  }

  let wrong = [...wrongClean];
  if (wrong.length < 4) {
    const pads = generateNumericDistractors(correctClean);
    for (const p of pads) {
      if (wrong.length >= 4) break;
      if (normalizeAnswer(p) === normalizeAnswer(correctClean)) continue;
      if (wrong.some((w) => normalizeAnswer(w) === normalizeAnswer(p))) continue;
      wrong.push(p);
    }
  }
  if (wrong.length < 4) {
    return { correct, wrongAnswers, allAnswers };
  }
  wrong = wrong.slice(0, 4);

  const all = allWasNull ? allAnswers : [correctClean, ...wrong];
  return { correct: correctClean, wrongAnswers: wrong, allAnswers: all };
}

function sqlEscape(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function sqlArray(values) {
  if (!values || values.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${values.map((v) => `'${sqlEscape(v)}'`).join(", ")}]::text[]`;
}

function auditAndFixRow(row, table) {
  const findings = [];
  const next = { ...row };

  const origQuestion = String(row.question ?? "");
  const origExplanation = String(row.explanation ?? "");
  const origCorrect = String(row.correct_answer ?? "");
  const origWrong = parseArray(row.wrong_answers);
  const origAll = parseArray(row.all_answers);

  next.question = origQuestion;
  next.explanation = origExplanation;
  next.correct_answer = origCorrect;

  const textBlob = `${origQuestion}\n${origExplanation}\n${origCorrect}`;
  const hasRenderingArtifact = /texttimes|\\texttimes|\/n|\\n|Rightarrow|ightarrow|<br|&nbsp;|&amp;/i.test(textBlob);
  if (hasRenderingArtifact) {
    next.question = normalizeTextArtifacts(origQuestion);
    next.explanation = normalizeTextArtifacts(origExplanation);
    next.correct_answer = normalizeTextArtifacts(origCorrect);
    findings.push("rendering_artifact");
  }

  if ((next.question.match(/\$/g) ?? []).length % 2 === 1) findings.push("unbalanced_dollar_question");
  if ((next.explanation.match(/\$/g) ?? []).length % 2 === 1) findings.push("unbalanced_dollar_explanation");

  if (/Try\s*\d{3,}\s*=/.test(next.explanation) && /consecutive/i.test(next.question)) {
    next.explanation = next.explanation.replace(/Try\s*(\d)(\d)(\d)\s*=/g, "Try $1 x $2 x $3 =");
    findings.push("fixed_compact_multiplication_rendering");
  }

  const beforeFinal = extractFinalAnswer(next.explanation);
  if (!beforeFinal) findings.push("missing_final_answer_line");
  if (beforeFinal && normalizeAnswer(beforeFinal) !== normalizeAnswer(next.correct_answer)) {
    findings.push("final_answer_mismatch");
  }
  if (hasRenderingArtifact) {
    next.explanation = next.explanation.replace(/^\s*Final\s+Result\s*:/gim, "Final answer:");
  }

  const fixedOptions = fixOptionSets(next.correct_answer, origWrong, origAll);
  next.correct_answer = fixedOptions.correct;
  next.wrong_answers = fixedOptions.wrongAnswers;
  next.all_answers = fixedOptions.allAnswers;
  if (next.wrong_answers.length !== 4) findings.push("wrong_answer_count_issue");
  if (next.all_answers.length !== 5) findings.push("all_answer_count_issue");

  const computed = computeExpectedAnswer(next.question);
  if (computed && computed.confidence === "high") {
    if (normalizeAnswer(computed.expected) !== normalizeAnswer(next.correct_answer)) {
      const expectedIsOption = next.all_answers.some((a) => normalizeAnswer(a) === normalizeAnswer(computed.expected));
      if (expectedIsOption) {
        const oldCorrect = next.correct_answer;
        next.correct_answer = computed.expected;
        next.wrong_answers = uniqueAnswers(
          [oldCorrect, ...next.all_answers.filter((a) => normalizeAnswer(a) !== normalizeAnswer(computed.expected))]
            .filter((a) => normalizeAnswer(a) !== normalizeAnswer(computed.expected)),
        ).slice(0, 4);
        next.all_answers = [next.correct_answer, ...next.wrong_answers];
        findings.push(`math_corrected_${computed.kind}`);
      } else {
        findings.push(`math_suspect_${computed.kind}`);
      }
    }
  }

  const changed =
    next.question !== origQuestion ||
    next.explanation !== origExplanation ||
    next.correct_answer !== origCorrect ||
    JSON.stringify(next.wrong_answers) !== JSON.stringify(origWrong) ||
    JSON.stringify(next.all_answers) !== JSON.stringify(origAll);

  return { table, id: row.id, changed, findings, row: next, original: row };
}

function buildUpdateSql(change) {
  const sets = [];
  if (change.row.question !== change.original.question) sets.push(`question = '${sqlEscape(change.row.question)}'`);
  if (change.row.explanation !== change.original.explanation) sets.push(`explanation = '${sqlEscape(change.row.explanation)}'`);
  if (change.row.correct_answer !== change.original.correct_answer) {
    sets.push(`correct_answer = '${sqlEscape(change.row.correct_answer)}'`);
  }
  if (JSON.stringify(change.row.wrong_answers) !== JSON.stringify(parseArray(change.original.wrong_answers))) {
    sets.push(`wrong_answers = ${sqlArray(change.row.wrong_answers)}`);
  }
  if (JSON.stringify(change.row.all_answers) !== JSON.stringify(parseArray(change.original.all_answers))) {
    sets.push(`all_answers = ${sqlArray(change.row.all_answers)}`);
  }
  if (!sets.length) return null;
  return `UPDATE public.${change.table}\nSET ${sets.join(",\n    ")}\nWHERE id = '${sqlEscape(change.id)}';`;
}

const allChanges = [];
for (const row of examRows) {
  allChanges.push(auditAndFixRow(row, "exam_questions"));
}
for (const row of extremeRows) {
  allChanges.push(auditAndFixRow(row, "extreme_questions"));
}

const changedRows = allChanges.filter((r) => r.changed);
const issueCounts = {};
for (const c of allChanges) {
  for (const f of c.findings) {
    issueCounts[f] = (issueCounts[f] || 0) + 1;
  }
}

const report = {
  generated_at: now.toISOString(),
  scanned: {
    exam_questions: examRows.length,
    extreme_questions: extremeRows.length,
    total: examRows.length + extremeRows.length,
  },
  changed_rows: changedRows.length,
  issue_counts: issueCounts,
  changed_by_table: {
    exam_questions: changedRows.filter((r) => r.table === "exam_questions").length,
    extreme_questions: changedRows.filter((r) => r.table === "extreme_questions").length,
  },
  sample_changes: changedRows.slice(0, 40).map((r) => ({
    table: r.table,
    id: r.id,
    findings: r.findings,
    old_correct: r.original.correct_answer,
    new_correct: r.row.correct_answer,
    question: String(r.row.question).slice(0, 180),
  })),
};

const manualReviewTags = new Set([
  "missing_final_answer_line",
  "final_answer_mismatch",
  "math_suspect_percentage",
  "math_suspect_rounding",
  "math_suspect_consecutive_product",
]);
const manualReview = allChanges
  .filter((r) => r.findings.some((f) => manualReviewTags.has(f)))
  .map((r) => ({
    table: r.table,
    id: r.id,
    findings: r.findings.filter((f) => manualReviewTags.has(f)),
    correct_answer: r.original.correct_answer,
    question: String(r.original.question ?? "").slice(0, 220),
  }));
report.manual_review_count = manualReview.length;

fs.mkdirSync(path.resolve(ROOT, "tmp"), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, "tmp", "11plus_full_audit_report.json"), JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(path.resolve(ROOT, "tmp", "11plus_manual_review_questions.json"), JSON.stringify(manualReview, null, 2), "utf8");

const sqlStatements = changedRows.map(buildUpdateSql).filter(Boolean);
const migrationSql = [
  "-- Auto-generated by scripts/audit-fix-11plus-question-bank.mjs",
  "-- Scope: 11+ question rendering + answer integrity fixes.",
  "",
  "BEGIN;",
  "",
  ...sqlStatements,
  "",
  "COMMIT;",
  "",
].join("\n");

fs.writeFileSync(MIGRATION_PATH, migrationSql, "utf8");

console.log(`Scanned rows: ${report.scanned.total}`);
console.log(`Rows changed: ${changedRows.length}`);
console.log(`Migration written: supabase/migrations/${MIGRATION_NAME}`);
console.log("Report written: tmp/11plus_full_audit_report.json");
console.log("Manual review list: tmp/11plus_manual_review_questions.json");
