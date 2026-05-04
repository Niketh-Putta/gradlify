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

async function findAllNamedProfiles() {
  console.log('Fetching all profiles with a name...');
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, user_id')
    .not('full_name', 'is', null);
    
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`Found ${data.length} profiles with names.`);
    const winners = ['pavan.nov14', 'harinishuj', '23ssreejiths'];
    data.forEach(p => {
      winners.forEach(w => {
        if (p.full_name.toLowerCase().includes(w.toLowerCase())) {
          console.log(`MATCH FOUND: Name: ${p.full_name}, User ID: ${p.user_id}`);
        }
      });
      // Also print some to see if they look like the ones we want
      if (p.full_name.includes('.') || p.full_name.match(/\d/)) {
         // console.log(`Interesting name: ${p.full_name}`);
      }
    });
  }
}

findAllNamedProfiles();
