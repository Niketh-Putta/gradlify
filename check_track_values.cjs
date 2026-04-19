const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data } = await supabase.from('profiles').select('track');
  const counts = {};
  data?.forEach(p => counts[p.track] = (counts[p.track] || 0) + 1);
  console.log('Track value counts:', counts);
}
check();
