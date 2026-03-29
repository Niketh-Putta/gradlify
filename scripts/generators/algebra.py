import random
import json
from .utils import get_base, get_random_name, get_random_item

def generate_algebra_questions():
    questions = []

    # 1. algebra|basics
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            a, b = random.randint(2, 6), random.randint(3, 8)
            q = f"A number machine multiplies an input by {a} and then adds {b}. If the input is {random.randint(2, 8)}, what is the output?"
            inp = random.randint(2, 8)
            ans = str((inp * a) + b)
            exp = f"[VISUAL: Function Machine]\nStep 1: Input is {inp}. First instruction: Multiply by {a}. {inp} × {a} = {inp*a}.\nStep 2: Second instruction: Add {b}. {inp*a} + {b} = {ans}.\nFinal answer: {ans}"
        elif t == 2:
            coef, const = random.randint(2, 5), random.randint(2, 9)
            x_val = random.randint(1, 6)
            q = f"If x = {x_val}, what is the value of {coef}x - {const}?"
            ans = str(coef * x_val - const)
            exp = f"[VISUAL: Substitution]\nStep 1: Replace x with {x_val}.\nStep 2: Multiply {coef} by {x_val} to get {coef*x_val}.\nStep 3: Subtract {const}. {coef*x_val} - {const} = {ans}.\nFinal answer: {ans}"
        elif t == 3:
            y, add = random.randint(2, 5), random.randint(10, 25)
            q = f"Write an expression for: \"A number y is multiplied by {y} and then {add} is added.\""
            ans = f"{y}y + {add}"
            exp = f"[VISUAL: Writing Expressions]\nStep 1: 'Multiplied by {y}' means written as {y}y.\nStep 2: 'Then {add} is added' means + {add}.\nFinal answer: {ans}"
        else:
            n1 = random.randint(2, 6)
            q = f"Simplify the expression: {n1}a + {random.randint(2, 5)}b - {n1-1}a + {random.randint(1, 3)}b"
            ans_a = n1 - (n1-1)
            b1 = random.randint(2, 5)
            b2 = random.randint(1, 3)
            q = f"Simplify fully: {n1}a + {b1}b - {n1-1}a + {b2}b"
            ans = f"{ans_a}a + {b1+b2}b" if ans_a > 1 else f"a + {b1+b2}b"
            exp = f"[VISUAL: Collecting Like Terms]\nStep 1: Group the 'a' terms: {n1}a - {n1-1}a = {ans_a if ans_a > 1 else ''}a.\nStep 2: Group the 'b' terms: {b1}b + {b2}b = {b1+b2}b.\nStep 3: Combine them.\nFinal answer: {ans}"
        questions.append(get_base("algebra|basics", q, ans, exp, diff=2, marks=1))

    # 2. algebra|equations
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            coef, ans_int = random.randint(2, 6), random.randint(2, 9)
            const = random.randint(3, 15)
            res = coef * ans_int + const
            q = f"Solve for x: {coef}x + {const} = {res}"
            ans = f"x = {ans_int}"
            exp = f"[VISUAL: Balance Method]\nStep 1: Subtract {const} from both sides to isolate the x term. {coef}x = {res - const}.\nStep 2: Divide both sides by {coef} to find a single x. {res - const} ÷ {coef} = {ans_int}.\nFinal answer: {ans}"
        elif t == 2:
            coef, ans_int = random.randint(2, 5), random.randint(2, 7)
            const = random.randint(2, 10)
            res = coef * ans_int - const
            q = f"Find the value of y: {coef}y - {const} = {res}"
            ans = f"y = {ans_int}"
            exp = f"[VISUAL: Balance Method]\nStep 1: Add {const} to both sides to cancel out the subtraction. {coef}y = {res + const}.\nStep 2: Divide both sides by {coef}. {res + const} ÷ {coef} = {ans_int}.\nFinal answer: {ans}"
        elif t == 3:
            ans_int = random.randint(3, 8)
            add = random.randint(4, 12)
            div = random.randint(2, 4)
            res = (ans_int + add) / div
            if res.is_integer():
                q = f"Solve: (z + {add}) ÷ {div} = {int(res)}"
                ans = f"z = {ans_int}"
                exp = f"[VISUAL: Inverse Operations]\nStep 1: Multiply both sides by {div} to remove the fraction. z + {add} = {int(res * div)}.\nStep 2: Subtract {add}. {int(res * div)} - {add} = {ans_int}.\nFinal answer: {ans}"
            else:
                coef, ans_int = 2, random.randint(5, 12)
                const = random.randint(1, 5)
                res = coef * ans_int + const
                q = f"Solve for x: {coef}x + {const} = {res}"
                ans = f"x = {ans_int}"
                exp = f"[VISUAL: Balance Method]\nStep 1: Subtract {const} from both sides. {coef}x = {res - const}.\nStep 2: Divide by {coef}. x = {ans_int}.\nFinal answer: {ans}"
        else:
            cx1, cx2 = random.randint(4, 7), random.randint(1, 3)
            ans_int = random.randint(2, 6)
            c1, c2 = random.randint(2, 10), random.randint(1, 8)
            c2 = (cx1 - cx2)*ans_int + c1
            q = f"Solve the equation: {cx1}x + {c1} = {cx2}x + {c2}"
            ans = f"x = {ans_int}"
            exp = f"[VISUAL: Variables on Both Sides]\nStep 1: Subtract {cx2}x from both sides. {(cx1-cx2)}x + {c1} = {c2}.\nStep 2: Subtract {c1} from both sides. {(cx1-cx2)}x = {c2-c1}.\nStep 3: Divide by {cx1-cx2}. x = {ans_int}.\nFinal answer: {ans}"
        questions.append(get_base("algebra|equations", q, ans, exp, diff=3, marks=2))

    # 3. algebra|proportion
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            amt, cost = random.randint(3, 7), random.randint(2, 5)
            target = random.randint(8, 12)
            total = cost * amt
            q = f"If {amt} notebooks cost £{total}, how much will {target} notebooks cost?"
            ans = f"£{target * cost}"
            exp = f"[VISUAL: Unitary Method]\nStep 1: First find the cost of ONE notebook: £{total} ÷ {amt} = £{cost}.\nStep 2: Now multiply by the required amount ({target}): £{cost} × {target} = £{target * cost}.\nFinal answer: {ans}"
        elif t == 2:
            base_mass = random.choice([200, 300, 400])
            base_people = random.choice([4, 6, 8])
            target_people = random.choice([2, 10, 12])
            target_mass = int((base_mass / base_people) * target_people)
            q = f"A recipe for {base_people} people requires {base_mass}g of flour. How much flour is needed for {target_people} people?"
            ans = f"{target_mass}g"
            exp = f"[VISUAL: Scaling Recipes]\nStep 1: Find the amount needed for 1 person (or a common multiple). {base_mass}g ÷ {base_people} = {base_mass/base_people}g per person.\nStep 2: Multiply by {target_people}. {base_mass/base_people} × {target_people} = {target_mass}g.\nFinal answer: {ans}"
        elif t == 3:
            exchange = random.choice([1.10, 1.20, 1.50])
            amount = random.choice([50, 100, 200])
            q = f"If £1 is worth ${exchange:.2f}, how many dollars will you get for £{amount}?"
            ans = f"${int(amount * exchange)}"
            exp = f"[VISUAL: Exchange Rates]\nStep 1: You have £{amount}. Each pound gives you ${exchange:.2f}.\nStep 2: Multiply {amount} by {exchange:.2f} = {amount * exchange}.\nFinal answer: {ans}"
        else:
            time, distance = random.choice([2, 3, 4]), random.choice([60, 90, 120])
            speed = distance // time
            target_time = random.choice([5, 6, 8])
            q = f"A car travels {distance} miles in {time} hours at a constant speed. How far will it travel in {target_time} hours?"
            ans = f"{speed * target_time} miles"
            exp = f"[VISUAL: Constant Rate]\nStep 1: Find the speed per hour (Unitary method). {distance} ÷ {time} = {speed} mph.\nStep 2: Multiply by the new time. {speed} × {target_time} = {speed * target_time}.\nFinal answer: {ans}"
        questions.append(get_base("algebra|proportion", q, ans, exp, diff=2, marks=2))

    # 4. algebra|ratio
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            p1, p2 = random.randint(2, 5), random.randint(3, 7)
            if p1 == p2: p2 += 1
            multiplier = random.randint(3, 8)
            total = (p1 + p2) * multiplier
            q = f"{get_random_name()} and {get_random_name()} share £{total} in the ratio {p1}:{p2}. How much does the smaller share receive?"
            ans = f"£{min(p1, p2) * multiplier}"
            exp = f"[VISUAL: Sharing in a Ratio]\nStep 1: Calculate total parts. {p1} + {p2} = {p1+p2} parts.\nStep 2: Find the value of 1 part dividing the total amount by parts. £{total} ÷ {p1+p2} = £{multiplier}.\nStep 3: Multiply {min(p1,p2)} parts by £{multiplier} = £{min(p1,p2)*multiplier}.\nFinal answer: {ans}"
        elif t == 2:
            p1, p2 = random.randint(3, 6), random.randint(7, 11)
            multiplier = random.randint(2, 6)
            diff = (p2 - p1) * multiplier
            q = f"The ratio of cats to dogs is {p1}:{p2}. If there are {diff} more dogs than cats, how many cats are there?"
            ans = str(p1 * multiplier)
            exp = f"[VISUAL: Difference in Ratio]\nStep 1: The difference in ratio parts is {p2} - {p1} = {p2-p1} parts.\nStep 2: These {p2-p1} parts represent {diff} animals. So 1 part = {diff} ÷ {p2-p1} = {multiplier}.\nStep 3: The cats have {p1} parts. {p1} × {multiplier} = {p1*multiplier}.\nFinal answer: {ans}"
        elif t == 3:
            p1, p2 = random.choice([(10, 15), (20, 30), (12, 16), (25, 40)])
            from math import gcd
            g = gcd(p1, p2)
            q = f"Simplify the ratio {p1}:{p2} completely."
            ans = f"{p1//g}:{p2//g}"
            exp = f"[VISUAL: Simplifying Ratios]\nStep 1: Find the highest common factor of {p1} and {p2}, which is {g}.\nStep 2: Divide both sides by {g}.\nStep 3: {p1} ÷ {g} = {p1//g}, and {p2} ÷ {g} = {p2//g}.\nFinal answer: {ans}"
        else:
            p1, p2 = random.randint(1, 4), random.randint(2, 5)
            if p1 == p2: p2 += 1
            multiplier = random.randint(4, 10)
            p1_val = p1 * multiplier
            q = f"In a class, the ratio of boys to girls is {p1}:{p2}. If there are {p1_val} boys, how many total students are in the class?"
            ans = str((p1 + p2) * multiplier)
            exp = f"[VISUAL: Using One Part of a Ratio]\nStep 1: The boys represent {p1} parts of the ratio, which equals {p1_val} students.\nStep 2: Value of 1 part = {p1_val} ÷ {p1} = {multiplier}.\nStep 3: Total parts = {p1} + {p2} = {p1+p2}. Total students = {p1+p2} × {multiplier} = {(p1+p2)*multiplier}.\nFinal answer: {ans}"
        questions.append(get_base("algebra|ratio", q, ans, exp, diff=3, marks=2))

    # 5. algebra|sequences
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            m = random.randint(3, 8)
            add = random.randint(1, 5)
            s = [m*1+add, m*2+add, m*3+add, m*4+add]
            q = f"Find the nth term rule for this sequence: {s[0]}, {s[1]}, {s[2]}, {s[3]}, ..."
            ans = f"{m}n + {add}"
            exp = f"[VISUAL: Nth Term Rule]\nStep 1: Find the common difference. It is +{m}, so the rule begins with {m}n.\nStep 2: Compare the {m} times table to the sequence. Difference is +{add}.\nFinal rule: {ans}"
        elif t == 2:
            m = random.randint(2, 6)
            sub = random.randint(1, 4)
            s = [m*1-sub, m*2-sub, m*3-sub, m*4-sub]
            q = f"A sequence has the rule '{m}n - {sub}'. What is the 10th term in the sequence?"
            ans = str(m*10 - sub)
            exp = f"[VISUAL: Using Nth Term Rules]\nStep 1: Substitute n = 10 into the rule {m}n - {sub}.\nStep 2: {m} × 10 - {sub} = {m*10} - {sub} = {ans}.\nFinal answer: {ans}"
        elif t == 3:
            s1, s2 = random.randint(2, 5), random.randint(5, 10)
            diff1 = s2 - s1
            s3 = s2 + diff1 + random.randint(1, 3)
            diff2 = s3 - s2
            s4 = s3 + diff2 + random.randint(1, 3)
            diff3 = s4 - s3
            s5 = s4 + diff3 + random.randint(1, 3)
            q = f"Look at the differences to find the next number in this sequence: {s1}, {s2}, {s3}, {s4}, ..."
            ans = str(s5)
            exp = f"[VISUAL: Second Differences]\nStep 1: Calculate the gaps: {diff1}, {diff2}, {diff3}.\nStep 2: Identify the pattern in the gaps. The next gap is {s5 - s4}.\nStep 3: {s4} + {(s5 - s4)} = {ans}.\nFinal answer: {ans}"
        else:
            m = random.choice([-2, -3, -4, -5])
            add = random.randint(20, 50)
            s = [m*1+add, m*2+add, m*3+add, m*4+add]
            q = f"The sequence is descending: {s[0]}, {s[1]}, {s[2]}, {s[3]}, ... What is the nth term rule?"
            ans_str = f"{add + m} - {abs(m)}n" if (add+m)>0 else f"{m}n + {add}"
            ans = f"{m}n + {add}" # standardize
            exp = f"[VISUAL: Descending Sequence]\nStep 1: The difference is {m}. The rule starts with {m}n.\nStep 2: Look at the 0th term (term before the first). {s[0]} + {abs(m)} = {add}.\nFinal answer: {ans}"
        questions.append(get_base("algebra|sequences", q, ans, exp, diff=3, marks=2))

    return questions
