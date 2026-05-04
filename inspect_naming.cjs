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

async function inspectProfiles() {
  console.log('Listing some profiles to see naming conventions...');
  const { data, error } = await supabase.from('profiles').select('full_name, user_id').limit(20);
  if (error) {
    console.error('Error:', error.message);
  } else {
    data.forEach(p => console.log(`- ${p.full_name} (${p.user_id})`));
  }
}

inspectProfiles();
