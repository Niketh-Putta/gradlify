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
  const { data: questions, error } = await supabase
    .from('exam_questions')
    .select('id, question, correct_answer, wrong_answers')
    .eq('track', '11plus');

  if (error) {
    console.error(error);return;
  }
  
  let count = 0;
  for (const q of questions) {
    const w = q.wrong_answers || [];
    if (w.length > 0 && typeof w[0] === 'string' && w[0].endsWith('a') && !w[0].includes(' ')) {
       // Could be something else, let's just see what starts with correct
       if (w[0] === q.correct_answer + 'a') {
           console.log("Remaining:", q.correct_answer, w);
           count++;
       }
    }
  }
  console.log(`Remaining missing text options: ${count}`);
}

run();
