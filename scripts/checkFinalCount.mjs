import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFinalCount() {
  const { count, error } = await supabase
    .from('exam_questions')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error("Error fetching count:", error);
  } else {
    console.log(`Final Question Count: ${count}`);
  }
}

checkFinalCount().catch(console.error);
