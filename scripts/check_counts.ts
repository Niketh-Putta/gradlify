import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('exam_questions')
      .select('question_type, subtopic')
      .eq('track', '11plus')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    page++;
  }
  
  const counts: Record<string, number> = {};
  for (const q of allData) {
    const sub = String(q.subtopic || 'Unknown').trim();
    counts[sub] = (counts[sub] || 0) + 1;
  }
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [sub, count] of sorted) {
    if (count > 60) {
      console.log(`EXCEEDS 60: ${sub}: ${count}`);
    } else {
      console.log(`OK: ${sub}: ${count}`);
    }
  }
}

run().catch(console.error);
