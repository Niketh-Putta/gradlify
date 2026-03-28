/*
Seed 50 ultra-hard (olympiad-style) questions into public.extreme_questions.

Run:
  node scripts/seed-extreme-questions-pack3-olympiad.mjs
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

const L = (...lines) => lines.join("\n");
const R = String.raw;

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
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
  chord_distance: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <circle cx="320" cy="210" r="150" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="220" y1="280" x2="420" y2="280" stroke="#2563eb" stroke-width="3"/>
  <line x1="320" y1="210" x2="320" y2="280" stroke="#111827" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="220" cy="280" r="4" fill="#111827"/>
  <circle cx="420" cy="280" r="4" fill="#111827"/>
  <text x="330" y="250" font-family="Arial" font-size="14" fill="#374151">6</text>
  <text x="300" y="305" font-family="Arial" font-size="14" fill="#2563eb">16</text>
  <text x="335" y="205" font-family="Arial" font-size="14" fill="#374151">O</text>
  </svg>`,
  right_triangle: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polyline points="180,320 180,120 460,320 180,320" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="180" y1="320" x2="460" y2="320" stroke="#111827" stroke-width="3"/>
  <line x1="180" y1="120" x2="460" y2="320" stroke="#111827" stroke-width="3"/>
  <rect x="180" y="300" width="20" height="20" fill="none" stroke="#111827" stroke-width="2"/>
  <text x="150" y="230" font-family="Arial" font-size="14" fill="#374151">9</text>
  <text x="300" y="345" font-family="Arial" font-size="14" fill="#374151">12</text>
  <text x="320" y="205" font-family="Arial" font-size="14" fill="#374151">15</text>
  <text x="165" y="335" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="160" y="115" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="465" y="335" font-family="Arial" font-size="14" fill="#374151">C</text>
  </svg>`,
  median_triangle: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <polyline points="180,320 320,120 500,320 180,320" fill="none" stroke="#111827" stroke-width="3"/>
  <line x1="320" y1="120" x2="340" y2="320" stroke="#2563eb" stroke-width="3"/>
  <circle cx="340" cy="320" r="4" fill="#111827"/>
  <text x="165" y="335" font-family="Arial" font-size="14" fill="#374151">A</text>
  <text x="305" y="115" font-family="Arial" font-size="14" fill="#374151">B</text>
  <text x="505" y="335" font-family="Arial" font-size="14" fill="#374151">C</text>
  <text x="350" y="215" font-family="Arial" font-size="14" fill="#2563eb">m</text>
  </svg>`,
};

const QUESTIONS = [
  makeRow({
    question: L(
      "Find the smallest positive integer n such that:",
      "- n is divisible by 9",
      "- n + 1 is divisible by 8",
      "- n + 2 is divisible by 7"
    ),
    correct: "351",
    wrong: ["231", "315", "399"],
    explanation: L(
      "Step 1: Translate the conditions into congruences:",
      R`\(n \equiv 0 \pmod{9}\), \(n \equiv 7 \pmod{8}\), \(n \equiv 5 \pmod{7}\).`,
      "",
      "Step 2: Write n = 9a and use the mod 8 condition:",
      R`\(9a \equiv 7 \pmod{8} \Rightarrow a \equiv 7 \pmod{8}\).`,
      "So a = 8k + 7 and n = 9(8k + 7) = 72k + 63.",
      "",
      "Step 3: Apply the mod 7 condition:",
      R`\(72k + 63 \equiv 2k \equiv 5 \pmod{7}\).`,
      R`\(2k \equiv 5 \pmod{7} \Rightarrow k \equiv 4 \pmod{7}\).`,
      "So k = 7m + 4.",
      "",
      "Step 4: Substitute back:",
      R`\(n = 72(7m + 4) + 63 = 504m + 351\).`,
      "The smallest positive n is 351.",
      "",
      "Final answer: 351"
    ),
  }),

  makeRow({
    question: L(
      "Find the smallest positive integer n such that:",
      "- n leaves remainder 2 when divided by 3",
      "- n leaves remainder 3 when divided by 4",
      "- n leaves remainder 4 when divided by 5"
    ),
    correct: "59",
    wrong: ["29", "39", "89"],
    explanation: L(
      "Step 1: Convert to congruences:",
      R`\(n \equiv 2 \pmod{3}\), \(n \equiv 3 \pmod{4}\), \(n \equiv 4 \pmod{5}\).`,
      "",
      "Step 2: Write n = 3a + 2 and use mod 4:",
      R`\(3a + 2 \equiv 3 \pmod{4} \Rightarrow 3a \equiv 1 \pmod{4}\).`,
      R`\(3 \equiv -1 \pmod{4}\), so \(-a \equiv 1 \Rightarrow a \equiv 3 \pmod{4}\).`,
      "Let a = 4b + 3, so n = 3(4b + 3) + 2 = 12b + 11.",
      "",
      "Step 3: Use mod 5:",
      R`\(12b + 11 \equiv 4 \pmod{5}\Rightarrow 2b + 1 \equiv 4 \pmod{5}\).`,
      R`\(2b \equiv 3 \pmod{5} \Rightarrow b \equiv 4 \pmod{5}\).`,
      "Let b = 5c + 4.",
      "",
      "Step 4: n = 12(5c + 4) + 11 = 60c + 59.",
      "Smallest positive n is 59.",
      "",
      "Final answer: 59"
    ),
  }),

  makeRow({
    question: R`Find the number of ordered pairs of positive integers \((x,y)\) with \(x \le y\) satisfying \(\frac{1}{x}+\frac{1}{y}=\frac{1}{84}\).`,
    correct: "23",
    wrong: ["21", "22", "24"],
    explanation: L(
      "Step 1: Rearrange:",
      R`\(\frac{x+y}{xy}=\frac{1}{84}\Rightarrow 84(x+y)=xy\).`,
      "",
      "Step 2: Factor:",
      R`\(xy-84x-84y=0 \Rightarrow (x-84)(y-84)=84^2\).`,
      "",
      "Step 3: Let \(a=x-84\), \(b=y-84\). Then \(ab=84^2\) and \(a\le b\).",
      "",
      "Step 4: Count factor pairs. Prime factorization:",
      R`\(84=2^2\cdot3\cdot7\Rightarrow 84^2=2^4\cdot3^2\cdot7^2\).`,
      R`\(d(84^2)=(4+1)(2+1)(2+1)=45\).`,
      "",
      "Step 5: Number of pairs with \(a\le b\) is \((45+1)/2=23\).",
      "",
      "Final answer: 23"
    ),
  }),

  makeRow({
    question: R`How many positive integer solutions \((x,y)\) satisfy \(x^2-y^2=2025\)?`,
    correct: "8",
    wrong: ["6", "7", "9"],
    explanation: L(
      "Step 1: Factor:",
      R`\(x^2-y^2=(x-y)(x+y)=2025\).`,
      "",
      "Step 2: Since 2025 is odd, both factors are odd. Let \(x-y=d\), \(x+y=2025/d\).",
      "",
      "Step 3: Each positive divisor \(d\) with \(d < 2025/d\) gives one positive solution.",
      "",
      "Step 4: Factor 2025:",
      R`\(2025=3^4\cdot5^2\Rightarrow d(2025)=(4+1)(2+1)=15\).`,
      "Number of factor pairs is \((15+1)/2=8.",
      "",
      "Final answer: 8"
    ),
  }),

  makeRow({
    question: R`Find \(\gcd(2^{90}-1,\,2^{72}-1)\).`,
    correct: R`\(2^{18}-1\)`,
    wrong: [R`\(2^{6}-1\)`, R`\(2^{9}-1\)`, R`\(2^{24}-1\)`],
    explanation: L(
      "Step 1: Use the identity:",
      R`\(\gcd(2^m-1,2^n-1)=2^{\gcd(m,n)}-1\).`,
      "",
      "Step 2: Compute \(\gcd(90,72)=18\).",
      "",
      "Step 3: Therefore the gcd is \(2^{18}-1\).",
      "",
      "Final answer: \(2^{18}-1\)"
    ),
  }),

  makeRow({
    question: R`Find the remainder when \(3^{2025}+5^{2025}\) is divided by 7.`,
    correct: "5",
    wrong: ["0", "1", "6"],
    explanation: L(
      "Step 1: Work modulo 7.",
      "",
      R`\(3^6\equiv1\pmod7\Rightarrow 3^{2025}\equiv3^{3}\equiv27\equiv6\pmod7\).`,
      "",
      R`\(5\equiv -2\pmod7\Rightarrow 5^{2025}\equiv (-2)^{2025}\equiv-2^{2025}\pmod7\).`,
      R`\(2^3\equiv1\pmod7\Rightarrow 2^{2025}\equiv1\). So \(5^{2025}\equiv-1\equiv6\).`,
      "",
      "Step 2: Sum: \(6+6=12\equiv5\pmod7\).",
      "",
      "Final answer: 5"
    ),
  }),

  makeRow({
    question: R`Find the smallest positive integer \(n\) such that \(2^{10}3^4\mid n!\).`,
    correct: "12",
    wrong: ["10", "11", "13"],
    explanation: L(
      "Step 1: Compute \(v_2(n!)\) and \(v_3(n!)\).",
      "",
      "For \(n=11\):",
      R`\(v_2(11!)=\lfloor11/2\rfloor+\lfloor11/4\rfloor+\lfloor11/8\rfloor=5+2+1=8\) (too small).`,
      R`\(v_3(11!)=\lfloor11/3\rfloor+\lfloor11/9\rfloor=3+1=4\) (ok).`,
      "",
      "For \(n=12\):",
      R`\(v_2(12!)=6+3+1=10\) and \(v_3(12!)=4+1=5\).`,
      "Both meet the requirement, so the smallest is \(n=12\).",
      "",
      "Final answer: 12"
    ),
  }),

  makeRow({
    question: R`Find the smallest positive integer \(n\) such that \(n^2\equiv1\pmod{840}\) but \(n\not\equiv\pm1\pmod{840}\).`,
    correct: "211",
    wrong: ["121", "141", "169"],
    explanation: L(
      "Step 1: Factor \(840=2^3\cdot3\cdot5\cdot7\).",
      "",
      "Step 2: For odd primes, \(n^2\equiv1\) implies \(n\equiv\pm1\).",
      "So take \(n\equiv1\pmod{3},\pmod{5},\pmod{7}\), but use a nontrivial solution mod 8.",
      "",
      "Step 3: Mod 8, solutions are \(1,3,5,7\). Choose \(n\equiv3\pmod8\).",
      "",
      "Step 4: Solve:",
      R`\(n\equiv1\pmod{105}\) and \(n\equiv3\pmod8\).`,
      "Write \(n=1+105k\). Then \(1+105k\equiv3\pmod8\Rightarrow k\equiv2\pmod8\).",
      "Smallest \(k=2\) gives \(n=1+210=211\).",
      "",
      "Final answer: 211"
    ),
  }),

  makeRow({
    question: R`Find the smallest positive integer \(n\) such that \(2^n\equiv1\pmod{101}\).`,
    correct: "100",
    wrong: ["20", "25", "50"],
    explanation: L(
      "Step 1: 101 is prime, so the order of 2 divides 100.",
      "",
      "Step 2: Check \(2^{10}\equiv14\pmod{101}\), so order is not 10.",
      "",
      "Step 3: Compute \(2^{25}\equiv10\pmod{101}\), so order is not 25.",
      "",
      "Step 4: Compute \(2^{50}\equiv(2^{25})^2\equiv10^2=100\equiv-1\pmod{101}\).",
      "Thus \(2^{100}\equiv1\) and no smaller divisor works.",
      "",
      "Final answer: 100"
    ),
  }),

  makeRow({
    question: R`How many integer pairs \((x,y)\) satisfy \(x^2+y^2=65\)?`,
    correct: "16",
    wrong: ["8", "12", "20"],
    explanation: L(
      "Step 1: Represent 65 as a sum of two squares:",
      R`\(65=1^2+8^2=4^2+7^2\).`,
      "",
      "Step 2: Each representation with nonzero, distinct values gives 8 integer pairs",
      "by sign changes and swapping.",
      "",
      "Step 3: There are two representations, so total pairs \(=2\times8=16\).",
      "",
      "Final answer: 16"
    ),
  }),

  makeRow({
    question: L(
      "How many integers n with 1 ≤ n ≤ 1000 satisfy:",
      R`\(n\equiv1\pmod{3},\ n\equiv2\pmod{5},\ n\equiv3\pmod{7}\)?`
    ),
    correct: "10",
    wrong: ["9", "11", "12"],
    explanation: L(
      "Step 1: Solve the congruences modulo 105.",
      "",
      "Let n = 1 + 3a. Then n ≡ 2 (mod 5):",
      R`\(3a\equiv1\pmod5\Rightarrow a\equiv2\pmod5\).`,
      "So a = 5b + 2, giving n = 15b + 7.",
      "",
      "Now n ≡ 3 (mod 7):",
      R`\(15b+7\equiv b \equiv 3\pmod7\Rightarrow b=7c+3\).`,
      "Thus n = 105c + 52.",
      "",
      "Step 2: Count values in [1,1000]:",
      R`\(105c+52\le1000\Rightarrow c\le9\).`,
      "So c = 0,...,9 gives 10 values.",
      "",
      "Final answer: 10"
    ),
  }),

  makeRow({
    question: R`Find the smallest positive integer \(n\) such that \(2^n\equiv-1\pmod{29}\).`,
    correct: "14",
    wrong: ["7", "10", "28"],
    explanation: L(
      "Step 1: Work modulo 29. Compute powers:",
      R`\(2^5=32\equiv3\), \(2^{10}\equiv3^2=9\).`,
      "",
      "Step 2: Compute \(2^{14}=2^{10}\cdot2^4\equiv 9\cdot16=144\equiv -1\pmod{29}\).",
      "",
      "Step 3: No smaller divisor gives -1, so smallest n is 14.",
      "",
      "Final answer: 14"
    ),
  }),

  makeRow({
    question: R`Find the remainder when \(7^{2024}\) is divided by 13.`,
    correct: "3",
    wrong: ["1", "5", "9"],
    explanation: L(
      "Step 1: By Fermat, \(7^{12}\equiv1\pmod{13}\).",
      "",
      "Step 2: \(2024\equiv8\pmod{12}\). So \(7^{2024}\equiv7^8\).",
      "",
      "Step 3: Compute:",
      R`\(7^2=49\equiv10\), \(7^4\equiv10^2=100\equiv9\), \(7^8\equiv9^2=81\equiv3\).`,
      "",
      "Final answer: 3"
    ),
  }),

  makeRow({
    question: R`Find the smallest positive integer \(n\) such that \(n\equiv3\pmod{8}\) and \(n\equiv4\pmod{9}\).`,
    correct: "67",
    wrong: ["31", "43", "75"],
    explanation: L(
      "Step 1: Write \(n=8k+3\).",
      "",
      "Step 2: Use mod 9:",
      R`\(8k+3\equiv4\pmod9\Rightarrow 8k\equiv1\pmod9\).`,
      R`\(8\equiv-1\), so \(-k\equiv1\Rightarrow k\equiv8\pmod9\).`,
      "Let k = 9m + 8.",
      "",
      "Step 3: n = 8(9m+8)+3 = 72m + 67.",
      "Smallest is 67.",
      "",
      "Final answer: 67"
    ),
  }),

  makeRow({
    question: R`How many binary strings of length 10 have no two consecutive 1s?`,
    correct: "144",
    wrong: ["89", "133", "155"],
    explanation: L(
      "Step 1: Let \(f(n)\) be the count for length \(n\).",
      "If the string ends in 0, we have \(f(n-1)\). If it ends in 1, previous must be 0, giving \(f(n-2)\).",
      "",
      "Thus \(f(n)=f(n-1)+f(n-2)\) with \(f(1)=2, f(2)=3\).",
      "",
      "Step 2: Compute: \(f(3)=5, f(4)=8, f(5)=13, f(6)=21, f(7)=34, f(8)=55, f(9)=89, f(10)=144\).",
      "",
      "Final answer: 144"
    ),
  }),

  makeRow({
    question: R`How many ways can 5 numbers be chosen from \(\{1,2,\dots,15\}\) so that no two are consecutive?`,
    correct: "462",
    wrong: ["252", "420", "495"],
    explanation: L(
      "Step 1: Use the standard transformation.",
      "If the chosen numbers are \(a_1<a_2<\\cdots<a_5\), define \(b_i=a_i-(i-1)\).",
      "",
      "Step 2: Then \(b_1<b_2<\\cdots<b_5\) and they are chosen from \(1\) to \(15-4=11\).",
      "",
      "Step 3: So the number of choices is \(\binom{11}{5}=462\).",
      "",
      "Final answer: 462"
    ),
  }),

  makeRow({
    question: R`How many derangements of 7 elements are there?`,
    correct: "1854",
    wrong: ["1760", "1820", "1880"],
    explanation: L(
      "Step 1: Use the formula \(!n = n!\\sum_{k=0}^n (-1)^k/k!\\).",
      "",
      "Step 2: For n=7:",
      R`\(!7=7!\left(1-\frac1{1!}+\frac1{2!}-\frac1{3!}+\frac1{4!}-\frac1{5!}+\frac1{6!}-\frac1{7!}\right)=1854\).`,
      "",
      "Final answer: 1854"
    ),
  }),

  makeRow({
    question: R`How many distinct permutations of the word STATISTICS are there?`,
    correct: "50400",
    wrong: ["45360", "100800", "15120"],
    explanation: L(
      "Step 1: Count letters:",
      "S appears 3 times, T appears 3 times, I appears 2 times, A and C once each.",
      "",
      "Step 2: Total permutations:",
      R`\(\frac{10!}{3!\,3!\,2!}=\frac{3628800}{72}=50400\).`,
      "",
      "Final answer: 50400"
    ),
  }),

  makeRow({
    question: R`How many 5-card hands contain exactly two pairs?`,
    correct: "123552",
    wrong: ["109824", "134784", "13860"],
    explanation: L(
      "Step 1: Choose the ranks of the two pairs: \(\binom{13}{2}\).",
      "",
      "Step 2: For each pair, choose suits: \(\binom{4}{2}^2\).",
      "",
      "Step 3: Choose the rank of the fifth card (not among the pair ranks): 11 choices.",
      "Choose its suit: 4 choices.",
      "",
      "Step 4: Total:",
      R`\(\binom{13}{2}\binom{4}{2}^2\cdot 11\cdot 4 = 78\cdot36\cdot44=123552\).`,
      "",
      "Final answer: 123552"
    ),
  }),

  makeRow({
    question: R`A fair coin is tossed 4 times. Given that at least one head appears, what is the probability of exactly two heads?`,
    correct: R`\(\frac{2}{5}\)`,
    wrong: [R`\(\frac{1}{3}\)`, R`\(\frac{1}{2}\)`, R`\(\frac{3}{8}\)`],
    explanation: L(
      "Step 1: Total outcomes with at least one head: \(2^4-1=15\).",
      "",
      "Step 2: Outcomes with exactly two heads: \(\binom{4}{2}=6\).",
      "",
      "Step 3: Conditional probability:",
      R`\(\frac{6}{15}=\frac{2}{5}\).`,
      "",
      "Final answer: \(\\frac{2}{5}\)"
    ),
  }),

  makeRow({
    question: R`Three fair dice are rolled. What is the probability that the sum is 10?`,
    correct: R`\(\frac{1}{8}\)`,
    wrong: [R`\(\frac{1}{9}\)`, R`\(\frac{5}{36}\)`, R`\(\frac{1}{6}\)`],
    explanation: L(
      "Step 1: Count solutions to \(a+b+c=10\) with \(1\le a,b,c\le6\).",
      "Let \(a'=a-1\) etc, so \(a'+b'+c'=7\) with \(0\le a',b',c'\le5\).",
      "",
      "Step 2: Unrestricted solutions: \(\binom{9}{2}=36\).",
      "Subtract cases where one variable ≥6: each gives \(\binom{3}{2}=3\) solutions, and there are 3 variables.",
      "So valid solutions = \(36-9=27\).",
      "",
      "Step 3: Probability \(=27/6^3=27/216=1/8\).",
      "",
      "Final answer: \(\\frac{1}{8}\)"
    ),
  }),

  makeRow({
    question: R`A bag contains 5 red and 7 blue balls. Three balls are drawn without replacement. Find the probability that exactly two are red.`,
    correct: R`\(\frac{3}{10}\)`,
    wrong: [R`\(\frac{1}{6}\)`, R`\(\frac{2}{5}\)`, R`\(\frac{1}{2}\)`],
    explanation: L(
      "Step 1: Choose 2 red and 1 blue:",
      R`\(\binom{5}{2}\binom{7}{1}=10\cdot7=70\).`,
      "",
      "Step 2: Total outcomes:",
      R`\(\binom{12}{3}=220\).`,
      "",
      "Step 3: Probability \(=70/220=3/10\).",
      "",
      "Final answer: \(\\frac{3}{10}\)"
    ),
  }),

  makeRow({
    question: R`Let \(x+y=4\) and \(xy=1\). Find \(x^5+y^5\).`,
    correct: "724",
    wrong: ["708", "740", "756"],
    explanation: L(
      "Step 1: Define \(S_n=x^n+y^n\). Then \(S_{n}= (x+y)S_{n-1}-xy\,S_{n-2}\).",
      "",
      "Step 2: Compute:",
      R`\(S_1=4,\ S_2=(x+y)^2-2xy=16-2=14\).`,
      R`\(S_3=4\cdot14-1\cdot4=52\).`,
      R`\(S_4=4\cdot52-1\cdot14=194\).`,
      R`\(S_5=4\cdot194-1\cdot52=724\).`,
      "",
      "Final answer: 724"
    ),
  }),

  makeRow({
    question: R`If \(x+y+z=0\) and \(x^2+y^2+z^2=6\), find \(x^4+y^4+z^4\).`,
    correct: "18",
    wrong: ["12", "24", "30"],
    explanation: L(
      "Step 1: From \((x+y+z)^2=0\) we get:",
      R`\(x^2+y^2+z^2+2(xy+yz+zx)=0\Rightarrow xy+yz+zx=-3\).`,
      "",
      "Step 2: Use",
      R`\(x^2y^2+y^2z^2+z^2x^2=(xy+yz+zx)^2-2xyz(x+y+z)\).`,
      "Since \(x+y+z=0\), this gives \(x^2y^2+y^2z^2+z^2x^2=9\).",
      "",
      "Step 3: Then",
      R`\(x^4+y^4+z^4=(x^2+y^2+z^2)^2-2(x^2y^2+y^2z^2+z^2x^2)\).`,
      R`\(=6^2-2\cdot9=36-18=18\).`,
      "",
      "Final answer: 18"
    ),
  }),

  makeRow({
    question: R`The roots of \(t^3-6t^2+11t-6=0\) are \(x,y,z\). Find \(x^2+y^2+z^2\).`,
    correct: "14",
    wrong: ["12", "15", "16"],
    explanation: L(
      "Step 1: The roots are 1,2,3 since the polynomial factors as \((t-1)(t-2)(t-3)\).",
      "",
      "Step 2: Sum of squares:",
      R`\(1^2+2^2+3^2=1+4+9=14\).`,
      "",
      "Final answer: 14"
    ),
  }),

  makeRow({
    question: R`Solve \(x^4-5x^2+4=0\).`,
    correct: R`\(x=\pm1,\ \pm2\)`,
    wrong: [R`\(x=\pm1\)`, R`\(x=\pm2\)`, R`\(x=\pm\sqrt{5}\)`],
    explanation: L(
      "Step 1: Let \(u=x^2\). Then \(u^2-5u+4=0\).",
      "",
      "Step 2: Factor: \((u-1)(u-4)=0\).",
      "",
      "Step 3: So \(u=1\) or \(u=4\). Hence \(x=\pm1,\pm2\).",
      "",
      "Final answer: \(x=\pm1,\pm2\)"
    ),
  }),

  makeRow({
    question: R`If \(x+\frac{1}{x}=3\), find \(x^6+\frac{1}{x^6}\).`,
    correct: "322",
    wrong: ["320", "324", "326"],
    explanation: L(
      "Step 1: Let \(t=x+1/x=3\).",
      R`\(x^2+1/x^2=t^2-2=7\).`,
      R`\(x^3+1/x^3=t^3-3t=27-9=18\).`,
      "",
      "Step 2: Then",
      R`\(x^6+1/x^6=(x^3+1/x^3)^2-2=18^2-2=322\).`,
      "",
      "Final answer: 322"
    ),
  }),

  makeRow({
    question: R`If \(x+\frac{2}{x}=5\), find \(x^4+\frac{16}{x^4}\).`,
    correct: "433",
    wrong: ["425", "441", "449"],
    explanation: L(
      "Step 1: Square:",
      R`\(x^2+\frac{4}{x^2}+4=25\Rightarrow x^2+\frac{4}{x^2}=21\).`,
      "",
      "Step 2: Square again:",
      R`\(\left(x^2+\frac{4}{x^2}\right)^2=x^4+\frac{16}{x^4}+8\).`,
      R`\(21^2=441=x^4+\frac{16}{x^4}+8\).`,
      "",
      "Step 3: So \(x^4+\frac{16}{x^4}=441-8=433\).",
      "",
      "Final answer: 433"
    ),
  }),

  makeRow({
    question: R`For positive reals \(a,b,c\) with \(a+b+c=6\), find the maximum of \(ab+bc+ca\).`,
    correct: "12",
    wrong: ["9", "10", "11"],
    explanation: L(
      "Step 1: By symmetry and standard inequality, the maximum occurs at \(a=b=c\).",
      "",
      "Step 2: Then \(a=b=c=2\).",
      "",
      "Step 3: \(ab+bc+ca=3\cdot 2\cdot 2=12\).",
      "",
      "Final answer: 12"
    ),
  }),

  makeRow({
    question: R`If \(x+y=1\) and \(x^2+y^2=\frac{5}{9}\), find \(x^3+y^3\).`,
    correct: R`\(\frac{1}{3}\)`,
    wrong: [R`\(\frac{2}{3}\)`, R`\(\frac{1}{2}\)`, R`\(\frac{1}{9}\)`],
    explanation: L(
      "Step 1: Use \(x^2+y^2=(x+y)^2-2xy\).",
      R`\(\frac{5}{9}=1-2xy\Rightarrow xy=\frac{2}{9}\).`,
      "",
      "Step 2: Then",
      R`\(x^3+y^3=(x+y)^3-3xy(x+y)=1-3\cdot\frac{2}{9}\cdot1=\frac{1}{3}\).`,
      "",
      "Final answer: \(\\frac{1}{3}\)"
    ),
  }),

  makeRow({
    question: R`Solve \(|x-3|+|x+5|=14\).`,
    correct: R`\(x=-8\) or \(x=6\)`,
    wrong: ["x = -6 or x = 8", "x = -5 or x = 9", "x = -7 or x = 5"],
    explanation: L(
      "Step 1: Consider intervals.",
      "",
      "If \(x\ge3\):",
      R`\(x-3+x+5=2x+2=14\Rightarrow x=6\).`,
      "",
      "If \(-5\le x\le3\):",
      R`\(3-x+x+5=8\neq14\) (no solution).`,
      "",
      "If \(x\le-5\):",
      R`\(3-x- x-5=-2x-2=14\Rightarrow x=-8\).`,
      "",
      "Final answer: \(x=-8\) or \(x=6\)"
    ),
  }),

  makeRow({
    question: R`Solve \(\sqrt{x+7}+\sqrt{x-5}=6\).`,
    correct: "9",
    wrong: ["7", "8", "10"],
    explanation: L(
      "Step 1: Let \(a=\sqrt{x+7}\), \(b=\sqrt{x-5}\). Then \(a+b=6\).",
      "",
      "Step 2: Note \(a^2-b^2=12\), so \((a-b)(a+b)=12\).",
      "Thus \(a-b=2\).",
      "",
      "Step 3: Solve: \(a=4\), \(b=2\).",
      "",
      "Step 4: \(x+7=16\Rightarrow x=9\).",
      "",
      "Final answer: 9"
    ),
  }),

  makeRow({
    question: L(
      "A function satisfies:",
      R`\(f(x+1)=f(x)+2x+1\) and \(f(0)=3\).`,
      "Find f(5)."
    ),
    correct: "28",
    wrong: ["25", "27", "29"],
    explanation: L(
      "Step 1: Note that the difference matches the derivative of \(x^2\).",
      "",
      "Step 2: Guess \(f(x)=x^2+C\). Then",
      R`\(f(x+1)-f(x)=(x+1)^2-x^2=2x+1\), which matches.`,
      "",
      "Step 3: Use \(f(0)=3\) gives \(C=3\).",
      "",
      "Step 4: \(f(5)=25+3=28\).",
      "",
      "Final answer: 28"
    ),
  }),

  makeRow({
    question: R`For positive reals \(a,b,c\) with \(abc=1\), find the minimum of \(a^2+b^2+c^2\).`,
    correct: "3",
    wrong: ["2", "4", "6"],
    explanation: L(
      "Step 1: By AM-GM, \(a^2+b^2+c^2\ge3\sqrt[3]{a^2b^2c^2}=3\).",
      "",
      "Step 2: Equality holds at \(a=b=c=1\).",
      "",
      "Final answer: 3"
    ),
  }),

  makeRow({
    question: R`Given \(a_1=1\) and \(a_{n+1}=3a_n+2\), find \(a_5\).`,
    correct: "161",
    wrong: ["121", "151", "181"],
    explanation: L(
      "Step 1: Compute iteratively:",
      R`\(a_2=3\cdot1+2=5\).`,
      R`\(a_3=3\cdot5+2=17\).`,
      R`\(a_4=3\cdot17+2=53\).`,
      R`\(a_5=3\cdot53+2=161\).`,
      "",
      "Final answer: 161"
    ),
  }),

  makeRow({
    question: R`Given \(a_1=1\) and \(a_{n+1}=2a_n+n\), find \(a_5\).`,
    correct: "42",
    wrong: ["39", "40", "44"],
    explanation: L(
      "Step 1: Compute:",
      R`\(a_2=2\cdot1+1=3\).`,
      R`\(a_3=2\cdot3+2=8\).`,
      R`\(a_4=2\cdot8+3=19\).`,
      R`\(a_5=2\cdot19+4=42\).`,
      "",
      "Final answer: 42"
    ),
  }),

  makeRow({
    question: R`Given \(a_1=2\) and \(a_{n+1}=a_n+2n-1\), find \(a_6\).`,
    correct: "27",
    wrong: ["26", "28", "29"],
    explanation: L(
      "Step 1: Compute:",
      R`\(a_2=2+1=3\), \(a_3=3+3=6\), \(a_4=6+5=11\), \(a_5=11+7=18\), \(a_6=18+9=27\).`,
      "",
      "Final answer: 27"
    ),
  }),

  makeRow({
    question: R`Given \(a_1=1\) and \(a_{n+1}=a_n+3n\), find \(a_5\).`,
    correct: "31",
    wrong: ["28", "29", "33"],
    explanation: L(
      "Step 1: Compute:",
      R`\(a_2=1+3=4\), \(a_3=4+6=10\), \(a_4=10+9=19\), \(a_5=19+12=31\).`,
      "",
      "Final answer: 31"
    ),
  }),

  makeRow({
    question: R`Find the area of a triangle with side lengths 13, 14, 15.`,
    correct: "84",
    wrong: ["80", "90", "96"],
    explanation: L(
      "Step 1: Use Heron's formula. Semiperimeter \(s=(13+14+15)/2=21\).",
      "",
      "Step 2: Area:",
      R`\(\sqrt{s(s-13)(s-14)(s-15)}=\sqrt{21\cdot8\cdot7\cdot6}=\sqrt{7056}=84\).`,
      "",
      "Final answer: 84"
    ),
  }),

  makeRow({
    question: R`Find the inradius of a triangle with side lengths 13, 14, 15.`,
    correct: "4",
    wrong: ["3", "5", "6"],
    explanation: L(
      "Step 1: From the previous result, area \(A=84\).",
      "",
      "Step 2: Semiperimeter \(s=21\). Inradius \(r=A/s=84/21=4\).",
      "",
      "Final answer: 4"
    ),
  }),

  makeRow({
    question: R`A circle has a chord of length 16. The perpendicular distance from the centre to the chord is 6. Find the radius.`,
    correct: "10",
    wrong: ["8", "12", "14"],
    image: SVG_ASSETS.chord_distance,
    imageAlt: "Circle with a chord length 16 and distance 6 from the centre.",
    explanation: L(
      "Step 1: The perpendicular from the centre bisects the chord, so half-chord length is 8.",
      "",
      "Step 2: Form a right triangle with legs 6 and 8, radius r as hypotenuse:",
      R`\(r^2=6^2+8^2=36+64=100\Rightarrow r=10\).`,
      "",
      "Final answer: 10"
    ),
  }),

  makeRow({
    question: R`In a right triangle with legs 9 and 12, find the altitude to the hypotenuse.`,
    correct: R`\(\frac{36}{5}\)`,
    wrong: [R`\(\frac{12}{5}\)`, R`\(\frac{24}{5}\)`, R`\(\frac{48}{5}\)`],
    image: SVG_ASSETS.right_triangle,
    imageAlt: "Right triangle with legs 9 and 12 and hypotenuse 15.",
    explanation: L(
      "Step 1: Hypotenuse \(c=\sqrt{9^2+12^2}=15\).",
      "",
      "Step 2: In a right triangle, altitude to hypotenuse is \(h=ab/c\).",
      R`\(h=9\cdot12/15=108/15=36/5\).`,
      "",
      "Final answer: \(36/5\)"
    ),
  }),

  makeRow({
    question: R`Find the equation of the circle through \((1,1)\), \((5,1)\), and \((1,5)\).`,
    correct: R`\((x-3)^2+(y-3)^2=8\)`,
    wrong: [R`\((x-3)^2+(y-3)^2=4\)`, R`\((x-2)^2+(y-2)^2=8\)`, R`\((x-3)^2+(y-3)^2=16\)`],
    explanation: L(
      "Step 1: The triangle is right-angled at (1,1).",
      "The centre is the midpoint of the hypotenuse between (5,1) and (1,5):",
      R`\((3,3)\).`,
      "",
      "Step 2: Radius squared:",
      R`\(r^2=(3-1)^2+(3-1)^2=4+4=8\).`,
      "",
      "Final answer: \((x-3)^2+(y-3)^2=8\)"
    ),
  }),

  makeRow({
    question: R`A triangle has side lengths 5, 6, 7. Find the length of the median to the side of length 7.`,
    correct: R`\(\frac{\sqrt{73}}{2}\)`,
    wrong: [R`\(\frac{\sqrt{61}}{2}\)`, R`\(\frac{\sqrt{85}}{2}\)`, R`\(\sqrt{13}\)`],
    image: SVG_ASSETS.median_triangle,
    imageAlt: "Triangle with a median drawn to the side of length 7.",
    explanation: L(
      "Step 1: Use the median formula:",
      R`\(m=\frac{1}{2}\sqrt{2b^2+2c^2-a^2}\) where \(a\) is the opposite side.`,
      "",
      "Step 2: Here \(a=7, b=5, c=6\).",
      R`\(m=\frac{1}{2}\sqrt{2(25)+2(36)-49}=\frac{1}{2}\sqrt{50+72-49}=\frac{1}{2}\sqrt{73}\).`,
      "",
      "Final answer: \(\\sqrt{73}/2\)"
    ),
  }),

  makeRow({
    question: R`Find \(\varphi(840)\).`,
    correct: "192",
    wrong: ["160", "168", "210"],
    explanation: L(
      "Step 1: Factor \(840=2^3\cdot3\cdot5\cdot7\).",
      "",
      "Step 2: Euler totient:",
      R`\(\varphi(840)=840\left(1-\frac12\right)\left(1-\frac13\right)\left(1-\frac15\right)\left(1-\frac17\right)\).`,
      "",
      "Step 3: Compute:",
      R`\(840\cdot\frac12\cdot\frac23\cdot\frac45\cdot\frac67=192\).`,
      "",
      "Final answer: 192"
    ),
  }),

  makeRow({
    question: R`How many integer solutions are there to \(a+b+c=20\) with \(a\ge2,\ b\ge3,\ c\ge4\)?`,
    correct: "78",
    wrong: ["66", "84", "90"],
    explanation: L(
      "Step 1: Substitute \(a'=a-2,\ b'=b-3,\ c'=c-4\).",
      "",
      "Step 2: Then \(a'+b'+c'=11\) with \(a',b',c'\ge0\).",
      "",
      "Step 3: Number of solutions:",
      R`\(\binom{11+3-1}{3-1}=\binom{13}{2}=78\).`,
      "",
      "Final answer: 78"
    ),
  }),

  makeRow({
    question: R`Two cards are drawn from a standard deck without replacement. What is the probability they are the same suit?`,
    correct: R`\(\frac{4}{17}\)`,
    wrong: [R`\(\frac{1}{4}\)`, R`\(\frac{3}{17}\)`, R`\(\frac{5}{17}\)`],
    explanation: L(
      "Step 1: Fix the first card. There are 12 cards of the same suit among the remaining 51.",
      "",
      "Step 2: Probability \(=12/51=4/17\).",
      "",
      "Final answer: \(\\frac{4}{17}\)"
    ),
  }),

  makeRow({
    question: R`If \(x+y=7\) and \(x^2+y^2=29\), find \(x^3+y^3\).`,
    correct: "133",
    wrong: ["127", "135", "147"],
    explanation: L(
      "Step 1: Compute \(xy\):",
      R`\(x^2+y^2=(x+y)^2-2xy\Rightarrow 29=49-2xy\Rightarrow xy=10\).`,
      "",
      "Step 2: Then",
      R`\(x^3+y^3=(x+y)^3-3xy(x+y)=343-3\cdot10\cdot7=343-210=133\).`,
      "",
      "Final answer: 133"
    ),
  }),

  makeRow({
    question: R`How many 4-digit numbers have strictly increasing digits?`,
    correct: "126",
    wrong: ["120", "135", "144"],
    explanation: L(
      "Step 1: A strictly increasing 4-digit number corresponds to choosing 4 distinct digits.",
      "",
      "Step 2: The smallest digit cannot be 0, otherwise the number would be 3-digit.",
      "So choose 4 digits from 1–9.",
      "",
      "Step 3: Count:",
      R`\(\binom{9}{4}=126\).`,
      "",
      "Final answer: 126"
    ),
  }),

  makeRow({
    question: R`Find the smallest positive integer \(n\) such that \(n\equiv1\pmod{4}\) and \(n\equiv2\pmod{9}\).`,
    correct: "29",
    wrong: ["17", "21", "33"],
    explanation: L(
      "Step 1: Let \(n=4k+1\).",
      "",
      "Step 2: Apply the mod 9 condition:",
      R`\(4k+1\equiv2\pmod9\Rightarrow 4k\equiv1\pmod9\).`,
      R`The inverse of 4 mod 9 is 7, so \(k\equiv7\pmod9\).`,
      "",
      "Step 3: Let \(k=9m+7\). Then",
      R`\(n=4(9m+7)+1=36m+29\).`,
      "Smallest is 29.",
      "",
      "Final answer: 29"
    ),
  }),
];

async function main() {
  if (QUESTIONS.length !== 50) {
    throw new Error(`Expected 50 questions, got ${QUESTIONS.length}.`);
  }

  const insertRes = await supabaseFetch("/rest/v1/extreme_questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(QUESTIONS),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text().catch(() => "");
    throw new Error(`Insert failed: ${insertRes.status} ${text}`);
  }

  console.log(`Inserted ${QUESTIONS.length} extreme questions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
