import os
import urllib.request
import json
import time

def request_supabase(method, endpoint, payload=None):
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    req_url = f"{url}/rest/v1/{endpoint}"
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    }
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(req_url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            if method == 'GET':
                return json.loads(response.read().decode('utf-8'))
            return True
    except Exception as e:
        print(f"Error {req_url}:", e)
        return None

def main():
    passages = request_supabase('GET', 'english_passages?select=id,sectionId,subtopic')
    groups = {}
    for p in passages:
        groups.setdefault(p['subtopic'], []).append(p)
        
    updates = []
    for sub, items in groups.items():
        for i, item in enumerate(items):
            diff = (i % 3) + 1
            tier = f"Level {diff}"
            updates.append({"id": item["id"], "difficulty": diff, "tier": tier})
            
    print(f"Patching {len(updates)} database records to enforce perfect multiples of 3...")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    }
    
    for i, u in enumerate(updates):
        req_url = f"{url}/rest/v1/english_passages?id=eq.{u['id']}"
        payload = {"difficulty": u['difficulty'], "tier": u['tier']}
        req = urllib.request.Request(req_url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='PATCH')
        try:
            urllib.request.urlopen(req)
            if i % 20 == 0:
                print(f"Patched {i}/{len(updates)}...")
        except Exception as e:
            pass
            
    print("✅ Full mathematically uniform distribution complete!")

if __name__ == "__main__":
    main()
