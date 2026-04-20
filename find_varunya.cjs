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

async function findVarunya() {
  console.log('Searching for "varunya" in Auth users...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth list error:', authError.message);
  } else {
    // Check all users manually
    const matches = authUsers.users.filter(u => {
      const emailMatch = u.email && u.email.toLowerCase().includes('varunya');
      const metaMatch = u.user_metadata && JSON.stringify(u.user_metadata).toLowerCase().includes('varunya');
      return emailMatch || metaMatch;
    });
    console.log('Found in Auth:', matches.map(u => ({ id: u.id, email: u.email, metadata: u.user_metadata })));
  }

  console.log('\nSearching for "varunya" in profiles (onboarding/full_name)...');
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('user_id, onboarding, full_name');

  if (profError) {
    console.error('Profile error:', profError.message);
  } else {
    const pMatches = profiles.filter(p => {
      const onboardingMatch = p.onboarding && JSON.stringify(p.onboarding).toLowerCase().includes('varunya');
      const nameMatch = p.full_name && p.full_name.toLowerCase().includes('varunya');
      return onboardingMatch || nameMatch;
    });
    console.log('Found in profiles:', pMatches);
  }
}

findVarunya();
