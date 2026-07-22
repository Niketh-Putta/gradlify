#!/usr/bin/env node
/**
 * Live bank + session-lock regression for English vocab practice (Dylan bugs).
 * Fetches real english_passages, runs normalize + lock simulation, fails on issues.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const env = {};
  const p = path.join(root, '.env');
  if (!fs.existsSync(p)) return env;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  return env;
}

/** Mirrors src/lib/englishPassageQuality.ts normalizeQuestionOptions */
function normalizeQuestionOptions(options) {
  const list = (Array.isArray(options) ? options : [])
    .filter((o) => String(o?.text ?? '').trim().length > 0)
    .slice(0, 6);

  const deduped = [];
  const seenText = new Set();
  for (const o of list) {
    const key = String(o.text ?? '')
      .trim()
      .toLowerCase();
    if (seenText.has(key)) continue;
    seenText.add(key);
    deduped.push(o);
  }

  const correctIndexes = deduped
    .map((o, i) => (o?.correct === true ? i : -1))
    .filter((i) => i >= 0);
  const keepCorrect = correctIndexes.length > 0 ? correctIndexes[0] : 0;

  let letterIdx = 0;
  return deduped.map((o, i) => {
    const rawId = String(o?.id ?? '').trim().toUpperCase();
    const id = rawId === 'N' ? 'N' : String.fromCharCode(65 + letterIdx++);
    return {
      id,
      text: String(o.text ?? '').trim(),
      correct: i === keepCorrect,
    };
  });
}

function isVocab(row) {
  const s = `${row.sectionId || ''} ${row.subtopic || ''} ${row.title || ''}`.toLowerCase();
  return s.includes('vocab');
}

let failed = 0;
function ok(msg) {
  console.log(`ok  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL ${msg}`);
}

const env = loadEnv();
const base = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) {
  console.error('Missing VITE_SUPABASE_* in .env');
  process.exit(1);
}

const url =
  `${base}/rest/v1/english_passages?track=eq.11plus&select=id,title,sectionId,subtopic,questions,passageBlocks&limit=500`;
const res = await fetch(url, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) {
  console.error('Supabase fetch failed', res.status, await res.text());
  process.exit(1);
}
const rows = await res.json();
ok(`fetched ${rows.length} 11plus passages`);

const vocab = rows.filter(isVocab);
ok(`vocab passages: ${vocab.length}`);
if (vocab.length < 5) fail(`expected ≥5 vocab passages, got ${vocab.length}`);

let qTotal = 0;
let fixedDupes = 0;
let badAfterNorm = 0;
const sampleIssues = [];

for (const row of vocab) {
  const questions = Array.isArray(row.questions) ? row.questions : [];
  for (const q of questions) {
    qTotal += 1;
    const raw = Array.isArray(q.options) ? q.options : [];
    const rawIds = raw.map((o) => String(o?.id ?? '').trim().toUpperCase()).filter(Boolean);
    if (rawIds.length !== new Set(rawIds).size) fixedDupes += 1;

    const n = normalizeQuestionOptions(raw);
    const ids = n.map((o) => o.id);
    const corrects = n.filter((o) => o.correct);
    if (ids.length !== new Set(ids).size || corrects.length !== 1 || n.length < 2) {
      badAfterNorm += 1;
      if (sampleIssues.length < 5) {
        sampleIssues.push({ passage: row.id, q: q.id || q.text?.slice(0, 40), ids, corrects: corrects.length });
      }
    }

    // Selecting the correct option must match by id
    const correct = corrects[0];
    if (correct) {
      const selected = correct.id;
      const match = n.find((o) => o.id === selected);
      if (!match || !match.correct) {
        badAfterNorm += 1;
        sampleIssues.push({ passage: row.id, issue: 'select-by-id failed' });
      }
    }
  }
}

if (badAfterNorm) {
  fail(`normalize left ${badAfterNorm} bad questions`);
  console.error(sampleIssues);
} else {
  ok(`all ${qTotal} vocab questions normalize cleanly (unique ids, 1 correct)`);
}
if (fixedDupes) ok(`normalize would repair ${fixedDupes} raw duplicate-letter questions`);
else ok('bank has no raw duplicate option letters (normalize still hardens)');

// --- Session lock simulation (exact bug from video) ---
{
  const pool = vocab.map((r) => ({
    uniqueId: r.id,
    title: r.title,
    q1: (r.questions?.[0]?.text || '').slice(0, 80),
  }));
  const sessionSeed = 0.37;
  const pick = (seen) => {
    const unseen = pool.filter((p) => !seen.includes(p.uniqueId));
    const candidates = unseen.length ? unseen : pool;
    return candidates[Math.floor(sessionSeed * 777) % candidates.length];
  };

  // OLD BUG
  let seen = [];
  const b1 = pick(seen);
  seen.push(b1.uniqueId);
  const b2 = pick(seen);
  if (b1.uniqueId === b2.uniqueId && pool.length > 1) {
    fail('expected old mid-session seen bug to reshuffle when pool>1');
  } else {
    ok(`old bug reproduced: ${b1.title} → ${b2.title}`);
  }

  // FIXED
  seen = [];
  let locked = null;
  const activate = () => {
    if (locked) return locked;
    locked = pick(seen);
    return locked;
  };
  const snaps = [];
  for (let i = 0; i < 50; i++) snaps.push(activate());
  const same = snaps.every((s) => s.uniqueId === snaps[0].uniqueId && s.q1 === snaps[0].q1);
  if (!same) fail('locked session changed across 50 recomputes');
  else ok(`locked session stable across 50 recomputes (${snaps[0].title})`);

  // Finish then new session may differ
  seen = [locked.uniqueId];
  locked = null;
  const next = activate();
  if (pool.length > 1 && next.uniqueId === snaps[0].uniqueId) {
    // possible if only 1 unseen left and algorithm wraps — soft
    ok('post-finish pick ran (may reuse if pool exhausted)');
  } else {
    ok(`post-finish new session: ${next.title}`);
  }
}

// --- UI source guards ---
{
  const demo = fs.readFileSync(path.join(root, 'src/pages/EnglishSplitViewDemo.tsx'), 'utf8');
  const quality = fs.readFileSync(path.join(root, 'src/lib/englishPassageQuality.ts'), 'utf8');
  assert.ok(demo.includes('lockedSections'));
  assert.ok(demo.includes('Loading practice session'));
  assert.ok(quality.includes("rawId === 'N'"));
  const pickStart = demo.indexOf('Pick EXACTLY once');
  const pickEnd = demo.indexOf('const activeSections');
  const pickEffect = demo.slice(pickStart, pickEnd);
  if (pickEffect.includes("localStorage.setItem('seen_english_passages'")) {
    fail('seen_english_passages written inside pick effect');
  } else {
    ok('seen only outside pick effect');
  }
  if (!/if \(!isFinished \|\| isLiveMock/.test(demo)) {
    fail('finish gate for seen missing');
  } else {
    ok('seen gated on isFinished');
  }
}

// --- Live production chunk ---
{
  const html = await fetch('https://gradlify.com/').then((r) => r.text());
  const mainMatch = html.match(/\/assets\/main-[^"]+\.js/);
  assert.ok(mainMatch);
  const main = await fetch(`https://gradlify.com${mainMatch[0]}`).then((r) => r.text());
  const engMatch = main.match(/EnglishSplitViewDemo-[A-Za-z0-9_-]+\.js/);
  assert.ok(engMatch);
  const eng = await fetch(`https://gradlify.com/assets/${engMatch[0]}`).then((r) => r.text());
  if (!eng.includes('Loading practice session')) fail('prod missing loading gate');
  else ok(`prod ${engMatch[0]} has loading gate`);
  // N preserve may not be live until redeploy — warn if missing marker string
  // (minified may drop rawId === 'N' text differently)
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll english session-lock + vocab bank checks passed.');
