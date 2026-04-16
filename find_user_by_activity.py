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

    print("Searching for 'shruthi' across all activity users...")
    
    # Get unique user_ids from activity
    resp = requests.get(f"{url}/rest/v1/mock_attempts?select=user_id", headers=headers)
    uids = {r['user_id'] for r in resp.json()}
    
    resp = requests.get(f"{url}/rest/v1/practice_results?select=user_id", headers=headers)
    uids.update(r['user_id'] for r in resp.json())

    print(f"Total unique users found in activity: {len(uids)}")

    for uid in uids:
        # Check profiles
        p_resp = requests.get(f"{url}/rest/v1/profiles?user_id=eq.{uid}&select=*", headers=headers)
        profile = p_resp.json()[0] if p_resp.status_code == 200 and p_resp.json() else {}
        
        name = profile.get('full_name') or ''
        email = profile.get('email') or '' # Some profiles might have email
        
        if 'shruthi' in name.lower() or 'shruthi' in email.lower() or 'shruthikotra.ai' in name.lower() or 'shruthikotra.ai' in email.lower():
            print(f"FOUND MATCH: ID {uid} | Name: {name} | Email: {email} | Track: {profile.get('track')}")

if __name__ == "__main__":
    main()
