import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

res = supabase.rpc("fetch_exam_questions_v3", {
    "p_tiers": ["11+ Standard"],
    "p_calculators": ["Non-Calculator"],
    "p_question_types": ["Geometry & Measures"],
    "p_subtopics": ["geometry|2d-3d-shapes", "geometry.2d-3d-shapes", "geometry,2d-3d-shapes"],
    "p_difficulty_min": 1,
    "p_difficulty_max": 3,
    "p_track": "11plus",
    "p_exclude_ids": None,
    "p_limit": 5
}).execute()

print("RPC Data count:", len(res.data))
for r in res.data:
    print(r.get('id'), r.get('question_type'), r.get('tier'))

data = supabase.table("exam_questions").select("id, question_type, tier").eq("tier", "11+ Standard").in_("question_type", ["Number & Arithmetic", "Algebra"]).limit(2).execute()
print("\nDirect SELECT:", data.data)
