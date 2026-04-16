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
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    print("Searching for 'shruthi' across all tracks...")
    
    # 1. Search in profiles
    search_url = f"{url}/rest/v1/profiles?full_name=ilike.*shruthi*&select=user_id,full_name,track"
    resp = requests.get(search_url, headers=headers)
    profiles = resp.json() if resp.status_code == 200 else []
    
    if profiles:
        print("\nFound in profiles:")
        for p in profiles:
            print(f"- Name: {p['full_name']} | Track: {p['track']} | ID: {p['user_id']}")
            
            # Get their score
            score_url = f"{url}/rest/v1/correct_answers_all?user_id=eq.{p['user_id']}&select=correct_count"
            score_resp = requests.get(score_url, headers=headers)
            answers = score_resp.json() if score_resp.status_code == 200 else []
            total = sum(a['correct_count'] for a in answers)
            print(f"  Total Score: {total}")
    else:
        print("\nNo profiles found with 'shruthi' in name.")

    # 2. Check the view for anyone with a high score to see if someone else is top
    print("\nTop scorers in 'correct_answers_all' view (All tracks):")
    view_url = f"{url}/rest/v1/correct_answers_all?select=user_id,correct_count,track"
    resp = requests.get(view_url, headers=headers)
    if resp.status_code == 200:
        answers = resp.json()
        totals = {}
        for a in answers:
            uid = a['user_id']
            if uid not in totals:
                totals[uid] = {'score': 0, 'track': a['track']}
            totals[uid]['score'] += a['correct_count']
        
        sorted_totals = sorted(totals.items(), key=lambda x: x[1]['score'], reverse=True)
        
        for uid, data in sorted_totals[:10]:
            # Get name
            p_resp = requests.get(f"{url}/rest/v1/profiles?user_id=eq.{uid}&select=full_name", headers=headers)
            name = p_resp.json()[0]['full_name'] if p_resp.status_code == 200 and p_resp.json() else 'Anonymous'
            print(f"- {name} | Score: {data['score']} | Track: {data['track']} | ID: {uid}")

if __name__ == "__main__":
    main()
