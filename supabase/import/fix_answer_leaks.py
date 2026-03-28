#!/usr/bin/env python3
"""Remove answer leaks from question text in exam_questions.

Heuristics:
- Detect if correct_answer appears verbatim in question text.
- For unit-conversion style prompts (subtopic includes "unit"/"conversion" or question contains "convert"),
  rewrite "to <answer>" → "to <unit>" (e.g., "to m/s") when possible.
- Otherwise delete leaked questions to keep the bank clean.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Iterable, List, Tuple


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


def _auth_headers(service_key: str) -> Dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }


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
        f"?select=id,question,correct_answer,subtopic,question_type"
        f"&order=id&limit={limit}&offset={offset}"
    )
    status, body = _http_json("GET", url, headers, payload=None)
    if status != 200:
        raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
    return json.loads(body or "[]")


def _normalize_compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _answer_variants(answer: str) -> List[str]:
    raw = answer.strip()
    if not raw:
        return []
    variants = {raw}
    variants.add(re.sub(r"\s+", " ", raw))
    variants.add(raw.replace("\\pi", "π"))
    variants.add(raw.replace("\\pi", "pi"))
    variants.add(re.sub(r"[{}\\\\]", "", raw))
    return [v for v in variants if v]


def _extract_unit(answer: str) -> str:
    unit = answer
    unit = unit.replace("\\pi", "")
    unit = re.sub(r"[0-9.+\-\s]", "", unit)
    unit = unit.replace("{", "").replace("}", "")
    return unit.strip()


def _cleanup_spaces(text: str) -> str:
    text = re.sub(r"\s+([?.!,])", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


_CONVERSION_TARGET_RE = re.compile(r"\bconvert\b.*\bto\s+\d+(?:\.\d+)?\s*[a-zA-Z/]+", re.I)


def _has_conversion_target_number(question: str) -> bool:
    if not question:
        return False
    return bool(_CONVERSION_TARGET_RE.search(question))


def _try_fix_conversion(question: str, answer: str, variants: List[str]) -> str | None:
    unit = _extract_unit(answer)
    if not unit:
        return None

    for variant in sorted(variants, key=len, reverse=True):
        if len(variant) < 3:
            continue
        pattern = re.compile(rf"(to)\s*{re.escape(variant)}", re.IGNORECASE)
        if pattern.search(question):
            replacement = f"to {unit}"
            fixed = pattern.sub(replacement, question, count=1)
            return _cleanup_spaces(fixed)
    return None


def _has_leak(question: str, answer: str) -> bool:
    if not question or not answer:
        return False
    compact_answer = _normalize_compact(answer)
    if len(compact_answer) < 3:
        return False
    compact_question = _normalize_compact(question)
    if compact_answer and compact_answer in compact_question:
        return True

    question_lower = question.lower()
    for variant in _answer_variants(answer):
        if len(variant) < 3:
            continue
        if variant.lower() in question_lower:
            return True
    return False


def patch_row(*, supabase_url: str, headers: Dict[str, str], row_id: int, updates: Dict[str, Any]) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=eq.{row_id}"
    status, body = _http_json("PATCH", url, headers, payload=updates)
    if status not in (200, 204):
        raise SystemExit(f"Failed to update row {row_id} (status={status}): {body}")


def delete_row(*, supabase_url: str, headers: Dict[str, str], row_id: int) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=eq.{row_id}"
    status, body = _http_json("DELETE", url, headers, payload=None)
    if status not in (200, 204):
        raise SystemExit(f"Failed to delete row {row_id} (status={status}): {body}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fix answer leaks in exam_questions.")
    parser.add_argument("--limit", type=int, default=500, help="Rows per page.")
    parser.add_argument("--sleep", type=float, default=0.05, help="Sleep between updates (seconds).")
    parser.add_argument("--delete", action="store_true", help="Delete questions when not safely fixable.")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    limit = max(1, args.limit)
    offset = 0
    scanned = 0
    fixed = 0
    deleted = 0

    while True:
        rows = fetch_page(supabase_url=supabase_url, headers=headers, limit=limit, offset=offset)
        if not rows:
            break
        for row in rows:
            scanned += 1
            question = str(row.get("question") or "").strip()
            answer = str(row.get("correct_answer") or "").strip()
            if not question or not answer:
                continue
            has_conversion_target = _has_conversion_target_number(question)
            has_leak = _has_leak(question, answer)
            if not has_leak and not has_conversion_target:
                continue

            subtopic = str(row.get("subtopic") or "").lower()
            question_lower = question.lower()
            is_conversion = "convert" in question_lower or "conversion" in subtopic or "unit" in subtopic
            variants = _answer_variants(answer)

            if is_conversion:
                fixed_question = _try_fix_conversion(question, answer, variants)
                if fixed_question and fixed_question != question:
                    patch_row(
                        supabase_url=supabase_url,
                        headers=headers,
                        row_id=row["id"],
                        updates={"question": fixed_question},
                    )
                    fixed += 1
                    if args.sleep:
                        time.sleep(args.sleep)
                    continue

            if args.delete:
                delete_row(supabase_url=supabase_url, headers=headers, row_id=row["id"])
                deleted += 1
                if args.sleep:
                    time.sleep(args.sleep)

        offset += limit

    print(f"Scanned {scanned} rows. Fixed {fixed} questions. Deleted {deleted} questions.")


if __name__ == "__main__":
    main()
