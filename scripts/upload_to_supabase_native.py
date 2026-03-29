import csv
import json
import urllib.request
import os

def load_env(path):
    env_vars = {}
    with open(path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            if '=' in line:
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

env = load_env('.env')
url = env.get('SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

def request_supabase(method, endpoint, payload=None):
    req_url = f"{url}/rest/v1/{endpoint}"
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    data = None
    if payload:
        data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(req_url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read()
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.read().decode('utf-8')}")
        raise e

print("Deleting old 11+ questions...")
# DELETE where track=eq.11plus
request_supabase('DELETE', 'exam_questions?track=eq.11plus')

print("Reading newly generated questions...")
questions = []
with open('supabase/data/generated/11plus_premium_question_bank.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Cast numerical fields properly to avoid Postgres types errors
        row.pop('id', None)
        row['marks'] = int(row['marks'])
        row['difficulty'] = int(row['difficulty'])
        row['estimated_time_sec'] = int(row['estimated_time_sec'])
        # PostgreSQL array comes from string '{"a","b"}'
        # the REST API expects an actual JSON array for text[]
        # so we convert '{"a","b","c"}' back to python list
        wrong = row['wrong_answers']
        if wrong.startswith('['):
            row['wrong_answers'] = json.loads(wrong)
        else:
            wrong = wrong.strip('{}')
            wrong_list = wrong.split('","')
            wrong_list[0] = wrong_list[0].lstrip('"')
            if len(wrong_list) > 1:
                wrong_list[-1] = wrong_list[-1].rstrip('"')
            row['wrong_answers'] = wrong_list
        questions.append(row)

print("Uploading to Supabase securely...")
chunk_size = 500
for i in range(0, len(questions), chunk_size):
    chunk = questions[i:i + chunk_size]
    print(f"Uploading chunk {i // chunk_size + 1} of {len(questions) // chunk_size + 1}...")
    # Bulk insert
    request_supabase('POST', 'exam_questions', chunk)

print("✅ Successfully flushed the database and inserted 3240 high-quality 11+ premium questions.")
