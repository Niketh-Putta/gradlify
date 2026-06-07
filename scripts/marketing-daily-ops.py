#!/usr/bin/env python3
"""Gradlify marketing daily ops — checklist, agent runner, metrics log."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG_PATH = ROOT / "outreach" / "marketing-ops-log.jsonl"
KIMI_URL = "http://127.0.0.1:10086/command"
ANCHOR_DATE = "2026-06-14"


def kimi_healthy() -> bool:
    try:
        req = urllib.request.Request("http://127.0.0.1:10086/health", method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            return bool(data.get("running")) and bool(data.get("extension_connected"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError):
        return False


def days_until_mock() -> int:
    anchor = datetime.strptime(ANCHOR_DATE, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    return max(0, (anchor.date() - now.date()).days)


def log_event(event: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    event.setdefault("ts", datetime.now(timezone.utc).isoformat())
    with LOG_PATH.open("a") as f:
        f.write(json.dumps(event) + "\n")


def run_script(name: str, args: list[str]) -> tuple[int, str]:
    cmd = [sys.executable, str(ROOT / "scripts" / name), *args]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, cwd=ROOT)
        output = (result.stdout or "") + (result.stderr or "")
        return result.returncode, output.strip()
    except subprocess.TimeoutExpired:
        return 1, f"{name} timed out"


def print_checklist() -> None:
    d = days_until_mock()
    print(f"\n=== Gradlify marketing ops — {datetime.now().strftime('%Y-%m-%d')} ===")
    print(f"14 June mock: {d} days left\n")

    items = [
        ("P1", "Level Field: poll or mock announce + poster", "outreach/execute/2026-06-07-DAILY.md"),
        ("P2", "Chase Tier A partners (MTM, Chris, David, Cecile)", "outreach/manual-affiliate-tracker.csv"),
        ("P3", "FB 7-day reminder in approved groups", "outreach/fb/7-day-reminder-posts.md"),
        ("P4", "Message 5 paying subs for referrals", "docs/GRADLIFY-ACTION-SEQUENCE.md Step 13"),
        ("P5", "DM every trial/mock lead (60 min)", "manual"),
        ("P6", "Export mock poster PNG", "outreach/assets/14-june-mock-poster.html"),
    ]
    for prio, task, ref in items:
        print(f"  [{prio}] {task}")
        print(f"       → {ref}")
    print()


def run_agents(send: bool) -> None:
    if not kimi_healthy():
        print("Kimi WebBridge: DOWN — reconnect extension, then re-run with --agents")
        log_event({"action": "agents_skipped", "reason": "kimi_down"})
        return

    print("Kimi WebBridge: OK")
    email_args = ["--limit", "10"]
    if send:
        email_args.insert(0, "--send")

    for script, args in [
        ("gradlify-email-agent.py", email_args),
        ("partner-reply-agent.py", []),
    ]:
        code, output = run_script(script, args)
        status = "ok" if code == 0 else "error"
        print(f"\n{script}: {status}")
        if output:
            print(output[-2000:])
        log_event({"action": script, "status": status, "exit_code": code})


def main() -> int:
    parser = argparse.ArgumentParser(description="Gradlify marketing daily ops")
    parser.add_argument("--checklist", action="store_true", help="Print today's priority checklist")
    parser.add_argument("--agents", action="store_true", help="Run email + partner agents if Kimi is up")
    parser.add_argument("--send", action="store_true", help="Pass --send to email agent")
    parser.add_argument("--log", action="store_true", help="Log checklist viewed")
    args = parser.parse_args()

    if not any([args.checklist, args.agents, args.log]):
        args.checklist = True

    if args.checklist:
        print_checklist()

    if args.agents:
        run_agents(send=args.send)

    if args.log:
        log_event({"action": "checklist_viewed", "days_until_mock": days_until_mock()})

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
