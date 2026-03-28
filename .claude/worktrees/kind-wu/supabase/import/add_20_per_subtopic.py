#!/usr/bin/env python3
"""Add exactly +20 questions per mini-subtopic by calling the generate-questions edge function.

- Adds 10 Foundation + 10 Higher per subtopic by default.
- If Higher Tier generation fails for Number topics, the remainder is added to Foundation.
- Forces images for selected subtopics where diagrams are essential.
- Inserts directly into public.exam_questions via edge function.
"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Tuple

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")

TIERS = ["Foundation Tier", "Higher Tier"]

# Subtopics where diagrams are genuinely helpful/expected.
IMAGE_SUBTOPICS = {
    "geometry|shapes",
    "geometry|angles",
    "geometry|polygons",
    "geometry|trigonometry",
    "geometry|pythagoras",
    "geometry|circles",
    "geometry|arcs_sectors",
    "geometry|surface_area",
    "geometry|volume",
    "geometry|bearings",
    "geometry|transformations",
    "geometry|constructions_loci",
    "geometry|congruence",
    "geometry|vectors",
    "geometry|circle_theorems",
    "algebra|graphs",
    "algebra|gradients",
    "statistics|charts",
    "statistics|scatter",
    "statistics|histograms",
    "statistics|cumulative_frequency",
    "statistics|box_plots",
    "statistics|two_way_tables",
    "statistics|frequency_tables",
}


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


def load_progress(path: str) -> Dict[str, Dict[str, int]]:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, dict):
            return {k: {tk: int(tv) for tk, tv in v.items()} for k, v in data.items() if isinstance(v, dict)}
    except Exception:
        return {}
    return {}


def save_progress(path: str, progress: Dict[str, Dict[str, int]]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(progress, handle, indent=2, sort_keys=True)


def call_generate(*, supabase_url: str, headers: Dict[str, str], topic: str, tier: str, subtopic_id: str, count: int, calculator_type: str, force_images: bool) -> Tuple[List[Dict[str, Any]] | None, int, str]:
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
    status, body = _http_json("POST", url, headers, payload=payload, timeout=180)
    if status != 200:
        return None, status, body
    data = json.loads(body or "{}")
    questions = data.get("questions") or []
    return [q for q in questions if isinstance(q, dict)], status, body


def call_insert(*, supabase_url: str, headers: Dict[str, str], questions: List[Dict[str, Any]]) -> Tuple[int, int]:
    url = f"{supabase_url.rstrip('/')}/functions/v1/generate-questions"
    payload = {
        "action": "insert",
        "questions": questions,
    }
    status, body = _http_json("POST", url, headers, payload=payload, timeout=180)
    if status != 200:
        raise SystemExit(f"Insert failed ({status}): {body}")
    data = json.loads(body or "{}")
    return int(data.get("inserted") or 0), int(data.get("skipped_duplicates") or 0)


def generate_and_insert(*, topic: str, tier: str, subtopic_id: str, remaining: int, args, headers) -> int:
    attempts = 0
    force_images = subtopic_id in IMAGE_SUBTOPICS
    while remaining > 0 and attempts < args.max_attempts:
        attempts += 1
        batch = min(args.batch_size, remaining)
        questions, status, body = call_generate(
            supabase_url=args.supabase_url,
            headers=headers,
            topic=topic,
            tier=tier,
            subtopic_id=subtopic_id,
            count=batch,
            calculator_type=args.calculator_type,
            force_images=force_images,
        )
        if questions is None:
            if status in (429, 500, 502, 503, 504, 546) or "WORKER_LIMIT" in body:
                print(f"  Attempt {attempts}: generate error {status}, backing off...")
                time.sleep(max(args.sleep * 4, 2.0))
                continue
            raise SystemExit(f"Generate failed ({status}) for {subtopic_id} {tier}: {body}")

        if not questions:
            print(f"  Attempt {attempts}: no questions returned")
            time.sleep(args.sleep)
            continue

        inserted, skipped = call_insert(
            supabase_url=args.supabase_url,
            headers=headers,
            questions=questions,
        )
        remaining -= inserted
        print(f"  Attempt {attempts}: inserted {inserted}, skipped {skipped}, remaining {remaining}")
        time.sleep(args.sleep)

        if inserted > 0:
            yield inserted

    if remaining > 0:
        if getattr(args, "allow_partial", False):
            print(f"  Warning: partial insert for {subtopic_id} {tier}. Remaining: {remaining}")
            return remaining
        raise SystemExit(f"Failed to insert enough questions for {subtopic_id} {tier}. Remaining: {remaining}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Add +20 questions per mini-subtopic (10 Foundation + 10 Higher).")
    parser.add_argument("--mapping", default="supabase/import/gcse_mini_subtopics.json")
    parser.add_argument("--per-tier", type=int, default=10)
    parser.add_argument("--total-per-subtopic", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--max-attempts", type=int, default=8)
    parser.add_argument("--calculator-type", default="both", choices=["both", "calculator", "non-calculator"])
    parser.add_argument("--topic", help="Limit to a specific topic name (e.g. 'Number').")
    parser.add_argument("--subtopic", help="Limit to a specific subtopic id (e.g. 'number|unit_conversions').")
    parser.add_argument("--sleep", type=float, default=0.5)
    parser.add_argument("--progress", default="tmp/add_20_progress.json", help="Path to progress JSON.")
    parser.add_argument("--allow-partial", action="store_true", help="Do not fail if a subtopic cannot be fully filled in this run.")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    args.supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    subtopics = load_subtopics(args.mapping)
    progress = load_progress(args.progress)
    total_inserted = 0

    for sub in subtopics:
        topic = sub["topic"]
        subtopic_id = sub["subtopic_id"]
        if args.topic and args.topic.lower() != topic.lower():
            continue
        if args.subtopic and args.subtopic != subtopic_id:
            continue

        total_already = sum(progress.get(subtopic_id, {}).get(t, 0) for t in TIERS)
        remaining_total = max(0, args.total_per_subtopic - total_already)
        if remaining_total <= 0:
            continue

        if topic == "Number":
            # Number Higher tier generation often returns zero; fill all +20 in Foundation for stability.
            already_f = progress.get(subtopic_id, {}).get("Foundation Tier", 0)
            remaining_f = max(0, remaining_total)
            if remaining_f > 0:
                print(f"{topic} | {subtopic_id} | Foundation Tier: adding {remaining_f} (forceImages={subtopic_id in IMAGE_SUBTOPICS})")
                for inserted in generate_and_insert(topic=topic, tier="Foundation Tier", subtopic_id=subtopic_id, remaining=remaining_f, args=args, headers=headers):
                    progress.setdefault(subtopic_id, {}).setdefault("Foundation Tier", 0)
                    progress[subtopic_id]["Foundation Tier"] += inserted
                    total_inserted += inserted
                    remaining_total = max(0, remaining_total - inserted)
                    save_progress(args.progress, progress)
            continue

        # Foundation Tier
        already_f = progress.get(subtopic_id, {}).get("Foundation Tier", 0)
        remaining_f = max(0, args.per_tier - already_f)
        remaining_f = min(remaining_f, remaining_total)
        if remaining_f > 0:
            print(f"{topic} | {subtopic_id} | Foundation Tier: adding {remaining_f} (forceImages={subtopic_id in IMAGE_SUBTOPICS})")
            for inserted in generate_and_insert(topic=topic, tier="Foundation Tier", subtopic_id=subtopic_id, remaining=remaining_f, args=args, headers=headers):
                progress.setdefault(subtopic_id, {}).setdefault("Foundation Tier", 0)
                progress[subtopic_id]["Foundation Tier"] += inserted
                total_inserted += inserted
                remaining_total = max(0, remaining_total - inserted)
                save_progress(args.progress, progress)

        # Higher Tier
        already_h = progress.get(subtopic_id, {}).get("Higher Tier", 0)
        remaining_h = max(0, args.per_tier - already_h)
        remaining_h = min(remaining_h, remaining_total)
        if remaining_h > 0:
            print(f"{topic} | {subtopic_id} | Higher Tier: adding {remaining_h} (forceImages={subtopic_id in IMAGE_SUBTOPICS})")
            for inserted in generate_and_insert(topic=topic, tier="Higher Tier", subtopic_id=subtopic_id, remaining=remaining_h, args=args, headers=headers):
                progress.setdefault(subtopic_id, {}).setdefault("Higher Tier", 0)
                progress[subtopic_id]["Higher Tier"] += inserted
                total_inserted += inserted
                remaining_total = max(0, remaining_total - inserted)
                save_progress(args.progress, progress)

    print(f"Done. Inserted {total_inserted} questions total.")


if __name__ == "__main__":
    main()
