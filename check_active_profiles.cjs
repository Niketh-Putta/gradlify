const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, leaderboard_score, track, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);
    
  console.log('--- Most Recently Updated Profiles ---');
  profiles.forEach(p => {
    console.log(`${p.user_id} | ${p.full_name} | Score: ${p.leaderboard_score} | Updated: ${p.updated_at} | Track: ${p.track}`);
  });
}
check();
