#!/usr/bin/env python3
"""Cleanup helper: delete ALL exam_questions rows and related Storage images.

Requires env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

What it does (by default):
- Deletes Storage objects referenced by `exam_questions.image_url`
- Deletes ALL rows from `public.exam_questions`

Optional:
- Also deletes every object under a Storage prefix (default: generated/)

This uses stdlib-only HTTP calls (urllib), matching the other import scripts.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional, Tuple


def _env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise SystemExit(f"Missing required env var: {name}")
    return v


def _http_json(
    method: str,
    url: str,
    headers: Dict[str, str],
    payload: Any | None,
    timeout: int = 60,
) -> Tuple[int, str]:
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


def _http(
    method: str,
    url: str,
    headers: Dict[str, str],
    timeout: int = 60,
) -> Tuple[int, str]:
    req = urllib.request.Request(url=url, data=None, headers=headers, method=method)
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


def _chunk(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def fetch_exam_question_ids(*, supabase_url: str, headers: Dict[str, str], limit: int = 1000) -> List[str]:
    ids: List[str] = []
    offset = 0
    while True:
        url = (
            f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
            f"?select=id&limit={limit}&offset={offset}"
        )
        status, body = _http_json("GET", url, headers, payload=None)
        if status != 200:
            raise SystemExit(f"Failed to fetch ids (status={status}): {body}")
        data = json.loads(body or "[]")
        page = [str(r.get("id")) for r in data if r.get("id")]
        if not page:
            break
        ids.extend(page)
        offset += limit
    return ids


def fetch_exam_question_image_keys(*, supabase_url: str, headers: Dict[str, str], limit: int = 1000) -> List[str]:
    keys: List[str] = []
    offset = 0
    while True:
        url = (
            f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
            f"?select=image_url&image_url=not.is.null&limit={limit}&offset={offset}"
        )
        status, body = _http_json("GET", url, headers, payload=None)
        if status != 200:
            raise SystemExit(f"Failed to fetch image_url keys (status={status}): {body}")
        data = json.loads(body or "[]")
        page = [str(r.get("image_url")) for r in data if r.get("image_url")]
        if not page:
            break
        keys.extend(page)
        offset += limit
    # de-dupe, preserve order
    seen = set()
    uniq: List[str] = []
    for k in keys:
        k = k.strip()
        if not k or k in seen:
            continue
        seen.add(k)
        uniq.append(k)
    return uniq


def normalize_storage_key_from_image_url(*, raw: str, bucket: str) -> str | None:
    """Convert DB image_url values into Storage object keys.

    Supports:
   - raw object key (e.g. generated/<batch>/<id>.svg)
   - full public URL (e.g. https://..../storage/v1/object/public/questions/<key>)
   - full object URL (e.g. https://..../storage/v1/object/questions/<key>)
    """
    raw = (raw or "").strip()
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        try:
            parsed = urllib.parse.urlparse(raw)
            path = parsed.path or ""
            # public URL shape
            marker_pub = f"/storage/v1/object/public/{bucket}/"
            if marker_pub in path:
                return path.split(marker_pub, 1)[1].lstrip("/")
            # non-public URL shape
            marker_obj = f"/storage/v1/object/{bucket}/"
            if marker_obj in path:
                return path.split(marker_obj, 1)[1].lstrip("/")
        except Exception:
            return None
        return None

    # raw may include leading / or bucket prefix
    raw = raw.lstrip("/")
    if raw.startswith(f"{bucket}/"):
        raw = raw[len(bucket) + 1 :]
    return raw or None


def delete_exam_questions_by_id(*, supabase_url: str, headers: Dict[str, str], ids: List[str], dry_run: bool) -> None:
    if not ids:
        print("No exam_questions rows found")
        return

    print(f"Deleting {len(ids)} exam_questions rows...")
    if dry_run:
        print("DRY RUN: not deleting rows")
        return

    # PostgREST accepts in.(...) with uuid strings.
    deleted = 0
    for batch in _chunk(ids, 200):
        quoted = ",".join(batch)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http("DELETE", url, headers, timeout=120)
        if status not in (200, 204):
            raise SystemExit(f"Row delete failed (status={status}): {body}")
        deleted += len(batch)
        if deleted % 1000 == 0:
            print(f"Deleted {deleted}/{len(ids)} rows...")
        time.sleep(0.02)

    print(f"Deleted rows: {deleted}")


def delete_storage_objects(*, supabase_url: str, headers: Dict[str, str], bucket: str, keys: List[str], dry_run: bool) -> None:
    if not keys:
        print("No Storage objects to delete")
        return

    print(f"Deleting {len(keys)} Storage objects from bucket '{bucket}'...")
    if dry_run:
        print("DRY RUN: not deleting Storage objects")
        return

    deleted = 0
    for key in keys:
        # key can include slashes; must be URL-encoded.
        encoded_key = urllib.parse.quote(key, safe="/")
        url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{encoded_key}"
        status, body = _http("DELETE", url, headers, timeout=120)
        if status not in (200, 204):
            # Keep going for already-missing objects.
            if status == 404:
                continue
            # Some Supabase setups return 400 with an embedded not_found payload.
            body_l = (body or "").lower()
            if status == 400 and ("not_found" in body_l or "\"statuscode\":\"404\"" in body_l or "\"statuscode\":404" in body_l):
                continue
            raise SystemExit(f"Storage delete failed (status={status}) for {key}: {body}")
        deleted += 1
        if deleted % 200 == 0:
            print(f"Deleted {deleted}/{len(keys)} objects...")

    print(f"Deleted Storage objects: {deleted}")


def list_storage_prefix(*, supabase_url: str, headers: Dict[str, str], bucket: str, prefix: str, limit: int = 1000) -> List[str]:
    """Lists objects under a prefix.

    Uses Supabase Storage list endpoint:
      POST /storage/v1/object/list/{bucket}
      {"prefix": "generated/", "limit": 1000, "offset": 0}

    Returns full object keys (prefix + name).
    """

    keys: List[str] = []
    offset = 0
    while True:
        url = f"{supabase_url.rstrip('/')}/storage/v1/object/list/{bucket}"
        status, body = _http_json(
            "POST",
            url,
            headers,
            payload={"prefix": prefix, "limit": limit, "offset": offset},
            timeout=120,
        )
        if status != 200:
            raise RuntimeError(f"Storage list failed (status={status}): {body}")
        data = json.loads(body or "[]")
        page: List[str] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            if not name:
                continue

            # Heuristic: folders usually come back without metadata/id.
            # Recursively list into them.
            is_folder = (item.get("id") is None) and (item.get("metadata") is None)
            if is_folder:
                sub_prefix = prefix.rstrip("/") + "/" + name.strip("/") + "/"
                page.extend(list_storage_prefix(supabase_url=supabase_url, headers=headers, bucket=bucket, prefix=sub_prefix, limit=limit))
                continue

            # Some implementations return "folder" markers with trailing slash.
            if name.endswith("/"):
                sub_prefix = prefix.rstrip("/") + "/" + name
                page.extend(list_storage_prefix(supabase_url=supabase_url, headers=headers, bucket=bucket, prefix=sub_prefix, limit=limit))
                continue

            page.append(prefix.rstrip("/") + "/" + name if not name.startswith(prefix) else name)

        if not page:
            break

        keys.extend(page)
        offset += limit

    # De-dupe
    seen = set()
    uniq: List[str] = []
    for k in keys:
        if k in seen:
            continue
        seen.add(k)
        uniq.append(k)
    return uniq


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Delete exam_questions and generated images from Supabase")
    p.add_argument("--bucket", default="questions", help="Storage bucket name")
    p.add_argument(
        "--prefix",
        default=None,
        help="Also delete all Storage objects under this prefix (e.g. generated/). Safer default is off.",
    )
    p.add_argument("--dry-run", action="store_true", help="Print what would be deleted")
    return p.parse_args()


def _validate_supabase_url(raw: str) -> str:
    raw = (raw or "").strip()
    parsed = urllib.parse.urlparse(raw)
    if not parsed.scheme or not parsed.netloc:
        raise SystemExit(
            "SUPABASE_URL is invalid. Expected something like 'https://YOURPROJECT.supabase.co'"
        )
    if parsed.scheme not in ("https", "http"):
        raise SystemExit("SUPABASE_URL must start with https://")
    return raw.rstrip("/")


def main() -> None:
    args = parse_args()
    supabase_url = _validate_supabase_url(_env("SUPABASE_URL"))
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")

    headers = _auth_headers(service_key)

    # 1) Delete images referenced by DB
    try:
        image_urls = fetch_exam_question_image_keys(supabase_url=supabase_url, headers=headers)
        keys: List[str] = []
        for u in image_urls:
            k = normalize_storage_key_from_image_url(raw=u, bucket=args.bucket)
            if k:
                keys.append(k)
        # De-dupe while preserving order
        seen = set()
        image_keys: List[str] = []
        for k in keys:
            if k in seen:
                continue
            seen.add(k)
            image_keys.append(k)
        print(f"DB-referenced image_url objects: {len(image_keys)}")
        delete_storage_objects(
            supabase_url=supabase_url,
            headers=headers,
            bucket=args.bucket,
            keys=image_keys,
            dry_run=args.dry_run,
        )
    except SystemExit:
        raise
    except Exception as e:
        print(f"Warning: failed deleting DB-referenced images: {e}")

    # 2) Optionally delete a whole Storage prefix (catches orphaned images)
    if args.prefix:
        try:
            pref_keys = list_storage_prefix(
                supabase_url=supabase_url,
                headers=headers,
                bucket=args.bucket,
                prefix=args.prefix,
            )
            print(f"Storage objects under prefix '{args.prefix}': {len(pref_keys)}")
            delete_storage_objects(
                supabase_url=supabase_url,
                headers=headers,
                bucket=args.bucket,
                keys=pref_keys,
                dry_run=args.dry_run,
            )
        except Exception as e:
            print(f"Warning: failed deleting Storage prefix '{args.prefix}': {e}")

    # 3) Delete rows
    ids = fetch_exam_question_ids(supabase_url=supabase_url, headers=headers)
    print(f"exam_questions rows: {len(ids)}")
    delete_exam_questions_by_id(supabase_url=supabase_url, headers=headers, ids=ids, dry_run=args.dry_run)

    print("Cleanup complete.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        sys.exit(130)
