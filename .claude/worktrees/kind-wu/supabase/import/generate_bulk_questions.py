#!/usr/bin/env python3
"""Generate lots of GCSE-style MCQ questions + SVG images.

Design constraints (matches app expectations):
- `question_type` is used as TOPIC (e.g. Number, Algebra, ...)
- `tier` must be `Foundation Tier` or `Higher Tier`
- `calculator` must be `Calculator` or `Non-Calculator`
- `wrong_answers` is a JSON array
- `image_url` is an object path inside Supabase Storage bucket `questions`

This script is template-based (deterministic-ish) and does NOT call any external APIs.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import random
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Tuple, Optional


TOPICS = [
    "Number",
    "Algebra",
    "Ratio & Proportion",
    "Geometry & Measures",
    "Probability",
    "Statistics",
]

IMAGE_TOPICS_AUTO = {"Geometry & Measures", "Statistics"}


def clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def tier_to_db(tier: str) -> str:
    t = tier.strip().lower()
    if t == "foundation":
        return "Foundation Tier"
    if t == "higher":
        return "Higher Tier"
    raise ValueError("tier must be foundation or higher")


def pick_difficulty(rng: random.Random, db_tier: str) -> int:
    # Keep it simple: foundation tends lower, higher tends higher.
    if db_tier == "Foundation Tier":
        return rng.choice([1, 1, 2, 2, 3])
    # Higher tier should feel meaningfully harder.
    return rng.choice([4, 4, 5, 5, 5])


def pick_calculator(rng: random.Random, difficulty: int) -> str:
    # Mix calculator/non-calculator slightly by difficulty.
    if difficulty <= 2:
        return rng.choice(["Non-Calculator", "Non-Calculator", "Calculator"])
    return rng.choice(["Calculator", "Calculator", "Non-Calculator"])


def mcq_wrong_answers_numeric(rng: random.Random, correct: int, spread: int = 6) -> List[str]:
    # Generates 3 distinct wrong integer answers.
    candidates = set()
    while len(candidates) < 3:
        delta = rng.randint(-spread, spread)
        if delta == 0:
            continue
        candidates.add(str(correct + delta))
    return list(candidates)


def mcq_wrong_answers_bounded_int(rng: random.Random, correct: int, *, lo: int, hi: int) -> List[str]:
    candidates = set()
    attempts = 0
    while len(candidates) < 3 and attempts < 200:
        attempts += 1
        v = rng.randint(lo, hi)
        if v == correct:
            continue
        candidates.add(str(v))
    if len(candidates) < 3:
        # fallback: small offsets clamped
        for d in (-2, -1, 1, 2, 3, -3):
            v = clamp(correct + d, lo, hi)
            if v != correct:
                candidates.add(str(v))
            if len(candidates) >= 3:
                break
    return list(candidates)[:3]


def _dedupe_preserve(items: List[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for x in items:
        x = str(x).strip()
        if not x or x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def mcq_wrong_answers_float(
    rng: random.Random,
    correct: float,
    *,
    deltas: List[float],
    fmt: str = ".2f",
) -> List[str]:
    wrong = [format(correct + d, fmt) for d in deltas if abs(d) > 1e-12]
    wrong = _dedupe_preserve(wrong)
    # Ensure we have 3 answers
    while len(wrong) < 3:
        jitter = rng.choice([0.01, 0.02, 0.05, 0.1])
        wrong.append(format(correct + rng.choice([-1, 1]) * jitter, fmt))
        wrong = _dedupe_preserve(wrong)
    return wrong[:3]


def fmt_frac(n: int, d: int) -> str:
    g = math.gcd(n, d)
    n //= g
    d //= g
    return f"{n}/{d}"


def fmt_fixed(x: float, dp: int) -> str:
    # Stable fixed decimals (no scientific notation).
    s = f"{x:.{dp}f}"
    # Avoid negative zero like -0.0
    if s.startswith("-0") and float(s) == 0.0:
        s = s[1:]
    return s


def _is_int_like(s: str) -> bool:
    s = (s or "").strip()
    if s.startswith("-"):
        s = s[1:]
    return s.isdigit()


def _decimal_dp(s: str) -> int:
    s = (s or "").strip()
    if "." not in s:
        return 0
    return len(s.split(".", 1)[1])


def normalize_wrong_answers(correct: str, wrong: List[str]) -> List[str]:
    correct = str(correct).strip()
    wrong = [str(w).strip() for w in wrong]

    # If correct is a fraction, keep fractions.
    if "/" in correct and all(p.strip().lstrip("-").isdigit() for p in correct.split("/", 1)):
        wrong_f = [w for w in wrong if "/" in w]
        return _dedupe_preserve([w for w in wrong_f if w != correct])[:3]

    # If correct is integer-like, keep integer-like.
    if _is_int_like(correct):
        wrong_i = [w for w in wrong if _is_int_like(w)]
        return _dedupe_preserve([w for w in wrong_i if w != correct])[:3]

    # Otherwise align decimal places to the correct answer.
    dp = _decimal_dp(correct)
    out: List[str] = []
    for w in wrong:
        if w == correct:
            continue
        try:
            out.append(fmt_fixed(float(w), dp))
        except Exception:
            # keep as-is
            out.append(w)
    return _dedupe_preserve([w for w in out if w != correct])[:3]


def ensure_three_wrong_answers(rng: random.Random, correct: str, wrong: List[str]) -> List[str]:
    correct = str(correct).strip()
    out = normalize_wrong_answers(correct, wrong)

    def _add(v: str) -> None:
        v = str(v).strip()
        if not v or v == correct or v in out:
            return
        out.append(v)

    # Top up if filtering removed too many candidates.
    attempts = 0
    while len(out) < 3 and attempts < 200:
        attempts += 1

        # Fractions: keep same denominator and nudge numerator.
        if "/" in correct:  # e.g. "3/5"
            try:
                n_s, d_s = correct.split("/", 1)
                n, d = int(n_s.strip()), int(d_s.strip())
                if d != 0:
                    delta = rng.choice([-3, -2, -1, 1, 2, 3])
                    _add(fmt_frac(n + delta, d))
                    continue
            except Exception:
                pass

        # Integers: small offsets.
        if _is_int_like(correct):
            base = int(correct)
            delta = rng.choice([-9, -7, -5, -3, -2, -1, 1, 2, 3, 5, 7, 9])
            _add(str(base + delta))
            continue

        # Decimals: preserve dp of the correct answer.
        try:
            dp = _decimal_dp(correct)
            base_f = float(correct)
            delta = rng.choice([-3, -2, -1, -0.5, -0.2, -0.1, 0.1, 0.2, 0.5, 1, 2, 3])
            _add(fmt_fixed(base_f + float(delta), dp))
            continue
        except Exception:
            # Last resort: random integers as strings
            _add(str(rng.randint(-20, 20)))

    return out[:3]


def reduce_frac(n: int, d: int) -> Tuple[int, int]:
    g = math.gcd(n, d)
    return n // g, d // g


def svg_wrap(text_lines: List[str], width: int = 760, height: int = 220) -> str:
    # Minimal SVG with text; keeps things robust and fast.
    # (No external fonts; relies on default.)
    y = 40
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect x="0" y="0" width="100%" height="100%" fill="white" />',
        '<rect x="12" y="12" width="736" height="196" rx="16" fill="#f8fafc" stroke="#cbd5e1" />',
    ]
    for line in text_lines[:5]:
        safe = (
            line.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        parts.append(f'<text x="32" y="{y}" font-size="22" fill="#0f172a">{safe}</text>')
        y += 34
    parts.append("</svg>")
    return "\n".join(parts)


def svg_triangle(base: int, height: int) -> str:
    # Simple right-ish triangle with base/height labels
    width, h = 760, 320
    bx1, by1 = 120, 260
    bx2, by2 = 620, 260
    tx, ty = 260, 80
    # Right-angle marker at the foot of the height
    ra = 14
    foot_x, foot_y = tx, by1
    return "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{h}" viewBox="0 0 {width} {h}">',
            '<rect width="100%" height="100%" fill="white"/>',
            '<rect x="12" y="12" width="736" height="296" rx="16" fill="#f8fafc" stroke="#cbd5e1"/>',
            f'<polygon points="{bx1},{by1} {bx2},{by2} {tx},{ty}" fill="#e2e8f0" stroke="#0f172a" stroke-width="3"/>',
            f'<line x1="{bx1}" y1="{by1}" x2="{bx2}" y2="{by2}" stroke="#0f172a" stroke-width="3"/>',
            f'<line x1="{tx}" y1="{ty}" x2="{tx}" y2="{by1}" stroke="#64748b" stroke-width="2" stroke-dasharray="6 6"/>',
            f'<path d="M {foot_x} {foot_y} L {foot_x} {foot_y-ra} L {foot_x+ra} {foot_y-ra} L {foot_x+ra} {foot_y}" fill="none" stroke="#0f172a" stroke-width="2"/>',
            f'<text x="{(bx1+bx2)//2 - 80}" y="{by1+34}" font-size="22" fill="#0f172a">base = {base} cm</text>',
            f'<text x="{tx+18}" y="{(ty+by1)//2}" font-size="22" fill="#0f172a">height = {height} cm</text>',
            '</svg>',
        ]
    )


def svg_circle(radius: int) -> str:
    width, h = 760, 320
    cx, cy = 380, 170
    r = 90
    return "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{h}" viewBox="0 0 {width} {h}">',
            '<rect width="100%" height="100%" fill="white"/>',
            '<rect x="12" y="12" width="736" height="296" rx="16" fill="#f8fafc" stroke="#cbd5e1"/>',
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#e2e8f0" stroke="#0f172a" stroke-width="3"/>',
            f'<line x1="{cx}" y1="{cy}" x2="{cx+r}" y2="{cy}" stroke="#0f172a" stroke-width="3"/>',
            f'<text x="{cx+30}" y="{cy-12}" font-size="22" fill="#0f172a">r = {radius} cm</text>',
            '</svg>',
        ]
    )


def _nice_axis_max(max_v: int) -> Tuple[int, int]:
    # Choose (axis_max, tick_step) suitable for GCSE-style charts.
    if max_v <= 10:
        return 10, 2
    if max_v <= 15:
        return 15, 3
    if max_v <= 20:
        return 20, 5
    if max_v <= 25:
        return 25, 5
    if max_v <= 30:
        return 30, 5
    # fallback
    axis_max = int(math.ceil(max_v / 10.0) * 10)
    return axis_max, max(5, axis_max // 6)


def svg_bar_chart(labels: List[str], values: List[int]) -> str:
    width, h = 760, 360
    chart_x, chart_y = 90, 60
    chart_w, chart_h = 580, 240
    raw_max = max(values) if values else 1
    axis_max, tick = _nice_axis_max(raw_max)
    bar_w = chart_w // max(1, len(values))
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{h}" viewBox="0 0 {width} {h}">',
        '<rect width="100%" height="100%" fill="white"/>',
        '<rect x="12" y="12" width="736" height="336" rx="16" fill="#f8fafc" stroke="#cbd5e1"/>',
        f'<line x1="{chart_x}" y1="{chart_y+chart_h}" x2="{chart_x+chart_w}" y2="{chart_y+chart_h}" stroke="#0f172a" stroke-width="3"/>',
        f'<line x1="{chart_x}" y1="{chart_y}" x2="{chart_x}" y2="{chart_y+chart_h}" stroke="#0f172a" stroke-width="3"/>',
        f'<text x="{chart_x}" y="{chart_y-14}" font-size="18" fill="#334155">Frequency</text>',
    ]

    # y-axis ticks + gridlines
    y = 0
    while y <= axis_max:
        yy = chart_y + chart_h - int((y / axis_max) * chart_h)
        parts.append(f'<line x1="{chart_x}" y1="{yy}" x2="{chart_x+chart_w}" y2="{yy}" stroke="#e2e8f0" stroke-width="2"/>')
        parts.append(f'<line x1="{chart_x-6}" y1="{yy}" x2="{chart_x}" y2="{yy}" stroke="#0f172a" stroke-width="2"/>')
        parts.append(f'<text x="{chart_x-38}" y="{yy+6}" font-size="16" fill="#0f172a">{y}</text>')
        y += tick

    for i, (lab, val) in enumerate(zip(labels, values)):
        x = chart_x + i * bar_w + 12
        bar_h = int((val / axis_max) * (chart_h - 8))
        y = chart_y + chart_h - bar_h
        parts.append(f'<rect x="{x}" y="{y}" width="{bar_w-24}" height="{bar_h}" fill="#cbd5e1" stroke="#0f172a"/>')
        parts.append(f'<text x="{x}" y="{chart_y+chart_h+26}" font-size="18" fill="#0f172a">{lab}</text>')
    parts.append('</svg>')
    return "\n".join(parts)


@dataclass
class GenResult:
    subtopic: str | None
    question: str
    correct_answer: str
    wrong_answers: List[str]
    explanation: str
    diagram_fn: Optional[DiagramFn]
    calculator_override: str | None = None


@dataclass
class GeneratedQuestion:
    id: str
    question_type: str  # topic
    tier: str
    calculator: str
    subtopic: str | None
    question: str
    correct_answer: str
    wrong_answers: List[str]
    marks: int
    difficulty: int
    estimated_time_sec: int
    image_url: str | None
    image_alt: str | None
    explanation: str | None


DiagramFn = Callable[[], Tuple[str, str]]


def gen_number(rng: random.Random, difficulty: int) -> GenResult:
    # Multiple subtopics for variety.
    pick = rng.random()

    # Calculator-required: awkward percentage of a non-round number
    if difficulty >= 3 and pick < 0.25:
        pct = rng.choice([7, 12, 13, 17, 19, 23, 27])
        amount = rng.randint(101, 999)
        q = f"Work out {pct}% of {amount}."
        correct = amount * pct / 100
        ans = f"{correct:g}"
        wrong = _dedupe_preserve([
            f"{amount * (pct + 1) / 100:g}",
            f"{amount * pct / 10:g}",
            f"{amount * (100 - pct) / 100:g}",
        ])
        expl = f"{pct}% of {amount} = {pct}/100 × {amount} = {correct:g}."
        return GenResult(
            subtopic="Percentages",
            question=q,
            correct_answer=ans,
            wrong_answers=wrong[:3],
            explanation=expl,
            diagram_fn=None,
            calculator_override="Calculator",
        )

    # Non-calculator: fraction of an amount (kept divisible)
    if difficulty >= 2 and pick < 0.55:
        den = rng.choice([2, 3, 4, 5, 6, 8, 10])
        num = rng.randint(1, den - 1)
        n = rng.randint(12, 120)
        n -= n % den
        q = f"Calculate {fmt_frac(num, den)} of {n}."
        g = math.gcd(num, den)
        num_s, den_s = num // g, den // g
        correct = n * num / den
        ans = str(int(correct))
        wrong = _dedupe_preserve([
            str(int(n / den)),
            str(int(n * num)),
            str(int(n * (num + 1) / den)),
            str(int(n * (num - 1) / den)) if num > 1 else "",
        ])
        expl = f"{fmt_frac(num, den)} of {n} = {num_s} × ({n} ÷ {den_s}) = {ans}."
        return GenResult(
            subtopic="Fractions of amounts",
            question=q,
            correct_answer=ans,
            wrong_answers=wrong[:3],
            explanation=expl,
            diagram_fn=None,
            calculator_override="Non-Calculator",
        )

    # Rounding division (often calculator in real exams)
    a = rng.randint(10, 99) if difficulty <= 2 else rng.randint(120, 999)
    b = rng.randint(2, 12)
    q = f"Calculate {a} ÷ {b} (round to 2 d.p.)."
    correct = a / b
    ans = fmt_fixed(correct, 2)
    wrong = mcq_wrong_answers_float(rng, correct, deltas=[0.1, -0.1, 0.2], fmt=".2f")
    expl = f"{a} ÷ {b} = {correct:.4f}…, so to 2 d.p. it is {ans}."
    return GenResult(
        subtopic="Rounding",
        question=q,
        correct_answer=ans,
        wrong_answers=wrong,
        explanation=expl,
        diagram_fn=None,
        calculator_override="Calculator" if a >= 120 else None,
    )


def gen_algebra(rng: random.Random, difficulty: int) -> GenResult:
    pick = rng.random()

    # Higher-tier: factorise a monic quadratic with integer roots
    if difficulty >= 4 and pick < 0.30:
        r1 = rng.randint(-9, 9)
        r2 = rng.randint(-9, 9)
        while r2 == r1 or r1 == 0 or r2 == 0:
            r1 = rng.randint(-9, 9)
            r2 = rng.randint(-9, 9)
        b = r1 + r2
        c = r1 * r2
        sign_b = "+" if b >= 0 else "-"
        sign_c = "+" if c >= 0 else "-"
        q = f"Factorise: x^2 {sign_b} {abs(b)}x {sign_c} {abs(c)}"
        # (x - r1)(x - r2)
        def _lin(a: int) -> str:
            return f"(x{'-' if a>=0 else '+'}{abs(a)})"
        ans = f"{_lin(r1)}{_lin(r2)}"
        wrong = _dedupe_preserve(
            [
                f"{_lin(-r1)}{_lin(r2)}",
                f"{_lin(r1)}{_lin(-r2)}",
                f"(x{sign_b}{abs(b)})(x{sign_c}{abs(c)})",
                f"(x{sign_b}{abs(r1)})(x{sign_b}{abs(r2)})",
            ]
        )[:3]
        expl = f"Find two numbers that add to {b} and multiply to {c}: {r1} and {r2}. So x^2 {sign_b}{abs(b)}x {sign_c}{abs(c)} = {ans}."
        return GenResult("Factorising quadratics", q, ans, wrong, expl, None, calculator_override="Non-Calculator")

    # Simplify expression
    if difficulty <= 2 and pick < 0.33:
        a = rng.randint(2, 9)
        b = rng.randint(2, 9)
        q = f"Simplify: {a}x + {b}x"
        ans = f"{a + b}x"
        wrong = _dedupe_preserve([f"{a*b}x", f"{a+b}x^2", f"{a}x{b}x"])[:3]
        expl = f"They are like terms: {a}x + {b}x = ({a}+{b})x = {ans}."
        return GenResult("Collecting like terms", q, ans, wrong, expl, None, calculator_override="Non-Calculator")

    # Solve linear equation
    if difficulty <= 3 and pick < 0.72:
        x = rng.randint(1, 15)
        m = rng.randint(2, 12)
        c = rng.randint(1, 20)
        rhs = m * x + c
        q = f"Solve for x: {m}x + {c} = {rhs}"
        ans = str(x)
        wrong = mcq_wrong_answers_numeric(rng, x, spread=7)
        expl = f"Subtract {c}: {m}x = {rhs - c}. Then divide by {m}: x = {ans}."
        return GenResult("Solving linear equations", q, ans, wrong, expl, None, calculator_override="Non-Calculator")

    # Expand and solve
    def _fmt_pm(n: int) -> str:
        return f"+ {abs(n)}" if n >= 0 else f"- {abs(n)}"

    # Construct a consistent equation by choosing x then deriving d.
    # Keep integer answers (GCSE-style) and allow negatives for stronger higher-tier feel.
    for _ in range(300):
        x = rng.randint(-15, 15)
        if x == 0:
            continue
        a = rng.randint(2, 6)
        c = rng.randint(1, 6)
        if a == c:
            continue
        b = rng.randint(-10, 10)
        if b == 0:
            continue
        d = a * (x + b) - c * x
        # Keep constants readable (avoid huge RHS constants)
        if abs(d) > 35:
            continue

        # Sanity check: substitute the chosen x
        if a * (x + b) != c * x + d:
            continue

        q = f"Solve for x: {a}(x {_fmt_pm(b)}) = {c}x {_fmt_pm(d)}"
        ans = str(x)
        wrong = mcq_wrong_answers_numeric(rng, x, spread=9)
        expl = (
            f"Expand: {a}(x {_fmt_pm(b)}) = {a}x {_fmt_pm(a*b)}. "
            f"So {a}x {_fmt_pm(a*b)} = {c}x {_fmt_pm(d)}. "
            f"Subtract {c}x from both sides: {a-c}x {_fmt_pm(a*b)} = {_fmt_pm(d).lstrip('+ ').lstrip('- ')}"
        )
        # Keep explanation readable with a clean final step
        expl = f"Expand: {a}x {_fmt_pm(a*b)} = {c}x {_fmt_pm(d)}. Collect terms: {a-c}x = {d - a*b}. So x = {ans}."
        return GenResult("Equations with brackets", q, ans, wrong, expl, None, calculator_override="Non-Calculator")

    # Fallback (should be extremely rare)
    x = rng.randint(-12, 12) or 3
    q = "Solve for x: 2(x + 3) = x + 12"
    ans = "6"
    wrong = mcq_wrong_answers_numeric(rng, int(ans), spread=7)
    expl = "Expand: 2x + 6 = x + 12. So x = 6."
    return GenResult("Equations with brackets", q, ans, wrong, expl, None, calculator_override="Non-Calculator")


def gen_ratio(rng: random.Random, difficulty: int) -> GenResult:
    pick = rng.random()

    # Best buy / unit pricing (calculator helpful)
    if difficulty >= 3 and pick < 0.35:
        grams1 = rng.choice([250, 300, 400, 500, 750])
        price1 = rng.choice([1.29, 1.49, 1.79, 1.99, 2.49])
        grams2 = rng.choice([200, 350, 450, 600, 800])
        price2 = rng.choice([1.19, 1.59, 1.89, 2.09, 2.69])
        q = (
            f"Pack A: {grams1} g for £{price1:.2f}. Pack B: {grams2} g for £{price2:.2f}. "
            "Which is better value (cheaper per 100 g)?"
        )
        unit1 = price1 / grams1 * 100
        unit2 = price2 / grams2 * 100
        ans = "A" if unit1 < unit2 else "B"
        wrong = _dedupe_preserve(["A" if ans == "B" else "B", "Same value", "Cannot tell"])[:3]
        expl = (
            f"Cost per 100 g: A = £{unit1:.2f}, B = £{unit2:.2f}. "
            f"So {ans} is better value."
        )
        return GenResult("Best buys", q, ans, wrong, expl, None, calculator_override="Calculator")

    # Ratio sharing
    a = rng.randint(1, 7)
    b = rng.randint(1, 7)
    total_parts = a + b
    total = rng.randint(12, 180)
    total -= total % total_parts
    q = f"Split £{total} in the ratio {a}:{b}. How much is the first share?"
    first = total * a // total_parts
    ans = str(first)
    wrong = _dedupe_preserve([
        str(total * b // total_parts),
        str(first + total_parts),
        str(max(0, first - total_parts)),
        str(total_parts),
    ])[:3]
    expl = f"Total parts = {a}+{b}={total_parts}. 1 part = £{total} ÷ {total_parts} = £{total//total_parts}. First share = {a} parts = £{ans}."
    return GenResult("Ratio", q, ans, wrong, expl, None, calculator_override="Non-Calculator")


def gen_geometry(rng: random.Random, difficulty: int) -> GenResult:
    pick = rng.random()

    # Higher-tier: Pythagoras (often no calculator if triple, still higher skill)
    if difficulty >= 4 and pick < 0.35:
        triples = [(5, 12, 13), (9, 12, 15), (8, 15, 17), (7, 24, 25), (12, 16, 20)]
        a, b, c = rng.choice(triples)
        q = f"A right-angled triangle has legs {a} cm and {b} cm. Find the hypotenuse (cm)."
        ans = str(c)
        wrong = _dedupe_preserve([str(a + b), str(abs(a - b)), str(int(math.sqrt(a*a + b*b)) + 1), str(c - 1)])
        expl = f"Use Pythagoras: hypotenuse² = {a}² + {b}² = {a*a} + {b*b} = {a*a+b*b}. So hypotenuse = √{a*a+b*b} = {c}."
        return GenResult("Pythagoras", q, ans, wrong[:3], expl, None, calculator_override="Non-Calculator")

    # Circle diameter (diagram helps)
    if difficulty <= 2 and pick < 0.5:
        r = rng.randint(2, 12)
        q = f"A circle has radius {r} cm. Find the diameter (cm)."
        ans = str(2 * r)
        wrong = mcq_wrong_answers_numeric(rng, 2 * r, spread=6)
        expl = f"Diameter = 2 × radius = 2 × {r} = {ans}."

        def _diag() -> Tuple[str, str]:
            return svg_circle(r), f"Circle with radius {r} cm"

        return GenResult("Circle measures", q, ans, wrong, expl, _diag, calculator_override="Non-Calculator")

    # Triangle area (diagram helps)
    if difficulty >= 3 or pick < 0.85:
        base = rng.randint(4, 20)
        height = rng.randint(4, 20)
        q = f"Triangle base = {base} cm, height = {height} cm. Find area (cm²)."
        correct = base * height / 2
        ans = str(int(correct)) if float(correct).is_integer() else f"{correct:g}"

        wrong = _dedupe_preserve(
            [
                str(base * height),  # forgot 1/2
                str(int(correct)) if float(correct).is_integer() else f"{math.floor(correct):g}",
                str(int(base + height)),
                str(int(abs(base - height))),
            ]
        )
        wrong = [w for w in wrong if w != ans][:3]

        expl = f"Area = ½ × base × height = ½ × {base} × {height} = {ans} cm²."

        def _diag() -> Tuple[str, str]:
            return svg_triangle(base, height), f"Triangle with base {base} cm and perpendicular height {height} cm"

        return GenResult("Area of triangles", q, ans, wrong, expl, _diag, calculator_override="Non-Calculator")

    # Perimeter of rectangle (no diagram needed)
    l = rng.randint(4, 30)
    w = rng.randint(3, 25)
    q = f"A rectangle has length {l} cm and width {w} cm. Find the perimeter (cm)."
    correct = 2 * (l + w)
    ans = str(correct)
    wrong = _dedupe_preserve([str(l * w), str(l + w), str(2 * l + w)])[:3]
    expl = f"Perimeter = 2(length + width) = 2({l} + {w}) = {ans}."
    return GenResult("Perimeter", q, ans, wrong, expl, None, calculator_override="Non-Calculator")


def gen_probability(rng: random.Random, difficulty: int) -> GenResult:
    pick = rng.random()

    # Higher-tier: without replacement
    if difficulty >= 4 and pick < 0.75:
        red = rng.randint(4, 10)
        blue = rng.randint(3, 10)
        total = red + blue
        q = (
            f"A bag has {red} red and {blue} blue counters. "
            "Two counters are taken at random without replacement. What is P(both red)?"
        )
        n = red * (red - 1)
        d = total * (total - 1)
        rn, rd = reduce_frac(n, d)
        ans = fmt_frac(rn, rd)
        # Common mistakes:
        # - with replacement: (red/total)^2
        # - one red then one blue
        # - P(not both red)
        wr_n, wr_d = reduce_frac(red * red, total * total)
        rb_n, rb_d = reduce_frac(red * blue, total * (total - 1))
        comp_n, comp_d = reduce_frac(d - n, d)
        wrong = _dedupe_preserve([
            fmt_frac(wr_n, wr_d),
            fmt_frac(rb_n, rb_d),
            fmt_frac(comp_n, comp_d),
            fmt_frac(red, total),
        ])
        expl = (
            f"P(both red) = {red}/{total} × {red-1}/{total-1} = {n}/{d} = {ans}."
        )
        return GenResult("Probability without replacement", q, ans, wrong[:3], expl, None, calculator_override="Non-Calculator")

    # Complementary probability
    if difficulty >= 3 and pick < 0.4:
        red = rng.randint(2, 9)
        blue = rng.randint(2, 9)
        total = red + blue
        q = f"A bag has {red} red and {blue} blue counters. What is P(not red)?"
        ans = fmt_frac(blue, total)
        wrong = _dedupe_preserve([fmt_frac(red, total), fmt_frac(blue + 1, total), fmt_frac(blue, total + 1)])[:3]
        expl = f"P(not red) = P(blue) = number of blue ÷ total = {blue}/{total} = {ans}."
        return GenResult("Complementary probability", q, ans, wrong, expl, None, calculator_override="Non-Calculator")

    # Basic probability
    red = rng.randint(1, 7)
    blue = rng.randint(1, 7)
    total = red + blue
    q = f"A bag has {red} red and {blue} blue counters. What is P(red)?"
    ans = fmt_frac(red, total)
    wrong = _dedupe_preserve([fmt_frac(blue, total), fmt_frac(red + 1, total), fmt_frac(red, total + 1)])[:3]
    expl = f"Probability = favourable ÷ total = {red}/{total} = {ans}."
    return GenResult("Probability of an event", q, ans, wrong, expl, None, calculator_override="Non-Calculator")


def gen_statistics(rng: random.Random, difficulty: int) -> GenResult:
    pick = rng.random()

    # Diagram-based: bar chart reading (must include axis scale!)
    if pick < 0.45:
        labels = ["A", "B", "C", "D", "E"]
        # Keep values within axis labels (0..10 or 0..15) for easy reading.
        values = [rng.randint(2, 10) for _ in labels]
        axis_max, _tick = _nice_axis_max(max(values))
        pick_idx = rng.randrange(len(labels))
        lab = labels[pick_idx]
        val = values[pick_idx]
        q = f"Use the bar chart to find the frequency of category {lab}."
        ans = str(val)
        other_vals = [values[i] for i in range(len(values)) if i != pick_idx]
        rng.shuffle(other_vals)
        wrong_candidates = [
            other_vals[0],
            other_vals[1] if len(other_vals) > 1 else clamp(val + 1, 0, axis_max),
            clamp(val + rng.choice([-2, -1, 1, 2]), 0, axis_max),
            clamp(val + rng.choice([-1, 1]), 0, axis_max),
        ]
        wrong = _dedupe_preserve([str(x) for x in wrong_candidates if int(x) != val])[:3]
        expl = f"Look at bar {lab}. Its top lines up with {val} on the frequency axis, so the frequency is {val}."

        def _diag() -> Tuple[str, str]:
            return svg_bar_chart(labels, values), "Bar chart of frequencies for categories A to E (with axis scale)"

        return GenResult("Interpreting bar charts", q, ans, wrong, expl, _diag, calculator_override="Non-Calculator")

    # Higher-tier stats: mean from a frequency table
    if difficulty >= 4 and pick < 0.75:
        xs = sorted(rng.sample(list(range(10, 41, 2)), 5))
        fs = [rng.randint(1, 7) for _ in xs]
        total_f = sum(fs)
        total_xf = sum(x * f for x, f in zip(xs, fs))
        mean = total_xf / total_f
        q = (
            "A frequency table is shown. Find the mean. Give your answer to 1 d.p.\n"
            + "Values: " + ", ".join(map(str, xs))
            + "\nFrequencies: " + ", ".join(map(str, fs))
        )
        ans = fmt_fixed(mean, 1)
        # Common mistakes (keep plausible / close):
        # - using wrong total frequency
        # - omitting one (x,f) row
        # - using a nearby arithmetic slip
        omit_i = rng.randrange(len(xs))
        xf_omit = total_xf - xs[omit_i] * fs[omit_i]
        f_omit = total_f - fs[omit_i]
        wrong_vals = [
            sum(xs) / len(xs),  # ignored frequencies
            total_xf / (total_f + 1),
            total_xf / (total_f - 1) if total_f > 2 else total_xf / (total_f + 2),
            (xf_omit / f_omit) if f_omit > 0 else mean,
            (total_xf + rng.choice([-xs[0], xs[0], -xs[-1], xs[-1]])) / total_f,
        ]
        wrong = _dedupe_preserve([fmt_fixed(v, 1) for v in wrong_vals if fmt_fixed(v, 1) != ans])[:3]
        expl = f"Mean = Σ(xf) ÷ Σf = {total_xf} ÷ {total_f} = {mean:.3f}…, so to 1 d.p. it is {ans}."
        return GenResult("Mean from frequency table", q, ans, wrong, expl, None, calculator_override="Calculator")

    # Median / range (non-diagram)
    if difficulty <= 3 and pick < 0.8:
        nums = [rng.randint(1, 30) for _ in range(7)]
        nums_sorted = sorted(nums)
        median = nums_sorted[len(nums_sorted) // 2]
        q = f"Find the median of: {', '.join(map(str, nums))}"
        ans = str(median)
        wrong = _dedupe_preserve([str(nums_sorted[0]), str(nums_sorted[-1]), str(sum(nums) // len(nums))])[:3]
        expl = f"Order the numbers. The middle value (4th of 7) is {median}."
        return GenResult("Median", q, ans, wrong, expl, None, calculator_override="Non-Calculator")

    # Mean of 5 numbers
    nums = [rng.randint(7, 35) for _ in range(5)]
    total = sum(nums)
    mean = total / 5
    q = f"Find the mean of: {', '.join(map(str, nums))}. Give your answer to 1 d.p."
    ans = fmt_fixed(mean, 1)
    wrong_vals = [
        total / 4,  # divided by 4 not 5
        total / 6,  # divided by 6 not 5
        float(sorted(nums)[2]),  # median
        (total + rng.choice([-5, 5])) / 5,  # arithmetic slip
    ]
    wrong = _dedupe_preserve([fmt_fixed(v, 1) for v in wrong_vals if fmt_fixed(v, 1) != ans])[:3]
    expl = f"Add the values: total = {total}. Mean = {total} ÷ 5 = {mean:.3f}…, so to 1 d.p. it is {ans}."
    return GenResult("Mean", q, ans, wrong, expl, None, calculator_override="Non-Calculator")


GEN_BY_TOPIC: Dict[str, Callable[[random.Random, int], GenResult]] = {
    "Number": gen_number,
    "Algebra": gen_algebra,
    "Ratio & Proportion": gen_ratio,
    "Geometry & Measures": gen_geometry,
    "Probability": gen_probability,
    "Statistics": gen_statistics,
}


def should_generate_image(images: str, topic: str, diagram_fn: Optional[DiagramFn]) -> bool:
    if images == "none":
        return False
    if images == "all":
        return diagram_fn is not None or topic in IMAGE_TOPICS_AUTO
    # auto
    return diagram_fn is not None and topic in IMAGE_TOPICS_AUTO


def generate_questions(
    *,
    count: int,
    tier: str,
    topics: List[str],
    seed: int | None,
    images: str,
    batch_id: str | None,
    append: bool,
    out_dir: Path,
) -> Tuple[Path, Path, str]:
    out_dir.mkdir(parents=True, exist_ok=True)

    if batch_id is None:
        # Always unique (prevents overwriting when running twice in same second)
        unique_suffix = uuid.uuid4().hex[:8]
        batch_id = f"{time.strftime('%Y%m%d_%H%M%S')}_{unique_suffix}"
        if seed is not None:
            batch_id = f"{batch_id}_seed{seed}"
    batch_root = out_dir / f"batch_{batch_id}"
    images_dir = batch_root / "images"

    csv_path = batch_root / "exam_questions.csv"
    rng = random.Random(seed)
    db_tier = tier_to_db(tier)

    if batch_root.exists() and not append:
        raise SystemExit(
            f"Batch already exists: {batch_root}. Use --append to add more rows, or choose a different --batch-id."
        )
    batch_root.mkdir(parents=True, exist_ok=True)

    rows: List[GeneratedQuestion] = []
    seen_stems: set[str] = set()
    for _ in range(count):
        topic = rng.choice(topics)
        difficulty = pick_difficulty(rng, db_tier)
        # Avoid duplicate stems within the same batch.
        result = None
        for _attempt in range(30):
            candidate = GEN_BY_TOPIC[topic](rng, difficulty)
            sig = f"{topic}|{candidate.question.strip()}"
            if sig not in seen_stems:
                seen_stems.add(sig)
                result = candidate
                break
        if result is None:
            result = GEN_BY_TOPIC[topic](rng, difficulty)

        calculator = result.calculator_override or pick_calculator(rng, difficulty)
        question, correct, wrong, expl, diagram_fn = (
            result.question,
            result.correct_answer,
            result.wrong_answers,
            result.explanation,
            result.diagram_fn,
        )

        qid = str(uuid.uuid4())
        marks = 1 if difficulty <= 3 else rng.choice([1, 2])
        estimated = 45 if difficulty <= 2 else 75 if difficulty == 3 else 105

        image_key = None
        image_alt = None
        if should_generate_image(images, topic, diagram_fn):
            images_dir.mkdir(parents=True, exist_ok=True)
            image_key = f"generated/{batch_id}/{qid}.svg"
            image_path = images_dir / f"{qid}.svg"
            if diagram_fn is not None:
                svg, image_alt = diagram_fn()
            else:
                svg = svg_wrap(
                    [
                        f"{topic} ({db_tier})",
                        question,
                        f"Difficulty: {difficulty} | {calculator}",
                    ]
                )
                image_alt = f"Diagram for {topic} question"
            image_path.write_text(svg, encoding="utf-8")

        norm_wrong = ensure_three_wrong_answers(rng, str(correct), _dedupe_preserve([str(x) for x in wrong]))
        rows.append(
            GeneratedQuestion(
                id=qid,
                question_type=topic,
                tier=db_tier,
                calculator=calculator,
                subtopic=result.subtopic,
                question=question,
                correct_answer=str(correct),
                wrong_answers=norm_wrong,
                marks=marks,
                difficulty=clamp(int(difficulty), 1, 5),
                estimated_time_sec=estimated,
                image_url=image_key,
                image_alt=image_alt,
                explanation=expl,
            )
        )

    write_header = True
    if append and csv_path.exists():
        write_header = False

    with open(csv_path, "a" if append else "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "question_type",
                "tier",
                "calculator",
                "subtopic",
                "question",
                "correct_answer",
                "wrong_answers",
                "marks",
                "difficulty",
                "estimated_time_sec",
                "image_url",
                "image_alt",
                "explanation",
            ],
        )
        if write_header:
            writer.writeheader()
        for r in rows:
            writer.writerow(
                {
                    "id": r.id,
                    "question_type": r.question_type,
                    "tier": r.tier,
                    "calculator": r.calculator,
                    "subtopic": r.subtopic or "",
                    "question": r.question,
                    "correct_answer": r.correct_answer,
                    "wrong_answers": json.dumps(r.wrong_answers, ensure_ascii=False),
                    "marks": str(r.marks),
                    "difficulty": str(r.difficulty),
                    "estimated_time_sec": str(r.estimated_time_sec),
                    "image_url": r.image_url or "",
                    "image_alt": r.image_alt or "",
                    "explanation": r.explanation or "",
                }
            )

    return csv_path, images_dir, batch_id


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate bulk exam_questions CSV + SVG images")
    p.add_argument("--count", type=int, default=200, help="How many questions to generate")
    p.add_argument("--tier", choices=["foundation", "higher"], required=True, help="Tier")
    p.add_argument(
        "--topics",
        default="all",
        help="Comma-separated topics, or 'all'",
    )
    p.add_argument("--seed", type=int, default=None, help="Random seed")
    p.add_argument(
        "--out-dir",
        default=str(Path("supabase") / "data" / "generated"),
        help="Output directory",
    )
    p.add_argument(
        "--images",
        choices=["none", "auto", "all"],
        default="auto",
        help="Image generation mode: none, auto (only diagram-needed), all",
    )
    p.add_argument(
        "--batch-id",
        default=None,
        help="Optional batch id to write into (use with --append to combine runs)",
    )
    p.add_argument(
        "--append",
        action="store_true",
        help="Append rows into an existing batch CSV (requires --batch-id or an existing batch dir)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    topics = TOPICS if args.topics.strip().lower() == "all" else [t.strip() for t in args.topics.split(",") if t.strip()]
    unknown = [t for t in topics if t not in TOPICS]
    if unknown:
        raise SystemExit(f"Unknown topics: {unknown}. Allowed: {TOPICS}")

    csv_path, images_dir, batch_id = generate_questions(
        count=args.count,
        tier=args.tier,
        topics=topics,
        seed=args.seed,
        images=args.images,
        batch_id=args.batch_id,
        append=args.append,
        out_dir=Path(args.out_dir),
    )

    print("Generated batch:")
    print("  batch_id:", batch_id)
    print("  csv:", csv_path)
    print("  images_dir:", images_dir)


if __name__ == "__main__":
    main()
