#!/usr/bin/env python3
"""Top up exam_questions to a target count per subtopic/tier using the AI edge function.

Default target is 20 per tier (40 total per mini-subtopic).
"""

from __future__ import annotations

import argparse
import json
import os
import time
import re
import urllib.error
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


def fetch_all_counts(*, supabase_url: str, headers: Dict[str, str]) -> Dict[str, Dict[str, int]]:
    counts: Dict[str, Dict[str, int]] = {}
    limit = 1000
    offset = 0
    while True:
        url = (
            f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
            f"?select=subtopic,tier&limit={limit}&offset={offset}"
        )
        status, body = _http_json("GET", url, headers, payload=None, timeout=60)
        if status != 200:
            raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
        rows = json.loads(body or "[]")
        if not rows:
            break
        for row in rows:
            subtopic = row.get("subtopic") or "unknown"
            tier = row.get("tier") or "unknown"
            counts.setdefault(subtopic, {}).setdefault(tier, 0)
            counts[subtopic][tier] += 1
        offset += limit
    return counts


def load_subtopics(mapping_path: str) -> List[Dict[str, str]]:
    with open(mapping_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    out: List[Dict[str, str]] = []
    for topic in data.get("topics", []):
        topic_key = topic.get("topicKey")
        topic_name = topic.get("topicName")
        for sub in topic.get("subtopics", []):
            sub_key = sub.get("key")
            if not topic_key or not sub_key or not topic_name:
                continue
            out.append(
                {
                    "topic": topic_name,
                    "subtopic_id": f"{topic_key}|{sub_key}",
                }
            )
    return out


def is_leaky_conversion(question: str) -> bool:
    if not question:
        return False
    return bool(re.search(r"\\bconvert\\b.*\\bto\\s+\\d+(?:\\.\\d+)?\\s*[a-zA-Z/]+", question, re.I))


def answer_leaks_question(question: str, answer: str) -> bool:
    if not question or not answer:
        return False
    q = question.lower()
    a = answer.strip()
    if len(a) >= 3 and a.lower() in q:
        return True
    return is_leaky_conversion(question)


def call_generate(*, supabase_url: str, headers: Dict[str, str], topic: str, tier: str, subtopic_id: str, count: int, calculator_type: str, force_images: bool) -> List[Dict[str, Any]]:
    url = f"{supabase_url.rstrip('/')}/functions/v1/generate-questions"
    payload = {
        "action": "generate",
        "topic": topic,
        "tier": tier,
        "count": int(count),
        "calculatorType": calculator_type,
        "forceImages": bool(force_images),
        "subtopicId": subtopic_id,
    }
    status, body = _http_json("POST", url, headers, payload=payload, timeout=120)
    if status != 200:
        raise SystemExit(f"Generate failed ({status}): {body}")
    data = json.loads(body or "{}")
    questions = data.get("questions") or []
    return [q for q in questions if isinstance(q, dict)]


def call_insert(*, supabase_url: str, headers: Dict[str, str], questions: List[Dict[str, Any]]) -> Tuple[int, int]:
    url = f"{supabase_url.rstrip('/')}/functions/v1/generate-questions"
    payload = {
        "action": "insert",
        "questions": questions,
    }
    status, body = _http_json("POST", url, headers, payload=payload, timeout=120)
    if status != 200:
        raise SystemExit(f"Insert failed ({status}): {body}")
    data = json.loads(body or "{}")
    return int(data.get("inserted") or 0), int(data.get("skipped_duplicates") or 0)


def main() -> None:
    parser = argparse.ArgumentParser(description="Top up exam_questions per subtopic/tier.")
    parser.add_argument("--mapping", default="supabase/import/gcse_mini_subtopics.json")
    parser.add_argument("--target-per-tier", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=6)
    parser.add_argument("--max-attempts", type=int, default=6)
    parser.add_argument("--calculator-type", default="both", choices=["both", "calculator", "non-calculator"])
    parser.add_argument("--force-images", action="store_true")
    parser.add_argument("--topic", help="Limit to a specific topic name (e.g. 'Number').")
    parser.add_argument("--subtopic", help="Limit to a specific subtopic id (e.g. 'number|unit_conversions').")
    parser.add_argument("--max-combos", type=int, default=0, help="Limit how many subtopic/tier combos to process.")
    parser.add_argument("--sleep", type=float, default=0.6)
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    counts = fetch_all_counts(supabase_url=supabase_url, headers=headers)
    subtopics = load_subtopics(args.mapping)

    tiers = ["Foundation Tier", "Higher Tier"]
    total_inserted = 0
    combos_processed = 0

    for sub in subtopics:
        topic = sub["topic"]
        subtopic_id = sub["subtopic_id"]
        if args.topic and args.topic.lower() != topic.lower():
            continue
        if args.subtopic and args.subtopic != subtopic_id:
            continue
        for tier in tiers:
            existing = counts.get(subtopic_id, {}).get(tier, 0)
            missing = max(0, args.target_per_tier - existing)
            if missing <= 0:
                continue

            attempts = 0
            print(f"{topic} | {subtopic_id} | {tier}: need {missing}")
            while missing > 0 and attempts < args.max_attempts:
                attempts += 1
                batch = min(args.batch_size, missing)
                generated = call_generate(
                    supabase_url=supabase_url,
                    headers=headers,
                    topic=topic,
                    tier=tier,
                    subtopic_id=subtopic_id,
                    count=batch,
                    calculator_type=args.calculator_type,
                    force_images=args.force_images,
                )

                filtered = []
                for q in generated:
                    question = str(q.get("question") or "")
                    answer = str(q.get("correct_answer") or "")
                    if answer_leaks_question(question, answer):
                        continue
                    filtered.append(q)

                if not filtered:
                    time.sleep(args.sleep)
                    continue

                inserted, skipped = call_insert(supabase_url=supabase_url, headers=headers, questions=filtered)
                total_inserted += inserted
                existing += inserted
                missing = max(0, args.target_per_tier - existing)

                if args.sleep:
                    time.sleep(args.sleep)

            combos_processed += 1
            if args.max_combos and combos_processed >= args.max_combos:
                print(f"Reached max combos ({args.max_combos}).")
                print(f"Inserted {total_inserted} questions.")
                return

    print(f"Inserted {total_inserted} questions.")


if __name__ == "__main__":
    main()
