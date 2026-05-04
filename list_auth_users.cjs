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
  console.log('Listing all users from auth.users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`Found ${users.length} users.`);
    const winners = ['pavan.nov14', 'harinishuj', '23ssreejiths'];
    
    users.forEach(user => {
      const email = user.email || '';
      const emailPrefix = email.split('@')[0];
      
      winners.forEach(w => {
        if (email.toLowerCase().includes(w.toLowerCase()) || 
            (user.user_metadata && JSON.stringify(user.user_metadata).toLowerCase().includes(w.toLowerCase()))) {
          console.log(`\nMATCH FOUND:`);
          console.log(`Email: ${user.email}`);
          console.log(`User ID: ${user.id}`);
          console.log(`Metadata:`, user.user_metadata);
          console.log(`Created At: ${user.created_at}`);
        }
      });
    });
  }
}

listAllUsers();
