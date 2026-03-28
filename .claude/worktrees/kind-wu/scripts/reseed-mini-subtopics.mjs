// Reseed 8 questions per mini-subtopic by calling the deployed Supabase edge function.
//
// Requirements:
// - Node 18+ (uses global fetch)
// - Env vars: SUPABASE_URL and credentials (see below)
// - Safety: set CONFIRM=YES to actually run
//

import fs from 'node:fs';
import path from 'node:path';

const loadDotEnvIfNeeded = () => {
  // If the required SUPABASE_* env vars aren't provided, fall back to the repo .env
  // which contains the Vite Supabase URL + anon key.
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || process.env.SUPABASE_BEARER_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return;
  }

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

    // Map Vite env vars to the script's expected names if missing.
    if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    if (!process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!process.env.SUPABASE_API_KEY && process.env.SUPABASE_ANON_KEY) process.env.SUPABASE_API_KEY = process.env.SUPABASE_ANON_KEY;
    if (!process.env.SUPABASE_BEARER_TOKEN && process.env.SUPABASE_ANON_KEY) process.env.SUPABASE_BEARER_TOKEN = process.env.SUPABASE_ANON_KEY;
  } catch {
    // Ignore .env parse errors; we'll fail with a clear missing-env message later.
  }
};

loadDotEnvIfNeeded();

const isTransientSupabaseFunctionError = (message) => {
  const m = String(message || '');
  return (
    /WORKER_LIMIT/i.test(m) ||
    /BOOT_ERROR/i.test(m) ||
    /not having enough compute resources/i.test(m) ||
    /Function failed to start/i.test(m) ||
    /HTTP\s*(502|503|504)/i.test(m)
  );
};

const backoffDelayMs = (attempt, baseMs = 1200, maxMs = 20000) => {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(maxMs, exp + jitter);
};
// Optional filters:
// - ONLY_TOPIC=ratio|number|algebra|geometry|probability|statistics
// - ONLY_SUBTOPIC_ID=ratio|reverse_percentages etc as "<topicKey>|<subtopicKey>"
// - FUNCTION_NAME=generate-questions (default)

const ONLY_TOPIC = String(process.env.ONLY_TOPIC || '').trim();
const ONLY_SUBTOPIC_ID = String(process.env.ONLY_SUBTOPIC_ID || '').trim();
const CONFIRM = String(process.env.CONFIRM || '').trim();

// Mode:
// - full (default): fill buckets per COUNT_PER_TARGET / TOTAL_PER_SUBTOPIC
// - one: add exactly 1 question per mini-subtopic (fast, repeatable)
// - equalize: bring each included mini-subtopic up to a target TOTAL count (default: max existing among included)
// - prune: delete extras to reach TARGET_TOTAL_PER_SUBTOPIC (duplicates first)
// - add: always add ADD_PER_BUCKET per bucket (no skipping based on existing counts)
// - balance: enforce per-bucket targets (tier x calculator) by trimming + filling
// - counts: print counts only (read-only)
const MODE = String(process.env.MODE || 'full').trim().toLowerCase();
const CONTINUE_ON_ERROR = String(process.env.CONTINUE_ON_ERROR || '').trim().toLowerCase() === 'true'
  || String(process.env.CONTINUE_ON_ERROR || '').trim() === '1';

// Parallelism across mini-subtopics (helps throughput without making single requests huge).
const SUBTOPIC_CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.SUBTOPIC_CONCURRENCY || 3)));

// Target volume
// Default generates 32 questions per mini-subtopic:
// 8 per (tier x calculatorType) bucket across 4 buckets.
//
// For an exact total per mini-subtopic (e.g. 40), set TOTAL_PER_SUBTOPIC=40.
// This will split evenly across the 4 buckets (ceil(total/4) per bucket).
const TOTAL_PER_SUBTOPIC = Number(process.env.TOTAL_PER_SUBTOPIC || 0);
const derivedPerBucket = TOTAL_PER_SUBTOPIC > 0 ? Math.ceil(TOTAL_PER_SUBTOPIC / 4) : 0;
const rawCountPerTarget = Number(process.env.COUNT_PER_TARGET || (derivedPerBucket || 8));
const COUNT_PER_TARGET = Math.max(1, Math.min(rawCountPerTarget, 64));

// Images
// - IMAGE_MODE=none|auto|all
// - IMAGE_PER_TARGET: only used for auto; how many of the COUNT_PER_TARGET are forced-image questions
const IMAGE_MODE = String(process.env.IMAGE_MODE || 'auto').trim().toLowerCase();
const IMAGE_PER_TARGET = Math.max(0, Math.min(Number(process.env.IMAGE_PER_TARGET || 1), COUNT_PER_TARGET));

// Edge functions have strict time limits; requesting too many questions at once can 504.
// Keep this small for reliability.
const MAX_PER_REQUEST = Math.max(1, Math.min(Number(process.env.MAX_PER_REQUEST || 1), COUNT_PER_TARGET));

// Delay tuning (ms). Lower = faster, higher = fewer rate/worker issues.
const INTER_CALL_DELAY_MS = Math.max(0, Number(process.env.INTER_CALL_DELAY_MS || 800));
const ZERO_RESULT_DELAY_MS = Math.max(200, Number(process.env.ZERO_RESULT_DELAY_MS || 1600));

// Insert mode:
// - rest (default): insert directly into PostgREST to avoid extra edge function invocations
// - edge: call edge function action=insert
const INSERT_MODE = String(process.env.INSERT_MODE || 'rest').trim().toLowerCase();

// Burst mode: lets you run many short bursts instead of one long run.
// - BURST_MS=0 (default): run until each target is fully satisfied.
// - BURST_MS>0: stop after the time budget and exit successfully with partial progress.
const BURST_MS = Math.max(0, Number(process.env.BURST_MS || 0));
const PROGRESS_EVERY = Math.max(1, Number(process.env.PROGRESS_EVERY || 1));
const PRINT_QUESTIONS = String(process.env.PRINT_QUESTIONS || '').trim().toLowerCase() === 'true'
  || String(process.env.PRINT_QUESTIONS || '').trim() === '1';
const QUESTIONS_LOG_PATH = String(process.env.QUESTIONS_LOG_PATH || '').trim();
const CLEAR_QUESTIONS_LOG = String(process.env.CLEAR_QUESTIONS_LOG || '').trim().toLowerCase() === 'true'
  || String(process.env.CLEAR_QUESTIONS_LOG || '').trim() === '1';

// Equalize mode: bring each included mini-subtopic up to this total.
// If not set (or <=0), we'll compute the max current total among included subtopics.
const TARGET_TOTAL_PER_SUBTOPIC = Number(process.env.TARGET_TOTAL_PER_SUBTOPIC || 0);
const TARGET_PER_BUCKET = Number(process.env.TARGET_PER_BUCKET || 0);
const ADD_PER_BUCKET = Number(process.env.ADD_PER_BUCKET || 0);
const MULTIPART_RATIO_RAW = Number(process.env.MULTIPART_RATIO || 0);
const MULTIPART_RATIO = Number.isFinite(MULTIPART_RATIO_RAW)
  ? Math.max(0, Math.min(MULTIPART_RATIO_RAW, 1))
  : 0;

// When MODE=equalize, cap how many NEW questions we try to add per mini-subtopic per run.
// This enables fast repeated bursts that visibly add questions each time.
// Set to 0 to disable (default).
const CHUNK_PER_SUBTOPIC = Math.max(0, Number(process.env.CHUNK_PER_SUBTOPIC || 0));

// Optional: after a run, print totals for included subtopics.
const PRINT_COUNTS = String(process.env.PRINT_COUNTS || '').trim().toLowerCase() === 'true'
  || String(process.env.PRINT_COUNTS || '').trim() === '1';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_BEARER_TOKEN =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_BEARER_TOKEN || process.env.SUPABASE_ANON_KEY || '';

const FUNCTION_NAME = process.env.FUNCTION_NAME || 'generate-questions';
const ENDPOINT = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${FUNCTION_NAME}` : null;
const REST_EXAM_QUESTIONS = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/exam_questions` : null;

const TOPIC_SUBTOPICS = {
  number: {
    name: 'Number',
    subtopics: [
      { key: 'integers', name: 'Integers and place value' },
      { key: 'decimals', name: 'Decimals' },
      { key: 'fractions', name: 'Fractions' },
      { key: 'fractions_decimals_percent', name: 'Fractions, decimals and percentages conversions' },
      { key: 'percentages', name: 'Percentages' },
      { key: 'powers', name: 'Powers and roots' },
      { key: 'factors_multiples', name: 'Factors, multiples and primes' },
      { key: 'hcf_lcm', name: 'HCF and LCM' },
      { key: 'negative_numbers', name: 'Negative numbers' },
      { key: 'bidmas', name: 'Order of operations (BIDMAS)' },
      { key: 'rounding_bounds', name: 'Rounding, estimation and bounds' },
      { key: 'standard_form', name: 'Standard form' },
      { key: 'surds', name: 'Surds' },
      { key: 'recurring_decimals', name: 'Recurring decimals' },
      { key: 'unit_conversions', name: 'Unit conversions' },
    ],
  },
  algebra: {
    name: 'Algebra',
    subtopics: [
      { key: 'expressions', name: 'Algebraic expressions' },
      { key: 'expand', name: 'Expanding brackets' },
      { key: 'factorise', name: 'Factorising' },
      { key: 'substitution', name: 'Substitution' },
      { key: 'rearranging', name: 'Rearranging formulae' },
      { key: 'equations', name: 'Linear equations' },
      { key: 'inequalities', name: 'Inequalities' },
      { key: 'simultaneous', name: 'Simultaneous equations' },
      { key: 'sequences', name: 'Sequences' },
      { key: 'nth_term', name: 'Nth term' },
      { key: 'graphs', name: 'Graphs and functions' },
      { key: 'gradients', name: 'Gradients and intercepts' },
      { key: 'quadratics', name: 'Quadratic equations' },
      { key: 'algebraic_fractions', name: 'Algebraic fractions' },
    ],
  },
  ratio: {
    name: 'Ratio & Proportion',
    subtopics: [
      { key: 'ratio', name: 'Ratio & Proportion' },
      { key: 'proportion', name: 'Direct proportion' },
      { key: 'percentage_change', name: 'Percentage change' },
      { key: 'reverse_percentages', name: 'Reverse percentages' },
      { key: 'ratio_share', name: 'Sharing in a ratio' },
      { key: 'rates', name: 'Rates (speed, density, pressure)' },
      { key: 'speed', name: 'Speed = distance / time' },
      { key: 'best_buys', name: 'Best buys' },
      { key: 'growth_decay', name: 'Repeated percentage change' },
      { key: 'compound_interest', name: 'Compound interest' },
      { key: 'direct_inverse', name: 'Direct and inverse proportion' },
      { key: 'similarity_scale', name: 'Scale factors and similarity' },
    ],
  },
  geometry: {
    name: 'Geometry & Measures',
    subtopics: [
      { key: 'shapes', name: '2D and 3D shapes' },
      { key: 'perimeter_area', name: 'Perimeter and area' },
      { key: 'area_volume', name: 'Area and volume' },
      { key: 'angles', name: 'Angles and triangles' },
      { key: 'polygons', name: 'Polygons' },
      { key: 'trigonometry', name: 'Trigonometry' },
      { key: 'pythagoras', name: 'Pythagoras theorem' },
      { key: 'circles', name: 'Circles' },
      { key: 'arcs_sectors', name: 'Arcs and sectors' },
      { key: 'surface_area', name: 'Surface area' },
      { key: 'volume', name: 'Volume' },
      { key: 'bearings', name: 'Bearings' },
      { key: 'transformations', name: 'Transformations' },
      { key: 'constructions_loci', name: 'Constructions and loci' },
      { key: 'congruence', name: 'Congruence' },
      { key: 'vectors', name: 'Vectors' },
      { key: 'circle_theorems', name: 'Circle theorems' },
    ],
  },
  probability: {
    name: 'Probability',
    subtopics: [
      { key: 'basic', name: 'Basic probability' },
      { key: 'combined', name: 'Combined events' },
      { key: 'tree_diagrams', name: 'Tree diagrams' },
      { key: 'conditional', name: 'Conditional probability' },
      { key: 'relative_frequency', name: 'Relative frequency' },
      { key: 'venn_diagrams', name: 'Venn diagrams' },
      { key: 'expected_frequency', name: 'Expected frequency' },
      { key: 'independence', name: 'Independence' },
      { key: 'mutually_exclusive', name: 'Mutually exclusive events' },
    ],
  },
  statistics: {
    name: 'Statistics',
    subtopics: [
      { key: 'data', name: 'Data collection' },
      { key: 'averages', name: 'Averages and spread' },
      { key: 'charts', name: 'Charts and graphs' },
      { key: 'correlation', name: 'Correlation' },
      { key: 'sampling', name: 'Sampling' },
      { key: 'frequency_tables', name: 'Frequency tables' },
      { key: 'spread', name: 'Range and IQR' },
      { key: 'scatter', name: 'Scatter graphs' },
      { key: 'histograms', name: 'Histograms' },
      { key: 'cumulative_frequency', name: 'Cumulative frequency' },
      { key: 'box_plots', name: 'Box plots' },
      { key: 'two_way_tables', name: 'Two-way tables' },
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const shuffleArray = (arr) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const normalizeCalculator = (calc) => {
  const lower = String(calc || '').toLowerCase();
  if (lower === 'calculator' || lower === 'calc') return 'Calculator';
  if (lower === 'non-calculator' || lower === 'noncalculator' || lower === 'non calculator') return 'Non-Calculator';
  // fall back to existing values from generator
  if (calc === 'Calculator' || calc === 'Non-Calculator') return calc;
  return 'Non-Calculator';
};

let questionsLogReady = false;

const prepareQuestionsLog = () => {
  if (!QUESTIONS_LOG_PATH || questionsLogReady) return;
  const dir = path.dirname(QUESTIONS_LOG_PATH);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (CLEAR_QUESTIONS_LOG) fs.writeFileSync(QUESTIONS_LOG_PATH, '');
  questionsLogReady = true;
};

const sanitizeQuestionForLog = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const logGeneratedQuestions = ({ subtopicId, tier, calculatorType, questions, rows }) => {
  if (!PRINT_QUESTIONS && !QUESTIONS_LOG_PATH) return;
  const list = [];
  const items = Array.isArray(rows) && rows.length > 0 ? rows : (questions || []);
  for (const q of items) {
    const questionText = sanitizeQuestionForLog(q?.question);
    if (!questionText) continue;
    const qSubtopic = q?.subtopic || subtopicId || '';
    const qTier = q?.tier || tier || '';
    const qCalc = normalizeCalculator(q?.calculator || calculatorType || '');
    list.push(`[${qSubtopic}] [${qTier}] [${qCalc}] ${questionText}`);
  }
  if (list.length === 0) return;
  if (PRINT_QUESTIONS) {
    for (const line of list) {
      console.log(`  Q: ${line}`);
    }
  }
  if (QUESTIONS_LOG_PATH) {
    prepareQuestionsLog();
    fs.appendFileSync(QUESTIONS_LOG_PATH, `${list.join('\n')}\n`);
  }
};

const isTransientErrorMessage = (msg) => {
  const m = String(msg || '');
  if (isTransientSupabaseFunctionError(m)) return true;
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(m)) return true;
  // Node/undici sometimes throws a generic "fetch failed" on transient network issues.
  if (/fetch failed/i.test(m)) return true;
  return false;
};

const parseSubtopicKey = (subtopicId) => {
  const [topicKey, subKey] = String(subtopicId || '').split('|');
  return { topicKey, subKey };
};

const shouldForceImagesForSubtopic = (subtopicId) => {
  if (IMAGE_MODE === 'none') return false;
  if (IMAGE_MODE === 'all') return true;

  // auto: only where diagrams genuinely help
  const { topicKey, subKey } = parseSubtopicKey(subtopicId);
  if (topicKey === 'geometry') return true;
  if (topicKey === 'probability') return true;
  if (topicKey === 'statistics') return true;

  // algebra diagrams mainly for graphs-related
  if (topicKey === 'algebra' && ['graphs', 'gradients', 'quadratics'].includes(subKey)) return true;

  // ratio diagrams sometimes help for speed/density/pressure contexts
  if (topicKey === 'ratio' && ['rates', 'speed'].includes(subKey)) return true;

  return false;
};

const topicKeyToGeneratorTopic = (topicKey) => {
  switch (topicKey) {
    case 'number':
      return 'Number';
    case 'algebra':
      return 'Algebra';
    case 'ratio':
      return 'Ratio & Proportion';
    case 'geometry':
      // Generator accepts "Geometry" and normalizes to "Geometry & Measures" for DB.
      return 'Geometry';
    case 'probability':
      return 'Probability';
    case 'statistics':
      return 'Statistics';
    default:
      throw new Error(`Unknown topicKey: ${topicKey}`);
  }
};

const post = async (body) => {
  if (!ENDPOINT) throw new Error('SUPABASE_URL is missing');
  // Some projects require an apikey header; if the anon key isn't available for scripts,
  // the service role key can be used here as well.
  const apiKey = SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN;
  if (!apiKey) throw new Error('SUPABASE_API_KEY (or SUPABASE_ANON_KEY) is missing');
  if (!SUPABASE_BEARER_TOKEN) throw new Error('SUPABASE_BEARER_TOKEN (or SUPABASE_SERVICE_ROLE_KEY) is missing');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Supabase/proxy sometimes returns HTML for 5xx; don't crash JSON parsing.
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      }
      throw new Error(`HTTP ${res.status} ${res.statusText}: Non-JSON response: ${text.slice(0, 200)}`);
    }
  }

  if (!res.ok) {
    const msg = json?.error || json?.details || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
};

const postWithRetry = async (body, { label, maxAttempts = 10, baseDelayMs = 1200 } = {}) => {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await post(body);
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err);
      if (!isTransientErrorMessage(msg)) throw err;
      const delay = Math.min(15000, baseDelayMs * Math.pow(1.4, attempt - 1)) + Math.floor(Math.random() * 400);
      console.log(`  transient${label ? ` (${label})` : ''}: ${msg} — retry ${attempt}/${maxAttempts} in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastErr;
};

const signature = (s) => String(s || '')
  .toLowerCase()
  .replace(/\$\$?|\\\(|\\\)|\\\[|\\\]/g, '')
  .replace(/£\s*\d+(?:\.\d+)?/g, '<CURRENCY>')
  .replace(/\b\d+(?:\.\d+)?\s*%\b/g, '<PERCENT>')
  .replace(/\b\d+(?:\.\d+)?\b/g, '<NUM>')
  .replace(/\s+/g, ' ')
  .trim();

const signatureCacheBySubtopic = new Map();

const getSignatureSetCached = async ({ topic, subtopicId }) => {
  const key = `${topic}::${subtopicId}`;
  const existing = signatureCacheBySubtopic.get(key);
  if (existing) return existing;
  const set = await getExistingSignaturesForSubtopic({ topic, subtopicId });
  signatureCacheBySubtopic.set(key, set);
  return set;
};

const insertViaRest = async (topic, tier, questions) => {
  if (!REST_EXAM_QUESTIONS) throw new Error('SUPABASE_URL is missing');
  const apiKey = SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN;
  if (!apiKey) throw new Error('SUPABASE_API_KEY (or SUPABASE_ANON_KEY) is missing');
  if (!SUPABASE_BEARER_TOKEN) throw new Error('SUPABASE_BEARER_TOKEN (or SUPABASE_SERVICE_ROLE_KEY) is missing');

  const rows = [];
  let skippedBySignature = 0;

  for (const q of (questions || [])) {
    const wrongs = Array.isArray(q.wrong_answers) ? q.wrong_answers : [];
    const correct = q.correct_answer;
    const all = shuffleArray([correct, ...wrongs]);
    const subtopicId = q.subtopic || null;
    const sig = signature(q.question);

    if (subtopicId && sig) {
      const sigSet = await getSignatureSetCached({ topic, subtopicId });
      if (sigSet.has(sig)) {
        skippedBySignature += 1;
        continue;
      }
      sigSet.add(sig);
    }

    rows.push({
      question: q.question,
      correct_answer: correct,
      wrong_answers: wrongs,
      all_answers: all,
      explanation: q.explanation,
      explain_on: 'always',
      question_type: q.topic || q.question_type || topic,
      subtopic: subtopicId,
      tier: q.tier || tier,
      calculator: normalizeCalculator(q.calculator),
      difficulty: q.difficulty ?? null,
      image_url: q.image_url || null,
      image_alt: q.image_alt || null,
    });
  }

  if (rows.length === 0) {
    return { inserted: 0, skippedBySignature };
  }

  logGeneratedQuestions({ rows });

  const res = await fetch(REST_EXAM_QUESTIONS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });

  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      throw new Error(`HTTP ${res.status} ${res.statusText}: Non-JSON response: ${text.slice(0, 200)}`);
    }
  }
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const insertedCount = Array.isArray(json) ? json.length : 0;
  return { inserted: insertedCount, skippedBySignature };
};

const parseExactCountFromContentRange = (contentRange) => {
  // Example: "0-0/123" => 123
  const m = String(contentRange || '').match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
};

const getExactCount = async (url) => {
  const apiKey = SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN;
  if (!apiKey) throw new Error('SUPABASE_API_KEY (or SUPABASE_ANON_KEY) is missing');
  if (!SUPABASE_BEARER_TOKEN) throw new Error('SUPABASE_BEARER_TOKEN (or SUPABASE_SERVICE_ROLE_KEY) is missing');

  // In some setups, HEAD does not return Content-Range. Use GET with limit=1.
  const u = new URL(url);
  u.searchParams.set('select', u.searchParams.get('select') || 'id');
  if (!u.searchParams.get('limit')) u.searchParams.set('limit', '1');

  const res = await fetch(u.toString(), {
    method: 'GET',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
      Prefer: 'count=exact',
    },
  });

  if (!res.ok) throw new Error(`Count failed: HTTP ${res.status}`);

  const cr = res.headers.get('content-range');
  const parsed = parseExactCountFromContentRange(cr);
  if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;

  const maybeCount = res.headers.get('x-total-count');
  if (maybeCount && Number.isFinite(Number(maybeCount))) return Number(maybeCount);
  return 0;
};

const getExistingCountForBucket = async ({ topic, subtopicId, tier, calculator }) => {
  if (!REST_EXAM_QUESTIONS) throw new Error('SUPABASE_URL is missing');

  const url = new URL(REST_EXAM_QUESTIONS);
  url.searchParams.set('select', 'id');
  url.searchParams.set('question_type', `eq.${topic}`);
  url.searchParams.set('subtopic', `eq.${subtopicId}`);
  url.searchParams.set('tier', `eq.${tier}`);
  url.searchParams.set('calculator', `eq.${normalizeCalculator(calculator)}`);

  return await getExactCount(url.toString());
};

const getExistingCountForSubtopicTotal = async ({ subtopicId }) => {
  if (!REST_EXAM_QUESTIONS) throw new Error('SUPABASE_URL is missing');
  const url = new URL(REST_EXAM_QUESTIONS);
  url.searchParams.set('select', 'id');
  url.searchParams.set('subtopic', `eq.${subtopicId}`);
  return await getExactCount(url.toString());
};

const getExistingSignaturesForSubtopic = async ({ topic, subtopicId }) => {
  if (!REST_EXAM_QUESTIONS) throw new Error('SUPABASE_URL is missing');
  const apiKey = SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN;
  if (!apiKey) throw new Error('SUPABASE_API_KEY (or SUPABASE_ANON_KEY) is missing');
  if (!SUPABASE_BEARER_TOKEN) throw new Error('SUPABASE_BEARER_TOKEN (or SUPABASE_SERVICE_ROLE_KEY) is missing');

  const url = new URL(REST_EXAM_QUESTIONS);
  url.searchParams.set('select', 'question');
  url.searchParams.set('question_type', `eq.${topic}`);
  url.searchParams.set('subtopic', `eq.${subtopicId}`);
  url.searchParams.set('limit', '2000');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
    },
  });
  if (!res.ok) throw new Error(`Fetch existing questions failed: HTTP ${res.status}`);
  const json = await res.json();
  const set = new Set();
  if (Array.isArray(json)) {
    for (const row of json) {
      const sig = signature(row?.question);
      if (sig) set.add(sig);
    }
  }
  return set;
};

const fetchSubtopicRows = async ({ topic, subtopicId, tier, calculator }) => {
  if (!REST_EXAM_QUESTIONS) throw new Error('SUPABASE_URL is missing');
  const apiKey = SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN;
  if (!apiKey) throw new Error('SUPABASE_API_KEY (or SUPABASE_ANON_KEY) is missing');
  if (!SUPABASE_BEARER_TOKEN) throw new Error('SUPABASE_BEARER_TOKEN (or SUPABASE_SERVICE_ROLE_KEY) is missing');

  const rows = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const url = new URL(REST_EXAM_QUESTIONS);
    url.searchParams.set('select', 'id,question,tier,calculator,created_at');
    url.searchParams.set('question_type', `eq.${topic}`);
    url.searchParams.set('subtopic', `eq.${subtopicId}`);
    if (tier) url.searchParams.set('tier', `eq.${tier}`);
    if (calculator) url.searchParams.set('calculator', `eq.${normalizeCalculator(calculator)}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
      },
    });
    if (!res.ok) throw new Error(`Fetch rows failed: HTTP ${res.status}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += batch.length;
  }

  return rows;
};

const deleteRowsByIds = async (ids) => {
  if (!REST_EXAM_QUESTIONS) throw new Error('SUPABASE_URL is missing');
  const apiKey = SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN;
  if (!apiKey) throw new Error('SUPABASE_API_KEY (or SUPABASE_ANON_KEY) is missing');
  if (!SUPABASE_BEARER_TOKEN) throw new Error('SUPABASE_BEARER_TOKEN (or SUPABASE_SERVICE_ROLE_KEY) is missing');

  const chunks = [];
  for (let i = 0; i < ids.length; i += 100) {
    chunks.push(ids.slice(i, i + 100));
  }

  let deleted = 0;
  for (const chunk of chunks) {
    const url = new URL(REST_EXAM_QUESTIONS);
    const values = chunk.map((id) => `"${id}"`).join(',');
    url.searchParams.set('id', `in.(${values})`);

    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${SUPABASE_BEARER_TOKEN}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Delete failed: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    deleted += chunk.length;
  }

  return deleted;
};

const selectDuplicateIds = (rows) => {
  const sorted = [...rows].sort((a, b) => {
    const ta = a?.created_at || '';
    const tb = b?.created_at || '';
    return ta.localeCompare(tb);
  });
  const seen = new Map();
  const dupes = [];
  for (const row of sorted) {
    const sig = signature(row?.question);
    if (!sig) continue;
    if (!seen.has(sig)) {
      seen.set(sig, row.id);
      continue;
    }
    dupes.push(row.id);
  }
  return dupes;
};

const selectTrimIds = (rows, targetTotal) => {
  const remaining = [...rows].sort((a, b) => {
    const ta = a?.created_at || '';
    const tb = b?.created_at || '';
    return ta.localeCompare(tb);
  });
  if (remaining.length <= targetTotal) return [];

  const tiers = ['Foundation Tier', 'Higher Tier'];
  const byTier = new Map(tiers.map((t) => [t, []]));
  for (const row of remaining) {
    const tier = row?.tier;
    if (tiers.includes(tier)) byTier.get(tier).push(row);
  }

  let desiredFoundation = Math.ceil(targetTotal / 2);
  let desiredHigher = targetTotal - desiredFoundation;
  const countFoundation = byTier.get('Foundation Tier').length;
  const countHigher = byTier.get('Higher Tier').length;

  if (countFoundation < desiredFoundation) {
    desiredHigher += desiredFoundation - countFoundation;
    desiredFoundation = countFoundation;
  }
  if (countHigher < desiredHigher) {
    desiredFoundation += desiredHigher - countHigher;
    desiredHigher = countHigher;
  }

  const excessByTier = [
    { tier: 'Foundation Tier', excess: Math.max(0, countFoundation - desiredFoundation) },
    { tier: 'Higher Tier', excess: Math.max(0, countHigher - desiredHigher) },
  ].sort((a, b) => b.excess - a.excess);

  const ids = [];
  let remainingToTrim = remaining.length - targetTotal;

  for (const item of excessByTier) {
    const list = byTier.get(item.tier);
    let excess = item.excess;
    while (excess > 0 && remainingToTrim > 0 && list.length > 0) {
      ids.push(list.shift().id);
      excess -= 1;
      remainingToTrim -= 1;
    }
  }

  if (remainingToTrim > 0) {
    const pooled = remaining
      .filter((r) => !ids.includes(r.id))
      .map((r) => r.id);
    ids.push(...pooled.slice(0, remainingToTrim));
  }

  return ids;
};

const selectExcessIdsByBucket = (rows, targetTotal) => {
  const sorted = [...rows].sort((a, b) => {
    const ta = a?.created_at || '';
    const tb = b?.created_at || '';
    return tb.localeCompare(ta);
  });
  if (sorted.length <= targetTotal) return [];
  return sorted.slice(0, sorted.length - targetTotal).map((r) => r.id);
};

const pruneSubtopicToTarget = async ({ topicKey, subtopicId, subtopicName, targetTotal }) => {
  const topic = topicKeyToGeneratorTopic(topicKey);
  const rows = await fetchSubtopicRows({ topic, subtopicId });
  const currentTotal = rows.length;

  if (currentTotal <= targetTotal) {
    console.log(`- prune: already at ${currentTotal}/${targetTotal} — skip`);
    return;
  }

  const duplicateIds = selectDuplicateIds(rows);
  let remainingRows = rows.filter((r) => !duplicateIds.includes(r.id));
  let deleted = 0;

  if (duplicateIds.length > 0) {
    await deleteRowsByIds(duplicateIds);
    deleted += duplicateIds.length;
    console.log(`- prune: removed ${duplicateIds.length} duplicate(s)`);
  }

  if (remainingRows.length <= targetTotal) {
    console.log(`- prune: now at ${remainingRows.length}/${targetTotal}`);
    return;
  }

  const trimIds = selectTrimIds(remainingRows, targetTotal);
  if (trimIds.length > 0) {
    await deleteRowsByIds(trimIds);
    deleted += trimIds.length;
  }

  const finalTotal = currentTotal - deleted;
  if (finalTotal > targetTotal) {
    const msg = `Prune did not reach target for ${subtopicId}. DB has ${finalTotal}/${targetTotal}.`;
    if (CONTINUE_ON_ERROR) {
      console.log(`  WARN: ${msg} Continuing...`);
      return;
    }
    throw new Error(msg);
  }

  console.log(`- prune: ${subtopicId} now at ${finalTotal}/${targetTotal}`);
};

const printTotalsSummary = async (subtopics) => {
  try {
    const rows = [];
    for (const s of subtopics) {
      const total = await getExistingCountForSubtopicTotal({ subtopicId: s.subtopicId });
      rows.push({ subtopicId: s.subtopicId, total });
    }
    rows.sort((a, b) => a.subtopicId.localeCompare(b.subtopicId));
    console.log('\nTotals (question_type+subtopic):');
    for (const r of rows) {
      console.log(`- ${r.subtopicId}: ${r.total}`);
    }
  } catch (e) {
    console.log(`\nWARN: could not print totals summary: ${String(e?.message || e)}`);
  }
};

const getAllSubtopicIds = () => {
  const out = [];
  for (const [topicKey, topic] of Object.entries(TOPIC_SUBTOPICS)) {
    for (const s of topic.subtopics) {
      out.push({ topicKey, subtopicId: `${topicKey}|${s.key}`, subtopicName: s.name });
    }
  }
  return out;
};

const shouldInclude = (topicKey, subtopicId) => {
  if (ONLY_TOPIC && ONLY_TOPIC !== topicKey) return false;
  if (ONLY_SUBTOPIC_ID && ONLY_SUBTOPIC_ID !== subtopicId) return false;
  return true;
};

const runForSubtopic = async ({ topicKey, subtopicId, subtopicName, equalizeTargetTotal }) => {
  const burstStart = Date.now();
  const burstExpired = () => (BURST_MS > 0 && Date.now() - burstStart >= BURST_MS);

  const topic = topicKeyToGeneratorTopic(topicKey);

  const addCount = ADD_PER_BUCKET > 0 ? ADD_PER_BUCKET : COUNT_PER_TARGET;
  const targets = MODE === 'one'
    ? [{ tier: 'Foundation Tier', calculatorType: 'non-calculator', count: 1 }]
    : [
        { tier: 'Foundation Tier', calculatorType: 'calculator', count: MODE === 'add' ? addCount : COUNT_PER_TARGET },
        { tier: 'Foundation Tier', calculatorType: 'non-calculator', count: MODE === 'add' ? addCount : COUNT_PER_TARGET },
        { tier: 'Higher Tier', calculatorType: 'calculator', count: MODE === 'add' ? addCount : COUNT_PER_TARGET },
        { tier: 'Higher Tier', calculatorType: 'non-calculator', count: MODE === 'add' ? addCount : COUNT_PER_TARGET },
      ];

  console.log(`\n=== ${subtopicId} (${subtopicName}) ===`);

  if (MODE === 'equalize') {
    const targetTotal = Number(equalizeTargetTotal || 0);
    if (!targetTotal || !Number.isFinite(targetTotal) || targetTotal <= 0) {
      throw new Error('equalize mode requires a valid target total');
    }

    const existingTotal = await getExistingCountForSubtopicTotal({ subtopicId });
    const neededRaw = Math.max(0, targetTotal - existingTotal);
    const needed = CHUNK_PER_SUBTOPIC > 0 ? Math.min(neededRaw, CHUNK_PER_SUBTOPIC) : neededRaw;
    if (needed === 0) {
      console.log(`- equalize: already at ${existingTotal}/${targetTotal} — skip`);
      return;
    }

    if (needed !== neededRaw) {
      console.log(`- equalize: need ${neededRaw} total to reach ${targetTotal} (currently ${existingTotal}); burst cap=${needed}`);
    } else {
      console.log(`- equalize: need ${needed} to reach ${targetTotal} (currently ${existingTotal})`);
    }
    const existingSigs = await getExistingSignaturesForSubtopic({ topic, subtopicId });

    const bucketCycle = [
      { tier: 'Foundation Tier', calculatorType: 'calculator' },
      { tier: 'Foundation Tier', calculatorType: 'non-calculator' },
      { tier: 'Higher Tier', calculatorType: 'calculator' },
      { tier: 'Higher Tier', calculatorType: 'non-calculator' },
    ];

    let remaining = needed;
    for (let attempt = 1; attempt <= 60 && remaining > 0; attempt++) {
      if (burstExpired()) {
        console.log(`  Burst budget reached; stopping early for ${subtopicId}.`);
        return;
      }

      const bucket = bucketCycle[(attempt - 1) % bucketCycle.length];
      const requestCount = Math.min(remaining, MAX_PER_REQUEST);
      const tier = bucket.tier;
      const calculatorType = bucket.calculatorType;
      const forceImages = shouldForceImagesForSubtopic(subtopicId) && (IMAGE_MODE === 'all');

      console.log(`  equalize: generating ${requestCount} (${tier} / ${calculatorType}) [${attempt}/60]`);

      const gen = await postWithRetry(
        {
          action: 'generate',
          topic,
          tier,
          calculatorType,
          count: requestCount,
          subtopicId,
          forceImages,
          multipartRatio: MULTIPART_RATIO,
        },
        { label: 'generate(equalize)', maxAttempts: 12, baseDelayMs: 1500 }
      );

      if (!gen?.success || !Array.isArray(gen.questions) || gen.questions.length === 0) {
        console.log(`  generated 0 questions (partial=${Boolean(gen?.partial)}); retrying...`);
        await sleep(ZERO_RESULT_DELAY_MS);
        continue;
      }

      const uniqueQuestions = [];
      for (const q of gen.questions) {
        const sig = signature(q?.question);
        if (!sig) continue;
        if (existingSigs.has(sig)) continue;
        existingSigs.add(sig);
        uniqueQuestions.push(q);
      }

      if (uniqueQuestions.length === 0) {
        console.log('  all generated were duplicates; retrying...');
        await sleep(INTER_CALL_DELAY_MS);
        continue;
      }

      let inserted = 0;
      if (INSERT_MODE === 'edge') {
        const ins = await postWithRetry(
          {
            action: 'insert',
            topic,
            tier,
            questions: uniqueQuestions,
          },
          { label: 'insert(edge-equalize)', maxAttempts: 10, baseDelayMs: 1200 }
        );
        inserted = Number(ins?.inserted || 0);
      } else {
        const r = await insertViaRest(topic, tier, uniqueQuestions);
        inserted = Number(r?.inserted || 0);
      }

      if (inserted > 0) {
        remaining = Math.max(0, remaining - inserted);
        console.log(`  inserted=${inserted}; remaining=${remaining}`);
      } else {
        console.log('  inserted 0; retrying...');
      }

      await sleep(INTER_CALL_DELAY_MS);
    }

    const finalTotal = await getExistingCountForSubtopicTotal({ subtopicId });
    if (finalTotal < targetTotal) {
      const msg = `Could not reach equalize target for ${subtopicId}. DB has ${finalTotal}/${targetTotal}.`;
      if (CONTINUE_ON_ERROR) {
        console.log(`  WARN: ${msg} Continuing...`);
        return;
      }
      throw new Error(msg);
    }

    console.log(`OK: equalized ${subtopicId} to ${finalTotal}`);
    return;
  }

  // Fast mode: always add exactly ONE new question per mini-subtopic.
  // We deliberately do not skip based on existing counts.
  if (MODE === 'one') {
    const forceImages = shouldForceImagesForSubtopic(subtopicId);
    const phaseForceImages = forceImages && (IMAGE_MODE === 'all');

    for (let attempt = 1; attempt <= 14; attempt++) {
      if (burstExpired()) {
        console.log(`  Burst budget reached; stopping early for ${subtopicId}.`);
        return;
      }

      console.log(`- one: generating 1 (${attempt}/14)`);
      const gen = await postWithRetry(
        {
          action: 'generate',
          topic,
          tier: 'Foundation Tier',
          calculatorType: 'non-calculator',
          count: 1,
          subtopicId,
          forceImages: phaseForceImages,
          multipartRatio: MULTIPART_RATIO,
        },
        { label: 'generate(one)', maxAttempts: 10, baseDelayMs: 1200 }
      );

      if (!gen?.success || !Array.isArray(gen.questions) || gen.questions.length === 0) {
        console.log(`  generated 0 questions (partial=${Boolean(gen?.partial)}); retrying...`);
        await sleep(ZERO_RESULT_DELAY_MS);
        continue;
      }

      let inserted = 0;
      if (INSERT_MODE === 'edge') {
        const ins = await postWithRetry(
          {
            action: 'insert',
            topic,
            tier: 'Foundation Tier',
            questions: gen.questions,
          },
          { label: 'insert(edge-one)', maxAttempts: 10, baseDelayMs: 1000 }
        );
        inserted = Number(ins?.inserted || 0);
      } else {
        const r = await insertViaRest(topic, 'Foundation Tier', gen.questions);
        inserted = Number(r?.inserted || 0);
      }

      if (inserted >= 1) {
        console.log(`  OK: inserted 1 for ${subtopicId}`);
        await sleep(INTER_CALL_DELAY_MS);
        return;
      }

      console.log('  inserted 0 (likely duplicate); retrying...');
      await sleep(INTER_CALL_DELAY_MS);
    }

    const msg = `Could not insert 1 unique question for ${subtopicId} after retries.`;
    if (CONTINUE_ON_ERROR) {
      console.log(`  WARN: ${msg} Continuing...`);
      return;
    }
    throw new Error(msg);
  }

  for (const t of targets) {
    const label = `${t.tier} / ${t.calculatorType}`;
    const bucketTarget = t.count;

    const forceImages = shouldForceImagesForSubtopic(subtopicId);
    const imageTarget = forceImages ? (IMAGE_MODE === 'all' ? t.count : IMAGE_PER_TARGET) : 0;
    const nonImageTarget = Math.max(0, t.count - imageTarget);

    const phases = [
      ...(imageTarget > 0 ? [{ forceImages: true, count: imageTarget, label: `${label} (images)` }] : []),
      ...(nonImageTarget > 0 ? [{ forceImages: false, count: nonImageTarget, label: `${label} (non-images)` }] : []),
    ];

      for (const phase of phases) {
        // Make this idempotent: if the bucket already has enough rows, skip (unless MODE=add).
        let baselineExisting = MODE === 'add' ? 0 : await getExistingCountForBucket({
          topic,
          subtopicId,
        tier: t.tier,
        calculator: t.calculatorType,
      });

      if (MODE !== 'add' && baselineExisting >= phase.count) {
        console.log(`- ${phase.label}: already has ${baselineExisting} (target ${phase.count}) — skip`);
        continue;
      }

      let phaseInserted = 0;
      let insertedSinceRefresh = 0;

      for (let attempt = 1; attempt <= 12 && phaseInserted < phase.count; attempt++) {
        if (burstExpired()) {
          console.log(`  Burst budget reached; stopping early for ${subtopicId}.`);
          return;
        }
        // Refresh the true DB count occasionally to stay accurate without hammering PostgREST.
        if (MODE !== 'add' && (attempt === 1 || attempt % 4 === 0)) {
          baselineExisting = await getExistingCountForBucket({
            topic,
            subtopicId,
            tier: t.tier,
            calculator: t.calculatorType,
          });
          insertedSinceRefresh = 0;
        }

        const estimatedExisting = MODE === 'add' ? insertedSinceRefresh : baselineExisting + insertedSinceRefresh;
        const remaining = Math.max(0, phase.count - estimatedExisting);
        if (remaining === 0) {
          console.log(`- ${phase.label}: reached target (${phase.count})`);
          break;
        }
        const requestCount = Math.min(remaining, MAX_PER_REQUEST);
        console.log(`- ${phase.label}: need ${remaining} (attempt ${attempt})`);

        const gen = await postWithRetry(
          {
            action: 'generate',
            topic,
            tier: t.tier,
            calculatorType: t.calculatorType,
            count: requestCount,
            subtopicId,
            forceImages: phase.forceImages,
            multipartRatio: MULTIPART_RATIO,
          },
          { label: 'generate', maxAttempts: 12, baseDelayMs: 1500 }
        );

        if (!gen?.success) {
          throw new Error(`Generation failed for ${phase.label}: ${gen?.error || 'unknown error'}`);
        }

        if (!Array.isArray(gen.questions) || gen.questions.length === 0) {
          // The edge function may return partial/empty results under load/time limits.
          console.log(`  generated 0 questions (partial=${Boolean(gen?.partial)}); retrying...`);
          await sleep(ZERO_RESULT_DELAY_MS);
          continue;
        }

        let inserted = 0;
        let skipped = 0;
        if (INSERT_MODE === 'edge') {
          const ins = await postWithRetry(
            {
              action: 'insert',
              topic,
              tier: t.tier,
              questions: gen.questions,
            },
            { label: 'insert(edge)', maxAttempts: 10, baseDelayMs: 1200 }
          );
          inserted = Number(ins?.inserted || 0);
          skipped = Number(ins?.skipped_duplicates || 0);
        } else {
          let lastErr;
          for (let a = 1; a <= 10; a++) {
            try {
              const r = await insertViaRest(topic, t.tier, gen.questions);
              inserted = Number(r?.inserted || 0);
              break;
            } catch (e) {
              lastErr = e;
              const msg = String(e?.message || e);
              if (!isTransientErrorMessage(msg)) throw e;
              const delay = Math.min(12000, 900 * Math.pow(1.4, a - 1)) + Math.floor(Math.random() * 300);
              console.log(`  transient (insert(rest)): ${msg} — retry ${a}/10 in ${delay}ms`);
              await sleep(delay);
            }
          }
          if (inserted === 0 && lastErr) {
            throw lastErr;
          }
        }
        phaseInserted += inserted;
        insertedSinceRefresh += inserted;

        console.log(`  inserted=${inserted}, skipped_duplicates=${skipped}, phase_inserted=${phaseInserted}`);

        if (phaseInserted < phase.count) {
          await sleep(INTER_CALL_DELAY_MS);
        }
      }

      if (MODE === 'add' && phaseInserted < phase.count) {
        const msg = `Add mode did not insert required count for ${phase.label}. Inserted ${phaseInserted}/${phase.count}.`;
        if (BURST_MS > 0) {
          console.log(`  Partial progress for ${phase.label}: ${phaseInserted}/${phase.count} inserted.`);
          return;
        }
        throw new Error(msg);
      }
    }

    const finalExisting = await getExistingCountForBucket({
      topic,
      subtopicId,
      tier: t.tier,
      calculator: t.calculatorType,
    });

    if (MODE !== 'add' && finalExisting < bucketTarget) {
      if (BURST_MS > 0) {
        console.log(`  Partial progress for ${label}: ${finalExisting}/${bucketTarget} in DB.`);
        return;
      }
      throw new Error(`Could not reach required count for ${label}. DB has ${finalExisting}/${bucketTarget}.`);
    }
  }

  console.log(`OK: completed fill for ${subtopicId}`);
};

const main = async () => {
  console.log(`Using endpoint: ${ENDPOINT || '(set SUPABASE_URL to show endpoint)'}`);
  console.log(`Filters: ONLY_TOPIC=${ONLY_TOPIC || '(none)'} ONLY_SUBTOPIC_ID=${ONLY_SUBTOPIC_ID || '(none)'}`);
  console.log(`Auth: apiKey=${(SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN) ? 'set' : 'missing'} bearerToken=${SUPABASE_BEARER_TOKEN ? 'set' : 'missing'}`);

  const all = getAllSubtopicIds().filter((x) => shouldInclude(x.topicKey, x.subtopicId));

  console.log(`Subtopics to process: ${all.length}`);

  if (!SUPABASE_URL || !(SUPABASE_API_KEY || SUPABASE_BEARER_TOKEN) || !SUPABASE_BEARER_TOKEN) {
    throw new Error(
      'Missing env. Provide SUPABASE_URL, plus SUPABASE_BEARER_TOKEN (or SUPABASE_SERVICE_ROLE_KEY). Optionally provide SUPABASE_API_KEY (or SUPABASE_ANON_KEY).'
    );
  }

  if (MODE === 'counts') {
    await printTotalsSummary(all);
    return;
  }

  if (CONFIRM !== 'YES') {
    console.log('Dry run: set CONFIRM=YES to execute generation+inserts.');
    return;
  }

  let equalizeTargetTotal = null;
  if (MODE === 'equalize') {
    if (TARGET_TOTAL_PER_SUBTOPIC && TARGET_TOTAL_PER_SUBTOPIC > 0) {
      equalizeTargetTotal = TARGET_TOTAL_PER_SUBTOPIC;
    } else {
      // Default: equalize to the max existing total among included subtopics.
      let maxTotal = 0;
      for (const s of all) {
        const topic = topicKeyToGeneratorTopic(s.topicKey);
        const total = await getExistingCountForSubtopicTotal({ subtopicId: s.subtopicId });
        if (total > maxTotal) maxTotal = total;
      }
      equalizeTargetTotal = maxTotal;
    }
    console.log(`Equalize target total per mini-subtopic: ${equalizeTargetTotal}`);
  }

  if (MODE === 'prune') {
    if (!TARGET_TOTAL_PER_SUBTOPIC || TARGET_TOTAL_PER_SUBTOPIC <= 0) {
      throw new Error('prune mode requires TARGET_TOTAL_PER_SUBTOPIC > 0');
    }
    for (const s of all) {
      await pruneSubtopicToTarget({
        ...s,
        targetTotal: TARGET_TOTAL_PER_SUBTOPIC,
      });
      await sleep(200);
    }
    if (PRINT_COUNTS) {
      await printTotalsSummary(all);
    }
    console.log('\nDone.');
    return;
  }

  if (SUBTOPIC_CONCURRENCY <= 1) {
    let completed = 0;
    for (const s of all) {
      await runForSubtopic({ ...s, equalizeTargetTotal });
      completed += 1;
      if (completed % PROGRESS_EVERY === 0 || completed === all.length) {
        const pct = Math.round((completed / all.length) * 100);
        console.log(`PROGRESS: ${completed}/${all.length} subtopics processed (${pct}%). Last: ${s.subtopicId}`);
      }
      await sleep(300);
    }
  } else {
    let nextIndex = 0;
    let completed = 0;
    const workers = Array.from({ length: SUBTOPIC_CONCURRENCY }, async () => {
      while (nextIndex < all.length) {
        const i = nextIndex++;
        const s = all[i];
        try {
          await runForSubtopic({ ...s, equalizeTargetTotal });
        } catch (e) {
          if (!CONTINUE_ON_ERROR) throw e;
          console.log(`  WARN: subtopic failed (${s.subtopicId}): ${String(e?.message || e)}`);
        }
        completed += 1;
        if (completed % PROGRESS_EVERY === 0 || completed === all.length) {
          const pct = Math.round((completed / all.length) * 100);
          console.log(`PROGRESS: ${completed}/${all.length} subtopics processed (${pct}%). Last: ${s.subtopicId}`);
        }
        await sleep(200);
      }
    });
    await Promise.all(workers);
  }

  if (PRINT_COUNTS) {
    await printTotalsSummary(all);
  }

  console.log('\nDone.');
};

main().catch((err) => {
  console.error('\nFAILED:', err?.message || err);
  process.exit(1);
});
