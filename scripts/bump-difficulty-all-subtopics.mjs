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

const L = (...lines) => lines.join("\n");

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

function normalizeText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function parseNumberLike(answer) {
  const raw = normalizeText(answer);
  if (!raw) return null;

  const unitMatch = raw.match(
    /^(.*?)(\s*(?:%|°|cm\^2|cm2|m\^2|m2|mm\^2|mm2|km\^2|km2|cm|mm|m|km|g|kg|ml|l|s|min|h|km\/h|m\/s))$/i
  );
  const valuePart = unitMatch ? unitMatch[1] : raw;
  const unitPart = unitMatch ? unitMatch[2] : "";

  const cleaned = valuePart.replace(/,/g, "").replace(/[^\d.+-/]/g, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "+" || cleaned === "-") return null;

  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    if (parts.length === 2) {
      const num = Number(parts[0]);
      const den = Number(parts[1]);
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return { num: num / den, unit: unitPart, raw };
      }
    }
    return null;
  }

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return { num, unit: unitPart, raw };
}

function formatNumberLike(info, value) {
  const unit = info.unit || "";
  const hasDecimal = /\d\.\d/.test(info.raw);
  const decimals = hasDecimal ? Math.min(3, info.raw.split(".")[1]?.length ?? 2) : 0;
  const rounded = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  return `${rounded}${unit}`.trim();
}

function distractors(info, value) {
  const opts = [
    value * 0.9,
    value * 1.1,
    value + 2,
    value - 2,
  ];
  const out = [];
  for (const v of opts) {
    if (!Number.isFinite(v)) continue;
    const txt = formatNumberLike(info, v);
    if (txt && !out.includes(txt)) out.push(txt);
    if (out.length >= 3) break;
  }
  while (out.length < 3) {
    out.push(formatNumberLike(info, value + out.length + 1));
  }
  return out.slice(0, 3);
}

function selectCandidate(rows) {
  const scored = rows
    .map((row) => {
      const qLen = normalizeText(row.question).length;
      const eLen = normalizeText(row.explanation).length;
      const score = (qLen < 70 ? 2 : 0) + (eLen < 180 ? 2 : 0);
      return { row, score, qLen, eLen };
    })
    .sort((a, b) => b.score - a.score || a.qLen - b.qLen);
  return scored.map((s) => s.row);
}

function buildUpgrade(row) {
  const subtopic = row.subtopic || "";
  const topicKey = subtopic.split("|")[0];
  const question = String(row.question ?? "").trim();
  const answerInfo = parseNumberLike(row.correct_answer);
  if (!answerInfo) return null;

  const lower = question.toLowerCase();
  let newQuestion = question;
  let newAnswer = answerInfo.num;
  let explanation = [];

  const unit = answerInfo.unit || "";

  if (topicKey === "algebra") {
    newQuestion = L(question, "Then find the value of 2x + 3 using your solution.");
    newAnswer = 2 * answerInfo.num + 3;
    explanation = [
      "Key insight: solve for x first, then substitute into the expression.",
      `Step 1: Solve the original equation/statement to get x = ${formatNumberLike(answerInfo, answerInfo.num)}.`,
      "Step 2: Substitute into 2x + 3.",
      `Final answer: ${formatNumberLike(answerInfo, newAnswer)}`,
    ];
  } else if (topicKey === "number") {
    if (subtopic.includes("percent") || lower.includes("%")) {
      newQuestion = L(question, "Then find 15% of your answer.");
      newAnswer = answerInfo.num * 0.15;
      explanation = [
        "Key insight: use the original result, then apply the percentage.",
        "Step 1: Use your first answer.",
        "Step 2: Multiply by 0.15 to find 15%.",
        `Final answer: ${formatNumberLike(answerInfo, newAnswer)}`,
      ];
    } else {
      newQuestion = L(question, "Then find 3 times your answer minus 4.");
      newAnswer = 3 * answerInfo.num - 4;
      explanation = [
        "Key insight: complete the first calculation before applying the final transformation.",
        "Step 1: Use your original answer.",
        "Step 2: Compute 3a - 4.",
        `Final answer: ${formatNumberLike(answerInfo, newAnswer)}`,
      ];
    }
  } else if (topicKey === "ratio") {
    newQuestion = L(question, "Then share your answer in the ratio 2 : 3 and give the larger share.");
    newAnswer = (answerInfo.num * 3) / 5;
    explanation = [
      "Key insight: convert your answer into parts before sharing.",
      "Step 1: Total parts = 5, so one part = a ÷ 5.",
      "Step 2: Larger share = 3 parts = 3a/5.",
      `Final answer: ${formatNumberLike(answerInfo, newAnswer)}`,
    ];
  } else if (topicKey === "probability") {
    newQuestion = L(question, "Then find the expected number of successes in 60 trials.");
    newAnswer = answerInfo.num * 60;
    explanation = [
      "Key insight: expected number = n × probability.",
      "Step 1: Use your probability as p.",
      "Step 2: Multiply by 60 to get the expected number.",
      `Final answer: ${formatNumberLike({ ...answerInfo, unit: "" }, newAnswer)}`,
    ];
  } else if (topicKey === "statistics") {
    newQuestion = L(question, "Then find the total for 20 values using your result.");
    newAnswer = answerInfo.num * 20;
    explanation = [
      "Key insight: total = mean × number of values (if your result is the mean).",
      "Step 1: Use your result as the mean.",
      "Step 2: Multiply by 20.",
      `Final answer: ${formatNumberLike({ ...answerInfo, unit: "" }, newAnswer)}`,
    ];
  } else if (topicKey === "geometry") {
    if (unit.includes("°") || lower.includes("angle")) {
      newQuestion = L(question, "Then find the exterior angle on a straight line.");
      newAnswer = 180 - answerInfo.num;
      explanation = [
        "Key insight: angles on a straight line sum to 180°.",
        "Step 1: Use your original angle.",
        "Step 2: Subtract from 180° to get the exterior angle.",
        `Final answer: ${formatNumberLike({ ...answerInfo, unit: "°" }, newAnswer)}`,
      ];
    } else if (unit.includes("cm^2") || unit.includes("m^2") || unit.includes("mm^2")) {
      newQuestion = L(question, "The cost is £3 per square unit. Find the total cost.");
      newAnswer = answerInfo.num * 3;
      explanation = [
        "Key insight: multiply the area by the cost rate.",
        "Step 1: Use your area from the first part.",
        "Step 2: Multiply by £3 per square unit.",
        `Final answer: £${newAnswer.toFixed(2).replace(/\.00$/, "")}`,
      ];
      return {
        question: newQuestion,
        correct: `£${newAnswer.toFixed(2).replace(/\.00$/, "")}`,
        wrong: [`£${(newAnswer * 0.9).toFixed(2).replace(/\.00$/, "")}`, `£${(newAnswer * 1.1).toFixed(2).replace(/\.00$/, "")}`, `£${(newAnswer + 5).toFixed(2).replace(/\.00$/, "")}`],
        explanation: explanation.join("\n"),
      };
    } else if (unit) {
      newQuestion = L(question, "Then find the total length of 3 such lengths.");
      newAnswer = answerInfo.num * 3;
      explanation = [
        "Key insight: use your first answer, then scale it.",
        "Step 1: Use your original length.",
        "Step 2: Multiply by 3.",
        `Final answer: ${formatNumberLike(answerInfo, newAnswer)}`,
      ];
    } else {
      newQuestion = L(question, "Then find 2 times your answer plus 5.");
      newAnswer = 2 * answerInfo.num + 5;
      explanation = [
        "Key insight: complete the first part, then apply the final step.",
        "Step 1: Use your original answer.",
        "Step 2: Compute 2a + 5.",
        `Final answer: ${formatNumberLike(answerInfo, newAnswer)}`,
      ];
    }
  } else {
    newQuestion = L(question, "Then find 2 times your answer plus 5.");
    newAnswer = 2 * answerInfo.num + 5;
    explanation = [
      "Key insight: complete the first part, then apply the final step.",
      "Step 1: Use your original answer.",
      "Step 2: Compute 2a + 5.",
      `Final answer: ${formatNumberLike(answerInfo, newAnswer)}`,
    ];
  }

  return {
    question: newQuestion,
    correct: formatNumberLike({ ...answerInfo, unit }, newAnswer),
    wrong: distractors({ ...answerInfo, unit }, newAnswer),
    explanation: explanation.join("\n"),
  };
}

async function fetchAll() {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const res = await supabaseFetch(
      `/rest/v1/exam_questions?select=id,question,correct_answer,wrong_answers,all_answers,explanation,subtopic,tier,question_type,calculator,difficulty,marks,estimated_time_sec,image_url,image_alt&offset=${from}&limit=${pageSize}`,
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

async function main() {
  const rows = await fetchAll();
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.subtopic}__${row.tier}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const updates = [];

  for (const [key, list] of groups.entries()) {
    const candidates = selectCandidate(list);
    let updated = false;
    for (const row of candidates) {
      if (row.image_url) continue;
      const upgrade = buildUpgrade(row);
      if (!upgrade) continue;

      const payload = {
        question: upgrade.question,
        correct_answer: upgrade.correct,
        wrong_answers: upgrade.wrong,
        all_answers: [upgrade.correct, ...upgrade.wrong],
        explanation: upgrade.explanation,
        question_type: row.question_type,
        subtopic: row.subtopic,
        tier: row.tier,
        calculator: row.calculator,
        difficulty: row.difficulty,
        marks: row.marks,
        estimated_time_sec: row.estimated_time_sec,
        image_url: null,
        image_alt: null,
      };

      const updateRes = await supabaseFetch(`/rest/v1/exam_questions?id=eq.${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });

      if (!updateRes.ok) {
        const text = await updateRes.text().catch(() => "");
        throw new Error(`Update failed for ${row.id}: ${updateRes.status} ${text}`);
      }

      updates.push({
        id: row.id,
        subtopic: row.subtopic,
        tier: row.tier,
        old_question: row.question,
        new_question: upgrade.question,
      });
      updated = true;
      break;
    }
    if (!updated) {
      console.warn(`No numeric candidate found for ${key}`);
    }
  }

  const outDir = path.resolve(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "exam_questions_global_difficulty_log.json"), JSON.stringify(updates, null, 2));

  console.log(`Updated ${updates.length} questions across ${groups.size} subsets.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
