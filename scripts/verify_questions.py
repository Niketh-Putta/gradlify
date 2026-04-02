import urllib.request
import json
import os

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

req_url = f"{url}/rest/v1/english_passages?select=id,questions"
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}'
}

req = urllib.request.Request(req_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

total_qs = 0
anomalies = []
for p in data:
    length = len(p['questions'])
    total_qs += length
    if length != 10:
        anomalies.append(f"Passage {p['id']} has {length} questions")

print(f"Total Passages Assessed: {len(data)}")
print(f"Actual Question Count Total: {total_qs}")
print(f"Perfect Mathematically Expectation: {len(data) * 10}")

if anomalies:
    print(f"Anomalies detected: {len(anomalies)}" )
    for a in anomalies[:10]: print(a)
else:
    print("Zero anomalies. Every single passage strictly contains exactly 10 questions.")
