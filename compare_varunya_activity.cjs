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

async function compareActivity() {
  const users = [
    { id: 'eca2ba34-3691-42e5-b44e-3847689ce509', email: 'srainyaarakal@gmail.com' },
    { id: 'f31fb12c-fb12-4f4e-b946-058def0b3d0d', email: 'arakla.shilpa@googlemail.com' }
  ];

  console.log('--- Lifetime Activity Comparison ---');

  for (const user of users) {
    // 1. Check practice_results (sum of attempts)
    const { data: practiceData, error: practiceError } = await supabase
      .from('practice_results')
      .select('attempts, correct')
      .eq('user_id', user.id);

    // 2. Check mock_attempts (sum of total_marks or questions)
    const { data: mockData, error: mockError } = await supabase
      .from('mock_attempts')
      .select('total_marks, score')
      .eq('user_id', user.id);

    const totalPractice = (practiceData || []).reduce((sum, r) => sum + (r.attempts || 0), 0);
    const totalMock = (mockData || []).reduce((sum, r) => sum + (r.total_marks || 0), 0);
    
    console.log(`User: ${user.email}`);
    console.log(`- Practice Questions: ${totalPractice}`);
    console.log(`- Mock Questions: ${totalMock}`);
    console.log(`- Grand Total: ${totalPractice + totalMock}`);
    console.log('-----------------------------------');
  }
}

compareActivity();
