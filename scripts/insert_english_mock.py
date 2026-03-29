import urllib.request
import json
import random

SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"

questions = []

comprehension_passage = """**Passage 1: 19th Century Classic**

The fog was so thick it seemed to swallow the cobbled streets of London whole. Eliza pulled her shawl tighter against the biting chill, her footsteps echoing like lonely heartbeats against the damp stone. She had been warned not to venture out past curfew, but the letter in her pocket—heavy with a wax seal that bore the crest of a fallen house—demanded urgency.

Above her, the gas lamps flickered weakly, struggling to pierce the miasma. A sudden clatter from a nearby alleyway made her freeze. Naturally, her mind raced. Was it merely a stray cat, or was she being pursued by the very shadows she sought to evade? The city was a labyrinth of secrets, and she was but a mouse navigating its treacherous corridors.

Clutching the letter, she turned the corner onto Blackwood Avenue. The imposing silhouette of her destination loomed ahead—a manor that had stood empty for a decade, or so the townsfolk whispered. Yet, a single, pale light burned in the highest window."""

for i in range(10):
    correct = "The nuanced answer deriving from the passage."
    wrong = ["A surface-level assumption.", "An exaggerated interpretation.", "A perfectly logical but completely unsupported claim."]
    all_ans = [correct] + wrong
    random.shuffle(all_ans)

    questions.append({
        "question": f"{comprehension_passage}\n\n**Question {i+1}: What implies the main character's true motivation in paragraph {min(i+1, 3)}?**",
        "wrong_answers": wrong,
        "all_answers": all_ans,
        "correct_answer": correct,
        "explanation": "This nuanced answer correctly synthesizes the information from the paragraph.",
        "question_type": "Comprehension",
        "subtopic": "comprehension|fiction",
        "track": "11plus",
        "marks": 1,
        "difficulty": 2,
        "tier": "11+ Standard",
        "calculator": "Non-Calculator",
        "estimated_time_sec": 90
    })

spag_passage = """**Passage 2: Punctuation (Hippos)**

Mention the word hippo and you will probably think of a cute but robust animal that's missing its commas. Waiting in the wings, the students' nerves soared as they listened to the whispers from the crowd."""

for i in range(10):
    correct = "The erroneous segment with the missing comma"
    wrong = ["Segment one of the sentence", "Segment two of the sentence", "Segment four of the sentence"]
    all_ans = [correct] + wrong
    random.shuffle(all_ans)

    questions.append({
        "question": f"{spag_passage}\n\n**Question {i+1}: Identify the punctuation error in this segment.**",
        "wrong_answers": wrong,
        "all_answers": all_ans,
        "correct_answer": correct,
        "explanation": "A comma is required to properly separate the clauses effectively.",
        "question_type": "SPaG",
        "subtopic": "spag|punctuation",
        "track": "11plus",
        "marks": 1,
        "difficulty": 2,
        "tier": "11+ Standard",
        "calculator": "Non-Calculator",
        "estimated_time_sec": 60
    })

vocab_passage = """**Vocabulary Test: Synonyms and Antonyms**

The ancient manor possessed an incredibly scrupulous and meticulous design, ensuring that every stone was perfectly aligned with the cosmos. His lethargic successors failed to maintain the facade, allowing ivy to aggressively pillage the grand stonework."""

for i in range(10):
    correct = "Careless"
    wrong = ["Meticulous", "Honest", "Diligent"]
    all_ans = [correct] + wrong
    random.shuffle(all_ans)

    questions.append({
        "question": f"{vocab_passage}\n\n**Vocabulary Question {i+1}:\nWhich of the following is an antonym for 'Scrupulous'?**",
        "wrong_answers": wrong,
        "all_answers": all_ans,
        "correct_answer": correct,
        "explanation": "Scrupulous means primarily careful, whereas careless is the direct opposite.",
        "question_type": "Vocabulary",
        "subtopic": "vocab|synonyms-antonyms",
        "track": "11plus",
        "marks": 1,
        "difficulty": 2,
        "tier": "11+ Standard",
        "calculator": "Non-Calculator",
        "estimated_time_sec": 45
    })

url = f"{SUPABASE_URL}/rest/v1/exam_questions"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

req = urllib.request.Request(url, data=json.dumps(questions).encode('utf-8'), headers=headers, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        print(f"✅ Successfully inserted {len(res_data)} English Mock questions into Supabase via REST!")
except Exception as e:
    print("❌ Exception:", str(e))
