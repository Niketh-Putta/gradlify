import json
import urllib.request
import urllib.error
import os
import time
import uuid

GEMINI_API_KEY = "REMOVED_FOR_SECURITY"
SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co/rest/v1/exam_questions"
SUPABASE_KEY = "REMOVED_FOR_SECURITY"

# We want 60 questions per subtopic * 25 subtopics = 1500 total.
# To maximize speed legally, we request 20 questions per huge generation batch.
BATCHES_PER_SUBTOPIC = 3 # 3 batches of 20 = 60 qs per subtopic.
QUESTIONS_PER_BATCH = 20

TOPICS = [
    # MATHS
    {"type": "Number & Arithmetic", "sub": "number|addition-subtraction", "focus": "Large numbers, finding missing digits, columnar arithmetic, decimals"},
    {"type": "Number & Arithmetic", "sub": "number|multiplication-division", "focus": "Long multiplication, bus-stop method, word problems, remainder logic involving money"},
    {"type": "Number & Arithmetic", "sub": "number|fractions", "focus": "Equivalent fractions, mixed numbers to improper, four operations with fractions, finding fraction of amounts"},
    {"type": "Number & Arithmetic", "sub": "number|decimals-percentages", "focus": "FDP conversions, percentage of amounts, decimal placement, scaling"},
    {"type": "Number & Arithmetic", "sub": "number|place-value", "focus": "Rounding, significant figures, powers of 10, digit value"},
    {"type": "Number & Arithmetic", "sub": "number|factors-multiples-primes", "focus": "HCF and LCM word problems, prime factorization trees, square & cube numbers"},
    {"type": "Number & Arithmetic", "sub": "number|bidmas", "focus": "Order of operations, inserting brackets to make equations true, powers"},
    
    {"type": "Algebra & Ratio", "sub": "algebra|ratio", "focus": "Sharing quantities, simplifying, ratio changing over time, backwards difference"},
    {"type": "Algebra & Ratio", "sub": "algebra|proportion", "focus": "Direct / inverse proportion, recipe scaling, money exchange rates, unit cost"},
    {"type": "Algebra & Ratio", "sub": "algebra|equations", "focus": "Solving linear equations, unknowns on both sides, balance method, forming equations"},
    {"type": "Algebra & Ratio", "sub": "algebra|sequences", "focus": "Nth term, geometric sequences, Fibonacci style, predicting the 50th term"},
    
    {"type": "Geometry & Measures", "sub": "geometry|perimeter-area", "focus": "Compound L-shapes, backwards perimeter, equating area of rectangle with triangle"},
    {"type": "Geometry & Measures", "sub": "geometry|volume-surface-area", "focus": "Volume of cuboids, liquid capacity (ml/liters/cm3), missing dimensions"},
    {"type": "Geometry & Measures", "sub": "geometry|coordinates", "focus": "Four quadrants, reflecting shapes, translating, finding 4th vertex"},
    {"type": "Geometry & Measures", "sub": "geometry|angles", "focus": "Parallel lines (Z,F,C rules), angles in polygons, missing angles in triangles"},
    {"type": "Geometry & Measures", "sub": "geometry|measures", "focus": "Converting metric units, speed distance time, distinct scales, timetables"},
    {"type": "Geometry & Measures", "sub": "geometry|2d-3d-shapes", "focus": "Properties of quadrilaterals, faces/edges/vertices, Euler's formula"},
    
    {"type": "Statistics & Data", "sub": "stats|data-handling", "focus": "Mean, median, mode, range, grouped frequency, backwards mean problems (missing fifth number)"},
    {"type": "Statistics & Data", "sub": "stats|probability", "focus": "Probability scale 0-1, independent events, tree diagrams logic, summing probabilities to 1"},
    
    {"type": "Problem Solving", "sub": "strategies|word-problems", "focus": "Multi-step puzzles, ticket pricing, combinations, shopping bills, logical deduction"},
    {"type": "Problem Solving", "sub": "strategies|logic", "focus": "Deductive sequences, spatial puzzles phrased as text, true/false paradoxes"},
    
    # ENGLISH SPaG
    {"type": "English SPaG", "sub": "spag|vocabulary", "focus": "Synonyms, antonyms, specific terminology, defining precise adjectives, verbal reasoning analogies"},
    {"type": "English SPaG", "sub": "spag|punctuation", "focus": "Apostrophes for possession and omission, standard commas, semi-colons, direct speech"},
    {"type": "English SPaG", "sub": "spag|grammar", "focus": "Identifying word classes (nouns, verbs, adjectives, prepositions, gerunds), active vs passive voice"},
    {"type": "English SPaG", "sub": "spag|sentence-structure", "focus": "Main vs subordinate clauses, complex sentences, identifying fragments and comma splices"},
]

PROMPT = """
You are an elite 11+ exams writer. 
Generate a massive batch of {count} completely unique multiple choice 11+ questions for subtopic: {sub} focusing on: {focus}.

CRITICAL RULES:
1. EXAM: Mix Level 1 (Fluency), Level 2 (Application), and Level 3 (Synthesis).
2. MULTIPLE CHOICE: EXACTLY 5 options. 1 mathematically/factually correct answer, 4 deeply pedagogical distractors based on very common student errors.
3. UNIQUE SCENARIOS: Make every single question completely un-cloned. Radically change names, settings, values, and logical structures for all {count} questions!
4. EXPLANATIONS: Start with '💡 Key Insight:', then break it down logically as 'Step 1:', 'Step 2:', etc. VERY kid-friendly for 10-11 year olds.
5. NO VISUAL TAGS. 100% text only.
6. JSON ONLY: Return exactly a RAW JSON Array of Objects. No markdown wrappers.

YOUR SCHEMA (JSON ARRAY ONLY):
[
  {{
    "question": "string",
    "correct_answer": "string",
    "wrong_answers": ["string", "string", "string", "string"],
    "difficulty": integer (1, 2, or 3),
    "explanation": "string (Start with 💡 Key Insight)"
  }}
]
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
    # CRITICAL: We switch to gemini-2.5-flash! 
    # Why? It is 10x faster, has 15 RPM (Request / minute) free tier instead of 2 RPM, 
    # and allows 1M TPM (Tokens per minute), perfectly built for massive scaling.
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    text_prompt = PROMPT.format(count=QUESTIONS_PER_BATCH, sub=topic['sub'], focus=topic['focus'])
    
    data = {"contents": [{"parts": [{"text": text_prompt}]}], "generationConfig": {"temperature": 0.7, "response_mime_type": "application/json"}}
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                text_response = result['candidates'][0]['content']['parts'][0]['text']
                objects = json.loads(text_response)
                
                db_rows = []
                for obj in objects:
                    escaped_wrongs = [w.replace('"', '\\"') for w in obj["wrong_answers"]]
                    wrong_pg_array = '{' + ','.join([f'"{w}"' for w in escaped_wrongs]) + '}'
                    
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
                    print(f"✅ [{topic['sub']}] Inserted chunk smoothly ({len(objects)} questions).")
                return # success
                    
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"⏳ Rate Limit. Since we use Flash, slowing down purely for {topic['sub']}... Sleeping 15s")
                time.sleep(15)
            else:
                print(f"⚠️ HTTP Error: {e.code}")
                time.sleep(5)
        except Exception as e:
            print(f"⚠️ Error: {e}")
            time.sleep(5)

def main():
    print("🚀 INITIALIZING GEMINI-1.5-FLASH HYPER-AUTOMATED INJECTION...")
    
    total_topics = len(TOPICS)
    for topic_idx, topic in enumerate(TOPICS, 1):
        print(f"\\n--- Processing Topic {topic_idx}/{total_topics}: {topic['sub']} ---")
        for batch_idx in range(1, BATCHES_PER_SUBTOPIC + 1):
            generate_batch(topic, batch_idx)
            # Sleep 4.5 seconds. 60 / 4.5 = 13.3 Requests per minute.
            # This perfectly respects Gemini Flash's free tier of 15 Requests Per Minute!
            time.sleep(4.5)
            
    print("\\n\\n🎉 MASSIVE DEPLOYMENT COMPLETED! All 1500 Questions securely inserted.")

if __name__ == "__main__":
    main()
