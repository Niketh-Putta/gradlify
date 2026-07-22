#!/usr/bin/env node
/**
 * Playwright E2E: vocab practice Q1 must not reshuffle while answering (Dylan bug).
 * Targets local Vite DEV route (no OAuth).
 */
import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5173';
const URL = `${BASE}/english-demo?topics=Vocabulary&mode=practice`;

async function waitForPractice(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || '';
      return /QUESTION\s*1/i.test(t) && !/Loading practice session/i.test(t);
    },
    { timeout: 90000 },
  );
}

async function sessionFingerprint(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    const titleCandidates = [...document.querySelectorAll('h1, h2, h3, .font-semibold, .font-bold')]
      .map((el) => (el.textContent || '').trim())
      .filter(
        (t) =>
          t.length > 8 &&
          t.length < 90 &&
          !/QUESTION|Free plan|SOURCE|Highlight|Gradlify|Unlock|Premium|Confirm/i.test(t),
      );
    const q1Marker = text.indexOf('QUESTION 1');
    const q1Block = q1Marker >= 0 ? text.slice(q1Marker, q1Marker + 480) : '';
    const stems = [...document.querySelectorAll('h3')]
      .map((el) => (el.textContent || '').trim())
      .filter(
        (t) =>
          t.length > 20 &&
          !/Free plan|Unlock|Premium|Confirm Session/i.test(t),
      );
    // Prefer stem that appears inside the Q1 block
    const stemFromBlock = (q1Block.match(/QUESTION\s*1[\s\S]{0,80}?\n?([^\n]{20,180})/i) || [])[1] || '';
    return {
      title: titleCandidates[0] || '',
      stem1: stems.find((s) => q1Block.includes(s.slice(0, 40))) || stemFromBlock.trim() || stems[0] || '',
      q1Snippet: q1Block.replace(/\s+/g, ' ').slice(0, 280),
      href: location.href,
      seen: localStorage.getItem('seen_english_passages'),
    };
  });
}

async function clickFirstMcqOption(page) {
  // MCQ option buttons contain a letter chip + option text; avoid Unlock/Highlight/Finish.
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    for (const btn of buttons) {
      const t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length < 8 || t.length > 180) continue;
      if (/Unlock|Highlight|Finish|Confirm|Premium|Gradlify|Back|Copy|Sign|Get /i.test(t)) continue;
      // Prefer options that start with A/B/C/D chip
      if (!/^[A-DN]\b/.test(t) && !btn.querySelector('span')) continue;
      btn.click();
      return t.slice(0, 120);
    }
    return null;
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPad Pro 11'],
    viewport: { width: 1194, height: 834 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  console.log('→ open', URL);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPractice(page);

  const a = await sessionFingerprint(page);
  assert.ok(a.stem1, 'missing Q1 stem');
  console.log('ok  title:', a.title);
  console.log('ok  Q1 stem:', a.stem1.slice(0, 100));

  const clicked = await clickFirstMcqOption(page);
  console.log('ok  clicked MCQ:', clicked || '(none found)');
  await page.waitForTimeout(400);

  // Stress: scroll + resize (tablet landscape churn from Dylan videos)
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 140));
    await page.waitForTimeout(150);
    await page.setViewportSize(
      i % 2 === 0 ? { width: 1024, height: 768 } : { width: 1194, height: 834 },
    );
    await page.waitForTimeout(150);
  }

  const b = await sessionFingerprint(page);
  assert.equal(a.stem1, b.stem1, `Q1 stem changed mid-session\nA: ${a.stem1}\nB: ${b.stem1}`);
  assert.equal(a.title, b.title, `Passage title changed mid-session\nA: ${a.title}\nB: ${b.title}`);
  // Must NOT mark seen mid-session
  assert.equal(b.seen, null, `seen_english_passages written mid-session: ${b.seen}`);
  console.log('ok  Q1 + title stable across click/scroll/resize');
  console.log('ok  seen_english_passages still empty mid-session');

  // Unique option letters in Q1 block
  const letters = [...(b.q1Snippet.match(/\b([A-D])\b/g) || [])].slice(0, 4);
  if (letters.length >= 4) {
    assert.equal(new Set(letters).size, letters.length, `duplicate option letters: ${letters}`);
    console.log('ok  option letters:', letters.join(','));
  }

  // Reload = new session may change; then must stay locked again
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPractice(page);
  const c = await sessionFingerprint(page);
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(200);
  }
  const d = await sessionFingerprint(page);
  assert.equal(c.stem1, d.stem1, 'Q1 changed after reload within same load');
  console.log('ok  post-reload session stable:', d.stem1.slice(0, 80));

  const fatal = pageErrors.filter((e) => !/ResizeObserver|favicon/i.test(e));
  assert.equal(fatal.length, 0, `page errors: ${fatal.slice(0, 3).join(' | ')}`);
  console.log('ok  no page errors');

  await page.screenshot({ path: '.cursor/e2e-vocab-session-lock.png' });
  console.log('ok  screenshot .cursor/e2e-vocab-session-lock.png');

  await browser.close();
  console.log('\nPlaywright vocab session-lock E2E PASSED.');
}

run().catch((e) => {
  console.error('E2E FAILED:', e.message || e);
  process.exit(1);
});
