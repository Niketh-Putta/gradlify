const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function find() {
  const { data: mocks, error } = await supabase
    .from('mock_attempts')
    .select('user_id, created_at, status, score')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (mocks && mocks[0]) {
    console.log('Last Mock:', mocks[0]);
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', mocks[0].user_id).single();
    console.log('User Name:', profile?.full_name);
  } else {
    console.log('No mocks found at all.');
  }
}
find();
