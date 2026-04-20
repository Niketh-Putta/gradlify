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

async function getDetails() {
  const ids = ['f31fb12c-fb12-4f4e-b946-058def0b3d0d', 'eca2ba34-3691-42e5-b44e-3847689ce509'];
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  const matches = users.filter(u => ids.includes(u.id));
  console.log('Varunya User Details:');
  matches.forEach(u => {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Created At: ${u.created_at}`);
  });
}

getDetails();
