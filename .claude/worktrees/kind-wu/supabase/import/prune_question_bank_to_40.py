#!/usr/bin/env python3
"""Prune exam_questions to 40 per mini-subtopic (10 per tier x calculator bucket).

Actions:
- Fix safe explanation/correct_answer mismatches when the explanation's final answer
  matches one of the existing options.
- Delete rows with invalid option sets, missing/weak explanations, unbalanced braces,
  or unsafe explanation mismatches.
- Rank remaining questions by quality and trim to max-per-bucket.
- Write a JSONL log of fixes/deletions for auditability.

Requires env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
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


def _http(method: str, url: str, headers: Dict[str, str], timeout: int = 60) -> Tuple[int, str]:
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
            "select": "id,question,correct_answer,wrong_answers,all_answers,explanation,subtopic,tier,calculator,question_type,image_url,created_at",
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


def patch_row(*, supabase_url: str, headers: Dict[str, str], row_id: str, updates: Dict[str, Any], dry_run: bool) -> None:
    if dry_run:
        return
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=eq.{row_id}"
    status, body = _http_json("PATCH", url, headers, payload=updates, timeout=60)
    if status not in (200, 204):
        raise SystemExit(f"Failed to update row {row_id} (status={status}): {body}")


def delete_rows(*, supabase_url: str, headers: Dict[str, str], ids: List[str], dry_run: bool) -> int:
    if not ids:
        return 0
    if dry_run:
        return len(ids)
    deleted = 0
    for batch in _chunk(ids, 200):
        quoted = ",".join(f"\"{cid}\"" for cid in batch)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http("DELETE", url, headers, timeout=120)
        if status not in (200, 204):
            raise SystemExit(f"Row delete failed (status={status}): {body}")
        deleted += len(batch)
        time.sleep(0.02)
    return deleted


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


def _as_string_list(value: Any) -> Optional[List[str]]:
    if value is None:
        return None
    if isinstance(value, list):
        out: List[str] = []
        for v in value:
            if v is None:
                continue
            out.append(str(v))
        return out
    return None


def braces_balanced(text: str) -> bool:
    if not text:
        return True
    return text.count("{") == text.count("}")


def normalize_answer(text: str) -> str:
    raw = str(text or "").strip().lower()
    if not raw:
        return ""
    raw = raw.replace("−", "-")
    raw = raw.replace("×", "x")
    raw = raw.replace("\\times", "x")
    raw = raw.replace("\\cdot", "*")
    raw = raw.replace("π", "pi").replace("\\pi", "pi")
    raw = re.sub(r"\\text\s*\{([^}]*)\}", r"\1", raw)
    raw = re.sub(r"\\mathrm\s*\{([^}]*)\}", r"\1", raw)
    raw = raw.replace("\\left", "").replace("\\right", "")
    raw = raw.replace("$", "").replace("\\(", "").replace("\\)", "").replace("\\[", "").replace("\\]", "")
    raw = raw.replace("{", "").replace("}", "")
    raw = re.sub(r"\s+", "", raw)
    return raw


def extract_final_answer(explanation: str) -> Optional[str]:
    if not explanation:
        return None
    patterns = [
        re.compile(r"final\s+answer\s*[:=]\s*(.+)", re.I),
        re.compile(r"answer\s*[:=]\s*(.+)", re.I),
    ]
    candidates: List[str] = []
    for line in explanation.splitlines():
        for pat in patterns:
            m = pat.search(line)
            if m:
                candidates.append(m.group(1).strip())
    if not candidates:
        return None
    raw = candidates[-1]
    # Trim trailing punctuation or commentary.
    raw = re.split(r"\s{2,}", raw)[0]
    raw = re.split(r"[\r\n]", raw)[0]
    raw = raw.strip().strip(". ").strip(";")
    if raw.startswith("="):
        raw = raw[1:].strip()
    return raw or None


def validate_options(row: Dict[str, Any]) -> Optional[str]:
    correct = str(row.get("correct_answer") or "").strip()
    if not correct:
        return "missing correct_answer"
    wrong = _as_string_list(row.get("wrong_answers"))
    if wrong is None:
        return "wrong_answers missing or not an array"
    wrong_norm = [w.strip() for w in wrong if str(w).strip()]
    if len(wrong_norm) != 3:
        return f"wrong_answers length != 3 (got {len(wrong_norm)})"
    if len(set(wrong_norm)) != 3:
        return "wrong_answers contains duplicates"
    if correct in wrong_norm:
        return "wrong_answers includes correct_answer"
    return None


def rebuild_all_answers(correct: str, wrongs: List[str]) -> List[str]:
    out = [str(correct).strip()] + [str(w).strip() for w in wrongs if str(w).strip()]
    # De-dupe preserving order.
    seen = set()
    uniq: List[str] = []
    for v in out:
        if v in seen:
            continue
        seen.add(v)
        uniq.append(v)
    return uniq


def quality_score(row: Dict[str, Any]) -> int:
    question = str(row.get("question") or "").strip()
    explanation = str(row.get("explanation") or "").strip()
    needs_fix = bool(row.get("needs_fix"))

    score = 0
    qlen = len(question)
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

    if qlen >= 40:
        score += 1

    if row.get("image_url"):
        score += 1

    if needs_fix:
        score -= 3

    if re.search(r"\b(todo|tbd)\b", explanation, re.I):
        score -= 3
    if "??" in explanation:
        score -= 2

    return score


def log_entry(handle, entry: Dict[str, Any]) -> None:
    handle.write(json.dumps(entry, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prune question bank to 40 per mini-subtopic (10 per bucket).")
    parser.add_argument("--dry-run", action="store_true", help="Do not patch/delete; only report.")
    parser.add_argument("--max-per-bucket", type=int, default=10)
    parser.add_argument("--min-explanation-len", type=int, default=30)
    parser.add_argument("--min-quality-score", type=int, default=0)
    parser.add_argument("--log-path", default="tmp/prune_question_bank_log.jsonl")
    parser.add_argument("--summary-path", default="tmp/prune_question_bank_summary.json")
    parser.add_argument("--sleep", type=float, default=0.02)
    parser.add_argument("--topic", help="Limit to a specific topic name (e.g. 'Number').")
    parser.add_argument("--subtopic", help="Limit to a specific subtopic id (e.g. 'number|unit_conversions').")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    subtopics = load_subtopics(MAPPING_PATH)

    os.makedirs(os.path.dirname(args.log_path), exist_ok=True)

    summary = {
        "total_scanned": 0,
        "total_fixed": 0,
        "total_deleted": 0,
        "total_deleted_over_quota": 0,
        "total_deleted_quality": 0,
        "total_deleted_invalid": 0,
        "total_deleted_mismatch": 0,
        "total_deleted_structure": 0,
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
            summary["total_scanned"] += len(rows)

            buckets: Dict[Tuple[str, str], List[Dict[str, Any]]] = {(t, c): [] for t in TIERS for c in CALCULATORS}
            unknown_bucket_ids: List[str] = []

            for row in rows:
                tier = normalize_tier(row.get("tier"))
                calc = normalize_calculator(row.get("calculator"))
                if not tier or not calc:
                    unknown_bucket_ids.append(str(row.get("id")))
                    log_entry(log_handle, {
                        "action": "delete",
                        "reason": "missing_tier_or_calculator",
                        "id": row.get("id"),
                        "subtopic": subtopic_id,
                    })
                    continue
                buckets[(tier, calc)].append(row)

            deleted_ids: List[str] = []
            fixed_rows = 0

            if unknown_bucket_ids:
                deleted_ids.extend(unknown_bucket_ids)
                summary["total_deleted_structure"] += len(unknown_bucket_ids)

            subtopic_summary = {
                "deleted": 0,
                "fixed": 0,
                "buckets": {},
            }

            for (tier, calc), bucket_rows in buckets.items():
                kept: List[Tuple[int, Dict[str, Any]]] = []
                bucket_deleted = 0

                for row in bucket_rows:
                    row_id = str(row.get("id"))
                    question = str(row.get("question") or "").strip()
                    correct = str(row.get("correct_answer") or "").strip()
                    explanation = str(row.get("explanation") or "").strip()
                    wrongs = _as_string_list(row.get("wrong_answers")) or []

                    invalid_reason = validate_options(row)
                    if invalid_reason:
                        deleted_ids.append(row_id)
                        bucket_deleted += 1
                        summary["total_deleted_invalid"] += 1
                        log_entry(log_handle, {
                            "action": "delete",
                            "reason": invalid_reason,
                            "id": row_id,
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                        })
                        continue

                    if not question or len(question) < 15:
                        deleted_ids.append(row_id)
                        bucket_deleted += 1
                        summary["total_deleted_quality"] += 1
                        log_entry(log_handle, {
                            "action": "delete",
                            "reason": "question_too_short",
                            "id": row_id,
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                        })
                        continue

                    if not explanation or len(explanation) < args.min_explanation_len:
                        deleted_ids.append(row_id)
                        bucket_deleted += 1
                        summary["total_deleted_quality"] += 1
                        log_entry(log_handle, {
                            "action": "delete",
                            "reason": "explanation_too_short",
                            "id": row_id,
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                        })
                        continue

                    if not braces_balanced(question) or not braces_balanced(correct) or not braces_balanced(explanation):
                        deleted_ids.append(row_id)
                        bucket_deleted += 1
                        summary["total_deleted_structure"] += 1
                        log_entry(log_handle, {
                            "action": "delete",
                            "reason": "unbalanced_braces",
                            "id": row_id,
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                        })
                        continue

                    extracted = extract_final_answer(explanation)
                    if extracted:
                        norm_extracted = normalize_answer(extracted)
                        norm_correct = normalize_answer(correct)
                        if norm_extracted and norm_correct and norm_extracted != norm_correct:
                            wrong_norms = [normalize_answer(w) for w in wrongs]
                            if norm_extracted in wrong_norms:
                                idx = wrong_norms.index(norm_extracted)
                                new_correct = wrongs[idx]
                                new_wrongs = [w for i, w in enumerate(wrongs) if i != idx]
                                if correct and correct not in new_wrongs:
                                    new_wrongs.append(correct)
                                if len(new_wrongs) < 3:
                                    # Not enough wrong answers to safely fix.
                                    deleted_ids.append(row_id)
                                    bucket_deleted += 1
                                    summary["total_deleted_mismatch"] += 1
                                    log_entry(log_handle, {
                                        "action": "delete",
                                        "reason": "mismatch_fix_failed",
                                        "id": row_id,
                                        "subtopic": subtopic_id,
                                        "tier": tier,
                                        "calculator": calc,
                                        "extracted": extracted,
                                    })
                                    continue
                                new_wrongs = new_wrongs[:3]
                                updates = {
                                    "correct_answer": new_correct,
                                    "wrong_answers": new_wrongs,
                                    "all_answers": rebuild_all_answers(new_correct, new_wrongs),
                                }
                                patch_row(supabase_url=supabase_url, headers=headers, row_id=row_id, updates=updates, dry_run=args.dry_run)
                                row["correct_answer"] = new_correct
                                row["wrong_answers"] = new_wrongs
                                row["all_answers"] = rebuild_all_answers(new_correct, new_wrongs)
                                fixed_rows += 1
                                summary["total_fixed"] += 1
                                log_entry(log_handle, {
                                    "action": "fix",
                                    "reason": "explanation_mismatch_swap",
                                    "id": row_id,
                                    "subtopic": subtopic_id,
                                    "tier": tier,
                                    "calculator": calc,
                                    "extracted": extracted,
                                })
                                if args.sleep:
                                    time.sleep(args.sleep)
                            else:
                                deleted_ids.append(row_id)
                                bucket_deleted += 1
                                summary["total_deleted_mismatch"] += 1
                                log_entry(log_handle, {
                                    "action": "delete",
                                    "reason": "explanation_mismatch",
                                    "id": row_id,
                                    "subtopic": subtopic_id,
                                    "tier": tier,
                                    "calculator": calc,
                                    "extracted": extracted,
                                })
                                continue

                    # Rebuild all_answers if missing or invalid shape.
                    all_ans = _as_string_list(row.get("all_answers"))
                    if all_ans is None or len(all_ans) < 4 or normalize_answer(correct) not in [normalize_answer(a) for a in all_ans]:
                        updates = {
                            "all_answers": rebuild_all_answers(correct, wrongs),
                        }
                        patch_row(supabase_url=supabase_url, headers=headers, row_id=row_id, updates=updates, dry_run=args.dry_run)
                        row["all_answers"] = updates["all_answers"]
                        fixed_rows += 1
                        summary["total_fixed"] += 1
                        log_entry(log_handle, {
                            "action": "fix",
                            "reason": "rebuild_all_answers",
                            "id": row_id,
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                        })
                        if args.sleep:
                            time.sleep(args.sleep)

                    score = quality_score(row)
                    if score < args.min_quality_score:
                        deleted_ids.append(row_id)
                        bucket_deleted += 1
                        summary["total_deleted_quality"] += 1
                        log_entry(log_handle, {
                            "action": "delete",
                            "reason": "low_quality_score",
                            "score": score,
                            "id": row_id,
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                        })
                        continue

                    kept.append((score, row))

                # If still over quota, trim lowest quality.
                if len(kept) > args.max_per_bucket:
                    kept.sort(key=lambda x: (x[0], str(x[1].get("created_at") or "")))
                    to_trim = kept[: len(kept) - args.max_per_bucket]
                    for score, row in to_trim:
                        row_id = str(row.get("id"))
                        deleted_ids.append(row_id)
                        bucket_deleted += 1
                        summary["total_deleted_over_quota"] += 1
                        log_entry(log_handle, {
                            "action": "delete",
                            "reason": "over_quota_low_quality",
                            "score": score,
                            "id": row_id,
                            "subtopic": subtopic_id,
                            "tier": tier,
                            "calculator": calc,
                        })

                subtopic_summary["buckets"][f"{tier} | {calc}"] = {
                    "total": len(bucket_rows),
                    "deleted": bucket_deleted,
                }

            # Apply deletes for this subtopic in batches.
            deleted_count = delete_rows(supabase_url=supabase_url, headers=headers, ids=deleted_ids, dry_run=args.dry_run)
            summary["total_deleted"] += deleted_count
            subtopic_summary["deleted"] += deleted_count
            subtopic_summary["fixed"] += fixed_rows
            summary["by_subtopic"][subtopic_id] = subtopic_summary

            if args.sleep:
                time.sleep(args.sleep)

    os.makedirs(os.path.dirname(args.summary_path), exist_ok=True)
    with open(args.summary_path, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(json.dumps({
        "dry_run": bool(args.dry_run),
        "total_scanned": summary["total_scanned"],
        "total_fixed": summary["total_fixed"],
        "total_deleted": summary["total_deleted"],
        "deleted_invalid": summary["total_deleted_invalid"],
        "deleted_mismatch": summary["total_deleted_mismatch"],
        "deleted_quality": summary["total_deleted_quality"],
        "deleted_over_quota": summary["total_deleted_over_quota"],
        "deleted_structure": summary["total_deleted_structure"],
        "log_path": args.log_path,
        "summary_path": args.summary_path,
    }, indent=2))


if __name__ == "__main__":
    main()
