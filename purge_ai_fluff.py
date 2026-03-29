import json
import re

def clean_premium_content(content):
    # Remove excessive adverbs that feel like AI fluff
    # "intensely", "utterly", "massively", "strongly", "deeply", "highly", "completely", "totally", "entirely"
    # only when they are redundant or used for filler
    
    # Common AI patterns to replace
    patterns = [
        (r'\bintensely\b\s*', ''),
        (r'\butterly\b\s*', ''),
        (r'\bmassively\b\s*', ''),
        (r'\bstrongly\b\s*', ''),
        (r'\bdeeply\b\s*', ''),
        (r'\bhighly\b\s*', ''),
        (r'\bcompletely\b\s*', ''),
        (r'\btotally\b\s*', ''),
        (r'\bentirely\b\s*', ''),
        (r'\bvastly\b\s*', ''),
        (r'\bgerminely\b\s*', ''),
        (r'\bflawlessly\b\s*', ''),
        (r'\bimmensely\b\s*', ''),
        (r'\bdeniedly\b\s*', ''),
        (r'\brippingly\b\s*', ''),
        (r'\bhorrificly\b\s*', ''),
        (r'\bviolently\b\s*', ''),
        (r'\bprecisely\b\s*', ''),
        (r'\brawly\b\s*', ''),
        (r'\bbrutally\b\s*', ''),
        (r'\bglaringly\b\s*', ''),
        (r'\buniversally\b\s*', ''),
        (r'\bdeliberately\b\s*', ''),
        (r'\bfirmly\b\s*', ''),
        (r'\bstrictly\b\s*', ''),
        (r'\bheavily\b\s*', ''),
        (r'\bsharply\b\s*', ''),
        (r'\bcloutly\b\s*', ''),
        (r'\bexclusively\b\s*', ''),
        (r'\bgenerally\b\s*', ''),
        (r'\bpurely\b\s*', ''),
        (r'\bessentially\b\s*', ''),
        (r'\bfiercely\b\s*', ''),
        (r'\bfully\b\s*', ''),
        (r'\bdefinitely\b\s*', ''),
        (r'\bperfectly\b\s*', ''),
        (r'\bprimarily\b\s*', ''),
        (r'\bgerminely\b\s*', ''),
        (r'\bsolely\b\s*', ''),
        (r'\bmainly\b\s*', ''),
        (r'\blargely\b\s*', ''),
        (r'\bbasically\b\s*', ''),
        (r'\bactually\b\s*', ''),
        (r'\bsupportedly\b\s*', ''),
        (r'\bindeniably\b\s*', ''),
        (r'\bcertainly\b\s*', ''),
        (r'\binsider\b\s*', ''),
        (r'\bpower-ups\b\s*', ''),
        (r'\bsleeker\b\s*', ''),
        (r'\bpolish\b\s*', ''),
        (r'\bpremium\b\s*', ''),
        (r'\bintelligently\b\s*', ''),
        (r'\brigorous\b\s*', ''),
        (r'\bdynamic\b\s*', ''),
        (r'\bvibrant\b\s*', ''),
        (r'\bstunning\b\s*', ''),
        (r'\bsupercharged\b\s*', ''),
        (r'\bmastermind\b\s*', ''),
        (r'\bepic\b\s*', ''),
        (r'\bultimate\b\s*', ''),
    ]
    
    new_content = content
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, new_content, flags=re.IGNORECASE)
        
    # Standardize the Word Bank format for readability and $1000 value look
    # Target: **Ascend** ↔ **Descend** Meaning: To climb upwards / To go downwards. Example: The hot air balloon began to ascend into the clouds.
    # To:
    # **Ascend** ↔ **Descend**
    # *Meaning:* To climb upwards / To go downwards.
    # *Example:* The hot air balloon began to ascend into the clouds.
    
    # Fix the reference banks specifically
    def format_bank_entry(match):
        word_part = match.group(1).strip()
        meaning_part = match.group(2).strip().replace('Meaning:', '')
        example_part = match.group(3).strip().replace('Example:', '')
        
        return f"\n{word_part}\n*Meaning:* {meaning_part}\n*Example:* {example_part}\n"

    # Regex to catch the one-liner word bank entries
    bank_pattern = r'(\*\*.*?\*\*.*?\*\*.*?\*\*)\s*Meaning:\s*(.*?)\s*Example:\s*(.*?)(?=\n|\*\*|$)'
    new_content = re.sub(bank_pattern, format_bank_entry, new_content)

    return new_content.strip()

def process_json(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
        
    for section in data:
        for topic in data[section]:
            topic['md'] = clean_premium_content(topic['md'])
            
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    process_json('src/data/eleven_plus_english_notes.json')
    print("Cleaned AI-generated fluff and improved formatting in English notes.")
