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

async function findActiveUsers() {
  console.log('Fetching top 10 most active users by practice attempts...');
  const { data: results, error } = await supabase
    .from('practice_results')
    .select('user_id, attempts')
    .limit(500);

  if (error) {
    console.error('Error fetching results:', error.message);
    return;
  }

  const userStats = {};
  results.forEach(r => {
    userStats[r.user_id] = (userStats[r.user_id] || 0) + (r.attempts || 0);
  });

  const sortedUserIds = Object.keys(userStats).sort((a, b) => userStats[b] - userStats[a]).slice(0, 10);
  
  console.log('\nTop 10 Active User IDs:');
  for (const id of sortedUserIds) {
    const { data: profile } = await supabase.from('profiles').select('full_name, onboarding').eq('user_id', id).single();
    const name = profile?.full_name || profile?.onboarding?.preferredName || 'Unknown';
    console.log(`ID: ${id} | Name: ${name} | Attempts: ${userStats[id]}`);
  }
}

findActiveUsers();
