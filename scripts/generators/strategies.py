import random
import json
from .utils import get_base, get_random_name, get_random_item

def generate_strategies_questions():
    questions = []

    # 1. strategies|logic
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            double = random.randint(10, 40)
            add = random.randint(5, 15)
            ans_val = random.randint(5, 20)
            target = (ans_val * 2) + add
            q = f"{get_random_name()} thinks of a number. He doubles it, adds {add}, and gets {target}. What number did he initially think of?"
            ans = str(ans_val)
            exp = f"[VISUAL: Function Machines]\nStep 1: If a sequence of operations ends up at {target}, we must reverse the machine and work backwards using inverse operations!\nStep 2: The very last thing done was 'add {add}'. The absolute inverse is subtracting {add}: {target} - {add} = {target - add}.\nStep 3: Before that, it was 'doubled' (multiplied by 2). The inverse is to divide by 2.\nStep 4: {(target - add)} ÷ 2 = {ans_val}.\nFinal answer: {ans}"
        elif t == 2:
            num = random.randint(30, 90)
            d = random.randint(2, 6)
            q = f"Which is greater: {d} times {num // d} or half of {num * 2}?"
            ans = "Neither, they are equal"
            exp = f"[VISUAL: Logical Comparison]\nStep 1: Let's break down the logic piece by piece.\nStep 2: Calculate {d} times {num // d}. {d} × {num // d} = {d * (num // d)}.\nStep 3: Calculate half of {num * 2}. ({num * 2}) ÷ 2 = {num}.\nStep 4: Compare them. They both equal exactly {num}, so neither one is strictly greater.\nFinal answer: Neither, they are equal"
        elif t == 3:
            day_gap = random.randint(2, 6)
            q = f"If today is Tuesday, what day of the week will it be in {day_gap + 7} days?"
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            current_index = 1
            ans = days[(current_index + day_gap) % 7]
            exp = f"[VISUAL: Cyclic Patterns]\nStep 1: The days of the week form a cycle of 7 days.\nStep 2: Exactly 7 days from Tuesday is simply another Tuesday.\nStep 3: Therefore, we can ignore the full weeks and only count {day_gap} days forward from Tuesday.\nStep 4: Counting forward {day_gap} consecutive days leads to {ans}.\nFinal answer: {ans}"
        else:
            p1, p2, p3 = get_random_name(), get_random_name(), get_random_name()
            q = f"{p1} is taller than {p2}. {p3} is shorter than {p2}. Who is the tallest?"
            ans = p1
            exp = f"[VISUAL: Ordinal Logic]\nStep 1: Write down relative information like a list.\nStep 2: '{p1} > {p2}'. So {p1} sits above {p2} on our height scale.\nStep 3: '{p3} < {p2}'. So {p3} sits absolutely below {p2}.\nStep 4: Putting it entirely together, we have {p1} > {p2} > {p3}. Clearly, {p1} is at the top.\nFinal answer: {p1}"
        
        w_ans = None
        if t == 2:
            w_ans = json.dumps(["The first is greater", "The second is greater", "Cannot be determined"])
        elif t == 3:
            d_all = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            d_all.remove(ans)
            w_ans = json.dumps(random.sample(d_all, 3))
        elif t == 4:
            w_ans = json.dumps([p2, p3, "Cannot be determined"])
            
        questions.append(get_base("strategies|logic", q, ans, exp, diff=3, marks=2, wrong_answers=w_ans))

    # 2. strategies|word-problems
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            adult_cost = random.randint(7, 12)
            child_cost = random.randint(3, 6)
            adults = random.randint(2, 4)
            children = random.randint(2, 5)
            total = (adult_cost * adults) + (child_cost * children)
            q = f"A cinema ticket costs £{adult_cost} for a full adult and £{child_cost} for a child. How much will it cost completely for {adults} adults and {children} children to go?"
            ans = f"£{total}"
            exp = f"[VISUAL: Decoding Multi-Step Word Problems]\nStep 1: Read and Understand. We require the sum of {adults} adult tickets combined with {children} child tickets.\nStep 2: Choose your methods (Multiply then Add).\nStep 3: Calculate the adult subtotal: {adults} × £{adult_cost} = £{adult_cost * adults}.\nStep 4: Calculate the child subtotal: {children} × £{child_cost} = £{child_cost * children}.\nStep 5: Check your addition: £{adult_cost * adults} + £{child_cost * children} = £{total}.\nFinal answer: {ans}"
        elif t == 2:
            budget = random.randint(20, 50)
            cost = random.randint(3, 8)
            amount = budget // cost
            change = budget % cost
            q = f"{get_random_name()} buys as many chocolate bars completely as they can using £{budget}. If one bar costs exactly £{cost}, how much absolute change will they receive?"
            ans = f"£{change}"
            exp = f"[VISUAL: division and Remainders]\nStep 1: Figure out how many whole chocolate bars fit entirely into £{budget}.\nStep 2: Perform division: {budget} ÷ {cost} = {amount} with a remainder of {change}.\nStep 3: You can purchase exactly {amount} complete bars, leaving you with £{change} left over.\nFinal answer: {ans}"
        elif t == 3:
            init = random.randint(50, 150)
            add = random.randint(15, 45)
            sub = random.randint(20, 60)
            result = init + add - sub
            q = f"A bus starts its morning journey with {init} passengers. At the first stop entirely, {add} people get on and {sub} people get off. Knowing this, how many passengers securely remain directly on the bus?"
            ans = str(result)
            exp = f"[VISUAL: Operational Tracking]\nStep 1: Start tracking the passenger count closely starting directly from {init}.\nStep 2: People getting on entirely increases our total: {init} + {add} = {init + add}.\nStep 3: People getting off directly decreases our total: {init + add} - {sub} = {result}.\nFinal answer: {ans}"
        else:
            w = random.randint(250, 600)
            days = random.randint(4, 7)
            total = w * days
            q = f"A baker efficiently makes exactly {w} loaves of bread every consecutive morning. How many completely full loaves does she make precisely over the span of {days} days?"
            ans = str(total)
            exp = f"[VISUAL: Real-World Multiplication]\nStep 1: 'Every day' highly indicates that we will be using repeated addition or multiplication to aggregate.\nStep 2: Identify the daily rate which is exactly {w} loaves.\nStep 3: Multiply the incredibly accurate daily rate by the number of days entirely: {w} × {days} = {total}.\nFinal answer: {ans}"
        questions.append(get_base("strategies|word-problems", q, ans, exp, diff=2, marks=2))

    return questions
