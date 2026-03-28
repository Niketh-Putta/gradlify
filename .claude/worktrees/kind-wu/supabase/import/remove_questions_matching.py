#!/usr/bin/env python3
"""Delete selected exam_questions rows by matching text.

Requires env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Examples:
  python3 supabase/import/remove_questions_matching.py --contains "basketball players" --contains "a_n" --dry-run
  python3 supabase/import/remove_questions_matching.py --contains "basketball players" --contains "a_n"

This script:
1) Finds matching rows (case-insensitive contains match against `question`).
2) Deletes those rows by id.

It is intentionally conservative: use --dry-run first.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Tuple


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


def _http(method: str, url: str, headers: Dict[str, str], timeout: int = 60) -> Tuple[int, str]:
    req = urllib.request.Request(url=url, data=None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def _auth_headers(service_key: str) -> Dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }


def _chunk(items: List[str], size: int) -> List[List[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def fetch_matching_ids(*, supabase_url: str, headers: Dict[str, str], contains: List[str], limit: int = 1000) -> List[str]:
    """Fetch ids where question ilike any *contains* pattern."""

    patterns = [c.strip() for c in contains if c and c.strip()]
    if not patterns:
        return []

    # PostgREST OR filter: or=(question.ilike.*foo*,question.ilike.*bar*)
    or_parts = []
    for p in patterns:
        # Escape % and * that might confuse; we use ilike with * wildcard.
        safe = p.replace("*", " ")
        # URL encode later; leave '*' wildcards in query.
        or_parts.append(f"question.ilike.*{safe}*")

    # Fetch matching ids in pages.
    ids: List[str] = []
    offset = 0
    while True:
        or_expr = f"({','.join(or_parts)})"
        query = {
            "select": "id",
            "or": or_expr,
            "limit": str(limit),
            "offset": str(offset),
        }
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(query, safe='()*.,=') }"
        status, body = _http_json("GET", url, headers, payload=None)
        if status != 200:
            raise SystemExit(f"Failed to fetch matches (status={status}): {body}")
        data = json.loads(body or "[]")
        page = [str(r.get("id")) for r in data if r.get("id")]
        if not page:
            break
        ids.extend(page)
        offset += limit

    # de-dupe
    seen = set()
    uniq: List[str] = []
    for i in ids:
        if i in seen:
            continue
        seen.add(i)
        uniq.append(i)
    return uniq


def delete_by_ids(*, supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
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
    ap.add_argument("--contains", action="append", default=[], help="Case-insensitive substring to match within question text")
    ap.add_argument("--dry-run", action="store_true", help="Only print how many rows would be deleted")
    args = ap.parse_args(argv)

    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    ids = fetch_matching_ids(supabase_url=supabase_url, headers=headers, contains=args.contains)
    print(f"Matched rows: {len(ids)}")

    if args.dry_run:
        return 0

    delete_by_ids(supabase_url=supabase_url, headers=headers, ids=ids)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
