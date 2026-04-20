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

async function findUser() {
  const uid = 'feef84de-b413-4db3-8dca-4d6b253afd2b';
  console.log(`Searching for user ${uid} in profiles...`);
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', uid).single();
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('User Profile Data:', data);
  }
}

findUser();
