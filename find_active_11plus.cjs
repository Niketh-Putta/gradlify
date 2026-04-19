const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function find() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, track, updated_at, leaderboard_score')
    .eq('track', '11plus')
    .order('updated_at', { ascending: false })
    .limit(10);
    
  if (data) {
    data.forEach(p => {
      console.log(`${p.user_id} | ${p.full_name} | Score: ${p.leaderboard_score} | Updated: ${p.updated_at}`);
    });
  }
}
find();
