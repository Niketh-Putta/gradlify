import json
import urllib.request
import urllib.error
import os
import time
import uuid

# --- CONFIGURATION ---
OPENAI_API_KEY = "REMOVED_FOR_SECURITY"
SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co/rest/v1/exam_questions"
SUPABASE_KEY = "REMOVED_FOR_SECURITY"

BATCHES_PER_SUBTOPIC = 10
QUESTIONS_PER_BATCH = 5

TOPICS = [
    # MATHS
    {"type": "Number & Arithmetic", "sub": "number|addition-subtraction", "focus": "Large numbers, finding missing digits, complex columnar arithmetic, decimals"},
    {"type": "Number & Arithmetic", "sub": "number|multiplication-division", "focus": "Long multiplication, bus-stop method, word problems, remainder logic involving money"},
    {"type": "Number & Arithmetic", "sub": "number|fractions", "focus": "Equivalent fractions, mixed numbers to improper, four operations with fractions, finding fraction of amounts"},
    {"type": "Number & Arithmetic", "sub": "number|decimals-percentages", "focus": "FDP conversions, percentage of amounts, decimal placement, scaling"},
    {"type": "Number & Arithmetic", "sub": "number|place-value", "focus": "Rounding, significant figures, multiplying by powers of 10, value of specific digits"},
    {"type": "Number & Arithmetic", "sub": "number|factors-multiples-primes", "focus": "HCF and LCM word problems, prime factorization trees, square and cube numbers"},
    {"type": "Number & Arithmetic", "sub": "number|bidmas", "focus": "Order of operations, inserting brackets to make equations true, powers"},
    
    {"type": "Algebra & Ratio", "sub": "algebra|ratio", "focus": "Sharing quantities, simplifying, ratio changing over time, working backwards from a difference"},
    {"type": "Algebra & Ratio", "sub": "algebra|proportion", "focus": "Direct and inverse proportion, recipe scaling, money exchange rates, unit cost"},
    {"type": "Algebra & Ratio", "sub": "algebra|equations", "focus": "Solving linear equations, unknowns on both sides, balance method, forming equations from words"},
    {"type": "Algebra & Ratio", "sub": "algebra|sequences", "focus": "Nth term, geometric sequences, Fibonacci style, predicting the 50th term"},
    
    {"type": "Geometry & Measures", "sub": "geometry|perimeter-area", "focus": "Compound L-shapes, working backwards to track missing sides, equating area of rectangle with triangle"},
    {"type": "Geometry & Measures", "sub": "geometry|volume-surface-area", "focus": "Volume of cuboids, liquid capacity conversions (ml to liters to cm3), missing dimensions"},
    {"type": "Geometry & Measures", "sub": "geometry|coordinates", "focus": "Four quadrants, reflecting shapes, translating by vectors, finding 4th vertex of shapes"},
    {"type": "Geometry & Measures", "sub": "geometry|angles", "focus": "Parallel lines (Z,F,C rules), angles in polygons, missing angles in isosceles triangles"},
    {"type": "Geometry & Measures", "sub": "geometry|measures", "focus": "Converting metric units, speed distance time triangles, reading distinct scales, clocks/timetables"},
    {"type": "Geometry & Measures", "sub": "geometry|2d-3d-shapes", "focus": "Properties of quadrilaterals, faces/edges/vertices, Euler's formula, nets of prisms"},
    
    {"type": "Statistics & Data", "sub": "stats|data-handling", "focus": "Mean, median, mode, range, grouped frequency, backwards mean problems (missing fifth number)"},
    {"type": "Statistics & Data", "sub": "stats|probability", "focus": "Probability scale 0-1, independent events, tree diagrams logic, summing probabilities to 1"},
    
    {"type": "Problem Solving", "sub": "strategies|word-problems", "focus": "Multi-step puzzles, ticket pricing, combinations, shopping bills, logical deduction"},
    
    # ENGLISH SPaG
    {"type": "English SPaG", "sub": "spag|vocabulary", "focus": "Synonyms, antonyms, specific terminology, defining precise adjectives, verbal reasoning analogies"},
    {"type": "English SPaG", "sub": "spag|punctuation", "focus": "Apostrophes for possession and omission, standard comma rules, semi-colons, direct speech marks"},
    {"type": "English SPaG", "sub": "spag|grammar", "focus": "Identifying word classes (nouns, verbs, adjectives, prepositions, gerunds), active vs passive voice"},
    {"type": "English SPaG", "sub": "spag|sentence-structure", "focus": "Main vs subordinate clauses, complex sentences, identifying fragments and comma splices"},
]

PROMPT = """
You are an elite Cambridge-educated 11+ independent school exams writer. 
Generate exactly {count} exceptionally high-quality multiple choice 11+ questions for the subtopic: {sub} focusing specifically on: {focus}.

CRITICAL RULES:
1. EXAM: 11+ Standard (UK Grammar and Independent School entrance). Mix Level 1 (Fluency), Level 2 (Application), and Level 3 (Synthesis).
2. NO DIAGRAMS OR VISUALS. Questions must be 100% text-based. Do NOT use any visual tags.
3. STRICTLY 5 OPTIONS: Exactly 1 correct answer, and strictly 4 incredibly strong pedagogical distractors (common student errors).
4. UNIQUE SCENARIOS: Make every single real-world scenario (names, items, numbers) distinctly unique. Do not clone.
5. EXPLANATIONS (CRITICAL): Must be plain text, extremely easy to understand for an 11-year-old kid. Start with '💡 Key Insight:', then break it down logically as 'Step 1:', 'Step 2:', etc.
6. JSON OUTPUT ONLY: Must return a JSON object with a single key "questions" mapping to an array of question objects.

YOUR SCHEMA (STRICTLY THIS JSON STRUCTURE):
{{
  "questions": [
    {{
      "question": "The text of the question",
      "correct_answer": "The right answer string",
      "wrong_answers": ["wrong1", "wrong2", "wrong3", "wrong4"],
      "difficulty": 2,
      "explanation": "💡 Key Insight: This is a tip.\\nStep 1: First we add...\\nStep 2: ...\\nFinal answer: ..."
    }}
  ]
}}
"""

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

def generate_batch(topic, index):
    url = "https://api.openai.com/v1/chat/completions"
    text_prompt = PROMPT.format(count=QUESTIONS_PER_BATCH, sub=topic['sub'], focus=topic['focus'])
    
    payload = {
        "model": "gpt-4o-mini",
        "response_format": { "type": "json_object" },
        "messages": [
            {"role": "system", "content": "You are a JSON generating system for 11+ exam prep."},
            {"role": "user", "content": text_prompt}
        ],
        "temperature": 0.5
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {OPENAI_API_KEY}'
    })
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            text_response = result['choices'][0]['message']['content']
            parsed = json.loads(text_response)
            objects = parsed.get("questions", [])
            
            if not objects:
                print(f"⚠️ OpenAI returned empty array for {topic['sub']}")
                return False
                
            db_rows = []
            for obj in objects:
                # Format for Supabase text[] array: {"A","B","C"}
                escaped_wrongs = [str(w).replace('"', '\\"') for w in obj["wrong_answers"]]
                wrong_pg_array = '{' + ','.join([f'"{w}"' for w in escaped_wrongs]) + '}'
                
                # Sanitize the inputs mathematically
                db_rows.append({
                    "id": str(uuid.uuid4()),
                    "question_type": topic['type'],
                    "tier": "11+ Standard",
                    "calculator": "Non-Calculator",
                    "track": "11plus",
                    "subtopic": topic['sub'],
                    "question": obj["question"],
                    "correct_answer": str(obj["correct_answer"]),
                    "wrong_answers": wrong_pg_array,
                    "marks": obj["difficulty"],
                    "difficulty": obj["difficulty"],
                    "estimated_time_sec": 45 + (int(obj["difficulty"]) * 30),
                    "image_url": "",
                    "image_alt": "",
                    "explanation": obj["explanation"]
                })
            
            if direct_insert_supabase(db_rows):
                print(f"✅ [{topic['sub']}] Batch {index}/{BATCHES_PER_SUBTOPIC} inserted successfully.")
                return True
            return False
            
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"❌ OpenAI Error on [{topic['sub']}]: {e.code} - {error_msg}")
        # Stop everything if API key is dead
        if e.code in [401, 403, 429]:
            print("FATAL OPENAI ERROR. QUITTING SCRIPT.")
            exit(1)
        return False
    except Exception as e:
        print(f"⚠️ General Error for {topic['sub']} (Batch {index}): {e}")
        return False

def main():
    print("🚀 INITIALIZING TURBO OPENAI 1500+ DIRECT DATABASE INJECTION...")
    
    total_topics = len(TOPICS)
    for topic_idx, topic in enumerate(TOPICS, 1):
        print(f"\\n--- Processing Topic {topic_idx}/{total_topics}: {topic['sub']} ---")
        for batch_idx in range(1, BATCHES_PER_SUBTOPIC + 1):
            success = generate_batch(topic, batch_idx)
            if not success:
                # give it a mini retry
                time.sleep(1)
                generate_batch(topic, batch_idx)
            
    print("\\n\\n🎉 TURBO DEPLOYMENT COMPLETED!")

if __name__ == "__main__":
    main()
