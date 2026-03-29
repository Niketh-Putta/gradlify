import os
import requests
import json
import mimetypes

# Read .env
env = {}
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip("'").strip('"')

SUPABASE_URL = env.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') or env.get('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials")
    exit(1)

bucket_name = 'questions'
upload_path_base = 'geometry'

shapes = [
    ('public/images/geometry/cube.svg', 'cube', '%cube%'),
    ('public/images/geometry/rectangle.svg', 'rectangle', '%rectangle%'),
    ('public/images/geometry/parallelogram.svg', 'parallelogram', '%parallelogram%'),
    ('public/images/geometry/triangle.svg', 'triangle', '%triangle%'),
]

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

# Upload files
for file_path, shape, query in shapes:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}, does not exist.")
        continue
    
    filename = os.path.basename(file_path)
    storage_path = f"{upload_path_base}/{filename}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{storage_path}"
    
    with open(file_path, 'rb') as f:
        data = f.read()
    
    print(f"Uploading {filename} to {storage_path}...")
    res = requests.post(upload_url, headers={**headers, 'Content-Type': 'image/svg+xml'}, data=data)
    
    if res.status_code in [200, 201]:
        print(f"Successfully uploaded {filename}.")
    elif res.status_code == 400 and 'Duplicate' in res.text:
       print(f"File {filename} already exists, skipping upload.")
    elif res.status_code == 409:
        print(f"File {filename} already exists, skipping upload.")
    else:
        print(f"Failed to upload {filename}: {res.status_code} - {res.text}. Trying PUT to overwrite...")
        res = requests.put(upload_url, headers={**headers, 'Content-Type': 'image/svg+xml'}, data=data)
        if res.status_code in [200, 201]:
             print(f"Successfully overwritten {filename}.")
        else:
             print(f"Failed to overwrite {filename}: {res.status_code} - {res.text}")
        
    
    # Update exam questions
    db_url = f"{SUPABASE_URL}/rest/v1/exam_questions?question=ilike.{query}"
    db_headers = {
        **headers,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    update_data = {
        'image_url': storage_path
    }
    print(f"Updating DB for {shape}...")
    res = requests.patch(db_url, headers=db_headers, json=update_data)
    if res.status_code in [200, 204]:
        print(f"Successfully updated DB for {shape}.")
    else:
        print(f"Failed to update DB for {shape}: {res.status_code} - {res.text}")

print("Done.")
