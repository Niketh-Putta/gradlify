import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env')
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

response = supabase.table("exam_questions").select("id, question, correct_answer, wrong_answers").eq("track", "11plus").execute()
rows = response.data

print(f"Total 11plus questions: {len(rows)}")

issues = 0
for row in rows:
    wrong = row.get("wrong_answers") or []
    if len(wrong) < 4:
        issues += 1
    elif any(x.lower().strip() in ["cannot be determined", "none of the above", "cannot tell"] for x in wrong):
        issues += 1
    else:
        # Check if wrong answers are literally just words from the question
        pass

print(f"Total issues: {issues}")
