#!/usr/bin/env python3
"""Simple CSV validator for `exam_questions` import template.

Usage: python supabase/import/validate_import.py supabase/data/exam_questions_import_template.csv
"""
import csv
import json
import re
import sys
from typing import Optional

REQUIRED_HEADERS = [
    "question_type",
    "tier",
    "calculator",
    "track",
    "subtopic",
    "question",
    "correct_answer",
    "wrong_answers",
    "marks",
    "difficulty",
    "estimated_time_sec",
]

ALLOWED_TIER = {"Foundation Tier", "Higher Tier"}
ALLOWED_CALC = {"Calculator", "Non-Calculator"}
ALLOWED_TRACK = {"gcse", "11plus"}
ALLOWED_11PLUS_TIER = "11+ Standard"
ALLOWED_11PLUS_CALC = "Non-Calculator"
ALLOWED_11PLUS_DIFFICULTY = {1, 2, 3}
ALLOWED_11PLUS_QUESTION_TYPES = {
    "Number",
    "Algebra",
    "Geometry & Measures",
    "Statistics",
    "Problem Solving",
    "Problem Solving & Strategies",
}
ALLOWED_11PLUS_SUBTOPICS = {
    "number,place-value",
    "number,negatives",
    "number,addition-subtraction",
    "number,multiplication-division",
    "number,bidmas",
    "number,factors-multiples-primes",
    "number,powers",
    "number,fractions",
    "number,decimals-percentages",
    "algebra,ratio",
    "algebra,proportion",
    "algebra,basics",
    "algebra,substitution",
    "algebra,equations",
    "algebra,sequences",
    "geometry,shapes",
    "geometry,angles",
    "geometry,perimeter-area",
    "geometry,volume",
    "geometry,measures-time",
    "geometry,coordinates",
    "data,handling",
    "data,charts",
    "data,probability",
    "strategies|word-problems",
    "strategies|logic",
    "strategies|estimation",
    # Backward-compatible aliases
    "problem-solving,word-problems",
    "problem-solving,logic-reasoning",
    "problem-solving,estimation-checking",
    "strategies,word-problems",
    "strategies,logic",
    "strategies,estimation",
}


_RE_SOLVE_LINEAR = re.compile(
    r"^Solve for x:\s*([+-]?\d+)x\s*([+-])\s*(\d+)\s*=\s*([+-]?\d+)\s*$"
)


_RE_SOLVE_BRACKETS = re.compile(
    r"^Solve for x:\s*([+-]?\d+)\(x\s*([+-])\s*(\d+)\)\s*=\s*([+-]?\d+)x\s*([+-])\s*(\d+)\s*$"
)


_RE_SOLVE_EQUATION_PREFIX = re.compile(r"^Solve\s+the\s+equation\s+(.+?)\s*$", re.IGNORECASE)


def _normalize_equation_text(s: str) -> str:
    s = (s or "").strip()
    # Normalize common minus variants.
    s = s.replace("−", "-").replace("–", "-").replace("—", "-")
    # Strip trailing punctuation.
    while s and s[-1] in ".;":
        s = s[:-1].rstrip()
    return s


def _parse_number_token(s: str) -> Optional[float]:
    s = (s or "").strip()
    if not s:
        return None
    # Accept simple fractions like 15/2.
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


def _tokenize_expr(expr: str) -> Optional[list[str]]:
    expr = _normalize_equation_text(expr)
    # Allow common LaTeX wrappers that show up in stored text.
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
        # Unsupported character
        return None

    # Insert implicit multiplication, e.g. 4(2x-3), 2x, )(, x(, )x
    out: list[str] = []
    def is_atom(t: str) -> bool:
        return t == "x" or t == ")" or _parse_number_token(t) is not None

    for idx, t in enumerate(tokens):
        if out:
            prev = out[-1]
            if is_atom(prev) and (t == "(" or t == "x" or _parse_number_token(t) is not None):
                # Don't multiply between ")" and ")" via number rule; handled by is_atom.
                if not (prev in "+-*/(" or t in "+-*/)"):
                    out.append("*")
        out.append(t)
    return out


def _parse_linear_expr(tokens: list[str]) -> Optional[tuple[float, float]]:
    # Returns (a, b) meaning a*x + b
    pos = 0

    def parse_factor() -> Optional[tuple[float, float]]:
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

    def parse_term() -> Optional[tuple[float, float]]:
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

            # Only allow linear results: multiply/divide by a constant.
            if op == "*":
                if a1 != 0.0 and a2 != 0.0:
                    return None
                if a2 == 0.0:
                    left = (a1 * b2, b1 * b2)
                else:
                    left = (a2 * b1, b2 * b1)
            else:
                # Division by constant only
                if a2 != 0.0:
                    return None
                if b2 == 0.0:
                    return None
                left = (a1 / b2, b1 / b2)
        return left

    def parse_expr() -> Optional[tuple[float, float]]:
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


def _solve_linear_equation(equation: str) -> Optional[float]:
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


def _validate_solve_the_equation(question: str, correct_answer: str) -> Optional[str]:
    q = (question or "").strip()
    ca_raw = (correct_answer or "").strip()

    m = _RE_SOLVE_EQUATION_PREFIX.match(_normalize_equation_text(q))
    if not m:
        return None

    equation_text = m.group(1).strip()
    x = _parse_number_token(_normalize_equation_text(ca_raw))
    if x is None:
        return "Solve-the-equation question requires numeric correct_answer"

    solved = _solve_linear_equation(equation_text)
    if solved is None:
        return "Unrecognized/unsupported Solve-the-equation format"
    if abs(solved - x) > 1e-6:
        return "correct_answer does not match solved equation"
    return None


def _parse_signed(sign: str, magnitude: str) -> int:
    v = int(magnitude)
    return v if sign == "+" else -v


def _is_int_like(s: str) -> bool:
    s = (s or "").strip()
    if not s:
        return False
    if s.startswith("-"):
        s = s[1:]
    return s.isdigit()


def _validate_solve_for_x(question: str, correct_answer: str) -> Optional[str]:
    q = (question or "").strip()
    ca = (correct_answer or "").strip()
    if not q.startswith("Solve for x:"):
        return None
    if not _is_int_like(ca):
        return "Solve-for-x question requires integer correct_answer"
    x = int(ca)

    m = _RE_SOLVE_LINEAR.match(q)
    if m:
        coef = int(m.group(1))
        sign = m.group(2)
        c = _parse_signed(sign, m.group(3))
        rhs = int(m.group(4))
        if coef * x + c != rhs:
            return "correct_answer does not satisfy linear equation"
        return None

    m = _RE_SOLVE_BRACKETS.match(q)
    if m:
        a = int(m.group(1))
        b = _parse_signed(m.group(2), m.group(3))
        c = int(m.group(4))
        d = _parse_signed(m.group(5), m.group(6))
        if a * (x + b) != c * x + d:
            return "correct_answer does not satisfy bracket equation"
        return None

    return "Unrecognized Solve-for-x format"


def _parse_pg_text_array_literal(raw: str) -> Optional[list[str]]:
    value = (raw or "").strip()
    if not value.startswith("{") or not value.endswith("}"):
        return None

    body = value[1:-1].strip()
    if not body:
        return []

    items: list[str] = []
    idx = 0
    token = re.compile(r'\s*"((?:[^"\\]|\\.)*)"\s*(?:,|$)')
    while idx < len(body):
        m = token.match(body, idx)
        if not m:
            return None
        items.append(m.group(1).replace('\\"', '"'))
        idx = m.end()
    return items


def _contains_simple_number_latex(text: str) -> bool:
    s = (text or "").strip()
    if not s:
        return False
    # Flag simple numeric tokens wrapped in inline math, e.g. "$2$-digit".
    return re.search(r"\$\s*\d+(?:\.\d+)?\s*\$", s) is not None


def _validate_explanation_structure(explanation: str) -> Optional[str]:
    text = (explanation or "").strip()
    if not text:
        return "explanation is required"

    # Support real line breaks, escaped \n, or HTML line breaks.
    normalized = text
    normalized = re.sub(r"<br\s*/?>", "\n", normalized, flags=re.IGNORECASE)
    normalized = normalized.replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
    if "\n" not in normalized:
        return "explanation must use line breaks between Step 1, Step 2, and Tip"

    has_step_1 = re.search(r"(^|\n)\s*Step\s*1\s*:", normalized, flags=re.IGNORECASE) is not None
    has_step_2 = re.search(r"(^|\n)\s*Step\s*2\s*:", normalized, flags=re.IGNORECASE) is not None
    has_tip = re.search(r"(^|\n)\s*Tip\s*:", normalized, flags=re.IGNORECASE) is not None

    if not has_step_1 or not has_step_2 or not has_tip:
        return "explanation must include 'Step 1:', 'Step 2:' and 'Tip:' lines"
    return None


def validate_row(row, lineno):
    errors = []
    for h in REQUIRED_HEADERS:
        if h not in row:
            errors.append(f"missing header: {h}")
            return errors
    track = (row.get("track") or "gcse").strip().lower()
    if track not in ALLOWED_TRACK:
        errors.append("track must be 'gcse' or '11plus'")

    # parse wrong_answers as PostgreSQL text[] literal
    wa = row.get("wrong_answers", "")
    parsed_wa = _parse_pg_text_array_literal(wa)
    if parsed_wa is None:
        errors.append('wrong_answers must be a PostgreSQL array literal, e.g. {"A","B","C"}')
    else:
        if len(parsed_wa) != 3:
            errors.append("wrong_answers must have exactly 3 items")
        # enforce uniqueness and prevent including the correct answer
        correct = (row.get("correct_answer") or "").strip()
        parsed_norm = [str(x).strip() for x in parsed_wa]
        if any(not v for v in parsed_norm):
            errors.append("wrong_answers must not contain empty options")
        if len(set(parsed_norm)) != len(parsed_norm):
            errors.append("wrong_answers must not contain duplicates")
        if correct and correct in parsed_norm:
            errors.append("wrong_answers must not include correct_answer")

    if _contains_simple_number_latex(row.get("question", "")):
        errors.append("question should not wrap simple numbers in LaTeX (e.g. use 2-digit, not $2$-digit)")
    if _contains_simple_number_latex(row.get("explanation", "")):
        errors.append("explanation should not wrap simple numbers in LaTeX (e.g. use 2-digit, not $2$-digit)")
    # numeric checks
    try:
        marks = int(row.get("marks", "0") or 0)
        if marks < 0:
            errors.append("marks must be >= 0")
    except ValueError:
        errors.append("marks must be integer")
    try:
        diff = int(row.get("difficulty", "3") or 3)
        if not (1 <= diff <= 5):
            errors.append("difficulty must be 1..5")
    except ValueError:
        errors.append("difficulty must be integer")
        diff = None

    tier = (row.get("tier") or "").strip()
    calc = (row.get("calculator") or "").strip()
    question_type = (row.get("question_type") or "").strip()
    subtopic = (row.get("subtopic") or "").strip()

    if track == "11plus":
        if tier != ALLOWED_11PLUS_TIER:
            errors.append("11plus rows must use tier '11+ Standard'")
        if calc != ALLOWED_11PLUS_CALC:
            errors.append("11plus rows must use calculator 'Non-Calculator'")
        if diff is not None and diff not in ALLOWED_11PLUS_DIFFICULTY:
            errors.append("11plus difficulty must be 1 (Fluency), 2 (Application), or 3 (Reasoning)")
        if question_type and question_type not in ALLOWED_11PLUS_QUESTION_TYPES:
            errors.append("11plus question_type must be one of: Number, Algebra, Geometry & Measures, Statistics, Problem Solving, Problem Solving & Strategies")
        if subtopic and subtopic not in ALLOWED_11PLUS_SUBTOPICS:
            errors.append("11plus subtopic is not in the allowed registry")
        explanation_err = _validate_explanation_structure(row.get("explanation", ""))
        if explanation_err:
            errors.append(explanation_err)
    else:
        if tier and tier not in ALLOWED_TIER:
            errors.append("tier must be 'Foundation Tier' or 'Higher Tier'")
        if calc and calc not in ALLOWED_CALC:
            errors.append("calculator must be 'Calculator' or 'Non-Calculator'")

    if subtopic and any(sep in subtopic for sep in ("|", ",")):
        sep = "|" if "|" in subtopic else ","
        parts = subtopic.split(sep, 1)
        if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
            errors.append("subtopic must follow topicKey|subtopicKey or topicKey,subtopicKey format")

    try:
        ets = int(row.get("estimated_time_sec", "0") or 0)
        if ets < 0:
            errors.append("estimated_time_sec must be >= 0")
    except ValueError:
        errors.append("estimated_time_sec must be integer")

    # Semantic validation for certain known patterns to prevent broken questions.
    q = row.get("question", "")
    ca = row.get("correct_answer", "")
    err = _validate_solve_for_x(q, ca)
    if err:
        errors.append(err)
    err = _validate_solve_the_equation(q, ca)
    if err:
        errors.append(err)
    return errors


def main(path):
    errs = 0
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        missing = [h for h in REQUIRED_HEADERS if h not in headers]
        if missing:
            print("Missing required headers:", missing)
            sys.exit(2)
        for i, row in enumerate(reader, start=2):
            row_errors = validate_row(row, i)
            if row_errors:
                errs += 1
                print(f"Row {i} errors:")
                for e in row_errors:
                    print("  -", e)
    if errs:
        print(f"Validation failed: {errs} row(s) with errors")
        sys.exit(1)
    print("Validation passed — CSV looks good.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_import.py <path/to/csv>")
        sys.exit(2)
    main(sys.argv[1])
