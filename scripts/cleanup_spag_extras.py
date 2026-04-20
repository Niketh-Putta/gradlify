
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

def request_supabase(method, endpoint, query="", payload=None):
    req_url = f"{url}/rest/v1/{endpoint}"
    if query:
        req_url += f"?{query}"
    
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(req_url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error during {method} {req_url}")
        raise e

# 1. Load the 45 IDs we want to KEEP
with open('45_ids.txt', 'r') as f:
    keep_ids = set(line.strip() for line in f if line.strip())

print(f"Loaded {len(keep_ids)} IDs to keep.")

# 2. Fetch all current SPaG-related passages
# Using a filter to find subtopic in (spelling, punctuation, grammar)
subtopics = "spelling,punctuation,grammar"
all_spag = request_supabase('GET', 'english_passages', f"subtopic=in.({subtopics})&select=id")

ids_to_delete = []
for p in all_spag:
    if p['id'] not in keep_ids:
        ids_to_delete.append(p['id'])

if not ids_to_delete:
    print("No stray passages found to delete.")
    exit(0)

print(f"Found {len(ids_to_delete)} passages to delete: {ids_to_delete}")

# 3. Delete them
# Supabase allows 'id=in.(id1,id2...)'
query_ids = ",".join(ids_to_delete)
deleted = request_supabase('DELETE', 'english_passages', f"id=in.({query_ids})")

print(f"✅ Successfully deleted {len(deleted)} unwanted passages. Total SPaG count should now be 45.")
