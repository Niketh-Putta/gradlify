import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://gknnfbalijxykqycopic.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"
);

async function countAll() {
  const { count: all11plusTrack } = await supabase
    .from('exam_questions')
    .select('id', { count: 'exact', head: true })
    .eq('track', '11plus');

  const { count: allGcseTrack } = await supabase
    .from('exam_questions')
    .select('id', { count: 'exact', head: true })
    .eq('track', 'gcse');
    
  const { count: totalQ } = await supabase
    .from('exam_questions')
    .select('id', { count: 'exact', head: true });

  console.log(`Total 11plus track in DB: ${all11plusTrack}`);
  console.log(`Total GCSE track in DB: ${allGcseTrack}`);
  console.log(`Total all exam_questions: ${totalQ}`);
}
countAll().catch(console.error);
