#!/usr/bin/env python3
"""Upload generated images to Supabase Storage and insert rows into `public.exam_questions`.

Requires env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Notes:
- This script is meant to be run locally by you. Do NOT hardcode keys.
- Assumes Storage bucket is public and named `questions` by default.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Tuple


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


def read_csv_rows(csv_path: Path) -> List[Dict[str, str]]:
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def infer_images_dir_from_csv(csv_path: Path) -> Path:
    # matches generate_bulk_questions.py layout
    return csv_path.parent / "images"


def upload_images(*, supabase_url: str, service_key: str, bucket: str, rows: List[Dict[str, str]], images_dir: Path, upsert: bool) -> None:
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    # No-op if CSV has no images.
    image_keys = [(r.get("image_url") or "").strip() for r in rows]
    image_keys = [k for k in image_keys if k]
    if not image_keys:
        print("No images to upload")
        return

    images_dir = images_dir.resolve()
    if not images_dir.exists():
        raise SystemExit(f"Images directory not found: {images_dir}")

    uploaded = 0
    skipped = 0
    for r in rows:
        key = (r.get("image_url") or "").strip()
        if not key:
            skipped += 1
            continue
        local_file = images_dir / f"{(r.get('id') or '').strip()}.svg"
        if not local_file.exists():
            raise SystemExit(f"Missing local image for id={r.get('id')}: {local_file}")

        url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{key}"
        if upsert:
            url = url + "?upsert=true"

        status, body = _http_upload(
            "POST",
            url,
            {**headers, "x-upsert": "true" if upsert else "false"},
            local_file.read_bytes(),
            content_type="image/svg+xml",
        )
        if status not in (200, 201):
            raise SystemExit(f"Image upload failed (status={status}) for {key}: {body}")
        uploaded += 1

        if uploaded % 200 == 0:
            print(f"Uploaded {uploaded} images...")

    print(f"Images uploaded: {uploaded} (skipped: {skipped})")


def coerce_row_for_insert(r: Dict[str, str]) -> Dict[str, Any]:
    # Only include fields that exist in DB schema.
    wrong_answers_raw = (r.get("wrong_answers") or "[]").strip()
    wrong_answers = json.loads(wrong_answers_raw) if wrong_answers_raw else []
    if not isinstance(wrong_answers, list):
        raise ValueError("wrong_answers must be a JSON array")

    def _int(name: str, default: int | None = None) -> int | None:
        v = (r.get(name) or "").strip()
        if v == "":
            return default
        return int(v)

    payload: Dict[str, Any] = {
        "question_type": (r.get("question_type") or "").strip() or None,
        "tier": (r.get("tier") or "").strip() or None,
        "calculator": (r.get("calculator") or "").strip() or None,
        "subtopic": (r.get("subtopic") or "").strip() or None,
        "question": (r.get("question") or "").strip() or None,
        "correct_answer": (r.get("correct_answer") or "").strip() or None,
        "wrong_answers": wrong_answers,
        "marks": _int("marks"),
        "difficulty": _int("difficulty"),
        "estimated_time_sec": _int("estimated_time_sec"),
        "image_url": (r.get("image_url") or "").strip() or None,
        "image_alt": (r.get("image_alt") or "").strip() or None,
        "explanation": (r.get("explanation") or "").strip() or None,
    }

    track = (r.get("track") or "").strip()
    if track:
        payload["track"] = track

    # If the CSV doesn't specify an id, omit it entirely so Postgres can use the column default.
    # Inserting `NULL` would violate NOT NULL constraints.
    id_str = (r.get("id") or "").strip()
    if id_str:
        payload["id"] = id_str

    return payload


def insert_rows(*, supabase_url: str, service_key: str, rows: List[Dict[str, str]], upsert: bool, chunk_size: int) -> None:
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Prefer": "return=minimal" + (",resolution=merge-duplicates" if upsert else ""),
    }

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
    if upsert:
        endpoint = endpoint + "?on_conflict=id"

    payload_rows = [coerce_row_for_insert(r) for r in rows]
    total = len(payload_rows)
    for start in range(0, total, chunk_size):
        chunk = payload_rows[start : start + chunk_size]
        status, body = _http_json("POST", endpoint, headers, chunk, timeout=120)
        if status not in (201, 200):
            raise SystemExit(f"Insert failed (status={status}) at chunk starting {start}: {body}")
        print(f"Inserted {min(start + chunk_size, total)}/{total} rows")
        time.sleep(0.05)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Upload images + insert exam_questions from CSV")
    p.add_argument("csv", help="Path to CSV (from generator)")
    p.add_argument("--bucket", default="questions", help="Supabase Storage bucket name")
    p.add_argument("--images-dir", default=None, help="Directory containing SVGs; defaults to <csv_dir>/images")
    p.add_argument("--no-upsert", action="store_true", help="Disable upsert (merge duplicates)")
    p.add_argument("--chunk-size", type=int, default=500, help="Rows per insert request")
    p.add_argument("--skip-images", action="store_true", help="Skip image uploads")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")

    csv_path = Path(args.csv).resolve()
    if not csv_path.exists():
        raise SystemExit(f"CSV not found: {csv_path}")

    rows = read_csv_rows(csv_path)
    if not rows:
        raise SystemExit("CSV had no data rows")

    images_dir = Path(args.images_dir).resolve() if args.images_dir else infer_images_dir_from_csv(csv_path)

    upsert = not args.no_upsert
    print(f"Rows: {len(rows)}")
    print(f"Bucket: {args.bucket}")
    print(f"Images dir: {images_dir}")
    print(f"Upsert: {upsert}")

    if not args.skip_images:
        upload_images(
            supabase_url=supabase_url,
            service_key=service_key,
            bucket=args.bucket,
            rows=rows,
            images_dir=images_dir,
            upsert=upsert,
        )
    else:
        print("Skipping image uploads")

    insert_rows(
        supabase_url=supabase_url,
        service_key=service_key,
        rows=rows,
        upsert=upsert,
        chunk_size=args.chunk_size,
    )

    print("Done.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        sys.exit(130)
