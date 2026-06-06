#!/usr/bin/env python3
"""Send Gmail replies via Kimi WebBridge."""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from typing import List, Optional

API = "http://127.0.0.1:10086/command"
SESSION = "gradlify-gmail-partnerships"


def cmd(action, args):
    payload = json.dumps({"action": action, "args": args, "session": SESSION}).encode()
    req = urllib.request.Request(API, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def js(code):
    result = cmd("evaluate", {"code": code})
    if not result.get("ok"):
        return result
    val = result["data"].get("value")
    if isinstance(val, str):
        try:
            return {"ok": True, "data": json.loads(val)}
        except json.JSONDecodeError:
            return {"ok": True, "data": val}
    return result


def wait_gmail(search_hint: str, timeout=25):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = js(
            f"""(() => {{
              const rows = [...document.querySelectorAll('tr.zA')];
              const hit = rows.find(tr => (tr.textContent||'').toLowerCase().includes({json.dumps(search_hint.lower())}));
              const loading = (document.body.textContent||'').includes('Fetching mail');
              return JSON.stringify({{rows: rows.length, loading, hasHit: !!hit, url: location.href}});
            }})()"""
        )
        data = r.get("data", {})
        if isinstance(data, dict) and data.get("hasHit") and not data.get("loading"):
            return data
        time.sleep(1.5)
    return r.get("data")


def open_thread(*hints: str):
    cmd("navigate", {"url": "https://mail.google.com/mail/u/0/#inbox"})
    time.sleep(4)
    lowered = [h.lower() for h in hints if h]
    deadline = time.time() + 20
    while time.time() < deadline:
        r = js(
            f"""(() => {{
              const hints = {json.dumps(lowered)};
              const rows = [...document.querySelectorAll('tr.zA')];
              const tr = rows.find(r => {{
                const t = (r.textContent||'').toLowerCase();
                return hints.every(h => t.includes(h));
              }});
              if (!tr) return JSON.stringify({{ok:false, err:'thread not found', rows: rows.length}});
              tr.click();
              return JSON.stringify({{ok:true, subj:(tr.querySelector('.y6')?.textContent||'').trim()}});
            }})()"""
        )
        data = r.get("data")
        if isinstance(data, dict) and data.get("ok"):
            return r
        time.sleep(1.5)
    return r


def click_reply():
    time.sleep(2.5)
    r = js(
        """(() => {
          const candidates = [...document.querySelectorAll('[data-tooltip="Reply"],[aria-label^="Reply"],[aria-label*="Reply to"],span[role=link]')];
          const btn = candidates.find(el => {
            const label = (el.getAttribute('aria-label')||el.getAttribute('data-tooltip')||el.textContent||'').trim();
            return /^reply/i.test(label) && el.offsetParent !== null;
          });
          if (btn) {
            btn.click();
            return JSON.stringify({ok:true, via:'button'});
          }
          document.dispatchEvent(new KeyboardEvent('keydown', {key:'r', code:'KeyR', bubbles:true}));
          return JSON.stringify({ok:true, via:'hotkey'});
        })()"""
    )
    time.sleep(1.5)
    return r


def fill_body(text: str):
    time.sleep(1.5)
    snap = cmd("snapshot", {})
    refs = []
    if snap.get("ok"):
        tree = snap.get("data", {}).get("tree", "")

        def walk(node):
            if isinstance(node, dict):
                name = (node.get("name") or "").lower()
                role = (node.get("role") or "").lower()
                ref = node.get("ref")
                if ref and role in {"textbox", "combobox"} and "message body" in name:
                    refs.append(ref)
                for child in node.get("children", []) or []:
                    walk(child)

        walk(tree if isinstance(tree, dict) else {})

    if refs:
        result = cmd("fill", {"selector": refs[0], "value": text})
        if result.get("ok"):
            return {"ok": True, "data": {"ok": True, "via": "fill", "ref": refs[0]}}

    escaped = json.dumps(text)
    return js(
        f"""(() => {{
          const text = {escaped};
          const box = [...document.querySelectorAll('div[aria-label="Message Body"][contenteditable="true"],div[role="textbox"][contenteditable="true"],div[g_editable="true"]')]
            .find(el => el.offsetParent !== null);
          if (!box) return JSON.stringify({{ok:false, err:'compose box not found'}});
          box.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(box);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('insertText', false, text);
          return JSON.stringify({{ok:true, via:'execCommand', len:text.length}});
        }})()"""
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


def click_send():
    time.sleep(1)
    return js(
        """(() => {
          const btn = [...document.querySelectorAll('[aria-label*="Send"],[data-tooltip*="Send"]')]
            .find(el => el.offsetParent !== null && /send/i.test(el.getAttribute('aria-label')||el.getAttribute('data-tooltip')||''));
          if (!btn) return JSON.stringify({ok:false, err:'send button not found'});
          btn.click();
          return JSON.stringify({ok:true, label: btn.getAttribute('aria-label')||btn.getAttribute('data-tooltip')});
        })()"""
    )


def verify_compose(text: str):
    needle = text.strip().splitlines()[0][:40].lower()
    return js(
        f"""(() => {{
          const box = [...document.querySelectorAll('div[aria-label="Message Body"][contenteditable="true"],div[role="textbox"][contenteditable="true"]')]
            .find(el => el.offsetParent !== null);
          const content = (box?.textContent || '').toLowerCase();
          return JSON.stringify({{ok: content.includes({json.dumps(needle)}), preview: content.slice(0,120)}});
        }})()"""
    )


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


def open_compose(to: str, subject: str):
    url = (
        "https://mail.google.com/mail/u/0/?view=cm&fs=1"
        f"&to={urllib.parse.quote(to)}"
        f"&su={urllib.parse.quote(subject)}"
    )
    cmd("navigate", {"url": url})
    time.sleep(3)
    return {"ok": True, "data": {"ok": True, "to": to, "subject": subject}}


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
