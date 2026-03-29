import random
import json
from .utils import get_base

def generate_stats_questions():
    questions = []

    # 1. stats|charts-graphs
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            sections = random.choice([(90, 4), (120, 3), (180, 2), (72, 5)])
            q = f"In a pie chart, if the 'Blue' section has an angle of {sections[0]}°, what fraction of the whole survey does it represent?"
            ans = f"1/{sections[1]}"
            exp = f"[VISUAL: Pie Charts - Fractions]\nStep 1: A full pie chart operates in a complete circle, which is always 360°.\nStep 2: The Blue section takes up {sections[0]}° out of the total 360°.\nStep 3: Write this out as a fraction: {sections[0]}/360.\nStep 4: Simplify the fraction by dividing the top and bottom by {sections[0]}.\nFinal answer: {ans}"
        elif t == 2:
            total = random.choice([40, 60, 80, 100, 120])
            frac = random.choice([2, 4, 10])
            angle = 360 // frac
            val = total // frac
            q = f"In a survey of {total} people, a section representing '{val}' people is drawn on a pie chart. What angle should this section have?"
            ans = f"{angle}°"
            exp = f"[VISUAL: Pie Charts - Angles]\nStep 1: First find the value of 1 person.\nStep 2: Divide the total angle of a pie chart by the total number of people.\nStep 3: 360° ÷ {total} = {360//total}° per person.\nStep 4: The section represents {val} people, so multiply {val} by {360//total}°.\nFinal answer: {ans}"
        elif t == 3:
            scale = random.choice([5, 10, 20])
            blocks = random.randint(2, 6)
            total = scale * blocks
            q = f"A bar chart represents 'Number of Cars'. If the vertical axis goes up in steps of {scale}, what value does a bar spanning {blocks} full blocks represent?"
            ans = str(total)
            exp = f"[VISUAL: Creating Bar Charts]\nStep 1: Identify the scale of the axis.\nStep 2: Each block on the graph represents exactly {scale} units.\nStep 3: If a bar spans 5 full blocks, it represents the value {scale} × {blocks}.\nStep 4: {scale} × {blocks} = {total}.\nFinal answer: {ans}"
        else:
            q = "What kind of data representation should you use to map changes over time, such as temperature variations throughout the month?"
            ans = "Line Graph"
            exp = "[VISUAL: Chart Selection]\nStep 1: Line graphs are created by plotting lines joining separate data points.\nStep 2: Time spans (days, months, years) map perfectly to line graphs to show upward or downward continuous trends.\nStep 3: Bar charts are for distinct categories, whereas Line graphs are for continuous intervals.\nFinal answer: Line Graph"
        questions.append(get_base("stats|charts-graphs", q, ans, exp, diff=2, marks=2))

    # 2. stats|data-handling
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            average = random.randint(5, 12)
            c1, c2, c3, c4 = random.randint(2, 10), random.randint(2, 10), random.randint(2, 10), random.randint(2, 10)
            missing = (average * 5) - (c1 + c2 + c3 + c4)
            q = f"The mean of five numbers is {average}. Four of the numbers are {c1}, {c2}, {c3}, and {c4}. What is the fifth missing number?"
            ans = str(missing)
            exp = f"[VISUAL: The Mean (Averages)]\nStep 1: The 'Mean' is the fair share.\nStep 2: If 5 numbers average out to {average}, the total sum of all the numbers MUST be 5 × {average} = {average*5}.\nStep 3: Add up the four numbers you already know: {c1} + {c2} + {c3} + {c4} = {c1+c2+c3+c4}.\nStep 4: Subtract that sum from the overall total: {average*5} - {c1+c2+c3+c4} = {missing}.\nThe missing fifth number is {missing}."
        elif t == 2:
            nums = sorted([random.randint(1, 20) for _ in range(5)])
            shuffled = nums.copy()
            random.shuffle(shuffled)
            med = nums[2]
            q = f"What is the median of these numbers: {', '.join(map(str, shuffled))}?"
            ans = str(med)
            exp = f"[VISUAL: The 3 M's (Median)]\nStep 1: The word 'Median' sounds like 'Medium' or 'Middle'.\nStep 2: The very first rule of finding a median is rewriting the list in order, from smallest to largest.\nStep 3: Reordered list: {', '.join(map(str, nums))}.\nStep 4: Cross them off one by one from both ends until you find the single number exactly in the middle.\nFinal answer: {med}."
        elif t == 3:
            base = random.randint(20, 50)
            range_val = random.randint(10, 30)
            highest = base + range_val
            nums = [base, highest, random.randint(base+1, highest-1)]
            random.shuffle(nums)
            q = f"Calculate the range of these given values: {', '.join(map(str, nums))}."
            ans = str(range_val)
            exp = f"[VISUAL: Data Properties]\nStep 1: The 'range' tells us how spread out a set of data is.\nStep 2: The formula for calculating Range is exactly: Highest Value − Lowest Value.\nStep 3: Locate the highest ({highest}) and the lowest ({base}) limits in the sequence.\nStep 4: Subtract {base} from {highest} = {range_val}.\nFinal answer: {ans}."
        else:
            n = random.randint(3, 9)
            nums = [random.randint(2, 15) for _ in range(5)]
            nums.extend([n, n, n])
            random.shuffle(nums)
            q = f"Identify the mode in this set of numbers: {', '.join(map(str, nums))}."
            ans = str(n)
            exp = f"[VISUAL: The 3 M's (Mode)]\nStep 1: The word 'Mode' sounds like 'Most'.\nStep 2: We are looking for the number that occurs the most frequently in the entire data set.\nStep 3: Count out the frequencies. You can see that {n} appears significantly more than the others.\nFinal answer: {ans}."
        questions.append(get_base("stats|data-handling", q, ans, exp, diff=2, marks=1))

    # 3. stats|probability
    for i in range(60):
        t = random.randint(1, 3)
        if t == 1:
            r = random.randint(2, 5)
            b = random.randint(3, 6)
            g = random.randint(1, 4)
            total = r + b + g
            q = f"I have a bag containing {r} red balls, {b} blue balls, and {g} green balls. What is the probability of picking a blue ball?"
            ans = f"{b}/{total}"
            exp = f"[VISUAL: Probability Scales]\nStep 1: Find the absolute total number of items inside the probability space.\nStep 2: Total = {r} + {b} + {g} = {total} balls entirely.\nStep 3: Find how many represent a 'success' outcome (the blue balls). There are {b} blue balls.\nStep 4: Write this outcome as a fraction over the total: {b}/{total}. Always simplify if applicable!\nFinal answer: {ans}."
            import math
            gcd = math.gcd(b, total)
            if gcd > 1:
                ans = f"{b//gcd}/{total//gcd}"
                exp += f"\nStep 5: Simplify: {ans}."
                questions.append(get_base("stats|probability", q, ans, exp, diff=2, marks=2))
                continue
        elif t == 2:
            letters = ["M", "A", "T", "H", "E", "M", "A", "T", "I", "C", "S"]
            word = "".join(letters)
            target = random.choice(["M", "A", "T"])
            count = letters.count(target)
            q = f"A letter is chosen at random from the word '{word}'. What is the probability of choosing the letter '{target}'?"
            ans = f"{count}/{len(letters)}"
            exp = f"[VISUAL: Letter Probability]\nStep 1: Count the total number of letters in the word '{word}'. There are {len(letters)} letters entirely.\nStep 2: Identify your target outcome, the letter '{target}'.\nStep 3: Count the occurrences of '{target}'. It appears {count} times.\nStep 4: Form the probability fraction: Frequency / Total. The fraction is {count}/{len(letters)}.\nFinal answer: {ans}"
        else:
            p_win = round(random.uniform(0.1, 0.4), 2)
            q = f"The probability of a football team winning their match is {p_win:.2f}. The probability of drawing is 0.20. What is the probability of them losing?"
            losing = round(1 - p_win - 0.20, 2)
            ans = f"{losing:.2f}"
            exp = f"[VISUAL: Mutually Exclusive Odds]\nStep 1: An event MUST have an outcome. A team will either win, draw, or lose.\nStep 2: The sum of probabilities for all mutually exclusive events always perfectly adds up to 1 (or 100%).\nStep 3: Add the known probabilities: {p_win} + 0.20 = {p_win + 0.20}.\nStep 4: Subtract that sum from 1: 1 - {p_win + 0.20} = {losing}.\nFinal answer: {ans}"
        questions.append(get_base("stats|probability", q, ans, exp, diff=2, marks=2))

    return questions
