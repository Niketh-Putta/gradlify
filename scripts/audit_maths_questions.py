import os
import json
import urllib.request
import urllib.error
import urllib.parse
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

def get_env_vars():
    env_vars = {}
    env_path = os.path.join(os.path.dirname(__file__), '../.env')
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    match = re.match(r'^([^=]+)=(.*)$', line.strip())
                    if match:
                        key = match.group(1).strip()
                        val = match.group(2).strip().strip('"').strip("'")
                        env_vars[key] = val
    except Exception as e:
        print(f"Could not read .env: {e}")
    return env_vars

env_vars = get_env_vars()
SUPABASE_URL = env_vars.get('SUPABASE_URL') or env_vars.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')
GEMINI_API_KEY = env_vars.get('GEMINI_API_KEY')

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    print("Cannot run audit: Missing required keys in .env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY")
    sys.exit(1)

def fetch_11plus_maths_questions(offset=0, limit=1000):
    # Fetch questions filtered EXCLUSIVELY for 11plus track to prevent GCSE contamination
    params = urllib.parse.urlencode({
        'select': 'id,question,correct_answer,wrong_answers,all_answers,subtopic,question_type',
        'track': 'eq.11plus'
    })
    url = f"{SUPABASE_URL}/rest/v1/exam_questions?{params}"
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f"Bearer {SUPABASE_KEY}",
        'Range-Unit': 'items',
        'Range': f'{offset}-{offset+limit-1}'
    })
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Failed to fetch questions chunk: {e}")
        return []

def audit_question_with_ai(q):
    prompt = f"""
You are an expert Mathematics Examiner checking an 11+ (primary school leaving age) exam question.
CRITICAL INSTRUCTION: You must verify if the question is mathematically ACCURATE, UNAMBIGUOUS, and SOLVABLE given the correct answer provided.
If there are alternative representations (e.g. "45R31" meaning "45 remainder 31"), do not flag them if they are technically correct math.
Check for any logical flaws, missing numbers, or calculation errors in the logic that makes the provided correct answer wrong.

Respond ONLY with a valid JSON object in this format:
{{
   "isCorrect": true/false,
   "reason": "Explain the exact calculation error or missing detail if false, otherwise leave an empty string"
}}

Question: {q.get('question')}
Intended Correct Answer: {q.get('correct_answer')}
Other Given Answers: {q.get('all_answers') or q.get('wrong_answers')}
"""

    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    data = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0}
    }).encode('utf-8')
    
    req = urllib.request.Request(gemini_url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read())
            text = resp_data['candidates'][0]['content']['parts'][0]['text']
            
            # Clean markdown JSON wraps
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                text = text.split('```')[1].split('```')[0].strip()
                
            return json.loads(text)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8', errors='ignore')
        print(f"[!] HTTP {e.code} Error calling AI for Q {q['id']}. Details: {error_body}")
        return None
    except Exception as e:
        print(f"[!] Error calling AI for Q {q['id']}: {e}")
        return None

if __name__ == "__main__":
    print("Initiating full sweep of 11+ Maths Question Bank...")

    # 1. Fetch
    all_questions = []
    current_offset = 0
    chunk_size = 1000
    while True:
        chunk = fetch_11plus_maths_questions(offset=current_offset, limit=chunk_size)
        if not chunk:
            break
        all_questions.extend(chunk)
        if len(chunk) < chunk_size:
            break
        current_offset += chunk_size
    
    print(f"✅ Successfully fetched {len(all_questions)} 11+ questions strictly separated from GCSEs.")
    if len(all_questions) == 0:
        sys.exit(0)

    # 2. Audit concurrently
    print(f"🧠 Dispatching calculations to Gemini API... This will take a few minutes depending on volume.")
    flagged_results = []
    
    # Process with max 4 workers to respect basic rate limits, adjust if API supports more
    processed = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(audit_question_with_ai, q): q for q in all_questions}
        
        for future in as_completed(futures):
            q = futures[future]
            processed += 1
            if processed % 50 == 0:
                print(f"Progress: {processed}/{len(all_questions)}")
                
            res = future.result()
            if res and not res.get('isCorrect', True):
                print(f"🚨 FLAGGED Q ID {q['id']}: {res.get('reason')}")
                flagged_results.append({
                    "id": q['id'],
                    "question": q['question'],
                    "correct_answer": q.get('correct_answer'),
                    "reason_flagged": res.get('reason'),
                    "subtopic": q.get("subtopic"),
                    "question_type": q.get("question_type")
                })

    # 3. Output payload
    output_path = os.path.join(os.path.dirname(__file__), 'maths_audit_error_report.json')
    with open(output_path, 'w') as f:
        json.dump(flagged_results, f, indent=2)

    print("=" * 50)
    print(f"✅ Audit Complete! Checked {len(all_questions)} 11+ questions.")
    print(f"🚨 Found {len(flagged_results)} potentially inaccurate questions.")
    print(f"📄 Report written to: {output_path}")
