#!/usr/bin/env python3
"""Replace a small set of Ratio & Proportion questions with image-based versions.

Adds image-based questions for:
- ratio|ratio_share (bar model)
- ratio|similarity_scale (similar triangles)

Keeps total questions per subtopic at 60 by deleting the same number first.
No AI calls.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import uuid
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Tuple


ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
BUCKET = "questions"


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


def _http_upload(method: str, url: str, headers: Dict[str, str], file_bytes: bytes, content_type: str, timeout: int = 120) -> Tuple[int, str]:
    headers = {**headers, "Content-Type": content_type}
    req = urllib.request.Request(url=url, data=file_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def delete_latest(*, supabase_url: str, headers: Dict[str, str], subtopic: str, count: int) -> None:
    query = {
        "select": "id",
        "subtopic": f"eq.{subtopic}",
        "order": "id.desc",
        "limit": str(count),
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(query)}"
    status, body = _http_json("GET", url, headers, payload=None, timeout=60)
    if status != 200:
        raise SystemExit(f"Fetch failed ({status}): {body}")
    rows = json.loads(body or "[]")
    ids = [r["id"] for r in rows]
    if not ids:
        return
    quoted = ",".join(f"\"{i}\"" for i in ids)
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
    status, body = _http_json("DELETE", url, headers, payload=None, timeout=60)
    if status not in (200, 204):
        raise SystemExit(f"Delete failed ({status}): {body}")


def upload_svg(*, supabase_url: str, headers: Dict[str, str], key: str, svg: str) -> None:
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/{BUCKET}/{key}?upsert=true"
    status, body = _http_upload("POST", url, headers, svg.encode("utf-8"), "image/svg+xml", timeout=120)
    if status not in (200, 201):
        raise SystemExit(f"Upload failed ({status}): {body}")


def insert_rows(*, supabase_url: str, headers: Dict[str, str], rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
    status, body = _http_json("POST", url, headers, payload=rows, timeout=120)
    if status not in (200, 201):
        raise SystemExit(f"Insert failed ({status}): {body}")


def svg_bar_model(a: int, b: int, c: int) -> str:
    total = a + b + c
    width = 360
    height = 40
    x = 20
    y = 40
    seg_a = int(width * a / total)
    seg_b = int(width * b / total)
    seg_c = width - seg_a - seg_b

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120">
  <rect x="{x}" y="{y}" width="{seg_a}" height="{height}" fill="#DCEBFF" stroke="#2F6BFF"/>
  <rect x="{x + seg_a}" y="{y}" width="{seg_b}" height="{height}" fill="#E8F0FF" stroke="#2F6BFF"/>
  <rect x="{x + seg_a + seg_b}" y="{y}" width="{seg_c}" height="{height}" fill="#F2F6FF" stroke="#2F6BFF"/>
  <text x="{x + seg_a/2}" y="{y - 8}" font-size="14" text-anchor="middle" fill="#1B3A8A">A</text>
  <text x="{x + seg_a + seg_b/2}" y="{y - 8}" font-size="14" text-anchor="middle" fill="#1B3A8A">B</text>
  <text x="{x + seg_a + seg_b + seg_c/2}" y="{y - 8}" font-size="14" text-anchor="middle" fill="#1B3A8A">C</text>
</svg>"""


def svg_similar_triangles(small: int, large: int) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="420" height="160">
  <polygon points="40,120 120,120 80,40" fill="#F2F6FF" stroke="#2F6BFF" stroke-width="2"/>
  <polygon points="220,140 380,140 300,20" fill="#E8F0FF" stroke="#2F6BFF" stroke-width="2"/>
  <text x="80" y="135" font-size="14" text-anchor="middle" fill="#1B3A8A">{small} cm</text>
  <text x="300" y="155" font-size="14" text-anchor="middle" fill="#1B3A8A">{large} cm</text>
  <text x="80" y="30" font-size="12" text-anchor="middle" fill="#1B3A8A">Triangle A</text>
  <text x="300" y="10" font-size="12" text-anchor="middle" fill="#1B3A8A">Triangle B</text>
</svg>"""


def ratio_share_question() -> Tuple[Dict[str, Any], str]:
    a, b, c = (2, 3, 5)
    total = 120
    part = total / (a + b + c)
    A, B, C = int(a * part), int(b * part), int(c * part)
    question = "Using the bar model, split £120 in the ratio 2:3:5."
    correct = f"£{A}, £{B}, £{C}"
    wrong = [f"£{B}, £{A}, £{C}", f"£{A+5}, £{B-5}, £{C}", f"£{A}, £{C}, £{B}"]
    explanation = (
        "Step 1: Add the parts of the ratio.\n"
        "2 + 3 + 5 = 10\n\n"
        "Step 2: Find the value of one part.\n"
        "£120 ÷ 10 = £12\n\n"
        "Step 3: Multiply each part.\n"
        f"A = 2×£12 = £{A}, B = 3×£12 = £{B}, C = 5×£12 = £{C}\n\n"
        f"Final answer: £{A}, £{B}, £{C}"
    )
    svg = svg_bar_model(a, b, c)
    return (
        {
            "question": question,
            "correct_answer": correct,
            "wrong_answers": wrong,
            "all_answers": [correct, *wrong],
            "explanation": explanation,
            "question_type": "Ratio & Proportion",
            "subtopic": "ratio|ratio_share",
            "tier": "Foundation Tier",
            "calculator": "Non-Calculator",
            "difficulty": 2,
            "marks": 2,
            "estimated_time_sec": 90,
        },
        svg,
    )


def similarity_question() -> Tuple[Dict[str, Any], str]:
    small = 6
    large = 15
    scale = large / small
    question = "Using the diagram of similar triangles, find the scale factor from Triangle A to Triangle B."
    correct = str(scale)
    wrong = [str(small / large), "9", "2"]
    explanation = (
        "Step 1: Identify corresponding sides.\n"
        f"Triangle A side = {small} cm, Triangle B side = {large} cm.\n\n"
        "Step 2: Divide larger by smaller to get the scale factor.\n"
        f"{large} ÷ {small} = {scale}\n\n"
        f"Final answer: {scale}"
    )
    svg = svg_similar_triangles(small, large)
    return (
        {
            "question": question,
            "correct_answer": correct,
            "wrong_answers": wrong,
            "all_answers": [correct, *wrong],
            "explanation": explanation,
            "question_type": "Ratio & Proportion",
            "subtopic": "ratio|similarity_scale",
            "tier": "Foundation Tier",
            "calculator": "Non-Calculator",
            "difficulty": 2,
            "marks": 2,
            "estimated_time_sec": 90,
        },
        svg,
    )


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    timestamp = dt.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    base_key = f"generated/ratio_diagrams_{timestamp}"

    # Replace 5 each to keep total at 60.
    for subtopic in ("ratio|ratio_share", "ratio|similarity_scale"):
        delete_latest(supabase_url=supabase_url, headers=headers, subtopic=subtopic, count=5)

    rows: List[Dict[str, Any]] = []
    uploads: List[Tuple[str, str]] = []

    for _ in range(5):
        row, svg = ratio_share_question()
        uid = str(uuid.uuid4())
        key = f"{base_key}/{uid}.svg"
        row["id"] = uid
        row["image_url"] = key
        row["image_alt"] = "Bar model for ratio share."
        rows.append(row)
        uploads.append((key, svg))

    for _ in range(5):
        row, svg = similarity_question()
        uid = str(uuid.uuid4())
        key = f"{base_key}/{uid}.svg"
        row["id"] = uid
        row["image_url"] = key
        row["image_alt"] = "Two similar triangles for scale factor."
        rows.append(row)
        uploads.append((key, svg))

    for key, svg in uploads:
        upload_svg(supabase_url=supabase_url, headers=headers, key=key, svg=svg)

    insert_rows(supabase_url=supabase_url, headers=headers, rows=rows)
    print("Inserted 10 image-based ratio questions.")


if __name__ == "__main__":
    main()
