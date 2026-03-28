// One-go seeder for Number mini-subtopics.
// Generates questions locally via OpenAI (no Supabase edge worker limits) and inserts via PostgREST.
//
// Env required:
// - OPENAI_API_KEY
// - SUPABASE_URL (or VITE_SUPABASE_URL in .env)
// - SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_BEARER_TOKEN
//
// Optional env:
// - COUNT_PER_SUBTOPIC=1
// - CONCURRENCY=4
// - ONLY_SUBTOPIC_ID=number|fractions
// - OPENAI_MODEL=gpt-4o-mini
// - DRY_RUN=1
//
// Notes:
// - Inserts `question_type: "Number"` and `subtopic: "number|..."`.
// - Strict guards (fractions/decimals/percentages) are enforced both in prompt and as a post-filter.

import fs from 'node:fs';
import path from 'node:path';

const loadDotEnvIfNeeded = () => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // ignore
  }
};

loadDotEnvIfNeeded();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_BEARER_TOKEN = process.env.SUPABASE_BEARER_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL in .env)');
if (!SUPABASE_BEARER_TOKEN) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_BEARER_TOKEN)');
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

const REST_EXAM_QUESTIONS = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/exam_questions`;

const COUNT_PER_SUBTOPIC = Math.max(1, Number(process.env.COUNT_PER_SUBTOPIC || 1));
const CONCURRENCY = Math.max(1, Math.min(10, Number(process.env.CONCURRENCY || 4)));
const ONLY_SUBTOPIC_ID = String(process.env.ONLY_SUBTOPIC_ID || '').trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const DRY_RUN = String(process.env.DRY_RUN || '').trim() === '1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TOPIC = 'Number';

const NUMBER_SUBTOPICS = [
  { id: 'number|integers', name: 'Integers and place value' },
  { id: 'number|decimals', name: 'Decimals' },
  { id: 'number|fractions', name: 'Fractions' },
  { id: 'number|fractions_decimals_percent', name: 'Fractions, decimals and percentages conversions' },
  { id: 'number|percentages', name: 'Percentages' },
  { id: 'number|powers', name: 'Powers and roots' },
  { id: 'number|factors_multiples', name: 'Factors, multiples and primes' },
  { id: 'number|hcf_lcm', name: 'HCF and LCM' },
  { id: 'number|negative_numbers', name: 'Negative numbers' },
  { id: 'number|bidmas', name: 'Order of operations (BIDMAS)' },
  { id: 'number|rounding_bounds', name: 'Rounding, estimation and bounds' },
  { id: 'number|standard_form', name: 'Standard form' },
  { id: 'number|surds', name: 'Surds' },
  { id: 'number|recurring_decimals', name: 'Recurring decimals' },
  { id: 'number|unit_conversions', name: 'Unit conversions' },
];

const normalizeCalculator = (calc) => {
  const lower = String(calc || '').toLowerCase();
  if (lower === 'calculator' || lower === 'calc') return 'Calculator';
  if (lower === 'non-calculator' || lower === 'noncalculator' || lower === 'non calculator') return 'Non-Calculator';
  if (calc === 'Calculator' || calc === 'Non-Calculator') return calc;
  return 'Non-Calculator';
};

const shuffleArray = (arr) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const signature = (s) => String(s || '')
  .toLowerCase()
  .replace(/\$\$?|\\\(|\\\)|\\\[|\\\]/g, '')
  .replace(/£\s*\d+(?:\.\d+)?/g, '<CURRENCY>')
  .replace(/\b\d+(?:\.\d+)?\s*%\b/g, '<PERCENT>')
  .replace(/\b\d+(?:\.\d+)?\b/g, '<NUM>')
  .replace(/\s+/g, ' ')
  .trim();

const passesStrictNumberSubtopic = (subtopicId, questionText) => {
  const key = String(subtopicId || '').split('|')[1] || '';
  const q = String(questionText || '').toLowerCase();
  const hasLatexFrac = /\\frac\s*\{/.test(questionText);
  const hasTextFrac = /\b\d+\s*\/\s*\d+\b/.test(q);
  const hasFrac = hasLatexFrac || hasTextFrac;
  const hasPercent = /%|percent/.test(q);
  const hasDecimal = /\b\d+\.\d+\b/.test(q);

  switch (key) {
    case 'integers':
      return !hasPercent && !hasDecimal && !hasFrac;
    case 'fractions':
      return hasFrac && !hasPercent && !hasDecimal;
    case 'decimals':
      return hasDecimal && !hasPercent && !hasFrac;
    case 'percentages':
      return hasPercent && !hasFrac;
    case 'fractions_decimals_percent':
      return Number(hasFrac) + Number(hasDecimal) + Number(hasPercent) >= 2;
    default:
      return true;
  }
};

const tool = {
  type: 'function',
  function: {
    name: 'generate_exam_questions',
    description: 'Generate GCSE-style multiple-choice maths questions for the requested subtopic.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        questions: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'question',
              'correct_answer',
              'wrong_answers',
              'explanation',
              'calculator',
              'difficulty',
              'subtopic',
            ],
            properties: {
              question: { type: 'string' },
              correct_answer: { type: 'string' },
              wrong_answers: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
              explanation: { type: 'string' },
              calculator: { type: 'string', enum: ['Calculator', 'Non-Calculator'] },
              difficulty: { type: 'integer', minimum: 1, maximum: 4 },
              subtopic: { type: 'string' },
            },
          },
        },
      },
      required: ['questions'],
    },
  },
};

const callOpenAI = async ({ subtopicId, subtopicName, count }) => {
  const strictRules = (() => {
    const key = String(subtopicId).split('|')[1] || '';
    switch (key) {
      case 'integers':
        return `Integers/place value ONLY. FORBIDDEN: percentages, decimals, fractions, ratio/proportion.`;
      case 'fractions':
        return `Fractions ONLY. Must require fraction notation/operations. FORBIDDEN: percentages, decimals, money discounts, interest, ratio/proportion.`;
      case 'decimals':
        return `Decimals ONLY. Must fundamentally use decimals. FORBIDDEN: fractions, percentages.`;
      case 'percentages':
        return `Percentages ONLY. Must fundamentally use percentages. FORBIDDEN: fraction/decimal-only arithmetic.`;
      case 'fractions_decimals_percent':
        return `Conversions ONLY. Must convert between at least TWO of: fraction, decimal, percentage.`;
      default:
        return `Stick strictly to the mini-subtopic. Do not drift into neighboring Number mini-subtopics.`;
    }
  })();

  const system =
    `You are an expert Edexcel GCSE (9-1) Mathematics question writer.\n` +
    `Generate exam-style multiple-choice questions strictly for the requested Number mini-subtopic.\n` +
    `LaTeX rules: any fraction MUST use \\frac{a}{b}. Do NOT write a/b.\n` +
    `Each explanation must be GCSE-friendly steps and end with exactly one line: "Final answer: ...".\n` +
    `Return ONLY via the tool call.`;

  const user =
    `Mini-subtopic: ${subtopicId} (${subtopicName})\n` +
    `STRICTNESS: ${strictRules}\n\n` +
    `Generate ${count} UNIQUE questions.\n` +
    `- topic is Number (no algebra variables)\n` +
    `- calculator: Non-Calculator\n` +
    `- tier: Foundation Tier\n` +
    `- difficulty: mix 1-3\n` +
    `- subtopic field MUST be exactly: ${subtopicId}\n` +
    `- wrong_answers must be plausible and distinct (exactly 3).`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.25,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      tools: [tool],
      tool_choice: { type: 'function', function: { name: 'generate_exam_questions' } },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI error HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = text ? JSON.parse(text) : {};
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  const args = toolCall?.function?.arguments;
  if (!args) throw new Error('OpenAI: missing tool call arguments');

  const parsed = JSON.parse(args);
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  return questions;
};

const fetchRecentSignatures = async (subtopicId, limit = 200) => {
  const url = new URL(REST_EXAM_QUESTIONS);
  url.searchParams.set('select', 'question');
  url.searchParams.set('subtopic', `eq.${subtopicId}`);
  url.searchParams.set('order', 'id.desc');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_BEARER_TOKEN,
      Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
    },
  });
  const txt = await res.text();
  if (!res.ok) return new Set();
  const rows = txt ? JSON.parse(txt) : [];
  const set = new Set();
  for (const r of rows) set.add(signature(r?.question));
  return set;
};

const insertQuestions = async (rows) => {
  if (DRY_RUN) return { inserted: 0 };

  const res = await fetch(REST_EXAM_QUESTIONS, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_BEARER_TOKEN,
      Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`Insert failed HTTP ${res.status}: ${txt.slice(0, 300)}`);
  const inserted = txt ? JSON.parse(txt) : [];
  return { inserted: Array.isArray(inserted) ? inserted.length : 0 };
};

const makeDbRows = (subtopicId, qs) => {
  return qs.map((q) => {
    const wrongs = Array.isArray(q.wrong_answers) ? q.wrong_answers : [];
    const correct = String(q.correct_answer || '').trim();
    const all = shuffleArray([correct, ...wrongs.map(String)]);
    return {
      question: String(q.question || '').trim(),
      correct_answer: correct,
      wrong_answers: wrongs.map(String),
      all_answers: all,
      explanation: String(q.explanation || '').trim(),
      explain_on: 'always',
      question_type: TOPIC,
      subtopic: subtopicId,
      tier: 'Foundation Tier',
      calculator: 'Non-Calculator',
      difficulty: Number(q.difficulty || 2),
      image_url: null,
      image_alt: null,
    };
  });
};

const pLimit = (concurrency) => {
  const queue = [];
  let active = 0;

  const next = () => {
    active--;
    if (queue.length > 0) queue.shift()();
  };

  return (fn) => new Promise((resolve, reject) => {
    const run = async () => {
      active++;
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      } finally {
        next();
      }
    };

    if (active < concurrency) run();
    else queue.push(run);
  });
};

const runForSubtopic = async ({ id, name }) => {
  const recent = await fetchRecentSignatures(id, 250);
  let insertedTotal = 0;
  let tries = 0;

  while (insertedTotal < COUNT_PER_SUBTOPIC && tries < 8) {
    tries++;
    const needed = COUNT_PER_SUBTOPIC - insertedTotal;

    const generated = await callOpenAI({ subtopicId: id, subtopicName: name, count: needed });
    const filtered = [];

    for (const q of generated) {
      if (String(q.subtopic || '').trim() !== id) continue;
      if (!passesStrictNumberSubtopic(id, String(q.question || ''))) continue;
      const sig = signature(q.question);
      if (recent.has(sig)) continue;
      recent.add(sig);
      filtered.push(q);
    }

    if (filtered.length === 0) {
      await sleep(400);
      continue;
    }

    const rows = makeDbRows(id, filtered);
    const ins = await insertQuestions(rows);
    insertedTotal += ins.inserted;
    if (ins.inserted === 0) await sleep(350);
  }

  return { subtopicId: id, inserted: insertedTotal };
};

const main = async () => {
  const list = NUMBER_SUBTOPICS.filter((s) => !ONLY_SUBTOPIC_ID || s.id === ONLY_SUBTOPIC_ID);
  console.log(`Number subtopics: ${list.length}, count_each=${COUNT_PER_SUBTOPIC}, concurrency=${CONCURRENCY}, dry=${DRY_RUN ? 'yes' : 'no'}`);

  const limit = pLimit(CONCURRENCY);
  const results = [];

  for (const s of list) {
    results.push(limit(() => runForSubtopic(s)));
  }

  const done = await Promise.allSettled(results);
  const summary = { ok: 0, failed: 0, inserted: 0 };

  for (const r of done) {
    if (r.status === 'fulfilled') {
      summary.ok++;
      summary.inserted += r.value.inserted;
      console.log(`OK ${r.value.subtopicId}: inserted ${r.value.inserted}`);
    } else {
      summary.failed++;
      console.log(`FAIL: ${String(r.reason?.message || r.reason)}`);
    }
  }

  console.log(`Done. ok=${summary.ok} failed=${summary.failed} inserted=${summary.inserted}`);
  if (summary.failed > 0) process.exitCode = 1;
};

main().catch((e) => {
  console.error('FAILED:', e?.message || e);
  process.exit(1);
});
