const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  const { data } = await supabase
    .from('mock_attempts')
    .select('user_id, created_at, status, score, title')
    .gte('created_at', tenMinsAgo.toISOString());

  console.log('--- Mocks in Last 10 Minutes (Entire DB) ---');
  console.log(data);
}
check();
