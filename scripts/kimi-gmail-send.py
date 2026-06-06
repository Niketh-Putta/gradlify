#!/usr/bin/env python3
"""Send Gmail replies via Kimi WebBridge."""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
from typing import List, Optional

from kimi_gmail_lib import (
    cmd,
    click_reply,
    click_send,
    fill_body,
    js,
    open_compose,
    open_thread,
    verify_compose,
)


def attach_files(paths: list[str]):
    time.sleep(0.5)
    click = js(
        """(() => {
          const btn = [...document.querySelectorAll('[aria-label*="Attach"],[data-tooltip*="Attach"]')]
            .find(el => el.offsetParent !== null);
          if (!btn) return JSON.stringify({ok:false, err:'attach button not found'});
          btn.click();
          return JSON.stringify({ok:true});
        })()"""
    )
    time.sleep(1)
    if not (isinstance(click.get("data"), dict) and click["data"].get("ok")):
        return click
    results = []
    for path in paths:
        r = cmd("upload", {"selector": 'input[type="file"]', "files": [path]})
        results.append(r)
        time.sleep(1.5)
    ok = all(r.get("ok") for r in results)
    return {"ok": ok, "data": {"ok": ok, "files": paths, "uploads": results}}


def fill_input(label: str, value: str):
    return js(
        f"""(() => {{
          const value = {json.dumps(value)};
          const inputs = [...document.querySelectorAll('input[aria-label],textarea[aria-label]')];
          const field = inputs.find(el => (el.getAttribute('aria-label')||'').toLowerCase().includes({json.dumps(label.lower())}));
          if (!field) return JSON.stringify({{ok:false, err:'field not found: {label}'}});
          field.focus();
          field.value = value;
          field.dispatchEvent(new Event('input', {{bubbles:true}}));
          field.dispatchEvent(new Event('change', {{bubbles:true}}));
          return JSON.stringify({{ok:true, label: field.getAttribute('aria-label')}});
        }})()"""
    )


def send_compose(label: str, to: str, subject: str, body: str, attachments: Optional[List[str]] = None):
    print(f"\n--- {label} (compose) ---")
    steps = {
        "open": open_compose(to, subject),
        "fill": fill_body(body),
        "verify": verify_compose(body),
    }
    if attachments:
        steps["attach"] = attach_files(attachments)
    for k, v in steps.items():
        print(f"{k}: {v}")
    verify_data = steps["verify"].get("data", {})
    if not (isinstance(verify_data, dict) and verify_data.get("ok")):
        print("RESULT: ABORTED — compose body not verified")
        return False
    send = click_send()
    print(f"send: {send}")
    send_ok = isinstance(send.get("data"), dict) and send["data"].get("ok")
    print("RESULT:", "SENT" if send_ok else "CHECK MANUALLY")
    return send_ok


def send_reply(label: str, body: str, *hints: str, attachments: Optional[List[str]] = None):
    print(f"\n--- {label} ---")
    steps = {
        "open": open_thread(*hints),
        "reply": click_reply(),
        "fill": fill_body(body),
        "verify": verify_compose(body),
    }
    if attachments:
        steps["attach"] = attach_files(attachments)
    for k, v in steps.items():
        print(f"{k}: {v}")

    verify_data = steps["verify"].get("data", {})
    if not (isinstance(verify_data, dict) and verify_data.get("ok")):
        print("RESULT: ABORTED — compose body not verified")
        return False

    send = click_send()
    print(f"send: {send}")
    send_ok = isinstance(send.get("data"), dict) and send["data"].get("ok")
    print("RESULT:", "SENT" if send_ok else "CHECK MANUALLY")
    return send_ok


def parse_args(argv):
    attach = None
    cleaned = []
    i = 0
    while i < len(argv):
        if argv[i] == "--attach" and i + 1 < len(argv):
            attach = argv[i + 1]
            i += 2
        else:
            cleaned.append(argv[i])
            i += 1
    return cleaned, ([attach] if attach else None)


if __name__ == "__main__":
    argv, attachments = parse_args(sys.argv[1:])
    if len(argv) < 1:
        print("usage:")
        print("  reply: kimi-gmail-send.py reply <label> <body_file> <hint1> [hint2...] [--attach FILE]")
        print("  compose: kimi-gmail-send.py compose <label> <to> <subject> <body_file> [--attach FILE]")
        sys.exit(1)
    mode = argv[0]
    if mode == "compose":
        if len(argv) < 5:
            print("usage: kimi-gmail-send.py compose <label> <to> <subject> <body_file> [--attach FILE]")
            sys.exit(1)
        label, to, subject, body_file = argv[1:5]
        body = open(body_file).read()
        ok = send_compose(label, to, subject, body, attachments)
    else:
        if mode == "reply":
            _, label, body_file, *hints = ["reply"] + argv[1:]
        else:
            label, body_file, *hints = argv
        body = open(body_file).read()
        ok = send_reply(label, body, *hints, attachments=attachments)
    sys.exit(0 if ok else 1)
