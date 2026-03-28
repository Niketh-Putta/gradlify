import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const manualPath = path.resolve(ROOT, "tmp", "11plus_manual_review_questions.json");
const examPath = path.resolve(ROOT, "backups", "11plus_questions_20260217_093238", "exam_questions_11plus.json");
const extremePath = path.resolve(ROOT, "backups", "11plus_questions_20260217_093238", "extreme_questions_11plus_challenge.json");

const manual = JSON.parse(fs.readFileSync(manualPath, "utf8"));
const exam = JSON.parse(fs.readFileSync(examPath, "utf8"));
const extreme = JSON.parse(fs.readFileSync(extremePath, "utf8"));

const backupById = new Map();
for (const row of [...exam, ...extreme]) backupById.set(row.id, row);

const corrections = {
  "37641c08-c2b3-4802-84c0-7aa1c446e4b9": { correct_answer: "-2" },
  "7140de1e-8e79-4329-a365-cc29194eab6d": { correct_answer: "1:4" },
  "6fb59d71-60a7-4981-b9c5-0a15e967fa2e": { correct_answer: "960" },
  "c056f6c6-9a4e-4156-a7da-c7dcc81d86c5": { correct_answer: "2" },
  "820a5907-a81e-4200-970a-7c1e9ca2ae35": { correct_answer: "3" },
  "1feca809-4ec8-451a-80c6-aa53abe63281": { correct_answer: "-1" },
  "47dfba3b-b257-497c-960a-4d1f38ff5fc0": { correct_answer: "Any of these" },
  "78f0655f-2103-4e46-9528-45be4f6a042e": { correct_answer: "6" },
  "303594cc-f7f2-4b3c-97f5-5977bf5bde63": { correct_answer: "3:2" },
  "0168c17d-3271-42ad-b7d2-55b2b143dce0": { correct_answer: "Cannot be determined" },
  "a25bd1d0-a747-4669-8f20-3cccfd71af46": { correct_answer: "6.5" },
  "c6665ff2-2e24-4a39-b472-24a6445c9eae": { correct_answer: "16" },
  "0e5bd838-dd8e-48f7-ac98-14c97c3cf450": { correct_answer: "23" },
  "a65fbbdc-e384-45bb-bf32-73d368702ea1": { correct_answer: "5:9" },
  "88aef219-92a9-4a96-a83c-cc72b9dfd7f7": { correct_answer: "12" },
  "ed1eeff5-236c-4afc-9b5c-d2e58e8400d3": { correct_answer: "Square" },
  "0ed3a814-6135-4062-8ac7-7d78a1ba0200": { correct_answer: "28" },
  "6299e21d-98aa-4338-99a0-bb95c2b48096": {
    question:
      "Three friends share 28 stickers. Ben gets double what Sam gets. Tom gets half of what Sam gets. How many stickers does Sam get?",
    correct_answer: "8",
  },
  "cbe8f6ee-1ad8-433b-a6cb-d36a1ab1f73e": { correct_answer: "8:10am" },
  "9eceb9a1-a064-4601-afa0-abe31a26b1c3": { correct_answer: "5kg bag by 15p" },
  "40368425-dc6a-4190-9662-bc7352a4f927": { correct_answer: "90" },
  "6ed2e766-1566-4f4c-b192-8d0f4fa67649": { correct_answer: "Saturday" },
  "5e6a708f-b474-4605-9458-1229533f9282": {
    question:
      "The mean of three numbers is 10. The mean of their squares is 102 2/3. If two of the numbers are 8 and 12, what is the third number?",
    correct_answer: "10",
  },
};

const explanationOverrides = {
  "37641c08-c2b3-4802-84c0-7aa1c446e4b9":
    "Step 1: Compute inside-out: 3 - 4 = -1.\nStep 2: Then 2 - (-1) = 3.\nStep 3: Finally 1 - 3 = -2.\nFinal answer: -2",
  "6fb59d71-60a7-4981-b9c5-0a15e967fa2e":
    "Step 1: Ratio parts total = 3 + 4 + 5 = 12, so one part = 96 / 12 = 8.\nStep 2: Smallest = 3 x 8 = 24 and largest = 5 x 8 = 40.\nStep 3: Product = 24 x 40 = 960.\nFinal answer: 960",
  "c6665ff2-2e24-4a39-b472-24a6445c9eae":
    "Step 1: Diagonal vector is (4,4), so diagonal squared is 4^2 + 4^2 = 32.\nStep 2: For a square, area = diagonal^2 / 2.\nStep 3: Area = 32 / 2 = 16.\nFinal answer: 16",
  "0e5bd838-dd8e-48f7-ac98-14c97c3cf450":
    "Step 1: First term = 5.\nStep 2: Apply \"double and subtract 3\": second term = 2*5 - 3 = 7, third term = 2*7 - 3 = 11.\nStep 3: Sum = 5 + 7 + 11 = 23.\nFinal answer: 23",
  "a65fbbdc-e384-45bb-bf32-73d368702ea1":
    "Step 1: If B has 36 at ratio 5:6, one part = 6, so A = 30.\nStep 2: After A spends 10, A has 20 and B still has 36.\nStep 3: New ratio = 20:36 = 5:9.\nFinal answer: 5:9",
  "88aef219-92a9-4a96-a83c-cc72b9dfd7f7":
    "Step 1: In 4 years, total age is 40, so current total is 32.\nStep 2: Ratio 3:5 means 8 parts = 32, so one part = 4.\nStep 3: Younger age = 3 x 4 = 12.\nFinal answer: 12",
  "0ed3a814-6135-4062-8ac7-7d78a1ba0200":
    "Step 1: Strikes occur at 10:30, 11:00, 11:30, 12:00, 12:30, 1:00, 1:30.\nStep 2: Total strikes = 1 + 11 + 1 + 12 + 1 + 1 + 1 = 28.\nFinal answer: 28",
  "cbe8f6ee-1ad8-433b-a6cb-d36a1ab1f73e":
    "Step 1: Real elapsed time is 22 hours (from 12:00pm to 10:00am next day).\nStep 2: The clock loses 5 minutes each true hour, so total loss = 22 x 5 = 110 minutes = 1 hour 50 minutes.\nStep 3: Shown time = true time - loss = 10:00am - 1:50 = 8:10am.\nFinal answer: 8:10am",
  "9eceb9a1-a064-4601-afa0-abe31a26b1c3":
    "Step 1: Unit prices: 2kg bag = 3.50/2 = 1.75 per kg; 5kg bag = 8.00/5 = 1.60 per kg.\nStep 2: Difference = 1.75 - 1.60 = 0.15 per kg.\nFinal answer: 5kg bag by 15p",
  "40368425-dc6a-4190-9662-bc7352a4f927":
    "Step 1: A has a 30-minute head start at 40 mph, so lead = 20 miles.\nStep 2: Without any stop, B would need 20/20 = 1 hour of moving time to catch up (relative speed 20 mph).\nStep 3: B stops for 10 minutes during the chase, and in that interval A adds 40*(10/60) = 6 2/3 miles, adding 20 extra moving minutes.\nStep 4: Total time after B starts = 60 + 10 + 20 = 90 minutes.\nFinal answer: 90",
  "6ed2e766-1566-4f4c-b192-8d0f4fa67649":
    "Step 1: Day gap from 100th to 300th is 200 days.\nStep 2: 200 mod 7 = 4, so move 4 weekdays forward from Tuesday.\nStep 3: Tuesday -> Saturday.\nFinal answer: Saturday",
};

const keepCurrentAnswerButSyncExplanation = new Set([
  "9bfb4498-c654-4c26-8ba5-2b7253ffe394",
  "c4e28fe3-bd14-427d-b299-c5f4caafd85f",
  "eecf1c3f-0851-4fcb-8d9f-935dfd054882",
  "06d2f73f-46c9-43f2-b395-8df7b66e0846",
]);

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

function sqlEscape(v) {
  return String(v ?? "").replace(/'/g, "''");
}

function sqlArray(items) {
  return `ARRAY[${items.map((x) => `'${sqlEscape(x)}'`).join(", ")}]::text[]`;
}

function uniq(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const t = String(item ?? "").trim();
    if (!t) continue;
    const k = norm(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function genericExplanation(question, answer) {
  return [
    "Step 1: Use the given values and apply the required operation from the question.",
    "Step 2: Simplify and check units/format.",
    `Final answer: ${String(answer ?? "").trim()}`,
  ].join("\n");
}

const updates = [];
for (const item of manual) {
  const base = backupById.get(item.id);
  if (!base) continue;
  const fix = corrections[item.id] ?? {};
  const nextQuestion = fix.question ?? base.question;
  const nextCorrect = String(fix.correct_answer ?? base.correct_answer).trim();
  let wrong = Array.isArray(base.wrong_answers) ? [...base.wrong_answers] : [];
  let all = Array.isArray(base.all_answers) ? [...base.all_answers] : [];

  const answerChanged = norm(nextCorrect) !== norm(base.correct_answer);
  if (answerChanged || all.length === 0) {
    const pool = uniq([...(all ?? []), ...wrong, base.correct_answer]);
    const nextWrong = uniq(pool.filter((x) => norm(x) !== norm(nextCorrect))).slice(0, 4);
    if (nextWrong.length < 4) {
      nextWrong.push(...["Cannot be determined", "None of these", "Insufficient information", "Not possible"].filter((x) => norm(x) !== norm(nextCorrect)));
    }
    wrong = uniq(nextWrong).slice(0, 4);
  }
  wrong = uniq(wrong.filter((x) => norm(x) !== norm(nextCorrect)));
  if (wrong.length < 4) {
    wrong.push(...["Cannot be determined", "None of these", "Insufficient information", "Not possible"].filter((x) => norm(x) !== norm(nextCorrect)));
  }
  wrong = uniq(wrong).slice(0, 4);
  all = [nextCorrect, ...wrong];

  const needsExplanationSync =
    item.findings.includes("missing_final_answer_line") ||
    item.findings.includes("final_answer_mismatch") ||
    answerChanged ||
    keepCurrentAnswerButSyncExplanation.has(item.id);

  let nextExplanation = base.explanation;
  if (needsExplanationSync) {
    nextExplanation = explanationOverrides[item.id] ?? genericExplanation(nextQuestion, nextCorrect);
  }

  updates.push({
    table: item.table,
    id: item.id,
    question: nextQuestion,
    correct_answer: nextCorrect,
    wrong_answers: wrong,
    all_answers: all,
    explanation: nextExplanation,
  });
}

const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const migrationName = `${stamp}_manual_fix_remaining_11plus_questions.sql`;
const migrationPath = path.resolve(ROOT, "supabase", "migrations", migrationName);

const sql = [];
sql.push("-- Auto-generated manual correction pass for flagged 11+ rows.");
sql.push("BEGIN;");
for (const u of updates) {
  sql.push(
    `UPDATE public.${u.table}
SET question = '${sqlEscape(u.question)}',
    correct_answer = '${sqlEscape(u.correct_answer)}',
    wrong_answers = ${sqlArray(u.wrong_answers)},
    all_answers = ${sqlArray(u.all_answers)},
    explanation = '${sqlEscape(u.explanation)}'
WHERE id = '${sqlEscape(u.id)}';`,
  );
}
sql.push("COMMIT;");
sql.push("");

fs.writeFileSync(migrationPath, sql.join("\n"), "utf8");
console.log(`Wrote migration: supabase/migrations/${migrationName}`);
console.log(`Rows targeted: ${updates.length}`);
