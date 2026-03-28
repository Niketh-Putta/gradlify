#!/usr/bin/env python3
"""Remove exact duplicate questions within each subtopic.

Exact duplicate signature: question + correct_answer + wrong_answers + explanation.
Keeps the highest-quality row (longer explanation, longer question), deletes the rest.
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
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


def _chunk(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def fetch_all(*, supabase_url: str, headers: Dict[str, str], limit: int = 1000) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        params = {
            "select": "id,question,correct_answer,wrong_answers,explanation,subtopic,tier,calculator,created_at",
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


def quality_key(row: Dict[str, Any]) -> Tuple[int, int, str]:
    qlen = len(str(row.get("question") or ""))
    elen = len(str(row.get("explanation") or ""))
    created = str(row.get("created_at") or "")
    return (elen, qlen, created)


def delete_ids(*, supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        return
    for batch in _chunk(ids, 200):
        quoted = ",".join(f"\"{cid}\"" for cid in batch)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http("DELETE", url, headers, timeout=120)
        if status not in (200, 204):
            raise SystemExit(f"Delete failed ({status}): {body}")
        time.sleep(0.02)


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    rows = fetch_all(supabase_url=supabase_url, headers=headers)
    by_sub: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for r in rows:
        sub = str(r.get("subtopic") or "unknown")
        sig = signature(r)
        by_sub.setdefault(sub, {}).setdefault(sig, []).append(r)

    to_delete: List[str] = []
    for sub, sigs in by_sub.items():
        for sig, items in sigs.items():
            if len(items) <= 1:
                continue
            items.sort(key=quality_key, reverse=True)
            keep = items[0]
            for item in items[1:]:
                to_delete.append(str(item.get("id")))

    delete_ids(supabase_url=supabase_url, headers=headers, ids=to_delete)
    print(f"Deleted duplicates: {len(to_delete)}")


if __name__ == "__main__":
    main()
