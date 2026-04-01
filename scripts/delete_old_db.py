import sys
import urllib.request
from urllib.error import HTTPError

URL = "https://gknnfbalijxykqycopic.supabase.co/rest/v1/exam_questions?track=eq.11plus"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"

req = urllib.request.Request(URL, method="DELETE")
req.add_header("apikey", SERVICE_KEY)
req.add_header("Authorization", f"Bearer {SERVICE_KEY}")

print("Attempting to delete old 11+ questions from Supabase...")
try:
    with urllib.request.urlopen(req) as response:
        print(f"✅ Success: Old 11+ questions deleted. Status: {response.status}")
except HTTPError as e:
    print(f"❌ Failed to delete: {e}")
    try:
        print(e.read().decode())
    except:
        pass
except Exception as e:
    print(f"❌ Error: {e}")
