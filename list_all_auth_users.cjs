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

async function listAllUsers() {
  let allUsers = [];
  let page = 1;
  const perPage = 1000;
  
  console.log('Fetching all users from auth.users (paginated)...');
  
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });
    
    if (error) {
      console.error('Error:', error.message);
      break;
    }
    
    if (users.length === 0) break;
    
    allUsers = allUsers.concat(users);
    page++;
    if (users.length < perPage) break;
  }
  
  console.log(`Found ${allUsers.length} total users.`);
  const winners = ['pavan.nov14', 'harinishuj', '23ssreejiths'];
  
  allUsers.forEach(user => {
    const email = user.email || '';
    const metadataStr = user.user_metadata ? JSON.stringify(user.user_metadata).toLowerCase() : '';
    
    winners.forEach(w => {
      if (email.toLowerCase().includes(w.toLowerCase()) || metadataStr.includes(w.toLowerCase())) {
        console.log(`\nMATCH FOUND for ${w}:`);
        console.log(`Email: ${user.email}`);
        console.log(`User ID: ${user.id}`);
        console.log(`Name in Metadata: ${user.user_metadata?.full_name || user.user_metadata?.name || 'N/A'}`);
        console.log(`Created At: ${user.created_at}`);
        
        // Check for phone number or other details if available
        if (user.phone) console.log(`Phone: ${user.phone}`);
      }
    });
  });
}

listAllUsers();
