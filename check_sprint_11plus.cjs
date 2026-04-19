const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const sprintStart = '2026-04-19T20:00:00Z';
  const { data: mocks } = await supabase
    .from('mock_attempts')
    .select('user_id, score, status, created_at')
    .eq('track', '11plus')
    .gte('created_at', sprintStart)
    .in('status', ['scored', 'completed', 'submitted']);

  if (!mocks || mocks.length === 0) {
    console.log('No other 11+ students have finished a mock since 8PM.');
    return;
  }

  const uids = [...new Set(mocks.map(m => m.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', uids);
  const profMap = {};
  profiles?.forEach(p => profMap[p.user_id] = p.full_name);

  console.log('--- 11+ Sprint Activity Since 8PM ---');
  mocks.forEach(m => {
    console.log(`${m.created_at} | ${profMap[m.user_id] || 'Anonymous'} | Score: ${m.score}`);
  });
}
check();
