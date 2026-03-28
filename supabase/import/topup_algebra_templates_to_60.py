#!/usr/bin/env python3
"""Top up Algebra mini-subtopics to 60 total using deterministic templates (no AI calls)."""
from __future__ import annotations

import json
import math
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
        "question_type": "Algebra",
        "subtopic": subtopic,
        "tier": "Foundation Tier",
        "calculator": calculator,
        "difficulty": difficulty,
        "marks": marks,
        "estimated_time_sec": 90,
        "image_url": None,
        "image_alt": None,
    }


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


def gen_substitution() -> Dict[str, Any]:
    x = RNG.choice([2, 3, 4, 5])
    y = RNG.choice([-1, 1, 2, 3])
    a = RNG.choice([2, 3, 4])
    b = RNG.choice([1, 2, 3])
    c = RNG.choice([3, 5, 7])
    question = f"Given \\\\( x = {x} \\\\) and \\\\( y = {y} \\\\), evaluate \\\\( {a}x^2 - {b}y + {c} \\\\)."
    correct_val = a * x * x - b * y + c
    correct = str(correct_val)
    wrong = [
        str(a * x * x - b * y - c),
        str(a * x * x + b * y + c),
        str(a * x - b * y + c),
    ]
    explanation = (
        "Step 1: Substitute the given values into the expression.\n"
        f"\\( {a}({x})^2 - {b}({y}) + {c} \\)\n\n"
        "Step 2: Evaluate the powers and multiplication.\n"
        f"\\( {a * x * x} - {b * y} + {c} \\)\n\n"
        "Step 3: Combine the terms to get the final value.\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|substitution")


def gen_rearranging() -> Dict[str, Any]:
    template = RNG.choice([
        ("A = \\frac{1}{2}bh", "h", "h = \\frac{2A}{b}", ["h = \\frac{A}{b}", "h = \\frac{A}{2b}", "h = \\frac{b}{2A}"]),
        ("P = 2l + 2w", "l", "l = \\frac{P - 2w}{2}", ["l = P - 2w", "l = \\frac{P}{2} - w", "l = \\frac{P}{2w}"]),
        ("y = mx + c", "m", "m = \\frac{y - c}{x}", ["m = y - cx", "m = \\frac{y}{x} - c", "m = \\frac{x}{y - c}"]),
        ("V = \\pi r^2 h", "h", "h = \\frac{V}{\\pi r^2}", ["h = \\frac{V}{\\pi r}", "h = \\frac{V}{r^2}", "h = \\pi r^2 V"]),
    ])
    formula, subject, correct, wrongs = template
    question = f"Rearrange the formula \\\\( {formula} \\\\) to make \\\\( {subject} \\\\) the subject."
    explanation = (
        "Step 1: Identify the term containing the subject.\n"
        f"The term with {subject} is moved to one side if needed.\n\n"
        "Step 2: Undo multiplication or division to isolate the subject.\n"
        f"This gives \\\\( {correct} \\\\).\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrongs, explanation=explanation, subtopic="algebra|rearranging")


def gen_simultaneous() -> Dict[str, Any]:
    x = RNG.choice([1, 2, 3, 4, 5])
    y = RNG.choice([1, 2, 3, 4, 5])
    a, b = RNG.choice([(2, 1), (3, 1), (1, 2), (2, 3)])
    c, d = RNG.choice([(1, 1), (1, 2), (2, 1), (3, 1)])
    eq1 = a * x + b * y
    eq2 = c * x - d * y
    question = (
        f"Solve the simultaneous equations:\n"
        f"\\( {a}x + {b}y = {eq1} \\)\n"
        f"\\( {c}x - {d}y = {eq2} \\)"
    )
    correct = f"x = {x}, y = {y}"
    wrong = [
        f"x = {x}, y = {-y}",
        f"x = {y}, y = {x}",
        f"x = {x + 1}, y = {y - 1}",
    ]
    explanation = (
        "Step 1: Eliminate one variable by adding or subtracting the equations.\n"
        f"Add the equations to eliminate y (since coefficients are {b} and {-d}).\n\n"
        "Step 2: Solve the resulting equation for x.\n"
        f"This gives x = {x}.\n\n"
        "Step 3: Substitute x back into one equation to find y.\n"
        f"This gives y = {y}.\n\n"
        f"Final answer: x = {x}, y = {y}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|simultaneous", difficulty=3, marks=3)


def gen_graphs() -> Dict[str, Any]:
    m = RNG.choice([1, 2, 3, -1, -2])
    c = RNG.choice([-3, -1, 0, 2, 4])
    x_val = RNG.choice([-2, -1, 1, 2, 3])
    y_val = m * x_val + c
    question = f"The graph of \\\\( y = {m}x {f'+ {c}' if c>=0 else f'- {abs(c)}'} \\\\) is drawn. What is the y-value when \\\\( x = {x_val} \\\\)?"
    correct = str(y_val)
    wrong = [
        str(m * x_val - c),
        str(m + x_val + c),
        str(m * x_val),
    ]
    explanation = (
        "Step 1: Substitute the given x-value into the equation.\n"
        f"\\( y = {m}({x_val}) {f'+ {c}' if c>=0 else f'- {abs(c)}'} \\)\n\n"
        "Step 2: Multiply and then add the constant.\n"
        f"\\( y = {y_val} \\)\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|graphs", difficulty=2)


def gen_quadratics() -> Dict[str, Any]:
    roots = RNG.choice([(1, 3), (2, 4), (-1, 3), (-2, 5)])
    r1, r2 = roots
    b = -(r1 + r2)
    c = r1 * r2
    question = f"Solve the quadratic equation \\\\( x^2 {f'+ {b}' if b>=0 else f'- {abs(b)}'}x {f'+ {c}' if c>=0 else f'- {abs(c)}'} = 0 \\\\)."
    correct = f"x = {r1} or x = {r2}"
    wrong = [
        f"x = {r1} or x = {-r2}",
        f"x = {abs(r1)} or x = {abs(r2)}",
        f"x = {r1 + r2}",
    ]
    explanation = (
        "Step 1: Factorise the quadratic.\n"
        f"\\( x^2 {f'+ {b}' if b>=0 else f'- {abs(b)}'}x {f'+ {c}' if c>=0 else f'- {abs(c)}'} = (x - {r1})(x - {r2}) \\)\n\n"
        "Step 2: Set each factor equal to zero.\n"
        f"\\( x - {r1} = 0 \\) or \\( x - {r2} = 0 \\)\n\n"
        f"Final answer: x = {r1} or x = {r2}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|quadratics", difficulty=3, marks=3)


def gen_algebraic_fractions() -> Dict[str, Any]:
    a = RNG.choice([2, 3, 4])
    b = RNG.choice([1, 2, 3])
    question = f"Simplify \\\\( \\frac{{{a}x^2 + {a*b}x}}{{x}} \\\\) for \\\\( x \\ne 0 \\\\)."
    correct = f"{a}x + {a*b}"
    wrong = [
        f"{a}x^2 + {a*b}x",
        f"{a}x + {b}",
        f"{a}x^2 + {a*b}",
    ]
    explanation = (
        "Step 1: Factor x from the numerator.\n"
        f"\\( \\frac{{x({a}x + {a*b})}}{{x}} \\)\n\n"
        "Step 2: Cancel the common factor x (since x ≠ 0).\n"
        f"\\( {a}x + {a*b} \\)\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|algebraic_fractions", difficulty=3, marks=2)


def gen_expressions() -> Dict[str, Any]:
    template = RNG.choice(["simplify", "collect"])
    if template == "simplify":
        a = RNG.choice([2, 3, 4])
        b = RNG.choice([1, 2, 3])
        c = RNG.choice([3, 5, 7])
        d = RNG.choice([2, 4, 6])
        question = f"Simplify \\\\( {a}(2x - {b}) + {c}(x + {d}) \\\\)."
        coeff = a * 2 + c
        constant = -(a * b) + c * d
        correct = f"{coeff}x + {constant}"
        wrong = [
            f"{coeff}x - {constant}",
            f"{(a * 2 - c)}x + {constant}",
            f"{(a + c)}x + {constant}",
        ]
        explanation = (
            "Step 1: Expand each bracket.\n"
            f"\\( {a}(2x - {b}) = {a*2}x - {a*b} \\), and \\( {c}(x + {d}) = {c}x + {c*d} \\).\n\n"
            "Step 2: Collect like terms.\n"
            f"\\( ({a*2}x + {c}x) + (-{a*b} + {c*d}) = {coeff}x + {constant} \\).\n\n"
            f"Final answer: {correct}"
        )
        return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|expressions", difficulty=2, marks=2)

    m = RNG.choice([3, 4, 5])
    n = RNG.choice([2, 3, 4])
    p = RNG.choice([1, 2, 3])
    question = f"Collect like terms: \\\\( {m}x + {n} - {p}x + 7 \\\\)."
    coeff = m - p
    constant = n + 7
    correct = f"{coeff}x + {constant}"
    wrong = [
        f"{(m + p)}x + {constant}",
        f"{coeff}x + {n}",
        f"{(p - m)}x + {constant}",
    ]
    explanation = (
        "Step 1: Combine the x-terms.\n"
        f"\\( {m}x - {p}x = {coeff}x \\).\n\n"
        "Step 2: Combine the constants.\n"
        f"{n} + 7 = {constant}.\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|expressions", difficulty=2, marks=2)


def gen_expand() -> Dict[str, Any]:
    a = RNG.choice([1, 2, 3])
    b = RNG.choice([2, 3, 4])
    c = RNG.choice([1, 2, 3])
    d = RNG.choice([1, 2, 3])
    question = f"Expand and simplify: \\\\( ({a}x + {b})({c}x - {d}) \\\\)."
    A = a * c
    B = a * (-d) + b * c
    C = b * (-d)
    correct = f"{A}x^2 {f'+ {B}' if B >= 0 else f'- {abs(B)}'}x {f'+ {C}' if C >= 0 else f'- {abs(C)}'}"
    wrong = [
        f"{A}x^2 {f'+ {a*d}' if a*d >= 0 else f'- {abs(a*d)}'}x {f'+ {C}' if C >= 0 else f'- {abs(C)}'}",
        f"{A}x^2 {f'+ {B}' if B >= 0 else f'- {abs(B)}'}x",
        f"{A}x^2 {f'+ {b*c}' if b*c >= 0 else f'- {abs(b*c)}'}x {f'+ {C}' if C >= 0 else f'- {abs(C)}'}",
    ]
    explanation = (
        "Step 1: Multiply each term in the first bracket by each term in the second.\n"
        f"\\( {a}x \\cdot {c}x = {A}x^2 \\), \\( {a}x \\cdot (-{d}) = {-a*d}x \\), "
        f"\\( {b} \\cdot {c}x = {b*c}x \\), \\( {b} \\cdot (-{d}) = {C} \\).\n\n"
        "Step 2: Combine the x-terms.\n"
        f"\\( {-a*d}x + {b*c}x = {B}x \\).\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|expand", difficulty=3, marks=3)


def gen_factorise() -> Dict[str, Any]:
    template = RNG.choice(["common", "quadratic"])
    if template == "common":
        k = RNG.choice([2, 3, 4, 5])
        a = RNG.choice([2, 3, 4])
        b = RNG.choice([1, 2, 3])
        question = f"Factorise fully: \\\\( {k*a}x^2 - {k*b}x \\\\)."
        correct = f"{k}x({a}x - {b})"
        wrong = [
            f"{k}({a}x - {b})",
            f"x({k*a}x - {k*b})",
            f"{k}x({a}x + {b})",
        ]
        explanation = (
            "Step 1: Identify the greatest common factor of both terms.\n"
            f"The GCF is {k}x.\n\n"
            "Step 2: Divide each term by the GCF.\n"
            f"\\( {k*a}x^2 ÷ {k}x = {a}x \\) and \\( {k*b}x ÷ {k}x = {b} \\).\n\n"
            f"Final answer: {correct}"
        )
        return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|factorise", difficulty=3, marks=3)

    r1 = RNG.choice([1, 2, 3, 4])
    r2 = RNG.choice([1, 2, 3, 5])
    b = -(r1 + r2)
    c = r1 * r2
    question = f"Factorise: \\\\( x^2 {f'+ {b}' if b >= 0 else f'- {abs(b)}'}x + {c} \\\\)."
    correct = f"(x - {r1})(x - {r2})"
    wrong = [
        f"(x + {r1})(x + {r2})",
        f"(x - {r1})(x + {r2})",
        f"x(x {f'+ {b}' if b >= 0 else f'- {abs(b)}'}) + {c}",
    ]
    explanation = (
        "Step 1: Find two numbers that multiply to the constant term and add to the x-coefficient.\n"
        f"\\( {r1} \\times {r2} = {c} \\) and \\( -{r1} + -{r2} = {b} \\).\n\n"
        "Step 2: Write the factors.\n"
        f"\\( (x - {r1})(x - {r2}) \\).\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|factorise", difficulty=3, marks=3)


def gen_sequences() -> Dict[str, Any]:
    a = RNG.choice([4, 7, 10])
    d = RNG.choice([3, 5, -2])
    n = RNG.choice([5, 6, 7])
    question = (
        f"A sequence starts with {a} and increases by {d} each time. "
        f"What is the {n}th term?"
    )
    correct_val = a + (n - 1) * d
    correct = str(correct_val)
    wrong = [
        str(a + n * d),
        str(a + (n - 2) * d),
        str(a * d),
    ]
    explanation = (
        "Step 1: This is an arithmetic sequence with common difference d.\n"
        f"Here, d = {d}.\n\n"
        "Step 2: Use \\( a_n = a_1 + (n - 1)d \\).\n"
        f"\\( a_{n} = {a} + ({n} - 1)\\cdot {d} = {correct_val} \\).\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|sequences", difficulty=2, marks=2)


def gen_nth_term() -> Dict[str, Any]:
    a = RNG.choice([2, 3, 4, 5])
    d = RNG.choice([3, 4, -2])
    question = f"Find the nth term of the sequence: {a}, {a + d}, {a + 2*d}, {a + 3*d}, ..."
    correct = f"{d}n + {a - d}"
    wrong = [
        f"{d}n + {a}",
        f"{d}n - {a}",
        f"{a}n + {d}",
    ]
    explanation = (
        "Step 1: Find the common difference.\n"
        f"Each term increases by {d}.\n\n"
        "Step 2: Use \\( a_n = dn + c \\).\n"
        f"Substitute n = 1: \\( {d} + c = {a} \\) so \\( c = {a - d} \\).\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|nth_term", difficulty=3, marks=3)


def gen_gradients() -> Dict[str, Any]:
    x1 = RNG.choice([-2, -1, 1, 2])
    y1 = RNG.choice([1, 3, 5, -1])
    x2 = x1 + RNG.choice([2, 3, 4])
    y2 = y1 + RNG.choice([2, 4, -2])
    m = (y2 - y1) / (x2 - x1)
    c = y1 - m * x1
    question = f"Find the equation of the line through \\\\( ({x1}, {y1}) \\\\) and \\\\( ({x2}, {y2}) \\\\)."
    correct = f"y = {m}x {f'+ {c}' if c >= 0 else f'- {abs(c)}'}"
    wrong = [
        f"y = {m}x {f'+ {y1}' if y1 >= 0 else f'- {abs(y1)}'}",
        f"y = {m}x {f'+ {x1}' if x1 >= 0 else f'- {abs(x1)}'}",
        f"y = {-m}x {f'+ {c}' if c >= 0 else f'- {abs(c)}'}",
    ]
    explanation = (
        "Step 1: Find the gradient using two points.\n"
        f"\\( m = \\frac{{{y2} - {y1}}}{{{x2} - {x1}}} = {m} \\).\n\n"
        "Step 2: Use \\( y = mx + c \\) with one point to find c.\n"
        f"\\( {y1} = {m}\\cdot {x1} + c \\Rightarrow c = {c} \\).\n\n"
        f"Final answer: {correct}"
    )
    return build_row(question=question, correct=correct, wrong=wrong, explanation=explanation, subtopic="algebra|gradients", difficulty=3, marks=3)


GENERATOR_BY_SUBTOPIC = {
    "algebra|expressions": gen_expressions,
    "algebra|expand": gen_expand,
    "algebra|factorise": gen_factorise,
    "algebra|substitution": gen_substitution,
    "algebra|rearranging": gen_rearranging,
    "algebra|sequences": gen_sequences,
    "algebra|nth_term": gen_nth_term,
    "algebra|gradients": gen_gradients,
    "algebra|simultaneous": gen_simultaneous,
    "algebra|graphs": gen_graphs,
    "algebra|quadratics": gen_quadratics,
    "algebra|algebraic_fractions": gen_algebraic_fractions,
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
        while len(rows) < missing and attempts < missing * 5:
            attempts += 1
            row = generator()
            rows.append(row)

        if len(rows) < missing:
            print(f"{subtopic}: only generated {len(rows)} of {missing}")

        inserted = insert_rows(supabase_url, headers, rows[:missing])
        print(f"{subtopic}: inserted {inserted}")
        time.sleep(0.5)


if __name__ == "__main__":
    main()
