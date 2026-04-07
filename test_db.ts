import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
async function check() {
  const { data, error } = await supabase.from('mock_attempts').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(JSON.stringify({data, error}, null, 2));
}
check();
