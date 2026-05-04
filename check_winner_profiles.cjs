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

async function checkWinnerProfiles() {
  const userIds = [
    '496e306a-6d26-45ea-9ca5-d95c9ad88595', // pavan
    '727ae24d-c811-4153-9c97-eabf8a26bf43', // harinishuj
    '121e03a9-4cfe-4e79-84ac-6784223d0617'  // 23ssreejiths
  ];
  
  console.log('Checking profiles for winners...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('user_id', userIds);
    
  if (error) {
    console.error('Error:', error.message);
  } else {
    data.forEach(profile => {
      console.log(`\n--- Profile for ${profile.user_id} ---`);
      console.log(`Name: ${profile.full_name}`);
      console.log(`Tier: ${profile.tier}`);
      console.log(`Plan: ${profile.plan}`);
      console.log(`Is Premium: ${profile.is_premium}`);
      console.log(`Created At: ${profile.created_at}`);
      console.log(`Track: ${profile.track}`);
    });
  }
}

checkWinnerProfiles();
