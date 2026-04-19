const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function list() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('--- Last 10 Users ---');
  users.users.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10).forEach(u => {
    console.log(`${u.email} | ID: ${u.id} | Created: ${u.created_at}`);
  });
}
list();
