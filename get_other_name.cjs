const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data } = await supabase.from('profiles').select('full_name').eq('user_id', '96f59973-d232-4db9-9b19-2a49780cf661').single();
  console.log('Account Name:', data?.full_name || 'Anonymous');
}
check();
