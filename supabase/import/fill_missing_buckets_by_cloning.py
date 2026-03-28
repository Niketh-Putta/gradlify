#!/usr/bin/env python3
"""Fill missing tier/calculator buckets by cloning high-quality questions within each subtopic.

Use when generation fails but you still need an exact 10/10/10/10 split.
Clones questions from the closest bucket (same calculator or same tier) without
removing the source questions.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional, Tuple

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
MAPPING_PATH = os.path.join(os.path.dirname(__file__), "gcse_mini_subtopics.json")

TIERS = ["Foundation Tier", "Higher Tier"]
CALCULATORS = ["Calculator", "Non-Calculator"]


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


def _auth_headers(service_key: str) -> Dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }


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


def fetch_subtopic_rows(*, supabase_url: str, headers: Dict[str, str], subtopic_id: str, limit: int = 1000) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        params = {
            "select": "id,question,correct_answer,wrong_answers,all_answers,explanation,subtopic,tier,calculator,question_type,difficulty,marks,estimated_time_sec,image_url,image_alt,explain_on",
            "subtopic": f"eq.{subtopic_id}",
            "order": "id",
            "limit": str(limit),
            "offset": str(offset),
        }
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(params)}"
        status, body = _http_json("GET", url, headers, payload=None, timeout=60)
        if status != 200:
            raise SystemExit(f"Failed to fetch rows for {subtopic_id} (status={status}): {body}")
        page = json.loads(body or "[]")
        if not page:
            break
        rows.extend(page)
        offset += limit
    return rows


def normalize_tier(value: Any) -> Optional[str]:
    raw = str(value or "").strip().lower()
    if raw.startswith("foundation"):
        return "Foundation Tier"
    if raw.startswith("higher"):
        return "Higher Tier"
    return None


def normalize_calculator(value: Any) -> Optional[str]:
    raw = str(value or "").strip().lower()
    if raw in ("calculator", "calc"):
        return "Calculator"
    if raw in ("non-calculator", "non calculator", "noncalculator", "non-calc", "noncalc"):
        return "Non-Calculator"
    return None


def quality_score(row: Dict[str, Any]) -> int:
    question = str(row.get("question") or "").strip()
    explanation = str(row.get("explanation") or "").strip()
    score = 0
    elen = len(explanation)
    if elen >= 140:
        score += 4
    elif elen >= 100:
        score += 3
    elif elen >= 70:
        score += 2
    elif elen >= 40:
        score += 1
    else:
        score -= 3
    if "Step" in explanation:
        score += 2
    if "Final answer" in explanation or "Answer:" in explanation:
        score += 1
    if len(question) >= 40:
        score += 1
    if row.get("image_url"):
        score += 1
    if re.search(r"\b(todo|tbd)\b", explanation, re.I):
        score -= 3
    if "??" in explanation:
        score -= 2
    return score


def pick_source_buckets(target_tier: str, target_calc: str) -> List[Tuple[str, str]]:
    other_tier = "Higher Tier" if target_tier == "Foundation Tier" else "Foundation Tier"
    other_calc = "Non-Calculator" if target_calc == "Calculator" else "Calculator"
    return [
        (other_tier, target_calc),
        (target_tier, other_calc),
        (other_tier, other_calc),
    ]


def clone_rows(rows: List[Dict[str, Any]], target_tier: str, target_calc: str, needed: int) -> List[Dict[str, Any]]:
    if not rows or needed <= 0:
        return []
    # Sort by quality desc; cycle if needed.
    ranked = sorted(rows, key=quality_score, reverse=True)
    clones: List[Dict[str, Any]] = []
    i = 0
    while len(clones) < needed:
        src = ranked[i % len(ranked)]
        i += 1
        clone = {k: v for k, v in src.items() if k != "id"}
        clone["tier"] = target_tier
        clone["calculator"] = target_calc
        clones.append(clone)
    return clones


def insert_rows(supabase_url: str, headers: Dict[str, str], rows: List[Dict[str, Any]], dry_run: bool) -> int:
    if not rows:
        return 0
    if dry_run:
        return len(rows)
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
    status, body = _http_json("POST", url, headers, payload=rows, timeout=120)
    if status not in (200, 201):
        raise SystemExit(f"Insert failed ({status}): {body}")
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Clone questions to fill missing bucket counts.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--target-per-bucket", type=int, default=10)
    parser.add_argument("--log-path", default="tmp/fill_missing_buckets_log.jsonl")
    parser.add_argument("--summary-path", default="tmp/fill_missing_buckets_summary.json")
    parser.add_argument("--sleep", type=float, default=0.02)
    parser.add_argument("--topic", help="Limit to a specific topic name (e.g. 'Number').")
    parser.add_argument("--subtopic", help="Limit to a specific subtopic id.")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    subtopics = load_subtopics(MAPPING_PATH)
    os.makedirs(os.path.dirname(args.log_path), exist_ok=True)

    summary = {
        "total_cloned": 0,
        "by_subtopic": {},
    }

    with open(args.log_path, "w", encoding="utf-8") as log_handle:
        for sub in subtopics:
            topic = sub["topic"]
            subtopic_id = sub["subtopic_id"]
            if args.topic and args.topic.lower() != topic.lower():
                continue
            if args.subtopic and args.subtopic != subtopic_id:
                continue

            rows = fetch_subtopic_rows(supabase_url=supabase_url, headers=headers, subtopic_id=subtopic_id)
            buckets: Dict[Tuple[str, str], List[Dict[str, Any]]] = {(t, c): [] for t in TIERS for c in CALCULATORS}

            for row in rows:
                tier = normalize_tier(row.get("tier"))
                calc = normalize_calculator(row.get("calculator"))
                if not tier or not calc:
                    continue
                buckets[(tier, calc)].append(row)

            sub_summary = {"cloned": 0, "targets": {}}

            for tier in TIERS:
                for calc in CALCULATORS:
                    current = buckets[(tier, calc)]
                    deficit = max(0, args.target_per_bucket - len(current))
                    if deficit <= 0:
                        continue

                    sources: List[Dict[str, Any]] = []
                    for src_bucket in pick_source_buckets(tier, calc):
                        candidates = buckets.get(src_bucket, [])
                        if candidates:
                            sources = candidates
                            break

                    if not sources:
                        log_handle.write(json.dumps({
                            "action": "skip",
                            "reason": "no_source_bucket",
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                            "needed": deficit,
                        }) + "\n")
                        continue

                    clones = clone_rows(sources, tier, calc, deficit)
                    inserted = insert_rows(supabase_url, headers, clones, args.dry_run)
                    summary["total_cloned"] += inserted
                    sub_summary["cloned"] += inserted
                    sub_summary["targets"][f"{tier} | {calc}"] = {
                        "needed": deficit,
                        "inserted": inserted,
                        "source": f"{normalize_tier(sources[0].get('tier'))} | {normalize_calculator(sources[0].get('calculator'))}",
                    }

                    log_handle.write(json.dumps({
                        "action": "clone",
                        "subtopic": subtopic_id,
                        "tier": tier,
                        "calculator": calc,
                        "needed": deficit,
                        "inserted": inserted,
                    }) + "\n")

                    if args.sleep:
                        time.sleep(args.sleep)

            if sub_summary["cloned"] > 0:
                summary["by_subtopic"][subtopic_id] = sub_summary

    os.makedirs(os.path.dirname(args.summary_path), exist_ok=True)
    with open(args.summary_path, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(json.dumps({
        "dry_run": bool(args.dry_run),
        "total_cloned": summary["total_cloned"],
        "log_path": args.log_path,
        "summary_path": args.summary_path,
    }, indent=2))


if __name__ == "__main__":
    main()
