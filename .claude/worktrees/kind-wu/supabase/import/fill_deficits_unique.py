#!/usr/bin/env python3
"""Fill deficits to reach 10 per bucket with UNIQUE, template-generated questions.

Pipeline per question:
1) Create question + step-by-step explanation.
2) Extract correct answer from explanation.
3) Build 3 wrong answers.
4) Insert into exam_questions.

Requires:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
"""
from __future__ import annotations

import json
import math
import os
import random
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional, Tuple

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
MAPPING_PATH = os.path.join(os.path.dirname(__file__), "gcse_mini_subtopics.json")
DEFICITS_PATH = os.path.join("tmp", "deficits.json")

TIERS = ["Foundation Tier", "Higher Tier"]
CALCS = ["Calculator", "Non-Calculator"]


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


def _auth_headers(service_key: str) -> Dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }


def _chunk(items: List[Any], size: int) -> Iterable[List[Any]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def load_subtopics(mapping_path: str) -> Dict[str, str]:
    with open(mapping_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    out: Dict[str, str] = {}
    for topic in data.get("topics", []):
        topic_name = topic.get("topicName")
        topic_key = topic.get("topicKey")
        for sub in topic.get("subtopics", []):
            key = sub.get("key")
            if topic_name and topic_key and key:
                out[f"{topic_key}|{key}"] = topic_name
    return out


def fetch_existing_questions(*, supabase_url: str, headers: Dict[str, str], subtopic_id: str, limit: int = 1000) -> List[str]:
    rows: List[str] = []
    offset = 0
    while True:
        params = {
            "select": "question",
            "subtopic": f"eq.{subtopic_id}",
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
        for r in page:
            q = str(r.get("question") or "").strip()
            if q:
                rows.append(q)
        offset += limit
    return rows


def explanation_final_answer(explanation: str) -> Optional[str]:
    if not explanation:
        return None
    for line in reversed(explanation.splitlines()):
        m = re.search(r"Final answer\s*:\s*(.+)$", line.strip(), re.I)
        if m:
            return m.group(1).strip()
    return None


def fmt_dp(value: float, dp: int) -> str:
    s = f"{value:.{dp}f}"
    if s.startswith("-0") and abs(value) < 1e-9:
        s = s[1:]
    # trim trailing zeros for dp=0
    if dp == 0:
        s = str(int(round(value)))
    return s


def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return abs(a)


def simplify_frac(n: int, d: int) -> Tuple[int, int]:
    g = gcd(n, d)
    return n // g, d // g


def frac_str(n: int, d: int) -> str:
    n, d = simplify_frac(n, d)
    return f"{n}/{d}"


def latex_column_vector(x: str, y: str) -> str:
    """Render a 2-component vector as a LaTeX column vector."""
    return f"\\begin{{pmatrix}}{x}\\\\{y}\\end{{pmatrix}}"


def latexify_text(text: str) -> str:
    """Ensure commonly generated math strings use proper LaTeX syntax."""
    if not text:
        return text
    result = text.strip()

    greek_map = {
        "theta": "\\theta",
        "phi": "\\phi",
        "alpha": "\\alpha",
        "beta": "\\beta",
        "gamma": "\\gamma",
        "delta": "\\delta",
        "sigma": "\\sigma",
        "pi": "\\pi",
    }
    trig_funcs = ["sin", "cos", "tan", "sec", "csc", "cot", "lim", "log", "ln"]

    for func in trig_funcs:
        result = re.sub(rf"(?<!\\)\b{func}\b(?=\s*\()", rf"\\{func}", result, flags=re.IGNORECASE)

    for key, val in greek_map.items():
        result = re.sub(rf"(?<!\\)\b{key}\b", val, result)

    # Convert simple subscripted variables like x1 → x_{1}
    result = re.sub(r"(?<!\\)\b([A-Za-z])(\d)(?!\d)", r"\1_{\2}", result)

    def replace_fraction(match: re.Match[str]) -> str:
        num = match.group(1).strip()
        den = match.group(2).strip()
        return f"\\frac{{{num}}}{{{den}}}"

    fraction_pattern = re.compile(
        r"(?<!\\)\b((?:\([^)]*\)|[A-Za-z0-9]+))\s*/\s*((?:\([^)]*\)|[A-Za-z0-9]+))\b"
    )
    result = fraction_pattern.sub(replace_fraction, result)

    # Normalize unicode multiplication symbols
    result = result.replace("×", "\\times")
    result = result.replace("÷", "\\div")

    return result


def wrong_numeric(rng: random.Random, correct: float, unit: str = "", dp: Optional[int] = None) -> List[str]:
    wrongs: List[str] = []
    for delta in rng.sample([1, -1, 2, -2, 3, -3, 5, -5], 6):
        val = correct + delta
        if dp is None:
            s = str(int(val)) if abs(val - int(val)) < 1e-9 else str(val)
        else:
            s = fmt_dp(val, dp)
        if unit:
            s = f"{s} {unit}"
        if s not in wrongs and s != (f"{fmt_dp(correct, dp) if dp is not None else correct} {unit}".strip()):
            wrongs.append(s)
        if len(wrongs) >= 3:
            break
    while len(wrongs) < 3:
        val = correct + rng.choice([0.5, -0.5, 1.5, -1.5])
        s = fmt_dp(val, dp or 1)
        if unit:
            s = f"{s} {unit}"
        if s not in wrongs:
            wrongs.append(s)
    return wrongs[:3]


def wrong_fraction(rng: random.Random, n: int, d: int) -> List[str]:
    wrongs: List[str] = []
    candidates = [(n + 1, d), (n - 1, d), (n, d + 1), (n, d - 1), (n + 2, d), (n, d + 2)]
    for a, b in candidates:
        if b == 0 or a == 0:
            continue
        if a < 0 or b < 0:
            continue
        s = frac_str(a, b)
        if s not in wrongs and s != frac_str(n, d):
            wrongs.append(s)
        if len(wrongs) >= 3:
            break
    while len(wrongs) < 3:
        a = max(1, n + rng.choice([-2, -1, 1, 2]))
        b = max(2, d + rng.choice([-2, -1, 1, 2]))
        s = frac_str(a, b)
        if s not in wrongs:
            wrongs.append(s)
    return wrongs[:3]


def build_explanation(steps: List[str], answer: str) -> str:
    out = []
    for i, step in enumerate(steps, start=1):
        out.append(f"Step {i}: {step}")
    out.append("")
    out.append(f"Final answer: {answer}")
    return "\n".join(out)


def gen_integers(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(-20, 20)
    b = rng.randint(-20, 20)
    c = rng.randint(-10, 10)
    question = f"Calculate {a} + ({b}) - ({c})."
    correct = a + b - c
    answer = str(correct)
    explanation = build_explanation(
        [f"Add {a} and {b} to get {a + b}.", f"Subtract {c}: {a + b} - {c} = {correct}."] ,
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_fractions(rng: random.Random) -> Tuple[str, str, List[str], str]:
    d = rng.choice([4, 5, 6, 8, 10, 12])
    n = rng.randint(1, d - 1)
    total = rng.randint(6, 30) * d
    question = f"Find {frac_str(n, d)} of {total}."
    correct = total * n // d
    answer = str(correct)
    explanation = build_explanation(
        [f"Divide {total} by {d}: {total} / {d} = {total // d}.", f"Multiply by {n}: {total // d} x {n} = {correct}."] ,
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_fdp(rng: random.Random) -> Tuple[str, str, List[str], str]:
    mode = rng.choice(["dec_to_frac", "frac_to_dec", "dec_to_perc", "perc_to_dec"]) 
    if mode == "dec_to_frac":
        d = rng.choice([4, 5, 8, 10, 20, 25])
        n = rng.randint(1, d - 1)
        dec = n / d
        question = f"Write {fmt_dp(dec, 2)} as a fraction in simplest form."
        answer = frac_str(n, d)
        explanation = build_explanation(
            [f"{fmt_dp(dec, 2)} = {int(dec*100)}/100.", "Simplify the fraction by dividing top and bottom by their HCF."],
            answer,
        )
        wrongs = wrong_fraction(rng, n, d)
        return question, answer, wrongs, explanation
    if mode == "frac_to_dec":
        d = rng.choice([4, 5, 8, 10, 20])
        n = rng.randint(1, d - 1)
        dec = n / d
        question = f"Write {frac_str(n, d)} as a decimal."
        answer = fmt_dp(dec, 2)
        explanation = build_explanation(
            [f"Divide {n} by {d}.", f"{n} / {d} = {fmt_dp(dec, 4)}..., so to 2 d.p. it is {answer}."],
            answer,
        )
        wrongs = wrong_numeric(rng, dec, dp=2)
        return question, answer, wrongs, explanation
    if mode == "dec_to_perc":
        dec = rng.choice([0.12, 0.25, 0.4, 0.375, 0.6, 0.8])
        question = f"Write {fmt_dp(dec, 3).rstrip('0').rstrip('.')} as a percentage."
        answer = f"{fmt_dp(dec*100, 1).rstrip('0').rstrip('.')}%"
        explanation = build_explanation(
            ["Multiply by 100 to convert decimal to percentage.", f"{dec} x 100 = {dec*100}."],
            answer,
        )
        wrongs = [f"{fmt_dp(dec*10,1).rstrip('0').rstrip('.')}%", f"{fmt_dp(dec*1000,1).rstrip('0').rstrip('.')}%", f"{fmt_dp(dec*50,1).rstrip('0').rstrip('.')}%"]
        return question, answer, wrongs, explanation
    # perc_to_dec
    perc = rng.choice([12, 15, 20, 35, 62.5])
    question = f"Write {perc}% as a decimal."
    answer = fmt_dp(perc/100, 3).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["Divide by 100 to convert percentage to decimal.", f"{perc} / 100 = {perc/100}."] ,
        answer,
    )
    wrongs = [fmt_dp(perc/10, 2), fmt_dp(perc/1000, 3), fmt_dp(perc/50, 2)]
    return question, answer, wrongs, explanation


def gen_percentages(rng: random.Random) -> Tuple[str, str, List[str], str]:
    base = rng.randint(80, 400)
    pct = rng.choice([5, 10, 12, 15, 20, 25])
    mode = rng.choice(["of", "increase", "decrease"])
    if mode == "of":
        question = f"Calculate {pct}% of {base}."
        correct = base * pct / 100
        answer = fmt_dp(correct, 2).rstrip('0').rstrip('.')
        explanation = build_explanation(
            [f"{pct}% means {pct}/100.", f"{pct}/100 x {base} = {correct}."],
            answer,
        )
        wrongs = wrong_numeric(rng, correct, dp=2)
        return question, answer, wrongs, explanation
    if mode == "increase":
        question = f"Increase {base} by {pct}%."
        increase = base * pct / 100
        correct = base + increase
        answer = fmt_dp(correct, 2).rstrip('0').rstrip('.')
        explanation = build_explanation(
            [f"{pct}% of {base} is {increase}.", f"Add this to {base}: {base} + {increase} = {correct}."],
            answer,
        )
        wrongs = wrong_numeric(rng, correct, dp=2)
        return question, answer, wrongs, explanation
    question = f"Decrease {base} by {pct}%."
    decrease = base * pct / 100
    correct = base - decrease
    answer = fmt_dp(correct, 2).rstrip('0').rstrip('.')
    explanation = build_explanation(
        [f"{pct}% of {base} is {decrease}.", f"Subtract this from {base}: {base} - {decrease} = {correct}."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct, dp=2)
    return question, answer, wrongs, explanation


def gen_powers(rng: random.Random) -> Tuple[str, str, List[str], str]:
    base = rng.choice([2, 3, 4, 5, 6, 7, 8, 9])
    power = rng.choice([2, 3, 4])
    question = f"Evaluate {base}^{power}."
    correct = base ** power
    answer = str(correct)
    explanation = build_explanation(
        [f"{base}^{power} means {base} multiplied by itself {power} times.", f"{base}^{power} = {correct}."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_factors_multiples(rng: random.Random) -> Tuple[str, str, List[str], str]:
    n = rng.choice([24, 30, 36, 40, 42, 48, 54])
    factors = [i for i in range(1, n + 1) if n % i == 0]
    question = f"How many factors does {n} have?"
    correct = len(factors)
    answer = str(correct)
    explanation = build_explanation(
        ["List all factor pairs and count them.", f"{n} has {correct} factors."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_hcf_lcm(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.choice([12, 18, 24, 30, 36, 40, 45])
    b = rng.choice([20, 24, 30, 36, 42, 48])
    mode = rng.choice(["hcf", "lcm"])
    if mode == "hcf":
        h = math.gcd(a, b)
        question = f"Find the HCF of {a} and {b}."
        answer = str(h)
        explanation = build_explanation(
            ["Find prime factors of both numbers.", f"HCF is the product of common factors: {h}."],
            answer,
        )
        wrongs = wrong_numeric(rng, h)
        return question, answer, wrongs, explanation
    # lcm
    l = abs(a * b) // math.gcd(a, b)
    question = f"Find the LCM of {a} and {b}."
    answer = str(l)
    explanation = build_explanation(
        ["Find prime factors of both numbers.", f"LCM is the product of highest powers: {l}."],
        answer,
    )
    wrongs = wrong_numeric(rng, l)
    return question, answer, wrongs, explanation


def gen_bidmas(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(2, 9)
    b = rng.randint(2, 9)
    c = rng.randint(2, 9)
    question = f"Evaluate: {a} + {b} x ({c} + {a})."
    correct = a + b * (c + a)
    answer = str(correct)
    explanation = build_explanation(
        [f"Brackets first: {c} + {a} = {c + a}.", f"Multiply: {b} x {c + a} = {b * (c + a)}.", f"Add {a}: {a} + {b * (c + a)} = {correct}."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_rounding_bounds(rng: random.Random) -> Tuple[str, str, List[str], str]:
    value = rng.choice([3.4, 6.2, 8.7, 12.3, 15.6])
    question = f"{value} is rounded to 1 decimal place. What is the upper bound?"
    correct = value + 0.05
    answer = fmt_dp(correct, 2)
    explanation = build_explanation(
        ["For 1 d.p., the half step is 0.05.", f"Upper bound = {value} + 0.05 = {answer}."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct, dp=2)
    return question, answer, wrongs, explanation


def gen_standard_form(rng: random.Random) -> Tuple[str, str, List[str], str]:
    num = rng.choice([3.2, 4.5, 6.8, 7.1])
    power = rng.choice([4, 5, 6])
    question = f"Write {num} × 10^{power} as an ordinary number."
    correct = num * (10 ** power)
    answer = str(int(correct))
    explanation = build_explanation(
        [f"Move the decimal point {power} places to the right.", f"{num} × 10^{power} = {answer}."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_surds(rng: random.Random) -> Tuple[str, str, List[str], str]:
    outside = rng.randint(2, 7)
    inside = rng.choice([2, 3, 5, 6, 7, 10, 11, 13])
    n = outside * outside * inside
    question = f"Simplify sqrt({n})."
    answer = f"{outside} sqrt({inside})"
    explanation = build_explanation(
        [f"{n} = {outside*outside} x {inside}.", f"sqrt({n}) = sqrt({outside*outside}) x sqrt({inside}) = {outside} sqrt({inside})."],
        answer,
    )
    wrongs = [f"{outside} sqrt({inside*outside})", f"sqrt({inside})", f"{outside*inside} sqrt({inside})"]
    return question, answer, wrongs[:3], explanation


def gen_recurring_decimals(rng: random.Random) -> Tuple[str, str, List[str], str]:
    n = rng.choice([1, 2, 3, 4, 5, 6, 7, 8, 9])
    d = rng.choice([3, 6, 7, 9, 11])
    # create a recurring decimal for n/d where possible
    question = f"Write {n}/{d} as a recurring decimal (3 d.p.)."
    value = n / d
    answer = fmt_dp(value, 3)
    explanation = build_explanation(
        [f"Divide {n} by {d}.", f"{n} / {d} = {value:.6f}..., so to 3 d.p. it is {answer}."],
        answer,
    )
    wrongs = wrong_numeric(rng, value, dp=3)
    return question, answer, wrongs, explanation


def gen_unit_conversions(rng: random.Random) -> Tuple[str, str, List[str], str]:
    conversions = [
        ("mm", "cm", 10),
        ("cm", "m", 100),
        ("mm", "m", 1000),
        ("m", "cm", 100),
        ("km", "m", 1000),
        ("g", "kg", 1000),
        ("kg", "g", 1000),
        ("ml", "l", 1000),
        ("l", "ml", 1000),
        ("min", "h", 60),
        ("h", "min", 60),
    ]
    src, dst, factor = rng.choice(conversions)
    value = rng.choice([12, 25, 36, 48, 60, 75, 120, 250, 360, 540, 780])
    if factor == 60 and src == "h":
        correct_val = value * factor
    elif factor == 60 and src == "min":
        correct_val = value / factor
    elif src in ("mm", "cm", "g", "ml"):
        correct_val = value / factor
    else:
        correct_val = value * factor
    if isinstance(correct_val, float):
        correct = fmt_dp(correct_val, 2).rstrip('0').rstrip('.')
    else:
        correct = str(int(correct_val))
    question = f"Convert {value} {src} to {dst}."
    answer = f"{correct} {dst}"
    explanation = build_explanation(
        [f"Use the conversion factor between {src} and {dst}.", f"{value} {src} = {answer}."],
        answer,
    )
    wrongs = [f"{fmt_dp(correct_val * factor, 2)} {dst}", f"{fmt_dp(correct_val / factor, 2)} {dst}", f"{fmt_dp(correct_val * (factor/10), 2)} {dst}"]
    return question, answer, wrongs[:3], explanation

# Algebra

def gen_substitution(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(2, 6)
    b = rng.randint(-5, 5)
    x = rng.randint(-4, 6)
    question = f"Evaluate 3x + {b} when x = {x}."
    correct = 3 * x + b
    answer = str(correct)
    explanation = build_explanation(
        [f"Substitute x = {x} into 3x + {b}.", f"3({x}) + {b} = {correct}."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_rearranging(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(2, 8)
    b = rng.randint(3, 9)
    question = f"Make x the subject of {a}x + {b} = y."
    answer = f"x = (y - {b})/{a}"
    explanation = build_explanation(
        [f"Subtract {b} from both sides: {a}x = y - {b}.", f"Divide by {a}: x = (y - {b})/{a}."],
        answer,
    )
    wrongs = [f"x = (y + {b})/{a}", f"x = {a}(y - {b})", f"x = (y - {b})*{a}"]
    return question, answer, wrongs, explanation


def gen_inequalities(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(2, 6)
    b = rng.randint(3, 12)
    question = f"Solve the inequality {a}x + {b} < {b + a*3}."
    # a x + b < b + 3a => x < 3
    answer = "x < 3"
    explanation = build_explanation(
        [f"Subtract {b} from both sides: {a}x < {a*3}.", f"Divide by {a}: x < 3."],
        answer,
    )
    wrongs = ["x > 3", "x < -3", "x <= 3"]
    return question, answer, wrongs, explanation


def gen_sequences(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(1, 5)
    d = rng.randint(2, 6)
    n = rng.randint(4, 8)
    question = f"The sequence starts {a}, {a+d}, {a+2*d}, ... What is the {n}th term?"
    correct = a + (n - 1) * d
    answer = str(correct)
    explanation = build_explanation(
        [f"This is an arithmetic sequence with first term {a} and difference {d}.", f"Term n = {a} + (n-1){d}. For n={n}, term = {correct}."],
        answer,
    )
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_nth_term(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(1, 5)
    d = rng.randint(2, 6)
    question = f"Find the nth term of the sequence {a}, {a+d}, {a+2*d}, ..."
    answer = f"{d}n + {a - d}"
    explanation = build_explanation(
        [f"This is an arithmetic sequence with common difference {d}.", f"nth term = dn + (first term - d) = {d}n + {a - d}."],
        answer,
    )
    wrongs = [f"{a}n + {d}", f"{d}n + {a}", f"{d}n - {a}"]
    return question, answer, wrongs, explanation


def gen_graphs(rng: random.Random) -> Tuple[str, str, List[str], str]:
    m = rng.choice([1, 2, 3, -1, -2])
    c = rng.randint(-4, 5)
    question = f"Find the y-intercept of the line y = {m}x + {c}."
    answer = str(c)
    explanation = build_explanation(
        ["The y-intercept is where x = 0.", f"y = {m}(0) + {c} = {c}."],
        answer,
    )
    wrongs = [str(c + 1), str(c - 1), str(m)]
    return question, answer, wrongs, explanation


def gen_quadratics(rng: random.Random) -> Tuple[str, str, List[str], str]:
    p = rng.randint(1, 5)
    q = rng.randint(1, 5)
    question = f"Solve x^2 + {(p+q)}x + {p*q} = 0."
    answer = f"x = -{p} or x = -{q}"
    explanation = build_explanation(
        [f"Factorise: x^2 + {(p+q)}x + {p*q} = (x + {p})(x + {q}).", f"Set each factor to zero: x = -{p} or x = -{q}."],
        answer,
    )
    wrongs = [f"x = {p} or x = {q}", f"x = -{p} or x = {q}", f"x = {p} or x = -{q}"]
    return question, answer, wrongs, explanation


def gen_algebraic_fractions(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(2, 6)
    b = rng.randint(1, 5)
    question = f"Simplify the expression ({a}x + {a*b})/{a}."
    answer = f"x + {b}"
    explanation = build_explanation(
        [f"Factor the numerator: {a}x + {a*b} = {a}(x + {b}).", f"Divide by {a}: x + {b}."],
        answer,
    )
    wrongs = [f"{a}x + {b}", f"x + {a*b}", f"x - {b}"]
    return question, answer, wrongs, explanation


def gen_gradients(rng: random.Random) -> Tuple[str, str, List[str], str]:
    x1, y1 = rng.randint(-4, 2), rng.randint(-3, 5)
    x2, y2 = rng.randint(3, 7), rng.randint(-2, 6)
    gradient = (y2 - y1) / (x2 - x1)
    answer = fmt_dp(gradient, 2).rstrip('0').rstrip('.')
    question = f"Find the gradient of the line through ({x1}, {y1}) and ({x2}, {y2})."
    explanation = build_explanation(
        [f"Gradient = (y2 - y1) / (x2 - x1).", f"({y2} - {y1}) / ({x2} - {x1}) = {gradient:.4f}, so {answer}."],
        answer,
    )
    wrongs = wrong_numeric(rng, gradient, dp=2)
    return question, answer, wrongs, explanation

# Ratio

def gen_ratio(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(2, 9)
    b = rng.randint(2, 9)
    g = math.gcd(a, b)
    question = f"Simplify the ratio {a}:{b}."
    answer = f"{a//g}:{b//g}"
    explanation = build_explanation(
        [f"HCF of {a} and {b} is {g}.", f"Divide both parts by {g}: {answer}."],
        answer,
    )
    wrongs = [f"{a}:{b}", f"{a//g}:{b}", f"{a}:{b//g}"]
    return question, answer, wrongs, explanation


def gen_ratio_share(rng: random.Random) -> Tuple[str, str, List[str], str]:
    total = rng.choice([60, 72, 90, 120, 150])
    a = rng.randint(1, 5)
    b = rng.randint(1, 5)
    question = f"Share {total} in the ratio {a}:{b}. What is the first share?"
    part = total * a / (a + b)
    answer = str(int(part))
    explanation = build_explanation(
        [f"Total parts = {a} + {b} = {a+b}.", f"First share = {a}/{a+b} of {total} = {part}."],
        answer,
    )
    wrongs = wrong_numeric(rng, part)
    return question, answer, wrongs, explanation


def gen_rates(rng: random.Random) -> Tuple[str, str, List[str], str]:
    mass = rng.choice([200, 250, 300, 450])
    volume = rng.choice([50, 80, 100, 120])
    density = mass / volume
    question = f"A block has mass {mass} g and volume {volume} cm^3. Find its density."
    answer = fmt_dp(density, 2).rstrip('0').rstrip('.') + " g/cm^3"
    explanation = build_explanation(
        ["Density = mass / volume.", f"{mass} / {volume} = {density}."],
        answer,
    )
    wrongs = [f"{fmt_dp(density*volume,2)} g/cm^3", f"{fmt_dp(density/2,2)} g/cm^3", f"{fmt_dp(density+1,2)} g/cm^3"]
    return question, answer, wrongs, explanation


def gen_speed(rng: random.Random) -> Tuple[str, str, List[str], str]:
    distance = rng.choice([120, 150, 180, 240, 300])
    time = rng.choice([2, 3, 4, 5])
    speed = distance / time
    question = f"A car travels {distance} km in {time} hours. Find its speed."
    answer = f"{fmt_dp(speed,2).rstrip('0').rstrip('.')} km/h"
    explanation = build_explanation(
        ["Speed = distance / time.", f"{distance} / {time} = {speed}."],
        answer,
    )
    wrongs = [f"{fmt_dp(speed* time,2)} km/h", f"{fmt_dp(speed/2,2)} km/h", f"{fmt_dp(speed+5,2)} km/h"]
    return question, answer, wrongs, explanation


def gen_best_buys(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a_ml = rng.choice([250, 500, 750, 1000])
    b_ml = rng.choice([300, 600, 900, 1200])
    a_price = rng.choice([0.79, 0.99, 1.09, 1.29, 1.49])
    b_price = rng.choice([0.89, 1.19, 1.39, 1.59, 1.79])
    a_unit = a_price / (a_ml / 1000)
    b_unit = b_price / (b_ml / 1000)
    if a_unit < b_unit:
        answer = "A"
    else:
        answer = "B"
    question = f"Which is the better value? A: {a_ml} ml for GBP {a_price:.2f}. B: {b_ml} ml for GBP {b_price:.2f}."
    explanation = build_explanation(
        [f"Unit price A = {a_price:.2f} / {a_ml/1000:.3f} = {a_unit:.2f} per litre.",
         f"Unit price B = {b_price:.2f} / {b_ml/1000:.3f} = {b_unit:.2f} per litre.",
         f"Lower unit price is {answer}."],
        answer,
    )
    wrongs = ["A" if answer == "B" else "B", "Both", "Cannot tell"]
    return question, answer, wrongs[:3], explanation


def gen_percentage_change(rng: random.Random) -> Tuple[str, str, List[str], str]:
    original = rng.choice([80, 100, 120, 150, 200])
    new = original + rng.choice([-20, -15, -10, 10, 15, 20, 25])
    change = (new - original) / original * 100
    question = f"An amount changes from {original} to {new}. What is the percentage change?"
    answer = f"{fmt_dp(change,1).rstrip('0').rstrip('.')}%"
    explanation = build_explanation(
        [f"Change = {new} - {original} = {new-original}.", f"Percentage change = (change / {original}) x 100 = {change:.2f}%."],
        answer,
    )
    wrongs = [f"{fmt_dp(change+5,1)}%", f"{fmt_dp(change-5,1)}%", f"{fmt_dp(change*2,1)}%"]
    return question, answer, wrongs, explanation


def gen_reverse_percentages(rng: random.Random) -> Tuple[str, str, List[str], str]:
    original = rng.choice([50, 80, 120, 200])
    pct = rng.choice([10, 20, 25, 30])
    new = original * (1 + pct / 100)
    question = f"After a {pct}% increase, the value is {new:.0f}. Find the original value."
    answer = str(int(original))
    explanation = build_explanation(
        [f"New = original x (1 + {pct}/100) = original x {1+pct/100}.", f"Original = {new:.0f} / {1+pct/100} = {original}."],
        answer,
    )
    wrongs = wrong_numeric(rng, original)
    return question, answer, wrongs, explanation


def gen_growth_decay(rng: random.Random) -> Tuple[str, str, List[str], str]:
    start = rng.choice([100, 150, 200, 250])
    pct = rng.choice([5, 10, 12, 15])
    years = rng.choice([2, 3, 4])
    value = start * ((1 + pct/100) ** years)
    question = f"A value of {start} increases by {pct}% each year for {years} years. Find the final value (2 d.p.)."
    answer = fmt_dp(value, 2)
    explanation = build_explanation(
        [f"Use repeated multiplier: {start} x (1 + {pct}/100)^{years}.", f"Value = {value:.4f}, so {answer}."],
        answer,
    )
    wrongs = wrong_numeric(rng, value, dp=2)
    return question, answer, wrongs, explanation


def gen_compound_interest(rng: random.Random) -> Tuple[str, str, List[str], str]:
    principal = rng.choice([200, 500, 800, 1000])
    rate = rng.choice([3, 4, 5, 6])
    years = rng.choice([2, 3, 4])
    value = principal * ((1 + rate/100) ** years)
    question = f"GBP {principal} is invested at {rate}% compound interest for {years} years. Find the final amount (2 d.p.)."
    answer = fmt_dp(value, 2)
    explanation = build_explanation(
        [f"Use A = P(1 + r/100)^{years}.", f"A = {principal} x (1 + {rate}/100)^{years} = {value:.4f}."] ,
        answer,
    )
    wrongs = wrong_numeric(rng, value, dp=2)
    return question, answer, wrongs, explanation


def gen_direct_inverse(rng: random.Random) -> Tuple[str, str, List[str], str]:
    x1 = rng.choice([2, 3, 4, 5])
    y1 = rng.choice([10, 12, 15, 20])
    x2 = rng.choice([6, 8, 10])
    k = x1 * y1
    y2 = k / x2
    question = f"y is inversely proportional to x. When x = {x1}, y = {y1}. Find y when x = {x2}."
    answer = fmt_dp(y2, 2).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["For inverse proportion, xy = k.", f"k = {x1} x {y1} = {k}.", f"y = {k} / {x2} = {y2}."],
        answer,
    )
    wrongs = wrong_numeric(rng, y2, dp=2)
    return question, answer, wrongs, explanation


def gen_similarity_scale(rng: random.Random) -> Tuple[str, str, List[str], str]:
    scale = rng.choice([2, 3, 4, 5])
    length = rng.choice([6, 8, 10, 12])
    new_length = length * scale
    question = f"Two similar shapes have a scale factor of {scale}. A length is {length} cm on the smaller shape. Find the corresponding length on the larger shape."
    answer = f"{new_length} cm"
    explanation = build_explanation(
        [f"Multiply by the scale factor: {length} x {scale} = {new_length}."] ,
        answer,
    )
    wrongs = [f"{length/scale:.1f} cm", f"{length + scale} cm", f"{length * (scale-1)} cm"]
    return question, answer, wrongs, explanation

# Geometry

def gen_shapes(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["properties", "volume", "surface_area"])
    if variant == "properties":
        shape = rng.choice([
            ("cube", {"faces": 6, "edges": 12, "vertices": 8}),
            ("cuboid", {"faces": 6, "edges": 12, "vertices": 8}),
            ("triangular prism", {"faces": 5, "edges": 9, "vertices": 6}),
            ("square pyramid", {"faces": 5, "edges": 8, "vertices": 5}),
        ])
        prop = rng.choice(["faces", "edges", "vertices"])
        question = f"How many {prop} does a {shape[0]} have?"
        correct = shape[1][prop]
        answer = str(correct)
        explanation = build_explanation(
            [f"A {shape[0]} has {shape[1]['faces']} faces, {shape[1]['edges']} edges, and {shape[1]['vertices']} vertices."],
            answer,
        )
        wrongs = wrong_numeric(rng, correct)
        return question, answer, wrongs, explanation
    if variant == "volume":
        l = rng.randint(4, 12)
        w = rng.randint(3, 9)
        h = rng.randint(2, 7)
        vol = l * w * h
        question = f"Find the volume of a cuboid with length {l} cm, width {w} cm and height {h} cm."
        answer = f"{vol} cm^3"
        explanation = build_explanation(
            ["Volume = length x width x height.", f"{l} x {w} x {h} = {vol}."],
            answer,
        )
        wrongs = [f"{l*w} cm^3", f"{2*vol} cm^3", f"{vol-10} cm^3"]
        return question, answer, wrongs, explanation
    side = rng.randint(3, 10)
    sa = 6 * side * side
    question = f"Find the surface area of a cube with side length {side} cm."
    answer = f"{sa} cm^2"
    explanation = build_explanation(
        ["Surface area of a cube = 6s^2.", f"6 x {side}^2 = {sa}."],
        answer,
    )
    wrongs = [f"{side*side} cm^2", f"{4*side*side} cm^2", f"{sa+12} cm^2"]
    return question, answer, wrongs, explanation


def gen_perimeter_area(rng: random.Random) -> Tuple[str, str, List[str], str]:
    length = rng.randint(5, 14)
    width = rng.randint(3, 12)
    question = f"Find the area of a rectangle with length {length} cm and width {width} cm."
    correct = length * width
    answer = f"{correct} cm^2"
    explanation = build_explanation(
        ["Area of rectangle = length x width.", f"{length} x {width} = {correct}."],
        answer,
    )
    wrongs = [f"{length+width} cm^2", f"{2*(length+width)} cm^2", f"{length*2} cm^2"]
    return question, answer, wrongs, explanation


def gen_area_volume(rng: random.Random) -> Tuple[str, str, List[str], str]:
    radius = rng.randint(3, 8)
    question = f"Find the area of a circle with radius {radius} cm. Use pi = 3.14." 
    correct = 3.14 * radius * radius
    answer = f"{fmt_dp(correct,2)} cm^2"
    explanation = build_explanation(
        ["Area = pi r^2.", f"3.14 x {radius}^2 = {correct:.2f}."],
        answer,
    )
    wrongs = [f"{fmt_dp(2*3.14*radius,2)} cm^2", f"{fmt_dp(3.14*radius,2)} cm^2", f"{fmt_dp(correct+10,2)} cm^2"]
    return question, answer, wrongs, explanation


def gen_angles(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(20, 120)
    question = f"Angles on a straight line sum to 180. If one angle is {a} degrees, find the other."
    correct = 180 - a
    answer = f"{correct} degrees"
    explanation = build_explanation(
        ["Angles on a straight line sum to 180.", f"Other angle = 180 - {a} = {correct}."],
        answer,
    )
    wrongs = [f"{a} degrees", f"{correct+10} degrees", f"{correct-10} degrees"]
    return question, answer, wrongs, explanation


def gen_polygons(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["sum", "regular"])
    sides = rng.randint(5, 10)
    sum_int = (sides - 2) * 180
    if variant == "sum":
        question = f"Find the sum of interior angles of a {sides}-sided polygon."
        answer = f"{sum_int} degrees"
        explanation = build_explanation(
            [f"Sum of interior angles = (n-2) x 180.", f"({sides}-2) x 180 = {sum_int}."],
            answer,
        )
        wrongs = [f"{(sides+2)*180} degrees", f"{(sides-1)*180} degrees", f"{sum_int-180} degrees"]
        return question, answer, wrongs, explanation
    each = sum_int / sides
    question = f"A regular {sides}-gon has all angles equal. Find each interior angle."
    answer = f"{fmt_dp(each,1).rstrip('0').rstrip('.')} degrees"
    explanation = build_explanation(
        [f"Sum of interior angles = (n-2) x 180 = {sum_int}.", f"Each angle = {sum_int} / {sides} = {each:.2f}."],
        answer,
    )
    wrongs = [f"{fmt_dp(each+10,1)} degrees", f"{fmt_dp(each-10,1)} degrees", f"{fmt_dp(sum_int,1)} degrees"]
    return question, answer, wrongs, explanation


def gen_trigonometry(rng: random.Random) -> Tuple[str, str, List[str], str]:
    opp = rng.randint(3, 9)
    hyp = rng.randint(10, 15)
    sin_val = opp / hyp
    question = f"In a right triangle, opposite = {opp} cm and hypotenuse = {hyp} cm. Find sin(theta)."
    answer = fmt_dp(sin_val, 3).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["sin(theta) = opposite / hypotenuse.", f"{opp} / {hyp} = {sin_val:.4f}."],
        answer,
    )
    wrongs = wrong_numeric(rng, sin_val, dp=3)
    return question, answer, wrongs, explanation


def gen_pythagoras(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(3, 8)
    b = rng.randint(4, 9)
    c = math.sqrt(a*a + b*b)
    question = f"A right triangle has legs {a} cm and {b} cm. Find the hypotenuse (1 d.p.)."
    answer = fmt_dp(c, 1)
    explanation = build_explanation(
        ["Use a^2 + b^2 = c^2.", f"c = sqrt({a}^2 + {b}^2) = {c:.4f}."],
        answer,
    )
    wrongs = wrong_numeric(rng, c, dp=1)
    return question, answer, wrongs, explanation


def gen_circles(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["circumference", "area"])
    r = rng.randint(4, 10)
    if variant == "circumference":
        c = 2 * 3.14 * r
        question = f"Find the circumference of a circle with radius {r} cm. Use pi = 3.14."
        answer = f"{fmt_dp(c,2)} cm"
        explanation = build_explanation(
            ["Circumference = 2 pi r.", f"2 x 3.14 x {r} = {c:.2f}."],
            answer,
        )
        wrongs = [f"{fmt_dp(3.14*r,2)} cm", f"{fmt_dp(3.14*r*r,2)} cm", f"{fmt_dp(c+5,2)} cm"]
        return question, answer, wrongs, explanation
    area = 3.14 * r * r
    question = f"Find the area of a circle with radius {r} cm. Use pi = 3.14."
    answer = f"{fmt_dp(area,2)} cm^2"
    explanation = build_explanation(
        ["Area = pi r^2.", f"3.14 x {r}^2 = {area:.2f}."],
        answer,
    )
    wrongs = [f"{fmt_dp(2*3.14*r,2)} cm^2", f"{fmt_dp(area+10,2)} cm^2", f"{fmt_dp(area-5,2)} cm^2"]
    return question, answer, wrongs, explanation


def gen_arcs_sectors(rng: random.Random) -> Tuple[str, str, List[str], str]:
    r = rng.randint(5, 10)
    angle = rng.choice([60, 90, 120, 150])
    arc = (angle / 360) * 2 * 3.14 * r
    question = f"Find the length of an arc with radius {r} cm and angle {angle} degrees. Use pi = 3.14."
    answer = f"{fmt_dp(arc,2)} cm"
    explanation = build_explanation(
        ["Arc length = (angle/360) x 2 pi r.", f"({angle}/360) x 2 x 3.14 x {r} = {arc:.2f}."],
        answer,
    )
    wrongs = [f"{fmt_dp(2*3.14*r,2)} cm", f"{fmt_dp(arc*2,2)} cm", f"{fmt_dp(arc/2,2)} cm"]
    return question, answer, wrongs, explanation


def gen_surface_area(rng: random.Random) -> Tuple[str, str, List[str], str]:
    l = rng.randint(4, 9)
    w = rng.randint(3, 8)
    h = rng.randint(2, 7)
    sa = 2*(l*w + l*h + w*h)
    question = f"Find the surface area of a cuboid with length {l} cm, width {w} cm, height {h} cm."
    answer = f"{sa} cm^2"
    explanation = build_explanation(
        ["Surface area = 2(lw + lh + wh).", f"2({l*w} + {l*h} + {w*h}) = {sa}."],
        answer,
    )
    wrongs = [f"{l*w*h} cm^2", f"{2*l*w} cm^2", f"{sa+10} cm^2"]
    return question, answer, wrongs, explanation


def gen_volume(rng: random.Random) -> Tuple[str, str, List[str], str]:
    l = rng.randint(4, 12)
    w = rng.randint(3, 9)
    h = rng.randint(2, 7)
    vol = l * w * h
    question = f"Find the volume of a cuboid with length {l} cm, width {w} cm, height {h} cm."
    answer = f"{vol} cm^3"
    explanation = build_explanation(
        ["Volume = length x width x height.", f"{l} x {w} x {h} = {vol}."],
        answer,
    )
    wrongs = [f"{l*w} cm^3", f"{2*vol} cm^3", f"{vol-10} cm^3"]
    return question, answer, wrongs, explanation


def gen_bearings(rng: random.Random) -> Tuple[str, str, List[str], str]:
    bearing = rng.choice([35, 75, 120, 210, 285])
    question = f"A ship travels on a bearing of {bearing} degrees. What is the reverse bearing?"
    reverse = (bearing + 180) % 360
    answer = f"{reverse} degrees"
    explanation = build_explanation(
        ["Reverse bearing is 180 degrees more (or less).", f"({bearing} + 180) mod 360 = {reverse}."],
        answer,
    )
    wrongs = [f"{(bearing+90)%360} degrees", f"{(bearing+270)%360} degrees", f"{bearing} degrees"]
    return question, answer, wrongs, explanation


def gen_transformations(rng: random.Random) -> Tuple[str, str, List[str], str]:
    dx = rng.randint(-4, 5)
    dy = rng.randint(-4, 5)
    translation_vec = latex_column_vector(str(dx), str(dy))
    original_point = latex_column_vector("2", "3")
    translated_point = latex_column_vector(str(2 + dx), str(3 + dy))
    question = (
        f"A point is translated by vector {translation_vec}. "
        f"What are the coordinates of {original_point} after the translation?"
    )
    answer = translated_point
    explanation = build_explanation(
        [
            "Add the translation vector to the starting coordinates.",
            f"{original_point} + {translation_vec} = {translated_point}.",
        ],
        answer,
    )
    wrongs = [
        original_point,
        translation_vec,
        latex_column_vector(str(2 - dx), str(3 - dy)),
    ]
    return question, answer, wrongs, explanation


def gen_constructions_loci(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["two_points", "point_line", "two_lines"])
    if variant == "two_points":
        question = "Which is the locus of points equidistant from two fixed points A and B?"
        answer = "The perpendicular bisector of AB"
        explanation = build_explanation(
            ["Points equidistant from A and B lie on the perpendicular bisector of AB."],
            answer,
        )
        wrongs = ["The line AB", "A circle centered at A", "A circle centered at B"]
        return question, answer, wrongs, explanation
    if variant == "point_line":
        question = "What is the locus of points equidistant from a fixed point and a straight line?"
        answer = "A parabola"
        explanation = build_explanation(
            ["Points equidistant from a point and a line form a parabola."],
            answer,
        )
        wrongs = ["A circle", "A straight line", "A rectangle"]
        return question, answer, wrongs, explanation
    question = "Which is the locus of points equidistant from two intersecting lines?"
    answer = "The angle bisectors of the lines"
    explanation = build_explanation(
        ["Points equidistant from two lines lie on their angle bisectors."],
        answer,
    )
    wrongs = ["The perpendicular bisector", "A circle", "The lines themselves"]
    return question, answer, wrongs, explanation


def gen_congruence(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["identify", "example"])
    if variant == "identify":
        condition = rng.choice(["SSS", "SAS", "ASA", "RHS"])
        question = "Which condition is sufficient to prove two triangles are congruent?"
        answer = condition
        explanation = build_explanation(
            ["Triangle congruence can be shown by SSS, SAS, ASA or RHS."],
            answer,
        )
        wrongs = [c for c in ["AAA", "SSA", "AAS"] if c != condition][:3]
        return question, answer, wrongs, explanation
    a = rng.randint(4, 9)
    b = rng.randint(5, 10)
    angle = rng.choice([30, 45, 60, 90])
    question = f"Two triangles have sides {a} cm and {b} cm with the included angle {angle} degrees in both. Which congruence condition applies?"
    answer = "SAS"
    explanation = build_explanation(
        ["Two sides and the included angle are equal, so SAS applies."],
        answer,
    )
    wrongs = ["SSS", "ASA", "RHS"]
    return question, answer, wrongs, explanation


def gen_vectors(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(1, 5)
    b = rng.randint(1, 5)
    c = rng.randint(1, 5)
    d = rng.randint(1, 5)
    v1 = latex_column_vector(str(a), str(b))
    v2 = latex_column_vector(str(c), str(d))
    sum_vector = latex_column_vector(str(a + c), str(b + d))
    question = f"Find the vector sum {v1} + {v2}."
    explanation = build_explanation(
        [
            "Add the corresponding components of each vector.",
            f"{v1} + {v2} = {sum_vector}.",
        ],
        sum_vector,
    )
    wrongs = [
        latex_column_vector(str(a - c), str(b - d)),
        latex_column_vector(str(a + d), str(b + c)),
        latex_column_vector(str(a + c), str(b - d)),
    ]
    return question, sum_vector, wrongs, explanation


def gen_circle_theorems(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["center", "semicircle", "tangent"])
    if variant == "center":
        center = rng.choice([80, 100, 120, 140])
        angle = center / 2
        question = f"In a circle, the angle at the center is {center} degrees. Find the angle at the circumference on the same arc."
        answer = f"{fmt_dp(angle,1).rstrip('0').rstrip('.')} degrees"
        explanation = build_explanation(
            ["Angle at center = 2 x angle at circumference.", f"Angle at circumference = {center} / 2 = {angle}."],
            answer,
        )
        wrongs = [f"{center} degrees", f"{angle+20} degrees", f"{angle-20} degrees"]
        return question, answer, wrongs, explanation
    if variant == "semicircle":
        question = "A triangle is drawn in a semicircle with the diameter as one side. What is the angle opposite the diameter?"
        answer = "90 degrees"
        explanation = build_explanation(
            ["The angle in a semicircle is always a right angle."],
            answer,
        )
        wrongs = ["45 degrees", "60 degrees", "120 degrees"]
        return question, answer, wrongs, explanation
    question = "A tangent to a circle is perpendicular to the radius at the point of contact. What is the angle between the tangent and the radius?"
    answer = "90 degrees"
    explanation = build_explanation(
        ["A tangent is perpendicular to the radius at the point of contact."],
        answer,
    )
    wrongs = ["45 degrees", "60 degrees", "120 degrees"]
    return question, answer, wrongs, explanation

# Probability

def gen_basic_prob(rng: random.Random) -> Tuple[str, str, List[str], str]:
    red = rng.randint(2, 5)
    blue = rng.randint(3, 6)
    total = red + blue
    question = f"A bag has {red} red and {blue} blue balls. Find the probability of picking a red ball."
    answer = frac_str(red, total)
    explanation = build_explanation(
        [f"Probability = favorable / total = {red}/{total}."] ,
        answer,
    )
    wrongs = wrong_fraction(rng, red, total)
    return question, answer, wrongs, explanation


def gen_combined_prob(rng: random.Random) -> Tuple[str, str, List[str], str]:
    p = rng.choice([1, 2, 3])
    q = rng.choice([4, 5, 6])
    question = f"A spinner has probability {p}/{q} of landing on red. Find the probability it does NOT land on red."
    answer = frac_str(q - p, q)
    explanation = build_explanation(
        ["P(not red) = 1 - P(red).", f"1 - {p}/{q} = {(q-p)}/{q}."],
        answer,
    )
    wrongs = wrong_fraction(rng, q - p, q)
    return question, answer, wrongs, explanation


def gen_tree_prob(rng: random.Random) -> Tuple[str, str, List[str], str]:
    p = rng.choice([1, 2, 3])
    q = rng.choice([4, 5, 6])
    question = f"A biased coin shows heads with probability {p}/{q}. Find the probability of two heads in two throws."
    prob = (p / q) ** 2
    answer = fmt_dp(prob, 3).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["Multiply probabilities for independent events.", f"({p}/{q}) x ({p}/{q}) = {prob:.4f}."],
        answer,
    )
    wrongs = wrong_numeric(rng, prob, dp=3)
    return question, answer, wrongs, explanation


def gen_conditional(rng: random.Random) -> Tuple[str, str, List[str], str]:
    total = rng.choice([30, 40, 50])
    a = rng.randint(10, total-10)
    b = total - a
    question = f"In a class of {total} students, {a} are in Club A and {b} are not. Find P(A)."
    answer = frac_str(a, total)
    explanation = build_explanation(
        [f"Probability = number in A / total = {a}/{total}."],
        answer,
    )
    wrongs = wrong_fraction(rng, a, total)
    return question, answer, wrongs, explanation


def gen_relative_frequency(rng: random.Random) -> Tuple[str, str, List[str], str]:
    successes = rng.randint(10, 30)
    trials = rng.randint(40, 80)
    question = f"An event occurs {successes} times in {trials} trials. Find the relative frequency."
    freq = successes / trials
    answer = fmt_dp(freq, 3).rstrip('0').rstrip('.')
    explanation = build_explanation(
        [f"Relative frequency = successes / trials = {successes}/{trials}.", f"{successes}/{trials} = {freq:.4f}."],
        answer,
    )
    wrongs = wrong_numeric(rng, freq, dp=3)
    return question, answer, wrongs, explanation


def gen_venn(rng: random.Random) -> Tuple[str, str, List[str], str]:
    total = 50
    a = rng.randint(15, 30)
    b = rng.randint(10, 25)
    both = rng.randint(5, min(a, b)-1)
    question = f"In a group of {total}, {a} like apples, {b} like bananas, and {both} like both. How many like only apples?"
    only_a = a - both
    answer = str(only_a)
    explanation = build_explanation(
        [f"Only apples = {a} - {both} = {only_a}."],
        answer,
    )
    wrongs = wrong_numeric(rng, only_a)
    return question, answer, wrongs, explanation


def gen_expected_frequency(rng: random.Random) -> Tuple[str, str, List[str], str]:
    prob = rng.choice([0.2, 0.25, 0.3, 0.4])
    trials = rng.choice([40, 50, 60, 80])
    expected = prob * trials
    question = f"An event has probability {prob}. Find the expected frequency in {trials} trials."
    answer = str(int(expected))
    explanation = build_explanation(
        ["Expected frequency = probability x number of trials.", f"{prob} x {trials} = {expected}."],
        answer,
    )
    wrongs = wrong_numeric(rng, expected)
    return question, answer, wrongs, explanation


def gen_independence(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["formula", "numeric"])
    if variant == "formula":
        question = "If events A and B are independent, which formula is correct?"
        answer = "P(A and B) = P(A) x P(B)"
        explanation = build_explanation(
            ["For independent events, multiply the probabilities."],
            answer,
        )
        wrongs = ["P(A and B) = P(A) + P(B)", "P(A and B) = P(A) - P(B)", "P(A and B) = P(A) / P(B)"]
        return question, answer, wrongs, explanation
    p = rng.choice([0.2, 0.3, 0.4])
    q = rng.choice([0.5, 0.6, 0.7])
    prob = p * q
    question = f"Events A and B are independent with P(A) = {p} and P(B) = {q}. Find P(A and B)."
    answer = fmt_dp(prob, 2).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["For independent events, multiply the probabilities.", f"{p} x {q} = {prob}."],
        answer,
    )
    wrongs = wrong_numeric(rng, prob, dp=2)
    return question, answer, wrongs, explanation


def gen_mutually_exclusive(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["formula", "numeric"])
    if variant == "formula":
        question = "For mutually exclusive events A and B, what is P(A and B)?"
        answer = "0"
        explanation = build_explanation(
            ["Mutually exclusive events cannot happen together, so the probability is 0."],
            answer,
        )
        wrongs = ["1", "P(A) + P(B)", "P(A) x P(B)"]
        return question, answer, wrongs, explanation
    p = rng.choice([0.2, 0.3, 0.4])
    q = rng.choice([0.1, 0.15, 0.25])
    question = f"Events A and B are mutually exclusive with P(A) = {p} and P(B) = {q}. Find P(A or B)."
    prob = p + q
    answer = fmt_dp(prob, 2).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["For mutually exclusive events, P(A or B) = P(A) + P(B).", f"{p} + {q} = {prob}."],
        answer,
    )
    wrongs = wrong_numeric(rng, prob, dp=2)
    return question, answer, wrongs, explanation

# Statistics

def gen_data_collection(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["quant", "sampling", "bias", "stratified", "discrete"])
    if variant == "quant":
        options = [
            ("Number of siblings", ["Hair color", "Favorite sport", "Type of pet"]),
            ("Height in cm", ["Eye color", "Favorite food", "Music genre"]),
            ("Time to run 100m", ["Shoe brand", "Hair style", "Favorite TV show"]),
        ]
        ans, wrongs = rng.choice(options)
        question = "Which is an example of quantitative data?"
        answer = ans
        explanation = build_explanation(["Quantitative data is numerical."], answer)
        return question, answer, wrongs, explanation
    if variant == "sampling":
        question = "Which method gives the most reliable sample?"
        answer = "A large random sample"
        explanation = build_explanation(["Large random samples reduce bias."], answer)
        wrongs = ["Only friends", "Small biased sample", "One class only"]
        return question, answer, wrongs, explanation
    if variant == "stratified":
        question = "Which sampling method ensures each group in the population is represented proportionally?"
        answer = "Stratified sampling"
        explanation = build_explanation(["Stratified sampling uses groups (strata) in correct proportions."], answer)
        wrongs = ["Random sampling", "Systematic sampling", "Opportunity sampling"]
        return question, answer, wrongs, explanation
    if variant == "discrete":
        topic = rng.choice(["cars", "books", "siblings", "pets"])
        question = f"Which is an example of discrete data? (number of {topic})"
        answer = f"Number of {topic}"
        explanation = build_explanation(["Discrete data are counts that take whole-number values."], answer)
        wrongs = ["Height in cm", "Time taken in seconds", "Temperature in degrees"]
        return question, answer, wrongs, explanation
    question = "Which is an example of a biased sample?"
    answer = "Surveying only your friends"
    explanation = build_explanation(["A biased sample does not represent the whole population."], answer)
    wrongs = ["Randomly selecting students", "Using every 10th person", "Choosing names at random"]
    return question, answer, wrongs, explanation


def gen_averages(rng: random.Random) -> Tuple[str, str, List[str], str]:
    vals = [rng.randint(3, 9) for _ in range(5)]
    mean = sum(vals) / len(vals)
    question = f"Find the mean of {', '.join(map(str, vals))}."
    answer = fmt_dp(mean, 1).rstrip('0').rstrip('.')
    explanation = build_explanation(
        [f"Sum = {sum(vals)}.", f"Mean = {sum(vals)} / {len(vals)} = {mean}."],
        answer,
    )
    wrongs = wrong_numeric(rng, mean, dp=1)
    return question, answer, wrongs, explanation


def gen_charts(rng: random.Random) -> Tuple[str, str, List[str], str]:
    subjects = rng.choice([
        "temperature", "rainfall", "exam scores", "car prices", "daily steps", "sales",
        "pulse rate", "journey time", "heights"
    ])
    templates = [
        ("Which chart is best for showing how {subjects} changes over time?", "Line graph", ["Pie chart", "Bar chart", "Pictogram"], "Line graphs show trends over time."),
        ("Which chart is best for showing parts of a whole for {subjects}?", "Pie chart", ["Line graph", "Histogram", "Scatter graph"], "Pie charts show proportions of a whole."),
        ("Which chart is best for comparing categories of {subjects}?", "Bar chart", ["Line graph", "Histogram", "Scatter graph"], "Bar charts compare discrete categories."),
        ("Which chart is most suitable for continuous grouped {subjects} data?", "Histogram", ["Bar chart", "Pie chart", "Pictogram"], "Histograms are used for continuous grouped data."),
        ("Which chart is best for showing the relationship between two numerical variables for {subjects}?", "Scatter graph", ["Pie chart", "Bar chart", "Pictogram"], "Scatter graphs show relationships between two numerical variables."),
        ("Which chart is used to show cumulative frequency for {subjects} data?", "Cumulative frequency graph", ["Pie chart", "Bar chart", "Pictogram"], "Cumulative frequency graphs show cumulative totals."),
    ]
    q_template, answer, wrongs, expl = rng.choice(templates)
    question = q_template.format(subjects=subjects)
    explanation = build_explanation([expl], answer)
    return question, answer, wrongs, explanation


def gen_correlation(rng: random.Random) -> Tuple[str, str, List[str], str]:
    trend = rng.choice(["positive", "negative", "none"])
    if trend == "positive":
        points = [(i, 2*i + rng.randint(-1, 1)) for i in range(1, 5)]
        answer = "Positive correlation"
        explanation = build_explanation(["As x increases, y increases overall."], answer)
    elif trend == "negative":
        points = [(i, 10 - 2*i + rng.randint(-1, 1)) for i in range(1, 5)]
        answer = "Negative correlation"
        explanation = build_explanation(["As x increases, y decreases overall."], answer)
    else:
        points = [(1, rng.randint(1, 9)), (2, rng.randint(1, 9)), (3, rng.randint(1, 9)), (4, rng.randint(1, 9))]
        answer = "No correlation"
        explanation = build_explanation(["There is no clear trend in the points."], answer)
    pts = ", ".join([f"({x},{y})" for x, y in points])
    question = f"The data points are {pts}. What type of correlation is shown?"
    wrongs = [w for w in ["Positive correlation", "Negative correlation", "No correlation"] if w != answer]
    while len(wrongs) < 3:
        wrongs.append("Weak correlation")
    return question, answer, wrongs[:3], explanation


def gen_sampling(rng: random.Random) -> Tuple[str, str, List[str], str]:
    question = "Which method gives the most reliable sample?"
    answer = "A large random sample"
    explanation = build_explanation(
        ["Large random samples reduce bias."],
        answer,
    )
    wrongs = ["Only friends", "Small biased sample", "One class only"]
    return question, answer, wrongs, explanation


def gen_frequency_tables(rng: random.Random) -> Tuple[str, str, List[str], str]:
    class_width = rng.choice([5, 10])
    freq = rng.randint(8, 20)
    question = f"A class interval has width {class_width} and frequency {freq}. What is the frequency density?"
    density = freq / class_width
    answer = fmt_dp(density, 2).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["Frequency density = frequency / class width.", f"{freq} / {class_width} = {density}."],
        answer,
    )
    wrongs = wrong_numeric(rng, density, dp=2)
    return question, answer, wrongs, explanation


def gen_spread(rng: random.Random) -> Tuple[str, str, List[str], str]:
    low = rng.randint(5, 12)
    high = low + rng.randint(8, 20)
    question = f"Find the range of the data set with minimum {low} and maximum {high}."
    answer = str(high - low)
    explanation = build_explanation(
        ["Range = maximum - minimum.", f"{high} - {low} = {high-low}."],
        answer,
    )
    wrongs = wrong_numeric(rng, high - low)
    return question, answer, wrongs, explanation


def gen_scatter(rng: random.Random) -> Tuple[str, str, List[str], str]:
    trend = rng.choice(["positive", "negative", "none"])
    if trend == "positive":
        points = [(i, 3*i + rng.randint(-1, 1)) for i in range(1, 5)]
        answer = "Positive correlation"
        explanation = build_explanation(["The points increase as x increases."], answer)
    elif trend == "negative":
        points = [(i, 12 - 2*i + rng.randint(-1, 1)) for i in range(1, 5)]
        answer = "Negative correlation"
        explanation = build_explanation(["The points decrease as x increases."], answer)
    else:
        points = [(1, rng.randint(1, 9)), (2, rng.randint(1, 9)), (3, rng.randint(1, 9)), (4, rng.randint(1, 9))]
        answer = "No correlation"
        explanation = build_explanation(["There is no overall upward or downward trend."], answer)
    pts = ", ".join([f"({x},{y})" for x, y in points])
    question = f"A scatter graph contains points {pts}. What type of correlation is shown?"
    wrongs = [w for w in ["Positive correlation", "Negative correlation", "No correlation"] if w != answer]
    while len(wrongs) < 3:
        wrongs.append("Weak correlation")
    return question, answer, wrongs[:3], explanation


def gen_histograms(rng: random.Random) -> Tuple[str, str, List[str], str]:
    freq = rng.randint(10, 30)
    width = rng.choice([5, 10, 15])
    density = freq / width
    question = f"A histogram class has frequency {freq} and class width {width}. Find the frequency density."
    answer = fmt_dp(density, 2).rstrip('0').rstrip('.')
    explanation = build_explanation(
        ["Frequency density = frequency / class width.", f"{freq} / {width} = {density}."],
        answer,
    )
    wrongs = wrong_numeric(rng, density, dp=2)
    return question, answer, wrongs, explanation


def gen_cumulative_frequency(rng: random.Random) -> Tuple[str, str, List[str], str]:
    variant = rng.choice(["median_position", "cumulative_total"])
    total = rng.choice([40, 50, 60, 80])
    if variant == "median_position":
        question = f"A data set has {total} values. Which position is used for the median?"
        answer = f"The {int(total/2)}th value"
        explanation = build_explanation(
            ["For even n, the median is between the two middle values, around the n/2 position."],
            answer,
        )
        wrongs = [f"The {int(total/4)}th value", f"The {int(total)}th value", f"The {int(total/3)}th value"]
        return question, answer, wrongs, explanation
    class1 = rng.choice([0, 10, 20])
    width = rng.choice([10, 20])
    f1 = rng.randint(4, 12)
    f2 = rng.randint(5, 15)
    question = f"A grouped table has class {class1}-{class1+width} with frequency {f1}, and class {class1+width}-{class1+2*width} with frequency {f2}. What is the cumulative frequency up to {class1+2*width}?"
    total_cf = f1 + f2
    answer = str(total_cf)
    explanation = build_explanation(
        [f"Cumulative frequency is the running total: {f1} + {f2} = {total_cf}."],
        answer,
    )
    wrongs = [str(total_cf + 2), str(total_cf - 2), str(f2)]
    return question, answer, wrongs, explanation


def gen_box_plots(rng: random.Random) -> Tuple[str, str, List[str], str]:
    q1 = rng.randint(10, 20)
    q3 = q1 + rng.randint(8, 15)
    iqr = q3 - q1
    question = f"The lower quartile is {q1} and the upper quartile is {q3}. Find the interquartile range."
    answer = str(iqr)
    explanation = build_explanation(
        ["IQR = Q3 - Q1.", f"{q3} - {q1} = {iqr}."],
        answer,
    )
    wrongs = wrong_numeric(rng, iqr)
    return question, answer, wrongs, explanation


def gen_two_way_tables(rng: random.Random) -> Tuple[str, str, List[str], str]:
    total = 40
    a = rng.randint(10, 20)
    b = rng.randint(5, 15)
    question = f"In a survey of {total} students, {a} like maths and {b} like science. Assuming no overlap, how many like neither?"
    neither = total - a - b
    answer = str(neither)
    explanation = build_explanation(
        ["If there is no overlap, total liking either is a + b.", f"Neither = {total} - {a} - {b} = {neither}."],
        answer,
    )
    wrongs = wrong_numeric(rng, neither)
    return question, answer, wrongs, explanation


def gen_decimals(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(12, 98) / 10
    b = rng.randint(15, 95) / 100
    op = rng.choice(["+", "-"])
    if op == "-" and a < b:
        a, b = b, a
    correct = a + b if op == "+" else a - b
    answer = fmt_dp(correct, 2)
    question = f"Calculate {fmt_dp(a, 1)} {op} {fmt_dp(b, 2)}."
    steps = [
        f"Align the decimals and compute {fmt_dp(a, 1)} {op} {fmt_dp(b, 2)}.",
        f"Result = {answer}."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = wrong_numeric(rng, correct, dp=2)
    return question, answer, wrongs, explanation


def gen_negative_numbers(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(-20, 20)
    b = rng.randint(-20, 20)
    c = rng.randint(-10, 10)
    question = f"Calculate {a} + ({b}) - ({c})."
    correct = a + b - c
    answer = str(correct)
    steps = [
        f"Add {a} and {b} to get {a + b}.",
        f"Subtract {c}: {a + b} - ({c}) = {correct}."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = wrong_numeric(rng, correct)
    return question, answer, wrongs, explanation


def gen_expressions(rng: random.Random) -> Tuple[str, str, List[str], str]:
    a = rng.randint(2, 8)
    b = rng.randint(1, 6)
    c = rng.randint(1, 6)
    d = rng.randint(-10, 10)
    coeff = a + b - c
    question = f"Simplify the expression {a}x + {b}x - {c}x + {d}."
    answer = f"{coeff}x {'+' if d >= 0 else '-'} {abs(d)}" if coeff != 0 else f"{d}"
    steps = [
        f"Combine like terms: ({a} + {b} - {c})x = {coeff}x.",
        f"Bring down the constant {d}."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = [
        f"{a + b + c}x {'+' if d >= 0 else '-'} {abs(d)}",
        f"{a + b - c + 1}x {'+' if d >= 0 else '-'} {abs(d)}",
        f"{a + b - c}x {'+' if d + 1 >= 0 else '-'} {abs(d + 1)}",
    ]
    return question, answer, wrongs, explanation


def gen_expand(rng: random.Random) -> Tuple[str, str, List[str], str]:
    k = rng.randint(2, 6)
    a = rng.randint(1, 9)
    b = rng.randint(1, 9)
    question = f"Expand {k}({a}x + {b})."
    coeff = k * a
    const = k * b
    answer = f"{coeff}x + {const}"
    steps = [
        f"Multiply {k} by {a}x to get {coeff}x.",
        f"Multiply {k} by {b} to get {const}.",
        f"Combine: {coeff}x + {const}."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = [f"{coeff}x + {const + k}", f"{coeff + a}x + {const}", f"{coeff}x - {const}"]
    return question, answer, wrongs, explanation


def gen_factorise(rng: random.Random) -> Tuple[str, str, List[str], str]:
    k = rng.randint(2, 6)
    a = rng.randint(2, 6)
    b = rng.randint(1, 9)
    expr_a = k * a
    expr_b = k * b
    question = f"Factorise fully {expr_a}x + {expr_b}."
    answer = f"{k}({a}x + {b})"
    steps = [
        f"Greatest common factor is {k}.",
        f"Divide each term by {k}: {expr_a}x/{k} = {a}x and {expr_b}/{k} = {b}.",
        f"So {expr_a}x + {expr_b} = {k}({a}x + {b})."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = [f"{a}({k}x + {b})", f"{k}({a}x - {b})", f"{k + 1}({a}x + {b})"]
    return question, answer, wrongs, explanation


def gen_equations(rng: random.Random) -> Tuple[str, str, List[str], str]:
    x = rng.randint(-9, 9)
    a = rng.randint(2, 8)
    b = rng.randint(-10, 10)
    c = a * x + b
    question = f"Solve {a}x + {b} = {c}."
    answer = f"x = {x}"
    steps = [
        f"Subtract {b} from both sides: {a}x = {c - b}.",
        f"Divide by {a}: x = {x}."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = [f"x = {x + 1}", f"x = {x - 1}", f"x = {x + 2}"]
    return question, answer, wrongs, explanation


def gen_simultaneous(rng: random.Random) -> Tuple[str, str, List[str], str]:
    x = rng.randint(-5, 5)
    y = rng.randint(-5, 5)
    a1, b1 = rng.randint(1, 4), rng.randint(1, 4)
    a2, b2 = rng.randint(1, 4), rng.randint(1, 4)
    if a1 * b2 == a2 * b1:
        b2 += 1
    c1 = a1 * x + b1 * y
    c2 = a2 * x + b2 * y
    question = f"Solve the simultaneous equations: {a1}x + {b1}y = {c1} and {a2}x + {b2}y = {c2}."
    answer = f"x = {x}, y = {y}"
    steps = [
        "Use elimination or substitution to solve the system.",
        f"The solution is x = {x}, y = {y}."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = [f"x = {y}, y = {x}", f"x = {x + 1}, y = {y}", f"x = {x}, y = {y + 1}"]
    return question, answer, wrongs, explanation


def gen_proportion(rng: random.Random) -> Tuple[str, str, List[str], str]:
    x1 = rng.randint(2, 12)
    k = rng.randint(2, 9)
    y1 = x1 * k
    x2 = rng.randint(5, 20)
    y2 = x2 * k
    question = f"y is directly proportional to x. When x = {x1}, y = {y1}. Find y when x = {x2}."
    answer = str(y2)
    steps = [
        f"Since y = kx, k = {y1}/{x1} = {k}.",
        f"So y = {k} \u00d7 {x2} = {y2}."
    ]
    explanation = build_explanation(steps, answer)
    wrongs = wrong_numeric(rng, y2)
    return question, answer, wrongs, explanation


CONTEXT_SUBTOPICS = {
    "number|powers",
    "number|factors_multiples",
    "number|rounding_bounds",
    "number|standard_form",
    "algebra|nth_term",
    "algebra|algebraic_fractions",
    "algebra|quadratics",
    "ratio|percentage_change",
    "ratio|rates",
    "ratio|speed",
    "ratio|reverse_percentages",
    "ratio|similarity_scale",
    "geometry|area_volume",
    "geometry|bearings",
    "geometry|constructions_loci",
    "geometry|circle_theorems",
    "geometry|polygons",
    "geometry|circles",
    "geometry|arcs_sectors",
    "geometry|pythagoras",
    "probability|basic",
    "probability|combined",
    "probability|tree_diagrams",
    "probability|expected_frequency",
    "probability|independence",
    "probability|mutually_exclusive",
    "statistics|data",
    "statistics|sampling",
    "statistics|frequency_tables",
}

CONTEXT_TAGS = [
    "Context: school trip", "Context: sports club", "Context: charity event",
    "Context: bus timetable", "Context: science lab", "Context: shopping list",
    "Context: library survey", "Context: local shop", "Context: exam hall",
    "Context: music festival", "Context: community center", "Context: fitness class",
    "Context: museum visit", "Context: weather report", "Context: class survey",
    "Context: after-school club", "Context: travel plan", "Context: cafe menu",
    "Context: park cleanup", "Context: art project", "Context: school fair",
    "Context: football match", "Context: science fair", "Context: delivery route",
    "Context: holiday schedule", "Context: theatre tickets", "Context: road trip",
    "Context: baking recipe", "Context: bike ride", "Context: charity walk",
    "Context: cinema queue", "Context: bus stop survey", "Context: city marathon",
    "Context: coding club", "Context: chess tournament", "Context: school canteen",
    "Context: art gallery", "Context: science journal", "Context: student council",
    "Context: school newsletter", "Context: local market", "Context: health clinic",
    "Context: book fair", "Context: wildlife park", "Context: beach trip",
    "Context: hiking trail", "Context: recycling drive", "Context: garden club",
    "Context: debating society", "Context: drone workshop", "Context: robotics team",
    "Context: language class", "Context: choir rehearsal", "Context: drama club",
    "Context: photography group", "Context: lunchtime survey", "Context: school assembly",
    "Context: art studio", "Context: bowling night", "Context: swimming gala",
]


def apply_context(subtopic: str, question: str, rng: random.Random) -> str:
    if subtopic in CONTEXT_SUBTOPICS:
        tag = rng.choice(CONTEXT_TAGS)
        return f"{question} ({tag})"
    return question


GEN_MAP = {
    # Number
    "number|integers": gen_integers,
    "number|fractions": gen_fractions,
    "number|decimals": gen_decimals,
    "number|negative_numbers": gen_negative_numbers,
    "number|fractions_decimals_percent": gen_fdp,
    "number|percentages": gen_percentages,
    "number|powers": gen_powers,
    "number|factors_multiples": gen_factors_multiples,
    "number|hcf_lcm": gen_hcf_lcm,
    "number|bidmas": gen_bidmas,
    "number|rounding_bounds": gen_rounding_bounds,
    "number|standard_form": gen_standard_form,
    "number|surds": gen_surds,
    "number|recurring_decimals": gen_recurring_decimals,
    "number|unit_conversions": gen_unit_conversions,
    # Algebra
    "algebra|substitution": gen_substitution,
    "algebra|expressions": gen_expressions,
    "algebra|expand": gen_expand,
    "algebra|factorise": gen_factorise,
    "algebra|equations": gen_equations,
    "algebra|simultaneous": gen_simultaneous,
    "algebra|rearranging": gen_rearranging,
    "algebra|inequalities": gen_inequalities,
    "algebra|sequences": gen_sequences,
    "algebra|nth_term": gen_nth_term,
    "algebra|graphs": gen_graphs,
    "algebra|quadratics": gen_quadratics,
    "algebra|algebraic_fractions": gen_algebraic_fractions,
    "algebra|gradients": gen_gradients,
    # Ratio
    "ratio|ratio": gen_ratio,
    "ratio|ratio_share": gen_ratio_share,
    "ratio|proportion": gen_proportion,
    "ratio|rates": gen_rates,
    "ratio|speed": gen_speed,
    "ratio|best_buys": gen_best_buys,
    "ratio|percentage_change": gen_percentage_change,
    "ratio|reverse_percentages": gen_reverse_percentages,
    "ratio|growth_decay": gen_growth_decay,
    "ratio|compound_interest": gen_compound_interest,
    "ratio|direct_inverse": gen_direct_inverse,
    "ratio|similarity_scale": gen_similarity_scale,
    # Geometry
    "geometry|shapes": gen_shapes,
    "geometry|perimeter_area": gen_perimeter_area,
    "geometry|area_volume": gen_area_volume,
    "geometry|angles": gen_angles,
    "geometry|polygons": gen_polygons,
    "geometry|trigonometry": gen_trigonometry,
    "geometry|pythagoras": gen_pythagoras,
    "geometry|circles": gen_circles,
    "geometry|arcs_sectors": gen_arcs_sectors,
    "geometry|surface_area": gen_surface_area,
    "geometry|volume": gen_volume,
    "geometry|bearings": gen_bearings,
    "geometry|transformations": gen_transformations,
    "geometry|constructions_loci": gen_constructions_loci,
    "geometry|congruence": gen_congruence,
    "geometry|vectors": gen_vectors,
    "geometry|circle_theorems": gen_circle_theorems,
    # Probability
    "probability|basic": gen_basic_prob,
    "probability|combined": gen_combined_prob,
    "probability|tree_diagrams": gen_tree_prob,
    "probability|conditional": gen_conditional,
    "probability|relative_frequency": gen_relative_frequency,
    "probability|venn_diagrams": gen_venn,
    "probability|expected_frequency": gen_expected_frequency,
    "probability|independence": gen_independence,
    "probability|mutually_exclusive": gen_mutually_exclusive,
    # Statistics
    "statistics|data": gen_data_collection,
    "statistics|averages": gen_averages,
    "statistics|charts": gen_charts,
    "statistics|correlation": gen_correlation,
    "statistics|sampling": gen_sampling,
    "statistics|frequency_tables": gen_frequency_tables,
    "statistics|spread": gen_spread,
    "statistics|scatter": gen_scatter,
    "statistics|histograms": gen_histograms,
    "statistics|cumulative_frequency": gen_cumulative_frequency,
    "statistics|box_plots": gen_box_plots,
    "statistics|two_way_tables": gen_two_way_tables,
}


def build_row(*, topic: str, subtopic: str, tier: str, calculator: str, question: str, correct: str, wrong: List[str], explanation: str) -> Dict[str, Any]:
    question_text = latexify_text(question)
    correct_text = latexify_text(correct)
    wrong_answers = [latexify_text(w) for w in wrong[:3]]
    explanation_text = latexify_text(explanation)

    return {
        "question": question_text,
        "correct_answer": correct_text,
        "wrong_answers": wrong_answers,
        "all_answers": [correct_text] + wrong_answers,
        "explanation": explanation_text,
        "question_type": topic,
        "subtopic": subtopic,
        "tier": tier,
        "calculator": calculator,
        "difficulty": 2 if tier == "Foundation Tier" else 4,
        "marks": 1,
        "estimated_time_sec": 90 if tier == "Foundation Tier" else 110,
        "image_url": None,
        "image_alt": None,
    }


def insert_rows(supabase_url: str, headers: Dict[str, str], rows: List[Dict[str, Any]]) -> int:
    if not rows:
        return 0
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
    status, body = _http_json("POST", url, headers, payload=rows, timeout=120)
    if status not in (200, 201, 204):
        raise SystemExit(f"Insert failed ({status}): {body}")
    return len(rows)


def main() -> None:
    rng = random.Random(42)
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = _auth_headers(service_key)

    subtopic_to_topic = load_subtopics(MAPPING_PATH)

    with open(DEFICITS_PATH, "r", encoding="utf-8") as handle:
        deficits = json.load(handle)

    log_path = os.path.join("tmp", "fill_deficits_unique_log.jsonl")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)

    existing_cache: Dict[str, set] = {}
    rows_to_insert: List[Dict[str, Any]] = []

    with open(log_path, "w", encoding="utf-8") as log_handle:
        for item in deficits:
            subtopic = item["subtopic"]
            tier = item["tier"]
            calculator = item["calculator"]
            needed = int(item["needed"])

            if subtopic not in GEN_MAP:
                log_handle.write(json.dumps({"subtopic": subtopic, "status": "missing_generator", "needed": needed}) + "\n")
                continue

            if subtopic not in existing_cache:
                existing_cache[subtopic] = set(q.lower().strip() for q in fetch_existing_questions(
                    supabase_url=supabase_url, headers=headers, subtopic_id=subtopic
                ))

            gen = GEN_MAP[subtopic]
            attempts = 0
            created = 0
            while created < needed and attempts < 2000:
                attempts += 1
                question, correct, wrongs, explanation = gen(rng)
                question = apply_context(subtopic, question, rng)
                qsig = question.lower().strip()
                if qsig in existing_cache[subtopic]:
                    continue
                extracted = explanation_final_answer(explanation)
                if not extracted:
                    continue
                if extracted.strip() != correct.strip():
                    # enforce answer from explanation
                    correct = extracted.strip()
                # Ensure 3 wrong answers
                if len(wrongs) < 3:
                    wrongs = wrong_numeric(rng, float(extracted) if extracted.replace('.', '', 1).isdigit() else 10)[:3]
                row = build_row(
                    topic=subtopic_to_topic.get(subtopic, "Unknown"),
                    subtopic=subtopic,
                    tier=tier,
                    calculator=calculator,
                    question=question,
                    correct=correct,
                    wrong=wrongs,
                    explanation=explanation,
                )
                rows_to_insert.append(row)
                existing_cache[subtopic].add(qsig)
                created += 1

            log_handle.write(json.dumps({
                "subtopic": subtopic,
                "tier": tier,
                "calculator": calculator,
                "needed": needed,
                "created": created,
                "attempts": attempts,
            }) + "\n")

    # Insert in chunks
    inserted_total = 0
    for batch in _chunk(rows_to_insert, 200):
        inserted_total += insert_rows(supabase_url, headers, batch)
        time.sleep(0.2)

    print(f"Inserted {inserted_total} questions.")


if __name__ == "__main__":
    main()
