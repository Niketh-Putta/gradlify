import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('exam_questions').select('subtopic').eq('track', '11plus');
  if (error) throw error;
  
  const counts = {};
  for (const q of data) {
    const sub = String(q.subtopic || 'Unknown').trim();
    counts[sub] = (counts[sub] || 0) + 1;
  }
  
  // sort by count desc
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [sub, count] of sorted) {
    console.log(`${sub}: ${count}`);
  }
}
run().catch(console.error);
