/**
 * Detailed sub-steps for Mission Control (merged into GRADLIFY_PROGRESS at load).
 * Updated by Cursor when playbooks change.
 */
window.GRADLIFY_PLAYBOOK = {
  "b1-8": [
    { type: "action", text: "Use a brand-new email (not your main Gradlify account)." },
    { type: "action", text: "Go to gradlify.com/11-plus and sign up." },
    { type: "check", text: "Complete onboarding.", pass: "You see schools + GL/CEM — not GCSE grades." },
    { type: "action", text: "Start and finish one short mock exam." },
    { type: "check", text: "On the results screen.", pass: "“For parents” card shows score, weak topics, and two CTAs." },
    { type: "action", text: "Click “Practice weak topics free” — confirm it opens practice." },
    { type: "action", text: "Go to gradlify.com/live-mock-exams — confirm price shows £10." },
    { type: "check", text: "Start live mock registration.", pass: "Stripe checkout shows £10.00 (no need to pay)." },
    { type: "check", text: "Optional: open gradlify.com/11-plus?ref=PRLC", pass: "Banner: “Recommended by Pinner Road Learning Centre”." },
    { type: "action", text: "If anything fails → tell Cursor/Codex which step. Pause Block 2 until fixed." },
  ],
  "b2-0": [
    { type: "action", text: "Open Gmail: niketh13putta@gmail.com AND team@gradlify.com (MTM may be there)." },
    { type: "action", text: "Search: from:(mocktestmasters OR elevenplussuccess OR prlcharrow OR thefrenchiemummy OR 11plushub)" },
    { type: "action", text: "Star threads where they replied and you haven’t answered." },
    { type: "action", text: "Open outreach/manual-affiliate-tracker.csv — keep it open to update after each send." },
    { type: "action", text: "Do NOT email Sutton 11 Plus (karentutorsutton@gmail.com)." },
  ],
  "b2-1": [
    { type: "action", text: "Open existing thread with Chris (Re: partner / affiliate)." },
    { type: "message", label: "Send — book call + trial", text: "Hi Chris — easier to explain Gradlify in a quick 10-min call than over email. Are you free [Thu 4pm] or [Fri 11am] this week? I'll send a Meet link. Happy to activate your trial on the call too.\n\nBest,\nNiketh" },
    { type: "action", text: "If no reply in 48h → WhatsApp/call 07771740569 with same ask." },
    { type: "list", title: "Before the call (2 min prep)", items: [
      "Have gradlify.com/11-plus open on your phone",
      "Offer: 30% all payments · code EPS · link gradlify.com/11-plus?ref=EPS",
      "Ask which email they used to sign up (or sign up on the call)",
    ]},
    { type: "script", title: "On the call (10 min)", lines: [
      "Min 0–1: What do parents struggle with — timing, English comp, or knowing if they're on track?",
      "Min 1–3: Gradlify = extra practice between lessons, not replacing tuition. Free start → score + weak topics → some upgrade £19.99/mo.",
      "Min 3–5: Walk through signup or one mock on their phone.",
      "Min 5–7: 30% of every payment through your link — tracked, paid monthly.",
      "Min 7–9: Mention live group mock 14 June for their list.",
      "Min 9–10: I'll email link + caption within an hour.",
    ]},
    { type: "message", label: "After call — send within 1h", text: "Hi Chris,\n\nGreat speaking — here's your partner link:\nhttps://gradlify.com/11-plus?ref=EPS\n\n30% of all payments from families who sign up through your link.\n\nCaption to paste:\n\"Extra 11+ timed practice between sessions — free to start, mocks and weak-topic feedback. We use Gradlify: https://gradlify.com/11-plus?ref=EPS\"\n\nLive group mock Sat 14 June — shout if you want to mention it.\n\nBest,\nNiketh" },
    { type: "action", text: "Activate full access on the email they gave (Supabase/admin)." },
    { type: "action", text: "Tracker: status → live, link filled, date_replied = today." },
  ],
  "b2-2": [
    { type: "action", text: "Open thread with Andy (deck/summary already sent)." },
    { type: "message", label: "Send — book call", text: "Hi Andy — quick 10-min call easier than email back-and-forth. Does [Thu 3pm] or [Fri 10am] work? I'll send a Meet link. We can confirm 30% and I'll make your PRLC link live on the call.\n\nBest,\nNiketh" },
    { type: "list", title: "On the call", items: [
      "Confirm 30% of all referral payments to Pinner Road",
      "Demo gradlify.com/11-plus?ref=PRLC — banner must show centre name",
      "Ask: email parents, WhatsApp, or lesson notes?",
      "Close with 14 June mock mention",
    ]},
    { type: "message", label: "After call", text: "Send https://gradlify.com/11-plus?ref=PRLC + 3-sentence caption. Test ?ref=PRLC in incognito. Tracker → live." },
  ],
  "b2-3": [
    { type: "action", text: "Open thread (affiliate outline + deck sent)." },
    { type: "message", label: "Send — book call", text: "Hi David — placement and terms are quickest on a short call. Are you free [TIME 1] or [TIME 2] this week? I'll send a Meet link.\n\nBest,\nNiketh" },
    { type: "list", title: "On the call", items: [
      "Pick placement: member email / resources page / lesson notes",
      "Affiliate not one-off ad fee — 30% ongoing on paid sign-ups",
      "2-min product demo",
      "He adds one line + link; you send assets same day",
    ]},
    { type: "action", text: "After: email gradlify.com/11-plus?ref=11PLUSHUB + blurb for his site. Tracker → live." },
  ],
  "b2-4": [
    { type: "action", text: "Search BOTH inboxes: from:mocktestmasters OR to:mocktestmasters." },
    { type: "action", text: "Reply in thread where they said interested / free from 3 June." },
    { type: "message", label: "Send — book call", text: "Hi — still keen for a 10-min call to agree referral terms? I'm flexible — [TIME 1] or [TIME 2]? I'll send a Meet link.\n\nGradlify = extra practice between your formal mocks, not competing with what you run.\n\nBest,\nNiketh" },
    { type: "list", title: "On the call", items: [
      "Lead with complement not compete",
      "30% on referrals · code MTM",
      "Ask: mention in post-mock emails or on site?",
    ]},
    { type: "action", text: "After: send gradlify.com/11-plus?ref=MTM + caption. Tracker → live." },
  ],
  "b2-5": [
    { type: "action", text: "Best fix for login = do it on a call." },
    { type: "message", label: "Send — book call", text: "Hi Cecile — easiest if we do a quick 10-min call so I can fix any login issue live and show you the 11+ side. Free [TIME 1] or [TIME 2]? I'll send a Meet link.\n\nBest,\nNiketh" },
    { type: "list", title: "On the call", items: [
      "Ask what she sees when logging in (screenshot or share screen)",
      "Confirm email: thefrenchiemummy@hotmail.com or her preference",
      "Fix access while on call",
      "Walk through mock + parent report — her proof story for a post",
      "Agree 30%, code FRENCHIEMUMMY, one post timing",
    ]},
    { type: "action", text: "If she emails login error first: fix same day + offer call times." },
    { type: "action", text: "After: send gradlify.com/11-plus?ref=FRENCHIEMUMMY + creator caption. Tracker → live." },
  ],
  "b2-6": [
    { type: "script", title: "Universal 10-min call script", lines: [
      "0–1 min: What do your parents struggle with most?",
      "1–3 min: Extra timed practice between lessons — not replacing tuition. Free → score + weak topics → £19.99/mo.",
      "3–5 min: gradlify.com/11-plus on their phone — walk one mock.",
      "5–7 min: 30% of every payment through tracked link. Monthly payout. No upfront cost.",
      "7–9 min: Live mock 14 June — mention to their list?",
      "9–10 min: I'll email link + caption within an hour.",
    ]},
  ],
  "b2-7": [
    { type: "action", text: "Send https://gradlify.com/11-plus?ref=[CODE] in same thread." },
    { type: "action", text: "Send 3-sentence caption they can paste to parents." },
    { type: "action", text: "Mention 14 June live mock if relevant." },
    { type: "action", text: "Update manual-affiliate-tracker.csv: status=live, link, date_replied." },
    { type: "action", text: "Tell Cursor: “Update Mission Control — [Name] call done”." },
  ],
  "b2-8": [
    { type: "action", text: "Gmail → attach manually ~/Downloads/Gradlify-Partner-Overview.pptx" },
    { type: "message", label: "Add after attach", text: "Happy to walk through this on a 10-min call — [TIME 1] or [TIME 2]?" },
    { type: "action", text: "Do NOT negotiate terms in the deck email — goal is still the call." },
  ],
  "b2-9": [
    { type: "action", text: "Only if they replied YES in inbox — do not cold-email again." },
    { type: "list", title: "Partners on final follow-up (check inbox)", items: [
      "Honest Mum → ?ref=HONESTMUM",
      "A Baby on Board → ?ref=BABYONBOARD",
      "Tutor's 11 Plus → ?ref=TUTORS11",
      "Willow Plus → ?ref=WILLOW",
      "Slough Tuition → ?ref=SLOUGHTUITION",
      "Harrow / Academy / Cheebees / Kent → codes in CSV",
    ]},
    { type: "message", label: "If they said yes", text: "Hi [Name],\n\nGreat — here's your partner link:\nhttps://gradlify.com/11-plus?ref=[CODE]\n\n30% of all payments from families who sign up through your link.\n\nPosition as extra practice between lessons, not replacing tuition.\n\nBest,\nNiketh" },
  ],
  "b2-10": [
    { type: "action", text: "Tina (MumFounded): polite close sent — NO chase unless 7+ days silence." },
    { type: "message", label: "Only after 7+ days", text: "Hi Tina — performance-based 30% still an option, or no fit — either way fine. Best, Niketh" },
    { type: "action", text: "Sutton 11 Plus: NEVER contact. Archive thread." },
  ],
  "b3-1": [
    { type: "action", text: "Open Canva or Figma — canvas 1080×1080." },
    { type: "list", title: "Poster copy", items: [
      "Headline: Live 11+ Mock — Saturday 14 June",
      "Sub: Timed exam on screen · Score + feedback after",
      "Price: £10 new families · FREE for Gradlify Premium",
      "Footer: gradlify.com + your WhatsApp number",
      "Visual: screenshot of mock screen (blur any child data)",
    ]},
  ],
  "b3-2": [
    { type: "action", text: "Same copy as poster — canvas 1080×1920 vertical." },
    { type: "action", text: "For WhatsApp Status + IG Story." },
  ],
  "b3-3": [
    { type: "action", text: "Save as outreach/assets/14-june-mock-poster.png and story variant." },
  ],
  "b4-1": [
    { type: "message", label: "1:1 to each paying subscriber", text: "Hi [Name] — I'm running a live 11+ mock on Saturday 14 June on Gradlify.\n\nYou're on Premium so your child is in free. Do you know ONE family doing 11+ I should send the link to?\n\n£10 for new families if they're not on the app yet.\n\nLink: [LIVE MOCK LINK]" },
    { type: "action", text: "Ask each: “Which WhatsApp group are you in? Can I send a poster to forward?”" },
  ],
  "b4-2": [
    { type: "action", text: "Send poster image FIRST — not link only." },
    { type: "message", label: "Then text in GC", text: "Hi everyone — sharing in case useful for Y4/5 11+ prep.\n\nLive timed mock this Saturday 14 June. Exam-style on screen, score afterwards.\n\n£10 if not on Gradlify yet · free for Premium members.\n\nNot replacing tuition — extra practice between sessions. I'm Niketh, built this after doing the 11+ myself.\n\nLink: [LIVE MOCK LINK]" },
  ],
  "b4-3": [
    { type: "action", text: "Ask 1 £10 mock buyer + any warm parent to forward poster." },
    { type: "check", text: "Goal", pass: "3 forwards into GCs you can't access yourself." },
  ],
  "b5-1": [
    { type: "list", title: "Search Facebook and request join", items: [
      "11 plus preparation UK",
      "11+ exam parents",
      "Kent 11 plus",
      "Bexley 11 plus",
      "Barnet grammar schools 11+",
      "grammar school preparation",
      "Year 5 11 plus",
    ]},
    { type: "action", text: "While waiting: read last 10 posts per group. Note rules (many ban links first)." },
  ],
  "b5-2": [
    { type: "action", text: "Per group: comment helpfully on 2 existing threads first." },
    { type: "action", text: "Example comment: “we use timed mocks for…” — no link yet." },
  ],
  "b5-3": [
    { type: "message", label: "First post (after approved)", text: "We're running a live 11+ style mock on Saturday 14 June (timed, on screen).\n\nI'm Niketh — built Gradlify after going through 11+ myself.\n\n£10 for non-members · free for Gradlify Premium. Score + feedback after.\n\nIf useful for Y4/5: [LINK]\n\nHappy to answer GL-style format questions." },
  ],
  "b5-4": [
    { type: "message", label: "Reminder ~7 June", text: "Reminder — live 11+ mock this Saturday 14 June.\n\nA few slots left. £10 new families / free for Premium.\nRegister: [LINK]" },
  ],
  "b6-1": [
    { type: "action", text: "WhatsApp GC reminder + poster again." },
    { type: "action", text: "Text 5 enrolled parents: “Check login/payment tonight.”" },
    { type: "check", text: "Tech test", pass: "Payment → session link works end-to-end." },
  ],
  "b6-2": [
    { type: "action", text: "Run the live mock." },
    { type: "action", text: "Track every attendee: Name | Email | Score | Weak topics 1–3 | Follow-up sent?" },
  ],
  "b6-3": [
    { type: "message", label: "Within 24h — every attendee", text: "Hi — thanks for sitting Saturday's mock.\n\n[Child] scored [X/Y] — strongest: [topic]. Main gap: [topic].\n\n15 min on [weak topic] this week: [PRACTICE LINK]\n\nUnlimited mocks + tracking = £19.99/mo, 3-day trial: [LINK]\n\nReply if you want help picking what to practice next." },
  ],
  "b6-4": [
    { type: "action", text: "Voice note or call to 3 hottest leads (most engaged / highest anxiety)." },
    { type: "check", text: "Target by 20 June", pass: "3 new £19.99/mo subs from mock attendees." },
  ],
};
