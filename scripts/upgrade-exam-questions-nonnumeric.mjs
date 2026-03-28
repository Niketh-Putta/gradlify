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

function rankWeakRows(rows) {
  return rows
    .map((row) => {
      const qLen = normalizeText(row.question).length;
      const eLen = normalizeText(row.explanation).length;
      const score = (qLen < 60 ? 2 : 0) + (eLen < 180 ? 2 : 0);
      return { row, score, qLen, eLen };
    })
    .sort((a, b) => b.score - a.score || a.qLen - b.qLen);
}

const TOPIC_LABELS = {
  algebra: "Algebra",
  number: "Number",
  geometry: "Geometry & Measures",
  ratio: "Ratio & Proportion",
  probability: "Probability",
  statistics: "Statistics",
};

const REPLACEMENTS = {
  "algebra|expand__Foundation Tier": [
    {
      question: L(
        "A rectangle has sides (2x + 3) cm and (x - 5) cm.",
        "Write an expression for the area and simplify."
      ),
      correct: "2x^2 - 7x - 15",
      wrong: ["2x^2 + 7x - 15", "2x^2 - 15x + 7", "x^2 - 7x - 15"],
      explanation: L(
        "Key insight: area = length × width, then expand carefully.",
        "Step 1: (2x + 3)(x - 5) = 2x^2 - 10x + 3x - 15.",
        "Step 2: Combine like terms to get 2x^2 - 7x - 15.",
        "Final answer: 2x^2 - 7x - 15"
      ),
    },
  ],
  "algebra|expand__Higher Tier": [
    {
      question: L(
        "Expand and simplify (3x - 2)(2x + 5) - (x - 4)^2."
      ),
      correct: "5x^2 + 19x - 26",
      wrong: ["5x^2 + 3x - 26", "6x^2 + 19x - 26", "5x^2 - 19x - 26"],
      explanation: L(
        "Key insight: expand each bracket, then subtract the second expression.",
        "Step 1: (3x - 2)(2x + 5) = 6x^2 + 11x - 10.",
        "Step 2: (x - 4)^2 = x^2 - 8x + 16.",
        "Step 3: Subtract: 6x^2 + 11x - 10 - (x^2 - 8x + 16) = 5x^2 + 19x - 26.",
        "Final answer: 5x^2 + 19x - 26"
      ),
    },
  ],
  "algebra|factorise__Foundation Tier": [
    {
      question: L(
        "A rectangle has area x^2 + 9x + 20.",
        "Write the area as a product of two linear factors."
      ),
      correct: "(x + 5)(x + 4)",
      wrong: ["(x - 5)(x + 4)", "(x + 10)(x + 2)", "(x + 6)(x + 3)"],
      explanation: L(
        "Key insight: find two numbers that multiply to 20 and add to 9.",
        "Step 1: 5 × 4 = 20 and 5 + 4 = 9.",
        "Step 2: So x^2 + 9x + 20 = (x + 5)(x + 4).",
        "Final answer: (x + 5)(x + 4)"
      ),
    },
  ],
  "algebra|factorise__Higher Tier": [
    {
      question: L(
        "Factorise 6x^2 - x - 2 completely."
      ),
      correct: "(3x - 2)(2x + 1)",
      wrong: ["(3x + 2)(2x - 1)", "(6x - 2)(x + 1)", "(3x - 1)(2x + 2)"],
      explanation: L(
        "Key insight: use the ac method and split the middle term.",
        "Step 1: 6 × -2 = -12. Numbers that sum to -1 are -4 and 3.",
        "Step 2: 6x^2 - 4x + 3x - 2 = 2x(3x - 2) + 1(3x - 2).",
        "Step 3: Factor: (3x - 2)(2x + 1).",
        "Final answer: (3x - 2)(2x + 1)"
      ),
    },
  ],
  "algebra|rearranging__Foundation Tier": [
    {
      question: L(
        "Make x the subject of the formula 4y = 3x - 8."
      ),
      correct: "x = \frac{4y + 8}{3}",
      wrong: ["x = \frac{4y - 8}{3}", "x = \frac{3y + 8}{4}", "x = \frac{4y + 8}{4}"],
      explanation: L(
        "Key insight: isolate x by reversing operations.",
        "Step 1: Add 8 to both sides: 4y + 8 = 3x.",
        "Step 2: Divide by 3: x = (4y + 8)/3.",
        "Final answer: x = \frac{4y + 8}{3}"
      ),
    },
  ],
  "algebra|rearranging__Higher Tier": [
    {
      question: L(
        "Make x the subject of the formula \frac{1}{y} = \frac{x - 2}{5}."
      ),
      correct: "x = \frac{5}{y} + 2",
      wrong: ["x = \frac{y}{5} + 2", "x = \frac{1}{5y} + 2", "x = \frac{5}{y - 2}"],
      explanation: L(
        "Key insight: clear the fraction, then isolate x.",
        "Step 1: Multiply both sides by 5: 5/y = x - 2.",
        "Step 2: Add 2: x = 5/y + 2.",
        "Final answer: x = \frac{5}{y} + 2"
      ),
    },
  ],
  "algebra|nth_term__Foundation Tier": [
    {
      question: L(
        "The sequence is 7, 3, -1, -5, ...",
        "Find an expression for the nth term."
      ),
      correct: "-4n + 11",
      wrong: ["4n + 11", "-4n + 7", "-3n + 10"],
      explanation: L(
        "Key insight: this is a linear sequence with common difference -4.",
        "Step 1: nth term has form -4n + c.",
        "Step 2: Substitute n = 1: -4 + c = 7, so c = 11.",
        "Final answer: -4n + 11"
      ),
    },
  ],
  "algebra|nth_term__Higher Tier": [
    {
      question: L(
        "The sequence is 2, 7, 16, 29, 46, ...",
        "Find an expression for the nth term."
      ),
      correct: "2n^2 - n + 1",
      wrong: ["2n^2 + n + 1", "n^2 + 2n + 1", "2n^2 - n - 1"],
      explanation: L(
        "Key insight: the second differences are constant, so it is quadratic.",
        "Step 1: Assume nth term = an^2 + bn + c. Second difference gives 2a = 4, so a = 2.",
        "Step 2: Substitute n = 1 and n = 2 to solve for b and c.",
        "Step 3: This gives b = -1 and c = 1.",
        "Final answer: 2n^2 - n + 1"
      ),
    },
  ],
  "geometry|circles__Foundation Tier": [
    {
      question: L(
        "A circle has circumference 30\pi cm.",
        "Find the radius."
      ),
      correct: "15 cm",
      wrong: ["10 cm", "12.5 cm", "30 cm"],
      explanation: L(
        "Key insight: C = 2\pi r.",
        "Step 1: 2\pi r = 30\pi.",
        "Step 2: r = 15 cm.",
        "Final answer: 15 cm"
      ),
    },
  ],
  "geometry|circles__Higher Tier": [
    {
      question: L(
        "A circular garden has area 196\pi m^2.",
        "A path of width 1 m is built around the outside.",
        "Find the area of the path."
      ),
      correct: "29\pi m^2",
      wrong: ["28\pi m^2", "30\pi m^2", "49\pi m^2"],
      explanation: L(
        "Key insight: find both areas and subtract.",
        "Step 1: Original radius r = 14, new radius = 15.",
        "Step 2: Path area = \pi(15^2 - 14^2) = \pi(225 - 196) = 29\pi.",
        "Final answer: 29\pi m^2"
      ),
    },
  ],
  "geometry|arcs_sectors__Foundation Tier": [
    {
      question: L(
        "A sector has radius 10 cm and area 20\pi cm^2.",
        "Find the angle of the sector."
      ),
      correct: "72°",
      wrong: ["36°", "90°", "120°"],
      explanation: L(
        "Key insight: use the sector area formula.",
        "Step 1: Area = (\theta/360)\pi r^2 = (\theta/360)\pi(100).",
        "Step 2: 20\pi = (\theta/360)100\pi, so \theta = 72°.",
        "Final answer: 72°"
      ),
    },
  ],
  "geometry|arcs_sectors__Higher Tier": [
    {
      question: L(
        "A sector has radius 9 cm and arc length 12\pi cm.",
        "Find the area of the sector."
      ),
      correct: "54\pi cm^2",
      wrong: ["36\pi cm^2", "72\pi cm^2", "81\pi cm^2"],
      explanation: L(
        "Key insight: use arc length to find the angle first.",
        "Step 1: 12\pi = (\theta/360)·2\pi·9 so \theta = 240°.",
        "Step 2: Area = (240/360)\pi·9^2 = (2/3)·81\pi = 54\pi.",
        "Final answer: 54\pi cm^2"
      ),
    },
  ],
  "geometry|trigonometry__Foundation Tier": [
    {
      question: L(
        "In a right-angled triangle, the opposite side is 6 cm and the adjacent side is 8 cm.",
        "Find the angle between the adjacent side and the hypotenuse to the nearest degree."
      ),
      correct: "37°",
      wrong: ["36°", "53°", "45°"],
      explanation: L(
        "Key insight: use tan θ = opposite/adjacent.",
        "Step 1: tan θ = 6/8 = 0.75.",
        "Step 2: θ = tan^-1(0.75) ≈ 36.9°.",
        "Final answer: 37°"
      ),
    },
  ],
  "geometry|trigonometry__Higher Tier": [
    {
      question: L(
        "An isosceles triangle has equal sides 10 cm and a base of 12 cm.",
        "Find a base angle to the nearest degree."
      ),
      correct: "53°",
      wrong: ["37°", "47°", "60°"],
      explanation: L(
        "Key insight: split the triangle into two right triangles.",
        "Step 1: Half the base is 6 cm, hypotenuse is 10 cm.",
        "Step 2: cos θ = 6/10 = 0.6, so θ ≈ 53.1°.",
        "Final answer: 53°"
      ),
    },
  ],
  "statistics|data__Foundation Tier": [
    {
      question: L(
        "The data set is 3, 7, 9, 10, 12, 15, 18.",
        "Find the median."
      ),
      correct: "10",
      wrong: ["9", "11", "12"],
      explanation: L(
        "Key insight: the median is the middle value when ordered.",
        "Step 1: There are 7 values, so the median is the 4th value.",
        "Step 2: The 4th value is 10.",
        "Final answer: 10"
      ),
    },
  ],
  "statistics|data__Higher Tier": [
    {
      question: L(
        "The mean of 5 numbers is 12.",
        "One of the numbers is 20.",
        "Find the mean of the other 4 numbers."
      ),
      correct: "10",
      wrong: ["8", "11", "12"],
      explanation: L(
        "Key insight: total = mean × number of values.",
        "Step 1: Total of 5 numbers = 5 × 12 = 60.",
        "Step 2: Remaining total = 60 - 20 = 40.",
        "Step 3: Mean of the other 4 numbers = 40 ÷ 4 = 10.",
        "Final answer: 10"
      ),
    },
  ],
  "statistics|histograms__Foundation Tier": [
    {
      question: L(
        "A histogram has class interval 10–20 with frequency density 1.5.",
        "Find the frequency for this class."
      ),
      correct: "15",
      wrong: ["1.5", "30", "10"],
      explanation: L(
        "Key insight: frequency = density × class width.",
        "Step 1: Class width = 20 - 10 = 10.",
        "Step 2: Frequency = 1.5 × 10 = 15.",
        "Final answer: 15"
      ),
    },
  ],
  "statistics|histograms__Higher Tier": [
    {
      question: L(
        "A histogram has class interval 0–5 with frequency 12.",
        "Find the frequency density for this class."
      ),
      correct: "2.4",
      wrong: ["2.0", "3.0", "12"],
      explanation: L(
        "Key insight: density = frequency ÷ class width.",
        "Step 1: Class width = 5.",
        "Step 2: Density = 12 ÷ 5 = 2.4.",
        "Final answer: 2.4"
      ),
    },
  ],
  "statistics|cumulative_frequency__Foundation Tier": [
    {
      question: L(
        "Cumulative frequencies are shown:",
        "\n0–10: 6\n0–20: 14\n0–30: 23\n0–40: 30",
        "How many values are in the interval 20–30?"
      ),
      correct: "9",
      wrong: ["23", "17", "6"],
      explanation: L(
        "Key insight: subtract cumulative totals.",
        "Step 1: Cumulative up to 30 is 23 and up to 20 is 14.",
        "Step 2: 23 - 14 = 9.",
        "Final answer: 9"
      ),
    },
  ],
  "statistics|cumulative_frequency__Higher Tier": [
    {
      question: L(
        "Cumulative frequencies are shown:",
        "\n0–10: 5\n0–20: 12\n0–30: 20\n0–40: 31\n0–50: 40",
        "What is the median class?"
      ),
      correct: "30–40",
      wrong: ["20–30", "40–50", "10–20"],
      explanation: L(
        "Key insight: the median is the \frac{n}{2}th value.",
        "Step 1: n = 40, so the median is the 20th value.",
        "Step 2: Cumulative up to 30 is 20, so the median lies in 30–40.",
        "Final answer: 30–40"
      ),
    },
  ],
  "statistics|charts__Foundation Tier": [
    {
      question: L(
        "In a pie chart, the angle for Category A is 120°.",
        "There are 72 items in total.",
        "How many items are in Category A?"
      ),
      correct: "24",
      wrong: ["18", "30", "36"],
      explanation: L(
        "Key insight: use the fraction of the full circle.",
        "Step 1: 120° is 1/3 of 360°.",
        "Step 2: 1/3 of 72 is 24.",
        "Final answer: 24"
      ),
    },
  ],
  "statistics|charts__Higher Tier": [
    {
      question: L(
        "A pie chart shows three categories with angles 108°, 90° and 162°.",
        "There are 120 items in total.",
        "Find the ratio of the three categories."
      ),
      correct: "6 : 5 : 9",
      wrong: ["3 : 5 : 9", "6 : 4 : 10", "9 : 5 : 6"],
      explanation: L(
        "Key insight: angles are proportional to frequency.",
        "Step 1: Simplify the angles by dividing by 18: 108:90:162 = 6:5:9.",
        "Step 2: This ratio matches the frequencies.",
        "Final answer: 6 : 5 : 9"
      ),
    },
  ],
  "statistics|scatter__Foundation Tier": [
    {
      question: L(
        "The points (1,2), (2,4), (3,6), (4,8), (5,20) are plotted on a scatter graph.",
        "Which point is an outlier?"
      ),
      correct: "(5,20)",
      wrong: ["(4,8)", "(3,6)", "(2,4)"],
      explanation: L(
        "Key insight: most points lie on a straight line y = 2x.",
        "Step 1: (5,20) is far above the pattern.",
        "Final answer: (5,20)"
      ),
    },
  ],
  "statistics|scatter__Higher Tier": [
    {
      question: L(
        "A scatter graph shows points that roughly lie on a downward sloping line.",
        "Which statement is correct?"
      ),
      correct: "There is negative correlation",
      wrong: ["There is positive correlation", "There is no correlation", "The variables are independent"],
      explanation: L(
        "Key insight: a downward trend means negative correlation.",
        "Final answer: There is negative correlation"
      ),
    },
  ],
  "statistics|correlation__Foundation Tier": [
    {
      question: L(
        "Which statement best describes the relationship between height and arm span in a class?"
      ),
      correct: "Positive correlation",
      wrong: ["Negative correlation", "No correlation", "Zero correlation"],
      explanation: L(
        "Key insight: taller students usually have larger arm spans.",
        "Final answer: Positive correlation"
      ),
    },
  ],
  "statistics|correlation__Higher Tier": [
    {
      question: L(
        "A scatter diagram shows points clustered around a straight line sloping downwards.",
        "What type of correlation is shown?"
      ),
      correct: "Negative correlation",
      wrong: ["Positive correlation", "No correlation", "Causal relationship"],
      explanation: L(
        "Key insight: a downward trend indicates negative correlation.",
        "Final answer: Negative correlation"
      ),
    },
  ],
  "statistics|sampling__Foundation Tier": [
    {
      question: L(
        "A survey on exercise habits is carried out by asking people leaving a gym.",
        "State one reason why this sample is biased."
      ),
      correct: "It only includes gym users, who exercise more than average",
      wrong: ["The sample is too large", "The survey is anonymous", "The time of day is irrelevant"],
      explanation: L(
        "Key insight: the sample is not representative of the whole population.",
        "Final answer: It only includes gym users, who exercise more than average"
      ),
    },
  ],
  "statistics|sampling__Higher Tier": [
    {
      question: L(
        "A survey about public transport is carried out by asking people at a bus station.",
        "Explain why this sampling method may be biased."
      ),
      correct: "It over-represents people who already use buses",
      wrong: ["The sample size is too large", "The sample is random", "It uses a questionnaire"],
      explanation: L(
        "Key insight: people at a bus station are not representative of all travel methods.",
        "Final answer: It over-represents people who already use buses"
      ),
    },
  ],
  "statistics|spread__Foundation Tier": [
    {
      question: L(
        "The five-number summary is: min 3, Q1 5, median 8, Q3 11, max 14.",
        "Find the interquartile range."
      ),
      correct: "6",
      wrong: ["9", "11", "8"],
      explanation: L(
        "Key insight: IQR = Q3 - Q1.",
        "Step 1: 11 - 5 = 6.",
        "Final answer: 6"
      ),
    },
  ],
  "statistics|spread__Higher Tier": [
    {
      question: L(
        "The data set is 4, 7, 9, 10, 12, 13, 15, 18.",
        "Find the range and the interquartile range."
      ),
      correct: "Range 14, IQR 6",
      wrong: ["Range 11, IQR 8", "Range 14, IQR 8", "Range 13, IQR 6"],
      explanation: L(
        "Key insight: range = max - min, IQR = Q3 - Q1.",
        "Step 1: Range = 18 - 4 = 14.",
        "Step 2: Q1 is median of lower half (4,7,9,10) = (7+9)/2 = 8.",
        "Step 3: Q3 is median of upper half (12,13,15,18) = (13+15)/2 = 14.",
        "Step 4: IQR = 14 - 8 = 6.",
        "Final answer: Range 14, IQR 6"
      ),
    },
  ],
  "statistics|box_plots__Foundation Tier": [
    {
      question: L(
        "A box plot has Q1 = 12, median = 18, Q3 = 26.",
        "Find the interquartile range."
      ),
      correct: "14",
      wrong: ["8", "12", "26"],
      explanation: L(
        "Key insight: IQR = Q3 - Q1.",
        "Step 1: 26 - 12 = 14.",
        "Final answer: 14"
      ),
    },
  ],
  "statistics|box_plots__Higher Tier": [
    {
      question: L(
        "A box plot has min 5, Q1 9, median 12, Q3 19, max 30.",
        "Which statement is true?"
      ),
      correct: "The range is 25",
      wrong: ["The IQR is 10", "The median is 15", "Q3 is 12"],
      explanation: L(
        "Key insight: range = max - min.",
        "Step 1: 30 - 5 = 25.",
        "Final answer: The range is 25"
      ),
    },
  ],
};

async function main() {
  const changes = [];

  for (const [key, replacements] of Object.entries(REPLACEMENTS)) {
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
    if (!rows.length) continue;

    const ranked = rankWeakRows(rows);
    const toReplace = ranked.slice(0, replacements.length);

    for (let i = 0; i < toReplace.length; i++) {
      const target = toReplace[i].row;
      const replacement = replacements[i];

      const payload = {
        question: replacement.question,
        correct_answer: replacement.correct,
        wrong_answers: replacement.wrong,
        all_answers: [replacement.correct, ...replacement.wrong],
        explanation: replacement.explanation,
        question_type: questionType,
        subtopic: subtopic,
        tier: tier,
        calculator: target.calculator,
        difficulty: target.difficulty,
        marks: target.marks,
        estimated_time_sec: target.estimated_time_sec,
        image_url: null,
        image_alt: null,
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

      changes.push({ id: target.id, subtopic, tier });
    }
  }

  const outDir = path.resolve(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "exam_questions_nonnumeric_log.json"), JSON.stringify(changes, null, 2));

  console.log(`Updated ${changes.length} questions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
