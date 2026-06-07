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


def load_metrics() -> dict:
    path = ROOT / "progress" / "metrics-snapshot.js"
    if not path.exists():
        return {}
    text = path.read_text()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start < 0 or end <= start:
        return {}
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError:
        return {}


def print_checklist() -> None:
    d = days_until_mock()
    metrics = load_metrics()
    lm = metrics.get("liveMock", {})
    subs = metrics.get("subscriptions", {})
    print(f"\n=== Gradlify marketing ops — {datetime.now().strftime('%Y-%m-%d')} ===")
    print(f"14 June mock: {d} days left")
    if lm:
        print(
            f"Live metrics: {lm.get('enrolledReal', '?')} enrolled (real) · "
            f"£{lm.get('revenueGbp') or '400+'} mock cash · "
            f"{subs.get('activePaying', '?')} active + {subs.get('trialing', '?')} trialing"
        )
    print("Refresh: python3 scripts/fetch-metrics-snapshot.py\n")

    daily = ROOT / "outreach" / "execute" / "DAILY-AUDIT.md"
    daily_ref = str(daily) if daily.exists() else "python3 scripts/kimi-state-audit.py"
    items = [
        ("P1", "Read sent-ledger next action only", daily_ref),
        ("P2", "Partner CALLS not emails (MTM Tue 10)", "outreach/partner-calls/CALL-BRIEFS.md"),
        ("P3", "DM sweep scores/PREMIUM", "scripts/dm-sweep-agent.py"),
        ("P4", "5 paying subs referral DMs", "outreach/distribution/paying-subs-referral.txt"),
        ("P5", "FB reminder in approved groups only", "outreach/fb/7-day-reminder-posts.md"),
        ("P6", "Full pipeline", "python3 scripts/marketing-execute.py"),
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
