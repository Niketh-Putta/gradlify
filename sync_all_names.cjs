const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function sync() {
  const uids = ['7874de85-744e-47be-9867-59a2db9e88e8', '96f59973-d232-4db9-9b19-2a49780cf661'];
  for (const id of uids) {
    await supabase.from('profiles').update({ full_name: 'Niketh Putta' }).eq('user_id', id);
  }
  console.log('Names synced.');
}
sync();
