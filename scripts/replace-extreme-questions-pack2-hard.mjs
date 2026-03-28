/*
Replace the 60 questions inserted by `batch_extreme_20260115_pack2` in `public.extreme_questions`
with a new harder, multi-step reasoning set that uses consistent KaTeX-friendly LaTeX.
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

const PACK2_IMAGE_PREFIX = "generated/batch_extreme_20260115_pack2";

const L = (...lines) => lines.join("\n");
const R = String.raw;

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed(items, seed) {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeRow({ question, correct, wrong, explanation }) {
  const wrongAnswers = [...wrong];
  const all = shuffleWithSeed([correct, ...wrongAnswers], hashString(question));
  return {
    question,
    correct_answer: correct,
    wrong_answers: wrongAnswers,
    all_answers: all,
    explanation,
    explain_on: "always",
    image_url: null,
    image_alt: null,
  };
}

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

async function getJson(endpoint) {
  const res = await supabaseFetch(endpoint, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET failed: ${res.status} ${text}`);
  }
  return res.json();
}

function encodeFilterValue(value) {
  return encodeURIComponent(String(value));
}

const HARD_QUESTIONS = [
  // Theme A: Number + logic (hard reasoning with GCSE content)
  makeRow({
    question: L(
      "A three-digit number N has digits a, b, c (in that order).",
      "Digits a, b, c are in arithmetic progression.",
      "Reversing the digits increases the number by 198.",
      "N is divisible by 7.",
      "",
      "What is N?",
    ),
    correct: "567",
    wrong: ["234", "456", "678"],
    explanation: L(
      "Step 1: Write the number and its reverse:",
      R`\(N = 100a + 10b + c\) and \(R = 100c + 10b + a\).`,
      "",
      "Step 2: Use the reversal condition:",
      R`\(R - N = 198 \Rightarrow 99(c-a)=198 \Rightarrow c-a=2\).`,
      "",
      "Step 3: Arithmetic progression gives:",
      R`\(b-a=c-b \Rightarrow 2b=a+c\). With \(c=a+2\), we get \(b=a+1\).`,
      "",
      "Step 4: So the possible numbers are 234, 345, 456, 567, 678, 789.",
      "",
      "Step 5: Only 567 is divisible by 7 (since 567 = 7×81).",
      "",
      "Final answer: 567",
    ),
  }),

  makeRow({
    question: L(
      "Find the smallest positive integer n such that:",
      R`\(9\mid n\),`,
      R`\(8\mid (n+1)\),`,
      R`\(7\mid (n+2)\).`,
      "",
      "What is n?",
    ),
    correct: "495",
    wrong: ["441", "315", "555"],
    explanation: L(
      "Step 1: Convert each condition into a congruence:",
      R`\(n\equiv 0\ (\mathrm{mod}\ 9)\), \(n\equiv 7\ (\mathrm{mod}\ 8)\), \(n\equiv 5\ (\mathrm{mod}\ 7)\).`,
      "",
      "Step 2: Solve the mod 8 and mod 7 conditions first.",
      R`Let \(n=8k+7\). Then \(8k+7\equiv 5\ (\mathrm{mod}\ 7)\Rightarrow k\equiv 5\ (\mathrm{mod}\ 7)\).`,
      R`So \(k=7m+5\) and \(n=8(7m+5)+7=56m+47\).`,
      "",
      "Step 3: Impose the mod 9 condition:",
      R`\(56m+47\equiv 0\ (\mathrm{mod}\ 9)\). Since \(56\equiv 2\) and \(47\equiv 2\) (mod 9),`,
      R`\(2m+2\equiv 0\Rightarrow 2m\equiv 7\ (\mathrm{mod}\ 9)\).`,
      "",
      "Step 4: The inverse of 2 mod 9 is 5, so",
      R`\(m\equiv 7\cdot 5\equiv 35\equiv 8\ (\mathrm{mod}\ 9)\Rightarrow m=9t+8\).`,
      "",
      "Step 5: Substitute back:",
      R`\(n=56(9t+8)+47=504t+495\). Smallest positive is \(n=495\).`,
      "",
      "Final answer: 495",
    ),
  }),

  makeRow({
    question: L(
      "Find the smallest positive integer n that satisfies ALL of the following:",
      R`\(n\equiv 1\ (\mathrm{mod}\ 4)\)`,
      R`\(n\equiv 2\ (\mathrm{mod}\ 5)\)`,
      R`\(n\equiv 3\ (\mathrm{mod}\ 6)\)`,
      R`and \(7\mid n\).`,
      "",
      "What is n?",
    ),
    correct: "357",
    wrong: ["57", "217", "287"],
    explanation: L(
      "Step 1: Solve the first three congruences (mod 4,5,6).",
      R`From the first two: \(n=4a+1\) and \(4a+1\equiv 2\ (\mathrm{mod}\ 5)\Rightarrow 4a\equiv 1\Rightarrow a\equiv 4\ (\mathrm{mod}\ 5)\).`,
      R`So \(a=5b+4\Rightarrow n=4(5b+4)+1=20b+17\).`,
      "",
      "Step 2: Use the mod 6 condition:",
      R`\(20b+17\equiv 3\ (\mathrm{mod}\ 6)\). Since \(20\equiv 2\) and \(17\equiv 5\) (mod 6),`,
      R`\(2b+5\equiv 3\Rightarrow 2b\equiv 4\Rightarrow b\equiv 2\ (\mathrm{mod}\ 3)\).`,
      R`So \(b=3c+2\Rightarrow n=20(3c+2)+17=60c+57\).`,
      "",
      "Step 3: Now require n to be divisible by 7:",
      R`\(60c+57\equiv 0\ (\mathrm{mod}\ 7)\). Since \(60\equiv 4\) and \(57\equiv 1\) (mod 7),`,
      R`\(4c+1\equiv 0\Rightarrow 4c\equiv 6\).`,
      "",
      "Step 4: The inverse of 4 mod 7 is 2, so",
      R`\(c\equiv 6\cdot 2\equiv 12\equiv 5\ (\mathrm{mod}\ 7)\Rightarrow c=7k+5\).`,
      "",
      "Step 5: Substitute back:",
      R`\(n=60(7k+5)+57=420k+357\). Smallest is 357.`,
      "",
      "Final answer: 357",
    ),
  }),

  makeRow({
    question: L(
      "Find the smallest positive integer n that is divisible by 12 and has exactly 24 positive divisors.",
      "",
      "What is n?",
    ),
    correct: "360",
    wrong: ["240", "300", "420"],
    explanation: L(
      "Step 1: Because n is divisible by 12, its prime factorisation includes at least",
      R`\(2^2\cdot 3\).`,
      "",
      "Step 2: If \(n=2^a\cdot 3^b\cdot 5^c\cdots\), then the number of divisors is",
      R`\((a+1)(b+1)(c+1)\cdots\). We need this to equal 24.`,
      "",
      "Step 3: To make n as small as possible, use small primes and keep exponents low.",
      R`Try \((a+1)(b+1)(c+1)=4\cdot 3\cdot 2=24\Rightarrow (a,b,c)=(3,2,1)\).`,
      "",
      "Step 4: This gives",
      R`\(n=2^3\cdot 3^2\cdot 5=8\cdot 9\cdot 5=360\), and it is divisible by 12.`,
      "",
      "Step 5: Any other way to make 24 divisors while keeping \(a\ge 2\) forces either bigger exponents or bigger primes, so n increases.",
      "",
      "Final answer: 360",
    ),
  }),

  makeRow({
    question: L(
      "How many pairs of positive integers (x, y) with x ≤ y satisfy",
      R`\(\frac{1}{x} + \frac{1}{y} = \frac{1}{6}\) ?`,
    ),
    correct: "5",
    wrong: ["4", "6", "9"],
    explanation: L(
      "Step 1: Combine the fractions:",
      R`\(\frac{1}{x}+\frac{1}{y}=\frac{x+y}{xy}=\frac{1}{6}\Rightarrow 6(x+y)=xy\).`,
      "",
      "Step 2: Rearrange and factor by completing a rectangle:",
      R`\(xy-6x-6y=0\Rightarrow xy-6x-6y+36=36\Rightarrow (x-6)(y-6)=36\).`,
      "",
      "Step 3: Let \(x-6=d\) and \(y-6=\frac{36}{d}\) where d is a positive divisor of 36.",
      "",
      "Step 4: Impose x ≤ y, i.e. \(d \le \frac{36}{d}\Rightarrow d^2\le 36\Rightarrow d\le 6\).",
      "",
      "Step 5: Positive divisors \(d\le 6\) are \(1,2,3,4,6\), giving 5 solutions.",
      "",
      "Final answer: 5",
    ),
  }),

  makeRow({
    question: L(
      "An integer N satisfies ALL of the following:",
      "- N leaves the same remainder when divided by 7 and by 13.",
      "- 100 < N < 200.",
      "- N is a multiple of 5.",
      "",
      "What is N?",
    ),
    correct: "185",
    wrong: ["105", "145", "195"],
    explanation: L(
      "Step 1: If N leaves the same remainder r when divided by 7 and 13, then",
      R`\(N=7a+r\) and \(N=13b+r\). Subtracting gives \(7a=13b\).`,
      "",
      "Step 2: Because 7 and 13 are coprime, we must have",
      R`\(a=13t\) and \(b=7t\) for some integer t.`,
      "",
      "Step 3: Substitute back:",
      R`\(N=7(13t)+r=91t+r\), where \(0\le r\le 6\) (it must be a remainder mod 7).`,
      "",
      "Step 4: Use 100 < N < 200. If t=1 then \(N=91+r<100\). So t=2 and \(N=182+r\).",
      "",
      "Step 5: N is a multiple of 5, and 182 ≡ 2 (mod 5), so r ≡ 3 (mod 5). With 0≤r≤6, we get r=3.",
      R`So \(N=182+3=185\).`,
      "",
      "Final answer: 185",
    ),
  }),

  makeRow({
    question: L(
      "For which integers n is the number",
      R`\(n^2 - 5n + 6\)`,
      "a prime number?",
    ),
    correct: "n = 1 or n = 4",
    wrong: ["n = 2 only", "n = 4 only", "n = 1 only"],
    explanation: L(
      "Step 1: Factor the quadratic:",
      R`\(n^2-5n+6=(n-2)(n-3)\).`,
      "",
      "Step 2: A prime number is an integer > 1 with no positive factors other than 1 and itself.",
      "So \((n-2)(n-3)\) must be a prime, meaning one factor must be 1 and the other must be that prime (both positive).",
      "",
      "Step 3: Try \(n-2=1\Rightarrow n=3\). Then \(n-3=0\) so the product is 0, not prime.",
      "",
      "Step 4: Try \(n-3=1\Rightarrow n=4\). Then \(n-2=2\) and the product is 2, which is prime.",
      "",
      "Step 5: If one factor is -1 and the other is -p, the product can also be a positive prime. Try \(n-2=-1\Rightarrow n=1\). Then \(n-3=-2\) and the product is 2 (prime).",
      "",
      "Final answer: n = 1 or n = 4",
    ),
  }),

  makeRow({
    question: L(
      "How many pairs of positive integers (x, y) with x < y satisfy:",
      R`\(\gcd(x,y)=6\) and \(\mathrm{lcm}(x,y)=84\) ?`,
    ),
    correct: "2",
    wrong: ["1", "3", "4"],
    explanation: L(
      "Step 1: Write \(x=6a\) and \(y=6b\) where \(\gcd(a,b)=1\).",
      "",
      "Step 2: Then",
      R`\(\mathrm{lcm}(x,y)=6\cdot \mathrm{lcm}(a,b)=6ab\) (because a and b are coprime).`,
      "",
      "Step 3: Use the lcm condition:",
      R`\(6ab=84\Rightarrow ab=14\).`,
      "",
      "Step 4: List coprime factor pairs of 14 with a<b:",
      R`\((a,b)=(1,14)\) and \((2,7)\).`,
      "",
      "Step 5: Convert back to (x,y):",
      R`\((6,84)\) and \((12,42)\). So there are 2 pairs.`,
      "",
      "Final answer: 2",
    ),
  }),

  makeRow({
    question: L(
      R`Let \(T_n=\frac{n(n+1)}{2}\) be the nth triangular number.`,
      "Find the smallest n such that \(T_n\) is divisible by 90 but not divisible by 180.",
    ),
    correct: "35",
    wrong: ["25", "30", "45"],
    explanation: L(
      "Step 1: \(T_n\) divisible by 90 means",
      R`\(\frac{n(n+1)}{2}\) is divisible by \(90\Rightarrow n(n+1)\) is divisible by 180.`,
      "",
      "Step 2: \(T_n\) NOT divisible by 180 means \(n(n+1)\) is NOT divisible by 360.",
      "So we need \(n(n+1)\) divisible by \(180\) but not by \(360\).",
      "",
      "Step 3: This means \(n(n+1)\) must have exactly two factors of 2 (i.e. divisible by 4 but not by 8).",
      "",
      "Step 4: Try n=35:",
      R`\(35\cdot 36 = 1260\). This is divisible by 180 (since \(1260/180=7\)) but not by 360 (since \(1260/360\) is not an integer).`,
      "",
      "Step 5: Then",
      R`\(T_{35}=\frac{35\cdot 36}{2}=630\), and \(630/90=7\) but \(630/180\) is not an integer.`,
      "",
      "Final answer: 35",
    ),
  }),

  makeRow({
    question: L(
      "A three-digit number N has digits a, b, c (in that order).",
      "The middle digit equals the sum of the first and last digits, so b = a + c.",
      "Also, N + (reversed N) = 968.",
      "Finally, N is divisible by 7.",
      "",
      "What is N?",
    ),
    correct: "385",
    wrong: ["187", "583", "880"],
    explanation: L(
      "Step 1: Write N and its reverse:",
      R`\(N=100a+10b+c\) and \(R=100c+10b+a\).`,
      "",
      "Step 2: Add them:",
      R`\(N+R = 101(a+c)+20b\).`,
      "",
      "Step 3: Use b = a + c. Let \(s=a+c\). Then",
      R`\(101s+20s=121s=968\Rightarrow s=8\).`,
      "",
      "Step 4: So b=8 and \(a+c=8\). Possible pairs are (1,7),(2,6),(3,5),(4,4),(5,3),(6,2),(7,1),(8,0), giving candidates 187,286,385,484,583,682,781,880.",
      "",
      "Step 5: Check divisibility by 7: only 385 is divisible by 7 (since 385 = 7×55).",
      "",
      "Final answer: 385",
    ),
  }),

  makeRow({
    question: L(
      "Two positive integers a and b satisfy:",
      R`\(a-b=6\) and \(\frac{1}{a}+\frac{1}{b}=\frac{1}{4}\).`,
      "",
      "Find a + b.",
    ),
    correct: "18",
    wrong: ["16", "20", "24"],
    explanation: L(
      "Step 1: Use \(a=b+6\).",
      "",
      "Step 2: Substitute into the fraction equation:",
      R`\(\frac{1}{b+6}+\frac{1}{b}=\frac{1}{4}\).`,
      "",
      "Step 3: Combine the left-hand side:",
      R`\(\frac{b+(b+6)}{b(b+6)}=\frac{2b+6}{b(b+6)}=\frac{1}{4}\).`,
      "",
      "Step 4: Cross-multiply:",
      R`\(4(2b+6)=b(b+6)\Rightarrow 8b+24=b^2+6b\Rightarrow b^2-2b-24=0\).`,
      "",
      "Step 5: Factor:",
      R`\((b-6)(b+4)=0\Rightarrow b=6\) (positive). Then \(a=b+6=12\).`,
      R`So \(a+b=18\).`,
      "",
      "Final answer: 18",
    ),
  }),

  makeRow({
    question: L(
      "Find the smallest positive integer n such that 72n is a perfect sixth power.",
      "(A perfect sixth power is both a perfect square and a perfect cube.)",
    ),
    correct: "648",
    wrong: ["72", "216", "1296"],
    explanation: L(
      "Step 1: Prime-factorise 72:",
      R`\(72=2^3\cdot 3^2\).`,
      "",
      "Step 2: For 72n to be a sixth power, each prime exponent must be a multiple of 6.",
      "",
      "Step 3: For the factor 2^3, we need 3 more twos to reach 2^6.",
      R`So n must contribute \(2^3\).`,
      "",
      "Step 4: For the factor 3^2, we need 4 more threes to reach 3^6.",
      R`So n must contribute \(3^4\).`,
      "",
      "Step 5: Therefore",
      R`\(n=2^3\cdot 3^4=8\cdot 81=648\).`,
      "",
      "Final answer: 648",
    ),
  }),

  makeRow({
    question: L(
      "Find the smallest positive integer n such that:",
      "- n is divisible by 45, and",
      "- n has exactly 12 positive divisors.",
      "",
      "What is n?",
    ),
    correct: "90",
    wrong: ["45", "135", "180"],
    explanation: L(
      "Step 1: Being divisible by 45 means n has prime factors at least",
      R`\(45=3^2\cdot 5\).`,
      "",
      "Step 2: Write \(n=2^a\cdot 3^b\cdot 5^c\cdots\) with \(b\ge 2\) and \(c\ge 1\).",
      "The number of divisors is \((a+1)(b+1)(c+1)\cdots = 12.",
      "",
      "Step 3: To minimise n, try using only primes 2,3,5 and make",
      R`\((a+1)(b+1)(c+1)=2\cdot 3\cdot 2=12\Rightarrow (a,b,c)=(1,2,1)\).`,
      "",
      "Step 4: That gives",
      R`\(n=2^1\cdot 3^2\cdot 5^1 = 2\cdot 9\cdot 5=90\).`,
      "",
      "Step 5: Check divisor count: \((1+1)(2+1)(1+1)=2\cdot 3\cdot 2=12.\nSo 90 works and is clearly minimal.",
      "",
      "Final answer: 90",
    ),
  }),

  makeRow({
    question: L(
      "Find the smallest positive integer n such that:",
      "- n is divisible by 2, 3, 4, 5 and 6,",
      "- n is NOT divisible by 7,",
      "- but n + 1 IS divisible by 7.",
      "",
      "What is n?",
    ),
    correct: "300",
    wrong: ["60", "420", "840"],
    explanation: L(
      "Step 1: Being divisible by 2,3,4,5,6 means n is a multiple of their LCM.",
      R`\(\mathrm{lcm}(2,3,4,5,6)=60\). So \(n=60k\).`,
      "",
      "Step 2: Use the condition \(7\mid (n+1)\):",
      R`\(60k+1\equiv 0\ (\mathrm{mod}\ 7)\).`,
      "",
      "Step 3: Reduce 60 mod 7: \(60\equiv 4\). So",
      R`\(4k+1\equiv 0\Rightarrow 4k\equiv 6\ (\mathrm{mod}\ 7)\).`,
      "",
      "Step 4: Inverse of 4 mod 7 is 2, so",
      R`\(k\equiv 6\cdot 2\equiv 12\equiv 5\ (\mathrm{mod}\ 7)\). Smallest positive is \(k=5\).`,
      "",
      "Step 5: Then \(n=60\cdot 5=300\). Check: 300 is not divisible by 7, but 301 is.",
      "",
      "Final answer: 300",
    ),
  }),

  makeRow({
    question: L(
      "How many positive integers n less than 1000 have exactly three positive factors?",
    ),
    correct: "11",
    wrong: ["10", "12", "15"],
    explanation: L(
      "Step 1: A number has exactly 3 positive divisors if and only if it is the square of a prime.",
      "Reason: divisor count \(= (2+1)=3\) happens only for \(p^2\).",
      "",
      "Step 2: So we need prime squares \(p^2 < 1000\).",
      "",
      "Step 3: This means \(p < \\sqrt{1000}\\approx 31.6\).",
      "",
      "Step 4: List primes up to 31:",
      "2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31.",
      "",
      "Step 5: There are 11 such primes, hence 11 such squares.",
      "",
      "Final answer: 11",
    ),
  }),

  // Theme B: Algebra + sequences (multi-step reasoning)
  makeRow({
    question: L(
      R`A nonzero real number x satisfies \(x+\frac{1}{x}=3\).`,
      R`Find \(x^5+\frac{1}{x^5}\).`,
    ),
    correct: "123",
    wrong: ["81", "121", "129"],
    explanation: L(
      "Step 1: Let \(S_n = x^n + \\frac{1}{x^n}\). We know \(S_1=3\) and \(S_0=2\).",
      "",
      "Step 2: Use the recurrence",
      R`\(S_{n}=S_1S_{n-1}-S_{n-2}\) (from multiplying \(x+\frac1x\) by \(x^{n-1}+\frac1{x^{n-1}}\)).`,
      "",
      "Step 3: Compute:",
      R`\(S_2=3\cdot 3-2=7\).`,
      R`\(S_3=3\cdot 7-3=18\).`,
      "",
      "Step 4: Continue:",
      R`\(S_4=3\cdot 18-7=47\).`,
      R`\(S_5=3\cdot 47-18=123\).`,
      "",
      "Step 5: Therefore \(x^5+\\frac{1}{x^5}=123\).",
      "",
      "Final answer: 123",
    ),
  }),

  makeRow({
    question: L(
      R`Two numbers a and b satisfy \(a+b=5\) and \(ab=1\).`,
      R`Find \(a^5+b^5\).`,
    ),
    correct: "2525",
    wrong: ["2500", "2550", "2625"],
    explanation: L(
      "Step 1: Let \(S_n=a^n+b^n\). We know \(S_0=2\) and \(S_1=a+b=5\).",
      "",
      "Step 2: Because a and b are roots of \(t^2-5t+1=0\), they satisfy",
      R`\(t^2=5t-1\). Multiplying by \(t^{n-2}\) gives \(t^n=5t^{n-1}-t^{n-2}\).`,
      "",
      "Step 3: So the sums satisfy the recurrence",
      R`\(S_n=5S_{n-1}-S_{n-2}\).`,
      "",
      "Step 4: Compute:",
      R`\(S_2=5\cdot 5-2=23\)`,
      R`\(S_3=5\cdot 23-5=110\)`,
      R`\(S_4=5\cdot 110-23=527\)`,
      "",
      "Step 5: Then",
      R`\(S_5=5\cdot 527-110=2525\).`,
      "",
      "Final answer: 2525",
    ),
  }),

  makeRow({
    question: L(
      R`Simplify \(\sqrt{5+2\sqrt{6}}\) exactly.`,
    ),
    correct: R`\sqrt{2} + \sqrt{3}`,
    wrong: [R`\sqrt{8}`, R`\sqrt{5} + \sqrt{6}`, R`\sqrt{3} - \sqrt{2}`],
    explanation: L(
      "Step 1: Suppose",
      R`\(\sqrt{5+2\sqrt6}=\sqrt{a}+\sqrt{b}\) for positive a,b.`,
      "",
      "Step 2: Square both sides:",
      R`\(5+2\sqrt6 = a + b + 2\sqrt{ab}\).`,
      "",
      "Step 3: Match the rational and irrational parts:",
      R`\(a+b=5\) and \(ab=6\).`,
      "",
      "Step 4: Solve \(a+b=5, ab=6\). The numbers are \(a=2\) and \(b=3\).",
      "",
      "Step 5: Therefore",
      R`\(\sqrt{5+2\sqrt6}=\sqrt2+\sqrt3\).`,
      "",
      "Final answer: \\(\\sqrt{2}+\\sqrt{3}\\)",
    ),
  }),

  makeRow({
    question: L(
      "Evaluate and simplify:",
      R`\(\frac{\frac{1}{\sqrt{5}}-\sqrt{5}}{\frac{1}{\sqrt{5}}+\sqrt{5}}\).`,
    ),
    correct: R`-\frac{2}{3}`,
    wrong: [R`-\frac{3}{2}`, R`\frac{2}{3}`, R`-\frac{1}{3}`],
    explanation: L(
      "Step 1: Put each part over a common denominator \\(\\sqrt5\\):",
      R`\(\frac{1}{\sqrt5}-\sqrt5=\frac{1-5}{\sqrt5}=\frac{-4}{\sqrt5}\).`,
      R`\(\frac{1}{\sqrt5}+\sqrt5=\frac{1+5}{\sqrt5}=\frac{6}{\sqrt5}\).`,
      "",
      "Step 2: Substitute into the big fraction:",
      R`\(\frac{-4/\sqrt5}{6/\sqrt5}\).`,
      "",
      "Step 3: Dividing by a fraction multiplies by its reciprocal:",
      R`\(\frac{-4}{\sqrt5}\cdot\frac{\sqrt5}{6}\).`,
      "",
      "Step 4: Cancel \\(\\sqrt5\\):",
      R`\(\frac{-4}{6}=-\frac{2}{3}\).`,
      "",
      "Step 5: This is already in simplest form.",
      "",
      "Final answer: \\(-\\frac{2}{3}\\)",
    ),
  }),

  makeRow({
    question: L(
      R`The quadratic \(x^2-(k+1)x+k=0\) has two integer roots that differ by 3.`,
      "Find all possible values of k.",
    ),
    correct: "k = -2 or k = 4",
    wrong: ["k = 2 or k = 4", "k = -4 or k = 2", "k = -2 only"],
    explanation: L(
      "Step 1: Let the integer roots be \(r\) and \(r+3\).",
      "",
      "Step 2: Sum of roots is \(k+1\):",
      R`\(r+(r+3)=2r+3=k+1\Rightarrow k=2r+2\).`,
      "",
      "Step 3: Product of roots is k:",
      R`\(r(r+3)=r^2+3r=k\).`,
      "",
      "Step 4: Equate the two expressions for k:",
      R`\(r^2+3r=2r+2\Rightarrow r^2+r-2=0\Rightarrow (r+2)(r-1)=0\).`,
      "",
      "Step 5: So \(r=1\) gives roots 1 and 4, hence \(k=4\).",
      "And \(r=-2\) gives roots -2 and 1, hence \(k=-2\).",
      "",
      "Final answer: k = -2 or k = 4",
    ),
  }),

  makeRow({
    question: L(
      "A rectangle has side lengths in the ratio 3:5.",
      "Its longer side is increased by 4 cm and its shorter side is decreased by 2 cm.",
      "The area stays the same.",
      "",
      "What was the original area (in cm^2)?",
    ),
    correct: "240",
    wrong: ["160", "200", "280"],
    explanation: L(
      "Step 1: Let the sides be \(3k\) and \(5k\) (k>0).",
      "",
      "Step 2: The new sides are \(3k-2\) and \(5k+4\).",
      "",
      "Step 3: Area stays the same:",
      R`\(15k^2=(3k-2)(5k+4)\).`,
      "",
      "Step 4: Expand the right-hand side:",
      R`\( (3k-2)(5k+4)=15k^2+12k-10k-8=15k^2+2k-8\).`,
      "So \(15k^2=15k^2+2k-8\Rightarrow 2k=8\Rightarrow k=4\).",
      "",
      "Step 5: Original sides are 12 and 20, so area \(=12\\times 20=240\).",
      "",
      "Final answer: 240",
    ),
  }),

  makeRow({
    question: L(
      "Two numbers x and y satisfy:",
      R`\(x+y=15\) and \(x^2+y^2=117\).`,
      "",
      "Find xy.",
    ),
    correct: "54",
    wrong: ["48", "56", "60"],
    explanation: L(
      "Step 1: Use the identity",
      R`\(x^2+y^2=(x+y)^2-2xy\).`,
      "",
      "Step 2: Substitute the given values:",
      R`\(117 = 15^2 - 2xy = 225 - 2xy\).`,
      "",
      "Step 3: Rearrange:",
      R`\(2xy=225-117=108\).`,
      "",
      "Step 4: Divide by 2:",
      R`\(xy=54\).`,
      "",
      "Step 5: (Optional check) The numbers are roots of \(t^2-15t+54=0\Rightarrow t=6,9\), consistent.",
      "",
      "Final answer: 54",
    ),
  }),

  makeRow({
    question: L(
      R`For positive numbers x and y, \(\frac{x}{y}+\frac{y}{x}=\frac{5}{2}\).`,
      "Find the ratio x:y in simplest form.",
    ),
    correct: "2:1",
    wrong: ["5:2", "3:2", "1:2"],
    explanation: L(
      "Step 1: Let \(r=\\frac{x}{y}\). Then \\(\\frac{y}{x}=\\frac{1}{r}\\).",
      "",
      "Step 2: Substitute into the equation:",
      R`\(r+\frac{1}{r}=\frac{5}{2}\).`,
      "",
      "Step 3: Multiply by 2r to clear denominators:",
      R`\(2r^2+2=5r\Rightarrow 2r^2-5r+2=0\).`,
      "",
      "Step 4: Factor:",
      R`\((2r-1)(r-2)=0\Rightarrow r=2\ \text{or}\ r=\frac12\).`,
      "",
      "Step 5: r=x/y, so x:y is 2:1 (or 1:2). In simplest form we can state 2:1.",
      "",
      "Final answer: 2:1",
    ),
  }),

  makeRow({
    question: L(
      "Solve the equation:",
      R`\(|2x-3|+|x+1|=13\).`,
      "",
      "Find the sum of all solutions.",
    ),
    correct: R`\frac{4}{3}`,
    wrong: [R`\frac{2}{3}`, "2", R`\frac{14}{3}`],
    explanation: L(
      "Step 1: The sign changes happen at \(2x-3=0\Rightarrow x=\\frac{3}{2}\) and \(x+1=0\Rightarrow x=-1\).",
      "",
      "Step 2: Case 1, \(x\\ge \\frac{3}{2}\):",
      R`\(|2x-3|=2x-3,\ |x+1|=x+1\Rightarrow 3x-2=13\Rightarrow x=5\).`,
      "",
      "Step 3: Case 2, \(-1\\le x<\\frac{3}{2}\):",
      R`\(|2x-3|=3-2x,\ |x+1|=x+1\Rightarrow 4-x=13\Rightarrow x=-9\) (not in this interval).`,
      "",
      "Step 4: Case 3, \(x<-1\):",
      R`\(|2x-3|=3-2x,\ |x+1|=-(x+1)=-x-1\Rightarrow 2-3x=13\Rightarrow x=-\frac{11}{3}\).`,
      "",
      "Step 5: Sum the valid solutions:",
      R`\(5+(-\frac{11}{3})=\frac{15-11}{3}=\frac{4}{3}\).`,
      "",
      "Final answer: \\(\\frac{4}{3}\\)",
    ),
  }),

  makeRow({
    question: L(
      "Solve the equation:",
      R`\(\frac{1}{x-1}+\frac{1}{x-3}=1\).`,
      "",
      "What is the product of the two solutions?",
    ),
    correct: "7",
    wrong: ["5", "6", "8"],
    explanation: L(
      "Step 1: Combine the fractions:",
      R`\(\frac{(x-3)+(x-1)}{(x-1)(x-3)}=\frac{2x-4}{(x-1)(x-3)}=1\).`,
      "",
      "Step 2: Cross-multiply:",
      R`\(2x-4=(x-1)(x-3)=x^2-4x+3\).`,
      "",
      "Step 3: Rearrange into a quadratic:",
      R`\(0=x^2-6x+7\).`,
      "",
      "Step 4: For a quadratic \(x^2-6x+7=0\), the product of the roots is the constant term 7.",
      "",
      "Step 5: Therefore the product of the two solutions is 7.",
      "",
      "Final answer: 7",
    ),
  }),

  makeRow({
    question: L(
      R`A number x satisfies \(x^2-4x+1=0\).`,
      R`Find \(x^4+\frac{1}{x^4}\).`,
    ),
    correct: "194",
    wrong: ["196", "192", "182"],
    explanation: L(
      "Step 1: Divide the equation by x (x≠0):",
      R`\(x-4+\frac{1}{x}=0\Rightarrow x+\frac{1}{x}=4\).`,
      "",
      "Step 2: Square to get \(x^2+\\frac{1}{x^2}\):",
      R`\(\left(x+\frac{1}{x}\right)^2=x^2+2+\frac{1}{x^2}=16\Rightarrow x^2+\frac{1}{x^2}=14\).`,
      "",
      "Step 3: Square again:",
      R`\(\left(x^2+\frac{1}{x^2}\right)^2=x^4+2+\frac{1}{x^4}\).`,
      "",
      "Step 4: Substitute 14:",
      R`\(14^2 = x^4+2+\frac{1}{x^4}\Rightarrow x^4+\frac{1}{x^4}=196-2=194\).`,
      "",
      "Step 5: So the required value is 194.",
      "",
      "Final answer: 194",
    ),
  }),

  makeRow({
    question: L(
      "A sequence has nth term \(u_n=n^2+an+b\).",
      "The first three terms are:",
      R`\(u_1=7,\ u_2=12,\ u_3=19\).`,
      "",
      "Find \(u_{10}\).",
    ),
    correct: "124",
    wrong: ["114", "118", "144"],
    explanation: L(
      "Step 1: Write equations for n=1,2,3.",
      R`n=1: \(1+a+b=7\Rightarrow a+b=6\).`,
      R`n=2: \(4+2a+b=12\Rightarrow 2a+b=8\).`,
      R`n=3: \(9+3a+b=19\Rightarrow 3a+b=10\).`,
      "",
      "Step 2: Subtract the first two equations:",
      R`(2a+b)-(a+b)=a=2.`,
      "",
      "Step 3: Then b=6-a=4.",
      "",
      "Step 4: So \(u_n=n^2+2n+4\).",
      "",
      "Step 5: Compute \(u_{10}=10^2+2\\cdot 10+4=100+20+4=124\).",
      "",
      "Final answer: 124",
    ),
  }),

  makeRow({
    question: L(
      "A fraction is in simplest form.",
      "If you add 1 to the numerator and denominator, the value becomes 3/4.",
      "If you subtract 1 from the numerator and denominator, the value becomes 2/3.",
      "",
      "What is the fraction?",
    ),
    correct: R`\frac{5}{7}`,
    wrong: [R`\frac{7}{5}`, R`\frac{4}{7}`, R`\frac{5}{8}`],
    explanation: L(
      "Step 1: Let the fraction be \(\\frac{a}{b}\).",
      "",
      "Step 2: Use the first condition:",
      R`\(\frac{a+1}{b+1}=\frac{3}{4}\Rightarrow 4a+4=3b+3\Rightarrow 4a-3b=-1\).`,
      "",
      "Step 3: Use the second condition:",
      R`\(\frac{a-1}{b-1}=\frac{2}{3}\Rightarrow 3a-3=2b-2\Rightarrow 3a-2b=1\).`,
      "",
      "Step 4: Solve the two linear equations:",
      R`From \(3a-2b=1\), multiply by 3: \(9a-6b=3\).`,
      R`From \(4a-3b=-1\), multiply by 2: \(8a-6b=-2\).`,
      R`Subtract: \(a=5\). Then \(3(5)-2b=1\Rightarrow b=7\).`,
      "",
      "Step 5: The fraction is \(\\frac{5}{7}\) (already in simplest form).",
      "",
      "Final answer: \\(\\frac{5}{7}\\)",
    ),
  }),

  makeRow({
    question: L(
      "Two numbers x and y satisfy:",
      R`\(x+y=1\) and \(xy=-6\).`,
      "",
      R`Find \(x^3+y^3\).`,
    ),
    correct: "19",
    wrong: ["-19", "17", "21"],
    explanation: L(
      "Step 1: Use the identity",
      R`\(x^3+y^3=(x+y)^3-3xy(x+y)\).`,
      "",
      "Step 2: Substitute \(x+y=1\):",
      R`\(x^3+y^3=1^3-3xy\\cdot 1=1-3xy\).`,
      "",
      "Step 3: Substitute \(xy=-6\):",
      R`\(1-3(-6)=1+18=19\).`,
      "",
      "Step 4: No need to solve for x and y individually.",
      "",
      "Step 5: Therefore \(x^3+y^3=19\).",
      "",
      "Final answer: 19",
    ),
  }),

  makeRow({
    question: L(
      "Solve for x:",
      R`\(\sqrt{x+5}-\sqrt{x-1}=1\).`,
      "",
      "Give x as a fraction in simplest form.",
    ),
    correct: R`\frac{29}{4}`,
    wrong: ["7", R`\frac{25}{4}`, R`\frac{31}{4}`],
    explanation: L(
      "Step 1: Move one root to the other side:",
      R`\(\sqrt{x+5}=1+\sqrt{x-1}\).`,
      "",
      "Step 2: Square both sides:",
      R`\(x+5 = 1 + 2\sqrt{x-1} + (x-1)\).`,
      "",
      "Step 3: Simplify:",
      R`\(x+5 = x + 2\sqrt{x-1}\Rightarrow 5=2\sqrt{x-1}\).`,
      "",
      "Step 4: Divide and square again:",
      R`\(\sqrt{x-1}=\frac{5}{2}\Rightarrow x-1=\frac{25}{4}\Rightarrow x=\frac{29}{4}\).`,
      "",
      "Step 5: Check: \\(\\sqrt{29/4+5}-\\sqrt{29/4-1}=\\sqrt{49/4}-\\sqrt{25/4}=7/2-5/2=1\\).",
      "",
      "Final answer: \\(\\frac{29}{4}\\)",
    ),
  }),

  // Theme C: Geometry (diagram-free, but precise)
  makeRow({
    question: L(
      "In a right-angled triangle, the altitude from the right angle meets the hypotenuse and splits it into segments of 4 cm and 9 cm.",
      "",
      "Find the area of the triangle.",
    ),
    correct: R`39\text{ cm}^2`,
    wrong: [R`45\text{ cm}^2`, R`26\text{ cm}^2`, R`52\text{ cm}^2`],
    explanation: L(
      "Step 1: Let the hypotenuse be split into lengths p=4 and q=9, so the hypotenuse is",
      R`\(c=p+q=13\).`,
      "",
      "Step 2: In a right triangle, the altitude to the hypotenuse has length",
      R`\(h=\sqrt{pq}=\sqrt{4\cdot 9}=6\).`,
      "",
      "Step 3: The area can be found using base = hypotenuse and height = altitude:",
      R`\(\text{Area}=\frac12\cdot c\cdot h=\frac12\cdot 13\cdot 6\).`,
      "",
      "Step 4: Compute:",
      R`\(\frac12\cdot 13\cdot 6 = 39\).`,
      "",
      "Step 5: Attach units:",
      R`\(\text{Area}=39\text{ cm}^2\).`,
      "",
      "Final answer: 39 cm^2",
    ),
  }),

  makeRow({
    question: L(
      "In a circle, chord AB is 10 cm long.",
      "The perpendicular distance from the centre O to chord AB is 6 cm.",
      "",
      "Find the radius r and the area of the circle.",
    ),
    correct: R`r=\sqrt{61}\text{ cm},\ \text{area}=61\pi\text{ cm}^2`,
    wrong: [
      R`r=8\text{ cm},\ \text{area}=64\pi\text{ cm}^2`,
      R`r=7\text{ cm},\ \text{area}=49\pi\text{ cm}^2`,
      R`r=\sqrt{61}\text{ cm},\ \text{area}=61\text{ cm}^2`,
    ],
    explanation: L(
      "Step 1: The perpendicular from the centre to a chord bisects the chord, so half the chord is 5 cm.",
      "",
      "Step 2: Form a right triangle with hypotenuse r (radius), one leg 6 (distance to chord), and other leg 5 (half-chord).",
      "",
      "Step 3: Use Pythagoras:",
      R`\(r^2=6^2+5^2=36+25=61\Rightarrow r=\sqrt{61}\).`,
      "",
      "Step 4: Area of the circle is",
      R`\(\pi r^2 = \pi\cdot 61 = 61\pi\).`,
      "",
      "Step 5: Include units:",
      R`\(r=\sqrt{61}\text{ cm}\) and area \(=61\pi\text{ cm}^2\).`,
      "",
      "Final answer: r = √61 cm, area = 61π cm^2",
    ),
  }),

  makeRow({
    question: L(
      "A sector has radius 9 cm and central angle 80°.",
      "Find the perimeter of the sector in terms of π.",
    ),
    correct: R`18+4\pi\text{ cm}`,
    wrong: [R`18+\frac{8\pi}{9}\text{ cm}`, R`9+4\pi\text{ cm}`, R`18+\frac{4\pi}{9}\text{ cm}`],
    explanation: L(
      "Step 1: Perimeter of a sector = two radii + arc length.",
      R`So \(P=2r+\text{arc}\).`,
      "",
      "Step 2: Here \(r=9\), so the two radii contribute 18 cm.",
      "",
      "Step 3: Arc length is the same fraction of the full circumference as the angle is of 360°:",
      R`\(\text{arc}=\frac{80}{360}\cdot 2\pi r\).`,
      "",
      "Step 4: Substitute r=9:",
      R`\(\text{arc}=\frac{80}{360}\cdot 18\pi=\frac{2}{9}\cdot 18\pi=4\pi\).`,
      "",
      "Step 5: Add arc + radii:",
      R`\(P=18+4\pi\text{ cm}\).`,
      "",
      "Final answer: 18 + 4π cm",
    ),
  }),

  makeRow({
    question: L(
      "A rectangle is inscribed in a semicircle of radius 10 cm with its base on the diameter.",
      "The rectangle has width 12 cm.",
      "",
      "Find the fraction of the semicircle's area occupied by the rectangle, in terms of π.",
    ),
    correct: R`\frac{48}{25\pi}`,
    wrong: [R`\frac{24}{25\pi}`, R`\frac{48}{50\pi}`, R`\frac{96}{25\pi}`],
    explanation: L(
      "Step 1: The semicircle has radius 10, so the full circle equation gives a right triangle from the centre to a top corner.",
      "",
      "Step 2: Half the rectangle's width is 6 cm, so from the centre to the side is 6 cm horizontally.",
      "",
      "Step 3: The height h of the rectangle satisfies",
      R`\(h^2+6^2=10^2\Rightarrow h^2=100-36=64\Rightarrow h=8\).`,
      "",
      "Step 4: Rectangle area = \(12\\times 8=96\).",
      "",
      "Step 5: Semicircle area = \\(\\frac12\\pi r^2=\\frac12\\pi\\cdot 100=50\\pi\\).",
      R`So fraction \(=\frac{96}{50\pi}=\frac{48}{25\pi}\).`,
      "",
      "Final answer: \\(\\frac{48}{25\\pi}\\)",
    ),
  }),

  makeRow({
    question: L(
      "Two triangles are similar.",
      "The smaller triangle has base 6 cm and height 4 cm.",
      "The larger triangle has base 15 cm.",
      "",
      "Find the area of the larger triangle.",
    ),
    correct: R`75\text{ cm}^2`,
    wrong: [R`50\text{ cm}^2`, R`62.5\text{ cm}^2`, R`90\text{ cm}^2`],
    explanation: L(
      "Step 1: Area of the smaller triangle:",
      R`\(\frac12\cdot 6\cdot 4=12\text{ cm}^2\).`,
      "",
      "Step 2: Similar triangles have the same scale factor for all lengths.",
      R`Scale factor \(=\frac{15}{6}=\frac{5}{2}=2.5\).`,
      "",
      "Step 3: Areas scale by the square of the scale factor:",
      R`\(\text{Area factor}=(2.5)^2=6.25\).`,
      "",
      "Step 4: Multiply the small area by 6.25:",
      R`\(12\cdot 6.25=75\).`,
      "",
      "Step 5: Include units:",
      R`Area \(=75\text{ cm}^2\).`,
      "",
      "Final answer: 75 cm^2",
    ),
  }),

  makeRow({
    question: L(
      "Two chords AB and CD intersect at point E inside a circle.",
      "AE = 3 cm, EB = 12 cm and CE = 4 cm.",
      "",
      "Find ED.",
    ),
    correct: R`9\text{ cm}`,
    wrong: [R`4\text{ cm}`, R`12\text{ cm}`, R`36\text{ cm}`],
    explanation: L(
      "Step 1: Use the intersecting chords theorem:",
      R`\(AE\cdot EB = CE\cdot ED\).`,
      "",
      "Step 2: Substitute the given lengths:",
      R`\(3\cdot 12 = 4\cdot ED\).`,
      "",
      "Step 3: Compute the left-hand side:",
      R`\(36=4\cdot ED\).`,
      "",
      "Step 4: Divide by 4:",
      R`\(ED=9\).`,
      "",
      "Step 5: Include units:",
      R`\(ED=9\text{ cm}\).`,
      "",
      "Final answer: 9 cm",
    ),
  }),

  makeRow({
    question: L(
      "A circle has area 144π cm^2.",
      "A chord of the circle has length 12 cm.",
      "",
      "Find the perpendicular distance from the centre to the chord.",
    ),
    correct: R`6\sqrt{3}\text{ cm}`,
    wrong: [R`3\sqrt{3}\text{ cm}`, R`6\text{ cm}`, R`9\text{ cm}`],
    explanation: L(
      "Step 1: From area \(144\\pi\), the radius satisfies",
      R`\(\pi r^2=144\pi\Rightarrow r^2=144\Rightarrow r=12\).`,
      "",
      "Step 2: The perpendicular from the centre to the chord bisects the chord, so half the chord is 6 cm.",
      "",
      "Step 3: Make a right triangle with hypotenuse 12 (radius), one leg 6 (half-chord), and the other leg d (distance).",
      "",
      "Step 4: Pythagoras:",
      R`\(d^2 = 12^2-6^2=144-36=108\Rightarrow d=\sqrt{108}=6\sqrt3\).`,
      "",
      "Step 5: Include units:",
      R`Distance \(=6\sqrt3\text{ cm}\).`,
      "",
      "Final answer: 6√3 cm",
    ),
  }),

  makeRow({
    question: L(
      "A rectangle has perimeter 50 cm and diagonal length 17 cm.",
      "",
      "Find its area.",
    ),
    correct: R`168\text{ cm}^2`,
    wrong: [R`160\text{ cm}^2`, R`170\text{ cm}^2`, R`180\text{ cm}^2`],
    explanation: L(
      "Step 1: Let the side lengths be a and b.",
      R`Perimeter 50 gives \(2(a+b)=50\Rightarrow a+b=25\).`,
      "",
      "Step 2: Diagonal 17 gives",
      R`\(a^2+b^2=17^2=289\).`,
      "",
      "Step 3: Use",
      R`\((a+b)^2=a^2+b^2+2ab\).`,
      "",
      "Step 4: Substitute:",
      R`\(25^2=289+2ab\Rightarrow 625=289+2ab\Rightarrow 2ab=336\Rightarrow ab=168\).`,
      "",
      "Step 5: Area = ab = 168 cm^2.",
      "",
      "Final answer: 168 cm^2",
    ),
  }),

  makeRow({
    question: L(
      "A triangle has side lengths in the ratio 3:4:5 and perimeter 60 cm.",
      "",
      "Find its area.",
    ),
    correct: R`150\text{ cm}^2`,
    wrong: [R`120\text{ cm}^2`, R`180\text{ cm}^2`, R`225\text{ cm}^2`],
    explanation: L(
      "Step 1: Let the sides be \(3k,4k,5k\).",
      "",
      "Step 2: Use the perimeter:",
      R`\(3k+4k+5k=12k=60\Rightarrow k=5\).`,
      "",
      "Step 3: The sides are 15, 20, 25. This is a scaled 3–4–5 right triangle, so the right angle is between 15 and 20.",
      "",
      "Step 4: Area of a right triangle is \\(\\frac12\\times \\text{leg}\\times \\text{leg}\\):",
      R`\(\text{Area}=\frac12\cdot 15\cdot 20=150\).`,
      "",
      "Step 5: Include units: 150 cm^2.",
      "",
      "Final answer: 150 cm^2",
    ),
  }),

  makeRow({
    question: L(
      "A chord of a circle has length 12 cm and subtends an angle of 120° at the centre.",
      "",
      "Find the radius of the circle.",
    ),
    correct: R`4\sqrt{3}\text{ cm}`,
    wrong: [R`6\sqrt{3}\text{ cm}`, R`4\text{ cm}`, R`8\text{ cm}`],
    explanation: L(
      "Step 1: Use the chord formula in terms of central angle:",
      R`\(\text{chord}=2r\sin(\theta/2)\).`,
      "",
      "Step 2: Here chord = 12 and \\(\\theta=120^\u00b0\\), so \\(\\theta/2=60^\u00b0\\).",
      "",
      "Step 3: Substitute:",
      R`\(12=2r\sin 60^\circ = 2r\cdot \frac{\sqrt3}{2}=r\sqrt3\).`,
      "",
      "Step 4: Solve for r:",
      R`\(r=\frac{12}{\sqrt3}=\frac{12\sqrt3}{3}=4\sqrt3\).`,
      "",
      "Step 5: Include units:",
      R`Radius \(=4\sqrt3\text{ cm}\).`,
      "",
      "Final answer: 4√3 cm",
    ),
  }),

  makeRow({
    question: L(
      "A regular hexagon has side length 6 cm.",
      "",
      "Find its area in exact form.",
    ),
    correct: R`54\sqrt{3}\text{ cm}^2`,
    wrong: [R`36\sqrt{3}\text{ cm}^2`, R`72\sqrt{3}\text{ cm}^2`, R`108\sqrt{3}\text{ cm}^2`],
    explanation: L(
      "Step 1: A regular hexagon can be split into 6 equilateral triangles of side 6.",
      "",
      "Step 2: Area of one equilateral triangle is",
      R`\(\frac{\sqrt3}{4}s^2=\frac{\sqrt3}{4}\cdot 36=9\sqrt3\).`,
      "",
      "Step 3: Multiply by 6 triangles:",
      R`\(6\cdot 9\sqrt3=54\sqrt3\).`,
      "",
      "Step 4: This is exact (no rounding).",
      "",
      "Step 5: Include units:",
      R`Area \(=54\sqrt3\text{ cm}^2\).`,
      "",
      "Final answer: 54√3 cm^2",
    ),
  }),

  makeRow({
    question: L(
      "Two cones are similar.",
      "Their volumes are in the ratio 8:27.",
      "",
      "Find the ratio of their radii.",
    ),
    correct: "2:3",
    wrong: ["4:9", "8:27", "3:2"],
    explanation: L(
      "Step 1: For similar 3D shapes, volumes scale with the cube of the linear scale factor.",
      "",
      "Step 2: Let the radii ratio be \(k:1\). Then the volume ratio is \(k^3:1\).",
      "",
      "Step 3: We are told the volume ratio is 8:27, so the linear ratio is the cube root:",
      R`\(\sqrt[3]{8}:\sqrt[3]{27}=2:3\).`,
      "",
      "Step 4: Therefore the radii are in ratio 2:3.",
      "",
      "Step 5: (Check) \(2^3:3^3=8:27\), matching the given volume ratio.",
      "",
      "Final answer: 2:3",
    ),
  }),

  makeRow({
    question: L(
      "A triangle has side lengths 13 cm, 14 cm and 15 cm.",
      "",
      "Find its area.",
    ),
    correct: R`84\text{ cm}^2`,
    wrong: [R`78\text{ cm}^2`, R`90\text{ cm}^2`, R`96\text{ cm}^2`],
    explanation: L(
      "Step 1: Use Heron's formula. The semiperimeter is",
      R`\(s=\frac{13+14+15}{2}=21\).`,
      "",
      "Step 2: Heron's formula:",
      R`\(\text{Area}=\sqrt{s(s-13)(s-14)(s-15)}\).`,
      "",
      "Step 3: Substitute:",
      R`\(\sqrt{21\cdot 8\cdot 7\cdot 6}\).`,
      "",
      "Step 4: Compute inside the root:",
      R`\(21\cdot 8\cdot 7\cdot 6 = 7056\).`,
      "",
      "Step 5: \(\sqrt{7056}=84\). So area is 84 cm^2.",
      "",
      "Final answer: 84 cm^2",
    ),
  }),

  makeRow({
    question: L(
      "A circle has radius 13 cm.",
      "A chord AB has length 10 cm.",
      "",
      "Find the perpendicular distance from the centre to the chord.",
    ),
    correct: R`12\text{ cm}`,
    wrong: [R`5\text{ cm}`, R`\sqrt{69}\text{ cm}`, R`13\text{ cm}`],
    explanation: L(
      "Step 1: The perpendicular from the centre bisects the chord, so half the chord is 5 cm.",
      "",
      "Step 2: Form a right triangle with hypotenuse 13 (radius), one leg 5 (half-chord), and the other leg d (distance).",
      "",
      "Step 3: Apply Pythagoras:",
      R`\(d^2=13^2-5^2=169-25=144\).`,
      "",
      "Step 4: Take the square root:",
      R`\(d=\sqrt{144}=12\).`,
      "",
      "Step 5: Include units: 12 cm.",
      "",
      "Final answer: 12 cm",
    ),
  }),

  makeRow({
    question: L(
      "In triangle ABC, point D is on AB such that AD:DB = 2:3.",
      "Through D, a line DE is drawn parallel to AC, meeting BC at E.",
      "The area of triangle BDE is 36 cm^2.",
      "",
      "Find the area of triangle ABC.",
    ),
    correct: R`100\text{ cm}^2`,
    wrong: [R`90\text{ cm}^2`, R`81\text{ cm}^2`, R`144\text{ cm}^2`],
    explanation: L(
      "Step 1: Because DE ∥ AC, triangles BDE and BAC are similar.",
      "",
      "Step 2: The linear scale factor is",
      R`\(\frac{BD}{BA}=\frac{3}{2+3}=\frac{3}{5}\).`,
      "",
      "Step 3: Areas scale by the square of the linear factor:",
      R`\(\frac{\text{Area}(BDE)}{\text{Area}(ABC)}=\left(\frac{3}{5}\right)^2=\frac{9}{25}\).`,
      "",
      "Step 4: Use area(BDE) = 36:",
      R`\(\frac{36}{\text{Area}(ABC)}=\frac{9}{25}\Rightarrow \text{Area}(ABC)=36\cdot \frac{25}{9}=100\).`,
      "",
      "Step 5: Include units: 100 cm^2.",
      "",
      "Final answer: 100 cm^2",
    ),
  }),

  // Theme D: Probability + counting + stats
  makeRow({
    question: L(
      "Four boys and four girls line up in a row.",
      "In how many different ways can they line up if no two girls are adjacent?",
    ),
    correct: "2880",
    wrong: ["1440", "2160", "5760"],
    explanation: L(
      "Step 1: Arrange the 4 boys: \(4! = 24\) ways.",
      "",
      "Step 2: This creates 5 gaps around the boys:",
      "_ B _ B _ B _ B _",
      "",
      "Step 3: Choose 4 of these 5 gaps for the girls:",
      R`\(\binom{5}{4}=5\).`,
      "",
      "Step 4: Arrange the 4 girls in the chosen gaps: \(4!=24\) ways.",
      "",
      "Step 5: Multiply:",
      R`\(24\cdot 5\cdot 24 = 2880\).`,
      "",
      "Final answer: 2880",
    ),
  }),

  makeRow({
    question: L(
      "A 4-digit code uses digits 0–9 (leading zero allowed).",
      "Exactly one digit is repeated (so one digit appears twice), and the other two digits are different from each other and from the repeated digit.",
      "",
      "How many such codes are there?",
    ),
    correct: "4320",
    wrong: ["2160", "3600", "6480"],
    explanation: L(
      "Step 1: Choose the digit that will be repeated: 10 choices.",
      "",
      "Step 2: Choose which 2 of the 4 positions contain that repeated digit:",
      R`\(\binom{4}{2}=6\).`,
      "",
      "Step 3: Choose the other two distinct digits from the remaining 9 digits:",
      R`\(\binom{9}{2}=36\).`,
      "",
      "Step 4: Arrange those two chosen digits in the remaining two positions: \(2!=2\).",
      "",
      "Step 5: Multiply:",
      R`\(10\cdot 6\cdot 36\cdot 2=4320\).`,
      "",
      "Final answer: 4320",
    ),
  }),

  makeRow({
    question: L(
      "A bag contains only red and blue counters.",
      "Two counters are drawn at random without replacement.",
      R`\(P(\text{both red})=\frac{1}{3}\) and \(P(\text{both blue})=\frac{1}{6}\).`,
      "",
      "What is the ratio red:blue in simplest form?",
    ),
    correct: "7:5",
    wrong: ["3:2", "5:7", "2:7"],
    explanation: L(
      "Step 1: Let there be r red and b blue, so total \(n=r+b\).",
      "",
      "Step 2: Use the probability formula:",
      R`\(\frac{r}{n}\cdot\frac{r-1}{n-1}=\frac{1}{3}\Rightarrow r(r-1)=\frac{n(n-1)}{3}\).`,
      R`\(\frac{b}{n}\cdot\frac{b-1}{n-1}=\frac{1}{6}\Rightarrow b(b-1)=\frac{n(n-1)}{6}\).`,
      "",
      "Step 3: Divide the first by the second to remove \(n(n-1)\):",
      R`\(\frac{r(r-1)}{b(b-1)}=\frac{1/3}{1/6}=2\).`,
      "",
      "Step 4: One solution with small integers is r=21, b=15 (since \(21\cdot 20 = 2\cdot 15\cdot 14\)).",
      "Then the ratio simplifies to 21:15 = 7:5.",
      "",
      "Step 5: Check quickly: total 36. \(P(RR)=\\frac{21}{36}\\cdot\\frac{20}{35}=\\frac{1}{3}\), \(P(BB)=\\frac{15}{36}\\cdot\\frac{14}{35}=\\frac{1}{6}\).",
      "",
      "Final answer: 7:5",
    ),
  }),

  makeRow({
    question: L(
      "Two fair dice are rolled.",
      "You are told that the sum of the two dice is even.",
      "",
      "What is the probability that BOTH dice show a prime number?",
      "(Prime faces are 2, 3, 5.)",
    ),
    correct: R`\frac{5}{18}`,
    wrong: [R`\frac{1}{6}`, R`\frac{5}{36}`, R`\frac{2}{9}`],
    explanation: L(
      "Step 1: There are 36 equally likely ordered outcomes.",
      "",
      "Step 2: An even sum happens when both dice are even or both are odd.",
      R`Even-even outcomes: \(3\cdot 3=9\). Odd-odd outcomes: \(3\cdot 3=9\). So total even-sum outcomes = 18.`,
      "",
      "Step 3: Prime faces are 2 (even), 3 and 5 (odd).",
      "",
      "Step 4: Count prime-pairs with even sum:",
      R`(2,2), (3,3), (5,5), (3,5), (5,3) → 5 outcomes.`,
      "",
      "Step 5: Conditional probability:",
      R`\(\frac{5}{18}\).`,
      "",
      "Final answer: 5/18",
    ),
  }),

  makeRow({
    question: L(
      "A bag has 4 red and 6 blue balls.",
      "Three balls are drawn without replacement.",
      "You are told the first ball drawn was blue.",
      "",
      "What is the probability that exactly one red ball is drawn in total?",
    ),
    correct: R`\frac{5}{9}`,
    wrong: [R`\frac{4}{9}`, R`\frac{5}{12}`, R`\frac{1}{2}`],
    explanation: L(
      "Step 1: Given the first ball was blue, remove one blue ball.",
      "Remaining: 4 red, 5 blue, total 9.",
      "",
      "Step 2: We now need exactly one red in the next two draws.",
      "",
      "Step 3: Probability of (red then blue):",
      R`\(\frac{4}{9}\cdot\frac{5}{8}=\frac{20}{72}\).`,
      "",
      "Step 4: Probability of (blue then red):",
      R`\(\frac{5}{9}\cdot\frac{4}{8}=\frac{20}{72}\).`,
      "",
      "Step 5: Add them:",
      R`\(\frac{20}{72}+\frac{20}{72}=\frac{40}{72}=\frac{5}{9}\).`,
      "",
      "Final answer: 5/9",
    ),
  }),

  makeRow({
    question: L(
      "A fair die is rolled repeatedly until the first 6 appears.",
      "Let X be the number of rolls.",
      "",
      "Find the probability that X is even.",
    ),
    correct: R`\frac{5}{11}`,
    wrong: [R`\frac{1}{2}`, R`\frac{6}{11}`, R`\frac{5}{36}`],
    explanation: L(
      "Step 1: For X to be even, the first 6 must occur on roll 2,4,6,...",
      "",
      "Step 2: Probability the first 6 occurs on roll 2 is:",
      R`\(\left(\frac{5}{6}\right)\left(\frac{1}{6}\right)\).`,
      "",
      "Step 3: Probability the first 6 occurs on roll 4 is:",
      R`\(\left(\frac{5}{6}\right)^3\left(\frac{1}{6}\right)\), and similarly for roll 6,8,...`,
      "",
      "Step 4: This is a geometric series:",
      R`\(\frac{5}{6}\cdot\frac{1}{6}\left[1+\left(\frac{5}{6}\right)^2+\left(\frac{5}{6}\right)^4+\cdots\right]\).`,
      "",
      "Step 5: Sum the bracket:",
      R`\(\frac{1}{1-(5/6)^2}=\frac{1}{1-25/36}=\frac{36}{11}\).`,
      R`So probability \(=\frac{5}{36}\cdot\frac{36}{11}=\frac{5}{11}\).`,
      "",
      "Final answer: 5/11",
    ),
  }),

  makeRow({
    question: L(
      "How many ways can you choose 3 numbers from {1,2,...,20} so that no two chosen numbers are consecutive?",
    ),
    correct: "816",
    wrong: ["680", "720", "900"],
    explanation: L(
      "Step 1: Choosing 3 numbers with no two consecutive is a standard gap problem.",
      "",
      "Step 2: If we choose numbers \(a<b<c\), enforce gaps by defining",
      R`\(a'=a,\ b'=b-1,\ c'=c-2\).`,
      "",
      "Step 3: Then \(1\le a'<b'<c'\le 20-2=18\).",
      "",
      "Step 4: So the number of choices equals the number of ways to choose 3 numbers from 1..18:",
      R`\(\binom{18}{3}=\frac{18\cdot 17\cdot 16}{6}=816\).`,
      "",
      "Step 5: Therefore there are 816 ways.",
      "",
      "Final answer: 816",
    ),
  }),

  makeRow({
    question: L(
      "A set of 6 integers has mean 10 and range 12.",
      "After removing the smallest number, the mean of the remaining 5 numbers becomes 12 and the range becomes 8.",
      "",
      "What was the smallest number?",
    ),
    correct: "0",
    wrong: ["2", "4", "-2"],
    explanation: L(
      "Step 1: Mean 10 for 6 numbers means the total sum is",
      R`\(6\cdot 10=60\).`,
      "",
      "Step 2: After removing the smallest number a, the mean of 5 numbers is 12, so the new sum is",
      R`\(5\cdot 12=60\).`,
      "",
      "Step 3: That means the removed number is",
      R`\(a = 60-60=0\).`,
      "",
      "Step 4: Original range is 12, so largest number was",
      R`\(0+12=12\).`,
      "",
      "Step 5: New range is 8, so with largest still 12, the new smallest (second smallest originally) is 4 (since 12-4=8). This is consistent.",
      "",
      "Final answer: 0",
    ),
  }),

  makeRow({
    question: L(
      "You have 10 identical sweets to share between 4 children.",
      "Each child must get at least 1 sweet.",
      "",
      "How many different distributions are possible?",
    ),
    correct: "84",
    wrong: ["56", "120", "126"],
    explanation: L(
      "Step 1: Let the numbers given to the 4 children be \(x_1,x_2,x_3,x_4\), all positive integers.",
      "",
      "Step 2: We need",
      R`\(x_1+x_2+x_3+x_4=10\) with \(x_i\ge 1\).`,
      "",
      "Step 3: Make a change of variables \(y_i=x_i-1\). Then \(y_i\ge 0\) and",
      R`\(y_1+y_2+y_3+y_4=6\).`,
      "",
      "Step 4: Number of nonnegative solutions to \(y_1+y_2+y_3+y_4=6\) is",
      R`\(\binom{6+4-1}{4-1}=\binom{9}{3}=84\).`,
      "",
      "Step 5: Therefore there are 84 distributions.",
      "",
      "Final answer: 84",
    ),
  }),

  makeRow({
    question: L(
      "Two cards are drawn from a standard 52-card deck without replacement.",
      "Given that at least one of the cards is an ace, what is the probability that both cards are aces?",
    ),
    correct: R`\frac{1}{33}`,
    wrong: [R`\frac{1}{17}`, R`\frac{1}{221}`, R`\frac{3}{221}`],
    explanation: L(
      "Step 1: Let A be the event “both cards are aces”.",
      "Let B be the event “at least one card is an ace”. We want P(A|B)=P(A)/P(B).",
      "",
      "Step 2: Compute P(A):",
      R`\(\frac{\binom{4}{2}}{\binom{52}{2}}=\frac{6}{1326}=\frac{1}{221}\).`,
      "",
      "Step 3: Compute P(B) using the complement (no aces):",
      R`\(P(B)=1-\frac{\binom{48}{2}}{\binom{52}{2}}=1-\frac{1128}{1326}=\frac{198}{1326}=\frac{33}{221}\).`,
      "",
      "Step 4: Form the conditional probability:",
      R`\(\frac{1/221}{33/221}=\frac{1}{33}\).`,
      "",
      "Step 5: So the required probability is 1/33.",
      "",
      "Final answer: 1/33",
    ),
  }),

  makeRow({
    question: L(
      "How many solutions in positive integers (x, y, z) satisfy",
      "x + y + z = 20, with x ≥ 2, y ≥ 2, z ≥ 2?",
    ),
    correct: "120",
    wrong: ["105", "114", "136"],
    explanation: L(
      "Step 1: Because each variable is at least 2, set",
      R`\(x'=x-2,\ y'=y-2,\ z'=z-2\). Then \(x',y',z'\ge 0\).`,
      "",
      "Step 2: Substitute into the sum:",
      R`\(x'+y'+z' = 20-6 = 14\).`,
      "",
      "Step 3: Count nonnegative integer solutions to \(x'+y'+z'=14\).",
      "",
      "Step 4: Stars and bars gives",
      R`\(\binom{14+3-1}{3-1}=\binom{16}{2}=120\).`,
      "",
      "Step 5: Therefore there are 120 solutions.",
      "",
      "Final answer: 120",
    ),
  }),

  makeRow({
    question: L(
      "A fair coin is flipped 5 times.",
      "You are told there were exactly 3 heads in total.",
      "",
      "What is the probability that the first flip was a head?",
    ),
    correct: R`\frac{3}{5}`,
    wrong: [R`\frac{1}{2}`, R`\frac{2}{5}`, R`\frac{3}{10}`],
    explanation: L(
      "Step 1: Given exactly 3 heads in 5 flips, all arrangements of 3 heads are equally likely.",
      "",
      "Step 2: Total ways to place 3 heads among 5 positions:",
      R`\(\binom{5}{3}=10\).`,
      "",
      "Step 3: Count those where the first flip is a head. Fix the first as head, then choose 2 more heads among the remaining 4 positions:",
      R`\(\binom{4}{2}=6\).`,
      "",
      "Step 4: Conditional probability:",
      R`\(\frac{6}{10}=\frac{3}{5}\).`,
      "",
      "Step 5: So the probability is 3/5.",
      "",
      "Final answer: 3/5",
    ),
  }),

  makeRow({
    question: L(
      "In a school survey:",
      "- 60% of students like Maths,",
      "- 45% like Physics,",
      "- 25% like both Maths and Physics.",
      "",
      "What percentage like exactly one of the two subjects?",
    ),
    correct: "55%",
    wrong: ["35%", "50%", "70%"],
    explanation: L(
      "Step 1: “Exactly one” means (Maths only) OR (Physics only).",
      "",
      "Step 2: Maths only = P(M) - P(M∩P) = 60% - 25% = 35%.",
      "",
      "Step 3: Physics only = P(P) - P(M∩P) = 45% - 25% = 20%.",
      "",
      "Step 4: Add them:",
      "35% + 20% = 55%.",
      "",
      "Step 5: So 55% like exactly one subject.",
      "",
      "Final answer: 55%",
    ),
  }),

  makeRow({
    question: L(
      "How many different integer-sided triangles (a ≤ b ≤ c) have perimeter 20?",
    ),
    correct: "8",
    wrong: ["6", "7", "9"],
    explanation: L(
      "Step 1: We need positive integers a ≤ b ≤ c with a+b+c=20 and a+b>c.",
      "",
      "Step 2: Because c is the largest, the inequality a+b>c becomes",
      R`\(20-c>c\Rightarrow c<10\). So c can be 7,8,9.`,
      "",
      "Step 3: For each c, solve a+b=20-c with a ≤ b ≤ c.",
      "",
      "Step 4: Listing systematically gives 8 valid triples:",
      "(2,9,9), (3,8,9), (4,7,9), (4,8,8), (5,6,9), (5,7,8), (6,6,8), (6,7,7).",
      "",
      "Step 5: Therefore there are 8 such triangles.",
      "",
      "Final answer: 8",
    ),
  }),

  makeRow({
    question: L(
      "A 2-digit PIN is formed from digits 0–9 (leading zero allowed).",
      "Digits cannot repeat.",
      "",
      "What is the probability that the PIN is divisible by 3?",
    ),
    correct: R`\frac{1}{3}`,
    wrong: [R`\frac{1}{4}`, R`\frac{2}{9}`, R`\frac{5}{18}`],
    explanation: L(
      "Step 1: Total 2-digit PINs with no repetition (ordered pairs):",
      R`\(10\cdot 9=90\).`,
      "",
      "Step 2: A number is divisible by 3 iff the sum of its digits is divisible by 3.",
      "",
      "Step 3: Group digits by their remainder mod 3:",
      "0-group: {0,3,6,9} (4 digits), 1-group: {1,4,7} (3 digits), 2-group: {2,5,8} (3 digits).",
      "",
      "Step 4: We need (0,0) or (1,2) or (2,1) for digit sums ≡ 0 mod 3.",
      "Count ordered pairs with distinct digits:",
      "- (0,0): 4 choices for first, 3 for second → 12",
      "- (1,2): 3×3 = 9",
      "- (2,1): 3×3 = 9",
      "Total = 30.",
      "",
      "Step 5: Probability = 30/90 = 1/3.",
      "",
      "Final answer: 1/3",
    ),
  }),
];

async function main() {
  const totalBefore = await getCount("extreme_questions");
  if (totalBefore !== 100) {
    throw new Error(`Safety stop: expected extreme_questions to have 100 rows, found ${totalBefore}.`);
  }

  const pack2Rows = await getJson(
    `/rest/v1/extreme_questions?select=created_at&image_url=like.${encodeURIComponent(
      `${PACK2_IMAGE_PREFIX}%`
    )}&order=created_at.asc&limit=1`
  );

  if (!Array.isArray(pack2Rows) || pack2Rows.length === 0) {
    throw new Error("Could not find any rows from pack2 to replace (no matching image_url prefix).");
  }

  const batchCreatedAt = pack2Rows[0].created_at;
  const batchCount = await getCount("extreme_questions", `created_at=eq.${encodeFilterValue(batchCreatedAt)}`);

  if (batchCount !== 60) {
    throw new Error(
      `Safety stop: expected 60 rows with created_at=${batchCreatedAt} (pack2 insert), found ${batchCount}.`
    );
  }

  if (HARD_QUESTIONS.length !== 60) {
    throw new Error(`Internal error: expected HARD_QUESTIONS to have 60 items, got ${HARD_QUESTIONS.length}.`);
  }

  console.log(`Deleting ${batchCount} pack2 rows (created_at=${batchCreatedAt})…`);
  const delRes = await supabaseFetch(`/rest/v1/extreme_questions?created_at=eq.${encodeFilterValue(batchCreatedAt)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!delRes.ok) {
    const text = await delRes.text().catch(() => "");
    throw new Error(`Delete failed: ${delRes.status} ${text}`);
  }

  const afterDelete = await getCount("extreme_questions");
  if (afterDelete !== 40) {
    throw new Error(`Expected 40 rows after delete, found ${afterDelete}.`);
  }

  console.log("Inserting 60 harder extreme questions…");
  const insRes = await supabaseFetch("/rest/v1/extreme_questions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(HARD_QUESTIONS),
  });
  if (!insRes.ok) {
    const text = await insRes.text().catch(() => "");
    throw new Error(`Insert failed: ${insRes.status} ${text}`);
  }

  const afterInsert = await getCount("extreme_questions");
  console.log(`Done. extreme_questions: ${afterDelete} → ${afterInsert}`);
  if (afterInsert !== 100) {
    throw new Error(`Expected 100 rows after insert, found ${afterInsert}.`);
  }
}

await main();
