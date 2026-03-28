#!/usr/bin/env python3
"""Top up Algebra mini-subtopics to exactly 60 total questions each.

Target distribution:
- Prefer 30 Foundation + 30 Higher
- If Higher cannot reach 30 within attempts, fill remaining gap in Foundation.
"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
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


def _http_json(method: str, url: str, headers: Dict[str, str], payload: Any | None, timeout: int = 120) -> Tuple[int, str]:
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
    except Exception as e:
        return 599, str(e)


def load_subtopics(mapping_path: str) -> List[str]:
    with open(mapping_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    ids: List[str] = []
    for topic in data.get("topics", []):
        if topic.get("topicName") != "Algebra":
            continue
        topic_key = topic.get("topicKey")
        for sub in topic.get("subtopics", []):
            sub_key = sub.get("key")
            if topic_key and sub_key:
                ids.append(f"{topic_key}|{sub_key}")
    return ids


def fetch_counts(supabase_url: str, headers: Dict[str, str], subtopic_id: str) -> Dict[str, int]:
    query = {"select": "tier", "subtopic": f"eq.{subtopic_id}", "limit": "1000"}
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(query)}"
    status, body = _http_json("GET", url, headers, payload=None, timeout=120)
    if status != 200:
        raise SystemExit(f"Fetch failed ({status}): {body}")
    rows = json.loads(body or "[]")
    counts: Dict[str, int] = {}
    for row in rows:
        tier = row.get("tier") or "unknown"
        counts[tier] = counts.get(tier, 0) + 1
    return counts


def call_generate(
    supabase_url: str,
    headers: Dict[str, str],
    subtopic_id: str,
    tier: str,
    count: int,
    calculator_type: str,
) -> Tuple[List[Dict[str, Any]] | None, int, str]:
    url = f"{supabase_url.rstrip('/')}/functions/v1/generate-questions"
    payload = {
        "action": "generate",
        "topic": "Algebra",
        "tier": tier,
        "count": int(count),
        "calculatorType": calculator_type,
        "forceImages": False,
        "subtopicId": subtopic_id,
    }
    status, body = _http_json("POST", url, headers, payload=payload, timeout=180)
    if status != 200:
        return None, status, body
    data = json.loads(body or "{}")
    return (data.get("questions") or []), status, body


def call_insert(supabase_url: str, headers: Dict[str, str], questions: List[Dict[str, Any]]) -> int:
    if not questions:
        return 0
    url = f"{supabase_url.rstrip('/')}/functions/v1/generate-questions"
    payload = {"action": "insert", "questions": questions}
    status, body = _http_json("POST", url, headers, payload=payload, timeout=180)
    if status != 200:
        raise SystemExit(f"Insert failed ({status}): {body}")
    data = json.loads(body or "{}")
    return int(data.get("inserted") or 0)


def topup_tier(
    supabase_url: str,
    headers: Dict[str, str],
    subtopic_id: str,
    tier: str,
    missing: int,
    batch_size: int,
    max_attempts: int,
    calculator_type: str,
    sleep: float,
) -> int:
    attempts = 0
    remaining = missing
    while remaining > 0 and attempts < max_attempts:
        attempts += 1
        batch = min(batch_size, remaining)
        questions, status, body = call_generate(
            supabase_url,
            headers,
            subtopic_id=subtopic_id,
            tier=tier,
            count=batch,
            calculator_type=calculator_type,
        )
        if questions is None:
            if status in (429, 500, 502, 503, 504, 546, 599) or "WORKER_LIMIT" in body:
                time.sleep(max(sleep * 3, 2.0))
                continue
            raise SystemExit(f"Generate failed ({status}): {body}")

        if not questions:
            time.sleep(sleep)
            continue
        inserted = call_insert(supabase_url, headers, questions)
        remaining -= inserted
        time.sleep(sleep)
    return remaining


def main() -> None:
    parser = argparse.ArgumentParser(description="Top up Algebra subtopics to 60 total.")
    parser.add_argument("--mapping", default="supabase/import/gcse_mini_subtopics.json")
    parser.add_argument("--target-total", type=int, default=60)
    parser.add_argument("--target-per-tier", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=3)
    parser.add_argument("--max-attempts", type=int, default=10)
    parser.add_argument("--calculator-type", default="both", choices=["both", "calculator", "non-calculator"])
    parser.add_argument("--sleep", type=float, default=0.8)
    parser.add_argument("--subtopic", help="Limit to a specific subtopic id (e.g. algebra|factorise).")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    subtopics = load_subtopics(args.mapping)
    for subtopic_id in subtopics:
        if args.subtopic and args.subtopic != subtopic_id:
            continue
        counts = fetch_counts(supabase_url, headers, subtopic_id)
        foundation = counts.get("Foundation Tier", 0)
        higher = counts.get("Higher Tier", 0)
        total = foundation + higher

        if total >= args.target_total:
            print(f"{subtopic_id}: already {total} (F {foundation} / H {higher})")
            continue

        target_f = max(0, args.target_per_tier - foundation)
        target_h = max(0, args.target_per_tier - higher)

        print(f"{subtopic_id}: starting F {foundation}, H {higher}, total {total}")

        if target_h > 0:
            _ = topup_tier(
                supabase_url,
                headers,
                subtopic_id,
                "Higher Tier",
                target_h,
                args.batch_size,
                args.max_attempts,
                args.calculator_type,
                args.sleep,
            )

        if target_f > 0:
            _ = topup_tier(
                supabase_url,
                headers,
                subtopic_id,
                "Foundation Tier",
                target_f,
                args.batch_size,
                args.max_attempts,
                args.calculator_type,
                args.sleep,
            )

        counts = fetch_counts(supabase_url, headers, subtopic_id)
        foundation = counts.get("Foundation Tier", 0)
        higher = counts.get("Higher Tier", 0)
        total = foundation + higher
        if total < args.target_total:
            gap = args.target_total - total
            print(f"{subtopic_id}: filling remaining gap {gap} with Foundation")
            _ = topup_tier(
                supabase_url,
                headers,
                subtopic_id,
                "Foundation Tier",
                gap,
                args.batch_size,
                args.max_attempts,
                args.calculator_type,
                args.sleep,
            )

        counts = fetch_counts(supabase_url, headers, subtopic_id)
        foundation = counts.get("Foundation Tier", 0)
        higher = counts.get("Higher Tier", 0)
        total = foundation + higher
        print(f"{subtopic_id}: final F {foundation} / H {higher} = {total}")


if __name__ == "__main__":
    main()
