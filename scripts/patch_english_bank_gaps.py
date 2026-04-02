import json
import os
import time
import uuid

# Import the core logic from our generator
from generate_11plus_english_bank import generate_passage

def patch():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Set GEMINI_API_KEY")
        return
        
    output_path = 'supabase/data/generated/11plus_premium_english_bank.json'
    
    # Load the big 146
    with open(output_path, 'r') as f:
        existing_data = json.load(f)
        
    print(f"Loaded {len(existing_data)} passages. Patching gaps...")
    
    # The missing blueprint
    gaps = [
        {"section": "comprehension", "subtopic": "fiction", "volume": 1, "start_diff": 2}, # FICTION
        {"section": "vocabulary", "subtopic": "vocabulary", "volume": 3, "start_diff": 1} # VOCABULARY
    ]
    
    for gap in gaps:
        for i in range(gap["volume"]):
            diff = ((gap["start_diff"] - 1 + i) % 3) + 1
            print(f"[*] Patching {gap['section'].upper()} | {gap['subtopic'].upper()} | Level {diff}...")
            time.sleep(4)
            data = generate_passage(api_key, gap["section"], gap["subtopic"], diff, i+1)
            
            if data:
                data["id"] = f"eng-passage-{uuid.uuid4().hex[:8]}"
                existing_data.append(data)
                
    # Save the 150 perfect array
    with open(output_path, 'w') as f:
        json.dump(existing_data, f, indent=2)
        
    print(f"\n[+] Super-Patch Complete! Exact passages: {len(existing_data)}")

if __name__ == "__main__":
    patch()
