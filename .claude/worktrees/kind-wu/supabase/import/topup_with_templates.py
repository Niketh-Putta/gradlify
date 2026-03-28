#!/usr/bin/env python3
"""Top up missing exam_questions with deterministic templates (no AI calls).

Targets 20 questions per tier per mini-subtopic (40 total per subtopic).
"""

from __future__ import annotations

import json
import math
import os
import random
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Tuple


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


def fetch_counts(supabase_url: str, headers: Dict[str, str]) -> Dict[str, Dict[str, int]]:
    counts: Dict[str, Dict[str, int]] = {}
    limit = 1000
    offset = 0
    while True:
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions?select=subtopic,tier&limit={limit}&offset={offset}"
        status, body = _http_json("GET", url, headers, payload=None, timeout=60)
        if status != 200:
            raise SystemExit(f"Failed to fetch rows (status={status}): {body}")
        rows = json.loads(body or "[]")
        if not rows:
            break
        for row in rows:
            sub = row.get("subtopic") or "unknown"
            tier = row.get("tier") or "unknown"
            counts.setdefault(sub, {}).setdefault(tier, 0)
            counts[sub][tier] += 1
        offset += limit
    return counts


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


def choice(seq):
    return random.choice(seq)


def build_row(*, topic: str, subtopic: str, tier: str, calculator: str, question: str, correct: str, wrong: List[str], explanation: str, difficulty: int) -> Dict[str, Any]:
    all_answers = [correct] + wrong
    random.shuffle(all_answers)
    return {
        "question": question.strip(),
        "correct_answer": correct.strip(),
        "wrong_answers": wrong,
        "all_answers": all_answers,
        "explanation": explanation.strip(),
        "question_type": topic,
        "subtopic": subtopic,
        "tier": tier,
        "calculator": calculator,
        "difficulty": difficulty,
        "marks": 1,
        "estimated_time_sec": 80 if tier == "Foundation Tier" else 100,
        "image_url": None,
        "image_alt": None,
    }


def gen_unit_conversion(tier: str) -> Tuple[str, str, List[str], str]:
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
    src, dst, factor = choice(conversions)
    if factor == 60:
        value = choice([30, 45, 90, 120, 150, 180, 210, 240]) if src == "min" else choice([1, 1.5, 2, 2.5, 3, 3.5, 4])
        correct_val = value / factor if src == "min" else value * factor
    else:
        if src in ("mm", "cm") and dst in ("m",):
            value = choice([120, 250, 360, 540, 780, 950])
            correct_val = value / factor
        else:
            value = choice([2, 4, 6, 8, 12, 15, 18, 25, 40, 75, 120, 250, 500, 750])
            correct_val = value / factor if src in ("mm", "cm", "g", "ml") else value * factor

    if tier == "Foundation Tier":
        correct_val = round(correct_val, 2)
    else:
        correct_val = round(correct_val, 3)
        if abs(correct_val - round(correct_val)) < 1e-6:
            correct_val = int(round(correct_val))

    question = f"Convert {value} {src} to {dst}."
    correct = f"{correct_val} {dst}"
    wrongs = [
        f"{round(correct_val * factor, 2)} {dst}",
        f"{round(correct_val / factor, 2)} {dst}",
        f"{round(correct_val * (factor / 10), 2)} {dst}",
    ]
    wrongs = list(dict.fromkeys(wrongs))
    while len(wrongs) < 3:
        wrongs.append(f"{round(correct_val + choice([0.5, 1, 2, 5]), 2)} {dst}")
    wrongs = wrongs[:3]
    explanation = f"Use the conversion factor between {src} and {dst}."
    return question, correct, wrongs, explanation


def gen_fraction_decimal_percent() -> Tuple[str, str, List[str], str]:
    options = [
        (0.375, "3/8", "37.5%"),
        (0.2, "1/5", "20%"),
        (0.45, "9/20", "45%"),
        (0.125, "1/8", "12.5%"),
        (0.6, "3/5", "60%"),
    ]
    dec, frac, perc = choice(options)
    mode = choice(["dec_to_frac", "frac_to_dec", "perc_to_dec", "dec_to_perc", "frac_to_perc"])
    if mode == "dec_to_frac":
        question = f"Write {dec} as a fraction in its simplest form."
        correct = frac
        wrong = [f"{int(dec*100)}/100", f"{int(dec*1000)}/1000", "1/2"]
    elif mode == "frac_to_dec":
        question = f"Write {frac} as a decimal."
        correct = str(dec)
        wrong = [str(round(dec * 10, 2)), str(round(dec + 0.1, 2)), str(round(dec - 0.1, 2))]
    elif mode == "perc_to_dec":
        question = f"Write {perc} as a decimal."
        correct = str(dec)
        wrong = [str(dec * 100), str(round(dec + 0.2, 2)), str(round(dec - 0.2, 2))]
    elif mode == "dec_to_perc":
        question = f"Write {dec} as a percentage."
        correct = perc
        wrong = [f"{dec}%", f"{int(dec*10)}%", f"{int(dec*1000)}%"]
    else:
        question = f"Write {frac} as a percentage."
        correct = perc
        wrong = [f"{dec}%", f"{int(dec*10)}%", f"{int(dec*100)}%"]

    wrong = list(dict.fromkeys(wrong))
    while len(wrong) < 3:
        wrong.append("50%")
    return question, correct, wrong[:3], "Convert between fraction, decimal and percentage."


def gen_fraction_question() -> Tuple[str, str, List[str], str]:
    numer = choice([3, 5, 7, 9])
    denom = choice([4, 6, 8, 10])
    total = choice([20, 24, 30, 40])
    question = f"Find {numer}/{denom} of {total}."
    correct_val = total * numer / denom
    correct = str(int(correct_val))
    wrong = [str(int(total/denom)), str(int(total/denom*numer+2)), str(int(total/denom*numer-2))]
    wrong = list(dict.fromkeys(wrong))
    while len(wrong) < 3:
        wrong.append(str(int(correct_val + choice([3, 4, 5]))))
    explanation = "Find one part then multiply by the numerator."
    return question, correct, wrong[:3], explanation


def gen_integers_question() -> Tuple[str, str, List[str], str]:
    numbers = random.sample(range(-30, 30), 4)
    question = f"Which number is the greatest? {', '.join(map(str, numbers))}"
    correct = str(max(numbers))
    wrong = [str(min(numbers)), str(sorted(numbers)[-2]), str(sorted(numbers)[1])]
    wrong = list(dict.fromkeys(wrong))
    while len(wrong) < 3:
        wrong.append(str(min(numbers)))
    return question, correct, wrong[:3], "Compare the integers and choose the largest."


def gen_surds_question() -> Tuple[str, str, List[str], str]:
    base = choice([18, 32, 50, 72, 98])
    factor = int(math.isqrt(base))
    largest_square = factor * factor
    while base % largest_square != 0:
        factor -= 1
        largest_square = factor * factor
    outside = factor
    inside = base // largest_square
    correct = f"{outside}√{inside}"
    wrong = [f"√{base}", f"{outside}√{inside*2}", f"{outside+1}√{inside}"]
    wrong = list(dict.fromkeys(wrong))
    while len(wrong) < 3:
        wrong.append(f"{outside}√{inside+1}")
    question = f"Simplify √{base}."
    return question, correct, wrong[:3], "Factor the number into a square times another factor."


def gen_ratio_question() -> Tuple[str, str, List[str], str]:
    a = choice([12, 18, 20, 24, 30, 36])
    b = choice([15, 21, 25, 30, 40, 45])
    g = math.gcd(a, b)
    correct = f"{a//g}:{b//g}"
    wrong = [f"{a}:{b}", f"{b}:{a}", f"{a//g+1}:{b//g}"]
    question = f"Simplify the ratio {a}:{b}."
    return question, correct, wrong, "Divide both parts by the highest common factor."


def gen_angle_question() -> Tuple[str, str, List[str], str]:
    variant = choice(["straight", "triangle", "around_point", "vertically_opposite"])
    if variant == "straight":
        angle = choice([32, 45, 58, 73, 101])
        correct = str(180 - angle)
        question = f"Two angles on a straight line are {angle}° and x°. Find x."
        wrong = [str(angle), str(90 - angle % 90), str(180 + angle)]
        return question, correct, wrong, "Angles on a straight line add to 180°."
    if variant == "triangle":
        a = choice([35, 50, 62, 74])
        b = choice([40, 55, 68, 80])
        correct = str(180 - a - b)
        question = f"In a triangle, two angles are {a}° and {b}°. Find the third angle."
        wrong = [str(180 - a), str(180 - b), str(a + b)]
        return question, correct, wrong, "Angles in a triangle sum to 180°."
    if variant == "around_point":
        a = choice([80, 95, 110, 130])
        b = choice([40, 55, 70, 85])
        correct = str(360 - a - b)
        question = f"Angles around a point are {a}°, {b}° and x°. Find x."
        wrong = [str(180 - a - b), str(360 - a), str(360 - b)]
        return question, correct, wrong, "Angles around a point sum to 360°."
    # vertically opposite
    angle = choice([28, 46, 67, 92, 118])
    question = f"Two lines intersect. One angle is {angle}°. Find the vertically opposite angle."
    correct = str(angle)
    wrong = [str(180 - angle), str(angle + 20), str(angle - 20)]
    return question, correct, wrong, "Vertically opposite angles are equal."


def gen_circle_theorem_question() -> Tuple[str, str, List[str], str]:
    angle = choice([60, 70, 80, 100, 120])
    correct = str(angle / 2 if angle % 2 == 0 else round(angle / 2, 1))
    question = f"The angle at the centre is {angle}°. Find the angle at the circumference subtended by the same arc."
    wrong = [str(angle), str(angle + 10), str(int(angle/2) + 10)]
    return question, correct, wrong, "Angle at centre is twice the angle at the circumference."


def gen_congruence_question() -> Tuple[str, str, List[str], str]:
    variant = choice(["side_match", "condition_sss", "condition_sas", "condition_rhs"])
    if variant == "side_match":
        side = choice([5, 7, 9, 12, 15, 18, 21])
        question = f"Triangles ABC and DEF are congruent. If AB = {side} cm, what is DE?"
        correct = f"{side} cm"
        wrong = [f"{side+2} cm", f"{side-2} cm", f"{side*2} cm"]
        return question, correct, wrong, "Corresponding sides in congruent triangles are equal."
    if variant == "condition_sas":
        question = "Which condition is sufficient to prove two triangles are congruent?"
        correct = "Side-Angle-Side (SAS)"
        wrong = ["Angle-Angle-Side (AAS)", "Angle-Angle-Angle (AAA)", "Side-Side-Angle (SSA)"]
        return question, correct, wrong, "SAS is a valid congruence condition."
    if variant == "condition_rhs":
        question = "Two right-angled triangles have equal hypotenuse and one equal side. What condition proves they are congruent?"
        correct = "RHS"
        wrong = ["ASA", "AAA", "SSA"]
        return question, correct, wrong, "Right-angle, hypotenuse, side (RHS) proves congruence."
    question = "Which condition is sufficient to prove two triangles are congruent?"
    correct = "Side-Side-Side (SSS)"
    wrong = ["Angle-Angle-Angle (AAA)", "Angle-Side-Other (ASO)", "Side-Angle-Angle (SAA)"]
    return question, correct, wrong, "SSS is a valid congruence condition."


def gen_loci_question() -> Tuple[str, str, List[str], str]:
    distance = choice([3, 4, 5, 6])
    question = f"Which locus describes all points {distance} cm from a fixed point P?"
    correct = f"A circle with centre P and radius {distance} cm"
    wrong = [
        f"A line {distance} cm from P",
        f"A circle with diameter {distance} cm",
        "A pair of intersecting lines through P",
    ]
    return question, correct, wrong, "Points at a fixed distance from a point form a circle."


def gen_shapes_question() -> Tuple[str, str, List[str], str]:
    variants = [
        ("How many edges does a triangular prism have?", "9", ["6", "8", "10"], "A triangular prism has 6 vertices and 9 edges."),
        ("How many faces does a cube have?", "6", ["4", "5", "8"], "A cube has 6 square faces."),
        ("How many vertices does a square-based pyramid have?", "5", ["4", "6", "8"], "A square-based pyramid has 5 vertices."),
    ]
    return choice(variants)


def gen_vectors_question() -> Tuple[str, str, List[str], str]:
    a1, a2 = choice([(1, 2), (2, -1), (3, 0), (4, 1)])
    b1, b2 = choice([(2, 1), (1, 3), (-1, 2), (0, 4)])
    question = f"If a = ({a1}, {a2}) and b = ({b1}, {b2}), find 2a + b."
    correct = f"({2*a1+b1}, {2*a2+b2})"
    wrong = [f"({a1+b1}, {a2+b2})", f"({2*a1-b1}, {2*a2-b2})", f"({a1+2*b1}, {a2+2*b2})"]
    return question, correct, wrong, "Multiply a by 2, then add b component-wise."


def gen_alg_frac_question() -> Tuple[str, str, List[str], str]:
    question = "Simplify (x^2 - 9)/(x - 3)."
    correct = "x + 3"
    wrong = ["x - 3", "x^2 - 9", "x + 9"]
    return question, correct, wrong, "Factor the numerator then cancel the common factor."


def gen_expected_frequency() -> Tuple[str, str, List[str], str]:
    p = choice([0.2, 0.25, 0.3, 0.4])
    trials = choice([20, 40, 50, 60, 80, 100])
    correct_val = int(p * trials)
    question = f"The probability of success is {p}. Estimate the expected number of successes in {trials} trials."
    correct = str(correct_val)
    wrong = [str(correct_val + 5), str(correct_val - 5), str(int(trials * (1-p)))]
    return question, correct, wrong, "Expected frequency = probability × number of trials."


def gen_mutually_exclusive() -> Tuple[str, str, List[str], str]:
    a = choice([0.2, 0.3, 0.4])
    b = choice([0.1, 0.25, 0.35])
    correct = str(round(a + b, 2))
    question = f"Events A and B are mutually exclusive. If P(A) = {a} and P(B) = {b}, find P(A or B)."
    wrong = [str(round(a * b, 2)), str(round(a + b - 0.1, 2)), str(round(a - b, 2))]
    return question, correct, wrong, "For mutually exclusive events, add the probabilities."


def gen_statistics_data() -> Tuple[str, str, List[str], str]:
    variants = [
        (
            "Which of the following is an example of primary data?",
            "Results from your own survey",
            ["A textbook summary", "A website statistics table", "A published research report"],
            "Primary data is collected first-hand.",
        ),
        (
            "Which type of data is collected by the researcher directly?",
            "Primary data",
            ["Secondary data", "Grouped data", "Coded data"],
            "Primary data is collected by the researcher.",
        ),
        (
            "Which of the following is secondary data?",
            "A government census report",
            ["Results from a class questionnaire", "Measurements you record in a lab", "Counts from a school survey"],
            "Secondary data is collected by someone else.",
        ),
        (
            "Which is an example of qualitative data?",
            "Eye colour",
            ["Height", "Mass", "Distance"],
            "Qualitative data is non-numerical.",
        ),
        (
            "Which is an example of quantitative data?",
            "Number of siblings",
            ["Favourite sport", "Hair colour", "Type of pet"],
            "Quantitative data is numerical.",
        ),
        (
            "Which method would give the most reliable data?",
            "A larger, random sample",
            ["A small, biased sample", "Asking only friends", "Surveying one class"],
            "Larger random samples reduce bias.",
        ),
    ]
    return choice(variants)


GENERATORS = {
    "number|unit_conversions": gen_unit_conversion,
    "number|fractions_decimals_percent": gen_fraction_decimal_percent,
    "number|fractions": gen_fraction_question,
    "number|integers": gen_integers_question,
    "number|surds": gen_surds_question,
    "ratio|ratio": gen_ratio_question,
    "geometry|angles": gen_angle_question,
    "geometry|circle_theorems": gen_circle_theorem_question,
    "geometry|congruence": gen_congruence_question,
    "geometry|constructions_loci": gen_loci_question,
    "geometry|shapes": gen_shapes_question,
    "geometry|vectors": gen_vectors_question,
    "algebra|algebraic_fractions": gen_alg_frac_question,
    "probability|expected_frequency": gen_expected_frequency,
    "probability|mutually_exclusive": gen_mutually_exclusive,
    "statistics|data": gen_statistics_data,
}


def main() -> None:
    random.seed(42)
    _load_env(ENV_PATH)
    supabase_url = _env("SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}

    counts = fetch_counts(supabase_url, headers)
    subtopic_to_topic = load_subtopics("supabase/import/gcse_mini_subtopics.json")
    target = 20
    rows: List[Dict[str, Any]] = []

    for subtopic, topic in sorted(subtopic_to_topic.items()):
        if subtopic not in GENERATORS:
            continue
        for tier in ["Foundation Tier", "Higher Tier"]:
            existing = counts.get(subtopic, {}).get(tier, 0)
            missing = max(0, target - existing)
            if missing <= 0:
                continue
            generator = GENERATORS[subtopic]
            seen_questions = set()
            attempts = 0
            while missing > 0 and attempts < 200:
                attempts += 1
                if subtopic == "number|unit_conversions":
                    q, c, wrong, exp = generator(tier)
                else:
                    q, c, wrong, exp = generator()
                if q in seen_questions:
                    continue
                seen_questions.add(q)
                calculator = "Calculator" if tier == "Higher Tier" else "Non-Calculator"
                difficulty = 3 if tier == "Higher Tier" else 2
                row = build_row(
                    topic=topic,
                    subtopic=subtopic,
                    tier=tier,
                    calculator=calculator,
                    question=q,
                    correct=c,
                    wrong=wrong[:3],
                    explanation=exp,
                    difficulty=difficulty,
                )
                rows.append(row)
                missing -= 1
            if missing > 0:
                print(f"Warning: could not generate enough unique questions for {subtopic} {tier}. Missing {missing}.")

    if not rows:
        print("No rows to insert.")
        return

    chunk = 200
    inserted_total = 0
    for i in range(0, len(rows), chunk):
        batch = rows[i : i + chunk]
        url = f"{supabase_url.rstrip('/')}/rest/v1/exam_questions"
        status, body = _http_json("POST", url, headers, payload=batch, timeout=120)
        if status not in (200, 201, 204):
            raise SystemExit(f"Insert failed (status={status}): {body}")
        inserted_total += len(batch)
        time.sleep(0.2)

    print(f"Inserted {inserted_total} questions.")


if __name__ == "__main__":
    main()
