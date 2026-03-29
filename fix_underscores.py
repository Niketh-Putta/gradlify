import json
import re

filepath = 'src/data/eleven_plus_english_notes.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

def fix_text(text):
    if not isinstance(text, str):
        return text
    # Replace any sequence of 3 or more underscores with dots
    return re.sub(r'_{3,}', '.......', text)

# Walk the JSON structure
def process_node(node):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == 'md' and isinstance(v, str):
                node[k] = fix_text(v)
            else:
                process_node(v)
    elif isinstance(node, list):
        for item in node:
            process_node(item)

process_node(data)

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Successfully replaced underscores with dots in markdown.")
