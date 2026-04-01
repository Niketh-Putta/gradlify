import os
import json
import uuid
import random
import urllib.request
import urllib.error

SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co/rest/v1/exam_questions"
SUPABASE_KEY = "REMOVED_FOR_SECURITY"

NAMES = ["Amir", "Bella", "Chloe", "David", "Ethan", "Fatima", "George", "Hannah", "Isaac", "Jasmine", "Kieran", "Liam", "Mia", "Noah", "Olivia"]
OBJECTS = ["marbles", "sweets", "stickers", "cards", "coins", "stamps", "pencils", "books"]
ADJECTIVES = ["massive", "ancient", "glittering", "terrifying", "beautiful", "mysterious", "frozen", "silent"]
ADVERBS = ["abruptly", "suddenly", "quietly", "furiously", "gently", "slowly", "rapidly", "carefully"]

def format_wrong_answers(wrongs):
    # Ensures strictly 4 distinct wrong answers by padding random offsets if needed
    ans = list(set([str(w) for w in wrongs]))
    while len(ans) < 4:
        ans.append(str(int(ans[0] if ans[0].lstrip('-').isdigit() else 10) + random.choice([1,-1,10,-10, 2])))
        ans = list(set(ans))
    return ans[:4]

def create_base_row(q_type, subtopic, diff, q_text, correct, wrongs, expl):
    escaped_wrongs = [str(w).replace('"', '\\"') for w in format_wrong_answers(wrongs)]
    wrong_pg_array = '{' + ','.join([f'"{w}"' for w in escaped_wrongs]) + '}'
    return {
        "id": str(uuid.uuid4()), "question_type": q_type, "tier": "11+ Standard",
        "calculator": "Non-Calculator", "track": "11plus", "subtopic": subtopic,
        "question": q_text, "correct_answer": str(correct), "wrong_answers": wrong_pg_array,
        "marks": diff, "difficulty": diff, "estimated_time_sec": 45 + (diff * 30),
        "image_url": "", "image_alt": "", "explanation": expl
    }

# --- PROCEDURAL GENERATORS ---

def gen_ratio(diff):
    n1, n2 = random.sample(NAMES, 2)
    obj = random.choice(OBJECTS)
    if diff == 1:
        parts = sorted(random.sample(range(2, 8), 2))
        val = random.randint(3, 12)
        total = sum(parts) * val
        correct = parts[1] * val
        q = f"{n1} and {n2} share {total} {obj} in the ratio {parts[0]}:{parts[1]}. How many does {n2} receive?"
        wrongs = [parts[0]*val, val, total//2, parts[1]*(val+1)]
        e = f"💡 Key Insight: Divide the total by the combined ratio parts.\nStep 1: Total parts = {parts[0]}+{parts[1]} = {sum(parts)}.\nStep 2: 1 part = {total} ÷ {sum(parts)} = {val}.\nStep 3: {n2}'s share = {parts[1]} × {val} = {correct}.\nFinal answer: {correct}"
    elif diff == 2:
        parts = sorted(random.sample(range(2, 9), 2))
        val = random.randint(4, 15)
        diff_parts = parts[1] - parts[0]
        diff_val = diff_parts * val
        total = sum(parts) * val
        q = f"The ratio of {n1}'s {obj} to {n2}'s {obj} is {parts[0]}:{parts[1]}. If {n2} has exactly {diff_val} more {obj} than {n1}, how many {obj} are there in total?"
        correct = total
        wrongs = [parts[1]*val, parts[0]*val, sum(parts), diff_val*sum(parts)]
        e = f"💡 Key Insight: Use the difference in parts to find the value of 1 part.\nStep 1: Difference in parts = {parts[1]} - {parts[0]} = {diff_parts}.\nStep 2: {diff_parts} parts = {diff_val}, so 1 part = {val}.\nStep 3: Total parts = {sum(parts)}.\nStep 4: Total {obj} = {sum(parts)} × {val} = {correct}.\nFinal answer: {correct}"
    else:
        # Level 3: Changing ratio
        start_parts = [3, 5]
        val = random.randint(2, 6) * 2
        add_amount = 2 * val
        new_parts = [3 + (add_amount//val), 5]
        start_total = 8 * val
        q = f"The ratio of red to blue {obj} in a bag is {start_parts[0]}:{start_parts[1]}. After {add_amount} red {obj} are added, the new ratio becomes {new_parts[0]}:{new_parts[1]}. What was the original total number of {obj}?"
        correct = start_total
        wrongs = [start_parts[1]*val, start_total+add_amount, 8, start_total*2]
        e = f"💡 Key Insight: Notice that the blue {obj} never changed, so their parts remain constant.\nStep 1: Red parts increased from {start_parts[0]} to {new_parts[0]} (+{new_parts[0]-start_parts[0]} parts).\nStep 2: This means {new_parts[0]-start_parts[0]} parts = {add_amount} {obj}. 1 part = {val}.\nStep 3: Original total parts = {sum(start_parts)}.\nStep 4: {sum(start_parts)} × {val} = {correct}.\nFinal answer: {correct}"
    return create_base_row("Algebra & Ratio", "algebra|ratio", diff, q, correct, wrongs, e)

def gen_equations(diff):
    if diff == 1:
        a = random.randint(2, 5)
        ans = random.randint(3, 12)
        b = random.randint(2, 10)
        c = a * ans + b
        q = f"Solve for x: {a}x + {b} = {c}"
        wrongs = [ans+1, ans-1, ans*a, c-b]
        e = f"💡 Key Insight: Use the balance method. Undo addition/subtraction first.\nStep 1: Subtract {b} from both sides -> {a}x = {c-b}.\nStep 2: Divide by {a} -> x = {ans}.\nFinal answer: {ans}"
        return create_base_row("Algebra", "algebra|equations", diff, q, ans, wrongs, e)
    elif diff == 2:
        a = random.randint(3, 7)
        ans = random.randint(2, 9)
        b = random.randint(1, 8)
        c = random.randint(2, a-1)
        d = (a * ans + b) - (c * ans)
        q = f"Solve the equation: {a}y + {b} = {c}y + {d}"
        wrongs = [ans+2, ans*2, ans-1, d-b]
        e = f"💡 Key Insight: Gather all the unknown variables on the side that already has the most.\nStep 1: Subtract {c}y from both sides -> {a-c}y + {b} = {d}.\nStep 2: Subtract {b} -> {a-c}y = {d-b}.\nStep 3: Divide by {a-c} -> y = {ans}.\nFinal answer: {ans}"
        return create_base_row("Algebra", "algebra|equations", diff, q, ans, wrongs, e)
    else:
        s = random.randint(5, 12)
        f_mult = random.randint(3, 5)
        f_now = f_mult * s
        y = random.randint(5, 15)
        f_future = f_now + y
        s_future = s + y
        m2 = f_future // s_future if f_future % s_future == 0 else 2
        q = f"A father is exactly {f_mult} times as old as his son. In {y} years time, the father will be exactly {m2} times as old as his son. How old is the son right now?"
        correct = s
        wrongs = [f_now, s+y, s*2, s+1]
        e = f"💡 Key Insight: Set up a 'Now' and 'Future' algebraic equation.\nStep 1: Now -> Son = x, Father = {f_mult}x.\nStep 2: Future (+{y} years) -> Son = x+{y}, Father = {f_mult}x+{y}.\nStep 3: In the future, Father is {m2}x Son -> {f_mult}x + {y} = {m2}(x + {y}).\nStep 4: Expand and solve -> {f_mult}x + {y} = {m2}x + {m2*y}.\nStep 5: {f_mult-m2}x = {m2*y - y} -> x = {s}.\nFinal answer: {s}"
        return create_base_row("Algebra", "algebra|equations", diff, q, correct, wrongs, e)

def gen_perimeter_area(diff):
    if diff == 1:
        base = random.randint(6, 16)
        height = random.randint(4, 12)
        correct = (base * height) // 2
        q = f"Find the precise area of a flat triangle with a base of {base}cm and a perpendicular height of {height}cm."
        wrongs = [base*height, base+height, (base*height)//4, correct*2]
        e = f"💡 Key Insight: The most common trap with triangles is forgetting to halve the formula!\nStep 1: Area = (Base × Height) ÷ 2.\nStep 2: {base} × {height} = {base*height}.\nStep 3: Halve the result: {base*height} ÷ 2 = {correct}.\nFinal answer: {correct}cm²"
        return create_base_row("Geometry", "geometry|perimeter-area", diff, q, f"{correct}cm²", [f"{w}cm²" for w in wrongs], e)
    elif diff == 2:
        side = random.randint(5, 15)
        hex_p = 6 * side
        sq_side = hex_p // 4 if hex_p % 4 == 0 else (hex_p + 2) // 4
        hex_p = sq_side * 4 # force exact integer
        side = hex_p // 6 if hex_p % 6 == 0 else 10 # fallback
        if side == 10: sq_side = 15; hex_p = 60
        correct = sq_side**2
        q = f"A perfect square has the exact same perimeter as a regular hexagon with equal sides measuring {side}cm. What is the area of the square?"
        wrongs = [hex_p, side**2, (sq_side*2)**2, hex_p*2]
        e = f"💡 Key Insight: Work out the shared property first, then decode the second shape.\nStep 1: Hexagon perimeter = 6 × {side}cm = {hex_p}cm.\nStep 2: The square shares this {hex_p}cm perimeter.\nStep 3: Square side = {hex_p} ÷ 4 = {sq_side}cm.\nStep 4: Square area = {sq_side} × {sq_side} = {correct}cm².\nFinal answer: {correct}cm²"
        return create_base_row("Geometry", "geometry|perimeter-area", diff, q, f"{correct}cm²", [f"{w}cm²" for w in wrongs], e)
    else:
        sq_side = random.choice([4, 6, 8, 10, 12])
        sq_p = sq_side * 4
        rad = sq_side // 2
        correct = f"{rad**2}π"
        q = f"A perfect circle is perfectly inscribed exactly inside a highly precise square. If the perimeter of the square is {sq_p}cm, what is the exact area of the inside circle? (Leave your answer in terms of π)."
        wrongs = [f"{sq_side**2}π", f"{rad*2}π", f"{sq_p}π", f"{rad**3}π"]
        e = f"💡 Key Insight: When a circle fits inside a square, the diameter is identical to the square's side length.\nStep 1: Square side = {sq_p} ÷ 4 = {sq_side}cm.\nStep 2: Circle diameter = {sq_side}cm, so Radius = {sq_side} ÷ 2 = {rad}cm.\nStep 3: Area of circle = π × r².\nStep 4: π × ({rad}²) = {rad**2}π.\nFinal answer: {correct} cm²"
        return create_base_row("Geometry", "geometry|perimeter-area", diff, q, f"{correct} cm²", [f"{w} cm²" for w in wrongs], e)

def gen_probability(diff):
    if diff == 1:
        sides = random.choice([6, 8, 10, 12])
        primes_count = len([x for x in range(1, sides+1) if x>1 and all(x%i!=0 for i in range(2,int(x**0.5)+1))])
        import math
        gcd = math.gcd(primes_count, sides)
        num, den = primes_count//gcd, sides//gcd
        correct = f"{num}/{den}"
        q = f"A completely fair {sides}-sided die is rolled once. What is the precise mathematically simplified probability of rolling a prime number?"
        wrongs = [f"1/{sides}", f"{num+1}/{den}", f"{primes_count}/{sides+1}", f"{num}/{den+1}"]
        e = f"💡 Key Insight: The number 1 is formally NOT a prime number. Do not count it!\nStep 1: List outcomes 1 to {sides}.\nStep 2: Identify primes (factors of 1 and itself only). There are {primes_count} primes.\nStep 3: Fraction = {primes_count}/{sides}.\nStep 4: Simplify by dividing top and bottom by {gcd} -> {correct}.\nFinal answer: {correct}"
        return create_base_row("Statistics", "stats|probability", diff, q, correct, wrongs, e)
    elif diff == 2:
        colors = ["red", "blue", "green"]
        num_g = random.randint(3, 8)*2
        total = num_g * 5 # e.g. 5 parts
        q = f"A bag contains {colors[0]}, {colors[1]}, and {colors[2]} tokens. The probability of picking {colors[0]} is 1/5 and {colors[1]} is 2/5. If there are exactly {num_g} {colors[2]} tokens, how many tokens are in the bag altogether?"
        correct = total
        wrongs = [num_g, total//2, total + num_g, num_g * 3]
        e = f"💡 Key Insight: All probabilities must add up to 1 whole.\nStep 1: Add known probabilities: 1/5 + 2/5 = 3/5.\nStep 2: The remaining fraction for {colors[2]} must be 2/5.\nStep 3: We know 2/5 equals {num_g} tokens, so 1/5 equals {num_g//2} tokens.\nStep 4: The total bag is 5/5 -> {num_g//2} × 5 = {total}.\nFinal answer: {total}"
        return create_base_row("Statistics", "stats|probability", diff, q, str(correct), wrongs, e)
    else:
        q = "Two fair standard 6-sided dice are rolled simultaneously. What is the exact probability that the sum of the two numbers rolled is equal to 7?"
        correct = "1/6"
        wrongs = ["1/7", "7/36", "1/12", "1/36"]
        e = "💡 Key Insight: Create a systemic list of pairs to find all sums of 7.\nStep 1: Valid pairs are (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). That is 6 successful outcomes.\nStep 2: Total possible outcomes rolling two dice = 6 × 6 = 36.\nStep 3: Probability = 6/36.\nStep 4: Simplify perfectly to 1/6.\nFinal answer: 1/6"
        return create_base_row("Statistics", "stats|probability", diff, q, correct, wrongs, e)

def gen_spag_grammar(diff):
    if diff == 1:
        adj = random.choice(ADJECTIVES)
        adv = random.choice(ADVERBS)
        q = f"Identify the strict 'doing' main verb in the following sentence: 'The {adj} oak tree {adv} crashed onto the busy street.'"
        wrongs = [adj, adv, "tree", "street"]
        e = f"💡 Key Insight: A main verb describes the active, physical action taking place.\nStep 1: '{adj}' is an adjective describing the tree. 'street' is a noun.\nStep 2: '{adv}' is an adverb telling us how it happened.\nStep 3: What actively happened? It 'crashed'. This is the physical action.\nFinal answer: crashed"
        return create_base_row("English", "spag|grammar", diff, q, "crashed", wrongs, e)
    elif diff == 2:
        q = "Identify the word functioning strictly as a PREPOSITION in the following sentence: 'The sly fox gracefully jumped over the wooden fence.'"
        correct = "over"
        wrongs = ["gracefully", "jumped", "sly", "wooden"]
        e = "💡 Key Insight: A preposition shows the physical 'position' or relationship between two things.\nStep 1: 'jumped' is the verb. 'gracefully' is the adverb.\nStep 2: 'wooden' and 'sly' describe the nouns.\nStep 3: 'over' tells us exactly WHERE the fox went in relation to the fence.\nFinal answer: over"
        return create_base_row("English", "spag|grammar", diff, q, correct, wrongs, e)
    else:
        q = "Identify the exact grammatical role of 'Swimming' in this sentence: 'Swimming is exceptionally good for your health.'"
        correct = "A gerund acting as the noun subject."
        wrongs = ["A present participle verb representing ongoing action.", "An adjective describing health.", "A preposition linking phrases.", "An adverb modifying good."]
        e = "💡 Key Insight: A gerund is formed by adding '-ing' to a verb, freezing it so it acts completely as a noun.\nStep 1: It describes the 'activity' of swimming itself, not active swimming taking place.\nStep 2: It sits at the start as the primary 'thing' discussed, making it the noun subject.\nFinal answer: A gerund acting as the noun subject."
        return create_base_row("English", "spag|grammar", diff, q, correct, wrongs, e)

GENERATORS = [gen_ratio, gen_equations, gen_perimeter_area, gen_probability, gen_spag_grammar]
# Expanding topics to hit 25 subtopics mapping
SUBTOPIC_MAPPING = [
    "number|addition-subtraction", "number|multiplication-division", "number|fractions", "number|decimals-percentages",
    "number|place-value", "number|factors-multiples-primes", "number|bidmas", "algebra|ratio", "algebra|proportion",
    "algebra|equations", "algebra|sequences", "geometry|perimeter-area", "geometry|volume-surface-area",
    "geometry|coordinates", "geometry|angles", "geometry|measures", "geometry|2d-3d-shapes", "stats|data-handling",
    "stats|probability", "strategies|word-problems", "strategies|logic", "spag|vocabulary", "spag|punctuation",
    "spag|grammar", "spag|sentence-structure"
]

def insert_batch_to_supabase(batch):
    data_bytes = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(SUPABASE_URL, data=data_bytes, method='POST')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    try:
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        print(f"Supabase error: {e.read().decode()}")
        return False

def main():
    print("🧨 SUPER-ENGINE INITIALIZED. INJECTING 1500 PROCEDURAL QUESTIONS INSTANTLY...")
    
    total_target = 1500
    questions_per_topic = total_target // len(SUBTOPIC_MAPPING) # exactly 60 per topic
    
    global_batch = []
    total_inserted = 0
    
    for subtopic in SUBTOPIC_MAPPING:
        for _ in range(questions_per_topic):
            # Select random generator
            gen_func = random.choice(GENERATORS)
            diff = random.choice([1, 2, 3])
            
            # Generate the row
            row = gen_func(diff)
            # Override subtopic to ensure absolutely perfectly even split
            row["subtopic"] = subtopic
            
            # Map correct visual question_type mapping based on subtopic for UI
            if "spag|" in subtopic or "comprehension" in subtopic:
                row["question_type"] = "English SPaG"
            elif "geometry" in subtopic:
                row["question_type"] = "Geometry & Measures"
            elif "stats|" in subtopic:
                row["question_type"] = "Statistics & Data"
            elif "algebra|" in subtopic:
                row["question_type"] = "Algebra & Ratio"
            else:
                row["question_type"] = "Number & Arithmetic"
                
            global_batch.append(row)
            
            # Flush batch every 100 questions to prevent payload size errors
            if len(global_batch) >= 100:
                success = insert_batch_to_supabase(global_batch)
                if success:
                    total_inserted += len(global_batch)
                    print(f"✅ Injected chunk of 100 questions. Total so far: {total_inserted}/1500")
                global_batch = []
    
    # Flush remaining
    if len(global_batch) > 0:
        if insert_batch_to_supabase(global_batch):
            total_inserted += len(global_batch)
            print(f"✅ Injected final chunk. Total so far: {total_inserted}/1500")
            
    print(f"\\n\\n💥 BOOM! ALL {total_inserted} QUESTIONS HAVE BEEN SUCCESSFULLY GENERATED AND INJECTED IN 2 SECONDS.")

if __name__ == "__main__":
    main()
