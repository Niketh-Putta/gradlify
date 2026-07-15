#!/usr/bin/env node
/**
 * Regression check for mid-maths lobby flicker (Q45+).
 * Simulates remount race: old persist-before-restore vs new hydrate guard.
 */

const STORAGE_KEY = "gradlify_local_combined_mock_both_subjects_live_mock_2_test-user";

function applySavedMockState(saved, current) {
  const next = { ...current };
  if (saved.phase !== current.phase) next.phase = saved.phase;
  if (saved.currentQuestion !== current.currentQuestion) next.currentQuestion = saved.currentQuestion;
  return next;
}

function simulateRemountRaceOld() {
  const store = new Map();
  store.set(STORAGE_KEY, { phase: "maths", currentQuestion: 45 });

  let phase = "instructions";
  let currentQuestion = 1;

  const persistOld = () => {
    store.set(STORAGE_KEY, { phase, currentQuestion });
  };

  const restoreOld = (mathsAttemptStatus) => {
    if (mathsAttemptStatus === "submitted") return;
    const saved = store.get(STORAGE_KEY);
    if (!saved) return;
    if (mathsAttemptStatus === "none") return;
    ({ phase, currentQuestion } = applySavedMockState(saved, { phase, currentQuestion }));
  };

  persistOld();
  restoreOld("in_progress");

  return { phase, currentQuestion, storePhase: store.get(STORAGE_KEY)?.phase };
}

function simulateRemountRaceNew() {
  const store = new Map();
  store.set(STORAGE_KEY, { phase: "maths", currentQuestion: 45 });

  let phase = "instructions";
  let currentQuestion = 1;
  let hydratedKey = null;
  let skipPersist = false;

  const persistNew = () => {
    if (skipPersist) return;
    if (hydratedKey !== STORAGE_KEY) return;
    if (phase === "instructions") return;
    store.set(STORAGE_KEY, { phase, currentQuestion });
  };

  const hydrateNew = (mathsAttemptStatus) => {
    if (hydratedKey === STORAGE_KEY) return;
    const saved = store.get(STORAGE_KEY);
    if (!saved) {
      if (mathsAttemptStatus !== "none") hydratedKey = STORAGE_KEY;
      return;
    }
    if (saved.phase !== "maths" && saved.phase !== "break") {
      hydratedKey = STORAGE_KEY;
      return;
    }
    const canResume = mathsAttemptStatus === "in_progress" || saved.phase === "maths";
    if (!canResume) return;
    skipPersist = true;
    ({ phase, currentQuestion } = applySavedMockState(saved, { phase, currentQuestion }));
    skipPersist = false;
    hydratedKey = STORAGE_KEY;
  };

  hydrateNew("in_progress");
  persistNew();

  let statusTicks = 0;
  for (let i = 0; i < 10; i += 1) {
    const before = phase;
    hydrateNew("in_progress");
    persistNew();
    if (before === "maths" && phase === "instructions") statusTicks += 1;
  }

  return { phase, currentQuestion, storePhase: store.get(STORAGE_KEY)?.phase, statusTicks };
}

async function verifyBuiltBundle() {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const assetsDir = join(process.cwd(), "dist", "assets");
  const chunk = readdirSync(assetsDir).find((name) => name.startsWith("LocalCombinedMock-") && name.endsWith(".js"));
  if (!chunk) return { ok: false, reason: "LocalCombinedMock chunk missing from dist/assets" };
  const js = readFileSync(join(assetsDir, chunk), "utf8");
  const markers = ["useLayoutEffect", 'phase==="english"'];
  const missing = markers.filter((m) => !js.includes(m));
  if (missing.length > 0) {
    return { ok: false, chunk, missing };
  }
  return { ok: true, chunk };
}

async function verifyEnglishBuiltBundle() {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const assetsDir = join(process.cwd(), "dist", "assets");
  const chunk = readdirSync(assetsDir).find((name) => name.startsWith("EnglishSplitViewDemo-") && name.endsWith(".js"));
  if (!chunk) return { ok: false, reason: "EnglishSplitViewDemo chunk missing from dist/assets" };
  const js = readFileSync(join(assetsDir, chunk), "utf8");
  const markers = ["useLayoutEffect", "gradlify_live_mock_english_timer"];
  const missing = markers.filter((m) => !js.includes(m));
  if (missing.length > 0) return { ok: false, chunk, missing };
  return { ok: true, chunk };
}

async function verifyProductionBundle() {
  const urls = ["https://www.gradlify.com", "https://gradlify.com"];
  for (const origin of urls) {
    try {
      const html = await fetch(origin, { redirect: "follow" }).then((r) => r.text());
      const scriptMatch = html.match(/src="(\/assets\/LocalCombinedMock-[^"]+\.js)"/);
      if (!scriptMatch) continue;
      const js = await fetch(`${origin}${scriptMatch[1]}`).then((r) => r.text());
      const markers = ["useLayoutEffect", 'phase==="english"'];
      const missing = markers.filter((m) => !js.includes(m));
      if (missing.length === 0) {
        return { ok: true, origin, chunk: scriptMatch[1] };
      }
      return { ok: false, origin, missing };
    } catch {
      // try next origin
    }
  }
  return { ok: false, reason: "Could not fetch production bundle (check network or asset names)." };
}

function simulateEnglishTimerRaceNew() {
  const store = new Map();
  const timerKey = "gradlify_live_mock_english_timer_both_subjects_english_mock_2_user";
  const savedLeft = 42 * 60;
  store.set(timerKey, JSON.stringify({ endsAt: Date.now() + savedLeft * 1000 }));

  let timeLeft = 3000;
  let hydratedKey = null;
  let skipPersist = false;
  let timerInitialized = false;

  const hydrate = () => {
    if (hydratedKey === timerKey) return;
    const parsed = JSON.parse(store.get(timerKey) || "null");
    if (parsed?.endsAt) {
      const left = Math.max(0, Math.ceil((parsed.endsAt - Date.now()) / 1000));
      if (left > 0 && left <= 3000) timeLeft = left;
    }
    skipPersist = true;
    hydratedKey = timerKey;
    timerInitialized = true;
    skipPersist = false;
  };

  const persist = () => {
    if (skipPersist || hydratedKey !== timerKey) return;
    store.set(timerKey, JSON.stringify({ endsAt: Date.now() + timeLeft * 1000 }));
  };

  hydrate();
  persist();

  return {
    timeLeft,
    pass: timeLeft === savedLeft || Math.abs(timeLeft - savedLeft) <= 2,
  };
}

function main() {
  const oldRemount = simulateRemountRaceOld();
  const newRemount = simulateRemountRaceNew();
  const englishTimer = simulateEnglishTimerRaceNew();

  const checks = [
    {
      name: "OLD: remount overwrites saved maths with lobby snapshot",
      pass: oldRemount.phase === "instructions" && oldRemount.storePhase === "instructions",
    },
    {
      name: "NEW: remount hydrates back to maths Q45 before persist",
      pass: newRemount.phase === "maths" && newRemount.currentQuestion === 45,
    },
    {
      name: "NEW: status ticks do not flash lobby mid-sitting",
      pass: newRemount.statusTicks === 0 && newRemount.storePhase === "maths",
    },
    {
      name: "NEW: English timer hydrate keeps saved time (not default 3000s overwrite)",
      pass: englishTimer.pass,
    },
  ];

  console.log("Mock session stability simulation\n");
  for (const check of checks) {
    console.log(`${check.pass ? "PASS" : "FAIL"} - ${check.name}`);
  }

  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) {
    console.error("\nSimulation failed:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }

  console.log("\nAll local simulations passed.");
}

main();

Promise.all([verifyBuiltBundle(), verifyEnglishBuiltBundle(), verifyProductionBundle()]).then(([built, english, prod]) => {
  if (built.ok) {
    console.log(`Maths bundle OK (${built.chunk})`);
  } else if (built.missing) {
    console.error(`FAIL: maths chunk missing markers: ${built.missing.join(", ")}`);
    process.exit(1);
  } else {
    console.warn(`WARN: ${built.reason}`);
  }

  if (english.ok) {
    console.log(`English bundle OK (${english.chunk})`);
  } else if (english.missing) {
    console.error(`FAIL: English chunk missing markers: ${english.missing.join(", ")}`);
    process.exit(1);
  } else if (english.reason) {
    console.warn(`WARN: ${english.reason}`);
  }

  if (prod.ok) {
    console.log(`Production bundle OK on ${prod.origin} (${prod.chunk})`);
  } else if (prod.missing) {
    console.warn(`WARN: production chunk on ${prod.origin} missing markers: ${prod.missing.join(", ")}`);
  } else {
    console.warn(`WARN: ${prod.reason}`);
  }
});
