# Distribution plan — 8 to 14 June 2026

**Partners are parked.** Sassy (do not contact). David + Chris: slots sent, no reply — no more chase until they inbound. Cecile: only act if she messages about login. Sandra/MTM: off if same as Sassy.

**Gap:** 22 enrolled → target 50 = **28 more registrations**. Partners will not deliver in 6 days. Distribution must come from Level Field + DMs + subscriber forwards + FB.

---

## How Level Field actually converts (read this)

- ~450 real 11+ parents; **only you post**; parents **do not reply in the group**.
- They already know sprint, Premium, free resources. **Do not re-launch.**
- Conversion = **DMs** after they see a post + **forwards** to year-group chats.
- **3 LEVELFIELD promo spots left** (live API) — use `mock-spots-reminder.txt`, not generic urgency.

---

## Step 0 — 5 minutes (before any send)

1. Open The Level Field → scroll your last 10 messages.
2. **If poster PNG + `mock-gc-caption.txt` already sent:** go to **Day 1 Level Field** below.
3. **If not sent:** run `outreach/wa/HOW-TO-SEND-MOCK-GC.md` once (voice → poster+caption → 2 min → forward ask).
4. Write result in `outreach/sent-ledger.json` → `mock_poster` = `sent` or `not_sent`.

---

## Day 1 (today) — warm network only

### A. Four paying subscribers (personal WA, not email)

You have **4 reachable emails** in metrics. Message each on **WhatsApp** (find via WA contact search or signup phone if you have it):

| Who | Why |
|-----|-----|
| pavan.nov14@gmail.com | eleven_plus monthly |
| vineela.angel@gmail.com | eleven_plus monthly |
| harinishuj@gmail.com | eleven_plus monthly |
| vivek.botcha@gmail.com | annual — highest trust |

**Copy:** `outreach/distribution/paying-subs-referral.txt`

**Ask two things only:**
1. "Name **one family** doing 11+ I should message."
2. "Which **year-group WhatsApp** are you in?"

When they answer → DM them `mock-forward-for-parents.txt` + poster PNG to forward themselves. **You do not post in their GC** unless they add you.

### B. Two trialing (skip rekha — cancel scheduled)

| Who | Action |
|-----|--------|
| hhspk@yahoo.com | WA: trial active, Premium includes Sunday mock free — register today + forward ask |
| avikvara4@gmail.com | Same |

Script base: `outreach/wa/dm-premium.txt` + link `gradlify.com/live-mock-exams?ref=LEVELFIELD`

### C. Level Field (one message only)

**If poster already sent:** paste `outreach/wa/mock-spots-reminder.txt` (3 spots left is true).

**If poster not sent:** full viral sequence — do not also send spots reminder same day.

### D. WA DM inbox — 90 minutes

Open WhatsApp → **Level Field DMs** + **Gradlify contact DMs**. Sort unread.

| Tag | Script |
|-----|--------|
| score | Name weak topic + one practice link |
| PREMIUM | `outreach/wa/dm-premium.txt` |
| price | `outreach/wa/dm-too-expensive.txt` |
| mock | `outreach/wa/mock-forward-for-parents.txt` |

Log every row in `outreach/parent-conversion-tracker.csv`.

**This is your highest-ROI hour.** Group posts create awareness; DMs close.

---

## Day 2 — forwards + Facebook

### A. Follow up paying subs who did not reply

One bump: "No pressure — even one name of a family in Y5 helps."

### B. Personal WhatsApp groups (you must name them)

Repo does not know your group names. **You** add to `sent-ledger.json`:

```json
"personal_gcs": ["Group name 1", "Group name 2"]
```

Post only where **you are a member** and **parents post too** (not announce-only school channels unless admin).

**Copy:** `outreach/distribution/personal-gc-post.txt` + poster PNG.

**Do not** post in random school groups where you're a silent member — low trust, admin delete.

### C. Facebook — 2 groups today

Join if needed, then:

| Group search term | Post |
|-------------------|------|
| `Barnet grammar schools 11+` | Post C from `outreach/fb/7-day-reminder-posts.md` (ask permission in comments first) |
| `11 plus preparation UK` | Post A |

**30 min:** comment helpfully on one "11+ resources" thread before posting.

---

## Day 3 (10 Jun) — second wave

- Level Field: `mock-weekend-reminder.txt` if Sat evening fits calendar.
- FB: `Kent 11 plus` + `Bexley 11 plus` — Post C.
- DM anyone who reacted to Day 1 Level Field post (heart/like) — personal "want the link?"

---

## Day 4 (11 Jun) — referral harvest

- Message **named families** from paying sub replies (Day 1) with direct link + LEVELFIELD.
- Second FB: `Year 5 11 plus` — Post B (shorter).
- Trialing: if trial ends before 14 Jun, call hhspk/avikvara4 — voice closes.

---

## Day 5 (12 Jun) — 3-day reminder

- Level Field: `outreach/mock-day/13-jun-reminder.txt`
- DM all enrolled (22) who are not Premium: "check login before Sunday"

---

## Day 6 (13 Jun) — final push

- Level Field: short text only — "Tomorrow 4pm, link in previous message, check you're registered"
- DM sweep any PREMIUM/score backlog

---

## What NOT to do (wastes time)

- Email Chris, David, Cecile, Sassy/Sandra again
- Cold wave 1/2 follow-ups (10 sent, 0 replies — wait 2 weeks)
- Poll or sprint relaunch in Level Field
- Post in FB groups you haven't joined / read rules
- Assume 22 enrolled = need 28 paid — Premium subs count; need **registrations**, mix of paid + Premium free

---

## Success metrics by 14 Jun

| Metric | Now | Target |
|--------|-----|--------|
| Mock enrolled | 22 | 50 |
| Paying sub forward DMs sent | 0 | 4/4 |
| Personal GC posts | 0 | 2+ named groups |
| FB groups posted | 0 | 4+ |
| DM replies logged | 0 | every unread cleared |
