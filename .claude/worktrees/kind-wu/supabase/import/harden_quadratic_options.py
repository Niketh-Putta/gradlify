#!/usr/bin/env python3
"""Harden quadratic multiple-choice options by generating more plausible distractors.

Targets quadratic-solving questions identified by question text.
Updates wrong_answers + all_answers to three harder, root-pair distractors.
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
from typing import Any, Dict, List, Tuple

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
REPORT_PATH = os.path.join("tmp", "quadratic_option_hardening.json")


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


def _auth_headers(service_key: str) -> Dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }


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


def fetch_page(*, supabase_url: str, headers: Dict[str, str], limit: int, offset: int, subtopic: str | None) -> List[Dict[str, Any]]:
    params = {
        "select": "id,question,correct_answer,wrong_answers,all_answers,subtopic",
        "limit": str(limit),
        "offset": str(offset),
    }
    if subtopic:
        params["subtopic"] = f"eq.{subtopic}"
    else:
        params["or"] = "(question.ilike.*quadratic*,question.ilike.*x^2*,question.ilike.*x²*,question.ilike.*x^{2}*)"
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(params, safe='(),.*')}"
    status, body = _http_json("GET", url, headers, payload=None)
    if status != 200:
        raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
    return json.loads(body or "[]")


def patch_row(*, supabase_url: str, headers: Dict[str, str], row_id: str, updates: Dict[str, Any]) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=eq.{row_id}"
    status, body = _http_json("PATCH", url, headers, payload=updates)
    if status not in (200, 204):
        raise SystemExit(f"Failed to update row {row_id} (status={status}): {body}")


def parse_roots(answer: str) -> Tuple[float, float] | None:
    if not answer:
        return None
    nums = re.findall(r"-?\d+(?:\.\d+)?", answer)
    if len(nums) == 1:
        try:
            r = float(nums[0])
        except ValueError:
            return None
        return r, r
    if len(nums) < 2:
        return None
    try:
        r1 = float(nums[0])
        r2 = float(nums[1])
    except ValueError:
        return None
    return r1, r2


def _fmt_num(value: float) -> str:
    if abs(value) < 1e-9:
        value = 0.0
    if abs(value - round(value)) < 1e-9:
        return str(int(round(value)))
    text = f"{value:.3f}".rstrip("0").rstrip(".")
    return text


def format_pair(a: float, b: float) -> str:
    lo, hi = (a, b) if a <= b else (b, a)
    return f"x = {_fmt_num(lo)} or x = {_fmt_num(hi)}"


def pair_key(a: float, b: float) -> Tuple[float, float]:
    lo, hi = (a, b) if a <= b else (b, a)
    return (round(lo, 6), round(hi, 6))


def generate_distractors(r1: float, r2: float) -> List[str]:
    candidates: List[Tuple[float, float]] = []

    if abs(r1 - r2) < 1e-9:
        candidates.extend([
            (r1 + 1, r1 + 1),
            (r1 - 1, r1 - 1),
            (r1 + 2, r1 + 2),
            (r1 - 2, r1 - 2),
            (-r1, -r1),
        ])
    else:
        candidates.extend([
            (r1 + 1, r2),
            (r1, r2 + 1),
            (r1 - 1, r2),
            (r1, r2 - 1),
            (r1 + 1, r2 - 1),
            (r1 - 1, r2 + 1),
            (r1 + 1, r2 + 1),
            (r1 - 1, r2 - 1),
            (-r1, r2),
            (r1, -r2),
            (-r1, -r2),
            (r1 + 2, r2),
            (r1, r2 + 2),
            (r1 - 2, r2),
            (r1, r2 - 2),
        ])

    correct_key = pair_key(r1, r2)
    seen_keys = {correct_key}
    wrongs: List[str] = []

    for a, b in candidates:
        key = pair_key(a, b)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        wrongs.append(format_pair(a, b))
        if len(wrongs) >= 3:
            break

    return wrongs


def normalize_correct_pair(text: str, roots: Tuple[float, float]) -> str:
    """Force correct answer into x = a or x = b form."""
    r1, r2 = roots
    normalized = format_pair(r1, r2)
    # Preserve original ordering if it already matches two values
    if text and ("or" in text or "," in text):
        return normalized
    return normalized


def main() -> None:
    parser = argparse.ArgumentParser(description="Harden quadratic answer options for exam_questions.")
    parser.add_argument("--limit", type=int, default=500, help="Rows per page.")
    parser.add_argument("--sleep", type=float, default=0.03, help="Sleep between updates (seconds).")
    parser.add_argument("--subtopic", default="algebra|quadratics", help="Subtopic to target (default: algebra|quadratics).")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    limit = max(1, args.limit)
    offset = 0
    updated = 0
    skipped = 0
    scanned = 0
    samples: List[Dict[str, Any]] = []

    while True:
        rows = fetch_page(
            supabase_url=supabase_url,
            headers=headers,
            limit=limit,
            offset=offset,
            subtopic=args.subtopic or None,
        )
        if not rows:
            break
        for row in rows:
            scanned += 1
            correct = str(row.get("correct_answer") or "").strip()
            roots = parse_roots(correct)
            if not roots:
                skipped += 1
                continue
            r1, r2 = roots
            normalized_correct = normalize_correct_pair(correct, (r1, r2))
            wrongs = generate_distractors(r1, r2)
            if len(wrongs) < 3:
                skipped += 1
                continue

            updates = {
                "correct_answer": normalized_correct,
                "wrong_answers": wrongs,
                "all_answers": [normalized_correct, *wrongs],
            }
            patch_row(supabase_url=supabase_url, headers=headers, row_id=row["id"], updates=updates)
            updated += 1
            if len(samples) < 10:
                samples.append({
                    "id": row["id"],
                    "question": row.get("question"),
                    "correct": correct,
                    "wrong_answers": wrongs,
                })
            if args.sleep:
                time.sleep(args.sleep)
        offset += limit

    report = {
        "scanned": scanned,
        "updated": updated,
        "skipped": skipped,
        "samples": samples,
    }

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
