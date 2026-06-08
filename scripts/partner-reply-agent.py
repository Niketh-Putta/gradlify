#!/usr/bin/env python3
"""Scan partner Gmail threads via Kimi, classify replies, auto-respond, update sent-ledger."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from kimi_gmail_lib import (
    click_reply,
    click_send,
    fill_body,
    list_inbox,
    open_row_by_index,
    open_thread,
    read_current_thread,
    send_reply_on_open_thread,
    verify_compose,
)

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(__file__).resolve().parent / "partner_config.json"
STATE_PATH = ROOT / "outreach" / "partner-reply-state.json"
LOG_PATH = ROOT / "outreach" / "partner-reply-log.jsonl"
FEED_PATH = ROOT / "progress" / "live-feed.js"
AUTO_DIR = ROOT / "outreach" / "partner-auto"

MEET_PLACEHOLDER = "[ADD MEET LINK - confirm in Google Calendar, then paste]"

CLASSIFIERS = [
    ("auto_reply", re.compile(r"thank you for contacting.*support|we've included answers to common questions|auto.?reply|out of office", re.I)),
    ("no", re.compile(r"not interested|no thank|don't contact|stop contacting", re.I)),
    ("delayed", re.compile(r"not yet|next week|not free until|holiday|away until|we are not free", re.I)),
    ("login_issue", re.compile(r"asking me to pay|kicked me out|keeps going back|login trouble|can't log", re.I)),
    ("deck_request", re.compile(r"\bdeck\b|brief|overview|materials|one.?pager", re.I)),
    ("slot_confirm", re.compile(r"\b(yes|that works|sounds good|let's do|booked|confirmed|see you then)\b", re.I)),
    ("interested", re.compile(r"interested|sounds interesting|keen|sample report|tell me more|let.?s (talk|chat|call)|happy to (talk|chat|call)|call me|book a call", re.I)),
    ("time_mentioned", re.compile(r"\b(mon|tue|wed|thu|fri|monday|tuesday|wednesday|thursday|friday)\b|\d{1,2}\s*(jun|july|am|pm)", re.I)),
]


def load_json(path: Path, default: Any) -> Any:
    if path.exists():
        return json.loads(path.read_text())
    return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def log_event(event: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a") as f:
        f.write(json.dumps(event) + "\n")


def thread_fingerprint(email: str, subject: str, preview: str) -> str:
    raw = f"{email}|{subject}|{preview[:400]}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def classify(text: str) -> str:
    if re.search(r"not yet", text, re.I):
        return "delayed"
    for name, pattern in CLASSIFIERS:
        if pattern.search(text):
            return name
    return "unknown"


def inbound_text(data: dict, row: dict) -> str:
    bodies = data.get("bodies") or []
    for body in bodies:
        b = body.strip()
        if not b:
            continue
        if b.lower().startswith("from: niketh") or b.lower().startswith("hi chris") and "gradlify" in b.lower()[:200]:
            continue
        return b
    return row.get("snippet") or data.get("text") or ""


def extract_partner_email(row: dict, text: str, partners: dict) -> Optional[str]:
    email = (row.get("email") or "").lower()
    if email in partners:
        return email
    blob = (text + " " + (row.get("snippet") or "") + " " + (row.get("subject") or "")).lower()

    if "chris moore" in blob or "eleven plus success" in blob:
        return "tutor@elevenplussuccess.com"
    if "cecile" in blob or "frenchie" in blob:
        return "cecile@thefrenchiemummy.com"
    if "mock test masters" in blob or "mocktestmasters" in blob or "sandra" in blob:
        return "info@mocktestmasters.com"
    if "11 plus hub" in blob or "11plushub" in blob or "david" in blob:
        return "info@11plushub.com"
    if "pinner road" in blob or "prlcharrow" in blob or "andy" in blob:
        return "prlcharrow@gmail.com"

    for addr, meta in partners.items():
        if addr in blob:
            return addr
        for hint in meta.get("hints", []):
            if hint.lower() in blob:
                return addr
    return None


def load_template(filename: str, **kwargs: str) -> str:
    path = AUTO_DIR / filename
    body = path.read_text()
    for k, v in kwargs.items():
        body = body.replace("{" + k + "}", v)
    return body


def earliest_slots() -> Tuple[str, str]:
    """Next two call slots within ~72h - book ASAP, not next week."""
    now = datetime.now()
    candidates: List[str] = []
    for day_offset in range(0, 5):
        d = now + timedelta(days=day_offset)
        if d.weekday() >= 5:
            continue
        for hour, label in ((11, "11am"), (14, "2pm"), (16, "4pm")):
            slot_dt = d.replace(hour=hour, minute=0, second=0, microsecond=0)
            if slot_dt > now + timedelta(hours=1):
                candidates.append(f"{d.strftime('%a %d %b')} {label}")
    if len(candidates) >= 2:
        return candidates[0], candidates[1]
    if candidates:
        return candidates[0], "any slot in the next 48 hours"
    return "tomorrow 11am", "tomorrow 2pm"


def pick_slots(partner: dict) -> Tuple[str, str]:
    if partner.get("hold_until"):
        return partner.get("slots", ["after hold"])[0], "flexible after return"
    return earliest_slots()


def build_reply(kind: str, partner: dict, text: str, partner_email: str) -> Optional[str]:
    name = partner["name"]
    slot_a, slot_b = pick_slots(partner)

    if kind == "delayed":
        return load_template(
            "reoffer-slots.txt",
            **{"name": name, "slot_a": slot_a, "slot_b": slot_b},
        )

    if kind == "login_issue":
        if partner_email == "cecile@thefrenchiemummy.com":
            return load_template(
                "login-fix-cecile.txt",
                **{"slot_a": slot_a, "slot_b": slot_b},
            )
        return load_template(
            "reoffer-slots.txt",
            **{"name": name, "slot_a": slot_a, "slot_b": slot_b},
        )

    if kind == "deck_request":
        return (
            f"Hi {name},\n\n"
            f"Happy to share the partner overview - easiest if we do a quick 10-min call so I can walk you through it.\n\n"
            f"Does {slot_a} or {slot_b} work? I'll send a Meet link.\n\n"
            f"Best,\nNiketh"
        )

    if kind in ("slot_confirm", "time_mentioned"):
        confirmed = slot_a
        for s in partner.get("slots", []):
            if s.lower()[:6] in text.lower():
                confirmed = s
                break
        return load_template(
            "slot-confirm.txt",
            **{"name": name, "confirmed_slot": confirmed, "meet_link": MEET_PLACEHOLDER},
        )

    if kind in ("interested", "unknown"):
        return load_template(
            "reoffer-slots.txt",
            **{"name": name, "slot_a": slot_a, "slot_b": slot_b},
        )

    if kind == "no":
        return None

    if kind == "auto_reply":
        return None

    return None


def send_reply_to_row(row: dict, body: str, hints: List[str]) -> bool:
    open_row_by_index(row["index"])
    data = read_current_thread()
    # Only reply if latest content looks inbound (not only our text)
    text = data.get("text") or ""
    if "niketh" in text.lower() and "gradlify.com" in text.lower():
        preview = (data.get("bodies") or [""])[0]
        if preview and "niketh" not in preview[:80].lower():
            pass
        elif len(data.get("bodies") or []) < 2:
            return False
    click_reply()
    fill_body(body)
    verify = verify_compose(body)
    if not verify.get("data", {}).get("ok"):
        return False
    send = click_send()
    return bool(send.get("data", {}).get("ok"))


def scan_and_process(dry_run: bool = False) -> dict:
    config = load_json(CONFIG_PATH, {"partners": {}})
    partners: Dict[str, dict] = config["partners"]
    state = load_json(STATE_PATH, {"processed": {}, "last_scan": None})

    query = (
        "from:(tutor@elevenplussuccess.com OR prlcharrow@gmail.com OR info@11plushub.com "
        "OR cecile@thefrenchiemummy.com OR info@mocktestmasters.com OR geekschool OR kinlearning "
        "OR mathsaurus OR topdog OR elevenplusenglish OR studyhat OR office.plusopedia OR sabah OR theexamcoach) "
        "newer_than:30d"
    )
    rows = list_inbox(query)

    recent_updates: List[dict] = []
    actions_taken: List[dict] = []

    for row in rows[:25]:
        open_row_by_index(row["index"])
        data = read_current_thread()
        text = data.get("text") or ""
        bodies = data.get("bodies") or []
        inbound = inbound_text(data, row)
        partner_email = extract_partner_email(row, inbound + " " + text, partners)

        fp = thread_fingerprint(
            partner_email or row.get("email", ""),
            row.get("subject", ""),
            inbound,
        )

        kind = classify(inbound + " " + text)
        partner = partners.get(partner_email or "", {})
        org = partner.get("org")
        if not org:
            em = row.get("email") or ""
            if "mathsaurus" in em:
                org = "Mathsaurus"
            elif "geekschool" in em:
                org = "Geek School"
            else:
                org = (row.get("sender") or em or "Unknown").split(",")[0][:40]

        # Skip rows where partner detection clearly mismatched body
        if partner_email == "info@mocktestmasters.com" and "cecile" in inbound.lower():
            continue

        update = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "org": org,
            "email": partner_email or row.get("email", ""),
            "subject": row.get("subject", ""),
            "kind": kind,
            "preview": inbound[:180].replace("\n", " "),
            "unread": bool(row.get("unread")),
            "action": None,
        }

        if partner_email and partner.get("hold_until"):
            update["note"] = f"On hold until {partner['hold_until']}"
            recent_updates.append(update)
            continue

        already = state["processed"].get(fp)
        should_act = partner_email and kind not in ("auto_reply", "no") and not already

        if kind == "login_issue" and partner_email == "cecile@thefrenchiemummy.com":
            should_act = not already or kind != state["processed"].get(fp, {}).get("kind")

        if kind == "delayed" and "not yet" in inbound.lower():
            update["note"] = "Partner asked for more time - slots re-offered once only"

        if should_act and not dry_run:
            body = build_reply(kind, partner, inbound, partner_email or "")
            if body:
                hints = partner.get("hints", [partner_email.split("@")[0]])
                ok = send_reply_to_row(row, body, hints)
                action = "auto_reply_sent" if ok else "auto_reply_failed"
                state["processed"][fp] = {"kind": kind, "action": action, "ts": update["ts"]}
                log_event({**update, "action": action, "fp": fp})
                actions_taken.append({**update, "action": action})
                update["action"] = action
            else:
                update["action"] = "no_template"
        elif already:
            update["action"] = f"already_handled ({already.get('action', 'seen')})"
        elif kind == "auto_reply":
            update["action"] = "ignored_auto_reply"
        else:
            update["action"] = "logged"

        recent_updates.append(update)

    # De-dupe updates by org+subject, keep newest
    seen = set()
    deduped = []
    for u in recent_updates:
        key = (u["org"], u["subject"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(u)

    state["last_scan"] = datetime.now(timezone.utc).isoformat()
    feed_only = "--feed-only" in sys.argv
    if not dry_run:
        save_json(STATE_PATH, state)

    feed = build_live_feed(deduped[:8], actions_taken)
    if not dry_run or feed_only:
        write_live_feed(feed)

    return {"updates": deduped, "actions": actions_taken, "feed": feed}


def build_live_feed(updates: List[dict], actions: List[dict]) -> dict:
    pending_calls = sum(
        1 for u in updates if u.get("kind") in ("interested", "delayed", "login_issue", "time_mentioned") and "sent" not in (u.get("action") or "")
    )

    next_three = [
        {
            "n": 1,
            "title": "Post WA Day 1 in your 600-member group",
            "why": "Warmest pipe - no partner reply needed",
            "how": [
                "Open file: outreach/wa/day1-relatability.txt",
                "Copy all text → paste in WhatsApp group (no link, no price)",
                "Reply to anyone who comments personally",
            ],
            "file": "outreach/wa/day1-relatability.txt",
            "block": "b4-0",
            "minutes": 5,
        },
        {
            "n": 2,
            "title": "Export mock poster PNGs",
            "why": "Parents share images - needed before 14 Jun push",
            "how": [
                "Open outreach/assets/14-june-mock-poster.html in your default browser",
                "Screenshot left panel → save as outreach/assets/14-june-mock-poster.png",
                "Screenshot right panel → save as outreach/assets/14-june-mock-story.png",
            ],
            "file": "outreach/assets/14-june-mock-poster.html",
            "block": "b3-3",
            "minutes": 10,
        },
        {
            "n": 3,
            "title": "When a partner confirms a slot → Calendar + Meet",
            "why": "0/5 calls booked - this unlocks b2-6 and ?ref= links",
            "how": [
                "Gmail: search from:(elevenplussuccess OR 11plushub OR mocktestmasters OR frenchiemummy)",
                "Google Calendar: find matching tentative hold → Confirm → Add Google Meet",
                "Reply in same thread with Meet link (agent drafts confirm when they reply YES)",
                "On call: use partner call brief → send ?ref= within 1h",
            ],
            "file": "outreach/partner-calls/CALL-BRIEFS.md",
            "block": "b2-6",
            "minutes": 15,
        },
    ]

    # Bump Cecile login to #1 if active login issue without sent action
    cecile = next((u for u in updates if "cecile" in (u.get("email") or "").lower() or "Frenchie" in u.get("org", "")), None)
    if cecile and cecile.get("kind") == "login_issue":
        next_three[2] =         {
            "n": 3,
            "title": "Cecile login fix - book call ASAP",
            "why": "She replied: paywall + kicked out - fix on call today/tomorrow",
            "how": [
                "Gmail: '11+ paid/affiliate collab?' - if she confirms ANY time, book immediately",
                "Google Calendar: create event now + Meet link → reply within minutes",
                "On call: fix login live, demo mock, send ?ref=FRENCHIEMUMMY within 1h",
            ],
            "file": "outreach/partner-auto/login-fix-cecile.txt",
            "block": "b2-5",
            "minutes": 10,
        }

    KIND_LABEL = {
        "delayed": "Asked for more time",
        "login_issue": "Login / access issue",
        "interested": "Interested",
        "slot_confirm": "Confirmed slot",
        "auto_reply": "Auto-reply (no action)",
        "time_mentioned": "Mentioned a time",
        "deck_request": "Wants deck",
        "no": "Declined",
        "unknown": "New message",
    }

    static_updates = [
        {
            "org": "Outreach pipeline",
            "kind": "done",
            "kindLabel": "Completed",
            "preview": "10 cold emails sent (Wave 1: 7, Wave 2: 3). Tier A: all 5 contacted.",
            "action": "done",
            "note": None,
            "subject": "Block 2 automation",
        },
        {
            "org": "Cecile · Frenchie Mummy",
            "kind": "login_issue",
            "kindLabel": "Login / access issue",
            "preview": "Paywall + kicked out - login-fix email sent with Thu 12 / Fri 13 call slots.",
            "action": "auto_reply_sent",
            "note": "Awaiting her time confirm",
            "subject": "11+ paid/affiliate collab?",
        },
        {
            "org": "Chris · Eleven Plus Success",
            "kind": "delayed",
            "kindLabel": "Asked for more time",
            "preview": "Not yet - will look next week. Chased 7 Jun (email + WA).",
            "action": "already_handled",
            "note": "Thu 12 / Fri 13 slots offered",
            "subject": "Re: 11+ affiliate partnership?",
        },
    ]

    return {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "recentUpdates": static_updates + [
            {
                "org": u["org"],
                "kind": u["kind"],
                "kindLabel": KIND_LABEL.get(u["kind"], u["kind"]),
                "preview": u["preview"],
                "action": u.get("action"),
                "note": u.get("note"),
                "subject": u.get("subject", ""),
            }
            for u in updates
        ],
        "nextThree": next_three,
        "autoActionsToday": actions,
    }


def write_live_feed(feed: dict) -> None:
    FEED_PATH.write_text(
        "/** Auto-generated by scripts/partner-reply-agent.py - do not edit */\n"
        f"window.GRADLIFY_LIVE_FEED = {json.dumps(feed, indent=2)};\n"
    )


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    result = scan_and_process(dry_run=dry)
    print(json.dumps({"updates": len(result["updates"]), "actions": result["actions"]}, indent=2))
