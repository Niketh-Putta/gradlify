const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envText = '';
try {
  envText = fs.readFileSync('.env', 'utf8');
} catch (e) {
  try {
    envText = fs.readFileSync('.env.local', 'utf8');
  } catch (e2) {
    console.error("Could not read .env or .env.local");
    process.exit(1);
  }
}

const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};

const url = getVal('VITE_SUPABASE_URL');
const key = getVal('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, key);

async function check() {
  console.log("URL:", url);
  
  const { data: profiles } = await supabase.from('profiles').select('user_id, track, full_name').limit(20);
  console.log("Recent profiles:", profiles);
  
  // Count by track manually
  const { data: gcseRows } = await supabase.from('profiles').select('user_id').eq('track', 'gcse');
  const { data: elevenPlusRows } = await supabase.from('profiles').select('user_id').eq('track', '11plus');
  
  console.log("Profiles with track=gcse:", gcseRows ? gcseRows.length : 0);
  console.log("Profiles with track=11plus:", elevenPlusRows ? elevenPlusRows.length : 0);

  // Check if there's any user with 'niketh' in their name
  const { data: niketh } = await supabase.from('profiles').select('user_id, track, full_name').ilike('full_name', '%niketh%').limit(5);
  console.log("Niketh's profile:", niketh);
}
check();
