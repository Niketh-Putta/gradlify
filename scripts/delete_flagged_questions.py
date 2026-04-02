import os
import json
import urllib.request
import urllib.parse
import sys

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

import re
env_vars = get_env_vars()
SUPABASE_URL = env_vars.get('SUPABASE_URL') or env_vars.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Cannot proceed: Missing required keys in .env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

def delete_flagged_questions():
    report_path = os.path.join(os.path.dirname(__file__), 'maths_audit_error_report.json')
    try:
        with open(report_path, 'r') as f:
            flagged = json.load(f)
    except FileNotFoundError:
        print("Report not found.")
        return
        
    ids_to_delete = [item['id'] for item in flagged]
    print(f"Deleting {len(ids_to_delete)} questions...")
    
    # We can delete them in chunks using `in` operator
    chunk_size = 50
    for i in range(0, len(ids_to_delete), chunk_size):
        chunk = ids_to_delete[i:i+chunk_size]
        ids_str = ",".join(chunk)
        query = f"id=in.({ids_str})"
        url = f"{SUPABASE_URL}/rest/v1/exam_questions?{query}"
        req = urllib.request.Request(url, method='DELETE', headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f"Bearer {SUPABASE_KEY}"
        })
        try:
            with urllib.request.urlopen(req) as resp:
                pass
        except Exception as e:
            print(f"Error calling DELETE: {e}")

    print("Deletion completed.")

def get_question_split():
    params = urllib.parse.urlencode({
        'select': 'subtopic,question_type',
        'track': 'eq.11plus'
    })
    url = f"{SUPABASE_URL}/rest/v1/exam_questions?{params}"
    
    all_qs = []
    offset = 0
    limit = 1000
    while True:
        req = urllib.request.Request(url, headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f"Bearer {SUPABASE_KEY}",
            'Range': f'{offset}-{offset+limit-1}',
            'Range-Unit': 'items'
        })
        try:
            with urllib.request.urlopen(req) as response:
                chunk = json.loads(response.read())
                if not chunk:
                    break
                all_qs.extend(chunk)
                if len(chunk) < limit:
                    break
                offset += limit
        except Exception as e:
            print(f"Failed to fetch questions chunk: {e}")
            break
            
    print(f"Total remaining 11+ Maths Questions: {len(all_qs)}")
    split = {}
    for q in all_qs:
        qt = q.get('question_type')
        if qt not in split:
            split[qt] = 0
        split[qt] += 1
        
    print("--- SPLIT BY QUESTION TYPE ---")
    for category, count in split.items():
        print(f"{category}: {count}")
        
    subtopic_split = {}
    for q in all_qs:
        st = q.get('subtopic')
        if st not in subtopic_split:
            subtopic_split[st] = 0
        subtopic_split[st] += 1
        
    print("--- SPLIT BY SUBTOPIC ---")
    for category, count in subtopic_split.items():
        print(f"{category}: {count}")

if __name__ == "__main__":
    delete_flagged_questions()
    get_question_split()
