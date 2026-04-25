
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

async function resetFreeUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, plan, tier, is_premium, current_period_end, daily_mock_uses');

  if (error) {
    console.error(error);
    return;
  }

  const freeUsers = data.filter(u => {
    const isPremium = u.is_premium === true;
    const isPremiumTier = u.tier === 'premium';
    const hasActivePlan = u.plan && u.plan !== 'free' && u.current_period_end && new Date(u.current_period_end) > new Date();
    return !isPremium && !isPremiumTier && !hasActivePlan;
  });

  console.log(`Total profiles: ${data.length}`);
  console.log(`Free users: ${freeUsers.length}`);
  
  const usersToReset = freeUsers.filter(u => (u.daily_mock_uses || 0) > 0);
  console.log(`Free users with >0 mock uses: ${usersToReset.length}`);
  
  if (usersToReset.length === 0) {
    console.log('No users to reset.');
    return;
  }

  console.log('Resetting mock usage for free users...');
  for (const user of usersToReset) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        daily_mock_uses: 0
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error(`Error resetting user ${user.id}:`, updateError);
    } else {
      console.log(`Reset user ${user.id}`);
    }
  }
  
  console.log('Finished resetting mock usage.');
}

resetFreeUsers();
