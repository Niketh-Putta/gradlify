import os
import json
import requests

def get_env_vars():
    env_vars = {}
    paths = ['.env.local', '.env']
    for path in paths:
        if os.path.exists(path):
            with open(path, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        try:
                            parts = line.strip().split('=', 1)
                            if len(parts) == 2:
                                env_vars[parts[0]] = parts[1].strip('"').strip("'")
                        except ValueError:
                            continue
    return env_vars

def main():
    env = get_env_vars()
    url = env.get('VITE_SUPABASE_URL')
    key = env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    print("--- RAW DATA AUDIT ---")
    
    # 1. Check Practice Results
    print("\nRecent Practice Results (Top 5):")
    resp = requests.get(f"{url}/rest/v1/practice_results?select=*&order=created_at.desc&limit=5", headers=headers)
    print(json.dumps(resp.json(), indent=2))

    # 2. Check Mock Attempts
    print("\nRecent Mock Attempts (Top 5):")
    resp = requests.get(f"{url}/rest/v1/mock_attempts?select=*&order=created_at.desc&limit=5", headers=headers)
    print(json.dumps(resp.json(), indent=2))

    # 3. Check Extreme Results
    print("\nRecent Extreme Results (Top 5):")
    resp = requests.get(f"{url}/rest/v1/extreme_results?select=*&order=created_at.desc&limit=5", headers=headers)
    print(json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    main()
