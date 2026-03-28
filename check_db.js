require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env', override: false });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key);

async function check() {
  console.log("URL:", url);
  const { data, error } = await supabase.from('exam_questions').select('tier, calculator').limit(10);
  console.log("Raw 10 rows:");
  console.log(data);
  const { data: d2 } = await supabase.from('exam_questions').select('tier, calculator').ilike('tier', '%11%').limit(5);
  console.log("11+ rows:");
  console.log(d2);
}
check();
