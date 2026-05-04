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

async function findByScores() {
  const scores = [1003, 688, 412];
  console.log(`Searching for users with scores: ${scores.join(', ')} in sprint_stats...`);
  
  for (const score of scores) {
    console.log(`\n--- Searching for score ${score} ---`);
    const { data, error } = await supabase
      .from('sprint_stats')
      .select('user_id, questions_correct, sprint_id')
      .eq('questions_correct', score);
      
    if (error) {
      console.error(`Error searching for score ${score}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Found ${data.length} match(es) for score ${score}:`);
      for (const stat of data) {
        console.log(`User ID: ${stat.user_id}, Sprint ID: ${stat.sprint_id}`);
        // Get user details from auth.admin
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(stat.user_id);
        if (userError) {
          console.error(`Error getting user ${stat.user_id}:`, userError.message);
        } else {
          console.log(`Email: ${userData.user.email}`);
          console.log(`Metadata:`, userData.user.user_metadata);
        }
        
        // Also check profiles
        const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', stat.user_id).single();
        if (profileData) {
          console.log(`Profile Name: ${profileData.full_name}`);
        }
      }
    } else {
      console.log(`No matches found for score ${score} in sprint_stats.`);
    }
  }
}

findByScores();
