# Cloud Codex handoff — Block 1 deploy + verify
**Paste this entire prompt into Cloud Codex.**

---

## PROMPT START (copy below this line)

You are finishing **Gradlify Block 1 funnel** work. Cursor already implemented the code; `npm run build` passes locally. Your job: **deploy, configure production, verify, report back to Niketh.**

### Repo context
- Path: Gradlify 11+ app (Vite + React + Supabase + Stripe + Vercel)
- Product: gradlify.com/11-plus — UK 11+ prep SaaS
- Block 1 goal: fix funnel before marketing push (14 June live mock)

### Already done in working tree (DO NOT re-implement unless broken)

| Change | Key files |
|--------|-----------|
| 11+ onboarding gate (not GCSE fields) | `src/lib/onboardingCompletion.ts`, `src/components/Layout.tsx` |
| Live mock **£10** UI | `src/pages/LiveMockExams.tsx` |
| Stripe inline fallback **1000 pence** | `supabase/functions/create-live-mock-payment/index.ts` |
| Landing **Start free practice** CTA | `src/components/LandingPage.tsx` |
| Partner `?ref=` banner | `src/lib/partnerRefs.ts`, `LandingPage.tsx` |
| Post-mock parent report | `PostMockParentReport.tsx`, `MockExamPage.tsx`, `LiveMockAnalytics.tsx` |
| Honest copy: 1 mock/day (not 2) | `Auth.tsx`, `MockUsageCard.tsx`, etc. |
| Exam readiness on 11+ | `src/lib/featureFlags.ts` |
| Env docs | `.env.example` |
| Pending migration | `supabase/migrations/20260605213000_live_mock_paid_subscriber_access.sql` |

Docs: `docs/BLOCK-1-STATUS.md`, `docs/GRADLIFY-ACTION-SEQUENCE.md`

### Your tasks (in order)

#### 1. Review diff
```bash
git status
git diff
npm run build
```
Fix only if build fails. Do not scope-creep.

#### 2. Commit Block 1 funnel (if Niketh wants it committed — default: yes for deploy)
```bash
git add \
  .env.example \
  src/lib/onboardingCompletion.ts \
  src/lib/partnerRefs.ts \
  src/lib/featureFlags.ts \
  src/components/PostMockParentReport.tsx \
  src/components/LandingPage.tsx \
  src/components/Layout.tsx \
  src/components/OnboardingModal.tsx \
  src/components/MockUsageCard.tsx \
  src/components/GuestLoginPrompt.tsx \
  src/components/TrialCompleteModal.tsx \
  src/pages/LiveMockExams.tsx \
  src/pages/MockExamPage.tsx \
  src/pages/LiveMockAnalytics.tsx \
  src/pages/MockExamsImproved.tsx \
  src/pages/Auth.tsx \
  supabase/functions/create-live-mock-payment/index.ts \
  supabase/migrations/20260605213000_live_mock_paid_subscriber_access.sql \
  docs/BLOCK-1-STATUS.md \
  docs/CODEX-CLOUD-HANDOFF.md

git commit -m "$(cat <<'EOF'
Fix 11+ funnel before mock marketing push.

Parents need proof (post-mock report), honest mock limits, partner ref tracking, and 11+ onboarding — not GCSE gates or £9.99 live mock drift.
EOF
)"
```

Do **not** commit: video files, `scripts/ultra-stripe-secrets.env`, unrelated outreach assets unless Niketh asks.

#### 3. Vercel production env
Confirm or set on **Production**:
```
VITE_APP_TRACK=11PLUS
VITE_EXAM_READINESS_ENABLED=true
```
Use `vercel env ls` / dashboard. Pull not required if already set.

#### 4. Stripe live mock = £10
- In Stripe **Live** mode: Product "Gradlify 11+ Live Mock" → create **new Price £10.00 GBP** one-time (do not edit old Price objects).
- Update Supabase edge function secret:
  - `LIVE_MOCK_PRICE_ID_LIVE` = new price_xxx
- If test mode used locally: `LIVE_MOCK_PRICE_ID_TEST` similarly.

Verify `create-live-mock-payment` uses price ID when set; inline fallback is already 1000 pence.

#### 5. Supabase
```bash
supabase db push   # applies 20260605213000_live_mock_paid_subscriber_access.sql if not applied
supabase functions deploy create-live-mock-payment
```

#### 6. Deploy frontend
Push branch → trigger Vercel production deploy (or `vercel --prod` if linked).

#### 7. Production smoke test (report results)
| Test | URL / action | Pass? |
|------|----------------|-------|
| Partner banner | `https://gradlify.com/11-plus?ref=PRLC` shows "Recommended by Pinner Road Learning Centre" | |
| Signup CTA | /11-plus nav has "Start free practice" | |
| Live mock price | /live-mock-exams shows **£10** | |
| Onboarding | New account → 11+ schools/GL steps (not GCSE grades) | |
| Parent report | Complete a mock → "For parents" card + weak topics + CTAs | |
| Checkout | Live mock registration opens Stripe at **£10** | |

#### 8. Email Niketh summary
Send to **niketh13putta@gmail.com**:
- What you deployed
- Stripe price ID used
- Smoke test pass/fail per row
- Anything blocked (needs Niketh login)

### Do NOT do in this task
- Partner outreach emails (Block 2 — voice calls)
- New features beyond Block 1
- Force push main

## PROMPT END
