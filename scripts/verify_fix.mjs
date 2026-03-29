import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const env = fs.readFileSync(envPath, 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: q, error } = await supabase
    .from('exam_questions')
    .select('question, correct_answer, wrong_answers')
    .eq('correct_answer', 'Equal')
    .limit(1)
    .single();

  if (error) {
    console.error(error); return;
  }
  
  console.log("Verified:", q);
}

run();
