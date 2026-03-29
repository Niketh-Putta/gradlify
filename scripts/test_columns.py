import urllib.request
import json

SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"

url = f"{SUPABASE_URL}/rest/v1/exam_questions?limit=1"
headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))
    if data:
        print("Columns:", list(data[0].keys()))
