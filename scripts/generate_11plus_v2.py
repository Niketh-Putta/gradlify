import json
import urllib.request
import os
import csv
import time
import uuid

# Load environment variables manually to avoid dependency on python-dotenv
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    k, v = line.strip().split('=', 1)
                    os.environ[k] = v

load_env()

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY not found in .env files.")
    exit(1)

OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "data", "generated", "11plus_v2_premium_batch.csv")

# We will generate batches for different subtopics
SUBTOPICS = [
    {"question_type": "Algebra & Ratio", "subtopic": "algebra|ratio", "focus": "Sharing quantities, multi-step ratio changes, equivalent ratios, difference between shares"},
    {"question_type": "Problem Solving & Strategies", "subtopic": "strategies|word-problems", "focus": "Multi-step contextual word problems involving time, money, and combinations"},
    {"question_type": "Geometry & Measures", "subtopic": "geometry|perimeter-area", "focus": "Compound shapes, working backward from area/perimeter to find dimensions, applying algebra to shapes"}
]

SYSTEM_PROMPT = """
You are an expert Cambridge-educated 11+ Independent School Assessment writer. 
Your goal is to generate extremely high-quality, non-repetitive multiple-choice questions for the 11+ Maths exam.

CRITICAL RULES:
1. NO DIAGRAMS OR VISUALS. Do NOT use `[VISUAL: ...]` tags in explanations.
2. FIVE OPTIONS EXACTLY: 1 correct answer, and strictly 4 pedagogical distractors (wrong answers).
3. UNIQUE SCENARIOS: Every question MUST use a completely distinct real-world or abstract scenario. Do not clone questions by just changing the numbers.
4. DISTRACTORS MUST BE PEDAGOGICAL: Wrong answers cannot be random. They must represent common student errors (e.g., stopping halfway, inverse operation, misplacing decimal, forgetting to simplify).
5. CLEAR DIFFICULTY JUMPS:
   - Level 1 (Fluency): Direct standard 11+ application. (E.g. Simple word problem, 1 or 2 steps).
   - Level 2 (Application): Must be much harder. Working backwards, or applying a concept in an unfamiliar format.
   - Level 3 (Synthesis/Reasoning): Independent school scholarship level. Must fuse two mathematical topics (e.g. Ratio + Fractions, or Geometry + Algebra) and require 3+ logical steps. 
6. EXPLANATIONS: Must be purely structural text. Start with a 💡 Key Insight on the first line. Then provide Step 1:, Step 2: etc. End with 'Final answer: X'.

OUTPUT STRICTLY AS JSON.
"""

def generate_questions_for_topic(topic_info, num_per_level=2):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={API_KEY}"
    
    prompt = f"""
    Generate {num_per_level} questions for Level 1, {num_per_level} for Level 2, and {num_per_level} for Level 3 for the maths subtopic: {topic_info['subtopic']}.
    Focus specifically on: {topic_info['focus']}
    
    Return the output as a JSON array of objects. Do NOT use markdown code blocks like ```json. Just return the raw JSON array.
    
    EACH OBJECT SCHEMA:
    {{
        "question": "string",
        "correct_answer": "string",
        "wrong_answers": ["string", "string", "string", "string"],
        "difficulty": integer (1, 2, or 3),
        "explanation": "string (start with 💡 Key Insight, then Step 1, Step 2, etc. NO visuals tags.)"
    }}
    """
    
    data = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": [{
            "parts": [{"text": prompt}]
        }],
         "generationConfig": {
            "temperature": 0.5,
            "response_mime_type": "application/json"
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            text_response = result['candidates'][0]['content']['parts'][0]['text']
            return json.loads(text_response)
    except Exception as e:
        print(f"Error generating for {topic_info['subtopic']}: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode())
        return []

def main():
    questions_data = []
    
    print("🚀 Starting V2 11+ Question Generation using Gemini...")
    for topic in SUBTOPICS:
        print(f"Generating batch for {topic['subtopic']}...")
        batch = generate_questions_for_topic(topic, num_per_level=3) # 9 questions per topic
        
        for q in batch:
            row = {
                "id": str(uuid.uuid4()),
                "question_type": topic['question_type'],
                "tier": "11+ Standard",
                "calculator": "Non-Calculator",
                "track": "11plus",
                "subtopic": topic['subtopic'],
                "question": q["question"],
                "correct_answer": q["correct_answer"],
                "wrong_answers": json.dumps(q["wrong_answers"]), # Will format as raw JSON array string for postgres
                "marks": q["difficulty"], # Marks scale with difficulty
                "difficulty": q["difficulty"],
                "estimated_time_sec": 45 + (q["difficulty"] * 30), # L1=75s, L2=105s, L3=135s
                "image_url": "",
                "image_alt": "",
                "explanation": q["explanation"]
            }
            # postgres prefers array format. Since supabase-js parses it, we can just dump a python array format if needed
            # wait, the db uses postgres array strings like '{"A","B","C"}'. 
            # We'll build the postgres string format explicitly
            escaped_wrongs = [w.replace('"', '\\"') for w in q["wrong_answers"]]
            row["wrong_answers"] = '{' + ','.join([f'"{w}"' for w in escaped_wrongs]) + '}'
            
            questions_data.append(row)
            
        time.sleep(2) # Avoiding rate limits
        
    # Write to CSV
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ["id", "question_type", "tier", "calculator", "track", "subtopic", "question", "correct_answer", "wrong_answers", "marks", "difficulty", "estimated_time_sec", "image_url", "image_alt", "explanation"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(questions_data)
        
    print(f"✅ Successfully written {len(questions_data)} extremely high quality questions to {OUTPUT_FILE}")
    print("  You can import these into Supabase or check the file!")

if __name__ == "__main__":
    main()
