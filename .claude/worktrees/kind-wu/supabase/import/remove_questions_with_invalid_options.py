#!/usr/bin/env python3
"""Find + delete `exam_questions` rows with invalid MCQ option sets.

Rules enforced (matches app expectations):
- `correct_answer` must be non-empty
- `wrong_answers` must be a JSON array with exactly 3 non-empty strings
- `wrong_answers` must be unique (case-sensitive, trimmed)
- `wrong_answers` must not include `correct_answer`

Requires env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Usage:
  python3 supabase/import/remove_questions_with_invalid_options.py --dry-run
  python3 supabase/import/remove_questions_with_invalid_options.py

Notes:
- Matches against stored values; it does not attempt to re-solve math.
- This is safe cleanup for the "only 2 answers" bug caused by short/malformed wrong_answers.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Iterable, List, Tuple


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


def _http(method: str, url: str, headers: Dict[str, str], timeout: int = 60) -> Tuple[int, str]:
    req = urllib.request.Request(url=url, data=None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def _chunk(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def fetch_page(*, supabase_url: str, headers: Dict[str, str], limit: int, offset: int) -> List[Dict[str, Any]]:
    url = (
        f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
        f"?select=id,question,correct_answer,wrong_answers,all_answers&limit={limit}&offset={offset}"
    )
    status, body = _http_json("GET", url, headers, payload=None)
    if status != 200:
        raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
    return json.loads(body or "[]")


def _as_string_list(value: Any) -> List[str] | None:
    if value is None:
        return None
    if isinstance(value, list):
        out: List[str] = []
        for v in value:
            if v is None:
                continue
            out.append(str(v))
        return out
    # Some older rows may store wrong_answers as a string; treat as invalid.
    return None


def validate_row(row: Dict[str, Any]) -> str | None:
    correct = str(row.get("correct_answer") or "").strip()
    if not correct:
        return "missing correct_answer"

    wrong = _as_string_list(row.get("wrong_answers"))
    if wrong is None:
        return "wrong_answers missing or not an array"

    wrong_norm = [w.strip() for w in wrong if str(w).strip()]
    if len(wrong_norm) != 3:
        return f"wrong_answers length != 3 (got {len(wrong_norm)})"

    if len(set(wrong_norm)) != 3:
        return "wrong_answers contains duplicates"

    if correct in wrong_norm:
        return "wrong_answers includes correct_answer"

    # Optional: if all_answers is present, it should be 4 long and include correct.
    all_ans = _as_string_list(row.get("all_answers"))
    if all_ans is not None:
        all_norm = [a.strip() for a in all_ans if str(a).strip()]
        if len(all_norm) < 4:
            return f"all_answers length < 4 (got {len(all_norm)})"
        if correct not in all_norm:
            return "all_answers does not include correct_answer"

    return None


def find_invalid(*, supabase_url: str, headers: Dict[str, str]) -> List[Tuple[str, str, str]]:
    limit = 1000
    offset = 0
    invalid: List[Tuple[str, str, str]] = []

    while True:
        rows = fetch_page(supabase_url=supabase_url, headers=headers, limit=limit, offset=offset)
        if not rows:
            break

        for r in rows:
            qid = str(r.get("id") or "").strip()
            q = str(r.get("question") or "")
            reason = validate_row(r)
            if qid and reason:
                invalid.append((qid, reason, q))

        offset += limit

    return invalid


def delete_ids(*, supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        print("No invalid rows to delete")
        return

    print(f"Deleting {len(ids)} rows from exam_questions...")
    deleted = 0
    for batch in _chunk(ids, 200):
        quoted = ",".join(batch)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http("DELETE", url, headers, timeout=120)
        if status not in (200, 204):
            raise SystemExit(f"Row delete failed (status={status}): {body}")
        deleted += len(batch)
        time.sleep(0.02)

    print(f"Deleted rows: {deleted}")


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Only print summary; do not delete")
    ap.add_argument("--show", type=int, default=20, help="How many sample rows to print")
    args = ap.parse_args(argv)

    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    invalid = find_invalid(supabase_url=supabase_url, headers=headers)
    print(f"Invalid rows: {len(invalid)}")

    for qid, reason, q in invalid[: max(0, args.show)]:
        snippet = q.replace("\n", " ").strip()
        if len(snippet) > 160:
            snippet = snippet[:160] + "…"
        print(f"- {qid}: {reason}: {snippet}")

    if args.dry_run:
        return 0

    delete_ids(supabase_url=supabase_url, headers=headers, ids=[x[0] for x in invalid])
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
