import os, json, urllib.request, re
def get_env_vars():
    env_vars = {}
    with open('.env', 'r') as f:
        for line in f:
            match = re.match(r'^([^=]+)=(.*)$', line.strip())
            if match:
                key, val = match.group(1).strip(), match.group(2).strip().strip('"')
                env_vars[key] = val
    return env_vars
key = get_env_vars().get('GEMINI_API_KEY')
print("Key length:", len(key))
gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
data = json.dumps({"contents": [{"parts": [{"text": "Hello"}]}]}).encode('utf-8')
req = urllib.request.Request(gemini_url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as resp:
        print("Success!")
except Exception as e:
    print(e.read().decode())
