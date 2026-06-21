# Live mock engineering notes

Operational and engineering knowledge for combined live mocks (Maths → break → English). Read before changing sitting flows.

## 2026-06-21 — Mid-exam lobby flicker (Mock 2 maths, ~Q45)

### Symptom
During an active maths sitting, the UI flickered between the **exam paper** and the **registration lobby** (“Mock in progress → Continue mock”). Timer kept running (~49:35 left). Reported on mock 2 sit (`/live-mock-exams/local-preview2/sit`).

### Root cause
A **localStorage restore ↔ persist race** on remount/re-render:

1. Component remounts with default `phase: "instructions"` (lobby).
2. **Persist effect** immediately wrote that lobby snapshot to localStorage.
3. **Restore effect** re-ran on `mathsAttemptStatus` / auth ticks and re-applied storage — sometimes the corrupted lobby snapshot.
4. **Eligibility re-check** set `loading: true` mid-exam → full-page spinner flash.
5. (Earlier) Submitting maths while still on the paper forced `phase: "instructions"` when attempt became `submitted`.

### Fix pattern (mandatory for all live mock sitting state)

Use `src/lib/liveMockSessionGuard.ts` and mirror in any new sitting UI:

| Rule | Why |
|------|-----|
| **Hydrate once** per storage key (`hydratedKeyRef`) | Stop restore loops on status/auth ticks |
| **`useLayoutEffect`** for hydrate | Resume before paint — no lobby flash on reload |
| **Block persist** until hydrated (`skipPersistRef` + `shouldPersistLiveMockSession`) | Default lobby state must never overwrite an in-progress sitting |
| **Silent re-checks** once registered (`eligibilityResolvedRef` / `liveMockRegisteredRef`) | Auth refresh must not show blocking loaders mid-exam |
| **Never set `phase: "instructions"`** while student is on maths/break | Submit saves answers first; only clear storage on lobby |
| **Mark hydrated** on manual start/resume (`startMock`, `continueMock`) | Manual navigation must not fight restore |

### Files touched
- `src/pages/LocalCombinedMock.tsx` — maths + break sitting
- `src/pages/EnglishSplitViewDemo.tsx` — English paper (timer hydrate, gate loader, answer resume)
- `src/lib/liveMockSessionGuard.ts` — shared helpers
- `scripts/verify_mock_session_stability.mjs` — regression simulation

### Commits
- `fa8a0e9` — core maths hydrate/persist guard
- `5cc1fe6` — stop forcing lobby on maths `submitted` mid-sitting
- `825ee74` — layout-effect hydrate + regression script

### Verification
```bash
npm run build
npm run verify:mock-session
```

### Do not repeat
- Separate `useEffect` that **reads and writes the same localStorage key** without a one-time hydrate guard.
- Persisting React **default state** before hydrate runs.
- Full-page **loading gates** that re-trigger on every `user` / auth object change during an exam.

---

## Full mock run-through (student path)

| Step | Route / component | Persistence |
|------|-------------------|-------------|
| Register | `LocalCombinedMock2` / `LocalCombinedMock` lobby | Supabase `live_mock_exam_signups` |
| Sit maths | `LocalCombinedMock` (`phase: maths`) | localStorage + `live_mock_answers` autosave |
| Break | `LocalCombinedMock` (`phase: break`) | localStorage |
| English | `EnglishSplitViewDemo` via session URL | localStorage timer + DB autosave |
| Results | `LiveMockAnalytics` | Supabase attempts (submitted) |

Mock 1 and mock 2 use **separate slugs**, storage keys, and papers — never mix cohorts.

---

## Pre-go-live checklist (sitting flows)

- [ ] `npm run verify:mock-session` passes
- [ ] No duplicate restore effects on attempt status deps without hydrate ref
- [ ] Timer persist blocked until timer hydrated (English)
- [ ] Submit order: answers upsert → attempt `submitted` → phase change
- [ ] Timer expiry auto-submit retries on failed save (maths + English)
