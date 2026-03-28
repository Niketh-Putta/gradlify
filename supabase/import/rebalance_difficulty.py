#!/usr/bin/env python3
"""Rebalance difficulty labels for Number, Algebra, Ratio & Proportion.

Uses a simple complexity score to ensure clear separation between difficulty levels.
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
MINI_SUBTOPICS_PATH = os.path.join(os.path.dirname(__file__), "gcse_mini_subtopics.json")
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


def _load_subtopic_ids() -> List[str]:
    with open(MINI_SUBTOPICS_PATH, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    subtopics: List[str] = []
    for topic in data.get("topics", []):
        if topic.get("topicName") not in TARGET_TOPICS:
            continue
        topic_key = topic.get("topicKey")
        for sub in topic.get("subtopics", []):
            sub_key = sub.get("key")
            if topic_key and sub_key:
                subtopics.append(f"{topic_key}|{sub_key}")
    return subtopics


def fetch_subtopic(*, supabase_url: str, headers: Dict[str, str], subtopic_id: str) -> List[Dict[str, Any]]:
    query = {
        "select": "id,question,explanation,difficulty,subtopic,question_type",
        "subtopic": f"eq.{subtopic_id}",
        "limit": "200",
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(query)}"
    status, body = _http_json("GET", url, headers, payload=None, timeout=120)
    if status != 200:
        raise SystemExit(f"Fetch failed ({status}) for {subtopic_id}: {body}")
    return json.loads(body or "[]")


def patch_row(*, supabase_url: str, headers: Dict[str, str], row_id: str, difficulty: int) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=eq.{row_id}"
    payload = {"difficulty": int(difficulty)}
    status, body = _http_json("PATCH", url, headers, payload=payload, timeout=60)
    if status not in (200, 204):
        raise SystemExit(f"Update failed ({status}): {body}")


def complexity_score(question: str, explanation: str) -> float:
    q = (question or "").lower()
    e = (explanation or "")
    step_count = len(re.findall(r"\bStep\s*\d+", e))
    length_score = min(len(q) / 120, 3)
    keyword_score = 0
    keywords = [
        "reverse", "compound", "directly", "inversely", "simultaneous", "quadratic",
        "inequal", "bounds", "standard form", "recurring", "scale factor", "enlarge",
        "ratio", "percent", "fraction", "surd", "proportion",
    ]
    for k in keywords:
        if k in q:
            keyword_score += 1
    return step_count * 1.2 + length_score + keyword_score * 0.6


def assign_difficulties(scores: List[Tuple[str, float]]) -> Dict[str, int]:
    # Sort by score, assign buckets 1-4 by percentiles.
    scores_sorted = sorted(scores, key=lambda x: x[1])
    n = len(scores_sorted)
    mapping: Dict[str, int] = {}
    for i, (row_id, _) in enumerate(scores_sorted):
        pct = i / max(1, n - 1)
        if pct < 0.2:
            diff = 1
        elif pct < 0.5:
            diff = 2
        elif pct < 0.8:
            diff = 3
        else:
            diff = 4
        mapping[row_id] = diff
    return mapping


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    subtopic_ids = _load_subtopic_ids()
    by_sub = defaultdict(list)
    for subtopic_id in subtopic_ids:
        rows = fetch_subtopic(supabase_url=supabase_url, headers=headers, subtopic_id=subtopic_id)
        for r in rows:
            if r.get("question_type") in TARGET_TOPICS:
                by_sub[subtopic_id].append(r)

    updated = 0
    for sub, items in by_sub.items():
        scores = [(r["id"], complexity_score(r.get("question") or "", r.get("explanation") or "")) for r in items]
        mapping = assign_difficulties(scores)
        for r in items:
            new_diff = mapping[r["id"]]
            if int(r.get("difficulty") or 0) != new_diff:
                patch_row(supabase_url=supabase_url, headers=headers, row_id=r["id"], difficulty=new_diff)
                updated += 1

    print(f"Updated difficulty labels: {updated}")


if __name__ == "__main__":
    main()
