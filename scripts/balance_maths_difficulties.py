import os
import urllib.request
import json
import uuid

# Configuration
SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"

def fetch_all_maths_11plus():
    all_data = []
    page = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/exam_questions?select=id,question,question_type&track=eq.11plus&question_type=neq.English%20SPaG&offset={page * 1000}&limit=1000"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        req = urllib.request.Request(url, headers=headers, method='GET')
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                if not data:
                    break
                all_data.extend(data)
                page += 1
        except Exception as e:
            print(f"Error fetching page {page}: {e}")
            break
    return all_data

def patch_difficulty(question_id, difficulty):
    url = f"{SUPABASE_URL}/rest/v1/exam_questions?id=eq.{question_id}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    payload = {
        "difficulty": difficulty,
        "marks": difficulty, # Synchronize marks with difficulty for 11+
        "tier": "11+ Standard"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='PATCH')
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except Exception as e:
        print(f"Error patching {question_id}: {e}")
        return False

def main():
    print("🔍 Fetching 11+ Maths questions...")
    questions = fetch_all_maths_11plus()
    total = len(questions)
    print(f"✅ Found {total} questions.")
    
    # Sort them by question type and text to ensure a deterministic assignment
    questions.sort(key=lambda x: (x.get('question_type', ''), x.get('question', '')))
    
    per_level = total // 3
    remainder = total % 3
    
    # We want to distribute the remainder slightly if needed, 
    # but 1,989 / 3 = 663 exactly.
    
    print(f"🎯 Target: {per_level} questions per level.")
    
    updates_made = 0
    for i, q in enumerate(questions):
        # Equal distribution logic
        difficulty = (i % 3) + 1
        
        if patch_difficulty(q['id'], difficulty):
            updates_made += 1
            if updates_made % 50 == 0:
                print(f"🚀 Progress: {updates_made}/{total}...")
                
    print(f"🎉 SUCCESS! Force-balanced {updates_made} Maths questions into a uniform 1/3 split.")

if __name__ == "__main__":
    main()
