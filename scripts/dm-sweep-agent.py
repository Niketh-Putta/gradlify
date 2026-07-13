#!/usr/bin/env python3
"""DM sweep: classify WA DMs via Kimi, suggest replies, log to parent-conversion-tracker."""
from __future__ import annotations

import csv
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKER_PATH = ROOT / "outreach" / "parent-conversion-tracker.csv"
LEDGER_PATH = ROOT / "outreach" / "sent-ledger.json"
LOG_PATH = ROOT / "outreach" / "dm-sweep-log.jsonl"
WA_DIR = ROOT / "outreach" / "wa"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kimi_webbridge_lib import healthy, js, navigate  # noqa: E402

WA_SESSION = "gradlify-wa-dm"

REPLY_MAP = {
    "PREMIUM": WA_DIR / "dm-premium.txt",
    "price": WA_DIR / "dm-too-expensive.txt",
    "link": WA_DIR / "dm-year-reply.txt",
    "score": None,
    "mock": WA_DIR / "mock-forward-for-parents.txt",
    "Y5": WA_DIR / "dm-year-reply.txt",
}


def load_reply(path: Path | None) -> str:
    if path and path.exists():
        return path.read_text().strip()
    return "[Reply with one named weak topic + practice link - personalize from their score]"


def classify_preview(preview: str) -> list[str]:
    tags = []
    p = preview.lower()
    if re.search(r"premium", p):
        tags.append("PREMIUM")
    if re.search(r"price|expensive|how much|£", p):
        tags.append("price")
    if re.search(r"score|\d+/\d+", p):
        tags.append("score")
    if re.search(r"mock|14 june|register", p):
        tags.append("mock")
    if re.search(r"link|send", p):
        tags.append("link")
    if re.search(r"y4|y5|y6|year", p):
        tags.append("Y5")
    return tags or ["general"]


def log_event(event: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    event.setdefault("ts", datetime.now(timezone.utc).isoformat())
    with LOG_PATH.open("a") as f:
        f.write(json.dumps(event) + "\n")


def audit_dms() -> list[dict]:
    navigate("https://web.whatsapp.com/", session=WA_SESSION, new_tab=True)
    time.sleep(5)
    data = js(
        r"""(() => {
          const chats = [...document.querySelectorAll('#pane-side [data-testid="cell-frame-container"], #pane-side div[role="listitem"]')]
            .slice(0, 30)
            .map((el, i) => ({
              index: i,
              name: (el.querySelector('span[title]')?.getAttribute('title') || el.textContent || '').trim().slice(0, 80),
              preview: (el.innerText || '').trim().slice(0, 200),
              unread: !!el.querySelector('[aria-label*="unread"], span[aria-label*="unread"]'),
            }));
          return JSON.stringify({ ok: true, chats });
        })()""",
        session=WA_SESSION,
    ).get("data", {})
    if not isinstance(data, dict):
        return []
    results = []
    for chat in data.get("chats", []):
        if not chat.get("unread") and not re.search(r"score|premium|mock|y5", chat.get("preview", ""), re.I):
            continue
        tags = classify_preview(chat.get("preview", ""))
        primary = next((t for t in ["PREMIUM", "score", "price", "mock", "link", "Y5"] if t in tags), "general")
        results.append({
            "name": chat.get("name"),
            "preview": chat.get("preview"),
            "tags": tags,
            "primary": primary,
            "suggestedReply": load_reply(REPLY_MAP.get(primary)),
            "unread": chat.get("unread", False),
            "index": chat.get("index"),
        })
    return results


def append_tracker_stub(dm: dict) -> None:
    if not TRACKER_PATH.exists():
        return
    with TRACKER_PATH.open() as f:
        rows = list(csv.DictReader(f))
    names = {r.get("parent_name", "").lower() for r in rows}
    if dm.get("name", "").lower() in names:
        return
    fieldnames = [
        "parent_name", "phone_or_wa", "child_year", "source", "link_sent_date",
        "mock_registered", "mock_completed", "score", "weak_topic_1",
        "premium_asked", "paid", "paid_amount_gbp", "follow_up_date", "notes",
    ]
    rows.append({
        "parent_name": dm.get("name", ""),
        "phone_or_wa": "",
        "child_year": "",
        "source": "wa_dm_sweep",
        "link_sent_date": "",
        "mock_registered": "",
        "mock_completed": "",
        "score": "",
        "weak_topic_1": "",
        "premium_asked": "Y" if "PREMIUM" in dm.get("tags", []) else "",
        "paid": "",
        "paid_amount_gbp": "",
        "follow_up_date": datetime.now(timezone.utc).date().isoformat(),
        "notes": dm.get("preview", "")[:100],
    })
    with TRACKER_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    if not healthy():
        print("Kimi WebBridge down - DM sweep requires your machine.")
        print("Manual: reply every unread DM using outreach/wa/dm-*.txt scripts.")
        log_event({"action": "skipped", "reason": "kimi_down"})
        return 1

    dms = audit_dms()
    print(f"\n=== DM sweep: {len(dms)} priority threads ===\n")
    for dm in dms:
        print(f"** {dm['name']}** [{', '.join(dm['tags'])}]")
        print(f"   Preview: {dm['preview'][:100]}")
        print(f"   Suggested reply:\n{dm['suggestedReply'][:300]}...\n")
        append_tracker_stub(dm)
        log_event({"action": "classified", **{k: dm[k] for k in ["name", "tags", "primary", "unread"]}})

    out = ROOT / "outreach" / "execute" / "DM-SWEEP-TODAY.md"
    lines = ["# DM sweep — reply today", ""]
    for dm in dms:
        lines.append(f"## {dm['name']} ({', '.join(dm['tags'])})")
        lines.append(f"Preview: {dm['preview']}")
        lines.append("")
        lines.append("```")
        lines.append(dm["suggestedReply"])
        lines.append("```")
        lines.append("")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines))
    print(f"Written: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
