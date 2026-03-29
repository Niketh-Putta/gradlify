import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key)

async function test() {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('id, question, image_url')
    .ilike('question', '%area of a cube%')
    .limit(10)

  console.log(JSON.stringify(data, null, 2))
}
test()
