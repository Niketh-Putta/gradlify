import json
import urllib.request
import urllib.error
import os
import time
import uuid

# --- CONFIGURATION ---
GEMINI_API_KEY = "REMOVED_FOR_SECURITY"
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
You are currently an elite Cambridge-educated 11+ independent school exams writer. 
Generate exactly {count} exceptionally high-quality multiple choice 11+ questions for the subtopic: {sub} focusing strictly on: {focus}.

CRITICAL RULES:
1. EXAM: 11+ Standard (UK Grammar and Independent School entrance). Mix Level 1 (Fluency), Level 2 (Application), and Level 3 (Synthesis).
2. NO DIAGRAMS OR VISUALS. Questions must be 100% text-based. Do NOT use `[VISUAL: ...]` tags.
3. STRICTLY 5 OPTIONS: Exactly 1 correct answer, and strictly 4 incredibly strong pedagogical distractors (common errors/misconceptions).
4. UNIQUE SCENARIOS: Make every real-world scenario bizarre, fun, or distinctly unique. No cloning.
5. EXPLANATIONS (CRITICAL): Must be plain text, extremely easy to understand for an 11-year-old kid. Do NOT use overly complex jargon. Start with '💡 Key Insight:', then break it down step-by-step into bite-sized logic for a young student. 
6. OUTPUT STRICTLY RAW JSON ARRAY OF OBJECTS. Do not output markdown backticks.

SCHEMA:
[
  {{
    "question": "string",
    "correct_answer": "string",
    "wrong_answers": ["str", "str", "str", "str"],
    "difficulty": integer (1, 2, or 3),
    "explanation": "string"
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
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={GEMINI_API_KEY}"
    text_prompt = PROMPT.format(count=QUESTIONS_PER_BATCH, sub=topic['sub'], focus=topic['focus'])
    
    data = {"contents": [{"parts": [{"text": text_prompt}]}], "generationConfig": {"temperature": 0.6, "response_mime_type": "application/json"}}
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    max_retries = 30
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
                        "correct_answer": obj["correct_answer"],
                        "wrong_answers": wrong_pg_array,
                        "marks": obj["difficulty"],
                        "difficulty": obj["difficulty"],
                        "estimated_time_sec": 45 + (obj["difficulty"] * 30),
                        "image_url": "",
                        "image_alt": "",
                        "explanation": obj["explanation"]
                    })
                
                if direct_insert_supabase(db_rows):
                    print(f"✅ [{topic['sub']}] Batch {index}/{BATCHES_PER_SUBTOPIC} inserted successfully.")
                return # exit retry loop
                    
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"⏳ Rate Limit Hit (429) for {topic['sub']} (Batch {index}). Sleeping for 30s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(30)
            else:
                print(f"⚠️ HTTP Error for {topic['sub']} (Batch {index}): {e.code}")
                time.sleep(5)
        except Exception as e:
            print(f"⚠️ Error for {topic['sub']} (Batch {index}): {e}")
            time.sleep(5)

def main():
    print("🚀 INITIALIZING MASSIVE 1500+ DIRECT DATABASE INJECTION WITH RATE LIMIT HANDLING...")
    
    total_topics = len(TOPICS)
    for topic_idx, topic in enumerate(TOPICS, 1):
        print(f"\\n--- Processing Topic {topic_idx}/{total_topics}: {topic['sub']} ---")
        for batch_idx in range(1, BATCHES_PER_SUBTOPIC + 1):
            generate_batch(topic, batch_idx)
            # Sleep aggressively between batches to avoid the 2 RPM (Requests Per Minute) free tier limit
            print("Zzz... sleeping for 30 seconds to respect Gemini 2.5 Pro Free Tier...")
            time.sleep(30) 
            
    print("\\n\\n🎉 MASSIVE DEPLOYMENT COMPLETED!")

if __name__ == "__main__":
    main()
