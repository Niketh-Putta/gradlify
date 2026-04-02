import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deduplicate() {
  const { data: subtopicsData, error: e1 } = await supabase.from('exam_questions').select('subtopic');
  if (e1) { console.error(e1); return; }
  
  const uniqueSubtopics = [...new Set(subtopicsData.map(d => d.subtopic))];
  
  let totalDeleted = 0;
  
  for (const sub of uniqueSubtopics) {
     const { data: questions, error } = await supabase
        .from('exam_questions')
        .select('id, created_at')
        .eq('subtopic', sub)
        .order('created_at', { ascending: false });
        
     if (questions && questions.length > 60) {
        // Keep the latest 60
        const toDeleteIds = questions.slice(60).map(q => q.id);
        
        // Delete in batches to avoid URL too long issues if doing .in()
        for (let i = 0; i < toDeleteIds.length; i += 100) {
            const batch = toDeleteIds.slice(i, i + 100);
            const { error: delErr } = await supabase
                .from('exam_questions')
                .delete()
                .in('id', batch);
            if (delErr) {
               console.error("Del Error:", delErr);
            } else {
               totalDeleted += batch.length;
               console.log(`Deleted ${batch.length} old questions for ${sub}`);
            }
        }
     }
  }
  
  console.log(`Deduplication complete! Deleted ${totalDeleted} excess questions from aborted runs.`);
  
  // Final count check
  const { count } = await supabase.from('exam_questions').select('*', { count: 'exact', head: true });
  console.log(`Total questions firmly remaining in database: ${count}`);
}

deduplicate().catch(console.error);
