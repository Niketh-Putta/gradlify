#!/usr/bin/env python3
"""Generate a pristine seed set: 1 question per mini-subtopic.

- Reads `supabase/import/gcse_mini_subtopics.json`
- Writes a CSV compatible with `supabase/import/upload_and_insert.py`
- Keeps answers as plain text (NO $...$ and NO LaTeX commands in answers)

Usage:
  python3 supabase/import/seed_one_per_mini_subtopic.py
  python3 supabase/import/seed_one_per_mini_subtopic.py --out supabase/data/generated/batch_seed_one_per_subtopic/exam_questions.csv

Then validate:
  python3 supabase/import/validate_import.py supabase/data/generated/batch_seed_one_per_subtopic/exam_questions.csv

Then push (you do this locally with env vars set):
  python3 supabase/import/upload_and_insert.py supabase/data/generated/batch_seed_one_per_subtopic/exam_questions.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import uuid
from pathlib import Path
from typing import Any, Dict, List

REQUIRED_HEADERS = [
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
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate seed CSV: 1 question per mini-subtopic")
    p.add_argument(
        "--mapping",
        default="supabase/import/gcse_mini_subtopics.json",
        help="Path to mini-subtopics mapping JSON",
    )
    p.add_argument(
        "--out",
        default="supabase/data/generated/batch_seed_one_per_subtopic/exam_questions.csv",
        help="Output CSV path",
    )
    return p.parse_args()


def _ensure_no_answer_latex(s: str) -> None:
    # Answers must NOT contain $ or backslashes (see src/scripts/flagBrokenLatex.ts)
    if "$" in s:
        raise ValueError(f"Answer contains $: {s!r}")
    if "\\" in s:
        raise ValueError(f"Answer contains \\\\: {s!r}")


def _row(
    *,
    topic: str,
    tier: str,
    calculator: str,
    subtopic: str,
    question: str,
    correct: str,
    wrong: List[str],
    explanation: str,
    marks: int = 1,
    difficulty: int = 3,
    time_sec: int = 90,
) -> Dict[str, Any]:
    correct = str(correct).strip()
    wrong = [str(w).strip() for w in wrong]

    if not correct:
        raise ValueError("Missing correct_answer")
    if len(wrong) != 3:
        raise ValueError("wrong_answers must have exactly 3 items")
    if len(set(wrong)) != 3:
        raise ValueError("wrong_answers must be unique")
    if correct in wrong:
        raise ValueError("wrong_answers must not include correct_answer")

    _ensure_no_answer_latex(correct)
    for w in wrong:
        _ensure_no_answer_latex(w)

    # Write wrong_answers as JSON array string (what upload_and_insert expects)
    return {
        "question_type": topic,
        "tier": tier,
        "calculator": calculator,
        "subtopic": subtopic,
        "question": question.strip(),
        "correct_answer": correct,
        "wrong_answers": json.dumps(wrong, ensure_ascii=False),
        "marks": str(int(marks)),
        "difficulty": str(int(difficulty)),
        "estimated_time_sec": str(int(time_sec)),
        "image_url": "",
        "image_alt": "",
        "explanation": explanation.strip(),
    }


def build_seed_rows() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    # NUMBER
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|integers",
            question="Write 5073 correct to the nearest hundred.",
            correct="5100",
            wrong=["5000", "5070", "5700"],
            explanation=(
                "Nearest hundred looks at the tens digit.\n"
                "5073 has hundreds digit 0 and tens digit 7, so round up.\n"
                "Result: 5100."
            ),
            difficulty=2,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|decimals",
            question="Calculate 3.6 + 0.48.",
            correct="4.08",
            wrong=["4.8", "4.18", "3.12"],
            explanation=(
                "Line up decimal points:\n"
                "3.60 + 0.48 = 4.08."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|fractions",
            question="Calculate 3/4 of 20.",
            correct="15",
            wrong=["5", "10", "16"],
            explanation=(
                "Find 1/4 of 20: 20 ÷ 4 = 5.\n"
                "Then 3/4 is 3 × 5 = 15."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|percentages",
            question="Find 15% of 80.",
            correct="12",
            wrong=["8", "15", "68"],
            explanation=(
                "10% of 80 is 8.\n"
                "5% of 80 is half of 10%: 4.\n"
                "So 15% = 10% + 5% = 8 + 4 = 12."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|powers",
            question="Calculate 2^5.",
            correct="32",
            wrong=["10", "16", "64"],
            explanation=(
                "2^5 means 2 multiplied by itself 5 times: 2×2×2×2×2 = 32."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|factors_multiples",
            question="Find the HCF of 18 and 30.",
            correct="6",
            wrong=["3", "9", "12"],
            explanation=(
                "Factors of 18: 1,2,3,6,9,18.\n"
                "Factors of 30: 1,2,3,5,6,10,15,30.\n"
                "Highest common factor is 6."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|hcf_lcm",
            question="Find the LCM of 6 and 8.",
            correct="24",
            wrong=["12", "14", "48"],
            explanation=(
                "List multiples:\n"
                "6: 6, 12, 18, 24, ...\n"
                "8: 8, 16, 24, ...\n"
                "The lowest common multiple is 24."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|negative_numbers",
            question="Calculate −7 + 12.",
            correct="5",
            wrong=["−19", "−5", "19"],
            explanation=(
                "Starting at −7 and adding 12 moves 12 steps to the right on the number line.\n"
                "−7 + 12 = 5."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|bidmas",
            question="Evaluate 3 + 4 × 5.",
            correct="23",
            wrong=["35", "19", "27"],
            explanation=(
                "Multiply first: 4 × 5 = 20.\n"
                "Then add: 3 + 20 = 23."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|rounding_bounds",
            question="A length is 12.3 cm correct to 1 decimal place. What is the lower bound?",
            correct="12.25",
            wrong=["12.2", "12.30", "12.35"],
            explanation=(
                "To 1 decimal place means rounded to the nearest 0.1.\n"
                "Half of 0.1 is 0.05, so bounds are 12.3 ± 0.05.\n"
                "Lower bound = 12.30 − 0.05 = 12.25."
            ),
            difficulty=3,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="number|standard_form",
            question="Write 320000 in standard form.",
            correct="3.2×10^5",
            wrong=["32×10^4", "3.2×10^6", "0.32×10^6"],
            explanation=(
                "Standard form is a×10^n with 1 ≤ a < 10.\n"
                "320000 = 3.2 × 100000 = 3.2×10^5."
            ),
            difficulty=3,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|fractions_decimals_percent",
            question="Convert 3/5 to a percentage.",
            correct="60%",
            wrong=["30%", "40%", "75%"],
            explanation=(
                "3/5 = 0.6 (since 3 ÷ 5 = 0.6).\n"
                "As a percentage: 0.6 × 100 = 60%."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="number|surds",
            question="Simplify √72.",
            correct="6√2",
            wrong=["12√2", "3√8", "9√2"],
            explanation=(
                "72 = 36×2, so √72 = √36 × √2 = 6√2."
            ),
            difficulty=3,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="number|recurring_decimals",
            question="Write 0.333... as a fraction in simplest form.",
            correct="1/3",
            wrong=["3/10", "1/2", "2/3"],
            explanation=(
                "Let x = 0.333...\n"
                "Then 10x = 3.333...\n"
                "Subtract: 10x − x = 3.333... − 0.333... = 3\n"
                "So 9x = 3 ⇒ x = 3/9 = 1/3."
            ),
            difficulty=4,
            time_sec=180,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Number",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="number|unit_conversions",
            question="Convert 2.5 km to metres.",
            correct="2500",
            wrong=["25", "250", "25000"],
            explanation=(
                "1 km = 1000 m.\n"
                "So 2.5 km = 2.5 × 1000 = 2500 m."
            ),
            difficulty=1,
            time_sec=45,
        )
    )

    # ALGEBRA
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|expressions",
            question="Simplify: 3a + 5a − 2a.",
            correct="6a",
            wrong=["10a", "3a", "a"],
            explanation=(
                "Combine like terms: (3 + 5 − 2)a = 6a."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|expand",
            question="Expand: 2(x + 3).",
            correct="2x+6",
            wrong=["2x+3", "x+6", "2x+9"],
            explanation=(
                "Multiply everything in the bracket by 2:\n"
                "2×x = 2x and 2×3 = 6.\n"
                "So 2(x + 3) = 2x + 6."
            ),
            difficulty=1,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|factorise",
            question="Factorise: 6x + 9.",
            correct="3(2x+3)",
            wrong=["6(x+9)", "9(2x+1)", "(3x+3)"],
            explanation=(
                "The common factor of 6x and 9 is 3.\n"
                "6x + 9 = 3(2x + 3)."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|substitution",
            question="If a = 2 and b = −1, find 3a − 2b.",
            correct="8",
            wrong=["4", "6", "10"],
            explanation=(
                "Substitute a = 2 and b = −1:\n"
                "3a − 2b = 3(2) − 2(−1) = 6 + 2 = 8."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|equations",
            question="Solve for x: 5x - 7 = 18",
            correct="5",
            wrong=["3", "4", "6"],
            explanation=(
                "Add 7 to both sides: 5x = 25.\n"
                "Divide by 5: x = 5."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|sequences",
            question="Find the next term in the sequence: 4, 7, 10, 13, ...",
            correct="16",
            wrong=["15", "17", "18"],
            explanation=(
                "The sequence increases by 3 each time.\n"
                "13 + 3 = 16."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|nth_term",
            question="Find the nth term of the sequence 5, 8, 11, 14, ...",
            correct="3n+2",
            wrong=["3n+5", "n+2", "2n+3"],
            explanation=(
                "The common difference is 3, so the sequence is of the form 3n + c.\n"
                "When n = 1, the term is 5, so 3(1) + c = 5 ⇒ c = 2.\n"
                "Nth term is 3n + 2."
            ),
            difficulty=3,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|graphs",
            question="For the function y = 2x + 3, find y when x = 4.",
            correct="11",
            wrong=["10", "12", "14"],
            explanation=(
                "Substitute x = 4 into y = 2x + 3:\n"
                "y = 2(4) + 3 = 8 + 3 = 11."
            ),
            difficulty=1,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|gradients",
            question="Find the gradient of the line through (1, 2) and (5, 10).",
            correct="2",
            wrong=["1/2", "4", "8"],
            explanation=(
                "Gradient = change in y ÷ change in x.\n"
                "= (10 − 2) ÷ (5 − 1) = 8 ÷ 4 = 2."
            ),
            difficulty=3,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="algebra|quadratics",
            question="Factorise: x^2 + 7x + 12.",
            correct="(x+3)(x+4)",
            wrong=["(x+6)(x+2)", "(x-3)(x-4)", "(x+1)(x+12)"],
            explanation=(
                "We need two numbers that multiply to 12 and add to 7: 3 and 4.\n"
                "So x^2 + 7x + 12 = (x+3)(x+4)."
            ),
            difficulty=3,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="algebra|rearranging",
            question="Make x the subject: 3x + 5 = 2y.",
            correct="(2y-5)/3",
            wrong=["(2y+5)/3", "(y-5)/3", "(2y-5)"],
            explanation=(
                "Start with 3x + 5 = 2y.\n"
                "Subtract 5: 3x = 2y − 5.\n"
                "Divide by 3: x = (2y − 5)/3."
            ),
            difficulty=3,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="algebra|simultaneous",
            question="Solve simultaneously: y = x + 1 and y = 3x − 7. Find x.",
            correct="4",
            wrong=["2", "3", "5"],
            explanation=(
                "Set the two expressions for y equal:\n"
                "x + 1 = 3x − 7\n"
                "Add 7: x + 8 = 3x\n"
                "Subtract x: 8 = 2x\n"
                "So x = 4."
            ),
            difficulty=3,
            time_sec=150,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="algebra|inequalities",
            question="Solve: 2x + 1 < 9.",
            correct="x < 4",
            wrong=["x < 5", "x > 4", "x > 5"],
            explanation=(
                "Subtract 1 from both sides: 2x < 8.\n"
                "Divide by 2 (positive so inequality stays the same): x < 4."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Algebra",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="algebra|algebraic_fractions",
            question="Simplify: (6x)/(3).",
            correct="2x",
            wrong=["3x", "x/2", "6x"],
            explanation=(
                "Divide numerator and denominator by 3:\n"
                "(6x)/3 = 2x."
            ),
            difficulty=2,
            time_sec=60,
        )
    )

    # RATIO & PROPORTION
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|ratio",
            question="Simplify the ratio 12:18.",
            correct="2:3",
            wrong=["3:2", "6:9", "4:6"],
            explanation=(
                "The highest common factor of 12 and 18 is 6.\n"
                "12:18 ÷ 6 = 2:3."
            ),
            difficulty=1,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|proportion",
            question="y is directly proportional to x. When x = 5, y = 20. Find y when x = 8.",
            correct="32",
            wrong=["25", "28", "40"],
            explanation=(
                "Direct proportion: y = kx.\n"
                "k = 20/5 = 4.\n"
                "So y = 4×8 = 32."
            ),
            difficulty=3,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|percentage_change",
            question="A price increases from £40 to £46. Find the percentage increase.",
            correct="15%",
            wrong=["6%", "10%", "115%"],
            explanation=(
                "Increase = 46 − 40 = 6.\n"
                "Percentage increase = (6/40)×100 = 15%."
            ),
            difficulty=2,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|ratio_share",
            question="Share £40 in the ratio 3:5.",
            correct="£15 and £25",
            wrong=["£20 and £20", "£10 and £30", "£18 and £22"],
            explanation=(
                "Total parts = 3 + 5 = 8.\n"
                "One part = 40 ÷ 8 = 5.\n"
                "So amounts are 3×5 = 15 and 5×5 = 25."
            ),
            difficulty=3,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Higher Tier",
            calculator="Calculator",
            subtopic="ratio|compound_interest",
            question="£500 is invested at 4% compound interest per year. What is the value after 2 years?",
            correct="540.8",
            wrong=["520", "540", "580"],
            explanation=(
                "Compound interest: Value = 500 × 1.04^2.\n"
                "1.04^2 = 1.0816.\n"
                "500 × 1.0816 = 540.8."
            ),
            difficulty=4,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|rates",
            question="A car travels 150 km in 3 hours. What is the average speed in km/h?",
            correct="50",
            wrong=["45", "53", "150"],
            explanation=(
                "Speed = distance ÷ time = 150 ÷ 3 = 50 km/h."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|speed",
            question="A runner goes 600 m in 150 s. What is the speed in m/s?",
            correct="4",
            wrong=["0.25", "3", "5"],
            explanation=(
                "Speed = distance ÷ time = 600 ÷ 150 = 4 m/s."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|best_buys",
            question="Which is the better buy?\nOption A: 750 g for £3.60\nOption B: 1.2 kg for £5.40\n(Choose the cheaper cost per kg.)",
            correct="Option B",
            wrong=["Option A", "Both the same", "Not enough information"],
            explanation=(
                "Convert both to cost per kg.\n"
                "A: 0.75 kg costs £3.60 → £3.60 ÷ 0.75 = £4.80 per kg.\n"
                "B: 1.2 kg costs £5.40 → £5.40 ÷ 1.2 = £4.50 per kg.\n"
                "Option B is cheaper."
            ),
            difficulty=3,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="ratio|reverse_percentages",
            question="A jacket costs £72 after a 10% discount. What was the original price?",
            correct="80",
            wrong=["79.2", "82", "90"],
            explanation=(
                "After a 10% discount, the price is 90% of the original.\n"
                "So 72 = 0.9 × original.\n"
                "Original = 72 ÷ 0.9 = 80."
            ),
            difficulty=3,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="ratio|growth_decay",
            question="A population of 2000 grows by 5% each year. What is the population after 1 year?",
            correct="2100",
            wrong=["2050", "2150", "2200"],
            explanation=(
                "Increase by 5% means multiply by 1.05.\n"
                "2000 × 1.05 = 2100."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="ratio|direct_inverse",
            question="y is inversely proportional to x. When x = 4, y = 3. Find y when x = 6.",
            correct="2",
            wrong=["4.5", "3.5", "1.5"],
            explanation=(
                "Inverse proportion: y = k/x.\n"
                "k = xy = 4×3 = 12.\n"
                "When x = 6: y = 12/6 = 2."
            ),
            difficulty=4,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Ratio & Proportion",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="ratio|similarity_scale",
            question="Two similar shapes have a linear scale factor of 3. The area of the smaller shape is 12 cm^2. What is the area of the larger shape?",
            correct="108",
            wrong=["36", "48", "72"],
            explanation=(
                "For similar shapes, area scale factor is the square of the linear scale factor.\n"
                "So area factor = 3^2 = 9.\n"
                "Larger area = 12 × 9 = 108 cm^2."
            ),
            difficulty=4,
            time_sec=150,
            marks=2,
        )
    )

    # GEOMETRY & MEASURES
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|shapes",
            question="How many faces does a cube have?",
            correct="6",
            wrong=["4", "8", "12"],
            explanation=(
                "A cube has 6 square faces."
            ),
            difficulty=1,
            time_sec=30,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|perimeter_area",
            question="Find the perimeter of a rectangle that is 8 cm by 3 cm.",
            correct="22",
            wrong=["11", "24", "26"],
            explanation=(
                "Perimeter of a rectangle = 2(length + width).\n"
                "= 2(8 + 3) = 2×11 = 22 cm."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|area_volume",
            question="Find the area of a triangle with base 10 cm and height 6 cm.",
            correct="30",
            wrong=["16", "60", "20"],
            explanation=(
                "Area of triangle = 1/2 × base × height.\n"
                "= 1/2 × 10 × 6 = 30 cm^2."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|angles",
            question="Angles in a straight line add to 180°. If one angle is 68°, what is the other?",
            correct="112",
            wrong=["102", "118", "248"],
            explanation=(
                "Angles on a straight line sum to 180°.\n"
                "Other angle = 180 − 68 = 112°."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|polygons",
            question="Find the sum of the interior angles of a hexagon.",
            correct="720",
            wrong=["540", "900", "1080"],
            explanation=(
                "Sum of interior angles of an n-sided polygon is (n − 2) × 180°.\n"
                "For a hexagon, n = 6: (6 − 2) × 180 = 4 × 180 = 720°."
            ),
            difficulty=3,
            time_sec=120,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="geometry|trigonometry",
            question="In a right-angled triangle, sin(30°) = opposite/hypotenuse. If the hypotenuse is 10, find the opposite side.",
            correct="5",
            wrong=["3", "8", "10"],
            explanation=(
                "sin(30°) = 1/2.\n"
                "So opposite/hypotenuse = 1/2.\n"
                "Opposite = 10 × 1/2 = 5."
            ),
            difficulty=3,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|pythagoras",
            question="A right-angled triangle has legs 6 cm and 8 cm. Find the hypotenuse.",
            correct="10",
            wrong=["12", "14", "7"],
            explanation=(
                "Use Pythagoras: c^2 = 6^2 + 8^2 = 36 + 64 = 100.\n"
                "So c = √100 = 10 cm."
            ),
            difficulty=2,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|circles",
            question="Find the circumference of a circle with radius 7 cm. Give your answer in terms of π.",
            correct="14π",
            wrong=["7π", "49π", "28π"],
            explanation=(
                "Circumference C = 2πr.\n"
                "With r = 7: C = 2π×7 = 14π cm."
            ),
            difficulty=3,
            time_sec=120,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="geometry|arcs_sectors",
            question="A sector has radius 6 cm and angle 90°. Find the arc length in terms of π.",
            correct="3π",
            wrong=["6π", "12π", "9π"],
            explanation=(
                "Arc length = (angle/360) × 2πr.\n"
                "= (90/360) × 2π×6 = (1/4) × 12π = 3π cm."
            ),
            difficulty=4,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|surface_area",
            question="Find the surface area of a cube with side length 4 cm.",
            correct="96",
            wrong=["64", "48", "24"],
            explanation=(
                "A cube has 6 identical square faces.\n"
                "Area of one face = 4×4 = 16 cm^2.\n"
                "Surface area = 6×16 = 96 cm^2."
            ),
            difficulty=3,
            time_sec=120,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|volume",
            question="A cuboid measures 5 cm by 3 cm by 2 cm. Find its volume.",
            correct="30",
            wrong=["10", "15", "60"],
            explanation=(
                "Volume of a cuboid = length × width × height.\n"
                "= 5 × 3 × 2 = 30 cm^3."
            ),
            difficulty=2,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|transformations",
            question="A point (2,3) is translated by the vector (−4, +1). What are the new coordinates?",
            correct="(−2,4)",
            wrong=["(6,2)", "(−2,2)", "(2,4)"],
            explanation=(
                "Add the translation vector to the coordinates:\n"
                "x: 2 + (−4) = −2\n"
                "y: 3 + 1 = 4\n"
                "New point is (−2, 4)."
            ),
            difficulty=3,
            time_sec=120,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|constructions_loci",
            question="What is the locus of points at a fixed distance from a point?",
            correct="A circle",
            wrong=["A straight line", "A triangle", "A rectangle"],
            explanation=(
                "All points the same distance from a single point form a circle."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="geometry|bearings",
            question="A ship travels on a bearing of 090°. What direction is this?",
            correct="East",
            wrong=["North", "South", "West"],
            explanation=(
                "Bearings are measured clockwise from North.\n"
                "090° is a quarter turn clockwise from North, which is East."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="geometry|vectors",
            question="If a = (3,1) and b = (−2,4), find a + b.",
            correct="(1,5)",
            wrong=["(5,3)", "(−1,5)", "(1,−3)"],
            explanation=(
                "Add components: (3 + (−2), 1 + 4) = (1, 5)."
            ),
            difficulty=3,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="geometry|congruence",
            question="Which condition guarantees two triangles are congruent?",
            correct="SSS",
            wrong=["AAA", "SS", "Same area"],
            explanation=(
                "SSS means all three corresponding sides are equal, which guarantees congruence.\n"
                "AAA only guarantees similarity, not congruence."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Geometry & Measures",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="geometry|circle_theorems",
            question="What is the angle in a semicircle?",
            correct="90",
            wrong=["45", "60", "180"],
            explanation=(
                "A key circle theorem: the angle subtended by a diameter at the circumference is 90°."
            ),
            difficulty=2,
            time_sec=60,
        )
    )

    # PROBABILITY
    rows.append(
        _row(
            topic="Probability",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="probability|basic",
            question="A fair six-sided die is rolled. What is the probability of rolling a 5?",
            correct="1/6",
            wrong=["1/5", "5/6", "1/3"],
            explanation=(
                "There are 6 equally likely outcomes and 1 favourable outcome (rolling a 5).\n"
                "Probability = 1/6."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="probability|combined",
            question="A coin is flipped twice. What is the probability of getting two heads?",
            correct="1/4",
            wrong=["1/2", "1/3", "3/4"],
            explanation=(
                "P(H) = 1/2 each flip and the flips are independent.\n"
                "P(HH) = 1/2 × 1/2 = 1/4."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="probability|tree_diagrams",
            question="A bag has 3 red and 2 blue counters. One counter is picked, replaced, then another is picked. What is P(red then blue)?",
            correct="6/25",
            wrong=["3/10", "2/5", "9/25"],
            explanation=(
                "With replacement, probabilities stay the same each time.\n"
                "P(red) = 3/5 and P(blue) = 2/5.\n"
                "P(red then blue) = 3/5 × 2/5 = 6/25."
            ),
            difficulty=3,
            time_sec=150,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="probability|conditional",
            question="In a class, 12 students study French, 8 study German, and 3 study both. A student is chosen at random from those who study French. What is P(German | French)?",
            correct="1/4",
            wrong=["3/20", "3/8", "5/12"],
            explanation=(
                "Conditional probability P(G|F) = number who do both / number who do French.\n"
                "= 3/12 = 1/4."
            ),
            difficulty=4,
            time_sec=180,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="probability|relative_frequency",
            question="A spinner lands on red 18 times out of 60 spins. What is the relative frequency of red?",
            correct="0.3",
            wrong=["0.18", "0.6", "0.7"],
            explanation=(
                "Relative frequency = number of reds ÷ total spins = 18 ÷ 60 = 0.3."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="probability|venn_diagrams",
            question="In a group of 40 students, 22 like tea, 18 like coffee, and 5 like both. How many like neither?",
            correct="5",
            wrong=["0", "10", "15"],
            explanation=(
                "Number who like tea or coffee = 22 + 18 − 5 = 35.\n"
                "Neither = total − (tea or coffee) = 40 − 35 = 5."
            ),
            difficulty=4,
            time_sec=180,
            marks=2,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="probability|expected_frequency",
            question="The probability of rain on a day is 0.2. Over 30 days, what is the expected number of rainy days?",
            correct="6",
            wrong=["5", "10", "15"],
            explanation=(
                "Expected frequency = probability × number of trials = 0.2 × 30 = 6."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="probability|independence",
            question="Events A and B are independent. P(A)=0.6 and P(B)=0.5. Find P(A and B).",
            correct="0.3",
            wrong=["0.1", "0.5", "1.1"],
            explanation=(
                "For independent events, P(A and B) = P(A)×P(B).\n"
                "= 0.6 × 0.5 = 0.3."
            ),
            difficulty=3,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Probability",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="probability|mutually_exclusive",
            question="Events A and B are mutually exclusive. P(A)=0.3 and P(B)=0.4. Find P(A or B).",
            correct="0.7",
            wrong=["0.12", "0.5", "1.2"],
            explanation=(
                "For mutually exclusive events, P(A or B) = P(A) + P(B).\n"
                "= 0.3 + 0.4 = 0.7."
            ),
            difficulty=3,
            time_sec=90,
        )
    )

    # STATISTICS
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|data",
            question="Name one method of data collection.",
            correct="Questionnaire",
            wrong=["Pythagoras", "Factorisation", "Translation"],
            explanation=(
                "Common data collection methods include questionnaires, surveys, and observation."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|sampling",
            question="Which sampling method is least biased?",
            correct="Random sampling",
            wrong=["Convenience sampling", "Volunteer sampling", "Only sampling friends"],
            explanation=(
                "Random sampling gives each member of the population an equal chance of being chosen, reducing bias."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|averages",
            question="Find the mean of 4, 7, 9.",
            correct="20/3",
            wrong=["6", "7", "5"],
            explanation=(
                "Mean = (4 + 7 + 9) ÷ 3 = 20 ÷ 3 = 20/3."
            ),
            difficulty=2,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|spread",
            question="Find the range of the data set 2, 5, 9, 11.",
            correct="9",
            wrong=["11", "7", "6"],
            explanation=(
                "Range = largest − smallest = 11 − 2 = 9."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|charts",
            question="Which chart is best for showing the distribution of a continuous variable grouped into intervals?",
            correct="Histogram",
            wrong=["Pie chart", "Bar chart", "Pictogram"],
            explanation=(
                "Histograms are used for continuous data grouped into class intervals."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|scatter",
            question="A scatter graph shows points trending downwards from left to right. What type of correlation is this?",
            correct="Negative",
            wrong=["Positive", "No correlation", "Causal"],
            explanation=(
                "Downward trend means as x increases, y tends to decrease: negative correlation."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|correlation",
            question="A scatter graph shows points trending upwards from left to right. What type of correlation is this?",
            correct="Positive",
            wrong=["Negative", "No correlation", "Causal"],
            explanation=(
                "Upward trend means as x increases, y tends to increase: positive correlation."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|frequency_tables",
            question="A set of data has frequencies: value 1 occurs 2 times, value 2 occurs 5 times. What is the total number of data values?",
            correct="7",
            wrong=["3", "10", "2"],
            explanation=(
                "Total frequency = 2 + 5 = 7."
            ),
            difficulty=1,
            time_sec=45,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="statistics|histograms",
            question="What does frequency density equal?",
            correct="Frequency ÷ class width",
            wrong=["Class width ÷ frequency", "Frequency × class width", "Frequency + class width"],
            explanation=(
                "In histograms, bar height is frequency density.\n"
                "Frequency density = frequency ÷ class width."
            ),
            difficulty=3,
            time_sec=90,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="statistics|cumulative_frequency",
            question="What is the median position for 51 data values?",
            correct="26",
            wrong=["25", "24", "27"],
            explanation=(
                "Median position = (n + 1)/2.\n"
                "(51 + 1)/2 = 52/2 = 26."
            ),
            difficulty=3,
            time_sec=75,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Higher Tier",
            calculator="Non-Calculator",
            subtopic="statistics|box_plots",
            question="A box plot has lower quartile 12 and upper quartile 20. Find the interquartile range.",
            correct="8",
            wrong=["32", "16", "10"],
            explanation=(
                "Interquartile range = upper quartile − lower quartile = 20 − 12 = 8."
            ),
            difficulty=2,
            time_sec=60,
        )
    )
    rows.append(
        _row(
            topic="Statistics",
            tier="Foundation Tier",
            calculator="Non-Calculator",
            subtopic="statistics|two_way_tables",
            question="In a survey, 30 students like cats, 20 like dogs, and 10 like both. How many like cats only?",
            correct="20",
            wrong=["10", "30", "40"],
            explanation=(
                "Cats only = total cats − both = 30 − 10 = 20."
            ),
            difficulty=3,
            time_sec=120,
        )
    )

    return rows


def main() -> None:
    args = parse_args()
    mapping_path = Path(args.mapping)
    if not mapping_path.exists():
        raise SystemExit(f"Mapping JSON not found: {mapping_path}")

    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    expected_ids = {
        f"{t['topicKey']}|{st['key']}"
        for t in mapping.get("topics", [])
        for st in t.get("subtopics", [])
    }

    rows = build_seed_rows()
    seed_ids = {r["subtopic"] for r in rows}

    missing_questions = sorted(expected_ids - seed_ids)
    extra_questions = sorted(seed_ids - expected_ids)

    if missing_questions:
        raise SystemExit(
            "Missing seed questions for subtopics:\n  "
            + "\n  ".join(missing_questions)
            + "\n\nAdd a question for each missing subtopic before importing."
        )

    if extra_questions:
        raise SystemExit(
            "Seed contains subtopics not present in mapping:\n  "
            + "\n  ".join(extra_questions)
        )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Add a stable-ish id column? The importer doesn't require it, but we keep UUIDs for traceability.
    # We DO NOT include the id column in CSV because validate_import.py expects a fixed header list.

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=REQUIRED_HEADERS)
        w.writeheader()
        for r in rows:
            w.writerow(r)

    print(f"Wrote {len(rows)} rows to: {out_path}")
    print("Next: python3 supabase/import/validate_import.py", out_path)


if __name__ == "__main__":
    main()
