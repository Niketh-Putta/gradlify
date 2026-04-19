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

async function debug() {
  // 1. Find user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === 'kputtab@gmail.com');
  
  if (!user) {
    console.log('User kputtab@gmail.com NOT FOUND in Auth');
    return;
  }
  
  console.log('User Found:', { id: user.id, email: user.email });

  // 2. Check Profile
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profError) {
    console.error('Profile Error:', profError);
  } else {
    console.log('Profile Data:', {
      full_name: profile.full_name,
      leaderboard_score: profile.leaderboard_score,
      track: profile.track,
      updated_at: profile.updated_at
    });
  }

  // 3. Check Recent Mocks
  const { data: mocks, error: mockError } = await supabase
    .from('mock_attempts')
    .select('created_at, status, score, track')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent Mocks:', mocks);
}

debug();
