import json
import urllib.request
import urllib.error
import os
import time
import uuid

# PAID KEY:
GEMINI_API_KEY = "AIzaSyAwYpF8asDe70YrZbe9X-c_09anHx7LU7I"
SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co/rest/v1/exam_questions"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"

BATCHES_PER_SUBTOPIC = 4
QUESTIONS_PER_BATCH = 15
TOTAL_TARGET_PER_SUBTOPIC = BATCHES_PER_SUBTOPIC * QUESTIONS_PER_BATCH

TOPICS = [
    {"type": "Number & Arithmetic", "sub": "number|negative-numbers", "focus": "Temperature changes, adding/subtracting across zero, inequalities with negative numbers"},
    {"type": "Number & Arithmetic", "sub": "number|roman-numerals", "focus": "Converting to and from Roman numerals up to 1000 (M), arithmetic using Roman numerals"},
    {"type": "Number & Arithmetic", "sub": "number|word-problems", "focus": "Multi-step puzzles, ticket pricing, combinations, shopping bills, logical deduction"},
    {"type": "Algebra & Ratio", "sub": "algebra|function-machines", "focus": "One and two-step function machines, finding inputs from outputs, composite machines"},
    {"type": "Geometry & Measures", "sub": "geometry|symmetry-reflection", "focus": "Lines of symmetry, order of rotational symmetry, reflecting shapes across diagonal lines, nets of cubes"},
    {"type": "Statistics & Data", "sub": "stats|venn-diagrams", "focus": "Sorting numbers and properties into Venn diagrams, intersection, union, reading two or three circle diagrams"},
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

def generate_batch(topic, index):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    text_prompt = PROMPT.format(count=QUESTIONS_PER_BATCH, sub=topic['sub'], focus=topic['focus'])
    
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
    print("💎 LAUNCHING ADDITIONAL MATHS BATCH FOR EXACTLY 1500 MATHS QUESTIONS...")
    
    total_topics = len(TOPICS)
    for topic_idx, topic in enumerate(TOPICS, 1):
        print(f"\\n--- Generating: {topic_idx}/{total_topics}: {topic['sub']} ---")
        for batch_idx in range(1, BATCHES_PER_SUBTOPIC + 1):
            generate_batch(topic, batch_idx)
            time.sleep(1)
            
    print("\\n\\n🎉 COMPLETE! 360 NEW MATHS QUESTIONS INJECTED!")

if __name__ == "__main__":
    main()
