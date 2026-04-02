import json
import os
import time
import uuid
import requests

def generate_system_prompt(section_id: str, subtopic: str, difficulty: int) -> str:
    diff_guide = {
        1: "LEVEL 1 (Foundation): Accessible vocabulary, obvious metaphorical traps.",
        2: "LEVEL 2 (Standard): Challenging 11+ vocabulary. Difficult, overlapping traps.",
        3: "LEVEL 3 (Scholarship/Elite): Dense, archaic, or complex metaphors. Nuanced traps."
    }
    return f"""
You are an elite, £1,000/year 11+ Grammar School Entrance Exam author.
Generate ONE highly rigorous "Master Passage" with exactly 10 multiple-choice questions.
Target Section: {section_id.upper()}
Target Subtopic: {subtopic.upper()}
Target Difficulty: {diff_guide[difficulty]}

OUTPUT FORMAT: Return ONLY valid JSON matching this schema exactly (no markdown blockers):
{{
  "id": "eng-passage-uuid",
  "track": "11plus",
  "sectionId": "{section_id}",
  "subtopic": "{subtopic}",
  "difficulty": {difficulty},
  "tier": "Level Tier String",
  "title": "Passage Title",
  "desc": "Instructional text.",
  "passageBlocks": [
    {{ "id": "p1", "text": "Paragraph 1 text..." }}
  ],
  "questions": [
    {{
      "id": "eng-q-uuid",
      "tag": "Mechanic tested",
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

def generate_passage(api_key: str, section: str, subtopic: str, difficulty: int):
    prompt = generate_system_prompt(section, subtopic, difficulty)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7}
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        res_json = response.json()
        return json.loads(res_json["candidates"][0]["content"]["parts"][0]["text"])
    except Exception as e:
        print(f"Gen failed: {e}")
        return None

def patch():
    api_key = os.getenv("GEMINI_API_KEY")
    output_path = 'supabase/data/generated/11plus_premium_english_bank.json'
    
    with open(output_path, 'r') as f:
        existing_data = json.load(f)
        
    gaps = [
        {"section": "comprehension", "subtopic": "fiction", "diff": 2},
        {"section": "vocabulary", "subtopic": "vocabulary", "diff": 1},
        {"section": "vocabulary", "subtopic": "vocabulary", "diff": 2},
        {"section": "vocabulary", "subtopic": "vocabulary", "diff": 3}
    ]
    
    for gap in gaps:
        print(f"Patching {gap['section']} | {gap['subtopic']} | Level {gap['diff']}")
        data = generate_passage(api_key, gap["section"], gap["subtopic"], gap["diff"])
        if data:
            data["id"] = f"eng-passage-{uuid.uuid4().hex[:8]}"
            existing_data.append(data)
            with open(output_path, 'w') as f:
                json.dump(existing_data, f, indent=2)
                
    print(f"DONE. Total passages: {len(existing_data)}")

if __name__ == "__main__":
    patch()
