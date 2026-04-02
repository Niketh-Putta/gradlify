import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Analyzing old questions...");
  
  // Find the timestamp threshold (assuming the new run started today, after 06:00 UTC)
  const THRESHOLD = "2026-04-01T06:00:00Z";
  
  // Count how many are OLD
  let { count: oldCount } = await supabase
    .from('exam_questions')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', THRESHOLD);
    
  // Count how many are NEW
  let { count: newCount } = await supabase
    .from('exam_questions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', THRESHOLD);

  console.log(`Found ${oldCount} OLD questions before ${THRESHOLD}`);
  console.log(`Found ${newCount} NEW questions generated today since ${THRESHOLD}`);
  
  // Actually DELETE the old ones
  if (oldCount > 0) {
     console.log(`Deleting all ${oldCount} old questions...`);
     // We can't delete all rows without an eq or in, but we can delete with lt
     const { error } = await supabase.from('exam_questions')
        .delete()
        .lt('created_at', THRESHOLD);
        
     if (error) console.error("Error deleting:", error);
     else console.log("Deletion successful.");
  }
}
run().catch(console.error);
