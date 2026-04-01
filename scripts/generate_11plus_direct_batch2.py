import os
import csv
import json
import uuid

OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "data", "generated", "11plus_direct_gemini_batch2.csv")

questions = [
    # EQUATIONS
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|equations", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "Solve for x: 3x + 5 = 26",
        "correct_answer": "7",
        "wrong_answers": ["11", "9", "2", "21"],
        "explanation": "💡 Key Insight: Use the balance method. Always undo addition or subtraction before attacking the multiplication.\nStep 1: First, isolate the term with x by undoing the + 5. Subtract 5 from both sides.\nStep 2: 3x = 21.\nStep 3: Now, undo the multiplication. Divide both sides by 3.\nStep 4: 21 ÷ 3 = 7. Therefore, x = 7.\nFinal answer: 7."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|equations", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A rectangle has a length of 2x + 4 and a width of x. If the total perimeter is 32cm, what is the precise value of x?",
        "correct_answer": "4",
        "wrong_answers": ["6", "8", "12", "5"],
        "explanation": "💡 Key Insight: You must build an algebraic equation based on the formula for a perimeter: 2 × (Length + Width) = Perimeter.\nStep 1: Add length and width together -> (2x + 4) + x = 3x + 4.\nStep 2: A rectangle has two lengths and two widths, so multiply this by 2 -> 6x + 8.\nStep 3: Set up the equation using the known perimeter -> 6x + 8 = 32.\nStep 4: Subtract 8 from both sides -> 6x = 24.\nStep 5: Divide by 6 -> x = 4.\nFinal answer: 4."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|equations", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "Solve the algebraic equation: 5y - 7 = 3y + 9",
        "correct_answer": "8",
        "wrong_answers": ["1", "16", "2", "6"],
        "explanation": "💡 Key Insight: When variables are on both sides, always eliminate the smallest variable first to keep things positive.\nStep 1: Subtract 3y from both sides to gather all the unknown 'y's on the left.\nStep 2: 2y - 7 = 9.\nStep 3: Add 7 to both sides to isolate the 2y on the left.\nStep 4: 2y = 16.\nStep 5: Divide by 2 -> y = 8.\nFinal answer: 8."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|equations", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 150, "marks": 3,
        "question": "A father is exactly 3 times as old as his son. In exactly 14 years, the father will be exactly twice as old as his son. How old is the son right now?",
        "correct_answer": "14",
        "wrong_answers": ["42", "28", "7", "21"],
        "explanation": "💡 Key Insight: Age word questions are easily solved by setting up a 'Now' equation and a 'Future' equation.\nStep 1: Let the son's current age be 's'. The father is '3s'.\nStep 2: In 14 years, the son will be (s + 14) and the father will be (3s + 14).\nStep 3: Create the future equation. The father will be twice the son's age -> 3s + 14 = 2(s + 14).\nStep 4: Expand the bracket -> 3s + 14 = 2s + 28.\nStep 5: Subtract 2s from both sides -> s + 14 = 28.\nStep 6: Subtract 14 -> s = 14. The son is 14 years old right now.\nFinal answer: 14."
    },

    # AVERAGES
    {
        "track": "11plus", "question_type": "Statistics & Data", "subtopic": "stats|data-handling", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "What is the exact mean average of these five numbers: 12, 17, 9, 21, and 16?",
        "correct_answer": "15",
        "wrong_answers": ["16", "17", "9", "75"],
        "explanation": "💡 Key Insight: The Mean average is the 'fair share'. Add everything together and divide by how many items there are.\nStep 1: Add up the total sum of the five numbers -> 12 + 17 + 9 + 21 + 16 = 75.\nStep 2: Count the numbers. There are 5 separate items.\nStep 3: Divide the total sum by the count -> 75 ÷ 5 = 15.\nFinal answer: 15."
    },
    {
        "track": "11plus", "question_type": "Statistics & Data", "subtopic": "stats|data-handling", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "The mean average weight of 4 different boxes is exactly 12kg. A highly heavy fifth box is added, and the new mean average weight becomes 13kg. What is the weight of the fifth box?",
        "correct_answer": "17kg",
        "wrong_answers": ["13kg", "1kg", "52kg", "15kg"],
        "explanation": "💡 Key Insight: When solving 'missing value' average problems, immediately convert means back into 'total sums'.\nStep 1: Find the original total weight of the 4 boxes -> 4 × 12 = 48kg total.\nStep 2: Find the new total weight of the 5 boxes -> 5 × 13 = 65kg total.\nStep 3: The weight of the 5th box is simply the difference between the two totals.\nStep 4: 65 - 48 = 17kg.\nFinal answer: 17kg."
    },
    {
        "track": "11plus", "question_type": "Statistics & Data", "subtopic": "stats|data-handling", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "A cricket batsman has a mean average of 42 runs after 9 innings. Exactly how many runs must he score in his all-important 10th innings to raise his overall mean average to precisely 45?",
        "correct_answer": "72",
        "wrong_answers": ["45", "3", "378", "75"],
        "explanation": "💡 Key Insight: Use the 'Total Sum' method. Find the total runs required to achieve the new target mean average, and subtract the runs he already has.\nStep 1: Calculate his current total runs across the 9 innings -> 42 × 9 = 378 runs.\nStep 2: Calculate the target total runs required across the 10 innings to average 45 -> 45 × 10 = 450 runs.\nStep 3: Find the difference between what he needs and what he currently has.\nStep 4: 450 - 378 = 72 runs.\nFinal answer: 72."
    },

    # ARITHMETIC / OPERATIONS
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|four-operations", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "A large bulk box of 25 identical premium pencils costs £6.25. How much does one single pencil cost?",
        "correct_answer": "25p",
        "wrong_answers": ["15p", "4p", "2.5p", "40p"],
        "explanation": "💡 Key Insight: Rather than doing long division with decimals, simply convert the pounds directly into pence before you divide.\nStep 1: Convert £6.25 into pence -> 625p.\nStep 2: Divide the total pence by the 25 pencils. 625 ÷ 25.\nStep 3: Let's use mental arithmetic. How many 25s fit in 100? Exactly 4. How many 100s do we have? We have 6. So 4 × 6 = 24. We have one remaining 25. Therefore 24 + 1 = 25.\nFinal answer: 25p."
    },
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|four-operations", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "Calculate exactly, paying strict attention to the order of operations: (24 + 8) ÷ 4² × 10 - 5",
        "correct_answer": "15",
        "wrong_answers": ["10", "45", "-3", "1"],
        "explanation": "💡 Key Insight: Use BIDMAS/BODMAS strictly. Any deviation will lead you explicitly to a trap answer!\nStep 1: Brackets first. (24 + 8) = 32. Our sum is now: 32 ÷ 4² × 10 - 5.\nStep 2: Indices next. 4² is 4 × 4 = 16. Our sum is: 32 ÷ 16 × 10 - 5.\nStep 3: Division and Multiplication next (working directly left to right!). First, 32 ÷ 16 = 2. Then, 2 × 10 = 20.\nStep 4: Subtraction last. 20 - 5 = 15.\nFinal answer: 15."
    },
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|four-operations", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "Sarah buys exactly 3 coffees and 2 teas for £11.40. Mark goes to the same shop and buys exactly 5 coffees and 2 teas for £16.60. How much does a single tea explicitly cost?",
        "correct_answer": "£1.80",
        "wrong_answers": ["£2.60", "£1.60", "£3.60", "£2.40"],
        "explanation": "💡 Key Insight: This is a covert simultaneous equation! Always find the difference between the two orders to find the cost of individual items.\nStep 1: Compare Mark's order to Sarah's order. They bought the exact same number of teas (2). But Mark paid more because he bought an extra 2 coffees (5 - 3 = 2).\nStep 2: Find the price difference -> £16.60 - £11.40 = £5.20.\nStep 3: This tells us two coffees cost £5.20. Therefore, one coffee costs £2.60.\nStep 4: Now drop this coffee price back into Sarah's order. She had 3 coffees. 3 × £2.60 = £7.80.\nStep 5: The rest of her £11.40 bill must be the 2 teas! £11.40 - £7.80 = £3.60 for 2 teas.\nStep 6: One single tea is £3.60 ÷ 2 = £1.80.\nFinal answer: £1.80."
    },

    # PROBABILITY
    {
        "track": "11plus", "question_type": "Statistics & Data", "subtopic": "stats|probability", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "A perfectly fair 6-sided die is rolled. What is the precise probability of rolling a prime number?",
        "correct_answer": "1/2",
        "wrong_answers": ["1/3", "1/6", "4/6", "2/6"],
        "explanation": "💡 Key Insight: The number 1 is formally NOT a prime number. Do not count it!\nStep 1: List out all possible outcomes from rolling a standard die: 1, 2, 3, 4, 5, 6.\nStep 2: Identify the prime numbers. Primes must have exactly two factors. These are 2, 3, and 5. (3 prime outcomes).\nStep 3: Create a fraction of successful outcomes over total outcomes: 3/6.\nStep 4: Always simplify. 3/6 simplifies to 1/2.\nFinal answer: 1/2."
    },
    {
        "track": "11plus", "question_type": "Statistics & Data", "subtopic": "stats|probability", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A velvet bag contains only red, blue, and green tokens. The mathematical probability of picking a red token is exactly 1/4 and picking a blue token is exactly 2/5. If there are exactly 14 green tokens inside, how many tokens are in the bag altogether?",
        "correct_answer": "40",
        "wrong_answers": ["20", "28", "14", "35"],
        "explanation": "💡 Key Insight: In probability, the chance of 'all outcomes combined' always perfectly equals 1 whole.\nStep 1: First, add the fractions for red and blue. 1/4 + 2/5. \nStep 2: Find a common denominator: 20.\nStep 3: (5/20) + (8/20) = 13/20.\nStep 4: The only other color is green. The probability of green must be whatever is left to make a whole 20/20. So the probability of green is 7/20.\nStep 5: We are told there are 14 green tokens. That means 7 parts = 14 tokens. So 1 part = 2 tokens.\nStep 6: The total bag represents 20 parts. 20 × 2 = 40 total tokens.\nFinal answer: 40."
    },
    {
        "track": "11plus", "question_type": "Statistics & Data", "subtopic": "stats|probability", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 150, "marks": 3,
        "question": "Two completely fair, standard 6-sided dice are rolled simultaneously. What is the exact probability that the sum (total added together) of the two numbers rolled is either exactly 8 or exactly 9?",
        "correct_answer": "1/4",
        "wrong_answers": ["1/6", "1/8", "1/5", "1/3"],
        "explanation": "💡 Key Insight: When multiple dice are rolled, systematically list all the successful combinations, because rolling a 4 and a 5 is a different outcome than a 5 and a 4!\nStep 1: Find all combinations making 8: (2,6), (3,5), (4,4), (5,3), (6,2). There are exactly 5 successful ways to get an 8.\nStep 2: Find all combinations making 9: (3,6), (4,5), (5,4), (6,3). There are exactly 4 successful ways to get a 9.\nStep 3: Add them together. 5 + 4 = 9 successful outcomes.\nStep 4: Find the total number of all possible outcomes when rolling two dice -> 6 sides × 6 sides = 36 possible outcomes.\nStep 5: The probability is 9/36. This perfectly simplifies by dividing top and bottom by 9 -> 1/4.\nFinal answer: 1/4."
    },

    # ENGLISH SPAG / GRAMMAR
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|punctuation", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 45, "marks": 1,
        "question": "Which of the following sentences correctly and strictly uses an apostrophe to vividly show plural possession?",
        "correct_answer": "The boys' coats were hung tightly in the cloakroom.",
        "wrong_answers": ["The boy's coats were hung tightly...", "The boys coat's were hung tightly...", "The boys coats' were hung tightly...", "The boys's coats were hung tightly..."],
        "explanation": "💡 Key Insight: When a word is already plural and ends in 's', the possessive apostrophe goes after the 's' without creating an extra 's'.\nStep 1: There are multiple boys, so the base word is 'boys'.\nStep 2: The coats belong to all the boys. This indicates plural possession.\nStep 3: Because 'boys' already ends in 's', we simply add an apostrophe at the end -> boys'.\nFinal answer: The boys' coats were hung tightly in the cloakroom."
    },
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|sentence-structure", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 60, "marks": 2,
        "question": "Read the following collection of words: 'Despite the incredibly heavy rain pouring down relentlessly all afternoon.' What is strictly grammatically incorrect about this?",
        "correct_answer": "It is a subordinate clause lacking a main clause, creating a sentence fragment.",
        "wrong_answers": ["It completely lacks a main verb entirely.", "It contains a terrible comma splice.", "It incorrectly uses passive voice.", "It inappropriately ends with a noun."],
        "explanation": "💡 Key Insight: Sentences beginning with 'Despite' or 'Although' introduce conditions, and must explicitly be followed by a main action describing what happened *despite* that condition.\nStep 1: The conjunction 'Despite' creates a subordinate clause (a dependent clause).\nStep 2: It is missing the main clause—it leaves us hanging. (e.g. 'Despite the rain pouring down, we went for a run').\nStep 3: Even though it has verbs ('pouring'), it fails to express a complete central thought.\nFinal answer: It is a subordinate clause lacking a main clause, creating a sentence fragment."
    },
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|grammar", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 60, "marks": 3,
        "question": "Identify the precise grammatical role of the word 'running' in the following sentence: 'Running is exceptionally good for your cardiovascular health.'",
        "correct_answer": "A gerund acting as the noun subject of the sentence.",
        "wrong_answers": ["A present participle verb representing ongoing action.", "An adjective vividly describing health.", "A preposition linking two different phrases.", "An adverb intensely modifying 'good'."],
        "explanation": "💡 Key Insight: A gerund is explicitly formed by adding '-ing' to a verb, freezing it so it functions completely as a noun.\nStep 1: Although 'running' is typically an action verb, here it doesn't indicate an action being actively done by anyone in the sentence (like 'He is running').\nStep 2: Instead, it names the activity itself. This creates a noun.\nStep 3: It is the main entity being discussed at the start of the sentence, making it the noun subject.\nFinal answer: A gerund acting as the noun subject of the sentence."
    }
]

def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ["id", "question_type", "tier", "calculator", "track", "subtopic", "question", "correct_answer", "wrong_answers", "marks", "difficulty", "estimated_time_sec", "image_url", "image_alt", "explanation"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for q in questions:
            row = {
                "id": str(uuid.uuid4()),
                "question_type": q["question_type"],
                "tier": q["tier"],
                "calculator": q["calculator"],
                "track": q["track"],
                "subtopic": q["subtopic"],
                "question": q["question"],
                "correct_answer": q["correct_answer"],
                "marks": q["marks"],
                "difficulty": q["difficulty"],
                "estimated_time_sec": q["estimated_time_sec"],
                "image_url": "",
                "image_alt": "",
                "explanation": q["explanation"]
            }
            escaped_wrongs = [w.replace('"', '\\"') for w in q["wrong_answers"]]
            row["wrong_answers"] = '{' + ','.join([f'"{w}"' for w in escaped_wrongs]) + '}'
            
            writer.writerow(row)
            
    print(f"✅ Generated {len(questions)} perfect exam-style questions internally. Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
