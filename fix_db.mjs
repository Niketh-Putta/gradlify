import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key)

async function getBadQuestions() {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('id, correct_answer, wrong_answers, all_answers')
    .ilike('wrong_answers', '%a"%') // match "valuea" in json string array

  console.log('Found', data?.length || 0, 'bad questions', error || '');
  if (data?.length > 0) {
     console.log('Sample bad:', JSON.stringify(data[0]));
  }
}
getBadQuestions();
