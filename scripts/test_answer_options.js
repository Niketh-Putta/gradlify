function areMathEquivalent(a, b) {
  // Simplistic for test
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

const row = {
  correct_answer: "17,000",
  wrong_answers: [ "16,536", "16,034", "17,253" ],
  all_answers: null
};

const correct = String(row?.correct_answer || "").trim();
const wrong = (row.wrong_answers || []).map((v) => String(v).trim()).filter(Boolean);
const allProvided = [];
const initial = [correct, ...wrong, ...allProvided];
const sanitized = sanitizeAnswerSet({
  options: initial,
  correct,
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
console.log("data:", normalized);

