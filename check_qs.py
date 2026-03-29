import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env')

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Missing credentials")
    sys.exit(1)

supabase: Client = create_client(url, key)

try:
    response = supabase.table("exam_questions").select("topic", "subtopic").eq("track", "11plus").execute()
    
    counts = {}
    for row in response.data:
        k = f"{row.get('topic')} -> {row.get('subtopic')}"
        counts[k] = counts.get(k, 0) + 1
        
    print("COUNTS:")
    for k, v in counts.items():
        print(f"{k}: {v}")
except Exception as e:
    print("Error:", e)
