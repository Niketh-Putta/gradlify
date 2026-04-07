import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env', override: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('mock_attempts').insert({ user_id: '123e4567-e89b-12d3-a456-426614174001', mode: 'mock', track: '11plus', title: 'Test', total_marks: 0, status: 'started' }).select();
  console.log(JSON.stringify({data, error}, null, 2));
}
run();
