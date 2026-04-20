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

async function checkVarun() {
  const { data: profiles } = await supabase.from('profiles').select('user_id, onboarding, full_name');
  const matches = profiles.filter(p => {
    const name = (p.full_name || '').toLowerCase();
    const pref = (p.onboarding?.preferredName || '').toLowerCase();
    return name.includes('varun') || pref.includes('varun');
  });

  for (const p of matches) {
    const { data: user } = await supabase.auth.admin.getUserById(p.user_id);
    const { data: practice } = await supabase.from('practice_results').select('attempts').eq('user_id', p.user_id);
    const { data: mocks } = await supabase.from('mock_attempts').select('total_marks').eq('user_id', p.user_id);
    
    const pTotal = (practice || []).reduce((sum, r) => sum + (r.attempts || 0), 0);
    const mTotal = (mocks || []).reduce((sum, r) => sum + (r.total_marks || 0), 0);

    console.log(`User: ${user?.user?.email || 'Unknown'} (${p.user_id})`);
    console.log(`- Pref Name: ${p.onboarding?.preferredName}`);
    console.log(`- Total: ${pTotal + mTotal}`);
  }
}
checkVarun();
