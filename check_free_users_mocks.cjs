
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, plan, tier, is_premium, current_period_end, daily_mock_uses, daily_maths_mock_uses, daily_english_mock_uses')
    .or('plan.eq.free,plan.is.null');

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

  console.log(`Total users with free/null plan: ${data.length}`);
  console.log(`Actual free users (after checking tier/is_premium/period): ${freeUsers.length}`);
  
  const usersWithMocksUsed = freeUsers.filter(u => (u.daily_mock_uses || 0) > 0 || (u.daily_maths_mock_uses || 0) > 0 || (u.daily_english_mock_uses || 0) > 0);
  console.log(`Free users with >0 mock uses: ${usersWithMocksUsed.length}`);
  
  if (usersWithMocksUsed.length > 0) {
    console.log('Sample users with mocks used:');
    console.log(usersWithMocksUsed.slice(0, 5));
  }
}

checkUsers();
