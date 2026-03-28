#!/usr/bin/env python3
"""Top up Number mini-subtopics to 60 total using deterministic templates (no API)."""
from __future__ import annotations

import json
import os
import random
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Tuple


ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
RNG = random.Random(42)


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


def fetch_total(supabase_url: str, headers: Dict[str, str], subtopic_id: str) -> int:
    query = {"select": "id", "subtopic": f"eq.{subtopic_id}", "limit": "1000"}
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(query)}"
    status, body = _http_json("GET", url, headers, payload=None, timeout=60)
    if status != 200:
        raise SystemExit(f"Fetch failed ({status}): {body}")
    rows = json.loads(body or "[]")
    return len(rows)


def insert_rows(supabase_url: str, headers: Dict[str, str], rows: List[Dict[str, Any]]) -> int:
    if not rows:
        return 0
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
    status, body = _http_json("POST", url, headers, payload=rows, timeout=120)
    if status not in (200, 201):
        raise SystemExit(f"Insert failed ({status}): {body}")
    return len(rows)


def build_row(
    *,
    question: str,
    correct: str,
    wrong: List[str],
    explanation: str,
    subtopic: str,
    difficulty: int = 2,
    marks: int = 2,
    calculator: str = "Non-Calculator",
) -> Dict[str, Any]:
    all_answers = [correct] + wrong
    RNG.shuffle(all_answers)
    return {
        "question": question.strip(),
        "correct_answer": correct.strip(),
        "wrong_answers": wrong,
        "all_answers": all_answers,
        "explanation": explanation.strip(),
        "question_type": "Number",
        "subtopic": subtopic,
        "tier": "Foundation Tier",
        "calculator": calculator,
        "difficulty": difficulty,
        "marks": marks,
        "estimated_time_sec": 90,
        "image_url": None,
        "image_alt": None,
    }


def gen_percentages() -> Dict[str, Any]:
    original = RNG.choice([80, 120, 150, 200])
    percent = RNG.choice([5, 10, 15, 20, 25])
    new_value = int(original * (1 + percent / 100))
    question = f"Increase {original} by {percent}%. What is the result?"
    correct = str(new_value)
    wrong = [str(original + percent), str(original - percent), str(int(original * percent / 100))]
    explanation = (
        "Step 1: Find the percentage increase.\n"
        f"\\( {percent}\\% \\) of {original} is {int(original * percent / 100)}.\n\n"
        "Step 2: Add the increase to the original.\n"
        f"{original} + {int(original * percent / 100)} = {new_value}\n\n"
        f"Final answer: {new_value}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|percentages")


def gen_unit_conversions() -> Dict[str, Any]:
    value = RNG.choice([120, 250, 360, 540, 780])
    question = f"Convert {value} cm to metres."
    correct_val = value / 100
    correct = f"{correct_val} m"
    wrong = [f"{value/10} m", f"{value/1000} m", f"{value*100} m"]
    explanation = (
        "Step 1: There are 100 cm in 1 m.\n"
        f"Step 2: Divide by 100: {value} ÷ 100 = {correct_val}.\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|unit_conversions")


def gen_factors_multiples() -> Dict[str, Any]:
    n = RNG.choice([24, 30, 36, 42])
    question = f"How many factors does {n} have?"
    factors = [i for i in range(1, n + 1) if n % i == 0]
    correct = str(len(factors))
    wrong = [str(len(factors) - 2), str(len(factors) + 2), str(len(factors) - 1)]
    explanation = (
        "Step 1: List factor pairs of the number.\n"
        f"Step 2: Count them carefully.\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|factors_multiples", difficulty=3)


def gen_rounding_bounds() -> Dict[str, Any]:
    value = RNG.choice([3.48, 6.25, 8.74])
    question = f"{value} is rounded to 1 decimal place. What is the upper bound?"
    upper = round(value + 0.05, 2)
    correct = str(upper)
    wrong = [str(round(value + 0.1, 2)), str(round(value - 0.05, 2)), str(value)]
    explanation = (
        "Step 1: For 1 d.p., the half-step is 0.05.\n"
        "Step 2: Upper bound = rounded value + 0.05.\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|rounding_bounds", difficulty=3)


def gen_standard_form() -> Dict[str, Any]:
    num = RNG.choice([4.2, 6.5, 8.1])
    power = RNG.choice([4, 5, 6])
    question = f"Write {num} × 10^{power} as an ordinary number."
    correct = str(int(num * (10 ** power)))
    wrong = [str(int(num * (10 ** (power - 1)))), str(int(num * power)), str(int(num * (10 ** (power + 1))))]  # type: ignore
    explanation = (
        "Step 1: Move the decimal point to the right by the power of 10.\n"
        f"Step 2: {num} × 10^{power} = {correct}.\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|standard_form", difficulty=2)


def gen_bidmas() -> Dict[str, Any]:
    question = "Evaluate: 12 − 3 × (4 + 2)."
    correct = str(12 - 3 * (4 + 2))
    wrong = [str((12 - 3) * (4 + 2)), str(12 - 3 * 4 + 2), str(12 - 3 * 4 - 2)]
    explanation = (
        "Step 1: Brackets first: (4 + 2) = 6.\n"
        "Step 2: Multiply: 3 × 6 = 18.\n"
        "Step 3: Subtract: 12 − 18 = -6.\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|bidmas", difficulty=3)


def gen_fractions_decimals_percent() -> Dict[str, Any]:
    question = "Write 0.35 as a fraction in simplest form."
    correct = "7/20"
    wrong = ["35/100", "3/5", "7/10"]
    explanation = (
        "Step 1: Write 0.35 as 35/100.\n"
        "Step 2: Simplify by dividing numerator and denominator by 5.\n\n"
        "Final answer: 7/20"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|fractions_decimals_percent")


def gen_surds() -> Dict[str, Any]:
    question = "Simplify \\( \\sqrt{72} \\)."
    correct = "6\\sqrt{2}"
    wrong = ["3\\sqrt{8}", "9\\sqrt{2}", "2\\sqrt{18}"]
    explanation = (
        "Step 1: Factor 72 into a square number and the remainder.\n"
        "72 = 36 × 2.\n\n"
        "Step 2: Take the square root of 36.\n"
        "\\( \\sqrt{72} = \\sqrt{36×2} = 6\\sqrt{2} \\)\n\n"
        "Final answer: 6\\sqrt{2}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|surds", difficulty=3)


def gen_powers() -> Dict[str, Any]:
    question = "Evaluate \\( 2^3 \\times 2^4 \\)."
    correct = str(2 ** 7)
    wrong = [str(2 ** 12), str(2 ** 1), str(2 ** 5)]
    explanation = (
        "Step 1: When multiplying powers of the same base, add the indices.\n"
        "Step 2: 2^3 × 2^4 = 2^(3+4) = 2^7.\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|powers", difficulty=2)


def gen_negative_numbers() -> Dict[str, Any]:
    question = "A temperature is −3°C. It drops by 7°C. What is the new temperature?"
    correct = "-10"
    wrong = ["4", "-4", "10"]
    explanation = (
        "Step 1: Start at −3.\n"
        "Step 2: Dropping 7 means subtract 7: −3 − 7 = −10.\n\n"
        "Final answer: −10"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|negative_numbers", difficulty=2)


def gen_hcf_lcm() -> Dict[str, Any]:
    a, b = 24, 36
    question = f"Find the HCF of {a} and {b}."
    correct = "12"
    wrong = ["6", "18", "24"]
    explanation = (
        "Step 1: List factors of both numbers.\n"
        "Step 2: The highest common factor is 12.\n\n"
        "Final answer: 12"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|hcf_lcm", difficulty=2)


def gen_recurring_decimals() -> Dict[str, Any]:
    question = "Write \\( 0.\\overline{3} \\) as a fraction."
    correct = "1/3"
    wrong = ["3/10", "3/9", "1/9"]
    explanation = (
        "Step 1: Let x = 0.333...\n"
        "Step 2: 10x = 3.333...\n"
        "Step 3: Subtract: 10x − x = 3.333... − 0.333... = 3.\n"
        "Step 4: 9x = 3, so x = 1/3.\n\n"
        "Final answer: 1/3"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="number|recurring_decimals", difficulty=3)


GENERATOR_BY_SUBTOPIC = {
    "number|percentages": gen_percentages,
    "number|unit_conversions": gen_unit_conversions,
    "number|factors_multiples": gen_factors_multiples,
    "number|rounding_bounds": gen_rounding_bounds,
    "number|standard_form": gen_standard_form,
    "number|bidmas": gen_bidmas,
    "number|fractions_decimals_percent": gen_fractions_decimals_percent,
    "number|surds": gen_surds,
    "number|powers": gen_powers,
    "number|negative_numbers": gen_negative_numbers,
    "number|hcf_lcm": gen_hcf_lcm,
    "number|recurring_decimals": gen_recurring_decimals,
}


def main() -> None:
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    for subtopic, generator in GENERATOR_BY_SUBTOPIC.items():
        total = fetch_total(supabase_url, headers, subtopic)
        if total >= 60:
            print(f"{subtopic}: already {total}")
            continue
        missing = 60 - total
        print(f"{subtopic}: generating {missing}")
        rows: List[Dict[str, Any]] = []
        attempts = 0
        while len(rows) < missing and attempts < missing * 8:
            attempts += 1
            rows.append(generator())
        inserted = insert_rows(supabase_url, headers, rows[:missing])
        print(f"{subtopic}: inserted {inserted}")
        time.sleep(0.3)


if __name__ == "__main__":
    main()
