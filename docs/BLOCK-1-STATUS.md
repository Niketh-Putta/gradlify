# Block 1 funnel — status
**Updated:** 2026-06-05 (agent)

## Done in codebase (ready to deploy)

| # | Item | Files |
|---|------|-------|
| 1 | 11+ onboarding completion (schools/GL, not GCSE grades gate) | `src/lib/onboardingCompletion.ts`, `src/components/Layout.tsx` |
| 2 | Live mock price **£10** (UI + Stripe inline fallback) | `src/pages/LiveMockExams.tsx`, `supabase/functions/create-live-mock-payment/index.ts` |
| 3 | **Start free practice** CTA on 11+ landing nav | `src/components/LandingPage.tsx` |
| 4 | **`?ref=` partner banner** on landing | `src/lib/partnerRefs.ts`, `src/components/LandingPage.tsx` |
| 5 | **Post-mock parent report** (score, weak topics, CTAs) | `PostMockParentReport.tsx`, `MockExamPage.tsx`, `LiveMockAnalytics.tsx` |
| 6 | Honest mock copy (**1 mock/day** for free) | `Auth.tsx`, `MockUsageCard.tsx`, `GuestLoginPrompt.tsx`, etc. |
| 7 | Exam readiness flag on for 11+ track | `src/lib/featureFlags.ts` |
| 8 | `.env.example` documents `VITE_APP_TRACK=11PLUS` | `.env.example` |
| 9 | Production build passes | `npm run build` ✓ |

## You must do manually (cannot be done from code alone)

| # | Item | Action |
|---|------|--------|
| A | **Deploy** these changes | Push + Vercel production deploy |
| B | **Vercel env** `VITE_APP_TRACK=11PLUS` | Dashboard → Settings → Environment Variables → Production (if not already set) |
| C | **Stripe live mock price £10** | Stripe Dashboard: create £10 Price OR update `LIVE_MOCK_PRICE_ID_LIVE` secret in Supabase edge functions |
| D | **Redeploy edge function** `create-live-mock-payment` | `supabase functions deploy create-live-mock-payment` (after Stripe price aligned) |
| E | **30-min E2E test** | New email → signup → 11+ onboarding → mock → parent report → upgrade button |
| F | **Partner call bookings** | Block 2 — voice-first (see `GRADLIFY-ACTION-SEQUENCE.md`) |

## Quick test URLs after deploy

- Landing + ref: `https://gradlify.com/11-plus?ref=PRLC` → should show “Recommended by Pinner Road Learning Centre”
- Live mock: `https://gradlify.com/live-mock-exams` → should show **£10**
- Mock results: complete any mock → “For parents” card with weak topics
