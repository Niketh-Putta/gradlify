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
key = get_env_vars().get('OPENAI_API_KEY')
print("Key length:", len(key))
url = "https://api.openai.com/v1/chat/completions"
data = json.dumps({
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'})
try:
    with urllib.request.urlopen(req) as resp:
        print("OpenAI Success!")
except Exception as e:
    print(e.read().decode())
