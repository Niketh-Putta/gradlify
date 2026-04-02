import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_topic_counts', {
    p_subject: 'maths',
    p_tier: 'higher',
    p_track: '11plus',
    p_calc: null,
    p_difficulty: null
  });
  console.log(data);
}
check();
