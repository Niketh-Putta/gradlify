/*
Replace ALL rows in public.extreme_questions with GCSE-only, multi-step (hard) questions.
Adds a small set of custom image-backed questions stored in the questions bucket.

Run:
  node scripts/replace-extreme-questions-gcse-multistep.mjs
*/

import fs from "node:fs";
import path from "node:path";

function parseDotEnv(envPath) {
  const out = {};
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    out[key] = value;
  });
  return out;
}

const env = parseDotEnv(path.resolve(process.cwd(), ".env"));
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const IMAGE_PREFIX = "generated/batch_extreme_gcse_multistep_20260128";

const L = (...lines) => lines.join("\n");

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

async function uploadSvg(objectPath, svgText) {
  const res = await supabaseFetch(`/storage/v1/object/questions/${objectPath}`, {
    method: "PUT",
    headers: {
      "Content-Type": "image/svg+xml",
      "x-upsert": "true",
    },
    body: svgText,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${objectPath}): ${res.status} ${text}`);
  }
}

async function getCount(table) {
  const endpoint = `/rest/v1/${table}?select=id`;
  const res = await supabaseFetch(endpoint, { method: "HEAD", headers: { Prefer: "count=exact" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Count failed: ${res.status} ${text}`);
  }
  const range = res.headers.get("content-range") || "";
  const match = range.match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function deleteAllExtreme() {
  const res = await supabaseFetch("/rest/v1/extreme_questions?id=not.is.null", {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Delete failed: ${res.status} ${text}`);
  }
}

async function fetchExamCandidates({ difficulty }) {
  const endpoint =
    `/rest/v1/exam_questions?select=` +
    [
      "id",
      "question",
      "correct_answer",
      "wrong_answers",
      "all_answers",
      "image_url",
      "image_alt",
      "explanation",
      "explain_on",
      "question_type",
      "subtopic",
      "tier",
      "calculator",
      "difficulty",
    ].join(",") +
    `&difficulty=eq.${difficulty}&image_url=is.null&limit=1200`;

  const res = await supabaseFetch(endpoint, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch exam candidates: ${res.status} ${text}`);
  }
  return res.json();
}

const BANNED_KEYWORDS = [
  "mod",
  "congruent",
  "euler",
  "totient",
  "phi(",
  "fermat",
  "crt",
  "chinese remainder",
  "order of",
  "binary string",
  "derangement",
  "induction",
  "complex",
  "matrix",
  "log",
  "ln",
  "differentiate",
  "derivative",
  "integral",
  "vector proof",
  "proof by",
  "distance between points",
  "find the distance between",
  "equation of the circle",
  "probability the number is prime",
  "solve for real x",
  "find the remainder when",
];

function looksNonGcse(text) {
  const hay = text.toLowerCase();
  return BANNED_KEYWORDS.some((kw) => hay.includes(kw));
}

function cleanHcfLcm(text) {
  return text
    .replace(/\bgcd\b/gi, "HCF")
    .replace(/\blcm\b/gi, "LCM")
    .replace(/HCF\(([^)]+)\)/gi, "HCF of $1")
    .replace(/LCM\(([^)]+)\)/gi, "LCM of $1");
}

function normalizeText(text) {
  const cleaned = cleanHcfLcm(String(text || "").trim());
  return cleaned.replace(/\s+/g, " ").replace(/\s+\n/g, "\n").trim();
}

function hasPlaceholderAnswers(row) {
  const answers = Array.isArray(row.all_answers) ? row.all_answers : [];
  return answers.some((a) => String(a).toLowerCase().includes("different answer"));
}

function summarizeQuestion(question) {
  const raw = normalizeText(question).replace(/\n+/g, " ").trim();
  if (!raw) return "use the given information.";
  const short = raw.length > 140 ? `${raw.slice(0, 137)}...` : raw;
  return short;
}

function expandExplanation(question, explanation, correct) {
  const clean = normalizeText(explanation).replace(/\n+/g, " ").trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const step2 = sentences[0]
    ? `Identify the key method and formula: ${sentences[0]}`
    : "Identify the key method and formula using GCSE techniques, and define any variables you introduce.";
  const step3 = sentences[1]
    ? `Apply the method carefully with the given values: ${sentences[1]}`
    : "Apply the method carefully, substitute the known values, and keep your working clear.";
  const step4 = sentences[2]
    ? `Simplify step by step: ${sentences[2]}`
    : "Simplify the algebra or arithmetic step by step to reach a single value.";
  const step5 = sentences[3]
    ? `Check your result against the conditions: ${sentences[3]}`
    : "Check your result against the conditions to confirm it is valid.";
  const step6 = "State the answer clearly, with units or exact form if required.";

  return L(
    `Step 1: From the question, ${summarizeQuestion(question)} Identify what is known and what must be found.`,
    `Step 2: ${step2}`,
    `Step 3: ${step3}`,
    `Step 4: ${step4}`,
    `Step 5: ${step5}`,
    `Step 6: ${step6}`,
    `Final answer: ${correct}`
  );
}

function makeRow({ question, correct, wrong, explanation, image, imageAlt }) {
  const wrongAnswers = [...wrong];
  const allAnswers = [correct, ...wrongAnswers];
  return {
    question,
    correct_answer: correct,
    wrong_answers: wrongAnswers,
    all_answers: allAnswers,
    explanation,
    explain_on: "always",
    image_url: image || null,
    image_alt: image ? imageAlt || "" : null,
  };
}

const SVG_ASSETS = {
  circle_chord: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <circle cx="320" cy="210" r="150" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="210" y1="280" x2="430" y2="280" stroke="#2563eb" stroke-width="3"/>
  <line x1="320" y1="210" x2="320" y2="280" stroke="#111827" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="210" cy="280" r="4" fill="#111827"/>
  <circle cx="430" cy="280" r="4" fill="#111827"/>
  <text x="330" y="250" font-family="Arial" font-size="14" fill="#374151">6</text>
  <text x="300" y="305" font-family="Arial" font-size="14" fill="#2563eb">18</text>
  <text x="335" y="205" font-family="Arial" font-size="14" fill="#374151">O</text>
  </svg>`,
  triangle_median: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polyline points="160,320 320,120 520,320 160,320" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="320" y1="120" x2="400" y2="320" stroke="#2563eb" stroke-width="3"/>
  <circle cx="400" cy="320" r="4" fill="#111827"/>
  <text x="140" y="335" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="300" y="115" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="528" y="335" font-family="Arial" font-size="14" fill="#374151">C</text>
  <text x="360" y="220" font-family="Arial" font-size="14" fill="#2563eb">m</text>
  </svg>`,
  right_triangle: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polyline points="180,320 180,140 460,320 180,320" fill="none" stroke="#111827" stroke-width="3"/>
  <rect x="180" y="300" width="20" height="20" fill="none" stroke="#111827" stroke-width="2"/>
  <text x="150" y="235" font-family="Arial" font-size="14" fill="#374151">9</text>
  <text x="300" y="345" font-family="Arial" font-size="14" fill="#374151">12</text>
  <text x="320" y="210" font-family="Arial" font-size="14" fill="#374151">15</text>
  </svg>`,
  parallel_lines: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <line x1="120" y1="140" x2="520" y2="140" stroke="#111827" stroke-width="3"/>
  <line x1="120" y1="300" x2="520" y2="300" stroke="#111827" stroke-width="3"/>
  <line x1="180" y1="100" x2="420" y2="340" stroke="#2563eb" stroke-width="3"/>
  <text x="130" y="125" font-family="Arial" font-size="14" fill="#374151">l</text>
  <text x="130" y="320" font-family="Arial" font-size="14" fill="#374151">m</text>
  <text x="420" y="360" font-family="Arial" font-size="14" fill="#2563eb">t</text>
  </svg>`,
  circle_tangent: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <circle cx="320" cy="220" r="120" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="440" y1="220" x2="560" y2="220" stroke="#2563eb" stroke-width="3"/>
  <line x1="320" y1="220" x2="440" y2="220" stroke="#111827" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="320" y="205" font-family="Arial" font-size="14" fill="#374151">O</text>
  <text x="520" y="205" font-family="Arial" font-size="14" fill="#2563eb">tangent</text>
  </svg>`,
  trapezium: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polygon points="180,300 460,300 400,140 240,140" fill="none" stroke="#111827" stroke-width="3"/>
  <text x="260" y="130" font-family="Arial" font-size="14" fill="#374151">8 cm</text>
  <text x="300" y="320" font-family="Arial" font-size="14" fill="#374151">14 cm</text>
  <text x="470" y="270" font-family="Arial" font-size="14" fill="#374151">5 cm</text>
  </svg>`,
  similar_triangles: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polyline points="160,320 320,120 520,320 160,320" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="220" y1="250" x2="460" y2="250" stroke="#2563eb" stroke-width="3"/>
  <text x="140" y="335" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="310" y="110" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="530" y="335" font-family="Arial" font-size="14" fill="#374151">C</text>
  <text x="200" y="245" font-family="Arial" font-size="14" fill="#2563eb">D</text>
  <text x="470" y="245" font-family="Arial" font-size="14" fill="#2563eb">E</text>
  <text x="240" y="200" font-family="Arial" font-size="14" fill="#374151">AD = 6</text>
  <text x="390" y="200" font-family="Arial" font-size="14" fill="#374151">AE = 9</text>
  <text x="330" y="330" font-family="Arial" font-size="14" fill="#374151">AC = 15</text>
  </svg>`,
  circle_intersect: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <circle cx="320" cy="210" r="140" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="180" y1="210" x2="500" y2="210" stroke="#2563eb" stroke-width="3"/>
  <circle cx="260" cy="210" r="4" fill="#111827"/>
  <circle cx="440" cy="210" r="4" fill="#111827"/>
  <text x="250" y="195" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="448" y="195" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="300" y="235" font-family="Arial" font-size="14" fill="#2563eb">AB = 12</text>
  <text x="330" y="210" font-family="Arial" font-size="14" fill="#374151">O</text>
  </svg>`,
  bearings: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <line x1="320" y1="80" x2="320" y2="340" stroke="#111827" stroke-width="2"/>
  <line x1="200" y1="300" x2="480" y2="160" stroke="#2563eb" stroke-width="3"/>
  <circle cx="320" cy="300" r="5" fill="#111827"/>
  <circle cx="480" cy="160" r="5" fill="#111827"/>
  <text x="330" y="295" font-family="Arial" font-size="14" fill="#374151">P</text>
  <text x="490" y="160" font-family="Arial" font-size="14" fill="#374151">Q</text>
  <text x="330" y="110" font-family="Arial" font-size="14" fill="#374151">N</text>
  <path d="M320 300 A70 70 0 0 1 380 260" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="360" y="255" font-family="Arial" font-size="14" fill="#6b7280">50°</text>
  </svg>`,
  right_triangle_altitude: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polyline points="180,320 180,120 520,320 180,320" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="180" y1="320" x2="267" y2="171" stroke="#2563eb" stroke-width="3"/>
  <line x1="180" y1="120" x2="520" y2="320" stroke="#111827" stroke-width="3"/>
  <rect x="180" y="300" width="20" height="20" fill="none" stroke="#111827" stroke-width="2"/>
  <rect x="260" y="165" width="14" height="14" fill="none" stroke="#6b7280" stroke-width="2"/>
  <circle cx="180" cy="320" r="4" fill="#111827"/>
  <circle cx="180" cy="120" r="4" fill="#111827"/>
  <circle cx="520" cy="320" r="4" fill="#111827"/>
  <circle cx="267" cy="171" r="4" fill="#111827"/>
  <text x="160" y="340" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="160" y="110" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="530" y="335" font-family="Arial" font-size="14" fill="#374151">C</text>
  <text x="275" y="165" font-family="Arial" font-size="14" fill="#374151">D</text>
  <text x="230" y="160" font-family="Arial" font-size="14" fill="#2563eb">9</text>
  <text x="390" y="250" font-family="Arial" font-size="14" fill="#2563eb">16</text>
  </svg>`,
  triangle_parallel_area: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polyline points="180,330 320,120 520,330 180,330" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="240" y1="255" x2="460" y2="255" stroke="#2563eb" stroke-width="3"/>
  <circle cx="180" cy="330" r="4" fill="#111827"/>
  <circle cx="320" cy="120" r="4" fill="#111827"/>
  <circle cx="520" cy="330" r="4" fill="#111827"/>
  <circle cx="240" cy="255" r="4" fill="#111827"/>
  <circle cx="460" cy="255" r="4" fill="#111827"/>
  <text x="165" y="350" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="310" y="110" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="530" y="350" font-family="Arial" font-size="14" fill="#374151">C</text>
  <text x="220" y="245" font-family="Arial" font-size="14" fill="#374151">D</text>
  <text x="470" y="245" font-family="Arial" font-size="14" fill="#374151">E</text>
  <text x="205" y="300" font-family="Arial" font-size="14" fill="#2563eb">4</text>
  <text x="200" y="340" font-family="Arial" font-size="14" fill="#2563eb">6</text>
  <text x="360" y="180" font-family="Arial" font-size="14" fill="#2563eb">6</text>
  <text x="430" y="240" font-family="Arial" font-size="14" fill="#2563eb">9</text>
  </svg>`,
  cyclic_isosceles: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <circle cx="320" cy="210" r="150" fill="none" stroke="#111827" stroke-width="3"/>
  <polyline points="190,210 320,80 450,210 320,340 190,210" fill="none" stroke="#2563eb" stroke-width="3"/>
  <line x1="190" y1="210" x2="450" y2="210" stroke="#111827" stroke-width="2"/>
  <text x="178" y="210" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="315" y="70" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="458" y="210" font-family="Arial" font-size="14" fill="#374151">C</text>
  <text x="315" y="360" font-family="Arial" font-size="14" fill="#374151">D</text>
  <path d="M320 330 A40 40 0 0 1 350 300" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="350" y="315" font-family="Arial" font-size="14" fill="#6b7280">120°</text>
  <text x="300" y="230" font-family="Arial" font-size="14" fill="#6b7280">AB = BC</text>
  </svg>`,
  quarter_circle_segment: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <path d="M200 320 A160 160 0 0 1 360 160" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="200" y1="320" x2="360" y2="320" stroke="#111827" stroke-width="3"/>
  <line x1="200" y1="320" x2="200" y2="160" stroke="#111827" stroke-width="3"/>
  <line x1="200" y1="160" x2="360" y2="320" stroke="#2563eb" stroke-width="3"/>
  <rect x="200" y="300" width="20" height="20" fill="none" stroke="#111827" stroke-width="2"/>
  <circle cx="200" cy="320" r="4" fill="#111827"/>
  <circle cx="200" cy="160" r="4" fill="#111827"/>
  <circle cx="360" cy="320" r="4" fill="#111827"/>
  <text x="190" y="345" font-family="Arial" font-size="14" fill="#374151">O</text>
  <text x="185" y="150" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="370" y="330" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="240" y="330" font-family="Arial" font-size="14" fill="#2563eb">12 cm</text>
  <text x="225" y="240" font-family="Arial" font-size="14" fill="#6b7280">90°</text>
  </svg>`,
};

const CUSTOM_QUESTIONS = [
  makeRow({
    question: L(
      "A circle has a chord of length 18 cm.",
      "The perpendicular distance from the centre to the chord is 6 cm.",
      "Find the radius of the circle. Give your answer in exact form."
    ),
    correct: "√117 cm",
    wrong: ["10 cm", "11 cm", "12 cm"],
    image: `${IMAGE_PREFIX}/circle_chord.svg`,
    imageAlt: "Circle with a chord of length 18 cm and distance 6 cm from the centre.",
    explanation: L(
      "Step 1: The perpendicular from the centre bisects the chord, so half the chord is 9 cm.",
      "Step 2: Join the centre to one endpoint of the chord to form a right triangle.",
      "Step 3: Apply Pythagoras: r^2 = 6^2 + 9^2 = 36 + 81 = 117.",
      "Step 4: Keep the exact value, r = √117 cm.",
      "Final answer: √117 cm"
    ),
  }),
  makeRow({
    question: L(
      "Triangle ABC has side lengths 5 cm, 6 cm, and 7 cm.",
      "Find the length of the median to the side of length 7 cm.",
      "Give your answer in surd form."
    ),
    correct: "√73/2 cm",
    wrong: ["√61/2 cm", "√85/2 cm", "√73 cm"],
    image: `${IMAGE_PREFIX}/triangle_median.svg`,
    imageAlt: "Triangle with a median drawn to the side of length 7 cm.",
    explanation: L(
      "Step 1: Use the median formula for side a: m = 1/2√(2b^2 + 2c^2 − a^2).",
      "Step 2: Substitute a = 7, b = 5, c = 6 into the formula.",
      "Step 3: m = 1/2√(2·25 + 2·36 − 49) = 1/2√(50 + 72 − 49).",
      "Step 4: m = 1/2√73.",
      "Final answer: √73/2 cm"
    ),
  }),
  makeRow({
    question: L(
      "A right-angled triangle has legs 9 cm and 12 cm.",
      "Find the length of the altitude from the right angle to the hypotenuse.",
      "Give your answer as an exact fraction."
    ),
    correct: "36/5 cm",
    wrong: ["12/5 cm", "24/5 cm", "48/5 cm"],
    image: `${IMAGE_PREFIX}/right_triangle.svg`,
    imageAlt: "Right triangle with legs 9 cm and 12 cm.",
    explanation: L(
      "Step 1: First find the hypotenuse using Pythagoras: √(9^2 + 12^2) = 15 cm.",
      "Step 2: Area using legs: (1/2)·9·12 = 54 cm^2.",
      "Step 3: Area using hypotenuse and altitude h: (1/2)·15·h.",
      "Step 4: Set 54 = 7.5h, so h = 54/7.5 = 36/5 cm.",
      "Final answer: 36/5 cm"
    ),
  }),
  makeRow({
    question: L(
      "Two parallel lines are cut by a transversal.",
      "The alternate angle is 38°.",
      "Find the corresponding angle on the other line.",
      "State the reason for any equal angles you use."
    ),
    correct: "38°",
    wrong: ["52°", "142°", "180°"],
    image: `${IMAGE_PREFIX}/parallel_lines.svg`,
    imageAlt: "Two parallel lines cut by a transversal.",
    explanation: L(
      "Step 1: Identify the lines are parallel and a transversal crosses them.",
      "Step 2: Alternate angles are equal when lines are parallel.",
      "Step 3: Corresponding angles are also equal to the alternate angle.",
      "Step 4: So the corresponding angle is 38°.",
      "Final answer: 38°"
    ),
  }),
  makeRow({
    question: L(
      "A tangent touches a circle at point T.",
      "The radius OT is 7 cm.",
      "Find the length of the perpendicular from the centre to the tangent.",
      "Explain the angle fact used."
    ),
    correct: "7 cm",
    wrong: ["3.5 cm", "14 cm", "21 cm"],
    image: `${IMAGE_PREFIX}/circle_tangent.svg`,
    imageAlt: "Circle with a tangent at point T and radius OT.",
    explanation: L(
      "Step 1: A tangent is perpendicular to the radius at the point of contact.",
      "Step 2: The shortest distance from the centre to the tangent is the radius itself.",
      "Step 3: Therefore the perpendicular length equals OT = 7 cm.",
      "Final answer: 7 cm"
    ),
  }),
  makeRow({
    question: L(
      "A trapezium has parallel sides 8 cm and 14 cm, and height 5 cm.",
      "Find its area.",
      "Give your answer with units."
    ),
    correct: "55 cm^2",
    wrong: ["45 cm^2", "60 cm^2", "70 cm^2"],
    image: `${IMAGE_PREFIX}/trapezium.svg`,
    imageAlt: "Trapezium with bases 8 cm and 14 cm, height 5 cm.",
    explanation: L(
      "Step 1: Use the trapezium area formula: A = 1/2(a + b)h.",
      "Step 2: Substitute a = 8, b = 14, h = 5.",
      "Step 3: A = 1/2(22)·5 = 11·5 = 55 cm^2.",
      "Final answer: 55 cm^2"
    ),
  }),
  makeRow({
    question: L(
      "Two numbers add to 48 and have a product of 432.",
      "Find the two numbers.",
      "Show the quadratic you form."
    ),
    correct: "24 and 18",
    wrong: ["12 and 36", "20 and 28", "16 and 32"],
    explanation: L(
      "Step 1: Let the numbers be x and y, so x + y = 48 and xy = 432.",
      "Step 2: Substitute y = 48 − x into xy = 432 to get x(48 − x) = 432.",
      "Step 3: This gives x^2 − 48x + 432 = 0.",
      "Step 4: Factor: (x − 24)(x − 18) = 0, so x = 24 or x = 18.",
      "Step 5: The pair is 24 and 18.",
      "Final answer: 24 and 18"
    ),
  }),
  makeRow({
    question: L(
      "The ratio of ages of A to B is 3:5.",
      "In 6 years' time, the ratio will be 4:5.",
      "Find A's current age.",
      "Use algebra to show your steps."
    ),
    correct: "18",
    wrong: ["12", "15", "20"],
    explanation: L(
      "Step 1: Let A = 3k and B = 5k.",
      "Step 2: In 6 years, the ratio is (3k + 6):(5k + 6) = 4:5.",
      "Step 3: So 5(3k + 6) = 4(5k + 6).",
      "Step 4: 15k + 30 = 20k + 24, so 6 = 5k and k = 6/5.",
      "Step 5: A = 3k = 18.",
      "Final answer: 18"
    ),
  }),
  makeRow({
    question: L(
      "Two numbers differ by 6.",
      "The sum of their squares is 180.",
      "Find the two numbers.",
      "Give the positive solution pair."
    ),
    correct: "12 and 6",
    wrong: ["10 and 4", "14 and 8", "9 and 3"],
    explanation: L(
      "Step 1: Let the numbers be x and x − 6.",
      "Step 2: The sum of squares is x^2 + (x − 6)^2 = 180.",
      "Step 3: Expand: x^2 + x^2 − 12x + 36 = 180, so 2x^2 − 12x − 144 = 0.",
      "Step 4: Divide by 2: x^2 − 6x − 72 = 0.",
      "Step 5: Factor: (x − 12)(x + 6) = 0.",
      "Step 6: So x = 12 or x = −6. The positive pair is 12 and 6.",
      "Final answer: 12 and 6"
    ),
  }),
  makeRow({
    question: L(
      "A rectangle has perimeter 50 cm and area 144 cm^2.",
      "Find its side lengths.",
      "Use a quadratic equation."
    ),
    correct: "16 cm and 9 cm",
    wrong: ["18 cm and 7 cm", "12 cm and 13 cm", "20 cm and 5 cm"],
    explanation: L(
      "Step 1: Let the sides be x and y. Then 2(x + y) = 50, so x + y = 25.",
      "Step 2: The area gives xy = 144.",
      "Step 3: Substitute y = 25 − x into xy = 144: x(25 − x) = 144.",
      "Step 4: This gives x^2 − 25x + 144 = 0.",
      "Step 5: Factor: (x − 16)(x − 9) = 0.",
      "Step 6: So the sides are 16 cm and 9 cm.",
      "Final answer: 16 cm and 9 cm"
    ),
  }),
  makeRow({
    question: L(
      "In triangle ABC, DE is parallel to BC.",
      "AD = 6 cm, AE = 9 cm, and AC = 15 cm.",
      "Find the length of DE if BC = 20 cm."
    ),
    correct: "12 cm",
    wrong: ["10 cm", "13 cm", "15 cm"],
    image: `${IMAGE_PREFIX}/similar_triangles.svg`,
    imageAlt: "Triangle with DE parallel to BC and given lengths on sides.",
    explanation: L(
      "Step 1: Because DE is parallel to BC, triangles ADE and ABC are similar.",
      "Step 2: The scale factor is AD/AB or AE/AC. Use AE/AC = 9/15 = 3/5.",
      "Step 3: Corresponding sides give DE/BC = 3/5.",
      "Step 4: So DE = (3/5) × 20 = 12 cm.",
      "Final answer: 12 cm"
    ),
  }),
  makeRow({
    question: L(
      "Chord AB of a circle is 12 cm long and passes through the centre O.",
      "The radius of the circle is 10 cm.",
      "Find the distance from the centre to the chord."
    ),
    correct: "8 cm",
    wrong: ["6 cm", "7 cm", "9 cm"],
    image: `${IMAGE_PREFIX}/circle_intersect.svg`,
    imageAlt: "Circle with chord AB passing near the centre and length 12 cm.",
    explanation: L(
      "Step 1: The perpendicular from the centre to the chord bisects the chord.",
      "Step 2: Half the chord is 6 cm.",
      "Step 3: Use Pythagoras in the right triangle with radius 10 cm and half-chord 6 cm.",
      "Step 4: Distance = √(10^2 − 6^2) = √(100 − 36) = √64 = 8 cm.",
      "Final answer: 8 cm"
    ),
  }),
  makeRow({
    question: L(
      "From point P, Q is 5 km away on a bearing of 050°.",
      "From Q, P is 5 km away on a bearing of 230°.",
      "Find the angle between the line PQ and the north line at P."
    ),
    correct: "50°",
    wrong: ["40°", "130°", "230°"],
    image: `${IMAGE_PREFIX}/bearings.svg`,
    imageAlt: "Bearing diagram from point P to Q with north line and angle marked 50°.",
    explanation: L(
      "Step 1: Bearings are measured clockwise from north.",
      "Step 2: A bearing of 050° means the line PQ makes a 50° angle with north at P.",
      "Step 3: The reverse bearing from Q to P is 230°, consistent with 50° + 180°.",
      "Step 4: Therefore the required angle at P is 50°.",
      "Final answer: 50°"
    ),
  }),
  makeRow({
    question: L(
      "A circle has radius 9 cm.",
      "A chord is 14 cm long.",
      "Find the perpendicular distance from the centre to the chord."
    ),
    correct: "√(81 − 49) cm",
    wrong: ["√(81 − 36) cm", "√(81 − 25) cm", "√(81 − 64) cm"],
    image: `${IMAGE_PREFIX}/circle_chord.svg`,
    imageAlt: "Circle with chord length shown and perpendicular from centre.",
    explanation: L(
      "Step 1: The perpendicular from the centre bisects the chord, so half the chord is 7 cm.",
      "Step 2: Form a right triangle with hypotenuse 9 cm and one leg 7 cm.",
      "Step 3: Use Pythagoras: distance^2 = 9^2 − 7^2.",
      "Step 4: So distance = √(81 − 49) cm.",
      "Final answer: √(81 − 49) cm"
    ),
  }),
  makeRow({
    question: L(
      "In right-angled triangle ABC, the right angle is at A.",
      "The altitude from A meets the hypotenuse BC at D.",
      "BD = 9 cm and DC = 16 cm.",
      "Find the length of AB."
    ),
    correct: "15 cm",
    wrong: ["12 cm", "18 cm", "20 cm"],
    image: `${IMAGE_PREFIX}/right_triangle_altitude.svg`,
    imageAlt: "Right triangle with altitude to the hypotenuse, showing BD = 9 and DC = 16.",
    explanation: L(
      "Step 1: The hypotenuse length is BC = BD + DC = 9 + 16 = 25 cm.",
      "Step 2: Triangles ABD and ABC are similar (they share angle at B and are both right-angled).",
      "Step 3: Match corresponding sides: AB/BC = BD/AB.",
      "Step 4: This gives AB^2 = BD × BC = 9 × 25 = 225.",
      "Step 5: So AB = √225 = 15 cm.",
      "Final answer: 15 cm"
    ),
  }),
  makeRow({
    question: L(
      "In triangle ABC, D is on AB and E is on AC.",
      "AD = 4 cm, DB = 6 cm, AE = 6 cm, EC = 9 cm.",
      "DE is parallel to BC and the area of triangle ABC is 150 cm^2.",
      "Find the area of trapezium BDEC."
    ),
    correct: "126 cm^2",
    wrong: ["120 cm^2", "124 cm^2", "130 cm^2"],
    image: `${IMAGE_PREFIX}/triangle_parallel_area.svg`,
    imageAlt: "Triangle with a line segment parallel to the base, creating a smaller similar triangle.",
    explanation: L(
      "Step 1: AB = AD + DB = 4 + 6 = 10 cm and AC = AE + EC = 6 + 9 = 15 cm.",
      "Step 2: Because DE is parallel to BC, triangles ADE and ABC are similar.",
      "Step 3: The scale factor (small to large) is AD/AB = 4/10 = 2/5.",
      "Step 4: Areas scale by the square of the factor, so area(ADE) = (2/5)^2 × 150 = 4/25 × 150 = 24 cm^2.",
      "Step 5: Area of trapezium BDEC = 150 − 24 = 126 cm^2.",
      "Final answer: 126 cm^2"
    ),
  }),
  makeRow({
    question: L(
      "Points A, B, C and D lie on a circle.",
      "Chords AB and BC are equal.",
      "Angle ADC is 120°.",
      "Find angle BAC."
    ),
    correct: "60°",
    wrong: ["50°", "70°", "80°"],
    image: `${IMAGE_PREFIX}/cyclic_isosceles.svg`,
    imageAlt: "Cyclic quadrilateral with AB = BC and angle ADC marked 120°.",
    explanation: L(
      "Step 1: Opposite angles in a cyclic quadrilateral sum to 180°.",
      "Step 2: So angle ABC = 180° − 120° = 60°.",
      "Step 3: AB = BC, so triangle ABC is isosceles with base AC.",
      "Step 4: Therefore angle BAC = angle ACB.",
      "Step 5: In triangle ABC, angles add to 180°, so BAC + ACB = 180° − 60° = 120°.",
      "Step 6: Each equal angle is 60°.",
      "Final answer: 60°"
    ),
  }),
  makeRow({
    question: L(
      "In a circle with centre O, angle AOB is 90° and the radius is 12 cm.",
      "Chord AB forms a segment between the chord and the arc AB.",
      "Find the area of that segment in terms of π."
    ),
    correct: "36π − 72 cm^2",
    wrong: ["24π − 72 cm^2", "36π − 36 cm^2", "48π − 72 cm^2"],
    image: `${IMAGE_PREFIX}/quarter_circle_segment.svg`,
    imageAlt: "Quarter circle with radius 12 cm and chord AB.",
    explanation: L(
      "Step 1: The sector angle is 90°, so the sector area is (90/360) × π × 12^2 = 36π cm^2.",
      "Step 2: Triangle AOB is right-angled with legs 12 cm and 12 cm.",
      "Step 3: Its area is 1/2 × 12 × 12 = 72 cm^2.",
      "Step 4: The segment area is sector area minus triangle area.",
      "Step 5: So the segment area is 36π − 72 cm^2.",
      "Final answer: 36π − 72 cm^2"
    ),
  }),
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickGcseRows(allCandidates, targetCount) {
  const picked = [];
  const typeCounts = new Map();
  const subtopicCounts = new Map();
  const MAX_PER_TYPE = 35;
  const MAX_PER_SUBTOPIC = 12;

  for (const row of allCandidates) {
    if (picked.length >= targetCount) break;
    const question = normalizeText(row.question || "");
    const correct = normalizeText(row.correct_answer || "");
    const explanation = normalizeText(row.explanation || "");
    const wrongAnswers = Array.isArray(row.wrong_answers) ? row.wrong_answers.map(normalizeText) : [];

    if (!question || !correct) continue;
    if (question.length < 90) continue;
    if (wrongAnswers.length < 3) continue;
    if (looksNonGcse(`${question}\n${explanation}`)) continue;
    if (hasPlaceholderAnswers(row)) continue;

    const type = String(row.question_type || "Mixed");
    const subtopic = String(row.subtopic || "unknown");

    if ((typeCounts.get(type) || 0) >= MAX_PER_TYPE) continue;
    if ((subtopicCounts.get(subtopic) || 0) >= MAX_PER_SUBTOPIC) continue;

    const expanded = expandExplanation(question, explanation, correct);
    picked.push(
      makeRow({
        question,
        correct,
        wrong: wrongAnswers.slice(0, 3),
        explanation: expanded,
      })
    );
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    subtopicCounts.set(subtopic, (subtopicCounts.get(subtopic) || 0) + 1);
  }

  return picked;
}

async function main() {
  const beforeCount = await getCount("extreme_questions");
  console.log(`extreme_questions before: ${beforeCount}`);

  console.log("Uploading SVG diagrams…");
  for (const [filename, svgText] of Object.entries(SVG_ASSETS)) {
    await uploadSvg(`${IMAGE_PREFIX}/${filename}.svg`, svgText);
  }

  const difficulty5 = await fetchExamCandidates({ difficulty: 5 });
  const difficulty4 = await fetchExamCandidates({ difficulty: 4 });

  const candidates = shuffle([...difficulty5, ...difficulty4]);
  const needed = 100 - CUSTOM_QUESTIONS.length;
  const selected = pickGcseRows(candidates, needed);

  if (selected.length < needed) {
    throw new Error(`Not enough GCSE-friendly questions found (picked ${selected.length}/${needed}).`);
  }

  await deleteAllExtreme();

  const payload = [...CUSTOM_QUESTIONS, ...selected];

  const insertRes = await supabaseFetch("/rest/v1/extreme_questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text().catch(() => "");
    throw new Error(`Insert failed: ${insertRes.status} ${text}`);
  }

  const afterCount = await getCount("extreme_questions");
  console.log(`extreme_questions after: ${afterCount}`);
  const imageCount = CUSTOM_QUESTIONS.filter((q) => q.image_url).length;
  console.log(`Custom questions inserted: ${CUSTOM_QUESTIONS.length}`);
  console.log(`Custom image questions inserted: ${imageCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
