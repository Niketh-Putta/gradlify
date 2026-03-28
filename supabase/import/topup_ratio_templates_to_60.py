#!/usr/bin/env python3
"""Top up Ratio & Proportion mini-subtopics to 60 total using deterministic templates (no API)."""
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


def fetch_rows(supabase_url: str, headers: Dict[str, str], subtopic_id: str) -> List[Dict[str, Any]]:
    query = {"select": "id,question", "subtopic": f"eq.{subtopic_id}", "limit": "1000"}
    url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?{urllib.parse.urlencode(query)}"
    status, body = _http_json("GET", url, headers, payload=None, timeout=60)
    if status != 200:
        raise SystemExit(f"Fetch failed ({status}): {body}")
    return json.loads(body or "[]")


def delete_ids(supabase_url: str, headers: Dict[str, str], ids: List[str]) -> None:
    if not ids:
        return
    chunk = 100
    for i in range(0, len(ids), chunk):
        part = ids[i:i + chunk]
        quoted = ",".join(f"\"{pid}\"" for pid in part)
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?id=in.({quoted})"
        status, body = _http_json("DELETE", url, headers, payload=None, timeout=60)
        if status not in (200, 204):
            raise SystemExit(f"Delete failed ({status}): {body}")


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
    calculator: str = "Calculator",
) -> Dict[str, Any]:
    all_answers = [correct] + wrong
    RNG.shuffle(all_answers)
    return {
        "question": question.strip(),
        "correct_answer": correct.strip(),
        "wrong_answers": wrong,
        "all_answers": all_answers,
        "explanation": explanation.strip(),
        "question_type": "Ratio & Proportion",
        "subtopic": subtopic,
        "tier": "Foundation Tier",
        "calculator": calculator,
        "difficulty": difficulty,
        "marks": marks,
        "estimated_time_sec": 90,
        "image_url": None,
        "image_alt": None,
    }


def gen_ratio() -> Dict[str, Any]:
    a, b = RNG.choice([(3, 5), (2, 7), (4, 9), (5, 8)])
    total = RNG.choice([48, 60, 72, 84, 90])
    scale = total / (a + b)
    part_a = int(a * scale)
    part_b = int(b * scale)
    question = f"Split \\( {total} \\) in the ratio \\( {a}:{b} \\)."
    correct = f"{part_a} and {part_b}"
    wrong = [
        f"{a*scale} and {b*scale + 2}",
        f"{part_a + 2} and {part_b - 2}",
        f"{part_b} and {part_a}",
    ]
    explanation = (
        "Step 1: Add the parts of the ratio.\n"
        f"\\( {a} + {b} = {a + b} \\)\n\n"
        "Step 2: Find the value of one part.\n"
        f"\\( {total} \\div {a + b} = {scale} \\)\n\n"
        "Step 3: Multiply by each part of the ratio.\n"
        f"\\( {a} \\times {scale} = {part_a} \\), \\( {b} \\times {scale} = {part_b} \\)\n\n"
        f"Final answer: {part_a} and {part_b}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|ratio", difficulty=2)


def gen_proportion() -> Dict[str, Any]:
    a, b = RNG.choice([(2, 5), (3, 4), (5, 8)])
    x = RNG.choice([12, 15, 18, 20])
    y = x * b // a
    question = f"If \\( {a}:{b} = {x}:y \\), find \\( y \\)."
    correct = str(y)
    wrong = [str(x * a // b), str(y + 2), str(y - 2)]
    explanation = (
        "Step 1: Set up the proportion.\n"
        f"\\( \\frac{{a}}{{b}} = \\frac{{{x}}}{{y}} \\)\n\n"
        "Step 2: Cross multiply.\n"
        f"\\( a\\,y = b\\,{x} \\)\n\n"
        "Step 3: Solve for y.\n"
        f"\\( y = \\frac{{b\\,{x}}}{{a}} = {y} \\)\n\n"
        f"Final answer: {y}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|proportion", difficulty=2)


def gen_percentage_change() -> Dict[str, Any]:
    original = RNG.choice([80, 120, 150, 200])
    percent = RNG.choice([10, 15, 20, 25])
    new_value = int(original * (1 + percent / 100))
    question = f"A price increases by {percent}% from £{original}. Find the new price."
    correct = f"£{new_value}"
    wrong = [f"£{original + percent}", f"£{original - percent}", f"£{int(original * percent / 100)}"]
    explanation = (
        "Step 1: Find the increase amount.\n"
        f"\\( {percent}\\% \\) of \\( {original} = {int(original * percent / 100)} \\)\n\n"
        "Step 2: Add the increase to the original amount.\n"
        f"\\( {original} + {int(original * percent / 100)} = {new_value} \\)\n\n"
        f"Final answer: £{new_value}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|percentage_change", difficulty=2)


def gen_reverse_percentages() -> Dict[str, Any]:
    original = RNG.choice([80, 100, 120, 150])
    percent = RNG.choice([10, 20, 25])
    new_value = int(original * (1 + percent / 100))
    question = f"After a {percent}% increase, the price is £{new_value}. What was the original price?"
    correct = f"£{original}"
    wrong = [f"£{new_value - percent}", f"£{int(new_value * (1 - percent / 100))}", f"£{int(new_value / percent)}"]
    explanation = (
        "Step 1: Use the multiplier for an increase.\n"
        f"Multiplier = 1 + {percent}/100 = {1 + percent/100}.\n\n"
        "Step 2: Divide the new price by the multiplier.\n"
        f"\\( {new_value} \\div {1 + percent/100} = {original} \\)\n\n"
        f"Final answer: £{original}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|reverse_percentages", difficulty=3)


def gen_ratio_share() -> Dict[str, Any]:
    a, b, c = RNG.choice([(2, 3, 5), (1, 2, 3), (3, 4, 5)])
    total = RNG.choice([90, 120, 150])
    part_value = total / (a + b + c)
    A = int(a * part_value)
    B = int(b * part_value)
    C = int(c * part_value)
    question = f"Split £{total} in the ratio {a}:{b}:{c}."
    correct = f"£{A}, £{B}, £{C}"
    wrong = [f"£{B}, £{A}, £{C}", f"£{A+5}, £{B-5}, £{C}", f"£{A}, £{C}, £{B}"]
    explanation = (
        "Step 1: Add the parts of the ratio.\n"
        f"\\( {a}+{b}+{c} = {a + b + c} \\)\n\n"
        "Step 2: Find the value of one part.\n"
        f"\\( £{total} \\div {a + b + c} = £{part_value} \\)\n\n"
        "Step 3: Multiply each part.\n"
        f"\\( {a}×£{part_value} = £{A} \\), \\( {b}×£{part_value} = £{B} \\), \\( {c}×£{part_value} = £{C} \\)\n\n"
        f"Final answer: £{A}, £{B}, £{C}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|ratio_share", difficulty=2)


def gen_rates() -> Dict[str, Any]:
    mass = RNG.choice([2.5, 3, 4])
    volume = RNG.choice([2, 4, 5])
    density = mass / volume
    question = f"A substance has mass {mass} kg and volume {volume} m^3. Find the density."
    correct = f"{density} kg/m^3"
    wrong = [f"{mass*volume} kg/m^3", f"{volume/mass} kg/m^3", f"{mass} kg/m^3"]
    explanation = (
        "Step 1: Use density = mass ÷ volume.\n"
        f"\\( {mass} ÷ {volume} = {density} \\)\n\n"
        f"Final answer: {density} kg/m^3"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|rates", difficulty=2, calculator="Calculator")


def gen_speed() -> Dict[str, Any]:
    distance = RNG.choice([120, 150, 180])
    time_hr = RNG.choice([2, 3, 4])
    speed = distance / time_hr
    question = f"A car travels {distance} km in {time_hr} hours. Find the average speed in km/h."
    correct = f"{speed} km/h"
    wrong = [f"{distance*time_hr} km/h", f"{time_hr/distance} km/h", f"{distance} km/h"]
    explanation = (
        "Step 1: Use speed = distance ÷ time.\n"
        f"\\( {distance} ÷ {time_hr} = {speed} \\)\n\n"
        f"Final answer: {speed} km/h"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|speed", difficulty=2, calculator="Calculator")


def gen_best_buys() -> Dict[str, Any]:
    a_price, a_weight = RNG.choice([(3.60, 300), (4.50, 500), (2.80, 200)])
    b_price, b_weight = RNG.choice([(5.00, 600), (3.75, 250), (6.00, 750)])
    a_unit = a_price / a_weight
    b_unit = b_price / b_weight
    better = "A" if a_unit < b_unit else "B"
    question = (
        f"Product A: {a_weight} g for £{a_price:.2f}. "
        f"Product B: {b_weight} g for £{b_price:.2f}. Which is the better buy?"
    )
    correct = f"Product {better}"
    wrong = [f"Product {'B' if better == 'A' else 'A'}", "Both are the same value", "Cannot tell"]
    explanation = (
        "Step 1: Find cost per gram for each product.\n"
        f"A: £{a_price:.2f} ÷ {a_weight} = £{a_unit:.4f} per g\n"
        f"B: £{b_price:.2f} ÷ {b_weight} = £{b_unit:.4f} per g\n\n"
        "Step 2: Choose the smaller unit cost.\n"
        f"Final answer: Product {better}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|best_buys", difficulty=2, calculator="Calculator")


def gen_growth_decay() -> Dict[str, Any]:
    initial = RNG.choice([200, 300, 500])
    rate = RNG.choice([5, 10, 15])
    years = RNG.choice([2, 3])
    multiplier = (1 + rate / 100) ** years
    final = round(initial * multiplier, 2)
    question = f"£{initial} increases by {rate}% each year for {years} years. Find the final amount."
    correct = f"£{final}"
    wrong = [f"£{initial + rate*years}", f"£{initial * (1 + rate/100)}", f"£{initial * (1 + rate/100*years):.2f}"]
    explanation = (
        "Step 1: Use the compound multiplier each year.\n"
        f"Multiplier = \\(1 + {rate}/100\\) = {1 + rate/100}\n\n"
        "Step 2: Apply for the number of years.\n"
        f"\\( {initial} × {1 + rate/100}^{years} = {final} \\)\n\n"
        f"Final answer: £{final}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|growth_decay", difficulty=3, calculator="Calculator")


def gen_compound_interest() -> Dict[str, Any]:
    principal = RNG.choice([1000, 1500, 2000])
    rate = RNG.choice([3, 4, 5])
    years = RNG.choice([2, 3])
    final = round(principal * ((1 + rate/100) ** years), 2)
    question = f"£{principal} is invested at {rate}% compound interest for {years} years. Find the value of the investment."
    correct = f"£{final}"
    wrong = [f"£{principal + principal*rate/100}", f"£{principal * (1 + rate/100):.2f}", f"£{principal + years*rate}"]
    explanation = (
        "Step 1: Use the compound interest multiplier.\n"
        f"Multiplier = \\(1 + {rate}/100\\) = {1 + rate/100}\n\n"
        "Step 2: Apply the multiplier for each year.\n"
        f"\\( {principal} × {1 + rate/100}^{years} = {final} \\)\n\n"
        f"Final answer: £{final}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|compound_interest", difficulty=3, calculator="Calculator")


def gen_direct_inverse() -> Dict[str, Any]:
    k = RNG.choice([12, 18, 24])
    x1 = RNG.choice([2, 3, 4])
    y1 = k * x1
    x2 = RNG.choice([5, 6, 8])
    y2 = k * x2
    question = f"y is directly proportional to x. When x = {x1}, y = {y1}. Find y when x = {x2}."
    correct = str(y2)
    wrong = [str(y1 + x2), str(int(y1 / x1)), str(int(y1 * x2))]
    explanation = (
        "Step 1: Write y = kx.\n"
        f"\\( {y1} = k × {x1} \\) so \\( k = {k} \\)\n\n"
        "Step 2: Use the same k for the new x.\n"
        f"\\( y = {k} × {x2} = {y2} \\)\n\n"
        f"Final answer: {y2}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|direct_inverse", difficulty=2)


def gen_similarity_scale(mode: str | None = None) -> Dict[str, Any]:
    if mode is None:
        mode = RNG.choice(["forward", "reverse"])
    if mode == "reverse":
        scale = RNG.choice([2, 3, 4, 5])
        original = RNG.choice([6, 8, 9, 10, 12])
        new_length = original * scale
        question = (
            f"A shape is enlarged by scale factor {scale}. "
            f"The new length is {new_length} cm. What was the original length?"
        )
        correct = f"{original} cm"
        wrong = [f"{new_length} cm", f"{new_length / scale} cm", f"{original * (scale - 1)} cm"]
        explanation = (
            "Step 1: Enlargement multiplies lengths by the scale factor.\n"
            f"\\( \\text{{new}} = {scale} \\times \\text{{original}} \\).\n\n"
            "Step 2: Divide to find the original length.\n"
            f"\\( \\text{{original}} = {new_length} \\div {scale} = {original} \\).\n\n"
            f"Final answer: {correct}"
        )
        return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|similarity_scale", difficulty=3)

    scale = RNG.choice([2, 3, 4, 5])
    length = RNG.choice([6, 8, 10, 12])
    new_length = length * scale
    question = f"A shape is enlarged by scale factor {scale}. A length of {length} cm becomes what length?"
    correct = f"{new_length} cm"
    wrong = [f"{length + scale} cm", f"{length / scale} cm", f"{length * (scale - 1)} cm"]
    explanation = (
        "Step 1: Multiply by the scale factor.\n"
        f"\\( {length} × {scale} = {new_length} \\)\n\n"
        f"Final answer: {new_length} cm"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="ratio|similarity_scale", difficulty=2)


def ensure_similarity_scale_variety(supabase_url: str, headers: Dict[str, str]) -> None:
    rows = fetch_rows(supabase_url, headers, "ratio|similarity_scale")
    reverse_rows = [r for r in rows if "original length" in (r.get("question") or "").lower()]
    target_reverse = 20
    if len(reverse_rows) >= target_reverse:
        return
    need = target_reverse - len(reverse_rows)
    reverse_ids = {r["id"] for r in reverse_rows}
    forward_rows = [r for r in rows if r.get("id") not in reverse_ids]
    to_delete = [r["id"] for r in forward_rows[:need]]
    delete_ids(supabase_url, headers, to_delete)
    inserts = [gen_similarity_scale(mode="reverse") for _ in range(need)]
    insert_rows(supabase_url, headers, inserts)

GENERATOR_BY_SUBTOPIC = {
    "ratio|ratio": gen_ratio,
    "ratio|proportion": gen_proportion,
    "ratio|percentage_change": gen_percentage_change,
    "ratio|reverse_percentages": gen_reverse_percentages,
    "ratio|ratio_share": gen_ratio_share,
    "ratio|rates": gen_rates,
    "ratio|speed": gen_speed,
    "ratio|best_buys": gen_best_buys,
    "ratio|growth_decay": gen_growth_decay,
    "ratio|compound_interest": gen_compound_interest,
    "ratio|direct_inverse": gen_direct_inverse,
    "ratio|similarity_scale": gen_similarity_scale,
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
        while len(rows) < missing and attempts < missing * 6:
            attempts += 1
            rows.append(generator())
        inserted = insert_rows(supabase_url, headers, rows[:missing])
        print(f"{subtopic}: inserted {inserted}")
        time.sleep(0.3)

    ensure_similarity_scale_variety(supabase_url, headers)


if __name__ == "__main__":
    main()
