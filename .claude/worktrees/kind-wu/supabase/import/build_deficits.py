#!/usr/bin/env python3
"""Build deficits.json for fill_deficits_unique.py (10 per bucket)."""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any, Dict, List

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
MAPPING_PATH = os.path.join(os.path.dirname(__file__), "gcse_mini_subtopics.json")
DEFICITS_PATH = os.path.join("tmp", "deficits.json")

TIERS = ["Foundation Tier", "Higher Tier"]
CALCS = ["Calculator", "Non-Calculator"]


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


def _http_json(method: str, url: str, headers: Dict[str, str], payload: Any | None, timeout: int = 60):
    data = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}
        data = body
    req = urllib.request.Request(url=url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", errors="replace")


def fetch_all_counts(supabase_url: str, headers: Dict[str, str], limit: int = 1000) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        params = {
            "select": "subtopic,tier,calculator",
            "limit": str(limit),
            "offset": str(offset),
        }
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(params)}"
        status, body = _http_json("GET", url, headers, payload=None)
        if status != 200:
            raise SystemExit(f"Fetch failed ({status}): {body}")
        batch = json.loads(body or "[]")
        if not batch:
            break
        rows.extend(batch)
        offset += limit
    return rows


def load_subtopics(mapping_path: str) -> List[str]:
    with open(mapping_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    out: List[str] = []
    for topic in data.get("topics", []):
        topic_key = topic.get("topicKey")
        for sub in topic.get("subtopics", []):
            key = sub.get("key")
            if topic_key and key:
                out.append(f"{topic_key}|{key}")
    return out


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    subtopics = load_subtopics(MAPPING_PATH)
    rows = fetch_all_counts(supabase_url, headers)

    counts = defaultdict(int)
    for r in rows:
        key = (r.get("subtopic"), r.get("tier"), r.get("calculator"))
        counts[key] += 1

    deficits: List[Dict[str, Any]] = []
    for sub in subtopics:
        for tier in TIERS:
            for calc in CALCS:
                current = counts.get((sub, tier, calc), 0)
                needed = max(0, 10 - current)
                if needed > 0:
                    deficits.append({
                        "subtopic": sub,
                        "tier": tier,
                        "calculator": calc,
                        "needed": needed,
                    })

    os.makedirs(os.path.dirname(DEFICITS_PATH), exist_ok=True)
    with open(DEFICITS_PATH, "w", encoding="utf-8") as handle:
        json.dump(deficits, handle, indent=2)

    print(f"Wrote {len(deficits)} deficits to {DEFICITS_PATH}")


if __name__ == "__main__":
    main()
