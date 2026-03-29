import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('id, correct_answer, wrong_answers')
    .eq('track', '11plus')
    .like('wrong_answers', '%\"%a\"%') // JSON array string containing an option ending in 'a'
    .limit(10);
  console.log(error || data);
}
run();
