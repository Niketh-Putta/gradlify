#!/usr/bin/env python3
"""Kimi WebBridge helpers for Gmail read/send."""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

API = "http://127.0.0.1:10086/command"
SESSION = "gradlify-gmail-partnerships"
GMAIL_ACCOUNT = 0  # mail/u/0/


def ping() -> bool:
    try:
        cmd("snapshot", {})
        return True
    except Exception:
        return False


def cmd(action: str, args: dict) -> dict:
    payload = json.dumps({"action": action, "args": args, "session": SESSION}).encode()
    req = urllib.request.Request(API, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode())


def js(code: str) -> dict:
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


def gmail_url(path: str = "inbox") -> str:
    return f"https://mail.google.com/mail/u/{GMAIL_ACCOUNT}/#{path}"


def navigate_inbox(search_query: Optional[str] = None) -> dict:
    if search_query:
        q = urllib.parse.quote(search_query)
        url = f"https://mail.google.com/mail/u/{GMAIL_ACCOUNT}/#search/{q}"
    else:
        url = gmail_url("inbox")
    cmd("navigate", {"url": url})
    time.sleep(4)
    return {"ok": True, "url": url}


LIST_INBOX_JS = r"""(() => {
  const rows = [...document.querySelectorAll('tr.zA')].slice(0, 30).map((tr, i) => {
    const senderEl = tr.querySelector('.yX, .yW');
    const email = tr.querySelector('.yW span[email]')?.getAttribute('email')
      || tr.querySelector('[email]')?.getAttribute('email') || '';
    return {
      index: i,
      sender: (senderEl?.textContent || '').trim(),
      email: (email || '').trim().toLowerCase(),
      subject: (tr.querySelector('.y6')?.textContent || '').trim(),
      snippet: (tr.querySelector('.y2')?.textContent || '').trim(),
      unread: tr.classList.contains('zE'),
    };
  });
  return JSON.stringify({ ok: true, rows, url: location.href });
})()"""


def list_inbox(search_query: Optional[str] = None) -> List[dict]:
    navigate_inbox(search_query)
    deadline = time.time() + 25
    while time.time() < deadline:
        r = js(LIST_INBOX_JS)
        data = r.get("data")
        if isinstance(data, dict) and data.get("rows"):
            return data["rows"]
        time.sleep(1.5)
    return []


def open_row_by_index(index: int) -> dict:
    r = js(
        f"""(() => {{
          const rows = [...document.querySelectorAll('tr.zA')];
          const tr = rows[{index}];
          if (!tr) return JSON.stringify({{ok:false, err:'row not found'}});
          tr.click();
          return JSON.stringify({{ok:true, subject:(tr.querySelector('.y6')?.textContent||'').trim()}});
        }})()"""
    )
    time.sleep(3)
    return r


def open_thread(*hints: str) -> dict:
    navigate_inbox()
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
            time.sleep(3)
            return r
        time.sleep(1.5)
    return r


READ_THREAD_JS = r"""(() => {
  const bodies = [...document.querySelectorAll('div.a3s.aiL, div.a3s')].map(el => (el.innerText || '').trim()).filter(Boolean);
  const headers = [...document.querySelectorAll('div.ha h2, h2.hP')].map(el => (el.textContent || '').trim());
  const subject = headers[0] || '';
  const meta = [...document.querySelectorAll('span.gD, span.go')].map(el => ({
    name: (el.textContent || '').trim(),
    email: (el.getAttribute('email') || '').trim().toLowerCase(),
  }));
  const expanded = (document.body.innerText || '').slice(0, 20000);
  return JSON.stringify({
    ok: true,
    subject,
    bodies,
    meta,
    text: expanded,
    url: location.href,
  });
})()"""


def read_current_thread() -> dict:
    r = js(READ_THREAD_JS)
    data = r.get("data") if isinstance(r.get("data"), dict) else {}
    return data


def click_reply() -> dict:
    time.sleep(2)
    r = js(
        """(() => {
          const candidates = [...document.querySelectorAll('[data-tooltip="Reply"],[aria-label^="Reply"],[aria-label*="Reply to"],span[role=link]')];
          const btn = candidates.find(el => {
            const label = (el.getAttribute('aria-label')||el.getAttribute('data-tooltip')||el.textContent||'').trim();
            return /^reply/i.test(label) && el.offsetParent !== null;
          });
          if (btn) { btn.click(); return JSON.stringify({ok:true, via:'button'}); }
          document.dispatchEvent(new KeyboardEvent('keydown', {key:'r', code:'KeyR', bubbles:true}));
          return JSON.stringify({ok:true, via:'hotkey'});
        })()"""
    )
    time.sleep(1.5)
    return r


def fill_body(text: str) -> dict:
    time.sleep(1.5)
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


def verify_compose(text: str) -> dict:
    needle = text.strip().splitlines()[0][:40].lower()
    return js(
        f"""(() => {{
          const box = [...document.querySelectorAll('div[aria-label="Message Body"][contenteditable="true"],div[role="textbox"][contenteditable="true"]')]
            .find(el => el.offsetParent !== null);
          const content = (box?.textContent || '').toLowerCase();
          return JSON.stringify({{ok: content.includes({json.dumps(needle)}), preview: content.slice(0,120)}});
        }})()"""
    )


def click_send() -> dict:
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


def send_reply(body: str, *hints: str) -> bool:
    steps = {
        "open": open_thread(*hints),
        "read": read_current_thread(),
        "reply": click_reply(),
        "fill": fill_body(body),
        "verify": verify_compose(body),
    }
    verify_data = steps["verify"].get("data", {})
    if not (isinstance(verify_data, dict) and verify_data.get("ok")):
        return False
    send = click_send()
    return isinstance(send.get("data"), dict) and send["data"].get("ok", False)


def open_compose(to: str, subject: str) -> dict:
    url = (
        f"https://mail.google.com/mail/u/{GMAIL_ACCOUNT}/?view=cm&fs=1"
        f"&to={urllib.parse.quote(to)}"
        f"&su={urllib.parse.quote(subject)}"
    )
    cmd("navigate", {"url": url})
    time.sleep(3)
    return {"ok": True, "data": {"ok": True, "to": to, "subject": subject}}


def send_reply_on_open_thread(body: str) -> bool:
    click_reply()
    fill_body(body)
    verify_data = verify_compose(body).get("data", {})
    if not (isinstance(verify_data, dict) and verify_data.get("ok")):
        return False
    send = click_send()
    return isinstance(send.get("data"), dict) and send["data"].get("ok", False)
