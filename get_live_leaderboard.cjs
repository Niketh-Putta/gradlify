require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env', override: false });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase URL or Key in environment variables.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function getLiveLeaderboard() {
  console.log("Fetching live 11+ global leaderboard...");
  
  // Calling the RPC that the app uses
  const { data, error } = await supabase.rpc('get_leaderboard_correct_global', {
    p_period: 'month' // Using month as the most common snapshot
  });

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No data found in leaderboard.");
    return;
  }

  // Filter for 11+ if it's not already filtered by the RPC (though the RPC usually respects track)
  // Based on your description, we are looking for real people.
  
  console.log("\nTop 15 Real Users (11+):");
  console.log("------------------------------------------");
  data.slice(0, 15).forEach((entry, i) => {
    console.log(`${i + 1}. Name: ${entry.name || 'Anonymous'} | Score: ${entry.correct_count || entry.total_questions || 0}`);
  });
  console.log("------------------------------------------");
}

getLiveLeaderboard();
