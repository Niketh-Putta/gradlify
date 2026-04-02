import os
import json
import urllib.request
import urllib.parse
import sys
import re

def get_env_vars():
    env_vars = {}
    env_path = os.path.join(os.path.dirname(__file__), '../.env')
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    match = re.match(r'^([^=]+)=(.*)$', line.strip())
                    if match:
                        key = match.group(1).strip()
                        val = match.group(2).strip().strip('"').strip("'")
                        env_vars[key] = val
    except Exception as e:
        print(f"Could not read .env: {e}")
    return env_vars

env_vars = get_env_vars()
SUPABASE_URL = env_vars.get('SUPABASE_URL') or env_vars.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Cannot proceed: Missing required keys in .env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

def delete_spag_questions():
    params = urllib.parse.urlencode({
        'track': 'eq.11plus',
        'question_type': 'eq.English SPaG'
    })
    url = f"{SUPABASE_URL}/rest/v1/exam_questions?{params}"
    
    req = urllib.request.Request(url, method='DELETE', headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f"Bearer {SUPABASE_KEY}"
    })
    
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Successfully deleted English SPaG questions. Status code: {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error calling DELETE: {e}")

if __name__ == "__main__":
    delete_spag_questions()
