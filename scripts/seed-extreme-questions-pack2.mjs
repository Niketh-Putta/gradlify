/*
Seed 60 additional "Challenge" questions into `public.extreme_questions`.

Pack contents:
- 20 bespoke brain-puzzle style questions (some with new SVG diagrams).
- 40 high-difficulty exam questions (difficulty 4–5) with no images,
  filtered to avoid diagram-referencing prompts, then copied into `extreme_questions`.

This script:
1) Verifies `extreme_questions` currently has 40 rows (expected baseline).
2) Uploads the new SVG diagrams to Supabase Storage bucket `questions`.
3) Inserts 60 new rows into `extreme_questions`.
4) Verifies the total becomes 100.

Run:
  node scripts/seed-extreme-questions-pack2.mjs
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const env = parseDotEnv(path.resolve(__dirname, "..", ".env"));
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const STORAGE_BUCKET = "questions";
const IMAGE_PREFIX = "generated/batch_extreme_20260115_pack2";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

async function getCount(table, filterQuery = "") {
  const endpoint = `/rest/v1/${table}?select=id${filterQuery ? `&${filterQuery}` : ""}`;
  const res = await supabaseFetch(endpoint, { method: "HEAD", headers: { Prefer: "count=exact" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Count failed: ${res.status} ${text}`);
  }
  const range = res.headers.get("content-range") || "";
  const match = range.match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function uploadSvg(objectPath, svgText) {
  const res = await supabaseFetch(`/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`, {
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

function makeQuestionRow({ question, correct, wrong, explanation, image, imageAlt }) {
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
  "img01_angle_bisector.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M180 320 L220 80 L520 320 Z"/>
    <path d="M180 320 L370 200" stroke="#2563eb" stroke-width="3" stroke-dasharray="6 6"/>
  </g>
  <g fill="#111827" font-family="Arial" font-size="16">
    <text x="165" y="343">A</text>
    <text x="208" y="72">B</text>
    <text x="530" y="343">C</text>
    <text x="378" y="195">D</text>
    <text x="196" y="205" fill="#374151" font-size="14">10 cm</text>
    <text x="350" y="338" fill="#374151" font-size="14">12 cm</text>
    <text x="365" y="230" fill="#374151" font-size="14">6 cm</text>
    <text x="210" y="360" fill="#2563eb" font-size="13">AD bisects ∠A</text>
  </g>
</svg>`,

  "img02_tangent_angle.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="320" cy="220" r="90"/>
    <line x1="320" y1="63" x2="246.2" y2="168.4"/>
    <line x1="320" y1="63" x2="393.8" y2="168.4"/>
    <line x1="320" y1="220" x2="246.2" y2="168.4" stroke="#9ca3af" stroke-dasharray="6 6"/>
    <line x1="320" y1="220" x2="393.8" y2="168.4" stroke="#9ca3af" stroke-dasharray="6 6"/>
  </g>
  <g fill="#111827" font-family="Arial" font-size="16">
    <text x="312" y="55">P</text>
    <text x="230" y="175">A</text>
    <text x="404" y="175">B</text>
    <text x="330" y="225">O</text>
    <text x="330" y="118" fill="#2563eb" font-weight="700">70°</text>
  </g>
</svg>`,

  "img03_hexagon.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M420 220 L370 306 L270 306 L220 220 L270 134 L370 134 Z"/>
  </g>
  <g fill="#111827" font-family="Arial" font-size="16">
    <text x="360" y="328" fill="#374151" font-size="14">6 cm</text>
    <text x="430" y="220" fill="#374151" font-size="14">Regular hexagon</text>
  </g>
</svg>`,

  "img04_cone.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M320 80 L240 320 L400 320 Z"/>
    <line x1="320" y1="80" x2="320" y2="320" stroke="#9ca3af" stroke-dasharray="6 6"/>
    <line x1="320" y1="320" x2="400" y2="320" stroke="#2563eb" stroke-width="3"/>
  </g>
  <g fill=\"#111827\" font-family=\"Arial\" font-size=\"16\">
    <text x=\"412\" y=\"323\" fill=\"#2563eb\" font-size=\"14\">r = 3 cm</text>
    <text x=\"365\" y=\"190\" fill=\"#374151\" font-size=\"14\">slant = 5 cm</text>
  </g>
</svg>`,

  "img05_chord_distance.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="320" cy="210" r="130"/>
    <line x1="270" y1="330" x2="370" y2="330"/>
    <line x1="320" y1="210" x2="320" y2="330" stroke="#2563eb" stroke-dasharray="6 6"/>
    <line x1="320" y1="210" x2="450" y2="210" stroke="#9ca3af" stroke-dasharray="6 6"/>
    <circle cx="320" cy="210" r="4" fill="#facc15" stroke="none"/>
  </g>
  <g fill="#111827" font-family="Arial" font-size="16">
    <text x="330" y="205">O</text>
    <text x="258" y="352">A</text>
    <text x="378" y="352">B</text>
    <text x="304" y="350" fill="#374151" font-size="14">10 cm</text>
    <text x="460" y="214" fill="#374151" font-size="14">13 cm</text>
    <text x="332" y="285" fill="#2563eb" font-size="13">d</text>
  </g>
</svg>`,

  "img06_number_pyramid.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g font-family="Arial" font-size="18" fill="#111827" text-anchor="middle">
    <!-- blocks -->
    <g stroke="#e5e7eb" stroke-width="2" fill="#ffffff">
      <rect x="280" y="60" width="80" height="50" rx="12"/>
      <rect x="240" y="125" width="80" height="50" rx="12"/>
      <rect x="320" y="125" width="80" height="50" rx="12"/>
      <rect x="200" y="190" width="80" height="50" rx="12"/>
      <rect x="280" y="190" width="80" height="50" rx="12"/>
      <rect x="360" y="190" width="80" height="50" rx="12"/>
      <rect x="160" y="255" width="80" height="50" rx="12"/>
      <rect x="240" y="255" width="80" height="50" rx="12"/>
      <rect x="320" y="255" width="80" height="50" rx="12"/>
      <rect x="400" y="255" width="80" height="50" rx="12"/>
    </g>
    <!-- numbers -->
    <text x="320" y="92" font-weight="700">76</text>
    <text x="280" y="157" font-weight="700">32</text>
    <text x="360" y="157" font-weight="700">44</text>
    <text x="240" y="222" font-weight="700">13</text>
    <text x="320" y="222" font-weight="700">19</text>
    <text x="400" y="222" font-weight="700">25</text>
    <text x="200" y="288" fill="#2563eb" font-weight="700">?</text>
    <text x="280" y="288" fill="#2563eb" font-weight="700">?</text>
    <text x="360" y="288" fill="#2563eb" font-weight="700">?</text>
    <text x="440" y="288" fill="#2563eb" font-weight="700">?</text>
  </g>
  <text x="320" y="360" fill="#6b7280" font-family="Arial" font-size="14" text-anchor="middle">
    Each brick = sum of the two bricks directly below
  </text>
</svg>`,
};

const CUSTOM_QUESTIONS = [
  makeQuestionRow({
    question:
      "Find the smallest positive integer n such that:\n- n leaves remainder 2 when divided by 3\n- n leaves remainder 3 when divided by 4\n- n leaves remainder 4 when divided by 5\n\nWhat is n?",
    correct: "59",
    wrong: ["29", "49", "89"],
    explanation:
      "Step 1: From n ≡ 2 (mod 3), write n = 3a + 2.\n\n" +
      "Step 2: Use n ≡ 3 (mod 4):\n" +
      "3a + 2 ≡ 3 (mod 4) ⇒ 3a ≡ 1 (mod 4).\n" +
      "Since 3 ≡ -1 (mod 4), this gives -a ≡ 1 ⇒ a ≡ 3 (mod 4).\n" +
      "So a = 4b + 3.\n\n" +
      "Step 3: Substitute back:\n" +
      "n = 3(4b + 3) + 2 = 12b + 11.\n\n" +
      "Step 4: Use n ≡ 4 (mod 5):\n" +
      "12b + 11 ≡ 4 (mod 5).\n" +
      "12 ≡ 2 and 11 ≡ 1, so 2b + 1 ≡ 4 ⇒ 2b ≡ 3 (mod 5).\n" +
      "The inverse of 2 mod 5 is 3, so b ≡ 3×3 ≡ 9 ≡ 4 (mod 5).\n" +
      "So b = 5c + 4.\n\n" +
      "Step 5: Then n = 12(5c + 4) + 11 = 60c + 59.\n" +
      "Smallest positive n is 59.\n\nFinal answer: 59",
  }),

  makeQuestionRow({
    question:
      "A two-digit number is divisible by 9. When its digits are reversed, the new number is 27 greater than the original.\n\nWhat is the original number?",
    correct: "36",
    wrong: ["27", "45", "63"],
    explanation:
      "Step 1: Let the number be 10a + b (a is the tens digit, b is the units digit).\n" +
      "The reversed number is 10b + a.\n\n" +
      "Step 2: The reversed number is 27 greater:\n" +
      "10b + a = 10a + b + 27 ⇒ 9(b - a) = 27 ⇒ b - a = 3.\n" +
      "So b = a + 3.\n\n" +
      "Step 3: The number is divisible by 9, so a + b is a multiple of 9.\n" +
      "a + b = a + (a + 3) = 2a + 3.\n\n" +
      "Step 4: Check digits: a can be 1–6 so that b = a+3 is ≤ 9.\n" +
      "Try a = 3 ⇒ 2a + 3 = 9 which is divisible by 9.\n" +
      "So the number is 36.\n\nFinal answer: 36",
  }),

  makeQuestionRow({
    question: "Write 0.0\\overline{36} as a fraction in simplest form.",
    correct: "\\frac{2}{55}",
    wrong: ["\\frac{4}{55}", "\\frac{2}{5}", "\\frac{1}{55}"],
    explanation:
      "Step 1: Let x = 0.0363636…\n\n" +
      "Step 2: Multiply by 100 to move past the non-repeating 0.0:\n" +
      "100x = 3.6363636…\n\n" +
      "Step 3: Now the repeating block has length 2, so multiply by 100 again:\n" +
      "100(100x) = 10000x = 363.6363636…\n\n" +
      "Step 4: Subtract to eliminate the repeating decimals:\n" +
      "10000x − 100x = 363.636… − 3.636… = 360\n" +
      "⇒ 9900x = 360\n" +
      "⇒ x = 360/9900 = 36/990 = 2/55.\n\nFinal answer: 2/55",
  }),

  makeQuestionRow({
    question: "Find the smallest positive integer n such that 12n is a perfect cube.",
    correct: "18",
    wrong: ["6", "12", "36"],
    explanation:
      "Step 1: Prime factorise 12:\n" +
      "12 = 2^2 × 3^1.\n\n" +
      "Step 2: For 12n to be a cube, each prime’s power must be a multiple of 3.\n" +
      "We currently have 2^2 and 3^1.\n\n" +
      "Step 3: Make the powers multiples of 3:\n" +
      "- For 2^2, multiply by one more 2 to get 2^3.\n" +
      "- For 3^1, multiply by 3^2 to get 3^3.\n\n" +
      "So n must contribute 2^1 × 3^2 = 2 × 9 = 18.\n\n" +
      "Check: 12×18 = 216 = 6^3.\n\nFinal answer: 18",
  }),

  makeQuestionRow({
    question: "What is the minimum value of (x - 3)^2 + (x + 1)^2 for real x?",
    correct: "8",
    wrong: ["0", "4", "10"],
    explanation:
      "Step 1: Expand:\n" +
      "(x - 3)^2 + (x + 1)^2 = (x^2 - 6x + 9) + (x^2 + 2x + 1)\n" +
      "= 2x^2 - 4x + 10.\n\n" +
      "Step 2: Complete the square:\n" +
      "2x^2 - 4x + 10 = 2(x^2 - 2x) + 10\n" +
      "= 2[(x - 1)^2 - 1] + 10\n" +
      "= 2(x - 1)^2 + 8.\n\n" +
      "Step 3: Since (x - 1)^2 ≥ 0, the minimum occurs when (x - 1)^2 = 0 (i.e. x = 1).\n" +
      "Minimum value = 8.\n\nFinal answer: 8",
  }),

  makeQuestionRow({
    question: "Solve |x - 2| = |2x + 1|. Give all solutions.",
    correct: "x = -3 or x = \\frac{1}{3}",
    wrong: ["x = -3 only", "x = \\frac{1}{3} only", "x = 3 or x = -\\frac{1}{3}"],
    explanation:
      "Step 1: |A| = |B| means A = B or A = -B.\n\n" +
      "Let A = x - 2 and B = 2x + 1.\n\n" +
      "Case 1: x - 2 = 2x + 1 ⇒ -2 = x + 1 ⇒ x = -3.\n\n" +
      "Case 2: x - 2 = -(2x + 1) ⇒ x - 2 = -2x - 1 ⇒ 3x = 1 ⇒ x = 1/3.\n\n" +
      "Both solutions are valid.\n\nFinal answer: x = -3 or x = 1/3",
  }),

  makeQuestionRow({
    question: "How many pairs of positive integers (x, y) satisfy x^2 - y^2 = 45 with x > y?",
    correct: "3",
    wrong: ["2", "4", "5"],
    explanation:
      "Step 1: Use difference of squares:\n" +
      "x^2 - y^2 = (x - y)(x + y) = 45.\n\n" +
      "Step 2: List positive factor pairs of 45:\n" +
      "(1,45), (3,15), (5,9).\n\n" +
      "Step 3: For each pair (a,b) with a = x - y and b = x + y:\n" +
      "x = (a + b)/2 and y = (b - a)/2.\n" +
      "These are integers because a and b are both odd.\n\n" +
      "- (1,45) ⇒ x=23, y=22\n" +
      "- (3,15) ⇒ x=9, y=6\n" +
      "- (5,9) ⇒ x=7, y=2\n\n" +
      "So there are 3 valid pairs.\n\nFinal answer: 3",
  }),

  makeQuestionRow({
    question:
      "A bag has 3 white and 2 black counters. You draw 3 times with replacement.\n\nFind P(exactly 2 black | at least 1 black).",
    correct: "\\frac{18}{49}",
    wrong: ["\\frac{36}{49}", "\\frac{18}{98}", "\\frac{12}{49}"],
    explanation:
      "Let p = P(black) = 2/5 and q = P(white) = 3/5.\n\n" +
      "Step 1: P(exactly 2 black) = C(3,2) p^2 q\n" +
      "= 3 × (2/5)^2 × (3/5)\n" +
      "= 3 × (4/25) × (3/5)\n" +
      "= 36/125.\n\n" +
      "Step 2: P(at least 1 black) = 1 − P(all white)\n" +
      "= 1 − (3/5)^3\n" +
      "= 1 − 27/125\n" +
      "= 98/125.\n\n" +
      "Step 3: Conditional probability:\n" +
      "P(exactly 2 black | at least 1 black) = (36/125) ÷ (98/125)\n" +
      "= 36/98 = 18/49.\n\nFinal answer: 18/49",
  }),

  makeQuestionRow({
    question: "A rectangle has area 60 cm^2 and diagonal length 13 cm. Find its perimeter.",
    correct: "34 cm",
    wrong: ["30 cm", "32 cm", "36 cm"],
    explanation:
      "Let the sides be a and b.\n\n" +
      "Step 1: Area gives ab = 60.\n\n" +
      "Step 2: Diagonal gives a^2 + b^2 = 13^2 = 169.\n\n" +
      "Step 3: Use (a + b)^2 = a^2 + b^2 + 2ab:\n" +
      "(a + b)^2 = 169 + 2×60 = 169 + 120 = 289.\n" +
      "So a + b = √289 = 17.\n\n" +
      "Step 4: Perimeter = 2(a + b) = 2×17 = 34 cm.\n\nFinal answer: 34 cm",
  }),

  makeQuestionRow({
    question:
      "In triangle ABC, AB = 10 cm, AC = 6 cm, BC = 12 cm.\nAD bisects angle A and meets BC at D.\n\nFind BD.",
    correct: "7.5 cm",
    wrong: ["4.5 cm", "6 cm", "8 cm"],
    image: `${IMAGE_PREFIX}/img01_angle_bisector.svg`,
    imageAlt: "Triangle with AB=10 cm, AC=6 cm and angle bisector AD to BC",
    explanation:
      "Step 1: Use the angle bisector theorem:\n" +
      "BD/DC = AB/AC.\n\n" +
      "Step 2: Substitute AB = 10 and AC = 6:\n" +
      "BD/DC = 10/6 = 5/3.\n\n" +
      "Step 3: Split BC = 12 in the ratio 5:3.\n" +
      "Total parts = 5 + 3 = 8.\n\n" +
      "Step 4: BD = (5/8) × 12 = 7.5 cm.\n\nFinal answer: 7.5 cm",
  }),

  makeQuestionRow({
    question:
      "From point P, two tangents PA and PB touch a circle with centre O.\nIf ∠APB = 70°, find ∠AOB.",
    correct: "110°",
    wrong: ["70°", "35°", "140°"],
    image: `${IMAGE_PREFIX}/img02_tangent_angle.svg`,
    imageAlt: "Circle with tangents from P touching at A and B with angle APB = 70°",
    explanation:
      "Step 1: OA ⟂ PA and OB ⟂ PB (radius is perpendicular to a tangent).\n\n" +
      "Step 2: Quadrilateral AOBP has two right angles at A and B.\n" +
      "So ∠A + ∠B = 90° + 90° = 180°.\n\n" +
      "Step 3: Sum of angles in a quadrilateral is 360°:\n" +
      "∠AOB + ∠APB + 180° = 360°.\n\n" +
      "Step 4: Substitute ∠APB = 70°:\n" +
      "∠AOB = 360° − 180° − 70° = 110°.\n\nFinal answer: 110°",
  }),

  makeQuestionRow({
    question: "A regular hexagon has side length 6 cm. Find its area in exact form.",
    correct: "54\\sqrt{3} cm^2",
    wrong: ["36\\sqrt{3} cm^2", "72\\sqrt{3} cm^2", "54\\pi cm^2"],
    image: `${IMAGE_PREFIX}/img03_hexagon.svg`,
    imageAlt: "Regular hexagon with side length 6 cm",
    explanation:
      "Step 1: A regular hexagon can be split into 6 equilateral triangles, each with side 6.\n\n" +
      "Step 2: Area of one equilateral triangle:\n" +
      "A = (\\sqrt{3}/4) s^2 = (\\sqrt{3}/4)×6^2 = (\\sqrt{3}/4)×36 = 9\\sqrt{3}.\n\n" +
      "Step 3: Multiply by 6 triangles:\n" +
      "Total area = 6×9\\sqrt{3} = 54\\sqrt{3} cm^2.\n\nFinal answer: 54\\sqrt{3} cm^2",
  }),

  makeQuestionRow({
    question:
      "A right cone has radius 3 cm and slant height 5 cm.\nFind its volume in terms of \\pi.",
    correct: "12\\pi cm^3",
    wrong: ["15\\pi cm^3", "9\\pi cm^3", "12\\pi cm^2"],
    image: `${IMAGE_PREFIX}/img04_cone.svg`,
    imageAlt: "Cone cross-section with radius 3 cm and slant height 5 cm",
    explanation:
      "Step 1: Use Pythagoras on the right triangle formed by radius r, height h and slant height l:\n" +
      "l^2 = r^2 + h^2.\n\n" +
      "Step 2: Substitute l = 5 and r = 3:\n" +
      "25 = 9 + h^2 ⇒ h^2 = 16 ⇒ h = 4.\n\n" +
      "Step 3: Volume of a cone:\n" +
      "V = (1/3)\\pi r^2 h = (1/3)\\pi×3^2×4 = (1/3)\\pi×9×4 = 12\\pi.\n\nFinal answer: 12\\pi cm^3",
  }),

  makeQuestionRow({
    question:
      "A circle has radius 13 cm. A chord AB has length 10 cm.\nFind the perpendicular distance from the centre to the chord.",
    correct: "12 cm",
    wrong: ["8 cm", "10 cm", "\\sqrt{69} cm"],
    image: `${IMAGE_PREFIX}/img05_chord_distance.svg`,
    imageAlt: "Circle radius 13 cm with chord AB length 10 cm and perpendicular from centre",
    explanation:
      "Step 1: The perpendicular from the centre to a chord bisects the chord.\n" +
      "So half the chord is 10/2 = 5 cm.\n\n" +
      "Step 2: Form a right-angled triangle with:\n" +
      "- hypotenuse = radius = 13\n" +
      "- one leg = 5\n" +
      "- other leg = distance d.\n\n" +
      "Step 3: Use Pythagoras:\n" +
      "d^2 + 5^2 = 13^2 ⇒ d^2 = 169 − 25 = 144 ⇒ d = 12.\n\nFinal answer: 12 cm",
  }),

  makeQuestionRow({
    question:
      "In the number pyramid, each brick is the sum of the two bricks directly below it.\nThe bottom row is an arithmetic sequence.\n\nWhich bottom row is correct?",
    correct: "5, 8, 11, 14",
    wrong: ["4, 7, 10, 13", "6, 9, 12, 15", "5, 7, 9, 11"],
    image: `${IMAGE_PREFIX}/img06_number_pyramid.svg`,
    imageAlt: "Number pyramid showing 76 at the top and 13,19,25 in the row above",
    explanation:
      "Step 1: Let the bottom row be an arithmetic sequence:\n" +
      "a, a + d, a + 2d, a + 3d.\n\n" +
      "Step 2: The next row is sums:\n" +
      "(a + (a + d)) = 2a + d = 13\n" +
      "((a + d) + (a + 2d)) = 2a + 3d = 19\n" +
      "((a + 2d) + (a + 3d)) = 2a + 5d = 25.\n\n" +
      "Step 3: Subtract the first two equations:\n" +
      "(2a + 3d) − (2a + d) = 2d = 6 ⇒ d = 3.\n\n" +
      "Step 4: Substitute into 2a + d = 13:\n" +
      "2a + 3 = 13 ⇒ 2a = 10 ⇒ a = 5.\n\n" +
      "So bottom row is 5, 8, 11, 14.\n\nFinal answer: 5, 8, 11, 14",
  }),

  makeQuestionRow({
    question:
      "A 5×5×5 cube is made of 125 unit cubes. The outside is painted and then the cube is taken apart.\n\nHow many unit cubes have exactly 2 faces painted?",
    correct: "36",
    wrong: ["24", "48", "60"],
    explanation:
      "Cubes with exactly 2 faces painted lie on the edges, but NOT at the corners.\n\n" +
      "Step 1: A cube has 12 edges.\n\n" +
      "Step 2: Along each edge of a 5×5×5 cube, there are 5 small cubes.\n" +
      "The 2 corner cubes have 3 faces painted, so exclude them.\n" +
      "That leaves (5 − 2) = 3 cubes per edge with exactly 2 faces painted.\n\n" +
      "Step 3: Total = 12 edges × 3 cubes = 36.\n\nFinal answer: 36",
  }),

  makeQuestionRow({
    question:
      "In a group of 40 students, 25 study Maths, 18 study Physics, and 12 study both.\n\nHow many study neither subject?",
    correct: "9",
    wrong: ["7", "10", "15"],
    explanation:
      "Step 1: Use inclusion–exclusion for those who study at least one subject:\n" +
      "|M ∪ P| = |M| + |P| − |M ∩ P| = 25 + 18 − 12 = 31.\n\n" +
      "Step 2: Those who study neither = total − those who study at least one:\n" +
      "40 − 31 = 9.\n\nFinal answer: 9",
  }),

  makeQuestionRow({
    question: "Point P(2, -1) is rotated 90° anticlockwise about the origin. What are the coordinates of P'?",
    correct: "(1, 2)",
    wrong: ["(-1, 2)", "(1, -2)", "(-2, -1)"],
    explanation:
      "A 90° anticlockwise rotation about the origin maps (x, y) → (-y, x).\n\n" +
      "For P(2, -1):\n" +
      "-y = 1 and x = 2, so P' = (1, 2).\n\nFinal answer: (1, 2)",
  }),

  makeQuestionRow({
    question:
      "Start at (0, 0). Apply these transformations in order:\n" +
      "1) Translate by (3, 4)\n" +
      "2) Reflect in the y-axis\n" +
      "3) Translate by (2, -5)\n\n" +
      "What is the final coordinate?",
    correct: "(-1, -1)",
    wrong: ["(1, -1)", "(-1, 1)", "(5, -1)"],
    explanation:
      "Step 1: Translate (0,0) by (3,4):\n" +
      "(0+3, 0+4) = (3,4).\n\n" +
      "Step 2: Reflect in the y-axis: (x, y) → (-x, y):\n" +
      "(3,4) → (-3,4).\n\n" +
      "Step 3: Translate by (2, -5):\n" +
      "(-3+2, 4-5) = (-1, -1).\n\nFinal answer: (-1, -1)",
  }),

  makeQuestionRow({
    question:
      "A three-digit number ends in 5 and is divisible by 9.\nIt is also 15 times the sum of its digits.\n\nWhat is the number?",
    correct: "135",
    wrong: ["225", "315", "405"],
    explanation:
      "Step 1: If the number is 15 times the sum of its digits, it must be of the form 15S where S is the digit sum.\n" +
      "For a 3-digit number, S can be at most 27, so 15S ≤ 405.\n\n" +
      "Step 2: The number ends in 5, so 15S must end in 5.\n" +
      "Try S = 9 ⇒ 15S = 135 (ends in 5).\n\n" +
      "Step 3: Check divisibility by 9:\n" +
      "Digit sum of 135 is 1+3+5 = 9, so it is divisible by 9.\n\n" +
      "Step 4: Verify the rule:\n" +
      "15 × (sum of digits) = 15 × 9 = 135.\n\nFinal answer: 135",
  }),
];

function looksLikeDiagramQuestion(text) {
  const hay = String(text || "").toLowerCase();
  const banned = [
    "diagram",
    "graph",
    "histogram",
    "scatter",
    "cumulative frequency",
    "table",
    "chart",
    "on the grid",
    "shown",
    "as shown",
    "below",
    "above",
    "picture",
    "image",
    "draw",
  ];
  return banned.some((kw) => hay.includes(kw));
}

function hasPlaceholderAnswers(row) {
  const answers = Array.isArray(row.all_answers) ? row.all_answers : [];
  return answers.some((a) => String(a).toLowerCase().includes("different answer"));
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
    ].join(",") +
    `&difficulty=eq.${difficulty}&image_url=is.null&limit=1000`;

  const res = await supabaseFetch(endpoint, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch exam candidates: ${res.status} ${text}`);
  }
  return res.json();
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickExamRows(allCandidates, targetCount) {
  const picked = [];
  const typeCounts = new Map();
  const subtopicCounts = new Map();
  const MAX_PER_TYPE = 15;
  const MAX_PER_SUBTOPIC = 5;

  for (const row of allCandidates) {
    if (picked.length >= targetCount) break;
    const question = String(row.question || "").trim();
    const correct = String(row.correct_answer || "").trim();
    const explanation = String(row.explanation || "").trim();
    const allAnswers = Array.isArray(row.all_answers) ? row.all_answers.map(String) : [];

    if (!question || !correct) continue;
    if (!explanation || explanation.length < 180) continue;
    if (looksLikeDiagramQuestion(question)) continue;
    if (allAnswers.length < 4) continue;
    if (hasPlaceholderAnswers(row)) continue;

    const type = String(row.question_type || "Mixed");
    const subtopic = String(row.subtopic || "unknown");

    if ((typeCounts.get(type) || 0) >= MAX_PER_TYPE) continue;
    if ((subtopicCounts.get(subtopic) || 0) >= MAX_PER_SUBTOPIC) continue;

    picked.push(row);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    subtopicCounts.set(subtopic, (subtopicCounts.get(subtopic) || 0) + 1);
  }

  return picked;
}

async function main() {
  const beforeCount = await getCount("extreme_questions");
  if (beforeCount >= 100) {
    console.log(`extreme_questions already has ${beforeCount} rows; nothing to do.`);
    return;
  }
  if (beforeCount !== 40) {
    throw new Error(
      `Safety stop: expected extreme_questions to have 40 rows before seeding, but found ${beforeCount}.`
    );
  }

  console.log("Uploading SVG diagrams…");
  for (const [filename, svgText] of Object.entries(SVG_ASSETS)) {
    const objectPath = `${IMAGE_PREFIX}/${filename}`;
    await uploadSvg(objectPath, svgText);
    await sleep(50);
  }

  console.log("Selecting 40 high-difficulty exam questions (no images) to copy…");
  const difficulty5 = await fetchExamCandidates({ difficulty: 5 });
  const difficulty4 = await fetchExamCandidates({ difficulty: 4 });

  const candidates = shuffle([
    ...shuffle(difficulty5),
    ...shuffle(difficulty4),
  ]);

  const pickedExam = pickExamRows(candidates, 40);
  if (pickedExam.length < 40) {
    throw new Error(`Not enough suitable exam questions found (picked ${pickedExam.length}/40).`);
  }

  const copiedRows = pickedExam.map((row) =>
    makeQuestionRow({
      question: String(row.question || ""),
      correct: String(row.correct_answer || ""),
      wrong: Array.isArray(row.wrong_answers) ? row.wrong_answers.map(String).slice(0, 3) : [],
      explanation: String(row.explanation || ""),
      image: null,
      imageAlt: null,
    })
  );

  // Ensure copied rows always have 3 wrong answers; if not, drop and replace.
  const validCopied = copiedRows.filter((row) => Array.isArray(row.wrong_answers) && row.wrong_answers.length >= 3);
  if (validCopied.length < 40) {
    throw new Error(`Some copied exam rows were missing wrong answers (valid ${validCopied.length}/40).`);
  }

  const payload = [...CUSTOM_QUESTIONS, ...validCopied.slice(0, 40)];
  if (payload.length !== 60) {
    throw new Error(`Internal error: expected 60 rows to insert, got ${payload.length}.`);
  }

  console.log("Inserting 60 new extreme questions…");
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
  console.log(`Done. extreme_questions: ${beforeCount} → ${afterCount}`);
  if (afterCount !== 100) {
    throw new Error(`Expected extreme_questions to have 100 rows after seeding, got ${afterCount}.`);
  }
}

await main();
