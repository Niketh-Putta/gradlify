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

async function addPoints() {
  const uid = 'f31fb12c-fb12-4f4e-b946-058def0b3d0d'; // arakla.shilpa@googlemail.com
  
  console.log(`Ensuring profile name is "Varunya" for user ${uid}...`);
  await supabase.from('profiles').update({ full_name: 'Varunya' }).eq('user_id', uid);

  console.log('Inserting mock attempt (completed/full) with 16 points...');
  const { error: mockError } = await supabase.from('mock_attempts').insert({
    user_id: uid,
    score: 16,
    total_marks: 16,
    status: 'completed',
    mode: 'full',
    track: '11plus',
    title: 'Manual Leaderboard Sync',
    created_at: new Date().toISOString()
  });

  if (mockError) {
    console.error('Error adding mock points:', mockError.message);
  } else {
    console.log('Successfully added 16 points for Varunya via mock_attempts!');
  }
  
  console.log('Inserting practice result with 16 correct answers...');
  const { error: pracError } = await supabase.from('practice_results').insert({
    user_id: uid,
    topic: 'Comprehension',
    attempts: 16,
    correct: 16,
    track: '11plus',
    mode: 'practice',
    created_at: new Date().toISOString()
  });
  
  if (pracError) {
     console.error('Error adding practice points:', pracError.message);
  } else {
     console.log('Successfully added 16 practice points for Varunya!');
  }
}

addPoints();
