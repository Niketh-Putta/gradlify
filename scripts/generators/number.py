import random
import json
import math
from .utils import get_random_name, get_random_item, get_base


def generate_number_questions():
    questions = []
    
    # addition-subtraction
    for i in range(60):
        t = random.randint(1, 5)
        if t == 1:
            a, b = round(random.uniform(10, 100), 2), round(random.uniform(5, 50), 2)
            q, ans = f"Add {a} and {b} together.", str(round(a + b, 2))
            exp = f"[VISUAL: Stack and Fill]\nStep 1: Write both numbers in column format.\nStep 2: Add placeholder zeros if necessary.\nStep 3: {a} + {b} = {ans}.\nFinal answer: {ans}"
        elif t == 2:
            a, b = random.randint(500, 5000), random.randint(100, 499)
            q, ans = f"Subtract {b} from {a}.", str(a - b)
            exp = f"[VISUAL: Column Subtraction]\nStep 1: Write {a} over {b}.\nStep 2: Subtract place by place from the right.\nStep 3: {a} - {b} = {ans}.\nFinal answer: {ans}"
        elif t == 3:
            total = random.randint(50, 200)
            a = random.randint(10, total - 20)
            b = random.randint(10, total - a - 5)
            c = total - a - b
            q = f"{get_random_name()}, {get_random_name()}, and {get_random_name()} have {total} {get_random_item()} in total. The first two have {a} and {b}. How many does the third have?"
            ans = str(c)
            exp = f"[VISUAL: Two-Step Subtraction]\nStep 1: Find the sum of the first two: {a} + {b} = {a+b}.\nStep 2: Subtract this from the overall total of {total}.\nStep 3: {total} - {a+b} = {c}.\nFinal answer: {c}"
        elif t == 4:
            a, b = round(random.uniform(50, 100), 2), round(random.uniform(10, 40), 2)
            q, ans = f"A runner completes a race in {a} seconds. Another runner is {b} seconds faster. What is the second runner's time?", str(round(a - b, 2))
            exp = f"[VISUAL: Word Problem Subtraction]\nStep 1: 'Faster' means less time, so you must subtract.\nStep 2: {a} - {b} = {ans}.\nFinal answer: {ans}"
        else:
            base, gap = random.randint(100, 900), random.randint(10, 50)
            q, ans = f"Find the missing number: {base} + ? = {base + gap}", str(gap)
            exp = f"[VISUAL: Inverse Operations]\nStep 1: Let the missing number be x.\nStep 2: The inverse of addition is subtraction.\nStep 3: Calculate {base + gap} - {base} = {ans}.\nFinal answer: {ans}"
        questions.append(get_base("number|addition-subtraction", q, ans, exp, marks=1))

    # bidmas
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            a, b, c = random.randint(2, 9), random.randint(2, 9), random.randint(2, 9)
            q, ans = f"Calculate the value of: {a} + {b} × {c}", str(a + (b * c))
            exp = f"[VISUAL: BIDMAS]\nStep 1: Multiplication before Addition.\nStep 2: {b} × {c} = {b*c}.\nStep 3: {a} + {b*c} = {ans}.\nFinal answer: {ans}"
        elif t == 2:
            a, b, c = random.randint(10, 30), random.randint(2, 8), random.randint(2, 6)
            q, ans = f"What is the answer to: {a} - ({b} + {c})", str(a - (b + c))
            exp = f"[VISUAL: Brackets First]\nStep 1: Brackets come first.\nStep 2: {b} + {c} = {b+c}.\nStep 3: {a} - {b+c} = {ans}.\nFinal answer: {ans}"
        elif t == 3:
            b, c = random.randint(2, 5), random.randint(2, 5)
            a, d = b * c, random.randint(2, 9)
            q, ans = f"Evaluate: {a} ÷ {b} + {d}²", str((a // b) + (d**2))
            exp = f"[VISUAL: Order of Operations]\nStep 1: Indices first. {d}² = {d**2}.\nStep 2: Division next. {a} ÷ {b} = {a//b}.\nStep 3: Add them up: {a//b} + {d**2} = {ans}.\nFinal answer: {ans}"
        else:
            a, b, c = random.randint(3, 8), random.randint(1, 4), random.randint(2, 6)
            q, ans = f"Calculate: {a} × ({b} + {c})", str(a * (b + c))
            exp = f"[VISUAL: Brackets and Multiply]\nStep 1: Brackets first. {b} + {c} = {b+c}.\nStep 2: Multiply by {a}. {a} × {b+c} = {ans}.\nFinal answer: {ans}"
        questions.append(get_base("number|bidmas", q, ans, exp, diff=3, marks=2))

    # multiplication-division
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            a, b = random.randint(15, 45), random.randint(12, 35)
            q, ans = f"Find the product of {a} and {b}.", str(a * b)
            exp = f"[VISUAL: Long Multiplication]\nStep 1: Multiply {a} by the ones digit of {b}.\nStep 2: Multiply {a} by the tens digit of {b} (add a zero placeholder).\nStep 3: Add results.\nFinal answer: {ans}"
        elif t == 2:
            a, b = random.randint(12, 25), random.randint(120, 300)
            q, ans = f"A shop sells boxes of {a} {get_random_item()}. If a school orders {b} boxes, how many do they get in total?", str(a * b)
            exp = f"[VISUAL: Repeated Addition]\nStep 1: 1 box = {a}.\nStep 2: We need to calculate {b} × {a}.\nFinal answer: {ans}"
        elif t == 3:
            a, c = random.randint(12, 35), random.randint(4, 9)
            b = a * c
            q, ans = f"Divide {b} by {c}.", str(a)
            exp = f"[VISUAL: Bus Stop Division]\nStep 1: Set up bus stop method {b} ÷ {c}.\nStep 2: {b} ÷ {c} = {a}.\nFinal answer: {ans}"
        else:
            cost, count = random.randint(3, 12), random.randint(4, 8)
            q, ans = f"If {count} pens cost £{cost * count}, how much does 1 pen cost?", f"£{cost}"
            exp = f"[VISUAL: Unit Pricing]\nStep 1: Divide total cost by amount. {cost*count} ÷ {count} = {cost}.\nFinal answer: £{cost}"
        questions.append(get_base("number|multiplication-division", q, ans, exp, marks=2))

    # place-value
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            num = random.randint(10000, 99999)
            places = [("tens", -2), ("hundreds", -3), ("thousands", -4)]
            p_name, p_idx = random.choice(places)
            digit = str(num)[p_idx]
            q, ans = f"What is the value of the {digit} in the number {num:,}?", str(int(digit) * (10 ** abs(p_idx + 1)))
            exp = f"[VISUAL: Columns]\nStep 1: Locate the digit {digit}.\nStep 2: It is in the {p_name} column.\nFinal answer: {ans}"
        elif t == 2:
            num = random.randint(10000, 99999)
            q, ans = f"Round {num:,} to the nearest thousand.", f"{round(num, -3):,}"
            exp = f"[VISUAL: Rounding Rules]\nStep 1: Locate thousands column.\nStep 2: Look down to the hundreds. If 5 or more, round UP.\nFinal answer: {ans}"
        elif t == 3:
            num = random.randint(1, 99) * 10
            q, ans = f"What is {num} multiplied by 100?", f"{num * 100:,}"
            exp = f"[VISUAL: Moving Places]\nStep 1: Multiplying by 100 moves all digits 2 places left.\nStep 2: Add two placeholder zeros.\nFinal answer: {ans}"
        else:
            num = random.randint(1, 99) * 100
            q, ans = f"What is {num} divided by 10?", f"{num // 10:,}"
            exp = f"[VISUAL: Moving Places]\nStep 1: Dividing by 10 moves all digits 1 place right.\nStep 2: Remove a zero.\nFinal answer: {ans}"
        questions.append(get_base("number|place-value", q, ans, exp, diff=1, marks=1))

    # factors-multiples-primes
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            primes = [2, 3, 5, 7, 11]
            p1, p2, p3 = random.choice(primes), random.choice(primes), random.choice(primes)
            num = p1 * p2 * p3
            q, ans = f"What is the prime factorization of {num}?", " × ".join(map(str, sorted([p1, p2, p3])))
            exp = f"[VISUAL: Factor Tree]\nStep 1: Break {num} into factors.\nStep 2: Prime branch ends in circles.\nFinal answer: {ans}"
        elif t == 2:
            a, b = random.randint(2, 6) * random.randint(2, 5), random.randint(2, 6) * random.randint(2, 5)
            ans = math.gcd(a, b)
            q = f"Find the Highest Common Factor (HCF) of {a} and {b}."
            exp = f"[VISUAL: Shared Factors]\nStep 1: List factors of {a} and {b}.\nStep 2: The largest shared factor is {ans}.\nFinal answer: {ans}"
        elif t == 3:
            a, b = random.randint(3, 8), random.randint(4, 10)
            ans = (a * b) // math.gcd(a, b)
            q = f"Find the Lowest Common Multiple (LCM) of {a} and {b}."
            exp = f"[VISUAL: Multiple Lists]\nStep 1: List multiples of {a} and {b}.\nStep 2: The first match is {ans}.\nFinal answer: {ans}"
        else:
            start = random.randint(10, 30)
            primes = [x for x in range(start, start+15) if all(x % i != 0 for i in range(2, int(x**0.5)+1))]
            if primes:
                ans = str(primes[0])
                q = f"What is the first prime number after {start-1}?"
                exp = f"[VISUAL: Prime Test]\nStep 1: A prime only divides by 1 and itself.\nStep 2: Test numbers after {start-1}. {ans} is prime.\nFinal answer: {ans}"
            else:
                q, ans = "Is 15 a prime number?", "No"
                exp = "15 is divisible by 3 and 5."
        w_ans = json.dumps(["Yes", "Cannot tell", "Not enough info"]) if ans == "No" else None
        questions.append(get_base("number|factors-multiples-primes", q, str(ans), exp, diff=2, marks=2, wrong_answers=w_ans))

    # decimals-percentages
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            p = random.choice([10, 20, 25, 50, 75])
            val = random.randint(20, 200)
            q, ans = f"Find {p}% of {val}.", str(int((p / 100) * val))
            exp = f"[VISUAL: Percentage Fractions]\nStep 1: {p}% is {p}/100.\nStep 2: Multiply {val} by the fraction. {ans}.\nFinal answer: {ans}"
        elif t == 2:
            n, d = random.choice([(1,4), (3,4), (1,2), (1,5), (2,5), (1,10), (3,10)])
            q, ans = f"Convert {n}/{d} to a decimal.", str(n/d)
            exp = f"[VISUAL: Fraction to Decimal]\nStep 1: Divide {n} by {d}.\nFinal answer: {ans}"
        elif t == 3:
            n, d = random.choice([(1,4), (3,4), (1,2), (1,5), (2,5), (1,10), (3,10)])
            q, ans = f"Convert {n}/{d} to a percentage.", f"{int((n/d)*100)}%"
            exp = f"[VISUAL: Fraction to Percentage]\nStep 1: Multiply fraction by 100.\nFinal answer: {ans}"
        else:
            price = random.randint(40, 120)
            reduction = random.choice([10, 20, 25, 50])
            q, ans = f"A coat originally costs £{price}. It is reduced by {reduction}%. What is the new price?", f"£{int(price * (1 - reduction/100))}"
            exp = f"[VISUAL: Discount]\nStep 1: Find {reduction}% of {price} ({int(price * (reduction/100))}).\nStep 2: Subtract from original: {price} - {int(price * (reduction/100))} = {int(price * (1 - reduction/100))}.\nFinal answer: {ans}"
        questions.append(get_base("number|decimals-percentages", q, str(ans), exp, diff=2, marks=2))

    # fractions
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            n1, d1 = random.randint(1, 3), random.randint(4, 7)
            n2, d2 = random.randint(1, 3), random.randint(4, 7)
            if d1 == d2: d2 += 1
            gcd = math.gcd(n1*d2 + n2*d1, d1*d2)
            ans = f"{(n1*d2 + n2*d1)//gcd}/{(d1*d2)//gcd}"
            q = f"Add {n1}/{d1} and {n2}/{d2}. Simplify your answer."
            exp = f"[VISUAL: Common Denominator]\nStep 1: Common denominator is {d1*d2}.\nStep 2: {n1*d2}/{d1*d2} + {n2*d1}/{d1*d2} = {n1*d2 + n2*d1}/{d1*d2}.\nStep 3: Simplify to {ans}.\nFinal answer: {ans}"
        elif t == 2:
            n1, d1 = random.randint(1, 5), random.randint(2, 6)
            n2, d2 = random.randint(1, 5), random.randint(2, 6)
            gcd = math.gcd(n1*n2, d1*d2)
            ans = f"{(n1*n2)//gcd}/{(d1*d2)//gcd}"
            q = f"Multiply {n1}/{d1} by {n2}/{d2}."
            exp = f"[VISUAL: Straight Multiply]\nStep 1: Multiply numerators: {n1*n2}.\nStep 2: Multiply denominators: {d1*d2}.\nStep 3: Simplify. {ans}.\nFinal answer: {ans}"
        elif t == 3:
            n, d = random.randint(3, 7), random.randint(2, 5)
            q = f"Convert {n + d*random.randint(1,3)}/{d} into a mixed number."
            num = n + d*random.randint(1,3)
            whole = num // d
            rem = num % d
            ans = f"{whole} {rem}/{d}" if rem != 0 else str(whole)
            exp = f"[VISUAL: Improper to Mixed]\nStep 1: How many times does {d} go into {num}? {whole} times.\nStep 2: Remainder is {rem}.\nFinal answer: {ans}"
        else:
            w = random.randint(1, 4)
            n, d = random.randint(1, 4), random.randint(5, 9)
            ans = f"{w*d + n}/{d}"
            q = f"Convert {w} {n}/{d} to an improper fraction."
            exp = f"[VISUAL: Mixed to Improper]\nStep 1: Multiply whole by bottom: {w} × {d} = {w*d}.\nStep 2: Add top: {w*d} + {n} = {w*d+n}.\nStep 3: Put over {d}. {ans}.\nFinal answer: {ans}"
        questions.append(get_base("number|fractions", q, str(ans), exp, diff=3, marks=2))

    return questions
