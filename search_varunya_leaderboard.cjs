const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};

const url = getVal('VITE_SUPABASE_URL');
const key = getVal('SUPABASE_SERVICE_ROLE_KEY') || getVal('VITE_SUPABASE_SERVICE_ROLE_KEY') || getVal('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(url, key);

async function searchLeaderboard() {
  console.log("Searching for 'varunya' in 'month' leaderboard...");
  const { data, error } = await supabase.rpc('get_leaderboard_correct_global', {
    p_period: 'month'
  });

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return;
  }

  const matches = data.filter(entry => (entry.name || '').toLowerCase().includes('varunya'));
  console.log('Matches in month leaderboard:', matches);

  console.log("Searching for 'varunya' in 'all' leaderboard...");
  const { data: dataAll, error: errorAll } = await supabase.rpc('get_leaderboard_correct_global', {
    p_period: 'all'
  });

  if (!errorAll) {
    const matchesAll = dataAll.filter(entry => (entry.name || '').toLowerCase().includes('varunya'));
    console.log('Matches in all-time leaderboard:', matchesAll);
  }
}

searchLeaderboard();
