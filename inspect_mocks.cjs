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

async function inspect() {
  console.log('Inspecting successful mock attempts...');
  const { data, error } = await supabase.from('mock_attempts').select('status, mode').limit(10);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Sample mock attempts:', data);
  }
}

inspect();
