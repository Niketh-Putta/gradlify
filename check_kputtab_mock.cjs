const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const uid = '96f59973-d232-4db9-9b19-2a49780cf661';
  
  // Check Mock Track
  const { data: mocks } = await supabase
    .from('mock_attempts')
    .select('track, score, status, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log('Mock Data:', mocks);

  // Check Profile Track
  const { data: profile } = await supabase
    .from('profiles')
    .select('track, full_name')
    .eq('user_id', uid)
    .single();
    
  console.log('Profile Data:', profile);
}
check();
