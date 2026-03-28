require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env', override: false });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key);

async function check() {
  console.log("URL:", url);
  const { data: d1 } = await supabase.from('exam_questions').select('tier, calculator').limit(5);
  console.log("Raw rows:", d1);
  const { data: d2 } = await supabase.from('exam_questions').select('tier, calculator').ilike('tier', '%11%').limit(5);
  console.log("11+ rows:", d2);
  const { data: d3, error: e3 } = await supabase.rpc('fetch_exam_questions_v3', {
    p_tiers: ['11+ Standard'],
    p_calculators: ['Non-Calculator'],
    p_question_types: null,
    p_subtopics: null,
    p_difficulty_min: 1,
    p_difficulty_max: 3,
    p_limit: 5,
    p_exclude_ids: []
  });
  console.log("RPC Error:", e3);
  console.log("RPC rows:", d3);
}
check();
