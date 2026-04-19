const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function add() {
  const uid = '7874de85-744e-47be-9867-59a2db9e88e8';
  
  // 1. Ensure profile has a name
  await supabase.from('profiles').update({ full_name: 'Niketh Putta' }).eq('user_id', uid);
  
  // 2. Insert a "Scored" mock attempt from your local session
  const { data, error } = await supabase.from('mock_attempts').insert({
    user_id: uid,
    score: 15,
    total_marks: 50,
    status: 'scored',
    mode: 'mock-exam',
    track: '11plus',
    title: 'Manual Local Sync',
    created_at: new Date().toISOString()
  });

  if (error) console.error('Error adding points:', error);
  else console.log('Successfully synced your local score to the leaderboard!');
}
add();
