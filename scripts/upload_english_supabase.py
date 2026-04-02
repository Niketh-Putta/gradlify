import json
import urllib.request
import os

def load_env(path):
    env_vars = {}
    with open(path, 'r') as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

env = load_env('.env')
url = env.get('SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("Missing keys!")
    exit(1)

def request_supabase(method, endpoint, payload=None):
    req_url = f"{url}/rest/v1/{endpoint}"
    # Prefer return=minimal is faster for bulk inserts
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal, resolution=merge-duplicates'
    }
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(req_url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read()
    except Exception as e:
        print(f"Error: {e.read().decode('utf-8')}")
        raise e

print("Loading the new nested 11+ English Premium JSON Bank...")
with open('supabase/data/generated/11plus_premium_english_bank.json', 'r') as f:
    master_passages = json.load(f)

formatted_data = []
for passage in master_passages:
    formatted_data.append({
        "id": passage.get("id"),
        "track": "11plus",
        "sectionId": passage.get("sectionId", ""),
        "subtopic": passage.get("subtopic", ""),
        "difficulty": passage.get("difficulty", 1),
        "tier": passage.get("tier", "Level 1"),
        "title": passage.get("title", "Passage"),
        "desc": passage.get("desc", ""),
        "passageBlocks": passage.get("passageBlocks", []),
        "questions": passage.get("questions", [])
    })

print(f"Pushing {len(formatted_data)} Master Passages ({len(formatted_data)*10} nested questions) into your shiny new 'english_passages' table...")

# We inject in small chunks for robustness
chunk_size = 50
for i in range(0, len(formatted_data), chunk_size):
    chunk = formatted_data[i:i+chunk_size]
    request_supabase('POST', 'english_passages', chunk)

print("✅ Successfully pushed ALL Master Passages securely into your new table!")
