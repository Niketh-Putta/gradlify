#!/usr/bin/env python3
"""Replace low-quality Surds questions with clear, exact-surds versions."""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Tuple

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


def _load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required env var: {name}")
    return value


def _http_json(method: str, url: str, headers: Dict[str, str], payload: Any | None, timeout: int = 120) -> Tuple[int, str]:
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}
    req = urllib.request.Request(url=url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def _has_surd(text: str) -> bool:
    return "\\sqrt" in text or "√" in text


def _step_count(explanation: str) -> int:
    return sum(1 for line in explanation.splitlines() if line.strip().lower().startswith("step"))


def fetch_surds(supabase_url: str, headers: Dict[str, str]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    limit = 1000
    offset = 0
    while True:
        query = {
            "select": "id,question,correct_answer,wrong_answers,explanation,tier",
            "subtopic": "eq.number|surds",
            "limit": str(limit),
            "offset": str(offset),
        }
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(query)}"
        status, body = _http_json("GET", url, headers, payload=None, timeout=120)
        if status != 200:
            raise SystemExit(f"Fetch failed ({status}): {body}")
        batch = json.loads(body or "[]")
        if not batch:
            break
        out.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return out


def classify_bad(rows: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    bad: List[Dict[str, Any]] = []
    tier_counts: Dict[str, int] = {}
    for row in rows:
        question = str(row.get("question") or "")
        answer = str(row.get("correct_answer") or "")
        explanation = str(row.get("explanation") or "")
        wrongs = row.get("wrong_answers") or []
        if not isinstance(wrongs, list):
            wrongs = []

        if not _has_surd(question):
            bad.append(row)
        elif not _has_surd(answer):
            bad.append(row)
        elif not _has_surd(explanation) or _step_count(explanation) < 3:
            bad.append(row)
        elif not all(_has_surd(str(w)) for w in wrongs):
            bad.append(row)

    for row in bad:
        tier = str(row.get("tier") or "Foundation Tier")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    return bad, tier_counts


def delete_rows(supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        return
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        chunk = ids[i : i + batch_size]
        quoted = ",".join(f"\"{cid}\"" for cid in chunk)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http_json("DELETE", url, headers, payload=None, timeout=120)
        if status not in (200, 204):
            raise SystemExit(f"Delete failed ({status}): {body}")


def generate_questions(
    supabase_url: str,
    headers: Dict[str, str],
    tier: str,
    count: int,
) -> List[Dict[str, Any]]:
    url = f"{supabase_url.rstrip('/')}/functions/v1/generate-questions"
    payload = {
        "action": "generate",
        "topic": "Number",
        "tier": tier,
        "count": int(count),
        "calculatorType": "both",
        "forceImages": False,
        "subtopicId": "number|surds",
    }
    status, body = _http_json("POST", url, headers, payload=payload, timeout=180)
    if status != 200:
        raise SystemExit(f"Generate failed ({status}): {body}")
    data = json.loads(body or "{}")
    return data.get("questions") or []


def insert_questions(supabase_url: str, headers: Dict[str, str], questions: List[Dict[str, Any]]) -> int:
    if not questions:
        return 0
    url = f"{supabase_url.rstrip('/')}/functions/v1/generate-questions"
    payload = {"action": "insert", "questions": questions}
    status, body = _http_json("POST", url, headers, payload=payload, timeout=180)
    if status != 200:
        raise SystemExit(f"Insert failed ({status}): {body}")
    data = json.loads(body or "{}")
    return int(data.get("inserted") or 0)


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    rows = fetch_surds(supabase_url, headers)
    bad_rows, tier_counts = classify_bad(rows)
    print(f"Surds total: {len(rows)}")
    print(f"Bad surds: {len(bad_rows)}")
    print("Bad by tier:", tier_counts)

    if not bad_rows:
        print("No bad surds found. Nothing to replace.")
        return

    delete_ids = [str(r["id"]) for r in bad_rows]
    delete_rows(supabase_url, headers, delete_ids)
    print(f"Deleted {len(delete_ids)} bad surd questions.")

    for tier, count in tier_counts.items():
        remaining = count
        while remaining > 0:
            batch = min(5, remaining)
            questions = generate_questions(supabase_url, headers, tier=tier, count=batch)
            if not questions:
                print(f"Warning: no questions generated for {tier}, retrying...")
                time.sleep(1.5)
                continue
            inserted = insert_questions(supabase_url, headers, questions)
            remaining -= inserted
            print(f"{tier}: inserted {inserted}, remaining {remaining}")
            time.sleep(0.5)


if __name__ == "__main__":
    main()
