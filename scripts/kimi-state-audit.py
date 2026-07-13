#!/usr/bin/env python3
"""Audit Level Field + Gmail + WA DMs via Kimi; write outreach/sent-ledger.json."""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER_PATH = ROOT / "outreach" / "sent-ledger.json"
TRACKER_PATH = ROOT / "outreach" / "parent-conversion-tracker.csv"
DAILY_PATH = ROOT / "outreach" / "execute" / "DAILY-AUDIT.md"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kimi_webbridge_lib import cmd, healthy, js, navigate  # noqa: E402
from kimi_gmail_lib import list_inbox, read_current_thread, open_row_by_index  # noqa: E402

LEVEL_FIELD_HINTS = ["level field", "the level field"]
WA_SESSION = "gradlify-wa-audit"
GMAIL_SESSION = "gradlify-gmail-partnerships"

CLASSIFIERS = [
    ("sprint_launch", re.compile(r"30.day|points sprint|reply with.*Y4|Y5|Y6|£100 amazon", re.I)),
    ("y4y5y6", re.compile(r"\bY4\b|\bY5\b|\bY6\b|reply with their year", re.I)),
    ("poll", re.compile(r"which slot works|vote below|attach.*poll", re.I)),
    ("mock_poster", re.compile(r"live 11\+ mock|14 june|4:00|6:30|poster|gradlify\.com/live-mock", re.I)),
    ("mock_reminder", re.compile(r"reminder.*14 june|weekend price|few spots", re.I)),
    ("spots_fomo", re.compile(r"spots left|£9\.99|£14\.99|nearly \d+ families", re.I)),
    ("forward_ask", re.compile(r"forward.*year group|one parent", re.I)),
    ("premium_announce", re.compile(r"premium is now|premium launch|£19\.99/mo.*group", re.I)),
]

PARTNER_SEARCH = "from:(mocktestmasters OR elevenplussuccess OR 11plushub OR thefrenchiemummy)"

READ_WA_GROUP_JS = r"""(() => {
  const pane = document.querySelector('#main') || document.body;
  const text = (pane.innerText || '').slice(0, 30000);
  const outgoing = [...document.querySelectorAll('div.message-out, div._amkz')];
  const mine = outgoing.slice(-40).map(el => ({
    text: (el.innerText || '').trim().slice(0, 500),
    hasImage: !!el.querySelector('img[src*="blob"], img[src*="media"]'),
  }));
  return JSON.stringify({ ok: true, title: document.title, text, mine, url: location.href });
})()"""

READ_WA_DMS_JS = r"""(() => {
  const chats = [...document.querySelectorAll('#pane-side [data-testid="cell-frame-container"], #pane-side div[role="listitem"]')]
    .slice(0, 25)
    .map((el, i) => ({
      index: i,
      name: (el.querySelector('span[title]')?.getAttribute('title') || el.textContent || '').trim().slice(0, 80),
      preview: (el.innerText || '').trim().slice(0, 120),
      unread: !!el.querySelector('[aria-label*="unread"], span[aria-label*="unread"]'),
    }));
  return JSON.stringify({ ok: true, chats, url: location.href });
})()"""


def classify_message(text: str) -> str:
    for name, pattern in CLASSIFIERS:
        if pattern.search(text):
            return name
    return "other"


def seed_ledger_from_repo() -> dict:
    """Known sends from block2-log + playbooks when Kimi unavailable."""
    return {
        "version": 1,
        "lastAudit": None,
        "kimiAvailable": False,
        "channels": {
            "level_field": {
                "group": "The Level Field",
                "audience": 450,
                "knownContext": [
                    "Sprint + Premium already announced to group (do not re-launch)",
                    "Date locked: Sun 14 Jun 4:00-6:30pm",
                    "Poll flow skipped - date pre-confirmed",
                ],
                "sends": [
                    {"type": "sprint_launch", "status": "sent", "source": "repo", "note": "Per progress/data.js + level-field-ops"},
                    {"type": "poll", "status": "skipped", "source": "repo", "note": "Date locked; poll not needed"},
                    {"type": "mock_poster", "status": "unknown", "source": "repo", "note": "Kimi audit required - check poster+caption sent"},
                    {"type": "forward_ask", "status": "unknown", "source": "repo"},
                    {"type": "mock_reminder", "status": "not_sent", "source": "repo"},
                    {"type": "spots_fomo", "status": "not_sent", "source": "repo"},
                ],
            },
            "partners": {
                "tier_a_contacted": True,
                "tier_a_chased_7jun": True,
                "calls_booked": 0,
                "wave1_cold_sent": 7,
                "wave2_cold_sent": 3,
                "do_not_contact": ["Sutton 11 Plus", "Robert Lomax"],
            },
            "distribution": {
                "paying_subs_referral_dm": False,
                "mock_buyer_referral_dm": False,
                "personal_gc_posts": False,
                "fb_reminder": False,
            },
        },
        "nextAction": None,
    }


def audit_whatsapp_group() -> list[dict]:
    navigate("https://web.whatsapp.com/", session=WA_SESSION, new_tab=True)
    time.sleep(6)
    find = cmd(
        "find_tab",
        {"urlPattern": "web.whatsapp.com", "active": True},
        session=WA_SESSION,
    )
    if not find.get("ok"):
        cmd("navigate", {"url": "https://web.whatsapp.com/", "newTab": True}, session=WA_SESSION)
        time.sleep(6)

    search_js = r"""(() => {
      const box = document.querySelector('div[contenteditable="true"][data-tab="3"]')
        || document.querySelector('div[title="Search input textbox"]')
        || [...document.querySelectorAll('div[contenteditable="true"]')].find(el => el.dataset.tab === '3');
      if (!box) return JSON.stringify({ok:false, err:'search box not found'});
      box.focus();
      document.execCommand('insertText', false, 'Level Field');
      return JSON.stringify({ok:true});
    })()"""
    js(search_js, session=WA_SESSION)
    time.sleep(2)
    open_js = r"""(() => {
      const row = [...document.querySelectorAll('#pane-side span[title*="Level Field"], #pane-side [title*="Level Field"]')]
        .map(el => el.closest('[role="listitem"]') || el.closest('div._ak8l'))
        .find(Boolean);
      if (!row) return JSON.stringify({ok:false, err:'Level Field chat not found'});
      row.click();
      return JSON.stringify({ok:true});
    })()"""
    js(open_js, session=WA_SESSION)
    time.sleep(3)

    data = js(READ_WA_GROUP_JS, session=WA_SESSION).get("data", {})
    if not isinstance(data, dict):
        return []

    classified = []
    for msg in data.get("mine", []):
        text = msg.get("text", "")
        kind = classify_message(text)
        classified.append({
            "type": kind,
            "textPreview": text[:200],
            "hasImage": msg.get("hasImage", False),
            "status": "sent",
            "source": "kimi_audit",
        })
    return classified


def audit_whatsapp_dms() -> list[dict]:
    navigate("https://web.whatsapp.com/", session=WA_SESSION)
    time.sleep(4)
    data = js(READ_WA_DMS_JS, session=WA_SESSION).get("data", {})
    if not isinstance(data, dict):
        return []
    priority = []
    for chat in data.get("chats", []):
        preview = (chat.get("preview") or "").lower()
        tags = []
        for tag, pat in [
            ("score", r"score|\d+/\d+"),
            ("PREMIUM", r"premium"),
            ("price", r"price|expensive|how much"),
            ("mock", r"mock|14 june"),
            ("link", r"link|send"),
            ("Y5", r"y5|year 5"),
        ]:
            if re.search(pat, preview, re.I):
                tags.append(tag)
        if chat.get("unread") or tags:
            priority.append({
                "name": chat.get("name"),
                "preview": chat.get("preview"),
                "unread": chat.get("unread", False),
                "tags": tags,
                "index": chat.get("index"),
            })
    return priority


def audit_gmail_partners() -> list[dict]:
    rows = list_inbox(PARTNER_SEARCH)
    results = []
    for row in rows[:8]:
        if row.get("unread"):
            results.append({
                "email": row.get("email"),
                "subject": row.get("subject"),
                "snippet": row.get("snippet"),
                "unread": True,
                "action": "reply_needed",
            })
        else:
            results.append({
                "email": row.get("email"),
                "subject": row.get("subject"),
                "snippet": row.get("snippet")[:120],
                "unread": False,
                "action": "no_new_reply",
            })
    return results


def merge_sends(existing: list[dict], audited: list[dict]) -> list[dict]:
    by_type: dict[str, dict] = {}
    for item in existing:
        by_type[item["type"]] = item
    for item in audited:
        t = item["type"]
        if t == "other":
            continue
        by_type[t] = {
            "type": t,
            "status": "sent",
            "source": "kimi_audit",
            "textPreview": item.get("textPreview", "")[:200],
            "hasImage": item.get("hasImage", False),
        }
    return list(by_type.values())


def decide_next_action(sends: list[dict], distribution: dict) -> dict:
    by_type = {s["type"]: s.get("status") for s in sends}
    poster = by_type.get("mock_poster")
    forward = by_type.get("forward_ask")

    if poster in (None, "unknown", "not_sent"):
        return {
            "channel": "level_field",
            "action": "viral_sequence",
            "steps": [
                "15s voice note (outreach/wa/mock-viral-share-playbook.md)",
                "Poster PNG + outreach/wa/mock-gc-caption.txt",
                "2 min later: outreach/wa/mock-forward-ask.txt",
            ],
            "doNot": ["poll", "sprint_launch", "y4y5y6", "mock-14-june-announce.txt"],
        }
    if forward in (None, "unknown", "not_sent"):
        return {
            "channel": "level_field",
            "action": "forward_ask_only",
            "steps": ["outreach/wa/mock-forward-ask.txt"],
            "doNot": ["poster", "poll", "sprint_launch"],
        }
    if by_type.get("spots_fomo") != "sent":
        return {
            "channel": "level_field",
            "action": "spots_reminder",
            "steps": ["outreach/wa/mock-spots-reminder.txt"],
            "doNot": ["poster", "poll", "sprint_launch"],
        }
    if not distribution.get("paying_subs_referral_dm"):
        return {
            "channel": "distribution",
            "action": "paying_subs_referral",
            "steps": ["outreach/distribution/paying-subs-referral.txt"],
            "doNot": ["level_field_poster"],
        }
    return {
        "channel": "level_field",
        "action": "dm_sweep_only",
        "steps": ["Reply every unread DM with score/PREMIUM scripts"],
        "doNot": ["group_broadcast"],
    }


def write_daily_audit(ledger: dict) -> None:
    next_a = ledger.get("nextAction") or {}
    lines = [
        "# Daily audit (auto-generated)",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Next action only",
        f"**Channel:** {next_a.get('channel')}",
        f"**Action:** {next_a.get('action')}",
        "",
        "### Steps",
    ]
    for step in next_a.get("steps", []):
        lines.append(f"- {step}")
    lines.extend(["", "### Do NOT", ""])
    for item in next_a.get("doNot", []):
        lines.append(f"- {item}")

    if ledger.get("dmPriority"):
        lines.extend(["", "## DM priority (reply today)", ""])
        for dm in ledger["dmPriority"][:15]:
            lines.append(f"- **{dm.get('name')}** [{', '.join(dm.get('tags', []))}] — {dm.get('preview', '')[:80]}")

    DAILY_PATH.parent.mkdir(parents=True, exist_ok=True)
    DAILY_PATH.write_text("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Kimi state audit for Gradlify outreach")
    parser.add_argument("--seed-only", action="store_true", help="Seed from repo without Kimi")
    args = parser.parse_args()

    if LEDGER_PATH.exists() and not args.seed_only:
        ledger = json.loads(LEDGER_PATH.read_text())
    else:
        ledger = seed_ledger_from_repo()

    if healthy() and not args.seed_only:
        ledger["kimiAvailable"] = True
        ledger["lastAudit"] = datetime.now(timezone.utc).isoformat()
        try:
            wa_sends = audit_whatsapp_group()
            ledger["channels"]["level_field"]["sends"] = merge_sends(
                ledger["channels"]["level_field"]["sends"], wa_sends
            )
            ledger["dmPriority"] = audit_whatsapp_dms()
            ledger["partnerInbox"] = audit_gmail_partners()
        except Exception as exc:
            ledger["auditError"] = str(exc)
    else:
        ledger["kimiAvailable"] = False
        ledger["auditNote"] = "Kimi down - seeded from repo. Re-run when WebBridge is up."

    ledger["nextAction"] = decide_next_action(
        ledger["channels"]["level_field"]["sends"],
        ledger["channels"]["distribution"],
    )
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    LEDGER_PATH.write_text(json.dumps(ledger, indent=2) + "\n")
    write_daily_audit(ledger)

    print(json.dumps({"ledger": str(LEDGER_PATH), "nextAction": ledger["nextAction"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
