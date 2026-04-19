const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data, error } = await supabase.from('profiles').select('user_id, leaderboard_score').limit(1);
  if (error) {
    console.log('Leaderboard score does NOT exist:', error.message);
  } else {
    console.log('Leaderboard score exists.');
  }
}
check();
