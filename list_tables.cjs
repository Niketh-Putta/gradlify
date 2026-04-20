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

async function listAllTables() {
  console.log('Listing some common tables...');
  // We can't easily list all tables via the JS client without RPC, but we can try to guess or use existing ones.
  // Let's try to query the information_schema via an RPC if possible, or just guess.
  const tablesToTry = ['profiles', 'mock_attempts', 'practice_results', 'sprint_leaderboard', 'sprint_stats', 'sprint_windows', 'leaderboard', 'users'];
  for (const table of tablesToTry) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
       console.log(`Table exists: ${table}`);
       if (data && data.length > 0) {
         console.log(`Columns in ${table}:`, Object.keys(data[0]));
       }
    }
  }
}

listAllTables();
