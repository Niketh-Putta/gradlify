#!/usr/bin/env python3
"""Normalize common LaTeX formatting issues in exam_questions.

Fixes:
- Adds missing backslashes for begin/end environments.
- Normalizes spacing around superscripts/subscripts.
- Converts caret/subscript shorthands (e.g., x^2, a_n) into braced forms.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Iterable, List, Tuple


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


def fetch_page(*, supabase_url: str, headers: Dict[str, str], table: str, limit: int, offset: int) -> List[Dict[str, Any]]:
    url = (
        f"{supabase_url.rstrip('/')}/rest/v1/{table}"
        f"?select=id,question,correct_answer,wrong_answers,all_answers,explanation,image_alt"
        f"&order=id&limit={limit}&offset={offset}"
    )
    status, body = _http_json("GET", url, headers, payload=None)
    if status != 200:
        raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
    return json.loads(body or "[]")


def _normalize_string(text: str) -> str:
    original = text
    result = text.replace("−", "-")
    result = re.sub(r"(?<!\\)begin\{", r"\\begin{", result)
    result = re.sub(r"(?<!\\)end\{", r"\\end{", result)

    result = re.sub(r"\^\s*\{\s*([^}]+?)\s*\}", lambda m: f"^{{{m.group(1).strip()}}}", result)
    result = re.sub(r"\^\s*(?!\{)(-?\d+|[a-zA-Z])", r"^{\1}", result)
    result = re.sub(r"([a-zA-Z]+)\^\{(-?\d+|[a-zA-Z])\}", r"\1^\2", result)
    result = re.sub(r"_\s*\{\s*([^}]+?)\s*\}", lambda m: f"_{{{m.group(1).strip()}}}", result)
    result = re.sub(r"_\s*(?!\{)(-?\d+|[a-zA-Z])", r"_{\1}", result)
    result = re.sub(r"([a-zA-Z]+)_\{(-?\d+|[a-zA-Z])\}", r"\1_\2", result)

    return result if result != original else original


def _normalize_value(value: Any) -> Tuple[Any, bool]:
    if value is None:
        return value, False
    if isinstance(value, list):
        updated = False
        out: List[Any] = []
        for item in value:
            if isinstance(item, str):
                normalized = _normalize_string(item)
                updated = updated or (normalized != item)
                out.append(normalized)
            else:
                out.append(item)
        return out, updated
    if isinstance(value, str):
        normalized = _normalize_string(value)
        return normalized, normalized != value
    return value, False


def patch_row(*, supabase_url: str, headers: Dict[str, str], table: str, row_id: int, updates: Dict[str, Any]) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/{table}?id=eq.{row_id}"
    status, body = _http_json("PATCH", url, headers, payload=updates)
    if status not in (200, 204):
        raise SystemExit(f"Failed to update row {row_id} (status={status}): {body}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize formatting for exam_questions fields.")
    parser.add_argument("--limit", type=int, default=500, help="Rows per page.")
    parser.add_argument("--table", default="exam_questions", help="Table name to process.")
    parser.add_argument("--sleep", type=float, default=0.05, help="Sleep between updates (seconds).")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    limit = max(1, args.limit)
    offset = 0
    updated_rows = 0
    scanned = 0

    table = args.table

    while True:
        rows = fetch_page(supabase_url=supabase_url, headers=headers, table=table, limit=limit, offset=offset)
        if not rows:
            break
        for row in rows:
            scanned += 1
            updates: Dict[str, Any] = {}
            for field in ("question", "correct_answer", "wrong_answers", "all_answers", "explanation", "image_alt"):
                normalized, changed = _normalize_value(row.get(field))
                if changed:
                    updates[field] = normalized
            if updates:
                patch_row(
                    supabase_url=supabase_url,
                    headers=headers,
                    table=table,
                    row_id=row["id"],
                    updates=updates,
                )
                updated_rows += 1
                if args.sleep:
                    time.sleep(args.sleep)
        offset += limit

    print(f"{table}: Scanned {scanned} rows. Updated {updated_rows} rows.")


if __name__ == "__main__":
    main()
