import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://gknnfbalijxykqycopic.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"
);

async function count() {
  const { data, count: mathsCount, error } = await supabase
    .from('exam_questions')
    .select('id', { count: 'exact', head: true })
    .eq('track', '11plus')
    .in('question_type', ['Number', 'Algebra', 'Ratio & Proportion', 'Geometry & Measures', 'Geometry', 'Probability', 'Statistics']);

  console.log(`Live Supabase DB Maths Questions: ${mathsCount}`);
  
  const { count: engCount } = await supabase
    .from('english_passages')
    .select('id', { count: 'exact', head: true });
    
  console.log(`Live Supabase DB English Passages: ${engCount}`);
}
count().catch(console.error);
