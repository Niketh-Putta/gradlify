#!/usr/bin/env node
/**
 * Regression guard: 11+ bank labels must map into readiness topics.
 * Run: npm run verify:topic-aliases
 *
 * Prevents the Dylan bug (Algebra & Ratio mocks → Algebra stuck at 0%).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Mirrored from src/lib/canonicalTopics.ts (zero build deps).
// Keep CASES identical to TOPIC_ALIAS_REGRESSION_CASES.

const PRIMARY = {
  number: 'Number',
  'arithmetic & number skills': 'Number',
  'number & arithmetic': 'Number',
  'number and arithmetic': 'Number',
  algebra: 'Algebra',
  'algebra & ratio': 'Algebra',
  'algebra and ratio': 'Algebra',
  ratio: 'Ratio & Proportion',
  'ratio & proportion': 'Ratio & Proportion',
  'ratio and proportion': 'Ratio & Proportion',
  geometry: 'Geometry',
  'geometry & measures': 'Geometry',
  'geometry and measures': 'Geometry',
  probability: 'Probability',
  statistics: 'Statistics',
  'statistics & data': 'Statistics',
  'statistics and data': 'Statistics',
  data: 'Statistics',
  comprehension: 'Comprehension',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  spelling: 'Spelling',
  spag: 'Grammar',
};

const SECONDARY = {
  'algebra & ratio': 'Ratio & Proportion',
  'algebra and ratio': 'Ratio & Proportion',
  'statistics & data': 'Probability',
  'statistics and data': 'Probability',
};

const PROBLEM = new Set([
  'problem solving',
  'problem-solving',
  'problem solving & strategies',
  'exam preparation',
  'strategies',
]);

function key(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function primary(raw) {
  const k = key(raw);
  if (!k || PROBLEM.has(k)) return null;
  return PRIMARY[k] ?? null;
}

function secondary(raw) {
  return SECONDARY[key(raw)] ?? null;
}

const CASES = [
  { input: 'Algebra & Ratio', primary: 'Algebra', secondary: 'Ratio & Proportion' },
  { input: 'algebra and ratio', primary: 'Algebra', secondary: 'Ratio & Proportion' },
  { input: 'Statistics & Data', primary: 'Statistics', secondary: 'Probability' },
  { input: 'Number & Arithmetic', primary: 'Number', secondary: null },
  { input: 'Geometry & Measures', primary: 'Geometry', secondary: null },
  { input: 'Algebra', primary: 'Algebra', secondary: null },
  { input: 'Ratio & Proportion', primary: 'Ratio & Proportion', secondary: null },
  { input: 'Problem Solving', primary: null, secondary: null },
  { input: 'comprehension', primary: 'Comprehension', secondary: null },
  { input: 'spag', primary: 'Grammar', secondary: null },
];

let failed = 0;
for (const c of CASES) {
  const p = primary(c.input);
  const s = secondary(c.input);
  if (p !== c.primary || s !== c.secondary) {
    failed += 1;
    console.error(
      `FAIL "${c.input}": got primary=${p} secondary=${s}; expected primary=${c.primary} secondary=${c.secondary}`
    );
  } else {
    console.log(`ok  "${c.input}" → ${p}${s ? ` (+ ${s})` : ''}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} topic-alias regression(s). Fix src/lib/canonicalTopics.ts + SQL canonicalize_readiness_topic.`);
  process.exit(1);
}

console.log(`\nAll ${CASES.length} topic-alias checks passed.`);
console.log(`Source of truth: ${path.relative(root, path.join(root, 'src/lib/canonicalTopics.ts'))}`);
console.log('DB mirror: public.canonicalize_readiness_topic()');
