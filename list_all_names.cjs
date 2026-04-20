const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};

const url = getVal('VITE_SUPABASE_URL');
const serviceKey = getVal('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, serviceKey);

async function listAllNames() {
  console.log('Fetching all names from profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .not('full_name', 'is', null);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const matches = profiles.filter(p => (p.full_name || '').toLowerCase().includes('varu'));
  console.log('Matches for "varu":', matches);

  // If no "varu" matches, let's search for "v" just in case it's a very small part
  if (matches.length === 0) {
    const vMatches = profiles.filter(p => (p.full_name || '').toLowerCase().includes('v'));
    console.log('Found names starting with v (first 10):', vMatches.slice(0, 10));
  }
}

listAllNames();
