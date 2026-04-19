const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function force() {
  const uid = '96f59973-d232-4db9-9b19-2a49780cf661'; // kputtab account
  
  // 1. First, check if column exists by trying to update it
  const { error } = await supabase.from('profiles').update({ 
    leaderboard_score: 18, // 15 + 3
    full_name: 'Niketh Putta (kputtab)'
  }).eq('user_id', uid);

  if (error) {
    console.log('Update failed, column might be missing:', error.message);
    // Fallback: Just update the name
    await supabase.from('profiles').update({ full_name: 'Niketh Putta (kputtab)' }).eq('user_id', uid);
  } else {
    console.log('Successfully updated leaderboard_score in DB!');
  }
}
force();
