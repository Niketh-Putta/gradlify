#!/usr/bin/env python3
"""Audit exam_questions for duplicates and math-quality issues (read-only).

Checks:
- Exact duplicates by signature (question+correct+wrong+explanation) within subtopic.
- Duplicate question text within subtopic.
- Explanation final answer mismatch vs correct_answer.
- Quadratic questions missing two solutions or weak explanation.

Writes a JSON report to tmp/question_bank_audit.json.
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any, Dict, List, Tuple

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
REPORT_PATH = os.path.join("tmp", "question_bank_audit.json")


def _load_env(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), value)


def _env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise SystemExit(f"Missing required env var: {name}")
    return v


def _http_json(method: str, url: str, headers: Dict[str, str], payload: Any | None, timeout: int = 60) -> Tuple[int, str]:
    data = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}
        data = body
    req = urllib.request.Request(url=url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def fetch_all(*, supabase_url: str, headers: Dict[str, str], limit: int = 1000) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        params = {
            "select": "id,question,correct_answer,wrong_answers,explanation,subtopic,tier,calculator,question_type",
            "limit": str(limit),
            "offset": str(offset),
        }
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(params)}"
        status, body = _http_json("GET", url, headers, payload=None, timeout=60)
        if status != 200:
            raise SystemExit(f"Fetch failed ({status}): {body}")
        batch = json.loads(body or "[]")
        if not batch:
            break
        rows.extend(batch)
        offset += limit
    return rows


def signature(row: Dict[str, Any]) -> str:
    q = str(row.get("question") or "").strip()
    c = str(row.get("correct_answer") or "").strip()
    w = row.get("wrong_answers") or []
    if not isinstance(w, list):
        w = [str(w)]
    w = [str(x).strip() for x in w]
    e = str(row.get("explanation") or "").strip()
    return "||".join([q, c, json.dumps(w, sort_keys=True), e])


def normalize_answer(text: str) -> str:
    raw = str(text or "").strip().lower()
    raw = raw.replace("−", "-").replace("×", "x")
    raw = raw.replace("\\pi", "pi").replace("π", "pi")
    raw = re.sub(r"\\text\s*\{([^}]*)\}", r"\1", raw)
    raw = re.sub(r"\\mathrm\s*\{([^}]*)\}", r"\1", raw)
    raw = raw.replace(" ", "")
    raw = raw.replace("{", "").replace("}", "")
    return raw


def extract_final_answer(explanation: str) -> str | None:
    if not explanation:
        return None
    for line in reversed(explanation.splitlines()):
        m = re.search(r"Final answer\s*:\s*(.+)$", line.strip(), re.I)
        if m:
            return m.group(1).strip()
    return None


def is_quadratic_question(question: str) -> bool:
    q = (question or "").lower()
    return "quadratic" in q or re.search(r"x\s*\^\s*2", q) or "x²" in q


def has_two_solutions(answer: str) -> bool:
    a = (answer or "").lower()
    if "or" in a or "," in a:
        return True
    # allow x = -2 and x = 3
    nums = re.findall(r"-?\d+(?:\.\d+)?", a)
    return len(nums) >= 2


def explanation_detailed(explanation: str) -> bool:
    if not explanation:
        return False
    if "Step" in explanation:
        return True
    if len(explanation) >= 80:
        return True
    return False


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    rows = fetch_all(supabase_url=supabase_url, headers=headers)

    dup_sig = defaultdict(list)
    dup_q = defaultdict(list)
    mismatch = []
    quad_issues = []

    for r in rows:
        sub = str(r.get("subtopic") or "unknown")
        q = str(r.get("question") or "").strip()
        sig = signature(r)
        dup_sig[(sub, sig)].append(r["id"])
        if q:
            dup_q[(sub, q)].append(r["id"])

        exp = str(r.get("explanation") or "")
        correct = str(r.get("correct_answer") or "")
        extracted = extract_final_answer(exp)
        if extracted:
            if normalize_answer(extracted) != normalize_answer(correct):
                mismatch.append({"id": r["id"], "subtopic": sub, "question": q, "correct": correct, "final": extracted})

        if is_quadratic_question(q):
            if not has_two_solutions(correct) or not explanation_detailed(exp):
                quad_issues.append({
                    "id": r["id"],
                    "subtopic": sub,
                    "question": q,
                    "correct": correct,
                    "explanation": exp[:200],
                    "has_two_solutions": has_two_solutions(correct),
                    "explanation_detailed": explanation_detailed(exp),
                })

    dup_sig_list = [{"subtopic": k[0], "count": len(v), "ids": v} for k, v in dup_sig.items() if len(v) > 1]
    dup_q_list = [{"subtopic": k[0], "count": len(v), "ids": v} for k, v in dup_q.items() if len(v) > 1]

    report = {
        "total_rows": len(rows),
        "duplicate_signatures": len(dup_sig_list),
        "duplicate_questions": len(dup_q_list),
        "explanation_mismatch": len(mismatch),
        "quadratic_issues": len(quad_issues),
        "samples": {
            "duplicate_signatures": dup_sig_list[:20],
            "duplicate_questions": dup_q_list[:20],
            "explanation_mismatch": mismatch[:20],
            "quadratic_issues": quad_issues[:20],
        },
    }

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
