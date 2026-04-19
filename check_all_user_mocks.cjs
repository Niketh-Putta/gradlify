const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function find() {
  const uid = '7874de85-744e-47be-9867-59a2db9e88e8';
  const { data: mocks } = await supabase
    .from('mock_attempts')
    .select('created_at, status, score')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
    
  console.log('Mocks for user 7874...:', mocks);
}
find();
