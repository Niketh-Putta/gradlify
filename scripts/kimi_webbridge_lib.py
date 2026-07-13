#!/usr/bin/env python3
"""Shared Kimi WebBridge client for Gmail + WhatsApp automation."""
from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

API = "http://127.0.0.1:10086/command"
HEALTH_URL = "http://127.0.0.1:10086/health"
PAUSE_PATH = Path(__file__).resolve().parents[1] / "outreach" / "BROWSER-AUTOMATION-PAUSED.json"


def browser_automation_paused() -> tuple[bool, str]:
    """Return (paused, reason). Agents must not open Gmail/Gradlify when paused."""
    try:
        if not PAUSE_PATH.exists():
            return False, ""
        data = json.loads(PAUSE_PATH.read_text())
        if data.get("paused"):
            return True, str(data.get("reason") or "browser automation paused")
    except Exception:
        pass
    return False, ""


def health() -> dict:
    try:
        req = urllib.request.Request(HEALTH_URL, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        return {"running": False, "extension_connected": False, "error": str(exc)}


def healthy() -> bool:
    data = health()
    return bool(data.get("running")) and bool(data.get("extension_connected"))


def cmd(action: str, args: dict, session: str = "gradlify") -> dict:
    payload = json.dumps({"action": action, "args": args, "session": session}).encode()
    req = urllib.request.Request(API, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def js(code: str, session: str = "gradlify") -> dict:
    result = cmd("evaluate", {"code": code}, session=session)
    if not result.get("ok"):
        return result
    val = result.get("data", {}).get("value")
    if isinstance(val, str):
        try:
            return {"ok": True, "data": json.loads(val)}
        except json.JSONDecodeError:
            return {"ok": True, "data": val}
    return result


def navigate(url: str, session: str = "gradlify", new_tab: bool = False) -> dict:
    paused, reason = browser_automation_paused()
    if paused:
        return {"ok": False, "error": {"code": "paused", "message": reason}}
    args: Dict[str, Any] = {"url": url}
    if new_tab:
        args["newTab"] = True
    return cmd("navigate", args, session=session)


def snapshot(session: str = "gradlify") -> dict:
    return cmd("snapshot", {}, session=session)
