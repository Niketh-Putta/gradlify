import os
import csv
import json
import uuid
import urllib.request
import urllib.error

SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co/rest/v1/exam_questions"
SUPABASE_KEY = "REMOVED_FOR_SECURITY"

questions = [
    # FRACTIONS
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|fractions", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "Calculate the exact total of 1 1/4 + 2 1/8",
        "correct_answer": "3 3/8",
        "wrong_answers": ["4 2/12", "3 2/8", "3 1/4", "3 2/12"],
        "explanation": "💡 Key Insight: You must find a common denominator for the fractions before adding them.\nStep 1: Convert 1/4 into eighths. Because 4 × 2 = 8, multiply the top number by 2 as well: 1/4 = 2/8.\nStep 2: Add the whole numbers: 1 + 2 = 3.\nStep 3: Add the fractions: 2/8 + 1/8 = 3/8.\nStep 4: Combine the whole numbers and fractions: 3 3/8.\nFinal answer: 3 3/8."
    },
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|fractions", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A massive industrial water tank is exactly 1/3 full. After exactly 25 litres of water are poured inside it, the tank becomes exactly 3/4 full. What is the total capacity of the tank when it is completely full?",
        "correct_answer": "60 litres",
        "wrong_answers": ["75 litres", "50 litres", "100 litres", "80 litres"],
        "explanation": "💡 Key Insight: Find out what fraction of the tank the 25 litres fills by subtracting the original fraction from the new fraction.\nStep 1: We need a common denominator for 1/3 and 3/4. Both 3 and 4 fit into 12. \nStep 2: Convert fractions: 1/3 becomes 4/12. And 3/4 becomes 9/12.\nStep 3: Find the difference: 9/12 - 4/12 = 5/12. So, the 25 litres filled up exactly 5/12 of the tank.\nStep 4: If 5 parts equal 25 litres, then 1 part equals 5 litres (25 ÷ 5).\nStep 5: The total tank is 12 parts. So, 12 × 5 = 60 litres.\nFinal answer: 60 litres."
    },
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|fractions", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "John has £60 in birthday money. He spends exactly 1/4 of his money on an incredibly expensive video game. He then spends exactly 1/3 of his REMAINING money on a hardback book. Exactly how much money does he have left in his wallet?",
        "correct_answer": "£30",
        "wrong_answers": ["£25", "£15", "£35", "£20"],
        "explanation": "💡 Key Insight: Be very careful! The second fraction (1/3) relies on the 'remaining' amount, not the original £60.\nStep 1: First, calculate the cost of the video game. 1/4 of £60 = £15.\nStep 2: Find his 'remaining' money after buying the game. £60 - £15 = £45 left.\nStep 3: Now, calculate the book cost. He spends 1/3 of £45. 1/3 of 45 is £15.\nStep 4: Find his final amount left over by subtracting the book cost from his remaining money. £45 - £15 = £30.\nFinal answer: £30."
    },

    # COORDINATE GEOMETRY
    {
        "track": "11plus", "question_type": "Geometry & Measures", "subtopic": "geometry|coordinates", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "A perfect rectangle is plotted on a coordinate grid. Three of its corner vertices are located at (1,2), (5,2), and (5,7). What are the exact coordinates of the missing fourth corner vertex?",
        "correct_answer": "(1,7)",
        "wrong_answers": ["(7,1)", "(5,1)", "(2,7)", "(1,5)"],
        "explanation": "💡 Key Insight: In a perfect rectangle lined up with the grid, opposite corners share x and y coordinates.\nStep 1: The bottom edge is on the line y=2 (spanning from x=1 to x=5).\nStep 2: The right edge is on the line x=5 (spanning from y=2 to y=7).\nStep 3: To form a rectangle, the missing top-left corner must align directly above the bottom-left point at x=1, and across from the top-right point at y=7.\nStep 4: Putting the x and y coordinates together gives (1,7).\nFinal answer: (1,7)."
    },
    {
        "track": "11plus", "question_type": "Geometry & Measures", "subtopic": "geometry|coordinates", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A square is secretly translated exactly 4 units left and 2 units up across the grid. Its newly translated top-left corner is now located exactly at (1, 5). Where was the original top-left corner placed before the translation?",
        "correct_answer": "(5, 3)",
        "wrong_answers": ["(3, 7)", "(-3, 3)", "(-3, 7)", "(5, 7)"],
        "explanation": "💡 Key Insight: To find an 'original' position, you must do the exact opposite (inverse) of the translation stated.\nStep 1: The shape was moved 4 units left. The opposite of moving left is moving right. So, we add 4 to the x-coordinate.\nStep 2: The x-coordinate was 1. 1 + 4 = 5.\nStep 3: The shape was moved 2 units up. The opposite of moving up is moving down. So, we subtract 2 from the y-coordinate.\nStep 4: The y-coordinate was 5. 5 - 2 = 3.\nStep 5: The original location was (5, 3).\nFinal answer: (5, 3)."
    },
    {
        "track": "11plus", "question_type": "Geometry & Measures", "subtopic": "geometry|coordinates", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "The points (2,3) and (8,3) form the flat bottom base of a beautifully symmetrical isosceles triangle. If the triangle has a total area of exactly 12 square units, what are the exact coordinates of the third top vertex (assuming it sits directly above the base)?",
        "correct_answer": "(5, 7)",
        "wrong_answers": ["(5, 4)", "(6, 7)", "(4, 7)", "(5, 12)"],
        "explanation": "💡 Key Insight: Use the triangle area formula (Base × Height ÷ 2) backwards to find the hidden vertical height of the triangle first.\nStep 1: Find the length of the base. The points go from x=2 to x=8, which means the base is 6 units long.\nStep 2: Reverse the area formula. If Area = (Base × Height)/2, then 12 = (6 × Height)/2. \nStep 3: 12 = 3 × Height. Height = 4. The triangle is exactly 4 units tall.\nStep 4: Because it is a perfectly symmetrical isosceles triangle, the top point must be precisely halfway between the two base points on the x-axis. The halfway point between 2 and 8 is 5 (x=5).\nStep 5: The base sits on the y=3 line. We go straight up by our height of 4 units: 3 + 4 = 7. \nStep 6: Therefore, the topmost point is at (5, 7).\nFinal answer: (5, 7)."
    },

    # SEQUENCES
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|sequences", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 45, "marks": 1,
        "question": "Identify the next number in this linear sequence: 7, 13, 19, 25, ___",
        "correct_answer": "31",
        "wrong_answers": ["33", "30", "32", "29"],
        "explanation": "💡 Key Insight: For linear sequences, always find the jump (difference) between the first two consecutive numbers to find the pattern.\nStep 1: Look at the jump from 7 to 13. The number increases by 6 (+6).\nStep 2: Check if this pattern holds. 13 to 19 is (+6). 19 to 25 is (+6).\nStep 3: To find the missing number, simply add 6 to the final number in the list. 25 + 6 = 31.\nFinal answer: 31."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|sequences", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A mysterious number sequence follows a strict rule: 'multiply the previous term by exactly 2, and then subtract exactly 3'. If the absolutely verified third term in the sequence is 17, what was the first original term?",
        "correct_answer": "6.5",
        "wrong_answers": ["8.5", "5", "10", "7.5"],
        "explanation": "💡 Key Insight: When given a later term and a rule, you must do the exact opposite sequence of operations to walk backwards to the start.\nStep 1: The forward rule is: 'x 2, then - 3'. So the backward rule must be: 'Start by ADDING 3, then DIVIDING by 2'.\nStep 2: The third term is 17. Let's find the second term using our backward rule. 17 + 3 = 20. 20 ÷ 2 = 10. The second term is 10.\nStep 3: Let's use the backward rule on 10 to find the very first term. 10 + 3 = 13. 13 ÷ 2 = 6.5.\nStep 4: To double-check, run 6.5 through the forward rule! (6.5 x 2 = 13. 13 - 3 = 10). Perfect.\nFinal answer: 6.5."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|sequences", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "The nth term of a terrifying complex sequence is given by the formula: 3n² - 5. What is the precise, exact total sum calculated if you add the 3rd term and the 5th term together?",
        "correct_answer": "92",
        "wrong_answers": ["170", "44", "102", "88"],
        "explanation": "💡 Key Insight: The 'n' in nth-term simply means 'position'. Remember BIDMAS: you must ALWAYS square the position number before multiplying by 3!\nStep 1: Find the 3rd term by actively substituting n=3. Square it first! (3² = 9). Multiply by 3 (3 × 9 = 27). Subtract 5 (27 - 5 = 22).\nStep 2: Find the 5th term by substituting n=5. Square it first! (5² = 25). Multiply by 3 (3 × 25 = 75). Subtract 5 (75 - 5 = 70).\nStep 3: Add the two precise answers together exactly as instructed: 22 + 70 = 92.\nFinal answer: 92."
    },

    # ENGLISH GRAMMAR / COMPREHENSION
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|grammar", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 45, "marks": 1,
        "question": "Identify the primary 'doing' main verb in the following dramatic sentence: 'The massive, ancient oak tree abruptly crashed onto the busy motorway during the violent storm.'",
        "correct_answer": "crashed",
        "wrong_answers": ["abruptly", "massive", "motorway", "storm"],
        "explanation": "💡 Key Insight: A main verb describes the active, physical, or mental action taking place in the sentence.\nStep 1: 'Massive' and 'ancient' are adjectives describing the tree. 'Motorway' and 'storm' are nouns (things).\nStep 2: 'Abruptly' is an adverb telling us *how* something happened.\nStep 3: What actively happened? The tree *crashed*. This is the core physical action.\nFinal answer: crashed."
    },
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|grammar", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 60, "marks": 2,
        "question": "Which of these exact words is functioning strictly as an ADVERB inside the following intense sentence? 'She ran incredibly fast down the terrifyingly dark stone corridor to desperately escape the beast.'",
        "correct_answer": "incredibly",
        "wrong_answers": ["dark", "escape", "stone", "beast"],
        "explanation": "💡 Key Insight: While adverbs often end in '-ly' and describe verbs, they can also forcefully modify adjectives and even *other adverbs* to add intensity.\nStep 1: 'Dark' and 'stone' are adjectives heavily describing the noun 'corridor'. \nStep 2: 'Escape' is a verb here.\nStep 3: However, 'fast' is an adverb describing how she ran. The word 'incredibly' tells us *how fast* she ran! Therefore, 'incredibly' is an adverb actively modifying another adverb.\nFinal answer: incredibly."
    },
    {
        "track": "11plus", "question_type": "English Comprehension", "subtopic": "comprehension|inference", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "Read this miniature text extract: 'The headmaster’s polite smile never quite actively reached his eyes; it sat completely frozen on his wrinkled face like a mask as he handed out the final permanent detentions.' What does this vividly infer about his exact mood?",
        "correct_answer": "He is secretly furious or unfeeling, entirely faking his false kindness.",
        "wrong_answers": ["He is genuinely overjoyed but incredibly tired.", "He is extremely confused by the behaviour of the students.", "He is finding it very funny and is trying not to laugh out loud.", "He feels deep sympathy and sorrow for the children in detention."],
        "explanation": "💡 Key Insight: Authors use physical descriptions ('eyes', 'frozen mask') to hint at a character's true, buried emotions beneath the surface.\nStep 1: A smile that 'never reaches the eyes' is a classic literary phrase meaning the smile is entirely fake or forced.\nStep 2: Calling the smile a 'frozen mask' strongly reinforces that he is hiding his true feelings behind a solid barrier.\nStep 3: Because he is handing out severe punishments (detentions), being genuinely happy or sympathetic doesn't make logical narrative sense.\nStep 4: Therefore, we can firmly infer he is secretly angry or completely emotionally severed from empathy.\nFinal answer: He is secretly furious or unfeeling, entirely faking his false kindness."
    },
    {
        "track": "11plus", "question_type": "English Comprehension", "subtopic": "comprehension|inference", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "Read this text extract carefully: 'Alice held the heavy envelope up to the blindingly bright desk lamp. The rigid wax seal was totally unbroken, yet the thin parchment paper fiercely betrayed the unmistakable dark silhouette of a single train ticket inside.' Why is Alice primarily inspecting the letter mathematically in this bizarre way?",
        "correct_answer": "She is extremely anxious to know its exact contents without breaking the seal and tampering with the post.",
        "wrong_answers": ["She expects a dangerous, explosive device inside the dark envelope.", "She has terrible eyesight and desperately needs the lamp to read the address label.", "She doesn't know what a train ticket really looks like.", "She wants to warm up the heavily frozen wax seal so it can melt smoothly."],
        "explanation": "💡 Key Insight: You must connect *why* a character is performing an action with the specific tools they are using (a bright light behind thin paper).\nStep 1: She specifically holds an unbroken envelope up to a blindingly bright light.\nStep 2: The light physically allows her to see the 'silhouette' (the shadowy shape) of the ticket right through the thin paper.\nStep 3: Since the 'seal was unbroken', she hasn't opened it. Doing this tells us she furiously wants to know exactly what is inside, but cannot (or will not) open the wax seal to find out.\nFinal answer: She is extremely anxious to know its exact contents without breaking the seal and tampering with the post."
    }
]

def direct_insert_supabase(rows):
    data_bytes = json.dumps(rows).encode('utf-8')
    req = urllib.request.Request(SUPABASE_URL, data=data_bytes, method='POST')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except urllib.error.HTTPError as e:
        print(f"Supabase Insertion failed: {e.read().decode()}")
        return False

def main():
    print("🚀 NATIVE GEMINI INJECTION: Pushing internal hand-crafted cache directly to database...")
    db_rows = []
    for obj in questions:
        escaped_wrongs = [str(w).replace('"', '\\"') for w in obj["wrong_answers"]]
        wrong_pg_array = '{' + ','.join([f'"{w}"' for w in escaped_wrongs]) + '}'
        
        db_rows.append({
            "id": str(uuid.uuid4()),
            "question_type": obj["question_type"],
            "tier": obj["tier"],
            "calculator": obj["calculator"],
            "track": obj["track"],
            "subtopic": obj["subtopic"],
            "question": obj["question"],
            "correct_answer": str(obj["correct_answer"]),
            "wrong_answers": wrong_pg_array,
            "marks": obj["marks"],
            "difficulty": obj["difficulty"],
            "estimated_time_sec": obj["estimated_time_sec"],
            "image_url": "",
            "image_alt": "",
            "explanation": obj["explanation"]
        })
    
    if direct_insert_supabase(db_rows):
        print(f"✅ Master generation SUCCESS: Injected {len(questions)} strictly elite questions to Supabase in 1 second.")
    else:
        print("❌ Failed to insert")

if __name__ == "__main__":
    main()
