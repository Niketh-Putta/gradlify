import random

# --- CORE DIFFICULTY ARCHITECTURE (11+ STANDARD) ---
# This engine ensures that Level 3 questions are GENUINELY difficult 
# but still within 11+ curriculum boundaries.

DIFFICULTY_PIPES = {
    1: {
        "label": "Fluency (Level 1)",
        "complexity": "Literal / One-Step",
        "rules": [
            "Direct retrieval from text or simple math operation.",
            "Single-digit arithmetic or common 2nd-year curriculum concepts.",
            "Distractors should be obviously incorrect (numerical errors)."
        ]
    },
    2: {
        "label": "Application (Level 2)",
        "complexity": "Contextual / Two-Step",
        "rules": [
            "Multi-step calculation or simple context clue interpretation.",
            "Standard competitive 11+ content level.",
            "Include at least one 'detail trap' (a number from the question used incorrectly)."
        ]
    },
    3: {
        "label": "Reasoning (Level 3)",
        "complexity": "Synthesis / Abstract / Multi-Step",
        "rules": [
            "Genuinely difficult abstract reasoning or 4+ step math.",
            "Synthesizing two pieces of information (e.g., 'What implies X from paragraph 2 AND 4').",
            "Advanced Traps: Distractors that are logical but unsupported by evidence.",
            "Extreme Distractors: Correct results of a common 'wrong' method (e.g., forgetting to divide at the end)."
        ]
    }
}

def get_difficulty_specs(level: int):
    return DIFFICULTY_PIPES.get(level, DIFFICULTY_PIPES[2])

def inject_level_3_nuance(question: str, explanation: str):
    """Adds markers to Level 3 questions to ensure they maintain the 'Reasoning' threshold."""
    if "[REASONING REQUIRED]" not in explanation:
        explanation = f"[REASONING REQUIRED]\n{explanation}"
    return question, explanation

def get_level_3_trap_types():
    return ["Over-generalization", "Unsupported logic", "False correlation", "Hidden context"]

# --- MATHS GENERATOR HELPERS ---

def validate_math_l3(steps_count: int):
    """Ensures Level 3 math questions have at least 3-4 distinct logical steps."""
    return steps_count >= 3

# --- ENGLISH GENERATOR HELPERS ---

def get_l3_english_stems():
    """Returns stems/verbs for Level 3 English questions."""
    return [
        "What is the underlying motivation behind...",
        "Based on the tone of the second paragraph, we can infer that...",
        "How does the author use the metaphor of [X] to imply [Y]?",
        "Which of the following would THE PASSAGE support as a most likely outcome?"
    ]
