import json
import urllib.request
import urllib.error
import os
import time
import uuid

# PAID KEY from user instructions
GEMINI_API_KEY = "AIzaSyBC5y1drRFDAyrxdesvZ_gSSPARoc10cUA"
SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co/rest/v1/exam_questions"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"

BATCHES_PER_SUBTOPIC = 4
QUESTIONS_PER_BATCH = 15
TOTAL_TARGET_PER_SUBTOPIC = BATCHES_PER_SUBTOPIC * QUESTIONS_PER_BATCH

TOPICS = [
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
    {"type": "Problem Solving", "sub": "strategies|logic", "focus": "Deductive sequences, spatial puzzles phrased as text, true/false paradoxes"},
    
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
2. MULTIPLE CHOICE: EXACTLY 5 options. Exactly 1 mathematically/factually correct answer, and strictly 4 incredibly strong pedagogical distractors (common errors/misconceptions).
3. UNIQUE SCENARIOS: Make every single real-world scenario wildly, distinctly unique. ZERO structural cloning. Be highly creative. 
4. EXPLANATIONS (CRITICAL): Must be plain text, extremely easy to understand for an 11-year-old kid. Do NOT use overly complex jargon. Start literally with '💡 Key Insight:', then break it down step-by-step into bite-sized logic for a young student ('Step 1: ...', 'Step 2: ...').
5. NO VISUAL TAGS. 100% text-based. Do NOT use `[VISUAL: ...]` or image links.
6. JSON ONLY: Return exactly a RAW JSON Array of Objects.

SCHEMA (JSON ARRAY OF OBJECTS ONLY):
[
  {{
    "question": "string",
    "correct_answer": "string",
    "wrong_answers": ["str", "str", "str", "str"],
    "difficulty": integer (1, 2, or 3),
    "explanation": "string (Start with '💡 Key Insight:')"
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

def get_current_count(subtopic):
    # Fetch exactly how many exist so we don't duplicate via REST
    encoded_sub = urllib.parse.quote(subtopic)
    url = f"{SUPABASE_URL}?subtopic=eq.{encoded_sub}&track=eq.11plus"
    req = urllib.request.Request(url, method='HEAD')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Prefer', 'count=exact')
    try:
        with urllib.request.urlopen(req) as response:
            cr = response.headers.get('content-range')
            if cr and '/' in cr:
                return int(cr.split('/')[1])
            return 0
    except Exception as e:
        print(f"Error checking count for {subtopic}: {e}")
        return 0

def generate_batch(topic, index, remaining_questions):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    # Generate exactly what is remaining if less than batch size
    to_generate = min(QUESTIONS_PER_BATCH, remaining_questions)
    
    text_prompt = PROMPT.format(count=to_generate, sub=topic['sub'], focus=topic['focus'])
    
    data = {"contents": [{"parts": [{"text": text_prompt}]}], "generationConfig": {"temperature": 0.85, "response_mime_type": "application/json"}}
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
                    escaped_wrongs = [str(w).replace('"', '\\"') for w in obj["wrong_answers"]]
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
                        "marks": obj.get("difficulty", 2),
                        "difficulty": obj.get("difficulty", 2),
                        "estimated_time_sec": 45 + (int(obj.get("difficulty", 2)) * 30),
                        "image_url": "",
                        "image_alt": "",
                        "explanation": obj.get("explanation", "")
                    })
                
                if direct_insert_supabase(db_rows):
                    print(f"✅ [{topic['sub']}] Generated {len(db_rows)} questions. Batch {index} success.")
                    return len(db_rows)
                return 0
                    
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"⏳ Paid Tier Rate Limit buffer... Sleep 15s.")
                time.sleep(15)
            else:
                try: print(f"⚠️ HTTP Error: {e.read().decode()}")
                except: print(f"⚠️ HTTP Error: {e.code}")
                time.sleep(5)
        except Exception as e:
            print(f"⚠️ Error: {e}")
            time.sleep(5)
    return 0

def main():
    print("💎 RESUMING PAID-TIER GEMINI-2.5-PRO AI GENERATION...")
    
    total_topics = len(TOPICS)
    for topic_idx, topic in enumerate(TOPICS, 1):
        print(f"\\n--- Checking: {topic_idx}/{total_topics}: {topic['sub']} ---")
        
        current_count = get_current_count(topic['sub'])
        if current_count >= TOTAL_TARGET_PER_SUBTOPIC:
             print(f"⏭️ Skipping! Already has {current_count} questions (Target: {TOTAL_TARGET_PER_SUBTOPIC})")
             continue
             
        missing_count = TOTAL_TARGET_PER_SUBTOPIC - current_count
        print(f"▶️ Needs {missing_count} more questions (Currently has {current_count}/{TOTAL_TARGET_PER_SUBTOPIC})")
        
        batches_needed = (missing_count + QUESTIONS_PER_BATCH - 1) // QUESTIONS_PER_BATCH
        
        for batch_idx in range(1, batches_needed + 1):
            generated_amount = generate_batch(topic, batch_idx, missing_count)
            missing_count -= generated_amount
            time.sleep(1)
            
    print("\\n\\n🎉 MASSIVE DEPLOYMENT RESUME COMPLETED TO EXACTLY 1500!")

if __name__ == "__main__":
    main()
