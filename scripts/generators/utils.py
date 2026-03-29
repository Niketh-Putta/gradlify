import random
import json

NAMES = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Hannah", "Isaac", "Jack", "Katie", "Liam", "Mia", "Noah", "Olivia", "Peter", "Quinn", "Rachel", "Sam", "Tom"]
ITEMS = ["apples", "books", "sweets", "marbles", "stickers", "cards", "pencils", "coins"]

def get_random_name():
    return random.choice(NAMES)

def get_random_item():
    return random.choice(ITEMS)

def format_currency_or_unit(val, correct_str):
    s = str(correct_str)
    if "£" in s: return f"£{val:.2f}" if isinstance(val, float) else f"£{val}"
    if "%" in s: return f"{val}%"
    if "cm" in s: return f"{val}cm"
    if "°" in s: return f"{val}°"
    if "m²" in s: return f"{val}m²"
    if "m" in s and not "m²" in s and not "cm" in s: return f"{val}m"
    if "," in s: return f"{int(val):,}" if val == int(val) else str(val)
    return str(val)

def generate_fraction_wrong(n, d, count):
    distractors = set()
    attempts = 0
    while len(distractors) < count and attempts < 100:
        attempts += 1
        wn = n + random.choice([-1, 1, 2, n])
        wd = d + random.choice([-1, 1, 2, d])
        if wd <= 0: wd = d + 1
        if wn <= 0: wn = 1
        w_frac = f"{wn}/{wd}"
        if w_frac != f"{n}/{d}": distractors.add(w_frac)
        
        # fallback
        if attempts > 50 and len(distractors) < count:
            distractors.add(f"{n + len(distractors)}/{d + 1}")
    return json.dumps(list(distractors)[:count])

def generate_wrong(correct, count=4):
    try:
        val_str = str(correct).replace("£", "").replace("%", "").replace("°", "").replace("cm³", "").replace("cm²", "").replace("m²", "").replace("cm", "").replace("m", "").replace(",", "").replace("$", "").replace("kg", "").replace("g", "").replace("ml", "").replace("l", "").strip()
        
        # Check if fraction
        num_parts = val_str.split("/")
        if len(num_parts) == 2 and ":" not in val_str:
            return generate_fraction_wrong(int(num_parts[0]), int(num_parts[1]), count)
            
        val = float(val_str)
        is_int = (val == int(val))
    except (ValueError, TypeError):
        raise ValueError(f"Cannot auto-generate distractors for non-numerical/non-fraction answer: '{correct}'. You must provide explicit wrong_answers list in the script.")

    distractors = set()
    attempts = 0
    while len(distractors) < count and attempts < 100:
        attempts += 1
        if is_int:
            offset = random.choice([-10, -5, -2, -1, 1, 2, 5, 10, int(val * 0.5), int(val * 2), 100])
            if offset == 0 or offset == val: offset = 3
            wrong = int(val + offset)
            if wrong != correct and wrong > 0:
                distractors.add(format_currency_or_unit(wrong, correct))
        else:
            offset = random.choice([-0.1, 0.1, -1, 1, -0.5, 0.5])
            wrong = round(val + offset, 3)
            if wrong != val and wrong > 0:
                distractors.add(format_currency_or_unit(wrong, correct))
                
        if len(distractors) < count:
            distractors.add(format_currency_or_unit(val + len(distractors) * 2 - 1, correct))
            
    return json.dumps(list(distractors)[:count])

subtopic_diff_tracker = {}

def get_base(subtopic, q, ans, exp, diff=2, marks=1, image_url="", wrong_answers=None):
    subtopic_map = {
        "number": "Number & Arithmetic",
        "algebra": "Algebra & Ratio",
        "geometry": "Geometry & Measures",
        "stats": "Statistics & Data",
        "strategies": "Problem Solving & Strategies"
    }
    
    parent = subtopic.split("|")[0]
    q_type = subtopic_map.get(parent, "Number & Arithmetic")
    
    global subtopic_diff_tracker
    if subtopic not in subtopic_diff_tracker:
        subtopic_diff_tracker[subtopic] = 0
    
    assigned_diff = (subtopic_diff_tracker[subtopic] % 3) + 1
    subtopic_diff_tracker[subtopic] += 1
    
    return {
        "track": "11plus", 
        "question_type": q_type, 
        "subtopic": subtopic,
        "tier": "11+ Standard", 
        "calculator": "Non-Calculator", 
        "question": q, 
        "correct_answer": str(ans),
        "wrong_answers": generate_wrong(ans) if wrong_answers is None else wrong_answers, 
        "marks": marks, 
        "difficulty": assigned_diff,
        "estimated_time_sec": 45, 
        "image_url": image_url, 
        "image_alt": "Diagram", 
        "explanation": exp
    }

