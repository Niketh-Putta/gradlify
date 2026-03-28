#!/usr/bin/env python3
"""Find + delete exam_questions rows by substring matching (client-side scan).

Why:
- PostgREST filters can be awkward when the search text contains parentheses or
  other characters. This script fetches rows in pages and matches locally.

Requires env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Usage:
  python3 supabase/import/remove_questions_by_substring_scan.py --contains "4(2x" --dry-run
  python3 supabase/import/remove_questions_by_substring_scan.py --contains "Solve the equation" --contains "4(2x"

Notes:
- Matches are case-insensitive.
- Only matches against the `question` field (not explanation).
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
        f"?select=id,question&limit={limit}&offset={offset}"
    )
    status, body = _http_json("GET", url, headers, payload=None)
    if status != 200:
        raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
    return json.loads(body or "[]")


def find_ids(*, supabase_url: str, headers: Dict[str, str], needles: List[str]) -> List[Tuple[str, str]]:
    needles_norm = [n.strip().lower() for n in needles if n and n.strip()]
    if not needles_norm:
        return []

    limit = 1000
    offset = 0
    matches: List[Tuple[str, str]] = []

    while True:
        rows = fetch_page(supabase_url=supabase_url, headers=headers, limit=limit, offset=offset)
        if not rows:
            break

        for r in rows:
            qid = str(r.get("id") or "").strip()
            q = str(r.get("question") or "")
            q_norm = q.lower()
            if qid and all(n in q_norm for n in needles_norm):
                matches.append((qid, q))

        offset += limit

    return matches


def delete_ids(*, supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        print("No matching rows to delete")
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
    ap.add_argument("--contains", action="append", default=[], help="Substring that must appear in question (case-insensitive). Can repeat.")
    ap.add_argument("--dry-run", action="store_true", help="Only print matches; do not delete")
    args = ap.parse_args(argv)

    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    matches = find_ids(supabase_url=supabase_url, headers=headers, needles=args.contains)
    print(f"Matched rows: {len(matches)}")
    for qid, q in matches[:20]:
        snippet = q.replace("\n", " ").strip()
        if len(snippet) > 180:
            snippet = snippet[:180] + "…"
        print(f"- {qid}: {snippet}")

    if args.dry_run:
        return 0

    delete_ids(supabase_url=supabase_url, headers=headers, ids=[m[0] for m in matches])
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
