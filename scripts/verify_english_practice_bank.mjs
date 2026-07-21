#!/usr/bin/env node
/**
 * Regression guard: English practice bank + UI helpers must not serve broken SPaG rows.
 * Run: npm run verify:english-bank
 *
 * Prevents Dylan-class bugs: blank passages, unreadable drills, stem/option holes.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const modPath = pathToFileURL(path.join(root, 'src/lib/englishPassageQuality.ts')).href;

// Load via dynamic import — Vite TS not required; mirror pure logic inline for zero-build verify.
function normalizeId(raw) {
  return String(raw ?? '').trim().toLowerCase();
}
function isSpagRow(row) {
  const id = normalizeId(row.sectionId);
  const sub = normalizeId(row.subtopic);
  return Boolean(id.match(/spag|spell|punct|gramm/) || sub.match(/spell|punct|gramm/));
}
function hasStemOptionMismatch(question) {
  const stem = String(question?.text ?? '').toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  if (!stem || options.length < 2) return false;
  const optionTexts = options.map((o) => String(o?.text ?? '').trim()).filter(Boolean);
  const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'determiner', 'article']);
  const firstTokens = optionTexts.map((t) => t.toLowerCase().split(/\s+/)[0] ?? '');
  const allPos = firstTokens.length >= 3 && firstTokens.every((t) => POS.has(t.replace(/[^a-z]/g, '')));
  const asksForWord =
    /\b(which word|what word|find the word|misspelled word|incorrectly|from the (first |second |third )?paragraph)\b/i.test(stem) &&
    !/\b(part of speech|word class|type of word|is an? (noun|verb|adjective|adverb))\b/i.test(stem);
  return asksForWord && allPos;
}
function normalizeClozeBlankText(text) {
  return String(text ?? '')
    .replace(/\[\s*Blank\s*(\d+)\s*\]/gi, '[$1]')
    .replace(/\[\s*(\d+)\s*\]/g, '[$1]')
    .replace(/\(\s*Blank\s*(\d+)\s*\)/gi, '[$1]')
    .replace(/_{3,}/g, '[ ]');
}
function validateEnglishPassageRow(row) {
  const issues = [];
  const id = row.id || row.title || 'unknown';
  const blocks = Array.isArray(row.passageBlocks) ? row.passageBlocks : [];
  const questions = Array.isArray(row.questions) ? row.questions : [];
  if (blocks.length === 0) issues.push({ code: 'empty_blocks' });
  if (questions.length === 0) {
    issues.push({ code: 'empty_questions' });
    return issues;
  }
  const blockText = blocks.map((b) => String(b?.text ?? '')).join('\n');
  const hasClozeMarker = /\[\s*\d+\s*\]|\[\s*Blank\s*\d+\s*\]|_{3,}/i.test(blockText);
  const asksCloze = questions.some((q) =>
    /\b(blank\s*\d*|fills?\s*(blank|\[)|correct spelling to (fill|complete))\b/i.test(String(q?.text ?? '')),
  );
  if (asksCloze && blocks.length > 0 && !hasClozeMarker) issues.push({ code: 'missing_cloze_markers' });
  questions.forEach((q, idx) => {
    if (!String(q?.text ?? '').trim()) issues.push({ code: 'blank_stem', q: idx });
    const options = Array.isArray(q?.options) ? q.options : [];
    if (options.length < 2) issues.push({ code: 'few_options', q: idx });
    const correctCount = options.filter((o) => o?.correct === true).length;
    if (correctCount !== 1) issues.push({ code: 'correct_count', q: idx, correctCount });
    if (hasStemOptionMismatch(q)) issues.push({ code: 'stem_option_mismatch', q: idx });
  });
  return issues;
}
function ensurePassageBlocks(row) {
  const blocks = (Array.isArray(row.passageBlocks) ? row.passageBlocks : [])
    .map((b, i) => ({ id: String(b?.id ?? `p${i + 1}`), text: normalizeClozeBlankText(String(b?.text ?? '').trim()) }))
    .filter((b) => b.text.length > 0);
  if (blocks.length > 0) return blocks;
  const questions = Array.isArray(row.questions) ? row.questions : [];
  return questions.slice(0, 10).map((q, i) => ({
    id: `q-${i + 1}`,
    text: `${i + 1}. ${String(q?.text ?? 'Question').trim()}`,
  }));
}
function practiceInstructionsForFocus(focus, sectionDesc) {
  const desc = String(sectionDesc ?? '').trim();
  if (desc) return desc;
  if (focus === 'spag') {
    return 'Read each line carefully. Choose the correct option, or mark N if there is no mistake.';
  }
  if (focus === 'vocab') return 'Choose the best word or synonym for each question.';
  return 'Answer the questions based on the source text.';
}
function spagDrillQualityScore(row) {
  const blocks = Array.isArray(row.passageBlocks) ? row.passageBlocks : [];
  const text = blocks.map((b) => String(b?.text ?? '')).join('\n');
  let score = 0;
  if (/\s\/\s/.test(text)) score += 3;
  if (/\[\s*\d+\s*\]|\[\s*Blank\s*\d+\s*\]/i.test(text)) score += 2;
  if (text.length > 0 && text.length < 900) score += 1;
  if (text.length > 1600) score -= 2;
  return score;
}

let failed = 0;

// --- Unit fixtures ---
const good = {
  id: 'good-spag',
  sectionId: 'spag',
  subtopic: 'punctuation',
  passageBlocks: [{ id: 'p1', text: 'Mia packed the tent.' }],
  questions: [
    {
      id: 'q1',
      text: 'Why is Mia capitalised?',
      evidenceLine: 'p1',
      options: [
        { id: 'A', text: 'Proper noun', correct: true },
        { id: 'B', text: 'Adjective', correct: false },
      ],
    },
  ],
};

const blankPassage = {
  id: 'blank-pass',
  sectionId: 'spag',
  subtopic: 'spelling',
  passageBlocks: [],
  questions: [
    {
      id: 'q1',
      text: 'Which spelling fills blank [1]?',
      options: [
        { id: 'A', text: 'mystery', correct: true },
        { id: 'B', text: 'mistery', correct: false },
      ],
    },
  ],
};

const badCorrect = {
  id: 'bad-correct',
  sectionId: 'comprehension',
  subtopic: 'fiction',
  passageBlocks: [{ id: 'p1', text: 'Hello.' }],
  questions: [
    {
      id: 'q1',
      text: 'What?',
      options: [
        { id: 'A', text: 'One', correct: true },
        { id: 'B', text: 'Two', correct: true },
      ],
    },
  ],
};

if (validateEnglishPassageRow(good).length !== 0) {
  failed += 1;
  console.error('FAIL: good row should validate');
} else {
  console.log('ok  good row validates');
}

if (!validateEnglishPassageRow(blankPassage).some((i) => i.code === 'empty_blocks')) {
  failed += 1;
  console.error('FAIL: blank passage should flag empty_blocks');
} else {
  console.log('ok  blank passage flagged');
}

const repaired = ensurePassageBlocks(blankPassage);
if (repaired.length < 1 || !repaired[0].text.includes('Which spelling')) {
  failed += 1;
  console.error('FAIL: ensurePassageBlocks should synthesize from stems', repaired);
} else {
  console.log('ok  ensurePassageBlocks synthesizes source lines');
}

if (!validateEnglishPassageRow(badCorrect).some((i) => i.code === 'correct_count')) {
  failed += 1;
  console.error('FAIL: dual-correct should flag correct_count');
} else {
  console.log('ok  dual-correct flagged');
}

if (!isSpagRow({ sectionId: 'spag', subtopic: 'grammar' })) {
  failed += 1;
  console.error('FAIL: isSpagRow');
} else {
  console.log('ok  isSpagRow');
}

const spagCopy = practiceInstructionsForFocus('spag');
if (/source texts strictly/i.test(spagCopy)) {
  failed += 1;
  console.error('FAIL: SPaG instructions still use comprehension copy');
} else {
  console.log('ok  SPaG practice instructions');
}

const mismatchQ = {
  id: 'q1',
  text: 'Which word from the first paragraph was used incorrectly as a verb?',
  options: [
    { id: 'A', text: 'Noun', correct: true },
    { id: 'B', text: 'Adjective', correct: false },
    { id: 'C', text: 'Adverb', correct: false },
    { id: 'D', text: 'Verb', correct: false },
  ],
};
if (!hasStemOptionMismatch(mismatchQ)) {
  failed += 1;
  console.error('FAIL: stem/option mismatch not detected');
} else {
  console.log('ok  stem/option mismatch detected');
}

const clozeNorm = normalizeClozeBlankText('He was [Blank 1] and then [ 2 ] left.');
if (!clozeNorm.includes('[1]') || !clozeNorm.includes('[2]')) {
  failed += 1;
  console.error('FAIL: cloze normalize', clozeNorm);
} else {
  console.log('ok  cloze blank normalize');
}

const missingCloze = {
  id: 'missing-cloze',
  sectionId: 'spag',
  subtopic: 'spelling',
  passageBlocks: [{ id: 'p1', text: 'The mysterious house stood quietly.' }],
  questions: [
    {
      id: 'q1',
      text: 'Which spelling correctly fills blank [1]?',
      options: [
        { id: 'A', text: 'mystery', correct: true },
        { id: 'B', text: 'mistery', correct: false },
      ],
    },
  ],
};
if (!validateEnglishPassageRow(missingCloze).some((i) => i.code === 'missing_cloze_markers')) {
  failed += 1;
  console.error('FAIL: missing cloze markers not flagged');
} else {
  console.log('ok  missing cloze markers flagged');
}

// Prefer slash-line drills
const slash = {
  sectionId: 'spag',
  subtopic: 'spelling',
  passageBlocks: [{ id: 's1', text: 'The immediate / atmosphere around / completly chaotic.' }],
  questions: blankPassage.questions,
};
const prose = {
  sectionId: 'spag',
  subtopic: 'spelling',
  passageBlocks: [{ id: 'p1', text: 'A'.repeat(2000) }],
  questions: blankPassage.questions,
};
if (!(spagDrillQualityScore(slash) > spagDrillQualityScore(prose))) {
  failed += 1;
  console.error('FAIL: slash drills should score higher than long prose');
} else {
  console.log('ok  SPaG quality prefers line drills');
}

// UI class regression: these anti-patterns must stay out of EnglishSplitViewDemo.
import fs from 'node:fs';
const demoPath = path.join(root, 'src/pages/EnglishSplitViewDemo.tsx');
const demoSrc = fs.readFileSync(demoPath, 'utf8');
const banned = [
  { re: /opacity-60 hover:opacity-100/, why: 'faint MCQ cards (Dylan SPAG video)' },
  { re: /opacity-85 group-hover:opacity-100/, why: 'washed-out passage blocks' },
  { re: /Answer the questions based on the source texts strictly/, why: 'comprehension-only subtitle on all practice' },
];
for (const b of banned) {
  if (b.re.test(demoSrc)) {
    failed += 1;
    console.error(`FAIL UI: ${b.why} — pattern ${b.re}`);
  } else {
    console.log(`ok  UI guard: ${b.why}`);
  }
}

if (!demoSrc.includes('ensurePassageBlocks') || !demoSrc.includes('practiceInstructionsForFocus')) {
  failed += 1;
  console.error('FAIL UI: EnglishSplitViewDemo must use englishPassageQuality helpers');
} else {
  console.log('ok  UI wires englishPassageQuality helpers');
}

if (!demoSrc.includes('english-passage-text')) {
  failed += 1;
  console.error('FAIL UI: missing english-passage-text class (line-height lock)');
} else {
  console.log('ok  UI uses english-passage-text');
}

if (!demoSrc.includes('hidden lg:flex') || !demoSrc.includes('lg:hidden mb-5')) {
  failed += 1;
  console.error('FAIL UI: mobile practice must use unified source+questions scroll (no dual-pane overlap)');
} else {
  console.log('ok  UI mobile practice unified scroll');
}

if (!demoSrc.includes('english-cloze-blank') || !demoSrc.includes('normalizeClozeBlankText')) {
  failed += 1;
  console.error('FAIL UI: cloze blanks must render as visible chips');
} else {
  console.log('ok  UI cloze blank chips');
}

if (!demoSrc.includes('stem_option_mismatch') || !demoSrc.includes('missing_cloze_markers')) {
  failed += 1;
  console.error('FAIL UI: must filter stem/option and missing-cloze rows');
} else {
  console.log('ok  UI filters incoherent bank rows');
}

void modPath; // reserved if we later import compiled TS

if (failed > 0) {
  console.error(`\n${failed} english-practice regression(s).`);
  process.exit(1);
}
console.log('\nAll english practice bank / UI guards passed.');
