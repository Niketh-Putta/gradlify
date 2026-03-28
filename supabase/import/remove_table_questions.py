#!/usr/bin/env python3
"""Delete exam_questions that contain markdown-style pipe tables.

Why:
- Some AI-generated questions embed tables as raw markdown like:
    | Col | Col |
    |-----|-----|
  which used to render poorly. If you want to remove all such questions,
  this script finds and deletes them.

Detection:
- Looks for a header line containing '|' followed by a separator line that is
  composed of pipes, dashes and colons.
- Checks both `question` and `explanation`.

Requires env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Usage:
  python3 supabase/import/remove_table_questions.py --dry-run
  python3 supabase/import/remove_table_questions.py

Optional:
  --include-explanations / --no-include-explanations (default: include)
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


def _http(method: str, url: str, headers: Dict[str, str], timeout: int = 60) -> Tuple[int, str]:
    req = urllib.request.Request(url=url, data=None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def _chunk(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _is_separator_line(line: str) -> bool:
    trimmed = (line or "").strip()
    if "|" not in trimmed:
        return False
    without_pipes = trimmed.replace("|", "").strip()
    if not without_pipes:
        return False
    # allow colon alignment markers
    for ch in without_pipes:
        if ch not in "-: ":
            return False
    return "-" in without_pipes


def _has_pipe_table(text: str) -> bool:
    if not text:
        return False
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.split("\n")
    for i in range(len(lines) - 1):
        line = lines[i] or ""
        next_line = lines[i + 1] or ""
        # header: must contain | and at least 2 cells
        if "|" in line and len([c for c in line.split("|") if c.strip()]) >= 2 and _is_separator_line(next_line):
            return True
    return False


def _has_latex_table(text: str) -> bool:
    if not text:
        return False
    t = text.lower()
    # Common LaTeX environments used for tables in AI outputs.
    if "\\begin{array" in t or "\\end{array" in t:
        return True
    if "\\begin{tabular" in t or "\\end{tabular" in t:
        return True
    # Matrix/table-like layouts (often used to represent tables in-line)
    if "\\begin{matrix" in t or "\\end{matrix" in t:
        return True
    if "\\begin{pmatrix" in t or "\\end{pmatrix" in t:
        return True
    if "\\begin{bmatrix" in t or "\\end{bmatrix" in t:
        return True
    # Table tokens: \hline and alignment separators &
    if "\\hline" in t and "&" in t:
        return True
    # Many of these show up wrapped as \[ ... \] or \( ... \)
    if "\\[" in t and "\\]" in t and ("&" in t and "\\\\" in t):
        return True
    return False


def fetch_candidates(*, supabase_url: str, headers: Dict[str, str], limit: int = 1000, offset: int = 0) -> List[Dict[str, Any]]:
    url = (
        f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
        f"?select=id,question,explanation&limit={limit}&offset={offset}"
    )
    status, body = _http_json("GET", url, headers, payload=None)
    if status != 200:
        raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
    return json.loads(body or "[]")


def find_table_question_ids(*, supabase_url: str, headers: Dict[str, str], include_explanations: bool) -> List[str]:
    ids: List[str] = []
    offset = 0
    limit = 1000

    while True:
        rows = fetch_candidates(supabase_url=supabase_url, headers=headers, limit=limit, offset=offset)
        if not rows:
            break

        for r in rows:
            qid = str(r.get("id") or "").strip()
            qtext = str(r.get("question") or "")
            expl = str(r.get("explanation") or "")
            if not qid:
                continue
            if (
                _has_pipe_table(qtext)
                or _has_latex_table(qtext)
                or (include_explanations and (_has_pipe_table(expl) or _has_latex_table(expl)))
            ):
                ids.append(qid)

        offset += limit

    # de-dupe preserve order
    seen = set()
    uniq: List[str] = []
    for i in ids:
        if i in seen:
            continue
        seen.add(i)
        uniq.append(i)
    return uniq


def delete_ids(*, supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        print("No table questions found.")
        return

    print(f"Deleting {len(ids)} exam_questions rows (table questions)...")
    deleted = 0
    for batch in _chunk(ids, 200):
        quoted = ",".join(batch)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http("DELETE", url, headers, timeout=120)
        if status not in (200, 204):
            raise SystemExit(f"Row delete failed (status={status}): {body}")
        deleted += len(batch)
        time.sleep(0.02)

    print(f"Deleted rows: {deleted}")


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Only print count; do not delete")
    ap.add_argument(
        "--include-explanations",
        dest="include_explanations",
        action="store_true",
        default=True,
        help="Also delete if explanation contains a table (default on)",
    )
    ap.add_argument(
        "--no-include-explanations",
        dest="include_explanations",
        action="store_false",
        help="Only check question field",
    )
    args = ap.parse_args(argv)

    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    ids = find_table_question_ids(
        supabase_url=supabase_url,
        headers=headers,
        include_explanations=bool(args.include_explanations),
    )

    print(f"Matched rows: {len(ids)}")
    if args.dry_run:
        return 0

    delete_ids(supabase_url=supabase_url, headers=headers, ids=ids)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
