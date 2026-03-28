#!/usr/bin/env python3
"""Verify math correctness for common question patterns and prune bad/unverifiable items.

Checks:
- Arithmetic expressions (calculate/evaluate).
- Linear equations, quadratic equations.
- Expansion/factorisation (linear factors).
- Percent change, direct proportion.
- Mean/median, sequences.
- Ratio share, density.
- Rectangle/triangle/cuboid area and perimeter/surface area.
- Circle circumference/sector/arc (numeric or in terms of pi).
- Compound interest.
- Straight-line equation from two points.
- Vector addition.
- Correlation from listed points.
- Rounding to nearest integer/pound.

If a question is verified incorrect, it is deleted.
If --delete-unverified is set, questions that cannot be verified are deleted.

Writes a report to tmp/math_verification_report.json.
Supports resumable runs via tmp/math_verification_checkpoint.json.
"""
from __future__ import annotations

import argparse
import ast
import json
import math
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
REPORT_PATH = os.path.join("tmp", "math_verification_report.json")
CHECKPOINT_PATH = os.path.join("tmp", "math_verification_checkpoint.json")


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


def fetch_page(*, supabase_url: str, headers: Dict[str, str], limit: int, last_id: Optional[str]) -> List[Dict[str, Any]]:
    params = {
        "select": "id,question,correct_answer,explanation,subtopic,tier,calculator,question_type",
        "order": "id",
        "limit": str(limit),
    }
    if last_id:
        params["id"] = f"gt.{last_id}"
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(params)}"
    status, body = _http_json("GET", url, headers, payload=None)
    if status != 200:
        raise SystemExit(f"Fetch failed ({status}): {body}")
    return json.loads(body or "[]")


def delete_row(*, supabase_url: str, headers: Dict[str, str], row_id: str) -> None:
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=eq.{row_id}"
    status, body = _http_json("DELETE", url, headers, payload=None)
    if status not in (200, 204):
        raise SystemExit(f"Failed to delete row {row_id} (status={status}): {body}")


def _clean_text(text: str) -> str:
    return (text or "").replace("−", "-").replace("×", "*").replace("÷", "/")


def _strip_latex(text: str) -> str:
    text = text or ""
    text = text.replace("\\", "")
    text = re.sub(r"\$", "", text)
    text = re.sub(r"\{", "", text)
    text = re.sub(r"\}", "", text)
    text = text.replace("x²", "x^2")
    text = text.replace("x^{2}", "x^2")
    return text


def _parse_fraction_or_float(token: str) -> Optional[float]:
    token = token.strip()
    if not token:
        return None
    token = token.replace(" ", "")
    token = token.replace("+", "")
    if token == "-":
        return -1.0
    m = re.match(r"^(-?\d+)\s*/\s*(-?\d+)$", token)
    if m:
        d = float(m.group(2))
        if abs(d) < 1e-9:
            return None
        return float(m.group(1)) / d
    try:
        return float(token)
    except ValueError:
        return None


def _extract_number(text: str) -> Optional[float]:
    if not text:
        return None
    text = text.replace("\\frac", "frac")
    m = re.search(r"\\frac\{(-?\d+)\}\{(-?\d+)\}", text)
    if m:
        d = float(m.group(2))
        if abs(d) < 1e-9:
            return None
        return float(m.group(1)) / d
    m = re.search(r"-?\d+(?:\.\d+)?\s*/\s*-?\d+(?:\.\d+)?", text)
    if m:
        return _parse_fraction_or_float(m.group(0))
    m = re.search(r"-?\d+(?:\.\d+)?", text)
    if m:
        return float(m.group(0))
    return None


def _approx_equal(a: float, b: float, tol: float = 1e-6) -> bool:
    return abs(a - b) <= tol


def _safe_eval(expr: str) -> Optional[float]:
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return None
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Constant,
                                 ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub, ast.UAdd,
                                 ast.Mod, ast.FloorDiv, ast.Load)):
            return None
    try:
        return float(eval(compile(tree, "<expr>", "eval"), {"__builtins__": {}}))
    except Exception:
        return None


def _extract_expression(question: str) -> Optional[str]:
    q = question
    for key in ["calculate", "evaluate", "work out"]:
        idx = q.lower().find(key)
        if idx != -1:
            expr = q[idx + len(key):]
            expr = expr.split("?")[0].split(".")[0]
            expr = expr.replace(":", " ")
            return expr.strip()
    return None


def parse_linear_expr(expr: str) -> Optional[Tuple[float, float]]:
    expr = _strip_latex(_clean_text(expr))
    expr = expr.replace(" ", "")
    if "x^2" in expr:
        return None
    if expr == "":
        return None
    expr = expr.replace("*", "")
    if expr[0] not in "+-":
        expr = "+" + expr
    terms = re.findall(r"([+-])([^+-]+)", expr)
    a = 0.0
    b = 0.0
    for sign, term in terms:
        s = -1.0 if sign == "-" else 1.0
        if "x" in term:
            coeff = term.replace("x", "")
            if coeff == "":
                val = 1.0
            else:
                val = _parse_fraction_or_float(coeff)
                if val is None:
                    return None
            a += s * val
        else:
            val = _parse_fraction_or_float(term)
            if val is None:
                return None
            b += s * val
    return a, b


def parse_polynomial(expr: str) -> Optional[Tuple[float, float, float]]:
    expr = _strip_latex(_clean_text(expr)).lower()
    expr = expr.replace(" ", "")
    expr = expr.replace("*", "")
    if expr == "":
        return None
    if expr[0] not in "+-":
        expr = "+" + expr
    terms = re.findall(r"([+-])([^+-]+)", expr)
    a = 0.0
    b = 0.0
    c = 0.0
    for sign, term in terms:
        s = -1.0 if sign == "-" else 1.0
        if "x^2" in term:
            coeff = term.replace("x^2", "")
            if coeff == "":
                val = 1.0
            else:
                val = _parse_fraction_or_float(coeff)
                if val is None:
                    return None
            a += s * val
        elif "x" in term:
            coeff = term.replace("x", "")
            if coeff == "":
                val = 1.0
            else:
                val = _parse_fraction_or_float(coeff)
                if val is None:
                    return None
            b += s * val
        else:
            val = _parse_fraction_or_float(term)
            if val is None:
                return None
            c += s * val
    return a, b, c


def parse_linear_in_n(expr: str) -> Optional[Tuple[float, float]]:
    if not expr:
        return None
    replaced = expr.replace("n", "x").replace("N", "x")
    return parse_linear_expr(replaced)


def multiply_linear(a1: float, b1: float, a2: float, b2: float) -> Tuple[float, float, float]:
    return a1 * a2, a1 * b2 + a2 * b1, b1 * b2


def parse_quadratic_coeffs(question: str) -> Optional[Tuple[float, float, float]]:
    q = _strip_latex(_clean_text(question)).lower()
    q = q.replace("x²", "x^2")
    q = q.replace("x^{2}", "x^2")
    q = re.sub(r"[^0-9x^+\-*=. ]", " ", q)
    m = re.search(r"([+-]?\d*)\s*x\^2\s*([+-]\s*\d+)\s*x\s*([+-]\s*\d+)\s*=\s*0", q)
    if not m:
        return None
    a_raw, b_raw, c_raw = m.groups()
    a = 1.0
    if a_raw and a_raw not in ["+", "-"]:
        a = float(a_raw)
    elif a_raw == "-":
        a = -1.0
    b = float(b_raw.replace(" ", ""))
    c = float(c_raw.replace(" ", ""))
    return a, b, c


def parse_root_pair(answer: str) -> Optional[Tuple[float, float]]:
    if not answer:
        return None
    nums = re.findall(r"-?\d+(?:\.\d+)?", answer)
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    if len(nums) == 1:
        return float(nums[0]), float(nums[0])
    return None


def parse_pi_coeff(answer: str) -> Optional[float]:
    if "pi" not in answer.lower() and "π" not in answer:
        return None
    cleaned = answer.lower().replace("π", "pi")
    cleaned = cleaned.replace("\\pi", "pi")
    cleaned = re.sub(r"\\text\{[^}]*\}", "", cleaned)
    cleaned = re.sub(r"\\frac\{([^}]+)\}\{([^}]+)\}", r"(\1/\2)", cleaned)
    cleaned = cleaned.replace("\\times", "*").replace("\\cdot", "*").replace("×", "*")
    cleaned = cleaned.replace("pi", "")
    cleaned = cleaned.replace("{", "(").replace("}", ")")
    cleaned = cleaned.replace("^", "**")
    cleaned = cleaned.replace(" ", "")
    cleaned = re.sub(r"[a-zA-Z]+", "", cleaned)
    cleaned = re.sub(r"\)(?=\()", ")*", cleaned)
    cleaned = re.sub(r"(\d)\(", r"\1*(", cleaned)
    cleaned = re.sub(r"\)(\d)", r")*\1", cleaned)
    if cleaned in ("", "+", "-"):
        return 1.0
    if re.fullmatch(r"[0-9+\-*/().]+", cleaned):
        return _safe_eval(cleaned)
    return None


def parse_two_points(question: str) -> Optional[List[Tuple[float, float]]]:
    pts = re.findall(r"\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)", question)
    if len(pts) >= 2:
        return [(float(x), float(y)) for x, y in pts[:2]]
    return None


def parse_line_answer(answer: str) -> Optional[Tuple[float, float]]:
    ans = _strip_latex(_clean_text(answer)).lower().replace(" ", "")
    m = re.search(r"y=([^x]+)x([+-].+)?", ans)
    if not m:
        return None
    m_raw = m.group(1)
    c_raw = m.group(2) or "+0"
    m_val = _parse_fraction_or_float(m_raw)
    if m_val is None:
        return None
    c_val = _parse_fraction_or_float(c_raw)
    if c_val is None:
        return None
    return m_val, c_val


def parse_vectors(question: str) -> Optional[List[List[float]]]:
    vecs = re.findall(r"begin\{pmatrix\}([^}]*)end\{pmatrix\}", question)
    if not vecs:
        return None
    parsed: List[List[float]] = []
    for v in vecs:
        parts = [p.strip() for p in v.split("\\") if p.strip()]
        nums: List[float] = []
        for p in parts:
            n = _extract_number(p)
            if n is None:
                return None
            nums.append(n)
        if nums:
            parsed.append(nums)
    return parsed


def parse_vector_answer(answer: str) -> Optional[List[float]]:
    vecs = re.findall(r"begin\{pmatrix\}([^}]*)end\{pmatrix\}", answer)
    if not vecs:
        return None
    v = vecs[0]
    parts = [p.strip() for p in v.split("\\") if p.strip()]
    nums: List[float] = []
    for p in parts:
        n = _extract_number(p)
        if n is None:
            return None
        nums.append(n)
    return nums


def verify_question(question: str, correct_answer: str) -> Tuple[bool, bool, str]:
    q = question or ""
    ans = correct_answer or ""
    q_lower = q.lower()

    # Quadratic equation
    if "quadratic" in q_lower or "x^2" in _strip_latex(q_lower) or "x²" in q:
        coeffs = parse_quadratic_coeffs(q)
        if coeffs:
            a, b, c = coeffs
            disc = b * b - 4 * a * c
            if disc < -1e-9:
                return True, False, "quadratic_negative_discriminant"
            disc = max(0.0, disc)
            root1 = (-b + math.sqrt(disc)) / (2 * a)
            root2 = (-b - math.sqrt(disc)) / (2 * a)
            expected = (root1, root2)
            got = parse_root_pair(ans)
            if not got:
                return True, False, "quadratic_missing_roots"
            exp_sorted = sorted(expected)
            got_sorted = sorted(got)
            ok = _approx_equal(exp_sorted[0], got_sorted[0]) and _approx_equal(exp_sorted[1], got_sorted[1])
            return True, ok, "quadratic"

    # Linear equation
    if "solve" in q_lower and "x" in q_lower and "=" in q:
        cleaned = _strip_latex(_clean_text(q))
        m = re.search(r"([^=]+)=([^=]+)", cleaned)
        if m:
            left, right = m.group(1), m.group(2)
            left_lr = parse_linear_expr(left)
            right_lr = parse_linear_expr(right)
            if left_lr and right_lr:
                a1, b1 = left_lr
                a2, b2 = right_lr
                denom = a1 - a2
                if abs(denom) < 1e-9:
                    return True, False, "linear_no_unique_solution"
                expected = (b2 - b1) / denom
                got = _extract_number(ans)
                if got is None:
                    return True, False, "linear_missing_answer"
                return True, _approx_equal(expected, got), "linear"

    # Expand & simplify
    if "expand" in q_lower and "(" in q:
        factors = re.findall(r"\(([^)]+)\)", q)
        if factors:
            # Simple coefficient * (ax + b)
            if len(factors) == 1:
                expr = factors[0]
                coeff_match = re.search(r"([-+]?\d+(?:\.\d+)?)\s*\(", q)
                coeff = 1.0
                if coeff_match:
                    coeff = float(coeff_match.group(1))
                lin = parse_linear_expr(expr)
                if lin:
                    a, b = lin
                    a *= coeff
                    b *= coeff
                    expected = (0.0, a, b)
                    got = parse_polynomial(ans)
                    if got:
                        return True, all(_approx_equal(x, y) for x, y in zip(expected, got)), "expand"
            # Product of two linear factors (no extra parentheses)
            if len(factors) == 2 and q.count("(") == 2:
                f1 = parse_linear_expr(factors[0])
                f2 = parse_linear_expr(factors[1])
                if f1 and f2:
                    a, b, c = multiply_linear(f1[0], f1[1], f2[0], f2[1])
                    got = parse_polynomial(ans)
                    if got:
                        return True, all(_approx_equal(x, y) for x, y in zip((a, b, c), got)), "expand"

    # Rectangle area in terms of x (product of two linear factors)
    if "rectangle" in q_lower and "area" in q_lower and "x" in q_lower and "(" in q:
        factors = re.findall(r"\(([^)]+)\)", q)
        if len(factors) >= 2:
            f1 = parse_linear_expr(factors[0])
            f2 = parse_linear_expr(factors[1])
            if f1 and f2:
                a, b, c = multiply_linear(f1[0], f1[1], f2[0], f2[1])
                got = parse_polynomial(ans)
                if got:
                    return True, all(_approx_equal(x, y) for x, y in zip((a, b, c), got)), "rectangle_poly"

    # Factorise simple linear (k(ax+b))
    if "factorise" in q_lower or "factorize" in q_lower:
        original = parse_polynomial(q)
        if original:
            factors = re.findall(r"\(([^)]+)\)", ans)
            lead = ans.split("(")[0].strip() if "(" in ans else ""
            lead_coeff = _parse_fraction_or_float(lead) if lead else 1.0
            if factors:
                if len(factors) == 1:
                    lin = parse_linear_expr(factors[0])
                    if lin and lead_coeff is not None:
                        a, b, c = 0.0, lin[0] * lead_coeff, lin[1] * lead_coeff
                        return True, all(_approx_equal(x, y) for x, y in zip((a, b, c), original)), "factorise"
                if len(factors) >= 2:
                    f1 = parse_linear_expr(factors[0])
                    f2 = parse_linear_expr(factors[1])
                    if f1 and f2 and lead_coeff is not None:
                        a, b, c = multiply_linear(f1[0], f1[1], f2[0], f2[1])
                        a *= lead_coeff
                        b *= lead_coeff
                        c *= lead_coeff
                        return True, all(_approx_equal(x, y) for x, y in zip((a, b, c), original)), "factorise"

    # Direct proportion
    if "directly proportional" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 3:
            x1, y1, x2 = nums[0], nums[1], nums[2]
            if abs(x1) > 1e-9:
                k = y1 / x1
                expected = k * x2
                got = _extract_number(ans)
                if got is None:
                    return True, False, "proportion_missing_answer"
                return True, _approx_equal(expected, got), "proportion"

    # Percentage change or compound interest
    if "%" in q and "year" in q_lower and ("increase" in q_lower or "decrease" in q_lower or "compound" in q_lower):
        rate_match = re.search(r"(\d+(?:\.\d+)?)%", q_lower)
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if rate_match and len(nums) >= 2:
            rate_val = float(rate_match.group(1))
            rate = rate_val / 100.0
            # remove one occurrence of rate from nums
            remaining = nums[:]
            for i, n in enumerate(remaining):
                if _approx_equal(n, rate_val):
                    remaining.pop(i)
                    break
            years_match = re.search(r"after\\s+(\\d+(?:\\.\\d+)?)\\s+year", q_lower)
            if not years_match:
                years_match = re.search(r"for\\s+(\\d+(?:\\.\\d+)?)\\s+year", q_lower)
            years = float(years_match.group(1)) if years_match else (remaining[1] if len(remaining) >= 2 else 1.0)
            principal = remaining[0] if remaining else None
            if principal is not None:
                factor = (1 + rate) ** years if "increase" in q_lower or "compound" in q_lower else (1 - rate) ** years
                expected = principal * factor
                got = _extract_number(ans)
                if got is None:
                    return True, False, "compound_missing_answer"
                # allow 2dp rounding
                if _approx_equal(expected, got, 1e-2) or _approx_equal(round(expected, 2), got, 1e-2):
                    return True, True, "compound"
                return True, False, "compound"

    # Mean / median
    if "mean" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 2:
            expected = sum(nums) / len(nums)
            got = _extract_number(ans)
            if got is None:
                return True, False, "mean_missing_answer"
            return True, _approx_equal(expected, got), "mean"
    if "median" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 2:
            nums.sort()
            mid = len(nums) // 2
            expected = nums[mid] if len(nums) % 2 == 1 else (nums[mid - 1] + nums[mid]) / 2.0
            got = _extract_number(ans)
            if got is None:
                return True, False, "median_missing_answer"
            return True, _approx_equal(expected, got), "median"

    # Sequences (arithmetic or geometric)
    if "sequence" in q_lower:
        seq = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(seq) >= 3:
            d1 = seq[1] - seq[0]
            d2 = seq[2] - seq[1]
            if "nth term" in q_lower or "n-th term" in q_lower:
                if _approx_equal(d1, d2):
                    d = d1
                    a1 = seq[0]
                    expected_a = d
                    expected_b = a1 - d
                    parsed = parse_linear_in_n(ans)
                    if parsed:
                        got_a, got_b = parsed
                        return True, _approx_equal(expected_a, got_a) and _approx_equal(expected_b, got_b), "sequence_nth"
            if _approx_equal(d1, d2):
                expected = seq[-1] + d1
                got = _extract_number(ans)
                if got is None:
                    return True, False, "sequence_missing_answer"
                return True, _approx_equal(expected, got), "sequence"
            if seq[0] != 0 and _approx_equal(seq[1] / seq[0], seq[2] / seq[1]):
                r = seq[1] / seq[0]
                expected = seq[-1] * r
                got = _extract_number(ans)
                if got is None:
                    return True, False, "sequence_missing_answer"
                return True, _approx_equal(expected, got), "sequence"

    # Ratio share
    if "ratio" in q_lower and "share" in q_lower:
        if "then" in q_lower:
            return False, False, "ratio_multi_step"
        total_match = re.search(r"share\s*£?\s*(-?\d+(?:\.\d+)?)", q_lower)
        ratio_match = re.search(r"ratio\s*(\d+)\s*:\s*(\d+)", q_lower)
        if total_match and ratio_match:
            total = float(total_match.group(1))
            a = float(ratio_match.group(1))
            b = float(ratio_match.group(2))
            if a + b != 0:
                smaller = total * min(a, b) / (a + b)
                larger = total * max(a, b) / (a + b)
                got = _extract_number(ans)
                if got is None:
                    return True, False, "ratio_missing_answer"
                if "smaller" in q_lower or "smallest" in q_lower:
                    return True, _approx_equal(smaller, got), "ratio"
                if "larger" in q_lower or "largest" in q_lower:
                    return True, _approx_equal(larger, got), "ratio"

    # Expected value from probability
    if "probability" in q_lower and "expected" in q_lower:
        prob = None
        m = re.search(r"\\frac\{(\d+)\}\{(\d+)\}", q)
        if m:
            denom = float(m.group(2))
            if abs(denom) > 1e-9:
                prob = float(m.group(1)) / denom
        if prob is None:
            m = re.search(r"(\d+)\s*/\s*(\d+)", q)
            if m:
                denom = float(m.group(2))
                if abs(denom) > 1e-9:
                    prob = float(m.group(1)) / denom
        trials = None
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if nums:
            trials = nums[-1]
        if prob is not None and trials is not None:
            expected = prob * trials
            got = _extract_number(ans)
            if got is None:
                return True, False, "probability_missing_answer"
            return True, _approx_equal(expected, got, 1e-2), "probability"

    # Density
    if "density" in q_lower and "mass" in q_lower and "volume" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 2:
            mass, volume = nums[0], nums[1]
            if abs(volume) > 1e-9:
                expected = mass / volume
                got = _extract_number(ans)
                if got is None:
                    return True, False, "density_missing_answer"
                return True, _approx_equal(expected, got, 1e-2), "density"

    # Rectangle area/perimeter
    if "rectangle" in q_lower and ("area" in q_lower or "perimeter" in q_lower):
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 2:
            length, width = nums[0], nums[1]
            if "area" in q_lower:
                expected = length * width
            else:
                expected = 2 * (length + width)
            got = _extract_number(ans)
            if got is None:
                return True, False, "rectangle_missing_answer"
            return True, _approx_equal(expected, got), "rectangle"

    # Triangle area
    if "triangle" in q_lower and "area" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 2:
            base, height = nums[0], nums[1]
            expected = 0.5 * base * height
            got = _extract_number(ans)
            if got is None:
                return True, False, "triangle_missing_answer"
            return True, _approx_equal(expected, got), "triangle"

    # Cuboid surface area
    if "cuboid" in q_lower and "surface area" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 3:
            l, w, h = nums[0], nums[1], nums[2]
            expected = 2 * (l * w + l * h + w * h)
            got = _extract_number(ans)
            if got is None:
                return True, False, "cuboid_missing_answer"
            return True, _approx_equal(expected, got), "cuboid"

    # Circumference / arc / sector
    if "circumference" in q_lower and "radius" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if nums:
            r = nums[0]
            pi_value_match = re.search(r"pi\s*=\s*(\d+(?:\.\d+)?)", q_lower)
            if "in terms of" in q_lower:
                coeff = 2 * r
                got_coeff = parse_pi_coeff(ans)
                if got_coeff is None:
                    return False, False, "circumference_unparsed_pi"
                return True, _approx_equal(coeff, got_coeff), "circumference_pi"
            if pi_value_match:
                pi_val = float(pi_value_match.group(1))
                expected = 2 * pi_val * r
                got = _extract_number(ans)
                if got is None:
                    return False, False, "circumference_unparsed_numeric"
                return True, _approx_equal(expected, got, 1e-2), "circumference"
            if "pi" in q_lower or "\\pi" in q or "π" in q:
                # If the prompt mentions pi but not \"in terms of\", allow either numeric or pi-form answers.
                got_coeff = parse_pi_coeff(ans)
                if got_coeff is not None:
                    coeff = 2 * r
                    return True, _approx_equal(coeff, got_coeff), "circumference_pi"
            expected = 2 * math.pi * r
            got = _extract_number(ans)
            if got is None:
                return False, False, "circumference_unparsed_numeric"
            return True, _approx_equal(expected, got, 1e-2), "circumference"

    if "arc" in q_lower and "radius" in q_lower and "angle" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 2:
            r, angle = nums[0], nums[1]
            if "pi =" in q_lower:
                pi_match = re.search(r"pi\s*=\s*(\d+(?:\.\d+)?)", q_lower)
                pi_val = float(pi_match.group(1)) if pi_match else math.pi
            else:
                pi_val = math.pi
            expected = (angle / 360.0) * 2 * pi_val * r
            got = _extract_number(ans)
            if got is None:
                return True, False, "arc_missing_answer"
            return True, _approx_equal(expected, got, 1e-2), "arc"

    if "sector" in q_lower and "radius" in q_lower and "angle" in q_lower and "area" in q_lower:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]
        if len(nums) >= 2:
            r, angle = nums[0], nums[1]
            pi_value_match = re.search(r"pi\s*=\s*(\d+(?:\.\d+)?)", q_lower)
            if "in terms of" in q_lower:
                coeff = (angle / 360.0) * r * r
                got_coeff = parse_pi_coeff(ans)
                if got_coeff is None:
                    return False, False, "sector_unparsed_pi"
                return True, _approx_equal(coeff, got_coeff), "sector_pi"
            if pi_value_match:
                pi_val = float(pi_value_match.group(1))
                expected = (angle / 360.0) * pi_val * r * r
                got = _extract_number(ans)
                if got is None:
                    return False, False, "sector_unparsed_numeric"
                return True, _approx_equal(expected, got, 1e-2), "sector"
            if "pi" in q_lower or "\\pi" in q or "π" in q:
                got_coeff = parse_pi_coeff(ans)
                if got_coeff is not None:
                    coeff = (angle / 360.0) * r * r
                    return True, _approx_equal(coeff, got_coeff), "sector_pi"
            expected = (angle / 360.0) * math.pi * r * r
            got = _extract_number(ans)
            if got is None:
                return False, False, "sector_unparsed_numeric"
            return True, _approx_equal(expected, got, 1e-2), "sector"

    # Straight line through two points
    if "line" in q_lower and "(" in q and ")" in q:
        pts = parse_two_points(q)
        if pts:
            (x1, y1), (x2, y2) = pts
            if abs(x2 - x1) > 1e-9:
                m_val = (y2 - y1) / (x2 - x1)
                c_val = y1 - m_val * x1
                parsed = parse_line_answer(ans)
                if parsed:
                    m_ans, c_ans = parsed
                    return True, _approx_equal(m_val, m_ans, 1e-2) and _approx_equal(c_val, c_ans, 1e-2), "line"

    # Vector addition
    if "vector" in q_lower or "mathbf" in q_lower:
        vecs = parse_vectors(q)
        if vecs and len(vecs) >= 2:
            op = "add"
            if re.search(r"a\s*-\s*b", q_lower) or re.search(r"\\mathbf\{a\}\s*-\s*\\mathbf\{b\}", q_lower):
                op = "sub"
            if op == "sub":
                expected = [a - b for a, b in zip(vecs[0], vecs[1])]
            else:
                expected = [sum(items) for items in zip(vecs[0], vecs[1])]
            got = parse_vector_answer(ans)
            if got:
                if len(got) == len(expected):
                    return True, all(_approx_equal(a, b) for a, b in zip(expected, got)), "vector"

    # Correlation from points
    if "correlation" in q_lower and "(" in q:
        pts = re.findall(r"\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)", q)
        if len(pts) >= 2:
            xs = [float(x) for x, _ in pts]
            ys = [float(y) for _, y in pts]
            mean_x = sum(xs) / len(xs)
            mean_y = sum(ys) / len(ys)
            cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
            var_x = sum((x - mean_x) ** 2 for x in xs)
            var_y = sum((y - mean_y) ** 2 for y in ys)
            if var_x > 1e-9 and var_y > 1e-9:
                corr_coeff = cov / math.sqrt(var_x * var_y)
                if abs(corr_coeff) < 0.2:
                    corr = "no"
                else:
                    corr = "positive" if corr_coeff > 0 else "negative"
                ans_lower = ans.lower()
                return True, corr in ans_lower, "correlation"

    # Rounding
    if "rounded" in q_lower and "nearest" in q_lower:
        num = _extract_number(q)
        if num is not None:
            if "pound" in q_lower or "integer" in q_lower or "whole" in q_lower:
                expected = int(math.floor(num + 0.5))
                got = _extract_number(ans)
                if got is None:
                    return True, False, "rounding_missing_answer"
                return True, _approx_equal(expected, got), "rounding"

    # Arithmetic calculate/evaluate
    expr = _extract_expression(q)
    if expr:
        expr = _clean_text(expr)
        expr = expr.replace("^", "**")
        if re.fullmatch(r"[0-9+\-*/().\s**]+", expr):
            expected = _safe_eval(expr)
            if expected is not None:
                got = _extract_number(ans)
                if got is None:
                    return True, False, "arithmetic_missing_answer"
                return True, _approx_equal(expected, got), "arithmetic"

    return False, False, "unverified"


def _load_checkpoint() -> Optional[Dict[str, Any]]:
    if not os.path.exists(CHECKPOINT_PATH):
        return None
    with open(CHECKPOINT_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_checkpoint(payload: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(CHECKPOINT_PATH), exist_ok=True)
    with open(CHECKPOINT_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify math correctness and prune invalid/unverifiable questions.")
    parser.add_argument("--delete-unverified", action="store_true", help="Delete rows that cannot be verified.")
    parser.add_argument("--sleep", type=float, default=0.0, help="Sleep between deletes (seconds).")
    parser.add_argument("--limit", type=int, default=300, help="Rows per page.")
    parser.add_argument("--max-rows", type=int, default=600, help="Max rows to process in this run.")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint if available.")
    args = parser.parse_args()

    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    stats = {
        "total": 0,
        "verified": 0,
        "correct": 0,
        "incorrect": 0,
        "unverified": 0,
        "deleted_incorrect": 0,
        "deleted_unverified": 0,
    }
    samples = {
        "incorrect": [],
        "unverified": [],
    }

    last_id = None
    if args.resume:
        checkpoint = _load_checkpoint()
        if checkpoint:
            last_id = checkpoint.get("last_id")
            stats.update(checkpoint.get("stats", {}))
            samples.update(checkpoint.get("samples", {}))

    processed = 0
    while True:
        if processed >= args.max_rows:
            break
        rows = fetch_page(supabase_url=supabase_url, headers=headers, limit=args.limit, last_id=last_id)
        if not rows:
            break
        for row in rows:
            stats["total"] += 1
            processed += 1
            q = str(row.get("question") or "")
            ans = str(row.get("correct_answer") or "")
            verified, ok, reason = verify_question(q, ans)
            if verified:
                stats["verified"] += 1
                if ok:
                    stats["correct"] += 1
                else:
                    stats["incorrect"] += 1
                    if len(samples["incorrect"]) < 30:
                        samples["incorrect"].append({
                            "id": row["id"],
                            "question": q,
                            "correct_answer": ans,
                            "reason": reason,
                        })
                    delete_row(supabase_url=supabase_url, headers=headers, row_id=row["id"])
                    stats["deleted_incorrect"] += 1
                    if args.sleep:
                        time.sleep(args.sleep)
            else:
                stats["unverified"] += 1
                if len(samples["unverified"]) < 30:
                    samples["unverified"].append({
                        "id": row["id"],
                        "question": q,
                        "correct_answer": ans,
                        "reason": reason,
                    })
                if args.delete_unverified:
                    delete_row(supabase_url=supabase_url, headers=headers, row_id=row["id"])
                    stats["deleted_unverified"] += 1
                    if args.sleep:
                        time.sleep(args.sleep)
            last_id = row["id"]
            if processed >= args.max_rows:
                break

    checkpoint_payload = {"last_id": last_id, "stats": stats, "samples": samples}
    _save_checkpoint(checkpoint_payload)

    report = {"stats": stats, "samples": samples, "checkpoint": {"last_id": last_id}}
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
