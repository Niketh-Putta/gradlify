#!/usr/bin/env python3
"""
Autonomous Gradlify partnership email agent.

Reads Gmail via Kimi WebBridge, drafts replies as Niketh (knowledge + tracker + voice),
optionally sends.

Requirements:
  - Kimi WebBridge on http://127.0.0.1:10086, session gradlify-gmail-partnerships, Gmail logged in
  - OPENAI_API_KEY in env (or .env.local)

Usage:
  python3 scripts/gradlify-email-agent.py              # dry-run (draft only)
  python3 scripts/gradlify-email-agent.py --send       # send approved drafts
  python3 scripts/gradlify-email-agent.py --limit 5
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import request as urlrequest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import kimi_gmail_lib as gmail  # noqa: E402

STATE_PATH = ROOT / "outreach" / "email-agent-state.json"
LOG_PATH = ROOT / "outreach" / "email-agent-log.jsonl"
TRACKER_PATH = ROOT / "outreach" / "manual-affiliate-tracker.csv"
KNOWLEDGE_PATH = ROOT / "docs" / "NIKETH-KNOWLEDGE.md"
VOICE_PATH = ROOT / ".cursor" / "skills" / "gradlify-email" / "voice.md"
DECISION_PATH = ROOT / ".cursor" / "skills" / "gradlify-email" / "decision-tree.md"

NIKETH_EMAILS = {
    "niketh13putta@gmail.com",
    "team@gradlify.com",
    "niketh@gradlify.com",
}

BLOCKLIST_EMAILS = {
    "karentutorsutton@gmail.com",
}

TIER_A_FROM = (
    "from:elevenplussuccess.com OR from:prlcharrow@gmail.com OR from:11plushub.com "
    "OR from:mocktestmasters.com OR from:thefrenchiemummy.com OR from:mumfoundeduk@gmail.com"
)
PARTNER_SEARCH = f"is:unread ({TIER_A_FROM})"
SEARCH_QUERY = PARTNER_SEARCH

NEWSLETTER_DOMAINS = (
    "substack.com", "ebay.co.uk", "ebay.com", "alpaca.markets", "danmartell.com",
    "joinvenn.org", "no-reply@", "noreply@", "mailer@", "newsletter",
)

OPENAI_MODEL = os.environ.get("GRADLIFY_EMAIL_MODEL", "gpt-4o-mini")


def load_dotenv() -> None:
    for name in (".env.local", ".env"):
        path = ROOT / name
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def load_tracker() -> List[dict]:
    if not TRACKER_PATH.exists():
        return []
    with TRACKER_PATH.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def partner_for_email(email: str, tracker: List[dict]) -> Optional[dict]:
    email = (email or "").strip().lower()
    for row in tracker:
        if (row.get("contact_email") or "").strip().lower() == email:
            return row
    return None


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"handled": {}}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2))


def log_event(event: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    event["ts"] = datetime.now(timezone.utc).isoformat()
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")


def thread_key(row: dict, thread: dict) -> str:
    return f"{row.get('email','')}|{row.get('subject','')}|{thread.get('bodies', [''])[-1][:80] if thread.get('bodies') else row.get('snippet','')}"


def last_sender_is_niketh(thread: dict) -> bool:
    meta = thread.get("meta") or []
    if meta:
        last = meta[-1].get("email", "").lower()
        if last in NIKETH_EMAILS or "niketh" in last or "gradlify" in last:
            return True
    text = (thread.get("text") or "").lower()
    # crude: if last From block is niketh
    for em in NIKETH_EMAILS:
        if text.rfind(em) > max(text.rfind("@"), 0) and "from:" in text:
            pass
    bodies = thread.get("bodies") or []
    if not bodies:
        return False
    # Gmail orders chronologically; check tail of full text for our sign-off only if single message
    return False


def infer_last_external_email(thread: dict) -> str:
    for item in reversed(thread.get("meta") or []):
        em = (item.get("email") or "").lower()
        if em and em not in NIKETH_EMAILS and "gradlify" not in em:
            return em
    return ""


def should_skip_row(row: dict, tracker: List[dict]) -> Optional[str]:
    email = (row.get("email") or "").lower()
    sender = (row.get("sender") or "").lower()
    if not email and not sender:
        return "no sender"
    if email in NIKETH_EMAILS or "niketh" in sender and "me" in sender:
        return "own_email"
    if email in BLOCKLIST_EMAILS:
        return "blocklist"
    partner = partner_for_email(email, tracker)
    if partner and partner.get("status") == "do_not_contact":
        return "do_not_contact"
    if partner and partner.get("status") == "closed_no_commission":
        return "closed_no_commission"
    if partner and partner.get("status") == "final_followup_sent" and not row.get("unread"):
        return "final_followup_no_unread"
    for dom in NEWSLETTER_DOMAINS:
        if dom in email or dom in (row.get("subject") or "").lower():
            return "newsletter_or_noise"
    # Autopilot: only reply to known partners in tracker (or Tier A domain match)
    partner = partner_for_email(email, tracker)
    tier_a = any(
        d in email
        for d in (
            "elevenplussuccess.com", "prlcharrow@gmail.com", "11plushub.com",
            "mocktestmasters.com", "thefrenchiemummy.com", "mumfoundeduk@gmail.com",
        )
    )
    if not partner and not tier_a:
        return "not_a_tracked_partner"
    return None


def validate_draft(body: str) -> List[str]:
    issues = []
    if "—" in body or "–" in body:
        issues.append("contains em dash")
    banned = [
        "i hope this",
        "just circling back",
        "i'd be happy to",
        "excited to",
        "leverage",
        "touch base",
        "at your earliest convenience",
        "please don't hesitate",
        "kind regards",
        "best regards",
    ]
    low = body.lower()
    for phrase in banned:
        if phrase in low:
            issues.append(f"banned phrase: {phrase}")
    if len(body.strip()) < 40:
        issues.append("too short")
    if len(body.strip()) > 2500:
        issues.append("too long")
    if "gradlify.com" not in body.lower() and "gradlify" not in body.lower():
        issues.append("missing gradlify mention")
    return issues


def openai_draft(system: str, user: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set. Add to .env.local or export it.")

    payload = {
        "model": OPENAI_MODEL,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    req = urlrequest.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())
    content = data["choices"][0]["message"]["content"].strip()
    # strip markdown fences if model adds them
    content = re.sub(r"^```(?:text)?\n?", "", content)
    content = re.sub(r"\n?```$", "", content)
    return content.strip()


def build_system_prompt() -> str:
    return f"""You are Niketh Putta's autonomous email responder for Gradlify partnership and parent inbox threads ONLY.

Write the email body only. No subject line. No markdown.

VOICE RULES:
{read_text(VOICE_PATH)}

DECISION RULES:
{read_text(DECISION_PATH)}

BUSINESS CONTEXT:
{read_text(KNOWLEDGE_PATH)}

OUTPUT RULES:
- British English. Short, human, direct. Like a founder texting professionally.
- NO em dashes (—). Use commas or full stops.
- Default for warm partners: book a 10-min call with TWO specific time slots this week.
- Sign off exactly:
Best,
Niketh
gradlify.com
- If thread should not get a reply, output exactly: SKIP: <reason>
- If they said yes to deal, include their ?ref= link from partner data.
- Never contact Sutton 11 Plus.
- Do not sound like AI or corporate marketing.
"""


def build_user_prompt(row: dict, thread: dict, partner: Optional[dict]) -> str:
    partner_json = json.dumps(partner, indent=2) if partner else "null"
    bodies = "\n---\n".join(thread.get("bodies") or [])[:12000]
    return f"""INBOX ROW:
{json.dumps(row, indent=2)}

PARTNER TRACKER ROW:
{partner_json}

THREAD SUBJECT: {thread.get('subject', row.get('subject', ''))}

THREAD MESSAGES (oldest to newest):
{bodies}

THREAD TEXT EXCERPT:
{(thread.get('text') or '')[:8000]}

TASK:
1. Decide if Niketh should reply (if not, SKIP: reason).
2. If yes, write the reply body as Niketh responding to the LATEST message from them.
3. Match thread tone. One clear ask. Voice-first for partners unless they already agreed (then send link).
"""


def process_thread(row: dict, tracker: List[dict], state: dict, send: bool) -> dict:
    email = (row.get("email") or "").lower()
    skip = should_skip_row(row, tracker)
    if skip:
        return {"action": "skip", "reason": skip, "email": email}

    gmail.open_row_by_index(row["index"])
    thread = gmail.read_current_thread()
    key = thread_key(row, thread)

    if key in state.get("handled", {}):
        return {"action": "skip", "reason": "already_handled", "email": email}

    partner = partner_for_email(email, tracker)
    if partner and partner.get("status") == "final_followup_sent":
        # only reply if they wrote back (unread from them)
        if not row.get("unread"):
            return {"action": "skip", "reason": "final_followup_cold", "email": email}

    system = build_system_prompt()
    user = build_user_prompt(row, thread, partner)

    try:
        draft = openai_draft(system, user)
    except Exception as e:
        log_event({"action": "error", "email": email, "error": str(e), "subject": row.get("subject")})
        return {"action": "error", "error": str(e), "email": email}

    if draft.upper().startswith("SKIP:"):
        state.setdefault("handled", {})[key] = {"action": "skip", "reason": draft[5:].strip()}
        save_state(state)
        log_event({"action": "skip", "email": email, "reason": draft, "subject": row.get("subject")})
        return {"action": "skip", "reason": draft, "email": email}

    issues = validate_draft(draft)
    if issues:
        log_event({"action": "draft_rejected", "email": email, "issues": issues, "draft": draft})
        return {"action": "reject", "issues": issues, "draft": draft, "email": email}

    result = {
        "action": "draft",
        "email": email,
        "subject": row.get("subject"),
        "partner": partner.get("partner_name") if partner else None,
        "draft": draft,
    }

    if send:
        hints = [row.get("subject", "")[:30], email.split("@")[0]]
        sent = gmail.send_reply_on_open_thread(draft)
        result["action"] = "sent" if sent else "send_failed"
        if sent:
            state.setdefault("handled", {})[key] = {"action": "sent", "at": datetime.now(timezone.utc).isoformat()}
            save_state(state)
        log_event({**result, "send": sent})
    else:
        log_event(result)

    return result


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Gradlify autonomous email agent")
    parser.add_argument("--send", action="store_true", help="Actually send (default: dry-run)")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--search", default=SEARCH_QUERY)
    args = parser.parse_args()

    if not gmail.ping():
        print("ERROR: Kimi WebBridge not reachable at http://127.0.0.1:10086")
        print("Start Kimi WebBridge and log into Gmail (session: gradlify-gmail-partnerships)")
        return 1

    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set. Add to .env.local for autopilot drafts.")
        return 1

    tracker = load_tracker()
    state = load_state()
    rows = gmail.list_inbox(args.search)
    if not rows:
        print("No inbox rows found. Try opening Gmail in Kimi or adjust --search.")
        return 0

    print(f"Found {len(rows)} threads (search: {args.search})")
    print(f"Mode: {'SEND' if args.send else 'DRY-RUN'}\n")

    processed = 0
    for row in rows:
        if processed >= args.limit:
            break
        if not row.get("unread"):
            continue
        skip = should_skip_row(row, tracker)
        if skip:
            print(f"SKIP {row.get('email')}: {skip}")
            continue

        print(f"--- {row.get('sender')} <{row.get('email')}> ---")
        print(f"Subject: {row.get('subject')}")
        out = process_thread(row, tracker, state, send=args.send)
        print(f"→ {out.get('action', '?')}", end="")
        if out.get("reason"):
            print(f" ({out['reason'][:80]})")
        elif out.get("error"):
            print(f" ERROR: {out['error']}")
        else:
            print()
        if out.get("draft"):
            print(out["draft"])
            print()
        if out.get("issues"):
            print(f"REJECTED: {out['issues']}")
        if out.get("action") == "sent":
            print("SENT OK")
        elif out.get("action") == "send_failed":
            print("SEND FAILED — check Gmail manually")
        processed += 1
        time.sleep(2)

    print(f"\nDone. Log: {LOG_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
