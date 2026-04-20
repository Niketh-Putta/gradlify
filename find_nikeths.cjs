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

async function findNikeths() {
  console.log('Searching for "Niketh" or "Putta" in profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, onboarding')
    .or('full_name.ilike.%niketh%,full_name.ilike.%putta%');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const matches = profiles.filter(p => {
    const name = (p.full_name || '').toLowerCase();
    const pref = (p.onboarding?.preferredName || '').toLowerCase();
    return name.includes('niketh') || name.includes('putta') || pref.includes('niketh') || pref.includes('putta');
  });

  console.log(`Found ${matches.length} profiles.`);

  for (const p of matches) {
    const { data: user } = await supabase.auth.admin.getUserById(p.user_id);
    const email = user?.user?.email || 'Unknown';
    
    // Get total score/attempts to confirm
    const { data: practice } = await supabase.from('practice_results').select('correct').eq('user_id', p.user_id);
    const { data: mocks } = await supabase.from('mock_attempts').select('score').eq('user_id', p.user_id);
    
    const pScore = (practice || []).reduce((sum, r) => sum + (r.correct || 0), 0);
    const mScore = (mocks || []).reduce((sum, r) => sum + (r.score || 0), 0);

    console.log(`\nUser: ${email} (${p.user_id})`);
    console.log(`- Full Name: ${p.full_name}`);
    console.log(`- Pref Name: ${p.onboarding?.preferredName}`);
    console.log(`- Current Total Score: ${pScore + mScore} (Practice: ${pScore}, Mocks: ${mScore})`);
  }
}

findNikeths();
