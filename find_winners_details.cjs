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

async function findWinners() {
  const winners = ['pavan.nov14', 'harinishuj', '23ssreejiths'];
  console.log(`Searching for winners: ${winners.join(', ')}`);
  
  for (const name of winners) {
    console.log(`\n--- Searching for ${name} ---`);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', `%${name}%`);
      
    if (error) {
      console.error(`Error searching for ${name}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Found ${data.length} match(es) for ${name}:`);
      data.forEach(profile => {
        console.log(`ID: ${profile.id}, User ID: ${profile.user_id}, Name: ${profile.full_name}`);
        // We might need to get more details if needed
      });
    } else {
      console.log(`No matches found for ${name} in profiles.`);
    }
  }
}

findWinners();
