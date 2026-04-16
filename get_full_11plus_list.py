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

    # Fetch 11+ profiles
    profiles_url = f"{url}/rest/v1/profiles?track=eq.11plus&select=user_id,full_name"
    resp = requests.get(profiles_url, headers=headers)
    profile_map = {p['user_id']: p['full_name'] for p in resp.json()} if resp.status_code == 200 else {}

    # Fetch correct answer counts
    view_url = f"{url}/rest/v1/correct_answers_all?track=eq.11plus&select=user_id,correct_count"
    resp = requests.get(view_url, headers=headers)
    answers = resp.json() if resp.status_code == 200 else []
    
    totals = {}
    for a in answers:
        uid = a['user_id']
        totals[uid] = totals.get(uid, 0) + a['correct_count']

    # Fetch email prefixes for those without full_name
    # Since we can't easily query auth.users, let's just use the IDs we found in activity
    # Or try to fetch them from profiles if available.
    
    leaderboard = []
    for uid, score in totals.items():
        if score > 0:
            name = profile_map.get(uid) or f"Unknown ({uid[:8]})"
            leaderboard.append({'name': name, 'score': score, 'id': uid})

    leaderboard.sort(key=lambda x: x['score'], reverse=True)

    print("\nFull 11+ Leaderboard List (Top 15+):")
    print("-" * 60)
    for i, entry in enumerate(leaderboard):
        print(f"{i+1:<5} | {entry['name']:<35} | {entry['score']}")

if __name__ == "__main__":
    main()
