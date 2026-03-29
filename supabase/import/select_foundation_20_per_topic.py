#!/usr/bin/env python3
"""Select a balanced Foundation-tier subset from existing generated batches.

Goal:
- Produce a single CSV with (by default) 20 questions per main topic.
- Avoid extreme repetition by limiting how many questions we take from the same
  "template" (same wording, different numbers).

This does NOT insert anything into Supabase. It only prepares a CSV suitable for
`supabase/import/upload_and_insert.py`.

Usage:
  python supabase/import/select_foundation_20_per_topic.py \
    --out-dir supabase/data/generated/batch_foundation_20_each_topic \
    --per-topic 20 \
    --max-per-template 4

Then:
  python supabase/import/validate_import.py <out-csv>
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
    python supabase/import/upload_and_insert.py <out-csv> --skip-images
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

TOPICS = [
    "Number",
    "Algebra",
    "Ratio & Proportion",
    "Geometry & Measures",
    "Probability",
    "Statistics",
]

_RE_NUMBER = re.compile(r"(?<![a-zA-Z])[-+]?\d+(?:\.\d+)?(?:/\d+(?:\.\d+)?)?(?![a-zA-Z])")
_RE_CURRENCY = re.compile(r"[£$€]\s*\d+(?:,\d{3})*(?:\.\d+)?")
_RE_PERCENT = re.compile(r"\b\d+(?:\.\d+)?\s*%\b")
_RE_TIME = re.compile(r"\b\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b", re.I)
_RE_UNIT = re.compile(r"\b\d+(?:\.\d+)?\s*(?:cm|mm|m|km|g|kg|ml|l|litre|litres|mile|miles|mph|km/h|m/s|°)\b", re.I)

_RE_SOLVE_FOR_X_PREFIX = re.compile(r"^Solve\s+for\s+x:\s*(.+)$", re.IGNORECASE)
_RE_SOLVE_EQUATION_PREFIX = re.compile(r"^Solve\s+the\s+equation\s+(.+?)\s*$", re.IGNORECASE)


def _template_signature(text: str) -> str:
    s = " ".join((text or "").split()).lower()

    # Strip common LaTeX delimiters (single or double escaped).
    s = s.replace("\\\\[", "").replace("\\\\]", "")
    s = s.replace("\\[", "").replace("\\]", "")
    s = s.replace("\\\\(", "").replace("\\\\)", "")
    s = s.replace("\\(", "").replace("\\)", "")

    s = _RE_CURRENCY.sub("<CURRENCY>", s)
    s = _RE_PERCENT.sub("<PERCENT>", s)
    s = _RE_TIME.sub("<TIME>", s)
    s = _RE_UNIT.sub("<UNIT>", s)

    # Replace numbers/fractions to collapse numeric variants.
    s = _RE_NUMBER.sub("<N>", s)

    s = re.sub(r"\s+", " ", s).strip()
    return s


def _iter_generated_csvs(root: Path) -> list[Path]:
    # Only consider batch folders.
    csvs = [p for p in root.rglob("exam_questions.csv") if p.parent.name.startswith("batch_")]
    return sorted(csvs)


def _read_rows(p: Path) -> tuple[list[dict[str, str]], list[str]]:
    with p.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        return rows, (reader.fieldnames or [])


def _normalize_equation_text(s: str) -> str:
    s = (s or "").strip()
    s = s.replace("−", "-").replace("–", "-").replace(" - ", "-")
    while s and s[-1] in ".;":
        s = s[:-1].rstrip()
    return s


def _parse_number_token(s: str) -> float | None:
    s = (s or "").strip()
    if not s:
        return None
    if "/" in s:
        parts = s.split("/")
        if len(parts) == 2 and parts[0].strip() and parts[1].strip():
            try:
                num = float(parts[0].strip())
                den = float(parts[1].strip())
                if den == 0:
                    return None
                return num / den
            except ValueError:
                return None
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _tokenize_expr(expr: str) -> list[str] | None:
    expr = _normalize_equation_text(expr)
    expr = expr.replace("\\(", "").replace("\\)", "").replace("$", "")
    expr = expr.replace(" ", "")
    if not expr:
        return None

    tokens: list[str] = []
    i = 0
    while i < len(expr):
        ch = expr[i]
        if ch.isdigit() or ch == ".":
            j = i + 1
            while j < len(expr) and (expr[j].isdigit() or expr[j] == "."):
                j += 1
            tokens.append(expr[i:j])
            i = j
            continue
        if ch in "+-*/()":
            tokens.append(ch)
            i += 1
            continue
        if ch.lower() == "x":
            tokens.append("x")
            i += 1
            continue
        return None

    out: list[str] = []

    def is_atom(t: str) -> bool:
        return t == "x" or t == ")" or _parse_number_token(t) is not None

    for t in tokens:
        if out:
            prev = out[-1]
            if is_atom(prev) and (t == "(" or t == "x" or _parse_number_token(t) is not None):
                if not (prev in "+-*/(" or t in "+-*/)"):
                    out.append("*")
        out.append(t)
    return out


def _parse_linear_expr(tokens: list[str]) -> tuple[float, float] | None:
    # Returns (a, b) meaning a*x + b
    pos = 0

    def parse_factor() -> tuple[float, float] | None:
        nonlocal pos
        if pos >= len(tokens):
            return None
        t = tokens[pos]
        if t == "+":
            pos += 1
            return parse_factor()
        if t == "-":
            pos += 1
            v = parse_factor()
            if v is None:
                return None
            return (-v[0], -v[1])
        if t == "(":
            pos += 1
            v = parse_expr()
            if v is None:
                return None
            if pos >= len(tokens) or tokens[pos] != ")":
                return None
            pos += 1
            return v
        if t == "x":
            pos += 1
            return (1.0, 0.0)

        num = _parse_number_token(t)
        if num is None:
            return None
        pos += 1
        return (0.0, float(num))

    def parse_term() -> tuple[float, float] | None:
        nonlocal pos
        left = parse_factor()
        if left is None:
            return None
        while pos < len(tokens) and tokens[pos] in ("*", "/"):
            op = tokens[pos]
            pos += 1
            right = parse_factor()
            if right is None:
                return None

            (a1, b1) = left
            (a2, b2) = right
            if op == "*":
                if a1 != 0.0 and a2 != 0.0:
                    return None
                if a2 == 0.0:
                    left = (a1 * b2, b1 * b2)
                else:
                    left = (a2 * b1, b2 * b1)
            else:
                if a2 != 0.0:
                    return None
                if b2 == 0.0:
                    return None
                left = (a1 / b2, b1 / b2)
        return left

    def parse_expr() -> tuple[float, float] | None:
        nonlocal pos
        left = parse_term()
        if left is None:
            return None
        while pos < len(tokens) and tokens[pos] in ("+", "-"):
            op = tokens[pos]
            pos += 1
            right = parse_term()
            if right is None:
                return None
            if op == "+":
                left = (left[0] + right[0], left[1] + right[1])
            else:
                left = (left[0] - right[0], left[1] - right[1])
        return left

    result = parse_expr()
    if result is None:
        return None
    if pos != len(tokens):
        return None
    return result


def _solve_linear_equation(equation: str) -> float | None:
    eq = _normalize_equation_text(equation)
    eq = eq.replace("\\(", "").replace("\\)", "").replace("$", "")
    if "=" not in eq:
        return None
    left_str, right_str = eq.split("=", 1)
    lt = _tokenize_expr(left_str)
    rt = _tokenize_expr(right_str)
    if lt is None or rt is None:
        return None
    left = _parse_linear_expr(lt)
    right = _parse_linear_expr(rt)
    if left is None or right is None:
        return None

    a = left[0] - right[0]
    b = left[1] - right[1]
    if abs(a) < 1e-12:
        return None
    return -b / a


def _equation_answer_is_correct(question: str, correct_answer: str) -> bool:
    q = (question or "").strip()
    ca = _parse_number_token(_normalize_equation_text(correct_answer))
    if ca is None:
        return False

    m = _RE_SOLVE_FOR_X_PREFIX.match(_normalize_equation_text(q))
    if m:
        equation = m.group(1).strip()
        solved = _solve_linear_equation(equation)
        return solved is not None and abs(solved - ca) <= 1e-6

    m = _RE_SOLVE_EQUATION_PREFIX.match(_normalize_equation_text(q))
    if m:
        equation = m.group(1).strip()
        solved = _solve_linear_equation(equation)
        return solved is not None and abs(solved - ca) <= 1e-6

    return True


def _is_row_reasonably_valid(row: dict[str, str]) -> bool:
    question = (row.get("question") or "").strip()
    if not question:
        return False

    correct = (row.get("correct_answer") or "").strip()
    if not correct:
        return False

    wrong_raw = (row.get("wrong_answers") or "").strip()
    if not wrong_raw:
        return False
    try:
        wrong = json.loads(wrong_raw)
    except Exception:
        return False
    if not isinstance(wrong, list) or len(wrong) != 3:
        return False

    wrong_norm = [str(x).strip() for x in wrong]
    if any(not w for w in wrong_norm):
        return False
    if len(set(wrong_norm)) != 3:
        return False
    if correct in set(wrong_norm):
        return False

    if not _equation_answer_is_correct(question, correct):
        return False
    return True


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Select Foundation 20-per-topic CSV from generated batches")
    ap.add_argument(
        "--generated-root",
        default="supabase/data/generated",
        help="Root folder containing batch_*/exam_questions.csv",
    )
    ap.add_argument(
        "--out-dir",
        default="supabase/data/generated/batch_foundation_20_each_topic",
        help="Output directory to write exam_questions.csv",
    )
    ap.add_argument("--per-topic", type=int, default=20, help="Target number of questions per topic")
    ap.add_argument(
        "--max-per-template",
        type=int,
        default=4,
        help="Max questions to include per template signature (per topic)",
    )
    ap.add_argument(
        "--tier",
        default="Foundation Tier",
        help="Tier value to filter by (default: Foundation Tier)",
    )
    return ap.parse_args()


def main() -> None:
    args = parse_args()
    generated_root = Path(args.generated_root)
    out_dir = Path(args.out_dir)
    out_csv = out_dir / "exam_questions.csv"

    csv_paths = _iter_generated_csvs(generated_root)
    if not csv_paths:
        raise SystemExit(f"No generated CSVs found under: {generated_root}")

    all_rows: list[dict[str, str]] = []
    fieldnames: list[str] | None = None

    for p in csv_paths:
        rows, fns = _read_rows(p)
        if not rows:
            continue
        if fieldnames is None:
            fieldnames = fns
        all_rows.extend(rows)

    if not all_rows or not fieldnames:
        raise SystemExit("No rows loaded from generated CSVs")

    per_topic_target = int(args.per_topic)
    max_per_template = int(args.max_per_template)

    counts_by_topic: dict[str, int] = defaultdict(int)
    template_counts: dict[tuple[str, str], int] = defaultdict(int)  # (topic, sig) -> n
    seen_exact: set[tuple[str, str, str]] = set()  # (topic, tier, exact_question)

    selected: list[dict[str, str]] = []

    for row in all_rows:
        tier = (row.get("tier") or "").strip()
        if tier != args.tier:
            continue

        topic = (row.get("question_type") or "").strip()
        if topic not in TOPICS:
            continue

        if counts_by_topic[topic] >= per_topic_target:
            continue

        q = (row.get("question") or "").strip()
        if not q:
            continue

        if not _is_row_reasonably_valid(row):
            continue

        exact_key = (topic, tier, q)
        if exact_key in seen_exact:
            continue

        sig = _template_signature(q)
        template_key = (topic, sig)
        if template_counts[template_key] >= max_per_template:
            continue

        template_counts[template_key] += 1
        seen_exact.add(exact_key)
        selected.append(row)
        counts_by_topic[topic] += 1

    print("Selected counts:")
    for t in TOPICS:
        print(f"- {t}: {counts_by_topic[t]}/{per_topic_target}")

    missing = [t for t in TOPICS if counts_by_topic[t] < per_topic_target]
    if missing:
        raise SystemExit(
            "Not enough rows to satisfy target. "
            f"Missing topics: {missing}. "
            "Try increasing --max-per-template, lowering --per-topic, or generating more batches."
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(selected)

    print(f"Wrote: {out_csv} (rows={len(selected)})")


if __name__ == "__main__":
    main()
