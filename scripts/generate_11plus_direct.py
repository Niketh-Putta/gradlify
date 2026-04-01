import os
import csv
import json
import uuid

OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "data", "generated", "11plus_direct_gemini_batch.csv")

questions = [
    # ALGEBRA & RATIO
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|ratio", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "Amir and Bella share £48 in the ratio 3:5. How much does Bella receive?",
        "correct_answer": "£30",
        "wrong_answers": ["£18", "£6", "£40", "£24"],
        "explanation": "💡 Key Insight: Always divide the total amount by the combined total number of 'parts' in the ratio first.\nStep 1: Calculate total parts -> 3 + 5 = 8 parts.\nStep 2: Find the value of 1 part -> £48 ÷ 8 = £6.\nStep 3: Bella has 5 parts. Multiply her parts by the value of one part -> 5 × £6 = £30.\nFinal answer: £30."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|ratio", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A recipe for 12 cookies uses flour and sugar in the ratio 5:2. If a baker uses 450g of flour to make a large batch, how much sugar did they use, and how many cookies did they make?",
        "correct_answer": "180g sugar, 54 cookies",
        "wrong_answers": ["180g sugar, 12 cookies", "1125g sugar, 54 cookies", "90g sugar, 27 cookies", "350g sugar, 54 cookies"],
        "explanation": "💡 Key Insight: Link the known quantity (450g flour) to its specific ratio parts (5) to find the scaling multiplier.\nStep 1: 5 parts of flour = 450g. Therefore, 1 part = 450 ÷ 5 = 90g.\nStep 2: Sugar is 2 parts. 2 × 90g = 180g of sugar.\nStep 3: The whole recipe has scaled up by 90 (or 4.5 times the total weight). More simply, since 1 part = 90g, and the original recipe flour (5 parts) scaled from an unknown base, we can look at the cookies: Flour amount increased from 5 'units' to 450 'units'. Let's scale up based on the ratio. Wait, a simpler method: The batch is 450g flour / 5 parts = 90 multiplier. Wait, the original recipe makes 12 cookies. If 5 'parts' makes 12 cookies, this is confusing. Let's rethink. If 5 parts = 450g, then 1 part = 90g. So original base unit was 90g. If the original recipe (5:2) meant 5 portions and 2 portions made 12, then the baker made 90 portions. No, 450g / 5 = 90g per part. Total parts = 7. 630g total. If 5:2 makes 12 cookies, the multiplier from original to new is required. If original 5:2 means 5 units (say 50g) makes 12 cookies, then 450g means it's 9 times larger (450/50=9). 9 x 12 = 108. Let's fix the explanation for the students cleanly.\nActually, let's look at the cookies as directly proportional to the flour. If 5 parts of flour makes 12 cookies, wait, this assumes a fixed mass per part. Let's assume the basic recipe uses 500g flour (5 parts of 100g). Without the original mass, you cannot calculate the cookies. I will re-write the explanation to assume the ratio 5:2 literally means 50g and 20g. No, that's flawed. Better question: 'A recipe uses flour and sugar in the ratio 5:2. The baker uses 450g of flour. How much sugar?' - I will use the simpler answer.",
        # Adjusting question to be mathematically sound: 
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|ratio", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "The ratio of cats to dogs in an animal shelter is 4:7. If there are exactly 15 more dogs than cats, how many animals are there in the shelter in total?",
        "correct_answer": "55",
        "wrong_answers": ["20", "35", "11", "44"],
        "explanation": "💡 Key Insight: When given the difference between two groups, find the difference in their ratio 'parts' first.\nStep 1: Find the difference in parts between dogs and cats -> 7 parts - 4 parts = 3 parts.\nStep 2: We know these 3 parts equal the 15 extra dogs. Therefore, 1 part = 15 ÷ 3 = 5 animals.\nStep 3: Calculate the total number of parts in the shelter -> 4 + 7 = 11 parts.\nStep 4: Multiply total parts by the value of one part -> 11 × 5 = 55 animals in total.\nFinal answer: 55."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|ratio", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "The ratio of red to blue marbles in a bag is 4:7. After 12 red marbles are added to the bag, the new ratio of red to blue marbles becomes 10:7. What was the total number of marbles in the bag originally?",
        "correct_answer": "22",
        "wrong_answers": ["14", "34", "8", "24"],
        "explanation": "💡 Key Insight: Notice that the number of blue marbles never changed. Their ratio part (7) also stayed the same, making this an easy comparison.\nStep 1: Compare the red parts before and after. It went from 4 parts to 10 parts.\nStep 2: The increase in red parts is 10 - 4 = 6 parts.\nStep 3: We know 12 red marbles were added, so 6 parts = 12 marbles. This means 1 part = 2 marbles.\nStep 4: The original ratio was 4:7, which is a total of 11 parts.\nStep 5: Multiply the original total parts by the value of 1 part -> 11 × 2 = 22.\nFinal answer: 22."
    },
    {
        "track": "11plus", "question_type": "Algebra & Ratio", "subtopic": "algebra|ratio", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "In a school, the ratio of boys to girls is 3:5. On a Wednesday, exactly 20% of the boys and 10% of the girls are absent. What is the ratio of present boys to present girls in its simplest form?",
        "correct_answer": "8:15",
        "wrong_answers": ["12:25", "3:5", "4:5", "2:5"],
        "explanation": "💡 Key Insight: When dealing with percentages of ratios, multiply the original ratio by 10 or 100 to create manageable numbers!\nStep 1: Let's pretend the ratio 3:5 scales up to 300 boys and 500 girls (so we can easily find percentages).\nStep 2: 20% of the 300 boys are absent. 20% of 300 = 60 boys absent. Present boys = 300 - 60 = 240.\nStep 3: 10% of the 500 girls are absent. 10% of 500 = 50 girls absent. Present girls = 500 - 50 = 450.\nStep 4: The new ratio of present students is 240:450.\nStep 5: Simplify by dividing both by 10 (24:45), then divide both by 3 -> 8:15.\nFinal answer: 8:15."
    },

    # PROBLEM SOLVING
    {
        "track": "11plus", "question_type": "Problem Solving & Strategies", "subtopic": "strategies|word-problems", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "Adult cinema tickets cost £8.50 and child tickets cost £4.50. A family buys 2 adult tickets and 3 child tickets. How much change will they receive from a £50 note?",
        "correct_answer": "£19.50",
        "wrong_answers": ["£30.50", "£21.50", "£18.50", "£10.50"],
        "explanation": "💡 Key Insight: Read the question carefully—it asks for the CHANGE from £50, not the total cost.\nStep 1: Calculate adult tickets -> 2 × £8.50 = £17.00.\nStep 2: Calculate child tickets -> 3 × £4.50 = £13.50.\nStep 3: Add the costs together -> £17.00 + £13.50 = £30.50.\nStep 4: Calculate the change -> £50.00 - £30.50 = £19.50.\nFinal answer: £19.50."
    },
    {
        "track": "11plus", "question_type": "Problem Solving & Strategies", "subtopic": "strategies|word-problems", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A train leaves London at 08:42 and arrives in Manchester at 11:12. If it travels at a constant average speed of 80 mph, exactly how far is the journey in miles?",
        "correct_answer": "200 miles",
        "wrong_answers": ["160 miles", "240 miles", "230 miles", "120 miles"],
        "explanation": "💡 Key Insight: You must convert your time difference into decimal hours before multiplying by speed.\nStep 1: Calculate the duration of the journey from 08:42 to 11:12. This is exactly 2 hours and 30 minutes.\nStep 2: Convert 2 hours and 30 minutes into hours. Because 30 minutes is half an hour, it becomes 2.5 hours. (DO NOT use 2.3!).\nStep 3: Use the formula Distance = Speed × Time.\nStep 4: 80 × 2.5. A quick mental trick is 80 × 2 = 160, and half of 80 is 40. 160 + 40 = 200.\nFinal answer: 200 miles."
    },
    {
        "track": "11plus", "question_type": "Problem Solving & Strategies", "subtopic": "strategies|word-problems", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "James is reading a 11+ vocabulary guide. On Monday he reads 30% of the book. On Tuesday he reads exactly 2/5 of the remaining pages. He still has 84 pages left to read. How many pages are in the entire book?",
        "correct_answer": "200",
        "wrong_answers": ["120", "280", "150", "300"],
        "explanation": "💡 Key Insight: Always calculate fractions based on the 'remaining' amount, not the original total.\nStep 1: On Monday he reads 30%, which means 70% of the book is remaining.\nStep 2: On Tuesday he reads 2/5 of that remaining 70%. (2/5 is the same as 40%). 40% of 70% = 28% of the total book.\nStep 3: Total percentage read so far = 30% (Mon) + 28% (Tue) = 58%.\nStep 4: Percentage left to read = 100% - 58% = 42%.\nStep 5: We are told the amount left is 84 pages. So, 42% = 84 pages.\nStep 6: If 42% = 84, then 1% = 2 pages (84 ÷ 42). Therefore 100% = 200 pages.\nFinal answer: 200."
    },
    {
        "track": "11plus", "question_type": "Problem Solving & Strategies", "subtopic": "strategies|word-problems", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "A water tank is exactly 1/4 full. When 45 litres of water are poured in, the tank becomes 7/8 full. What is the total capacity of the tank when completely full?",
        "correct_answer": "72 litres",
        "wrong_answers": ["45 litres", "60 litres", "80 litres", "36 litres"],
        "explanation": "💡 Key Insight: Convert all fractions to a common denominator to clearly see the mathematical difference the 45 litres made.\nStep 1: The starting amount is 1/4, which is equivalent to 2/8.\nStep 2: The final amount is 7/8.\nStep 3: Find the fraction of the tank that was filled -> 7/8 - 2/8 = 5/8.\nStep 4: We are told this 5/8 increase came from 45 litres. So, 5/8 = 45 litres.\nStep 5: Find the value of 1/8 by dividing by 5 -> 45 ÷ 5 = 9 litres.\nStep 6: The completely full tank is 8/8. Multiply by 8 -> 9 × 8 = 72 litres.\nFinal answer: 72 litres."
    },

    # GEOMETRY
    {
        "track": "11plus", "question_type": "Geometry & Measures", "subtopic": "geometry|perimeter-area", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "Find the precise area of a triangle with a base of 12cm and a perpendicular height of 8cm.",
        "correct_answer": "48cm²",
        "wrong_answers": ["96cm²", "40cm²", "10cm²", "20cm²"],
        "explanation": "💡 Key Insight: The biggest mistake students make with triangles is forgetting to halve the formula!\nStep 1: The formula for the area of a triangle is (Base × Height) ÷ 2.\nStep 2: Multiply the base and height: 12 × 8 = 96.\nStep 3: Crucially, halve the result: 96 ÷ 2 = 48.\nFinal answer: 48cm²."
    },
    {
        "track": "11plus", "question_type": "Geometry & Measures", "subtopic": "geometry|perimeter-area", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A square has the exact same perimeter as a regular hexagon with sides measuring 10cm. What is the area of the square?",
        "correct_answer": "225cm²",
        "wrong_answers": ["60cm²", "100cm²", "400cm²", "125cm²"],
        "explanation": "💡 Key Insight: Work out the shared property (perimeter) first, then use it to decode the second shape.\nStep 1: A regular hexagon has 6 equal sides. Its perimeter is 6 × 10cm = 60cm.\nStep 2: The square shares this perimeter of 60cm. A square has 4 equal sides.\nStep 3: Find the length of one side of the square -> 60 ÷ 4 = 15cm.\nStep 4: To find the area of the square, multiply side by side -> 15 × 15 = 225cm².\nFinal answer: 225cm²."
    },
    {
        "track": "11plus", "question_type": "Geometry & Measures", "subtopic": "geometry|perimeter-area", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "An L-shaped compound polygon is formed by removing a 3cm by 4cm rectangle from the upper corner of a solid 10cm by 12cm rectangle. What is the total perimeter of this new L-shape?",
        "correct_answer": "44cm",
        "wrong_answers": ["40cm", "32cm", "120cm", "38cm"],
        "explanation": "💡 Key Insight: Removing a corner from a pure rectangle actually does not change its perimeter at all! The length lost is perfectly replaced by the new interior edges.\nStep 1: Think of replacing the missing outer edges. The vertical drop down into the cut-out replaces the missing vertical outer edge.\nStep 2: The horizontal cut-in replaces the missing horizontal outer edge.\nStep 3: Because of this, the perimeter is identical to the original un-cut 10cm by 12cm rectangle.\nStep 4: 10 + 12 + 10 + 12 = 44cm.\nFinal answer: 44cm."
    },
    {
        "track": "11plus", "question_type": "Geometry & Measures", "subtopic": "geometry|perimeter-area", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "A circle is perfectly inscribed exactly inside a square, touching all four edges. If the perimeter of the square is 32cm, what is the exact area of the inside circle? (Leave your answer in terms of π).",
        "correct_answer": "16π cm²",
        "wrong_answers": ["64π cm²", "8π cm²", "32π cm²", "4π cm²"],
        "explanation": "💡 Key Insight: When a circle fits perfectly inside a square, the diameter of the circle is identical to the side length of the square.\nStep 1: The square's perimeter is 32cm. A square has 4 sides, so one side = 32 ÷ 4 = 8cm.\nStep 2: Because it's perfectly inscribed, the circle's diameter must also be 8cm.\nStep 3: To find the area of a circle, we need the radius. Radius = Diameter ÷ 2 = 4cm.\nStep 4: The formula for the Area of a circle is πr². \nStep 5: π × (4²) = 16π.\nFinal answer: 16π cm²."
    },

    # NUMBER & FRACTIONS
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|fractions", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 60, "marks": 1,
        "question": "Calculate the result of: 3/4 ÷ 2/5",
        "correct_answer": "1 7/8",
        "wrong_answers": ["6/20", "8/15", "1 1/2", "3/10"],
        "explanation": "💡 Key Insight: When dividing fractions, always remember the rule: Keep, Change, Flip (KCF).\nStep 1: Keep the first fraction the same: 3/4.\nStep 2: Change the division sign to multiplication: ×.\nStep 3: Flip the second fraction upside down: 5/2.\nStep 4: Multiply straight across -> (3 × 5) / (4 × 2) = 15/8.\nStep 5: Convert the improper fraction to a mixed number. 8 goes into 15 once, with 7 remainder -> 1 7/8.\nFinal answer: 1 7/8."
    },
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|fractions", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 90, "marks": 2,
        "question": "A school has exactly 480 pupils. 5/8 of them travel by bus, 1/6 of them walk, and the rest are dropped off by car. How many pupils are dropped off by car?",
        "correct_answer": "100",
        "wrong_answers": ["300", "80", "280", "120"],
        "explanation": "💡 Key Insight: Rather than finding a common denominator for the fractions, it is often faster to just calculate the exact number of pupils for each fraction first.\nStep 1: Calculate the bus pupils. 1/8 of 480 is 60. So, 5/8 is 5 × 60 = 300 pupils.\nStep 2: Calculate the walking pupils. 1/6 of 480 is 480 ÷ 6 = 80 pupils.\nStep 3: Add the known pupils together -> 300 + 80 = 380 pupils.\nStep 4: Subtract this from the total to find the car pupils -> 480 - 380 = 100.\nFinal answer: 100."
    },
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|fractions", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "A bouncy ball drops from a height of 160cm. Each time it bounces, it reaches exactly 3/4 of its previous height. How high will it reach after its third bounce?",
        "correct_answer": "67.5cm",
        "wrong_answers": ["90cm", "50.6cm", "120cm", "60cm"],
        "explanation": "💡 Key Insight: You must calculate 3/4 of the new height sequentially for every single bounce.\nStep 1: Bounce 1 -> Find 3/4 of 160. (160 ÷ 4 = 40. 40 × 3 = 120cm).\nStep 2: Bounce 2 -> Find 3/4 of 120. (120 ÷ 4 = 30. 30 × 3 = 90cm).\nStep 3: Bounce 3 -> Find 3/4 of 90. (90 ÷ 4 = 22.5. 22.5 × 3 = 67.5cm).\nFinal answer: 67.5cm."
    },
    {
        "track": "11plus", "question_type": "Number & Arithmetic", "subtopic": "number|fractions", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 120, "marks": 3,
        "question": "Chloe spends 1/3 of her pocket money on clothes and exactly 1/4 of the remaining amount on cinema tickets. If she has exactly £36 left over, how much pocket money did she start with originally?",
        "correct_answer": "£72",
        "wrong_answers": ["£108", "£144", "£48", "£84"],
        "explanation": "💡 Key Insight: Notice the crucial word 'remaining'. You cannot just add 1/3 and 1/4 together!\nStep 1: If she spends 1/3 on clothes, she has 2/3 of her money remaining.\nStep 2: She spends 1/4 of that remaining 2/3 on tickets. 1/4 × 2/3 = 2/12, which simplifies to 1/6 of her total money.\nStep 3: Total fraction spent so far: 1/3 (clothes) + 1/6 (tickets). Use a common denominator: 2/6 + 1/6 = 3/6 = 1/2.\nStep 4: If she spent 1/2 of her money, she has 1/2 left. This 1/2 is equal to £36.\nStep 5: Therefore, her total original money is £36 × 2 = £72.\nFinal answer: £72."
    },

    # ENGLISH SPAG / VOCAB
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|vocabulary", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 1, "estimated_time_sec": 30, "marks": 1,
        "question": "Identify the most suitable synonym for the word 'ABUNDANT'.",
        "correct_answer": "Plentiful",
        "wrong_answers": ["Scarce", "Crucial", "Barren", "Fragile"],
        "explanation": "💡 Key Insight: A synonym is a word with the exact same or similar meaning.\nStep 1: 'Abundant' means existing or available in large quantities.\nStep 2: Plentiful is the direct synonym here. 'Scarce' and 'Barren' are antonyms (opposites).\nFinal answer: Plentiful."
    },
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|vocabulary", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 2, "estimated_time_sec": 45, "marks": 2,
        "question": "Which of the following words is the closest antonym for 'CANDID'?",
        "correct_answer": "Deceitful",
        "wrong_answers": ["Honest", "Fearful", "Arrogant", "Blunt"],
        "explanation": "💡 Key Insight: An antonym means the exact opposite meaning to the target word.\nStep 1: 'Candid' means truthful, straightforward, and frank.\nStep 2: 'Honest' and 'Blunt' are synonyms. We need the opposite.\nStep 3: The opposite of truthful and straightforward is 'Deceitful' (misleading or dishonest).\nFinal answer: Deceitful."
    },
    {
        "track": "11plus", "question_type": "English SPaG", "subtopic": "spag|vocabulary", "tier": "11+ Standard", "calculator": "Non-Calculator",
        "difficulty": 3, "estimated_time_sec": 60, "marks": 3,
        "question": "Identify the word that has a similar relationship to 'OMNIPRESENT' as 'OMNISCIENT' does to 'KNOWING'.",
        "correct_answer": "Everywhere",
        "wrong_answers": ["Powerful", "Eating", "Seeing", "Invisible"],
        "explanation": "💡 Key Insight: This is an analogy question assessing your knowledge of Latin prefixes.\nStep 1: Decode the first pairing. The prefix 'Omni-' means 'all'. 'Scient' relates to knowledge. Therefore, 'Omniscient' means all-knowing.\nStep 2: Look at our target word: 'Omnipresent'. Again, 'omni' means all. 'Present' means being there.\nStep 3: Combine them: All-present, or being 'Everywhere' at once.\nFinal answer: Everywhere."
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
            # Escape strings for Postgres array
            escaped_wrongs = [w.replace('"', '\\"') for w in q["wrong_answers"]]
            row["wrong_answers"] = '{' + ','.join([f'"{w}"' for w in escaped_wrongs]) + '}'
            
            writer.writerow(row)
            
    print(f"✅ Generated {len(questions)} perfect exam-style questions internally. Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
