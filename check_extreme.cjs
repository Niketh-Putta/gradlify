const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function check() {
  const { data, error } = await supabase.from('extreme_results').select('id').limit(1);
  if (error) console.log('Error:', error.message);
  else console.log('Extreme results exists.');
}
check();
