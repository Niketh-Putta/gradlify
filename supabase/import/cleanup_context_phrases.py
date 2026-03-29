import json
import os
import re
import sys
from typing import Dict, List, Tuple

import requests


def parse_dotenv(path: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"')
                out[key] = value
    except FileNotFoundError:
        return out
    return out


def clean_question(text: str) -> str:
    if not text:
        return text

    def is_context_phrase(content: str) -> bool:
        if not content:
            return False
        if re.search(r"\d", content):
            return False
        if re.search(r"[=<>+*/^\\]", content):
            return False
        if re.search(r"\bpi\b", content, flags=re.IGNORECASE):
            return False
        return bool(re.fullmatch(r"[A-Za-z\s'’\-]+", content.strip()))

    def strip_trailing_context(line: str) -> str:
        while True:
            match = re.search(r"(?:[.?!]\s*)?\(([^()]*)\)\s*$", line)
            if not match:
                break
            content = match.group(1).strip()
            if not is_context_phrase(content):
                break
            line = line[: match.start()].rstrip()
        return line

    lines = text.splitlines()
    cleaned_lines: List[str] = []
    for line in lines:
        stripped = re.sub(r"^\s*context\s*[:\-– - ]\s*", "", line, flags=re.IGNORECASE)
        stripped = re.sub(r"(?i)\bcontext\s*[:\-– - ]\s*", "", stripped)
        stripped = strip_trailing_context(stripped)
        if stripped.strip():
            cleaned_lines.append(stripped.strip())
    cleaned = "\n".join(cleaned_lines)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def fetch_all_rows(session: requests.Session, base_url: str, headers: Dict[str, str], table: str, limit: int = 1000) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    offset = 0
    while True:
        params = {
            "select": "id,question",
            "limit": str(limit),
            "offset": str(offset),
        }
        resp = session.get(f"{base_url}/rest/v1/{table}", headers=headers, params=params, timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to fetch {table}: {resp.status_code} {resp.text}")
        batch = resp.json()
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return rows


def update_row(session: requests.Session, base_url: str, headers: Dict[str, str], table: str, row_id: str, question: str) -> None:
    params = {"id": f"eq.{row_id}"}
    resp = session.patch(
        f"{base_url}/rest/v1/{table}",
        headers=headers,
        params=params,
        data=json.dumps({"question": question}),
        timeout=30,
    )
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"Failed to update {table}:{row_id}: {resp.status_code} {resp.text}")


def main() -> int:
    env = parse_dotenv(os.path.join(os.getcwd(), ".env"))
    base_url = (env.get("SUPABASE_URL") or env.get("VITE_SUPABASE_URL") or "").rstrip("/")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not base_url or not service_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env", file=sys.stderr)
        return 1

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    tables = ["exam_questions", "extreme_questions"]
    total_examined = 0
    total_updated = 0

    session = requests.Session()

    for table in tables:
        rows = fetch_all_rows(session, base_url, headers, table)
        total_examined += len(rows)
        updates: List[Tuple[str, str]] = []
        for row in rows:
            question = row.get("question") or ""
            if not question:
                continue
            cleaned = clean_question(question)
            if cleaned != question:
                updates.append((row["id"], cleaned))

        for idx, (row_id, cleaned) in enumerate(updates, start=1):
            update_row(session, base_url, headers, table, row_id, cleaned)
            if idx % 100 == 0:
                print(f"{table}: updated {idx}/{len(updates)}...")
        total_updated += len(updates)
        print(f"{table}: updated {len(updates)} rows")

    print(f"Examined {total_examined} rows. Updated {total_updated} rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
