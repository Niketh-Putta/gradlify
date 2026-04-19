const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, track, updated_at')
    .limit(10);
    
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  console.log('Data count:', data?.length);
  if (data) {
    data.forEach(p => {
      console.log(`${p.user_id} | ${p.full_name} | Updated: ${p.updated_at} | Track: ${p.track}`);
    });
  }
}
check();
