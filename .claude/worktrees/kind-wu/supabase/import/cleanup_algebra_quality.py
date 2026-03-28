#!/usr/bin/env python3
"""Cleanup Algebra questions for LaTeX clarity and explanation quality (no AI).

Actions:
- Normalize common LaTeX issues (missing backslashes, double-escaped commands).
- Delete questions with weak explanations or malformed braces.
- Top up back to 60 using deterministic templates.
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Tuple


ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")


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


def fetch_page(*, supabase_url: str, headers: Dict[str, str], limit: int, offset: int) -> List[Dict[str, Any]]:
    url = (
        f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
        f"?select=id,question,correct_answer,wrong_answers,all_answers,explanation,subtopic,question_type"
        f"&subtopic=like.algebra|%25"
        f"&order=id&limit={limit}&offset={offset}"
    )
    status, body = _http_json("GET", url, headers, payload=None, timeout=60)
    if status != 200:
        raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
    return json.loads(body or "[]")


def patch_row(*, supabase_url: str, headers: Dict[str, str], row_id: str, updates: Dict[str, Any]) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=eq.{row_id}"
    status, body = _http_json("PATCH", url, headers, payload=updates, timeout=60)
    if status not in (200, 204):
        raise SystemExit(f"Failed to update row {row_id} (status={status}): {body}")


def delete_rows(*, supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        return
    chunk_size = 100
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i+chunk_size]
        quoted = ",".join(f"\"{cid}\"" for cid in chunk)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http_json("DELETE", url, headers, payload=None, timeout=60)
        if status not in (200, 204):
            raise SystemExit(f"Failed to delete rows (status={status}): {body}")


def normalize_latex(text: str) -> str:
    if not text:
        return text
    result = text
    result = result.replace("−", "-")
    result = re.sub(r"(?<!\\)sqrt\{", r"\\sqrt{", result)
    result = re.sub(r"(?<!\\)sqrt\[", r"\\sqrt[", result)
    result = re.sub(r"(?<!\\)sqrt\(([^)]+)\)", r"\\sqrt{\1}", result)
    result = re.sub(r"(?<!\\)frac\{", r"\\frac{", result)
    result = re.sub(r"(?<!\\)overline\{", r"\\overline{", result)
    result = re.sub(r"\\\\(sqrt|frac|overline|times|div|cdot|pi|theta|alpha|beta|gamma|delta|sigma|omega|leq|geq|neq|approx|Rightarrow|rightarrow|Leftarrow|leftrightarrow)\b", r"\\\1", result)
    return result


def fix_times_as_variable(text: str) -> str:
    """Replace incorrect multiplication sign used as variable x in Algebra questions."""
    if not text or "×" not in text:
        return text

    result = text
    # Replace ×^... with x^...
    result = re.sub(r"×\s*\^\s*\{", "x^{", result)
    result = re.sub(r"×\s*\^\s*", "x^", result)

    # Replace coefficient × followed by +, -, =, or end (e.g., 3× + 2 -> 3x + 2)
    result = re.sub(r"(\d)\s*×\s*(?=[+\-=/)])", r"\1x ", result)
    result = re.sub(r"(\d)\s*×\s*$", r"\1x", result)

    # Replace standalone × used as variable (e.g., × + 2 = 5)
    result = re.sub(r"(^|[\s(])×\s*(?=[+\-=/)])", r"\1x ", result)
    result = re.sub(r"(^|[\s(])×\s*$", r"\1x", result)

    return result


def braces_balanced(text: str) -> bool:
    if not text:
        return True
    return text.count("{") == text.count("}")


def explanation_ok(text: str) -> bool:
    if not text:
        return False
    if len(text) < 40:
        return False
    if "Step 1" not in text:
        return False
    if "Final answer" not in text:
        return False
    return True


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    limit = 500
    offset = 0
    to_delete: List[str] = []
    updated_rows = 0
    scanned = 0

    while True:
        rows = fetch_page(supabase_url=supabase_url, headers=headers, limit=limit, offset=offset)
        if not rows:
            break
        for row in rows:
            scanned += 1
            updates: Dict[str, Any] = {}

            question = str(row.get("question") or "")
            correct = str(row.get("correct_answer") or "")
            explanation = str(row.get("explanation") or "")
            wrongs = row.get("wrong_answers") or []
            all_answers = row.get("all_answers") or []

            # Normalize LaTeX fields
            q_norm = fix_times_as_variable(normalize_latex(question))
            if q_norm != question:
                updates["question"] = q_norm

            c_norm = fix_times_as_variable(normalize_latex(correct))
            if c_norm != correct:
                updates["correct_answer"] = c_norm

            w_norm = []
            w_changed = False
            for w in wrongs:
                wv = fix_times_as_variable(normalize_latex(str(w)))
                w_norm.append(wv)
                if wv != w:
                    w_changed = True
            if w_changed:
                updates["wrong_answers"] = w_norm

            a_norm = []
            a_changed = False
            for a in all_answers:
                av = fix_times_as_variable(normalize_latex(str(a)))
                a_norm.append(av)
                if av != a:
                    a_changed = True
            if a_changed:
                updates["all_answers"] = a_norm

            e_norm = fix_times_as_variable(normalize_latex(explanation))
            if e_norm != explanation:
                updates["explanation"] = e_norm

            # Reject malformed braces or weak explanations
            if not braces_balanced(q_norm) or not braces_balanced(c_norm) or not braces_balanced(e_norm):
                to_delete.append(row["id"])
                continue
            if not explanation_ok(e_norm):
                to_delete.append(row["id"])
                continue

            if updates:
                patch_row(supabase_url=supabase_url, headers=headers, row_id=row["id"], updates=updates)
                updated_rows += 1
                time.sleep(0.02)

        offset += limit

    if to_delete:
        delete_rows(supabase_url=supabase_url, headers=headers, ids=to_delete)

    print(f"Scanned: {scanned}")
    print(f"Updated: {updated_rows}")
    print(f"Deleted: {len(to_delete)}")


if __name__ == "__main__":
    main()
