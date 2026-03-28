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
const IMAGE_PREFIX = "generated/upgrade_exam_questions_20260129";

const SVG_ASSETS = {
  bearings_right_angle: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <line x1="320" y1="80" x2="320" y2="340" stroke="#111827" stroke-width="2"/>
  <line x1="320" y1="220" x2="440" y2="220" stroke="#2563eb" stroke-width="3"/>
  <line x1="320" y1="220" x2="320" y2="340" stroke="#2563eb" stroke-width="3"/>
  <circle cx="320" cy="220" r="4" fill="#111827"/>
  <circle cx="440" cy="220" r="4" fill="#111827"/>
  <circle cx="320" cy="340" r="4" fill="#111827"/>
  <text x="330" y="210" font-family="Arial" font-size="14" fill="#374151">O</text>
  <text x="450" y="220" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="330" y="355" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="330" y="110" font-family="Arial" font-size="14" fill="#374151">N</text>
  <text x="370" y="210" font-family="Arial" font-size="14" fill="#2563eb">5 km</text>
  <text x="330" y="285" font-family="Arial" font-size="14" fill="#2563eb">5 km</text>
  </svg>`,
  bearings_step: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <line x1="200" y1="80" x2="200" y2="340" stroke="#111827" stroke-width="2"/>
  <line x1="200" y1="320" x2="200" y2="140" stroke="#2563eb" stroke-width="3"/>
  <line x1="200" y1="140" x2="380" y2="140" stroke="#2563eb" stroke-width="3"/>
  <circle cx="200" cy="320" r="4" fill="#111827"/>
  <circle cx="200" cy="140" r="4" fill="#111827"/>
  <circle cx="380" cy="140" r="4" fill="#111827"/>
  <text x="210" y="315" font-family="Arial" font-size="14" fill="#374151">P</text>
  <text x="210" y="135" font-family="Arial" font-size="14" fill="#374151">Q</text>
  <text x="390" y="140" font-family="Arial" font-size="14" fill="#374151">R</text>
  <text x="210" y="110" font-family="Arial" font-size="14" fill="#374151">N</text>
  <text x="210" y="230" font-family="Arial" font-size="14" fill="#2563eb">8 km</text>
  <text x="280" y="130" font-family="Arial" font-size="14" fill="#2563eb">6 km</text>
  </svg>`,
  bearings_two_rays: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <line x1="320" y1="60" x2="320" y2="360" stroke="#111827" stroke-width="2"/>
  <circle cx="320" cy="260" r="4" fill="#111827"/>
  <line x1="320" y1="260" x2="460" y2="160" stroke="#2563eb" stroke-width="3"/>
  <line x1="320" y1="260" x2="430" y2="340" stroke="#2563eb" stroke-width="3"/>
  <text x="330" y="250" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="470" y="155" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="440" y="355" font-family="Arial" font-size="14" fill="#374151">C</text>
  <text x="330" y="100" font-family="Arial" font-size="14" fill="#374151">N</text>
  <path d="M320 260 A70 70 0 0 1 370 200" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="360" y="210" font-family="Arial" font-size="14" fill="#6b7280">60°</text>
  <path d="M320 260 A70 70 0 0 0 370 300" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="360" y="305" font-family="Arial" font-size="14" fill="#6b7280">150°</text>
  </svg>`,
  bearings_two_rays_30_120: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <line x1="320" y1="60" x2="320" y2="360" stroke="#111827" stroke-width="2"/>
  <circle cx="320" cy="260" r="4" fill="#111827"/>
  <line x1="320" y1="260" x2="420" y2="120" stroke="#2563eb" stroke-width="3"/>
  <line x1="320" y1="260" x2="470" y2="320" stroke="#2563eb" stroke-width="3"/>
  <text x="330" y="250" font-family="Arial" font-size="14" fill="#374151">X</text>
  <text x="430" y="110" font-family="Arial" font-size="14" fill="#374151">Y</text>
  <text x="480" y="330" font-family="Arial" font-size="14" fill="#374151">Z</text>
  <text x="330" y="100" font-family="Arial" font-size="14" fill="#374151">N</text>
  <path d="M320 260 A70 70 0 0 1 360 190" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="350" y="200" font-family="Arial" font-size="14" fill="#6b7280">30°</text>
  <path d="M320 260 A70 70 0 0 0 380 300" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="370" y="305" font-family="Arial" font-size="14" fill="#6b7280">120°</text>
  </svg>`,
  l_shape_perimeter: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polygon points="180,320 460,320 460,220 360,220 360,140 180,140" fill="none" stroke="#111827" stroke-width="3"/>
  <text x="300" y="340" font-family="Arial" font-size="14" fill="#374151">12 cm</text>
  <text x="160" y="230" font-family="Arial" font-size="14" fill="#374151">8 cm</text>
  <text x="380" y="210" font-family="Arial" font-size="14" fill="#374151">5 cm</text>
  <text x="350" y="160" font-family="Arial" font-size="14" fill="#374151">3 cm</text>
  </svg>`,
};

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

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeTemplate(text) {
  let s = String(text ?? "").toLowerCase();
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/£\s*\d+(?:,\d{3})*(?:\.\d+)?/g, "<C>");
  s = s.replace(/\b\d+(?:\.\d+)?\s*%/g, "<P>");
  s = s.replace(/\b\d+(?:\.\d+)?\s*(?:mm|cm|m|km|g|kg|ml|l|litre|litres|hour|hours|h|min|mins|minute|minutes|s|sec|secs|°)\b/gi, "<U>");
  s = s.replace(/(?<![a-z])[-+]?\d+(?:\.\d+)?(?![a-z])/gi, "<N>");
  s = s.replace(/\\\(|\\\)|\\\[|\\\]/g, "");
  s = s.replace(/\$/g, "");
  return s;
}

function rankWeakRows(rows) {
  const templateCounts = new Map();
  for (const row of rows) {
    const template = normalizeTemplate(row.question);
    templateCounts.set(template, (templateCounts.get(template) || 0) + 1);
  }

  return rows
    .map((row) => {
      const qLen = String(row.question ?? "").trim().length;
      const eLen = String(row.explanation ?? "").trim().length;
      const template = normalizeTemplate(row.question);
      const templateCount = templateCounts.get(template) || 1;
      const score = (qLen < 60 ? 2 : 0) + (eLen < 180 ? 2 : 0) + (templateCount > 4 ? 2 : 0);
      return { row, score, qLen, eLen, templateCount };
    })
    .sort((a, b) => b.score - a.score || a.qLen - b.qLen);
}

const PREMIUM_REPLACEMENTS = {
  "algebra|gradients__Foundation Tier": [
    {
      question: L(
        "Line AB passes through A(2, 5) and B(8, 17).",
        "Find the gradient and then find the y-coordinate of the point on the line with x = 5.",
        "What is the y-coordinate?"
      ),
      correct: "11",
      wrong: ["9", "13", "17"],
      explanation: L(
        "Step 1: Gradient = (17 - 5) / (8 - 2) = 12 / 6 = 2.",
        "Step 2: From x = 2 to x = 5 is +3, so y increases by 2 × 3 = 6.",
        "Step 3: Starting from y = 5, the new y is 5 + 6 = 11.",
        "Final answer: 11"
      ),
    },
    {
      question: L(
        "The line passes through A(-4, 7) and B(2, -5).",
        "Find the gradient and then find the change in y when x increases by 5.",
        "What is the change in y?"
      ),
      correct: "-10",
      wrong: ["-7", "10", "-5"],
      explanation: L(
        "Step 1: Gradient = (-5 - 7) / (2 - (-4)) = -12 / 6 = -2.",
        "Step 2: A change of +5 in x gives a change of -2 × 5 = -10 in y.",
        "Final answer: -10"
      ),
    },
  ],
  "algebra|gradients__Higher Tier": [
    {
      question: L(
        "A line passes through (3, -2) and (11, 6).",
        "Find the gradient and then find the value of c in y = mx + c.",
        "What is c?"
      ),
      correct: "-5",
      wrong: ["5", "-2", "1"],
      explanation: L(
        "Step 1: Gradient m = (6 - (-2)) / (11 - 3) = 8 / 8 = 1.",
        "Step 2: Substitute (3, -2) into y = mx + c: -2 = 1·3 + c.",
        "Step 3: c = -2 - 3 = -5.",
        "Final answer: -5"
      ),
    },
    {
      question: L(
        "A straight line passes through (-2, 5) and (4, -1).",
        "Find the gradient, then find the x-intercept (where y = 0).",
        "What is the x-intercept?"
      ),
      correct: "3",
      wrong: ["-3", "1", "5"],
      explanation: L(
        "Step 1: Gradient m = (-1 - 5) / (4 - (-2)) = -6 / 6 = -1.",
        "Step 2: Equation is y = -x + c. Substitute (-2, 5): 5 = 2 + c, so c = 3.",
        "Step 3: Set y = 0: 0 = -x + 3, so x = 3.",
        "Final answer: 3"
      ),
    },
  ],
  "algebra|graphs__Foundation Tier": [
    {
      question: L(
        "A straight line has gradient 2 and passes through (1, 5).",
        "Find its equation and then find x when y = 13.",
        "What is x?"
      ),
      correct: "5",
      wrong: ["4", "6", "7"],
      explanation: L(
        "Step 1: Equation has form y = 2x + c.",
        "Step 2: Substitute (1, 5): 5 = 2(1) + c, so c = 3.",
        "Step 3: Set y = 13: 13 = 2x + 3, so 2x = 10 and x = 5.",
        "Final answer: 5"
      ),
    },
    {
      question: L(
        "A line passes through (-2, 4) and (6, -8).",
        "Find the equation of the line and then find y when x = 1.",
        "What is y?"
      ),
      correct: "-1/2",
      wrong: ["-2", "1/2", "-1"],
      explanation: L(
        "Step 1: Gradient = (-8 - 4) / (6 - (-2)) = -12 / 8 = -3/2.",
        "Step 2: Use y = mx + c with (-2, 4): 4 = (-3/2)(-2) + c = 3 + c, so c = 1.",
        "Step 3: When x = 1, y = -3/2 × 1 + 1 = -1/2.",
        "Final answer: -1/2"
      ),
    },
  ],
  "algebra|graphs__Higher Tier": [
    {
      question: L(
        "A straight line passes through (2, -3) and (8, 9).",
        "Find its equation and then find x when y = 0.",
        "What is x?"
      ),
      correct: "7/2",
      wrong: ["3", "4", "9/2"],
      explanation: L(
        "Step 1: Gradient = (9 - (-3)) / (8 - 2) = 12 / 6 = 2.",
        "Step 2: Equation y = 2x + c. Substitute (2, -3): -3 = 4 + c, so c = -7.",
        "Step 3: Set y = 0: 0 = 2x - 7, so x = 7/2.",
        "Final answer: 7/2"
      ),
    },
    {
      question: L(
        "A line passes through (-3, 5) and (5, 1).",
        "Find the equation of the line and then the y-intercept.",
        "What is the y-intercept?"
      ),
      correct: "7/2",
      wrong: ["-7/2", "3", "4"],
      explanation: L(
        "Step 1: Gradient = (1 - 5) / (5 - (-3)) = -4 / 8 = -1/2.",
        "Step 2: Use y = mx + c with (-3, 5): 5 = (-1/2)(-3) + c = 1.5 + c.",
        "Step 3: c = 5 - 1.5 = 3.5 = 7/2.",
        "Final answer: 7/2"
      ),
    },
  ],
  "algebra|sequences__Foundation Tier": [
    {
      question: L(
        "The sequence is 6, 9, 12, 15, ...",
        "Find the nth term and then find the 20th term.",
        "What is the 20th term?"
      ),
      correct: "63",
      wrong: ["60", "66", "69"],
      explanation: L(
        "Step 1: The common difference is 3, so the nth term is 3n + c.",
        "Step 2: Substitute n = 1: 3(1) + c = 6, so c = 3.",
        "Step 3: nth term = 3n + 3.",
        "Step 4: 20th term = 3(20) + 3 = 63.",
        "Final answer: 63"
      ),
    },
    {
      question: L(
        "The sequence is 20, 17, 14, 11, ...",
        "Find the nth term and then find the value of n when the term is -4.",
        "What is n?"
      ),
      correct: "9",
      wrong: ["7", "8", "10"],
      explanation: L(
        "Step 1: The common difference is -3, so nth term is -3n + c.",
        "Step 2: Substitute n = 1: -3 + c = 20, so c = 23.",
        "Step 3: nth term = 23 - 3n.",
        "Step 4: Set 23 - 3n = -4, so 3n = 27 and n = 9.",
        "Final answer: 9"
      ),
    },
  ],
  "algebra|sequences__Higher Tier": [
    {
      question: L(
        "The sequence is 3, 8, 15, 24, 35, ...",
        "Find the nth term and then find n when the term is 99.",
        "What is n?"
      ),
      correct: "9",
      wrong: ["8", "10", "11"],
      explanation: L(
        "Step 1: The sequence fits n^2 + 2n (check: 1^2+2=3, 2^2+4=8).",
        "Step 2: nth term = n^2 + 2n.",
        "Step 3: Set n^2 + 2n = 99 → n^2 + 2n - 99 = 0.",
        "Step 4: Factor: (n + 11)(n - 9) = 0, so n = 9.",
        "Final answer: 9"
      ),
    },
    {
      question: L(
        "The sequence is 5, 11, 19, 29, 41, ...",
        "Find the nth term and then find the 10th term.",
        "What is the 10th term?"
      ),
      correct: "131",
      wrong: ["121", "141", "151"],
      explanation: L(
        "Step 1: The sequence fits n^2 + 3n + 1 (check n = 1 gives 5, n = 2 gives 11).",
        "Step 2: nth term = n^2 + 3n + 1.",
        "Step 3: 10th term = 10^2 + 3·10 + 1 = 100 + 30 + 1 = 131.",
        "Final answer: 131"
      ),
    },
  ],
  "geometry|surface_area__Foundation Tier": [
    {
      question: L(
        "A cuboid is 12 cm by 5 cm by 4 cm.",
        "It is painted on every face except the base (12 × 5).",
        "Find the total painted area."
      ),
      correct: "196 cm^2",
      wrong: ["256 cm^2", "216 cm^2", "160 cm^2"],
      explanation: L(
        "Step 1: Total surface area = 2(lw + lh + wh) = 2(60 + 48 + 20) = 256 cm^2.",
        "Step 2: The unpainted base has area 12 × 5 = 60 cm^2.",
        "Step 3: Painted area = 256 - 60 = 196 cm^2.",
        "Final answer: 196 cm^2"
      ),
    },
    {
      question: L(
        "A cylindrical tin has radius 3 cm and height 10 cm.",
        "It has no lid (the top is open).",
        "Find the total surface area of the tin."
      ),
      correct: "69\\pi cm^2",
      wrong: ["60\\pi cm^2", "78\\pi cm^2", "39\\pi cm^2"],
      explanation: L(
        "Step 1: Curved surface area = 2\\pi rh = 2\\pi × 3 × 10 = 60\\pi.",
        "Step 2: Only one base is included, area = \\pi r^2 = 9\\pi.",
        "Step 3: Total surface area = 60\\pi + 9\\pi = 69\\pi cm^2.",
        "Final answer: 69\\pi cm^2"
      ),
    },
  ],
  "geometry|surface_area__Higher Tier": [
    {
      question: L(
        "A right-angled triangular prism has triangular cross-section with sides 6 cm, 8 cm and 10 cm.",
        "The length of the prism is 12 cm.",
        "Find the total surface area of the prism."
      ),
      correct: "336 cm^2",
      wrong: ["288 cm^2", "312 cm^2", "360 cm^2"],
      explanation: L(
        "Step 1: Area of one triangle = 1/2 × 6 × 8 = 24 cm^2.",
        "Step 2: Two triangular ends give 2 × 24 = 48 cm^2.",
        "Step 3: The three rectangles have areas 6×12, 8×12, 10×12; total = (6+8+10)×12 = 24×12 = 288 cm^2.",
        "Step 4: Total surface area = 48 + 288 = 336 cm^2.",
        "Final answer: 336 cm^2"
      ),
    },
    {
      question: L(
        "A cuboid measures 10 cm by 6 cm by 4 cm.",
        "The top face (10 × 6) is removed to make an open box.",
        "Find the new surface area."
      ),
      correct: "188 cm^2",
      wrong: ["200 cm^2", "240 cm^2", "160 cm^2"],
      explanation: L(
        "Step 1: Original surface area = 2(lw + lh + wh) = 2(60 + 40 + 24) = 248 cm^2.",
        "Step 2: Remove the top face area 10 × 6 = 60 cm^2.",
        "Step 3: New surface area = 248 - 60 = 188 cm^2.",
        "Final answer: 188 cm^2"
      ),
    },
  ],
  "geometry|volume__Foundation Tier": [
    {
      question: L(
        "A cuboid has base 8 cm by 5 cm and is filled with water to a depth of 2.5 cm.",
        "Find the volume of water in the cuboid."
      ),
      correct: "100 cm^3",
      wrong: ["80 cm^3", "120 cm^3", "150 cm^3"],
      explanation: L(
        "Step 1: Base area = 8 × 5 = 40 cm^2.",
        "Step 2: Volume = base area × depth = 40 × 2.5 = 100 cm^3.",
        "Final answer: 100 cm^3"
      ),
    },
    {
      question: L(
        "A cylinder has radius 4 cm and height 9 cm.",
        "Find its volume and give the answer in litres. (1 cm^3 = 1 ml)."
      ),
      correct: "0.144\\pi litres",
      wrong: ["1.44\\pi litres", "0.144 litres", "0.36\\pi litres"],
      explanation: L(
        "Step 1: Volume = \\pi r^2h = \\pi × 4^2 × 9 = 144\\pi cm^3.",
        "Step 2: 1000 cm^3 = 1 litre, so 144\\pi cm^3 = 0.144\\pi litres.",
        "Step 3: 0.144\\pi litres is the exact value.",
        "Final answer: 0.144\\pi litres"
      ),
    },
  ],
  "geometry|volume__Higher Tier": [
    {
      question: L(
        "A prism has a trapezium cross-section with parallel sides 6 cm and 10 cm, height 4 cm.",
        "The length of the prism is 15 cm.",
        "Find the volume of the prism."
      ),
      correct: "480 cm^3",
      wrong: ["360 cm^3", "420 cm^3", "540 cm^3"],
      explanation: L(
        "Step 1: Area of trapezium = 1/2(a + b)h = 1/2(6 + 10)×4 = 32 cm^2.",
        "Step 2: Volume = area × length = 32 × 15 = 480 cm^3.",
        "Final answer: 480 cm^3"
      ),
    },
    {
      question: L(
        "A cone has radius 5 cm and height 12 cm.",
        "Find its volume in terms of π."
      ),
      correct: "100\\pi cm^3",
      wrong: ["300\\pi cm^3", "120\\pi cm^3", "60\\pi cm^3"],
      explanation: L(
        "Step 1: Volume of a cone = 1/3 \\pi r^2h.",
        "Step 2: Substitute r = 5 and h = 12: V = 1/3 × \\pi × 25 × 12.",
        "Step 3: 25 × 12 = 300, and 1/3 of 300 is 100.",
        "Final answer: 100\\pi cm^3"
      ),
    },
  ],
  "number|recurring_decimals__Foundation Tier": [
    {
      question: L(
        "Let x = 0.\\overline{6} (recurring).",
        "Write x as a fraction and then find 5x.",
        "What is 5x as a fraction in simplest form?"
      ),
      correct: "10/3",
      wrong: ["5/3", "15/3", "10/6"],
      explanation: L(
        "Step 1: x = 0.666... so 10x = 6.666...",
        "Step 2: Subtract: 10x - x = 6.666... - 0.666... = 6.",
        "Step 3: 9x = 6 so x = 6/9 = 2/3.",
        "Step 4: 5x = 5 × 2/3 = 10/3.",
        "Final answer: 10/3"
      ),
    },
    {
      question: L(
        "Let x = 0.\\overline{12} (recurring).",
        "Write x as a fraction and then find 3x + 0.4.",
        "Give your answer as a fraction in simplest form."
      ),
      correct: "42/55",
      wrong: ["8/11", "22/55", "4/11"],
      explanation: L(
        "Step 1: x = 0.1212..., so 100x = 12.12...",
        "Step 2: Subtract: 100x - x = 12.12... - 0.12... = 12.",
        "Step 3: 99x = 12 so x = 12/99 = 4/33.",
        "Step 4: 3x = 12/33 = 4/11.",
        "Step 5: 0.4 = 2/5, so 3x + 0.4 = 4/11 + 2/5 = (20 + 22)/55 = 42/55.",
        "Final answer: 42/55"
      ),
    },
  ],
  "number|recurring_decimals__Higher Tier": [
    {
      question: L(
        "Let x = 0.\\overline{45} (recurring).",
        "Write x as a fraction and then find 2x + 0.1.",
        "Give your answer as a fraction."
      ),
      correct: "111/110",
      wrong: ["11/10", "21/22", "101/110"],
      explanation: L(
        "Step 1: x = 0.4545..., so 100x = 45.45...",
        "Step 2: Subtract: 100x - x = 45.45... - 0.45... = 45.",
        "Step 3: 99x = 45 so x = 45/99 = 5/11.",
        "Step 4: 2x = 10/11 and 0.1 = 1/10.",
        "Step 5: 2x + 0.1 = 10/11 + 1/10 = (100 + 11)/110 = 111/110.",
        "Final answer: 111/110"
      ),
    },
    {
      question: L(
        "Let x = 0.\\overline{3} and y = 0.\\overline{6} (recurring).",
        "Find x + y and write the result as a fraction."
      ),
      correct: "1",
      wrong: ["2/3", "4/3", "5/6"],
      explanation: L(
        "Step 1: x = 0.333... = 1/3.",
        "Step 2: y = 0.666... = 2/3.",
        "Step 3: x + y = 1/3 + 2/3 = 1.",
        "Final answer: 1"
      ),
    },
  ],
  "number|hcf_lcm__Foundation Tier": [
    {
      question: L(
        "Bus A arrives every 12 minutes and Bus B arrives every 18 minutes.",
        "They leave together at 9:00. After how many minutes will they next leave together?"
      ),
      correct: "36",
      wrong: ["30", "54", "216"],
      explanation: L(
        "Step 1: Find the LCM of 12 and 18.",
        "Step 2: 12 = 2^2 × 3 and 18 = 2 × 3^2.",
        "Step 3: LCM = 2^2 × 3^2 = 36.",
        "Final answer: 36"
      ),
    },
    {
      question: L(
        "A rectangular floor is 84 cm by 126 cm.",
        "Square tiles are used with no cutting.",
        "Find the number of largest square tiles needed."
      ),
      correct: "6",
      wrong: ["4", "8", "12"],
      explanation: L(
        "Step 1: The largest square tile has side length HCF(84, 126).",
        "Step 2: HCF(84, 126) = 42.",
        "Step 3: Number of tiles = (84/42) × (126/42) = 2 × 3 = 6.",
        "Final answer: 6"
      ),
    },
  ],
  "number|hcf_lcm__Higher Tier": [
    {
      question: L(
        "Find the LCM of 12, 15 and 20.",
        "Then find the smallest multiple of this LCM that is greater than 200."
      ),
      correct: "240",
      wrong: ["180", "300", "360"],
      explanation: L(
        "Step 1: 12 = 2^2 × 3, 15 = 3 × 5, 20 = 2^2 × 5.",
        "Step 2: LCM = 2^2 × 3 × 5 = 60.",
        "Step 3: Multiples of 60 above 200 are 240, 300, ... so the smallest is 240.",
        "Final answer: 240"
      ),
    },
    {
      question: L(
        "Two numbers have HCF 18 and LCM 360.",
        "One number is 90. Find the other number."
      ),
      correct: "72",
      wrong: ["54", "108", "120"],
      explanation: L(
        "Step 1: For two numbers, product = HCF × LCM.",
        "Step 2: Product = 18 × 360 = 6480.",
        "Step 3: Other number = 6480 / 90 = 72.",
        "Final answer: 72"
      ),
    },
  ],
  "number|standard_form__Foundation Tier": [
    {
      question: L(
        "Compare 4.8 \\times 10^5 and 7.2 \\times 10^4.",
        "Work out the difference and give your answer in standard form."
      ),
      correct: "4.08 \\times 10^5",
      wrong: ["4.08 \\times 10^4", "4.8 \\times 10^4", "4.8 \\times 10^5"],
      explanation: L(
        "Step 1: Write both numbers with the same power of 10: 7.2 \\times 10^4 = 0.72 \\times 10^5.",
        "Step 2: Subtract: (4.8 - 0.72) \\times 10^5 = 4.08 \\times 10^5.",
        "Step 3: The key insight is matching powers of 10 before subtracting.",
        "Final answer: 4.08 \\times 10^5"
      ),
    },
    {
      question: L(
        "A distance is 3.6 \\times 10^6 m and another is 9.0 \\times 10^5 m.",
        "How much longer is the first distance? Give your answer in standard form."
      ),
      correct: "2.7 \\times 10^6",
      wrong: ["2.7 \\times 10^5", "3.6 \\times 10^6", "4.5 \\times 10^6"],
      explanation: L(
        "Step 1: Write 9.0 \\times 10^5 as 0.9 \\times 10^6.",
        "Step 2: Subtract: (3.6 - 0.9) \\times 10^6 = 2.7 \\times 10^6.",
        "Step 3: Keeping the same power of 10 avoids place-value errors.",
        "Final answer: 2.7 \\times 10^6"
      ),
    },
  ],
  "number|standard_form__Higher Tier": [
    {
      question: L(
        "Calculate (6.4 \\times 10^5) \\div (2 \\times 10^3).",
        "Give your answer in standard form."
      ),
      correct: "3.2 \\times 10^2",
      wrong: ["3.2 \\times 10^8", "12.8 \\times 10^2", "3.2 \\times 10^3"],
      explanation: L(
        "Step 1: Divide the numbers: 6.4 \\div 2 = 3.2.",
        "Step 2: Subtract the powers: 10^5 \\div 10^3 = 10^2.",
        "Step 3: Combine to get 3.2 \\times 10^2.",
        "Final answer: 3.2 \\times 10^2"
      ),
    },
    {
      question: L(
        "Calculate (3.5 \\times 10^4) \\times (2.4 \\times 10^2).",
        "Give your answer in standard form."
      ),
      correct: "8.4 \\times 10^6",
      wrong: ["8.4 \\times 10^4", "8.4 \\times 10^8", "8.9 \\times 10^6"],
      explanation: L(
        "Step 1: Multiply the numbers: 3.5 \\times 2.4 = 8.4.",
        "Step 2: Add the powers: 10^4 \\times 10^2 = 10^6.",
        "Step 3: Check that 8.4 is between 1 and 10, so this is standard form.",
        "Final answer: 8.4 \\times 10^6"
      ),
    },
  ],
  "geometry|bearings__Foundation Tier": [
    {
      question: L(
        "Point A is 5 km due east of point O.",
        "Point B is 5 km due south of point O.",
        "Find the three-figure bearing of B from A."
      ),
      correct: "225°",
      wrong: ["135°", "045°", "315°"],
      image: `${IMAGE_PREFIX}/bearings_right_angle.svg`,
      imageAlt: "Compass diagram with O, A due east of O, and B due south of O.",
      explanation: L(
        "Step 1: From A to B you move 5 km west and 5 km south, so the direction is south-west.",
        "Step 2: The line makes a 45° angle with the south direction because the distances are equal.",
        "Step 3: Bearings are measured clockwise from north, so 180° + 45° = 225°.",
        "Common mistake: giving 135° by measuring from north in the wrong direction.",
        "Final answer: 225°"
      ),
    },
    {
      question: L(
        "From point P, Q is 8 km due north.",
        "From Q, R is 6 km due east.",
        "Find the three-figure bearing of R from P."
      ),
      correct: "037°",
      wrong: ["053°", "143°", "217°"],
      image: `${IMAGE_PREFIX}/bearings_step.svg`,
      imageAlt: "Two-step journey: from P to Q due north, then Q to R due east.",
      explanation: L(
        "Step 1: Draw the right-angled triangle with north as the vertical side (8) and east as the horizontal side (6).",
        "Step 2: The angle east of north is \\tan^{-1}(6/8) = \\tan^{-1}(3/4) \\approx 36.9°.",
        "Step 3: Bearings are clockwise from north, so the bearing is 037°.",
        "Common mistake: giving 053° by swapping opposite and adjacent.",
        "Final answer: 037°"
      ),
    },
  ],
  "geometry|bearings__Higher Tier": [
    {
      question: L(
        "From A, B is 12 km on a bearing of 060°.",
        "From A, C is 9 km on a bearing of 150°.",
        "Find the distance BC."
      ),
      correct: "15 km",
      wrong: ["12 km", "18 km", "9 km"],
      image: `${IMAGE_PREFIX}/bearings_two_rays.svg`,
      imageAlt: "Two rays from A with bearings 060° and 150° to points B and C.",
      explanation: L(
        "Step 1: The angle between the two bearings is 150° - 60° = 90°.",
        "Step 2: Triangle ABC is right-angled at A, with AB = 12 and AC = 9.",
        "Step 3: Use Pythagoras: BC^2 = 12^2 + 9^2 = 144 + 81 = 225.",
        "Step 4: BC = 15 km.",
        "Common mistake: using cosine rule with the wrong included angle.",
        "Final answer: 15 km"
      ),
    },
    {
      question: L(
        "From point X, Y is 10 km on a bearing of 030°.",
        "From point X, Z is 13 km on a bearing of 120°.",
        "Find the distance YZ to 1 decimal place."
      ),
      correct: "16.4 km",
      wrong: ["14.9 km", "18.3 km", "12.8 km"],
      image: `${IMAGE_PREFIX}/bearings_two_rays_30_120.svg`,
      imageAlt: "Two rays from X with bearings 030° and 120° to points Y and Z.",
      explanation: L(
        "Step 1: The angle between the bearings is 120° - 30° = 90°.",
        "Step 2: Triangle XYZ is right-angled at X with legs 10 and 13.",
        "Step 3: Pythagoras gives YZ = \\sqrt{10^2 + 13^2} = \\sqrt{269} \\approx 16.4 km.",
        "Common mistake: subtracting the distances because the bearings differ.",
        "Final answer: 16.4 km"
      ),
    },
  ],
  "geometry|perimeter_area__Foundation Tier": [
    {
      question: L(
        "An L-shaped figure is made by removing a 5 cm by 3 cm rectangle from a 12 cm by 8 cm rectangle.",
        "Find the perimeter of the L-shaped figure."
      ),
      correct: "40 cm",
      wrong: ["36 cm", "46 cm", "30 cm"],
      image: `${IMAGE_PREFIX}/l_shape_perimeter.svg`,
      imageAlt: "L-shaped figure with outer rectangle 12 by 8 and a 5 by 3 cut-out.",
      explanation: L(
        "Step 1: Work around the outside and include the inner corner created by the cut-out.",
        "Step 2: The missing top segment is 12 - 5 = 7 and the missing side segment is 8 - 3 = 5.",
        "Step 3: Perimeter = 7 + 3 + 5 + 5 + 12 + 8 = 40 cm.",
        "Common mistake: using the outer rectangle perimeter only.",
        "Final answer: 40 cm"
      ),
    },
    {
      question: L(
        "A rectangle has length 14 cm and width 9 cm.",
        "A 6 cm by 4 cm rectangle is cut out from one corner.",
        "Find the area of the remaining shape."
      ),
      correct: "102 cm^2",
      wrong: ["126 cm^2", "78 cm^2", "98 cm^2"],
      explanation: L(
        "Step 1: Area of the full rectangle = 14 × 9 = 126 cm^2.",
        "Step 2: Area removed = 6 × 4 = 24 cm^2.",
        "Step 3: Remaining area = 126 - 24 = 102 cm^2.",
        "Final answer: 102 cm^2"
      ),
    },
  ],
  "geometry|perimeter_area__Higher Tier": [
    {
      question: L(
        "A rectangle has area 96 cm^2.",
        "One side is 2 cm longer than the other.",
        "Find the perimeter of the rectangle."
      ),
      correct: "36 cm",
      wrong: ["32 cm", "40 cm", "44 cm"],
      explanation: L(
        "Step 1: Let the shorter side be x, so the longer side is x + 2.",
        "Step 2: Area gives x(x + 2) = 96 → x^2 + 2x - 96 = 0.",
        "Step 3: Factor: (x + 12)(x - 8) = 0, so x = 8.",
        "Step 4: Sides are 8 and 10, perimeter = 2(8 + 10) = 36 cm.",
        "Common mistake: using the negative root or forgetting to double.",
        "Final answer: 36 cm"
      ),
    },
    {
      question: L(
        "A semicircle of radius 7 cm is attached to the side of a 14 cm by 10 cm rectangle.",
        "The diameter is along the 14 cm side.",
        "Find the perimeter of the shape in terms of π."
      ),
      correct: "34 + 7\\pi cm",
      wrong: ["28 + 7\\pi cm", "34 + 14\\pi cm", "24 + 7\\pi cm"],
      explanation: L(
        "Step 1: The straight edges are the three outer sides of the rectangle: 14 + 10 + 10 = 34 cm.",
        "Step 2: The curved edge is half the circumference of a circle with radius 7: (1/2)·2\\pi r = 7\\pi.",
        "Step 3: Total perimeter = 34 + 7\\pi cm.",
        "Common mistake: adding the full circumference or including the diameter again.",
        "Final answer: 34 + 7\\pi cm"
      ),
    },
  ],
  "probability|conditional__Foundation Tier": [
    {
      question: L(
        "A bag contains 5 red counters and 3 blue counters.",
        "A counter is chosen at random and not replaced.",
        "A second counter is then chosen.",
        "Find the probability the second counter is blue given the first was red."
      ),
      correct: "3/7",
      wrong: ["3/8", "2/7", "3/6"],
      explanation: L(
        "Step 1: Given the first was red, there are now 4 red and 3 blue left.",
        "Step 2: Total remaining counters = 7, blue counters = 3.",
        "Step 3: Probability = 3/7.",
        "Common mistake: using the original total of 8.",
        "Final answer: 3/7"
      ),
    },
    {
      question: L(
        "A spinner has 8 equal sections: 3 are green, 5 are yellow.",
        "It is spun twice.",
        "Find the probability of getting a green on the second spin given the first spin was yellow."
      ),
      correct: "3/8",
      wrong: ["3/5", "5/8", "3/13"],
      explanation: L(
        "Step 1: The spins are independent, so the first result does not change the spinner.",
        "Step 2: The probability of green on any spin is 3/8.",
        "Step 3: Therefore P(green on second | first yellow) = 3/8.",
        "Common mistake: treating spins as without replacement.",
        "Final answer: 3/8"
      ),
    },
  ],
  "probability|conditional__Higher Tier": [
    {
      question: L(
        "A box has 4 red and 6 blue balls.",
        "Two balls are taken at random without replacement.",
        "Find the probability that the second ball is red given the first is blue."
      ),
      correct: "4/9",
      wrong: ["4/10", "3/9", "5/9"],
      explanation: L(
        "Step 1: Given the first is blue, 4 red and 5 blue remain.",
        "Step 2: Total remaining = 9, reds = 4.",
        "Step 3: Probability = 4/9.",
        "Common mistake: using the original total of 10.",
        "Final answer: 4/9"
      ),
    },
    {
      question: L(
        "In a class, 12 students take Maths, 18 take Biology and 8 take both.",
        "A student is chosen at random from the class and is known to take Maths.",
        "Find the probability that the student also takes Biology."
      ),
      correct: "2/3",
      wrong: ["4/9", "8/18", "1/3"],
      explanation: L(
        "Step 1: Given the student takes Maths, the relevant total is 12.",
        "Step 2: Of those 12, the number who also take Biology is 8.",
        "Step 3: Probability = 8/12 = 2/3.",
        "Common mistake: dividing by the total class size instead of 12.",
        "Final answer: 2/3"
      ),
    },
  ],
  "algebra|equations__Foundation Tier": [
    {
      question: L(
        "A number is increased by 7 and then multiplied by 3 to give 60.",
        "Find the number."
      ),
      correct: "13",
      wrong: ["11", "20", "27"],
      explanation: L(
        "Key insight: undo operations in reverse order.",
        "Step 1: Divide 60 by 3 to undo the multiplication: 60 ÷ 3 = 20.",
        "Step 2: Subtract 7 to undo the increase: 20 - 7 = 13.",
        "Final answer: 13"
      ),
    },
    {
      question: L(
        "The perimeter of a rectangle is 46 cm.",
        "The length is 4 cm more than the width.",
        "Find the width."
      ),
      correct: "9.5 cm",
      wrong: ["8.5 cm", "10 cm", "11 cm"],
      explanation: L(
        "Key insight: use 2(l + w) with l = w + 4.",
        "Step 1: 2(w + w + 4) = 46 → 4w + 8 = 46.",
        "Step 2: 4w = 38 so w = 38 ÷ 4 = 9.5.",
        "Final answer: 9.5 cm"
      ),
    },
  ],
  "algebra|equations__Higher Tier": [
    {
      question: L(
        "Solve 3(2x - 5) = 4(x + 1) + 7."
      ),
      correct: "13",
      wrong: ["7", "3", "18"],
      explanation: L(
        "Key insight: expand both sides, then collect x-terms on one side.",
        "Step 1: 6x - 15 = 4x + 11.",
        "Step 2: 2x = 26, so x = 13.",
        "Final answer: 13"
      ),
    },
    {
      question: L(
        "Solve \\frac{x - 3}{4} + \\frac{x + 1}{3} = 5.",
        "Give your answer as an exact fraction."
      ),
      correct: "\\frac{65}{7}",
      wrong: ["\\frac{55}{7}", "9", "8"],
      explanation: L(
        "Key insight: clear the fractions first.",
        "Step 1: Multiply by 12: 3(x - 3) + 4(x + 1) = 60.",
        "Step 2: 3x - 9 + 4x + 4 = 60 → 7x - 5 = 60.",
        "Step 3: 7x = 65, so x = 65/7.",
        "Final answer: \\frac{65}{7}"
      ),
    },
  ],
  "algebra|inequalities__Foundation Tier": [
    {
      question: L(
        "Solve 2x + 5 \\le 17.",
        "Give the greatest integer value of x."
      ),
      correct: "6",
      wrong: ["5", "7", "8"],
      explanation: L(
        "Key insight: solve the inequality, then choose the greatest integer.",
        "Step 1: 2x \\le 12, so x \\le 6.",
        "Step 2: The greatest integer that fits is 6.",
        "Final answer: 6"
      ),
    },
    {
      question: L(
        "Solve 3 - x > -4.",
        "Write your answer as an inequality."
      ),
      correct: "x < 7",
      wrong: ["x > 7", "x \\le 7", "x < -7"],
      explanation: L(
        "Key insight: remember to reverse the sign when multiplying by -1.",
        "Step 1: -x > -7.",
        "Step 2: Multiply by -1, so x < 7.",
        "Final answer: x < 7"
      ),
    },
  ],
  "algebra|inequalities__Higher Tier": [
    {
      question: L(
        "Solve 5 - 2x > x + 8.",
        "Write the solution as an inequality."
      ),
      correct: "x < -1",
      wrong: ["x > -1", "x \\le -1", "x < 1"],
      explanation: L(
        "Key insight: collect x-terms and flip the sign when dividing by a negative.",
        "Step 1: -3x > 3.",
        "Step 2: Divide by -3, so x < -1.",
        "Final answer: x < -1"
      ),
    },
    {
      question: L(
        "Solve 4x - 7 \\le 3(2 - x).",
        "Give your answer as an inequality."
      ),
      correct: "x \\le \\frac{13}{7}",
      wrong: ["x \\ge \\frac{13}{7}", "x \\le \\frac{7}{13}", "x < \\frac{13}{7}"],
      explanation: L(
        "Key insight: expand the bracket, then collect x-terms.",
        "Step 1: 4x - 7 \\le 6 - 3x.",
        "Step 2: 7x \\le 13, so x \\le 13/7.",
        "Final answer: x \\le \\frac{13}{7}"
      ),
    },
  ],
  "number|rounding_bounds__Foundation Tier": [
    {
      question: L(
        "A length is 5.2 cm correct to the nearest 0.1 cm.",
        "Which interval contains the true length?"
      ),
      correct: "5.15 \\le L < 5.25",
      wrong: ["5.1 \\le L < 5.3", "5.2 \\le L < 5.3", "5.15 < L \\le 5.25"],
      explanation: L(
        "Key insight: half the rounding unit gives the bounds.",
        "Step 1: Nearest 0.1 means ±0.05.",
        "Step 2: So 5.15 ≤ L < 5.25.",
        "Final answer: 5.15 \\le L < 5.25"
      ),
    },
    {
      question: L(
        "The side of a square is 7.4 cm correct to the nearest 0.1 cm.",
        "Find the lower bound of the area."
      ),
      correct: "54.0225 cm^2",
      wrong: ["54.76 cm^2", "53.29 cm^2", "55.24 cm^2"],
      explanation: L(
        "Key insight: use the lower bound for the side.",
        "Step 1: Lower bound for the side is 7.35 cm.",
        "Step 2: Area lower bound = 7.35^2 = 54.0225 cm^2.",
        "Final answer: 54.0225 cm^2"
      ),
    },
  ],
  "number|rounding_bounds__Higher Tier": [
    {
      question: L(
        "Length is 12.3 cm correct to the nearest 0.1 cm and width is 7.8 cm correct to the nearest 0.1 cm.",
        "Find the upper bound for the area."
      ),
      correct: "96.9475 cm^2",
      wrong: ["96.33 cm^2", "97.54 cm^2", "95.77 cm^2"],
      explanation: L(
        "Key insight: upper bound uses the upper values for both dimensions.",
        "Step 1: Upper bounds are 12.35 and 7.85.",
        "Step 2: Area upper bound = 12.35 × 7.85 = 96.9475 cm^2.",
        "Final answer: 96.9475 cm^2"
      ),
    },
    {
      question: L(
        "A journey is 18.6 km correct to the nearest 0.1 km.",
        "The time taken is 0.8 h correct to the nearest 0.1 h.",
        "Find the upper bound for the speed, to 2 decimal places."
      ),
      correct: "24.87 km/h",
      wrong: ["23.25 km/h", "25.33 km/h", "24.00 km/h"],
      explanation: L(
        "Key insight: max speed = max distance ÷ min time.",
        "Step 1: Upper bound distance = 18.65 km.",
        "Step 2: Lower bound time = 0.75 h.",
        "Step 3: Upper bound speed = 18.65 ÷ 0.75 = 24.866... km/h.",
        "Step 4: To 2 d.p., this is 24.87 km/h.",
        "Final answer: 24.87 km/h"
      ),
    },
  ],
  "ratio|ratio_share__Foundation Tier": [
    {
      question: L(
        "£360 is shared between A, B and C in the ratio 2 : 3 : 5.",
        "A gives £18 to C.",
        "Find the new ratio A : B : C."
      ),
      correct: "3 : 6 : 11",
      wrong: ["2 : 3 : 5", "3 : 5 : 12", "4 : 6 : 10"],
      explanation: L(
        "Key insight: find actual amounts before adjusting.",
        "Step 1: Total parts = 10, so each part is £36.",
        "Step 2: A = 72, B = 108, C = 180.",
        "Step 3: After A gives £18 to C: A = 54, B = 108, C = 198.",
        "Step 4: Ratio 54:108:198 simplifies to 3:6:11.",
        "Final answer: 3 : 6 : 11"
      ),
    },
    {
      question: L(
        "A and B share 48 stickers in the ratio 5 : 3.",
        "B then receives 6 stickers from A.",
        "Find the new ratio A : B."
      ),
      correct: "1 : 1",
      wrong: ["5 : 3", "4 : 5", "2 : 3"],
      explanation: L(
        "Key insight: convert the ratio to actual numbers, then adjust.",
        "Step 1: Total parts = 8, so each part is 48 ÷ 8 = 6.",
        "Step 2: A = 30, B = 18.",
        "Step 3: After moving 6 from A to B: A = 24, B = 24.",
        "Step 4: Ratio 24:24 = 1:1.",
        "Final answer: 1 : 1"
      ),
    },
  ],
  "ratio|ratio_share__Higher Tier": [
    {
      question: L(
        "£540 is shared between A, B and C in the ratio 2 : 3 : 4.",
        "B gives 10% of his share to C.",
        "Find the new ratio A : B : C."
      ),
      correct: "20 : 27 : 43",
      wrong: ["2 : 3 : 4", "10 : 13 : 17", "18 : 27 : 45"],
      explanation: L(
        "Key insight: work with actual values, then simplify.",
        "Step 1: Total parts = 9, so each part is £60.",
        "Step 2: A = 120, B = 180, C = 240.",
        "Step 3: 10% of B is 18, so B = 162 and C = 258.",
        "Step 4: Ratio 120:162:258 simplifies by 6 to 20:27:43.",
        "Final answer: 20 : 27 : 43"
      ),
    },
    {
      question: L(
        "A : B = 7 : 5 and A is £36 more than B.",
        "Find the total amount A + B."
      ),
      correct: "£216",
      wrong: ["£180", "£252", "£144"],
      explanation: L(
        "Key insight: the difference is 2 parts.",
        "Step 1: 2 parts = £36, so 1 part = £18.",
        "Step 2: A = 7 × 18 = £126 and B = 5 × 18 = £90.",
        "Step 3: Total = 126 + 90 = £216.",
        "Final answer: £216"
      ),
    },
  ],
  "ratio|reverse_percentages__Foundation Tier": [
    {
      question: L(
        "A jacket is reduced by 20% and now costs £48.",
        "Find the original price."
      ),
      correct: "£60",
      wrong: ["£54", "£58", "£64"],
      explanation: L(
        "Key insight: 80% of the original equals £48.",
        "Step 1: Original price = 48 ÷ 0.8 = 60.",
        "Final answer: £60"
      ),
    },
    {
      question: L(
        "After a 10% increase, the price is £110.",
        "Find the original price."
      ),
      correct: "£100",
      wrong: ["£90", "£105", "£120"],
      explanation: L(
        "Key insight: 110% of the original equals £110.",
        "Step 1: Original price = 110 ÷ 1.1 = 100.",
        "Final answer: £100"
      ),
    },
  ],
  "ratio|reverse_percentages__Higher Tier": [
    {
      question: L(
        "A coat is reduced by 20% and then 5% VAT is added to the reduced price.",
        "The final price is £252.",
        "Find the original price."
      ),
      correct: "£300",
      wrong: ["£280", "£315", "£330"],
      explanation: L(
        "Key insight: apply reverse operations with a multiplier.",
        "Step 1: Final price = original × 0.8 × 1.05.",
        "Step 2: 0.8 × 1.05 = 0.84, so original = 252 ÷ 0.84 = 300.",
        "Final answer: £300"
      ),
    },
    {
      question: L(
        "A town's population decreases by 12% and then increases by 5%.",
        "The final population is 9240.",
        "Find the original population."
      ),
      correct: "10000",
      wrong: ["9800", "10400", "11200"],
      explanation: L(
        "Key insight: use the combined multiplier 0.88 × 1.05.",
        "Step 1: 0.88 × 1.05 = 0.924.",
        "Step 2: Original = 9240 ÷ 0.924 = 10000.",
        "Final answer: 10000"
      ),
    },
  ],
  "statistics|two_way_tables__Foundation Tier": [
    {
      question: L(
        "The table shows a class of 30 students.",
        "\\\\begin{array}{c|cc|c}",
        " & \\\\text{Drama} & \\\\text{Music} & \\\\text{Total} \\\\ \\\\hline",
        "\\\\text{Boys} & 8 & ? & 14 \\\\",
        "\\\\text{Girls} & 6 & 10 & 16 \\\\",
        "\\\\hline",
        "\\\\text{Total} & 14 & 16 & 30",
        "\\\\end{array}",
        "Find the number of boys who chose Music."
      ),
      correct: "6",
      wrong: ["8", "10", "14"],
      explanation: L(
        "Key insight: use the row total for boys.",
        "Step 1: Boys total = 14, boys in Drama = 8.",
        "Step 2: Boys in Music = 14 - 8 = 6.",
        "Final answer: 6"
      ),
    },
    {
      question: L(
        "The table shows a class of 30 students.",
        "\\\\begin{array}{c|cc|c}",
        " & \\\\text{Drama} & \\\\text{Music} & \\\\text{Total} \\\\ \\\\hline",
        "\\\\text{Boys} & 8 & 6 & 14 \\\\",
        "\\\\text{Girls} & 6 & 10 & 16 \\\\",
        "\\\\hline",
        "\\\\text{Total} & 14 & 16 & 30",
        "\\\\end{array}",
        "Find the probability that a student chose Music given that the student is a girl."
      ),
      correct: "5/8",
      wrong: ["1/2", "5/16", "10/30"],
      explanation: L(
        "Key insight: condition on the girls row.",
        "Step 1: Total girls = 16, girls in Music = 10.",
        "Step 2: Probability = 10/16 = 5/8.",
        "Final answer: 5/8"
      ),
    },
  ],
  "statistics|two_way_tables__Higher Tier": [
    {
      question: L(
        "The table shows exam results.",
        "\\\\begin{array}{c|cc|c}",
        " & \\\\text{Pass} & \\\\text{Fail} & \\\\text{Total} \\\\ \\\\hline",
        "\\\\text{Foundation} & 18 & ? & 30 \\\\",
        "\\\\text{Higher} & ? & 12 & 40 \\\\",
        "\\\\hline",
        "\\\\text{Total} & 50 & 20 & 70",
        "\\\\end{array}",
        "Find the probability that a student was Higher tier given that they passed."
      ),
      correct: "16/25",
      wrong: ["9/25", "32/70", "8/25"],
      explanation: L(
        "Key insight: complete the table before finding the conditional probability.",
        "Step 1: Pass total is 50, so Higher passes = 50 - 18 = 32.",
        "Step 2: Given the student passed, the relevant total is 50.",
        "Step 3: Probability = 32/50 = 16/25.",
        "Final answer: 16/25"
      ),
    },
    {
      question: L(
        "A survey records whether students study Maths or Physics.",
        "\\\\begin{array}{c|cc|c}",
        " & \\\\text{Physics} & \\\\text{Not Physics} & \\\\text{Total} \\\\ \\\\hline",
        "\\\\text{Maths} & 14 & 6 & 20 \\\\",
        "\\\\text{Not Maths} & 9 & ? & 30 \\\\",
        "\\\\hline",
        "\\\\text{Total} & 23 & 27 & 50",
        "\\\\end{array}",
        "Find the probability that a student studies Maths given that they study Physics."
      ),
      correct: "14/23",
      wrong: ["14/50", "20/50", "23/50"],
      explanation: L(
        "Key insight: condition on the Physics column.",
        "Step 1: Physics total = 23, Maths and Physics = 14.",
        "Step 2: Probability = 14/23.",
        "Final answer: 14/23"
      ),
    },
  ],
};

const TOPIC_LABELS = {
  algebra: "Algebra",
  number: "Number",
  geometry: "Geometry & Measures",
  ratio: "Ratio & Proportion",
  probability: "Probability",
  statistics: "Statistics",
};

async function main() {
  const changes = [];

  if (Object.keys(SVG_ASSETS).length) {
    console.log("Uploading upgraded SVG diagrams...");
    for (const [name, svg] of Object.entries(SVG_ASSETS)) {
      await uploadSvg(`${IMAGE_PREFIX}/${name}.svg`, svg);
    }
  }

  for (const [key, replacements] of Object.entries(PREMIUM_REPLACEMENTS)) {
    const [subtopic, tier] = key.split("__");
    const topicKey = subtopic.split("|")[0];
    const questionType = TOPIC_LABELS[topicKey] || "Mixed";

    const res = await supabaseFetch(
      `/rest/v1/exam_questions?select=id,question,explanation,subtopic,tier,question_type,calculator,difficulty,marks,estimated_time_sec,image_url,image_alt&subtopic=eq.${encodeURIComponent(
        subtopic
      )}&tier=eq.${encodeURIComponent(tier)}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Fetch failed for ${key}: ${res.status} ${text}`);
    }
    const rows = await res.json();
    if (rows.length !== 20) {
      console.warn(`Warning: expected 20 rows for ${key}, found ${rows.length}`);
    }

    const ranked = rankWeakRows(rows);
    const toReplace = ranked.slice(0, replacements.length);

    for (let i = 0; i < toReplace.length; i++) {
      const target = toReplace[i].row;
      const replacement = replacements[i];

      const wrongAnswers = replacement.wrong;
      const allAnswers = shuffle([replacement.correct, ...wrongAnswers]);

      const payload = {
        question: replacement.question,
        correct_answer: replacement.correct,
        wrong_answers: wrongAnswers,
        all_answers: allAnswers,
        explanation: replacement.explanation,
        question_type: questionType,
        subtopic: subtopic,
        tier: tier,
        calculator: target.calculator,
        difficulty: target.difficulty,
        marks: target.marks,
        estimated_time_sec: target.estimated_time_sec,
        image_url: replacement.image || null,
        image_alt: replacement.image ? replacement.imageAlt || "" : null,
      };

      const updateRes = await supabaseFetch(`/rest/v1/exam_questions?id=eq.${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });

      if (!updateRes.ok) {
        const text = await updateRes.text().catch(() => "");
        throw new Error(`Update failed for ${target.id}: ${updateRes.status} ${text}`);
      }

      changes.push({
        id: target.id,
        subtopic,
        tier,
        old_question: target.question,
        new_question: replacement.question,
      });
    }
  }

  const outDir = path.resolve(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "exam_questions_upgrade_log.json"), JSON.stringify(changes, null, 2));

  console.log(`Updated ${changes.length} questions.`);
  console.log(`Log saved to tmp/exam_questions_upgrade_log.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
