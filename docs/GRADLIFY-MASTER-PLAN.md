# Gradlify Master Plan
## Phases · creators · £10K MRR · print & tick

**Owner:** Niketh · **Site:** gradlify.com/11-plus  
**Baseline:** 6 subs · ~£121 MRR · 14 June live mock  
**North star:** **£10,000 MRR** (~500 subs) by **31 Dec 2026**  
**Work rate:** 10 hrs/day  

**Related files:**
- `GRADLIFY-FAST-TRACK-10K.md` - daily schedule + viral content  
- `GRADLIFY-GROWTH-PROGRAM.md` - FB posts + mock ops copy  
- `scripts/11plus-creator-outreach.csv` - contact list  
- `scripts/11plus-outreach-emails.md` - email templates  

---

## How the three growth engines work together

```
YOU (content)     →  TikTok/Reels/Shorts  →  cold parents
LIVE MOCKS        →  events + urgency     →  warm parents  
CREATORS (partners) →  borrowed trust     →  qualified parents
         ↓                    ↓                      ↓
              gradlify.com/11-plus?ref=NAME
                         ↓
              trial → post-mock score → £19.99/mo
```

**Rule:** Never send creator traffic until **Phase 1** is done (funnel + `?ref=` tracking). One viral creator send to a broken funnel wastes the relationship forever.

---

## Revenue targets (with creator mix)

| Date | Subs | MRR | Creator partners LIVE | Expected subs from partners (cumulative) |
|------|------|-----|----------------------|----------------------------------------|
| Now | 6 | £121 | 0 | 0 |
| 30 Jun | **25** | **~£500** | 2–3 signed | 5–8 |
| 31 Jul | **75** | **~£1,500** | 8 live | 25–35 |
| 31 Aug | **150** | **~£3,000** | 15 live | 60–80 |
| 31 Oct | **300** | **~£6,000** | 25 live | 150–180 |
| 31 Dec | **500** | **~£10,000** | 35+ live | 250–300 |

**Partner math:** One mid-size creator (20K–40K YT, 5K–15K views/video) with a **good fit post** can drive **30–80 trials** and **8–25 paid subs** if your funnel converts. **15 active partners** = serious MRR engine.

---

# Partnership playbook (read once)

## Three deal types - match creator to deal

| Type | Best for | You offer | They do | Target cost |
|------|----------|-----------|---------|-------------|
| **A - Affiliate** | Platforms (11 Plus Hub), tutors, email lists | **25% of first 3 months** (£15 total per sub) or **£10 flat per paid signup** | Link in member email, site, lesson notes | Low risk, scale to 30 partners |
| **B - Sponsored integration** | YouTubers (Mathsaurus, TD, Kin) | **£200–800** + affiliate on top OR pure affiliate if small | 60–90 sec mid-roll, description link, optional dedicated short | Pay when you have £500+ MRR cash buffer |
| **C - Co-branded mock** | Any creator with engaged parents | Free Premium for their audience + **rev share** on conversions | “[Creator] x Gradlify live mock” - they promote, you run | Best for rapid trust - **use 14 Jun + July mock** |

**Do not lead with:** CPM guarantees, upfront %, video count, your age, or full pricing in cold email. **Lead with:** 10-min call OR “try it + affiliate link.”

## Partner infrastructure (build in Phase 1)

| Item | Spec |
|------|------|
| Link format | `https://gradlify.com/11-plus?ref=CREATORCODE` |
| Codes | `MATHSAURUS`, `TDTUTORING`, `KINLEARNING`, `GEEKSCHOOL`, `11PLUSHUB`, etc. |
| Tracking | Google Sheet: Partner \| Code \| Clicks \| Trials \| Paid \| £ owed |
| Landing | Line on page: “Recommended by [Creator]” when `?ref=` present |
| Creator kit | 1-page PDF: 3 screenshots, demo link, talking points, their code |

---

## Creator tiers - who to approach when

### Tier 1 - Priority (Wave 1: June–July)
*Active YouTube, solo, right audience size*

| # | Name | Email | Deal type | `ref` code |
|---|------|-------|-----------|------------|
| 1 | Kevin Olding (Mathsaurus) | hello@mathsaurus.com | B or C | MATHSAURUS |
| 2 | TD Tutoring | teachsleeprepeatpod@gmail.com | B or C | TDTUTORING |
| 3 | Kin Learning | contact@kinlearning.com | A or C | KINLEARNING |
| 4 | Joycellyn Akuffo (Geek School) | info@geekschool.co.uk | A or C | GEEKSCHOOL |
| 5 | Robert Lomax | robert@rsleducational.co.uk | A or B | EASY11PLUS |

### Tier 2 - Wave 2 (July–August)

| # | Name | Email | Deal type | `ref` code |
|---|------|-------|-----------|------------|
| 6 | Lucy Kennedy (11+ English Club) | hello@elevenplusenglishclub.co.uk | A + Calendly call | ENGLISHCLUB |
| 7 | Sabah Hadi (11 Plus Journey) | sabah@the11plusjourney.co.uk | A (Skool community) | JOURNEY11 |
| 8 | Study Hat | support@studyhat.com | A or B | STUDYHAT |
| 9 | Emily Kendall | office.plusopedia@gmail.com | A | EMILYK11 |
| 10 | The Exam Coach | teamkeen@theexamcoach.tv | B | EXAMCOACH |
| 11 | 11 Plus Tutors Essex | Form only | C (co-mock) | ESSEX11 |

### Tier 3 - Platform / special (parallel)

| # | Name | Email | Deal type | Notes |
|---|------|-------|-----------|-------|
| P1 | Mr O (11 Plus Hub) | info@11plushub.com | **A only** | Member email / site - not video CPM |
| P2 | Rush Resources | enquiries@rushresources.co.uk | A | Paper brand - bundle with mocks |

### Tier 4 - Harder contact (August+)

| # | Name | Contact | Notes |
|---|------|---------|-------|
| 12 | Lessonade | Facebook Messenger | No email |
| 13 | Star's Channel | YouTube comment | Parent vlogger |
| 14 | Tamima | YouTube DM | Weak 11+ fit |

### Do NOT pursue (wrong shape)
Atom Learning, Pi Academy, Bond, CGP, CareerVidz - too big or B2B; not solo promo deals.

---

# PHASE 0 - Launch week (14 June mock)
**Dates:** Now → 20 June 2026  
**Subs target:** 6 → **25** · **MRR ~£500**  
**Partners target:** **3 conversations**, **1 signed** (affiliate or co-mock)

## 0A - Product (do first, 1–2 days)

- [ ] Align live mock price (**£10** everywhere)  
- [ ] Fix **1 mock/day** copy (not 2)  
- [ ] `VITE_APP_TRACK=11PLUS` in production  
- [ ] Partner sheet + `?ref=` codes ready  
- [ ] Test: stranger signup → mock → paywall  

## 0B - 14 June mock (your event)

- [ ] Enroll **50+** (stretch 100)  
- [ ] Post in **10** Facebook groups (see GROWTH-PROGRAM)  
- [ ] **2 TikToks/day** until 14 June  
- [ ] Post-mock message to **100%** within 12h  

## 0C - Creator Wave 0 (soft outreach only)

**Goal:** 5 emails, 2 replies - **do not promise paid spend yet**

| Day | Send to | Subject |
|-----|---------|---------|
| 1 | Kevin (Mathsaurus) | Quick call about a collab? |
| 2 | TD Tutoring | Quick call about a collab? |
| 3 | Kin Learning | Quick call about a collab? |
| 4 | Geek School | Quick call about a collab? |
| 5 | David (11 Plus Hub) | Re: partnership outline |

**Co-mock pitch (if they reply):**
```
We're running live 11+ mocks (50+ families on the last one). 
Would you be open to a co-branded mock - your audience gets priority slots, 
you get £X per paid signup or rev share? 10-min call to align.
```

- [ ] 5 Tier-1 emails sent  
- [ ] David follow-up sent (affiliate outline + call)  
- [ ] Sheet: log every reply  

**Phase 0 done when:** 25 subs OR £500 MRR path clear + 1 partner agreed in principle.

---

# PHASE 1 - Funnel + partner kit
**Dates:** 21–30 June 2026  
**Subs target:** **25** steady · **MRR ~£500**  
**Partners target:** **3 signed**, **1 live** with link  

## Build

- [ ] **Post-first-mock parent screen** (score + weak topic + CTA)  
- [ ] Landing: **“Recommended by [ref]”** dynamic line  
- [ ] **Tuition vs Gradlify** comparison page  
- [ ] **2-min demo video** (for creators to preview)  
- [ ] **Creator kit PDF** (screenshots, codes, 3 bullet talking points)  
- [ ] Nav **“Start practising free”** on 11+ landing  

## Creator actions

| Action | Target |
|--------|--------|
| Follow-up every Phase 0 reply | 100% within 48h |
| Send **creator kit** to anyone who said yes | 3 kits |
| First **affiliate-only** partner live | 1 link in description or email |
| Book **July co-mock** with best reply | 1 date locked |

**Email - send kit after call:**
```
Thanks for the chat. Here's everything for your audience:

Link: gradlify.com/11-plus?ref=YOURCODE
Demo: [VIDEO]
Creator kit: [PDF]

Offer for your followers: 3-day Premium trial + [optional: free July mock slot]

We'll track signups on our side and pay [25% of 3 months / £10 per paid signup] monthly.
```

- [ ] Creator kit PDF done  
- [ ] 1 partner link LIVE  
- [ ] 10 trials from `?ref=` tracked  

**Phase 1 done when:** 1 partner driving traffic + post-mock screen shipped.

---

# PHASE 2 - Creator Wave 1 goes live
**Dates:** 1–31 July 2026  
**Subs target:** **75** · **MRR ~£1,500**  
**Partners target:** **8 signed**, **5 live**  

## Your content (daily - see FAST-TRACK)

- [ ] 2 TikTok + 2 Reels / day  
- [ ] 1 YouTube Short / day  
- [ ] **July co-mock** with partner name in title (target **30+ paid £10**)  

## Creator outreach schedule (10 emails/week)

| Week | New outreach | Follow-ups | Go-live |
|------|--------------|------------|---------|
| Jul W1 | Robert, Lucy | Mathsaurus, TD, Kin | Partner #1 posts |
| Jul W2 | Sabah, Study Hat | Geek School | Partner #2 posts |
| Jul W3 | Emily, Exam Coach | Lucy, Robert | Co-mock #2 |
| Jul W4 | Essex form, Rush | All warm leads | 5 links live |

## Deal escalation (when MRR > £500)

| Creator size | Offer |
|--------------|-------|
| <5K subs / email list | Affiliate only (25% × 3 mo) |
| 5K–40K YT | **£300–500** sponsored mention + affiliate |
| Platform (11 Plus Hub) | Affiliate + free Premium for members trial month |

**Sponsored video brief (when paying):**
```
60–90 sec: you try a mock on screen → show split-view English → 
your honest take → link gradlify.com/11-plus?ref=CODE + 
"3-day free trial for my audience"
```

- [ ] 8 partners contacted (cumulative Tier 1+2)  
- [ ] 5 `?ref=` links live  
- [ ] **+50 net new subs** in July  
- [ ] **£1,500 MRR**  

**Phase 2 done when:** ≥30 paid subs came from `?ref=` total (all time).

---

# PHASE 3 - Scale creators + paid ads test
**Dates:** 1–31 August 2026  
**Subs target:** **150** · **MRR ~£3,000**  
**Partners target:** **15 live**, **3 paid integrations**  

## Creator

- [ ] **Wave 3:** Lessonade FB, Star's Channel, Tamima  
- [ ] **Repeat winners:** 2nd post from best-converting partner  
- [ ] **Tutor grid:** 30 local tutors on affiliate (20% × 3 mo) - maps search + email  
- [ ] Monthly **partner newsletter:** mock dates, new features, leaderboard stats  

## Paid ads (start if trial→paid ≥ 25%)

- [ ] Meta **£50/day** - UK parents 35–50, interests: 11 plus, grammar school, Bond  
- [ ] Creative: your best TikTok + “Recommended by [creator]” social proof  
- [ ] Kill ad if CAC > **£50** after £200 spend  

## Weekly mock

- [ ] **1 live mock/week** or **2 big mocks/month** - always invite partners to co-brand  

- [ ] 150 subs · £3K MRR  
- [ ] 15 partner links  
- [ ] CAC known (organic vs partner vs paid)  

---

# PHASE 4 - Partnership machine
**Dates:** Sep–Oct 2026  
**Subs target:** **300** · **MRR ~£6,000**  
**Partners target:** **25 live**  

- [ ] Hire VA or use sheet - **partner payouts monthly** (don't delay; trust dies)  
- [ ] **Tiered partner program:** Bronze (affiliate) / Silver (co-mock) / Gold (£500+ integrated)  
- [ ] **Case study** from best partner: “X trials, Y paid” - use to close next 10  
- [ ] Approach **2nd-tier YouTubers** with proof: “Mathsaurus drove X signups”  
- [ ] **£100/day** Meta if CAC < £40  

- [ ] 300 subs · £6K MRR  
- [ ] Partners = **40%+** of new subs that month  

---

# PHASE 5 - £10K MRR
**Dates:** Nov–Dec 2026  
**Subs target:** **500** · **MRR ~£10,000**  

- [ ] **35+ partners**, top 5 each drive **5+ subs/month**  
- [ ] **Annual plan push** (exam year parents) - 20% choose £199/yr  
- [ ] **January mock marathon** - national event, all partners  
- [ ] Consider **£1K–2K** package: 3 creators same week (bundle audience)  

- [ ] **500 subs · £10K MRR**  

---

# Daily schedule (10 hrs) - with creator block

| Block | Time | Focus |
|-------|------|-------|
| Content | 2h | TikTok, Reels, Shorts |
| **Partners** | **2h** | **Outreach, follow-ups, kit updates, partner DMs** |
| Distribution | 1.5h | FB, WhatsApp |
| Sales | 1.5h | Trials, mocks, creator replies |
| Product | 1.5h | Funnel, landing, tracking |
| Ops | 1h | Mock prep, analytics sheet |
| Plan | 0.5h | Tomorrow's partner list |

**Partnership days (Mon/Wed/Fri):** 3h on creators, 1h content.  
**Content days (Tue/Thu/Sat):** 3h content, 1h partners.

---

# Creator outreach tracker (print)

| # | Name | Emailed | Reply | Call | Deal type | Code | LIVE date | Trials | Paid | £ owed |
|---|------|---------|-------|------|-----------|------|-----------|--------|------|--------|
| 1 | Mathsaurus | | | | | MATHSAURUS | | | | |
| 2 | TD Tutoring | | | | | TDTUTORING | | | | |
| 3 | Kin Learning | | | | | KINLEARNING | | | | |
| 4 | Geek School | | | | | GEEKSCHOOL | | | | |
| 5 | Robert Lomax | | | | | EASY11PLUS | | | | |
| 6 | Lucy Kennedy | | | | | ENGLISHCLUB | | | | |
| 7 | Sabah Hadi | | | | | JOURNEY11 | | | | |
| 8 | Study Hat | | | | | STUDYHAT | | | | |
| 9 | Emily Kendall | | | | | EMILYK11 | | | | |
| 10 | Exam Coach | | | | | EXAMCOACH | | | | |
| 11 | 11 Plus Hub | | | | | 11PLUSHUB | | | | |
| 12 | Essex Tutors | | | | | ESSEX11 | | | | |
| 13 | Rush Resources | | | | | RUSHRES | | | | |

---

# Copy-paste: creator cold email

```
Subject: Quick call about a collab?

Hi [Name],

I'm Niketh, founder of Gradlify (gradlify.com) - 11+ maths and English practice with timed mocks and split-view comprehension.

I've been following [specific: Mathsaurus / your Kent content / 11+ English Club] and think your audience is a strong fit.

We're setting up affiliate partnerships (rev share on paid sign-ups) and co-branded live mocks for UK families. Would you be open to a 10-minute call this week?

Thanks,
Niketh
gradlify.com
```

---

# Copy-paste: after they say yes (before call)

```
Great - here's a 2-min demo so you can see the product before we chat: [LINK]

On the call we'll cover:
1. What your audience gets (trial + optional live mock slot)
2. Simple tracking link (?ref=YOURNAME)
3. Rev share or co-branded mock - whatever fits your setup

What times work for a 10-min call?
```

---

# Copy-paste: co-branded mock invite (for creator to forward)

```
[Creator name] x Gradlify - live 11+ mock, [DATE]

Timed exam-style practice for Year 4/5 families preparing for grammar and selective schools.

Gradlify Premium members: free
Everyone else: £10
Register: gradlify.com/11-plus?ref=[CODE]

Run by Gradlify (built by a student who went through the 11+). 
[Creator] recommends this for extra practice between sessions.
```

---

# What to do this week (7 boxes)

1. [ ] Finish **Phase 0A** product fixes  
2. [ ] Fill **14 June mock** to 50+  
3. [ ] Send emails **#1–5** (Mathsaurus → David)  
4. [ ] Create **partner tracking sheet** + codes  
5. [ ] Record **demo video** (even rough)  
6. [ ] Post **2 TikToks** promoting 14 June mock  
7. [ ] Log every reply in tracker table above  

---

# Success rules

1. **Funnel before scale** - no creator send until post-mock screen exists  
2. **Affiliate default** - low risk; paid sponsorship only when MRR > £500  
3. **Co-mock = fastest trust** - creators promote events more easily than “another app”  
4. **Pay partners on time** - manual bank transfer beats fancy software early  
5. **Double down** - 2nd post from whoever drives >15 trials  
6. **Your content + creators** - not either/or; creators need you to look legit when parents check TikTok  

---

*Master Plan v1 - June 2026. Tick phases in order. Speed is allowed; skipping Phase 1 is not.*
