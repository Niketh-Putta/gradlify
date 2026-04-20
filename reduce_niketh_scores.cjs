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

async function reduceScore() {
  const nikethUsers = [
    { id: '7874de85-744e-47be-9867-59a2db9e88e8', email: 'testu1050@gmail.com' },
    { id: '96f59973-d232-4db9-9b19-2a49780cf661', email: 'kputtab@gmail.com' }
  ];

  for (const user of nikethUsers) {
    console.log(`Reducing score for Niketh Putta account: ${user.email} (${user.id})`);
    
    // 1. Delete all current practice results
    const { error: delPracError } = await supabase
      .from('practice_results')
      .delete()
      .eq('user_id', user.id);
    
    if (delPracError) console.error('Error deleting practice results:', delPracError.message);

    // 2. Delete all current mock attempts
    const { error: delMockError } = await supabase
      .from('mock_attempts')
      .delete()
      .eq('user_id', user.id);

    if (delMockError) console.error('Error deleting mock attempts:', delMockError.message);

    // 3. Add a single entry of 7 points to mock_attempts
    const { error: insMockError } = await supabase.from('mock_attempts').insert({
      user_id: user.id,
      score: 7,
      total_marks: 7,
      status: 'completed',
      mode: 'full',
      track: '11plus',
      title: 'Manual Reset',
      created_at: new Date().toISOString()
    });

    if (insMockError) {
      console.error('Error inserting reset score:', insMockError.message);
    } else {
      console.log(`Successfully reset ${user.email} score to 7.`);
    }
  }
}

reduceScore();
