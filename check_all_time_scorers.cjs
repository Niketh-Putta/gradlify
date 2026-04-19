const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data: mocks, error } = await supabase
    .from('mock_attempts')
    .select('user_id, score, track, status')
    .in('status', ['scored', 'completed', 'submitted']);

  if (error) {
    console.error(error);
    return;
  }

  const uids = [...new Set(mocks.map(m => m.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', uids);
  const profMap = {};
  profiles?.forEach(p => profMap[p.user_id] = p.full_name);

  const totals = {};
  mocks.forEach(m => {
    const key = m.user_id;
    if (!totals[key]) totals[key] = { name: profMap[key] || 'Anonymous', score: 0, track: m.track };
    totals[key].score += (m.score || 0);
  });

  const sorted = Object.values(totals).sort((a, b) => b.score - a.score);

  console.log('--- All-Time High Scorers (Mocks) ---');
  sorted.slice(0, 15).forEach((p, i) => {
    console.log(`#${i + 1} ${p.name} - ${p.score} points (${p.track})`);
  });
}
check();
