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
    
    if not key:
        print("Service role key required for direct user search.")
        return

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    print("Searching for users via direct RPC or table access...")
    
    # We can't query auth.users via REST easily unless we use a custom RPC
    # Let's check if there are any other identifying tables
    
    # Search profiles by user_id to see if we can find anyone with that email as a name fallback
    # The RPC uses split_part(u.email, '@', 1) as name
    
    # Let's try to find high scorers again and check their tracks carefully
    
    print("\nDetailed top 11+ scorers (Rank 1-5):")
    view_url = f"{url}/rest/v1/correct_answers_all?track=eq.11plus&select=user_id,correct_count"
    resp = requests.get(view_url, headers=headers)
    if resp.status_code == 200:
        answers = resp.json()
        totals = {}
        for a in answers:
            uid = a['user_id']
            totals[uid] = totals.get(uid, 0) + a['correct_count']
        
        sorted_totals = sorted(totals.items(), key=lambda x: x[1], reverse=True)
        
        for i, (uid, score) in enumerate(sorted_totals[:10]):
            # Get profile
            p_resp = requests.get(f"{url}/rest/v1/profiles?user_id=eq.{uid}&select=*", headers=headers)
            profile = p_resp.json()[0] if p_resp.status_code == 200 and p_resp.json() else {}
            name = profile.get('full_name') or 'Anonymous'
            print(f"{i+1}. {name} | Score: {score} | ID: {uid}")

if __name__ == "__main__":
    main()
