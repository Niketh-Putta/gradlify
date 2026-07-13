#!/usr/bin/env python3
"""Fill YC Startup School 2026 application via Kimi WebBridge."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from kimi_webbridge_lib import cmd, healthy, health, navigate, snapshot  # noqa: E402

URL = "https://events.ycombinator.com/startup-school-2026"
SESSION = "gradlify-yc-apply"

ANSWERS = {
    "test_scores": """11+ (sat at age 10): offers from QE Boys, Wilson's School, Eton College, and every selective school I applied to.

SAT: 1530 at age 14 (took it early to see where I stood vs US applicants).""",
    "entrepreneurship": """Founder @ Gradlify — running it like a real company, not a school project. ~10 hrs/day.

Built and grew a 450+ parent WhatsApp community (The Level Field) around free 11+ resources, then converted serious families into paid mock exams and Premium subscriptions.

LinkedIn: ~2.5k followers, posting founder/builder content in public (distribution is half the job).""",
    "competitions": """No formal research papers yet.

Selective school admissions outcome above is the main "competition" result — 11+ at 10, multiple top grammar/independent offers.

Running live timed 11+ mocks with 70+ families registered for the June mock (GL-style, examiner-backed format).""",
    "things_built": """Gradlify — https://gradlify.com
AI-powered 11+ maths and English prep for UK families. Timed mocks, score + weak-topic feedback, live mock exam product, Premium subscriptions. I built the stack, content pipeline, checkout, and distribution myself. ~240 signups, paying customers, ~£120 MRR, growing through parent WhatsApp groups and direct sales.

Also cloned a 1M+ user consumer app in 8 hours with AI coding agents (posted the build on LinkedIn — was a speed run to prove how fast you can ship if you stop overthinking).

Jarvis — personal AI ops stack I bought and wired into how I run Gradlify (email, outreach, browser automation). Not pretty, but it lets one person operate like a small team.""",
    "hack": """I wanted a proper AI agent setup (Jarvis) without waiting on enterprise sales or paying stupid money for something I could wire up myself.

The "system" was basically access: who has the tool, who controls the waitlist, and who decides what counts as a real setup. I found someone already running a Jarvis-style stack, bought it off them directly, and negotiated to keep their config and prompts instead of starting from zero.

That sounds small. It wasn't. I went from watching other founders tweet about their agents to actually running mine the same week — handling Gmail, outreach, and ops while I'm still in school and building Gradlify on the side.

The hack was realising the bottleneck wasn't code. It was access. I bought my way past the queue and spent my time on distribution instead of reinventing an agent framework.""",
    "impressive": """At 14 I scored 1530 on the SAT while building Gradlify — a live 11+ prep product with real paying parents, timed GL-style mocks, and ~£120 MRR I grew mostly through WhatsApp and sales calls, not ads.""",
}

FILL_JS = """
(() => {
  const answers = %s;
  const text = document.body.innerText || '';
  const filled = [];
  const setTextarea = (needle, value) => {
    const labels = [...document.querySelectorAll('label, p, div, h3, h4, span')];
    for (const el of labels) {
      const t = (el.innerText || '').trim();
      if (!t.includes(needle)) continue;
      let root = el.closest('div');
      for (let i = 0; i < 6 && root; i++) {
        const ta = root.querySelector('textarea');
        if (ta) {
          ta.focus();
          ta.value = value;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
          filled.push(needle);
          return true;
        }
        root = root.parentElement;
      }
    }
    return false;
  };
  const setInput = (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    filled.push(selector);
    return true;
  };

  setTextarea('test scores', answers.test_scores);
  setTextarea('entrepreneurship programs', answers.entrepreneurship);
  setTextarea('competitions/awards', answers.competitions);
  setTextarea("things you've built", answers.things_built);
  setTextarea('hacked some', answers.hack);
  setTextarea('most impressive thing', answers.impressive);

  setInput('input[name="gender"]', 'Male');
  setInput('input[placeholder*="linkedin" i]', 'https://www.linkedin.com/in/niketh-putta-1086483a9');
  setInput('input[type="url"]', 'https://gradlify.com');

  const inputs = [...document.querySelectorAll('input[type="url"], input[type="text"]')];
  for (const input of inputs) {
    const ph = (input.placeholder || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    if (ph.includes('github') || name.includes('github')) {
      input.value = 'https://github.com/Niketh-Putta/exam-mate-genie';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      filled.push('github');
    }
    if (ph.includes('linkedin') || name.includes('linkedin')) {
      input.value = 'https://www.linkedin.com/in/niketh-putta-1086483a9';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      filled.push('linkedin');
    }
    if (ph.includes('website') || ph.includes('personal')) {
      input.value = 'https://gradlify.com';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      filled.push('website');
    }
  }

  return JSON.stringify({
    url: location.href,
    title: document.title,
    hasApply: text.toLowerCase().includes('apply'),
    filled,
    textareaCount: document.querySelectorAll('textarea').length,
    preview: text.slice(0, 500)
  });
})()
""" % json.dumps(ANSWERS)


def main() -> int:
    h = health()
    print("WebBridge:", json.dumps(h))
    if not healthy():
        print("BLOCKED: extension not connected. Open Atlas + Kimi extension, then re-run.")
        return 1

    print("Navigating to", URL)
    nav = navigate(URL, session=SESSION, new_tab=True)
    print("navigate:", json.dumps(nav)[:500])
    time.sleep(4)

    snap = snapshot(session=SESSION)
    print("snapshot ok:", snap.get("ok"), "len:", len(json.dumps(snap)) if snap else 0)

    # Click Apply / RSVP if visible
    click_apply = cmd(
        "evaluate",
        {
            "code": """
(() => {
  const btns = [...document.querySelectorAll('button, a')];
  const apply = btns.find(b => /apply|register|rsvp/i.test(b.innerText || ''));
  if (apply) { apply.click(); return 'clicked:' + apply.innerText; }
  return 'no apply button';
})()
"""
        },
        session=SESSION,
    )
    print("apply click:", click_apply)
    time.sleep(3)

    fill = cmd("evaluate", {"code": FILL_JS}, session=SESSION)
    print("fill:", json.dumps(fill, indent=2)[:4000])

    shot = cmd("screenshot", {}, session=SESSION)
    print("screenshot ok:", shot.get("ok"))

    cmd("close_session", {"session": SESSION}, session=SESSION)
    print("DONE — review form in browser, fill DOB/education/work manually if needed, then submit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
