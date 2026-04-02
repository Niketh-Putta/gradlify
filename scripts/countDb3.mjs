import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://gknnfbalijxykqycopic.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14"
);

async function findTypes() {
  const { data } = await supabase
    .from('exam_questions')
    .select('question_type')
    .eq('track', '11plus')
    ;// we can't do distinct easily with supabase js so we just fetch all and log unique values
  
  const uniqueTypes = [...new Set(data.map(d => d.question_type))];
  console.log("Distinct question types for 11plus track:");
  console.log(uniqueTypes);
}
findTypes().catch(console.error);
