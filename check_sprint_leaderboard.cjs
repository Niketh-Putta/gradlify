const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};

const url = getVal('VITE_SUPABASE_URL');
const serviceKey = getVal('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, serviceKey);

async function checkSprintLeaderboard() {
  console.log('Checking sprint_leaderboard table...');
  const { data, error } = await supabase.from('sprint_leaderboard').select('*').limit(50);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`Found ${data.length} entries in sprint_leaderboard.`);
    data.forEach(entry => {
      console.log(`User: ${entry.full_name}, Correct: ${entry.questions_correct}, User ID: ${entry.user_id}`);
    });
  }
}

checkSprintLeaderboard();
