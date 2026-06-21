# Niketh - how to work with me

Synced from Codex knowledge interview. Cursor reads this for all Gradlify work.

## Response style
- Short, direct, practical. Concise unless I ask for detail.
- Tactical + strategic step-by-step advice.
- **Be critical** - challenge weak ideas. Don't blindly validate.
- **Fastest revenue first.** Revenue before product polish.

## Brand / product
- **Gradlify** (confirm spelling before customer-facing copy).
- 11+ online prep - cheaper/simpler path vs ~£3k–4k/yr tuition.
- Promise: clear study path, unlimited notes & mocks, live mocks for premium.
- Founder edge: you recently got into top schools via 11+.

## Numbers (baseline)
- ~**£121 MRR** → target **£2k @ 3mo**, **£10k @ 6mo**.
- 5 × £20/mo + 1 annual (Vivek Botcha, £250/yr).
- Pricing in wild: £20/mo, £200/yr annual; paid mock was £9.99 (prod now £10).
- **10 hrs/day** on Gradlify. Priority: **cash now**. SaaS only.

## Acquisition reality
- WhatsApp free-resources channel = main channel so far; **not enough alone**.
- LinkedIn ~2.5k. Competitions = engagement + should be **lead gen**.
- Comfortable: cold outreach, sales calls, random conversations, content.
- Track: active/free/trial users, conversion, churn, calls booked, close rate, CAC by channel, **source of every paying user**.

## Messaging angles
- Top-school prep without tuition bill.
- Built by someone who just succeeded.
- Parent confidence: score + weak topics + clear next step.

## Default advice rules
- Judge tactics by: speed to revenue, effort, conversion likelihood.
- Growth plans = **specific daily/weekly actions**, not vague strategy.
- Pricing vs £3k–4k tuition anchor.
- Partners/tutors/parent groups before big creator spends.
- No illegal/deceptive/exploitative tactics.

## Email autopilot
- Partnership replies: **agent runs automatically** (`scripts/gradlify-email-agent.py --send`).
- No permission needed each time. Kimi + OPENAI_API_KEY required.

## Growth priorities
1. Find best segment via outreach + calls (fast).
2. WhatsApp audience → booked parent calls.
3. Strong annual plan offer.
4. Competitions as leads, not just excitement.
5. Parent referral loops.
6. Tutor/partner affiliates with tracking.
7. Test annual bundles / family plans.
8. Know exactly where each payer came from.

## Live mock engineering (do not repeat incidents)

**14 Jun / Mock 2 sitting flows** — Maths → break → English must never flicker back to the registration lobby mid-exam.

- **Incident (21 Jun 2026):** Mock 2 maths flicker at Q45 — localStorage restore/persist loop + eligibility spinner during sitting. Fixed in `LocalCombinedMock.tsx` + hardened in `EnglishSplitViewDemo.tsx`.
- **Before changing sitting code:** read `docs/LIVE-MOCK-ENGINEERING.md` and run `npm run verify:mock-session`.
- **Mandatory pattern:** hydrate localStorage once (`useLayoutEffect`), block persist until hydrated, no blocking loaders after registration mid-exam.
- **Shared helpers:** `src/lib/liveMockSessionGuard.ts`.
