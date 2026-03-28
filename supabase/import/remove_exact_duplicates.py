#!/usr/bin/env python3
"""Remove exact duplicate question texts within a subtopic for selected topics."""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any, Dict, List, Tuple

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")

TARGET_TOPICS = {"Number", "Algebra", "Ratio & Proportion"}


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


def fetch_all(*, supabase_url: str, headers: Dict[str, str]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    limit = 1000
    offset = 0
    while True:
        url = (
            f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
            f"?select=id,question,subtopic,question_type"
            f"&limit={limit}&offset={offset}"
        )
        status, body = _http_json("GET", url, headers, payload=None, timeout=60)
        if status != 200:
            raise SystemExit(f"Fetch failed ({status}): {body}")
        batch = json.loads(body or "[]")
        if not batch:
            break
        rows.extend(batch)
        offset += limit
    return rows


def delete_ids(*, supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        return
    chunk = 100
    for i in range(0, len(ids), chunk):
        part = ids[i:i+chunk]
        quoted = ",".join(f"\"{pid}\"" for pid in part)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http_json("DELETE", url, headers, payload=None, timeout=60)
        if status not in (200, 204):
            raise SystemExit(f"Delete failed ({status}): {body}")


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    rows = fetch_all(supabase_url=supabase_url, headers=headers)
    filtered = [r for r in rows if r.get("question_type") in TARGET_TOPICS]

    to_delete: List[str] = []
    by_sub = defaultdict(list)
    for r in filtered:
        q = (r.get("question") or "").strip()
        sub = r.get("subtopic") or "unknown"
        if q:
            by_sub[sub].append((q, r["id"]))

    for sub, items in by_sub.items():
        seen = {}
        for q, rid in items:
            if q in seen:
                to_delete.append(rid)
            else:
                seen[q] = rid

    delete_ids(supabase_url=supabase_url, headers=headers, ids=to_delete)
    print(f"Deleted duplicates: {len(to_delete)}")


if __name__ == "__main__":
    main()
