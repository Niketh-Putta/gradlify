import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function areMathEquivalent(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
function uniqueMathAnswers(options) {
  const seen = new Set();
  const un = [];
  for (const opt of options) {
    if (!opt) continue;
    const key = opt.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      un.push(opt);
    }
  }
  return un;
}
function sanitizeAnswerSet(input) {
  return { correct: input.correct || "", options: input.options || [] };
}
const MAX_OPTIONS = 4;
function normalizeAnswerOptions(options, correct) {
  let unique = uniqueMathAnswers(options);
  if (!unique.some((option) => areMathEquivalent(option, correct))) {
    unique = uniqueMathAnswers([correct, ...unique]);
  }
  if (unique.length > MAX_OPTIONS) {
    const trimmed = unique
      .filter((option) => !areMathEquivalent(option, correct))
      .slice(0, MAX_OPTIONS - 1);
    unique = uniqueMathAnswers([correct, ...trimmed]);
  }
  return unique;
}

const envStr = fs.readFileSync(".env", "utf-8");
const env = {};
envStr.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const parseArray = (value) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const body = trimmed.slice(1, -1);
        if (!body) return [];
        const values = [];
        const regex = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
        let match;
        while ((match = regex.exec(body)) !== null) {
          const part = (match[1] ?? match[2] ?? "").trim();
          if (!part) continue;
          values.push(part.replace(/\\"/g, '"'));
        }
        return values;
      }
      return [];
    }
  }
  return [];
};

async function run() {
  const { data } = await supabase.from("exam_questions").select("*").eq("track", "11plus").limit(2);
  const q = data[0];
  console.log("Q:", q.id, q.correct_answer, q.wrong_answers);

  const correct = String(q?.correct_answer || "").trim();
  const wrong = parseArray(q?.wrong_answers).map((v) => String(v).trim()).filter(Boolean);
  const allProvided = parseArray(q?.all_answers);
  const initial = [correct, ...wrong, ...allProvided];
  const sanitized = sanitizeAnswerSet({
    options: initial,
    correct,
    questionType: q?.question_type,
    subtopic: q?.subtopic,
  });

  const distinctWrong = [];
  const tryAddWrong = (candidate) => {
    if (!candidate) return;
    if (areMathEquivalent(candidate, sanitized.correct)) return;
    if (distinctWrong.some((opt) => areMathEquivalent(opt, candidate))) return;
    distinctWrong.push(candidate);
  };
  for (const option of wrong) tryAddWrong(option);
  for (const option of allProvided) tryAddWrong(String(option).trim());
  for (const option of sanitized.options) tryAddWrong(String(option).trim());

  const seeded = [sanitized.correct, ...distinctWrong.slice(0, MAX_OPTIONS - 1)];
  const normalized = normalizeAnswerOptions(seeded, sanitized.correct);

  console.log("length:", normalized.length);
  console.log("options:", normalized);
}
run();
