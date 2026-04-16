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
    key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('VITE_SUPABASE_PUBLISHABLE_KEY')
    
    if not url or not key:
        print("Missing Supabase URL or Key.")
        return

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    print("Querying 11+ leaderboard data directly via REST API...")

    # 1. Fetch 11+ profiles
    profiles_url = f"{url}/rest/v1/profiles?track=eq.11plus&select=user_id,full_name"
    resp = requests.get(profiles_url, headers=headers)
    if resp.status_code != 200:
        print(f"Error fetching profiles: {resp.status_code}")
        return
    profiles = resp.json()
    profile_map = {p['user_id']: p['full_name'] or 'Anonymous' for p in profiles}
    user_ids = list(profile_map.keys())

    # 2. Fetch correct answer counts from correct_answers_all view
    # Since we can't easily GROUP BY over REST without a custom RPC or view,
    # let's try to query the view directly if possible.
    # The view 'correct_answers_all' exists according to migrations.
    
    view_url = f"{url}/rest/v1/correct_answers_all?track=eq.11plus&select=user_id,correct_count"
    resp = requests.get(view_url, headers=headers)
    if resp.status_code != 200:
        print(f"Error fetching answers: {resp.status_code} {resp.text}")
        # If view is not accessible, we might need a different approach
        return
    
    answers = resp.json()
    totals = {}
    for a in answers:
        uid = a['user_id']
        totals[uid] = totals.get(uid, 0) + a['correct_count']

    # Combine
    leaderboard = []
    for uid, name in profile_map.items():
        leaderboard.append({
            'name': name,
            'score': totals.get(uid, 0)
        })

    # Sort
    leaderboard.sort(key=lambda x: x['score'], reverse=True)

    print(f"\nReal 11+ Leaderboard (Top 30):")
    print("-" * 60)
    print(f"{'Rank':<5} | {'Name':<35} | {'Score':<10}")
    print("-" * 60)
    
    found_target = False
    for i, entry in enumerate(leaderboard[:30]):
        name = entry['name']
        score = entry['score']
        print(f"{i+1:<5} | {name:<35} | {score:<10}")
        if 'shruthikotra.ai' in name.lower():
            found_target = True

    if not found_target:
        for i, entry in enumerate(leaderboard):
            if 'shruthikotra.ai' in entry['name'].lower():
                print(f"\n>> FOUND TARGET: {entry['name']} at rank {i+1} with score {entry['score']}")
                found_target = True

    if not found_target:
        print("\nCould not find 'shruthikotra.ai' in the 11+ leaderboard.")

if __name__ == "__main__":
    main()
