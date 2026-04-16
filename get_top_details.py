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

    # Top IDs from previous run
    top_ids = [
        "77b93c3d-9d03-4642-bd95-a9e860ac8977",
        "496e306a-6d26-45ea-9ca5-d95c9ad88595",
        "fdff836b-9d93-40ba-b9e9-18092f702441",
        "c5f0bed2-7f15-446c-b567-405cbda5b1a6",
        "5468c811-3238-419a-a64f-b04f51a37ed3",
        "8e837551-95c5-4ad5-ac8f-24280e17b869",
        "5619044b-dba6-450b-b73e-97e3ad48a69d",
        "96f59973-d232-4db9-9b19-2a49780cf661",
        "a4f4d4ab-bfd9-4625-9272-b94417b4d480",
        "c5ab1e48-a120-4c52-86ce-b1185186b977"
    ]

    print("Fetching email prefixes for top scorers...")
    print("-" * 60)
    print(f"{'Rank':<5} | {'Display Name/Email Prefix':<35} | {'Score'}")
    print("-" * 60)

    # We can fetch scores again to be sure
    view_url = f"{url}/rest/v1/correct_answers_all?track=eq.11plus&select=user_id,correct_count"
    resp = requests.get(view_url, headers=headers)
    answers = resp.json() if resp.status_code == 200 else []
    totals = {}
    for a in answers:
        uid = a['user_id']
        totals[uid] = totals.get(uid, 0) + a['correct_count']

    for i, uid in enumerate(top_ids):
        # Get profile first
        p_resp = requests.get(f"{url}/rest/v1/profiles?user_id=eq.{uid}&select=full_name", headers=headers)
        profile = p_resp.json()[0] if p_resp.status_code == 200 and p_resp.json() else {}
        name = profile.get('full_name')
        
        # If no name, the app uses auth.users email prefix
        # We can't query auth.users directly via REST API typically, 
        # but let's see if we can find them in a table that might store email (like profiles if it was added)
        
        if not name:
            # Check if profiles has email (some schemas do)
            p_full = requests.get(f"{url}/rest/v1/profiles?user_id=eq.{uid}&select=*", headers=headers)
            profile_full = p_full.json()[0] if p_full.status_code == 200 and p_full.json() else {}
            name = profile_full.get('email') or profile_full.get('username') or 'Anonymous'
            
        score = totals.get(uid, 0)
        print(f"{i+1:<5} | {name:<35} | {score}")

if __name__ == "__main__":
    main()
