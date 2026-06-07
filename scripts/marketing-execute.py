#!/usr/bin/env python3
"""Audit-driven marketing execution — reads sent-ledger, runs agents, prints one next action."""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER_PATH = ROOT / "outreach" / "sent-ledger.json"


def run(script: str, args: list[str]) -> int:
    cmd = [sys.executable, str(ROOT / "scripts" / script), *args]
    return subprocess.run(cmd, cwd=ROOT).returncode


def main() -> int:
    print("=== Gradlify marketing execute ===\n")

    run("kimi-state-audit.py", [])

    if not LEDGER_PATH.exists():
        print("No ledger found.")
        return 1

    ledger = json.loads(LEDGER_PATH.read_text())
    next_a = ledger.get("nextAction", {})
    print(f"Next action: {next_a.get('action')} ({next_a.get('channel')})")
    for step in next_a.get("steps", []):
        print(f"  → {step}")
    print(f"\nDo NOT: {', '.join(next_a.get('doNot', []))}")

    daily = ROOT / "outreach" / "execute" / "DAILY-AUDIT.md"
    if daily.exists():
        print(f"\nFull brief: {daily}")

    if ledger.get("kimiAvailable"):
        print("\nRunning email + partner agents...")
        run("gradlify-email-agent.py", ["--send", "--limit", "10"])
        run("partner-reply-agent.py", [])
        run("dm-sweep-agent.py", [])
    else:
        print("\nKimi down — paste-ready copy in outreach/execute/ and outreach/distribution/")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
