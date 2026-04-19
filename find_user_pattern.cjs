const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function find() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  const matches = users.users.filter(u => u.email.includes('putta'));
  console.log('Matches:', matches.map(u => ({ email: u.email, id: u.id })));
}
find();
