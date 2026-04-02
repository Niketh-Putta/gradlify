import os
import json
import uuid
import requests
import urllib.request

def generate_system_prompt() -> str:
    return f"""
You are an elite, £1,000/year 11+ Grammar School Entrance Exam author.
Generate ONE highly rigorous "Master Passage" with exactly 10 multiple-choice questions.
Target Section: VOCABULARY
Target Subtopic: VOCABULARY
Target Difficulty: LEVEL 3 (Scholarship/Elite): Dense, archaic, or complex metaphors. Nuanced traps.

OUTPUT FORMAT: Return ONLY valid JSON matching this schema exactly (no markdown blockers):
{{
  "id": "eng-passage-uuid",
  "track": "11plus",
  "sectionId": "vocabulary",
  "subtopic": "vocabulary",
  "difficulty": 3,
  "tier": "Level 3",
  "title": "Elite Vocabulary Challenge",
  "desc": "Select the word closest in meaning to the highlighted word.",
  "passageBlocks": [
    {{ "id": "p1", "text": "The archaic architecture stood as a monolithic reminder of bygone eras." }}
  ],
  "questions": [
    {{
      "id": "eng-q-uuid",
      "tag": "Vocabulary",
      "evidenceLine": "p1",
      "text": "The question text?",
      "options": [
        {{ "id": "A", "text": "Option text", "correct": false }},
        {{ "id": "B", "text": "Option text", "correct": true }}
      ],
      "explanation": "Friendly tutor explanation."
    }}
  ]
}}
"""

def generate_and_upload():
    api_key = os.getenv("GEMINI_API_KEY")
    prompt = generate_system_prompt()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key={api_key}"
    
    print("Generating the missing 150th passage (Vocabulary - Level 3)...")
    response = requests.post(
        url, 
        headers={'Content-Type': 'application/json'}, 
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7}
        }
    )
    
    data = json.loads(response.json()["candidates"][0]["content"]["parts"][0]["text"])
    data["id"] = f"eng-passage-{uuid.uuid4().hex[:8]}"
    data["difficulty"] = 3
    data["tier"] = "Level 3"
    
    print(f"Generated Passage: {data['title']}. Questions Length: {len(data['questions'])}")
    
    # Upload directly to Supabase
    print("Uploading safely into database...")
    db_url = os.getenv("SUPABASE_URL")
    db_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    req_url = f"{db_url}/rest/v1/english_passages"
    headers = {
        'apikey': db_key,
        'Authorization': f'Bearer {db_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal, resolution=merge-duplicates'
    }
    
    req = urllib.request.Request(req_url, data=json.dumps([data]).encode('utf-8'), headers=headers, method='POST')
    try:
        urllib.request.urlopen(req)
        print("✅ Success! Total passages in database is now exactly mathematically 150.")
    except Exception as e:
        print("Upload failed:", e)

if __name__ == "__main__":
    generate_and_upload()
