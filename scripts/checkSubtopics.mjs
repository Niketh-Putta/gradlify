import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSubtopics() {
  const { data, error } = await supabase.from('exam_questions').select('subtopic');
  if (error) {
     console.error(error);
     return;
  }
  const counts = {};
  data.forEach((row) => {
     counts[row.subtopic] = (counts[row.subtopic] || 0) + 1;
  });
  
  // Sort alphabetically
  const keys = Object.keys(counts).sort();
  console.log("-----------------------------------------");
  console.log("Subtopic Name | Count");
  console.log("-----------------------------------------");
  keys.forEach(k => {
     console.log(`${k.padEnd(35)} | ${counts[k]}`);
  });
  console.log("-----------------------------------------");
  console.log("Total unique topics found:", keys.length);
  const total = Object.values(counts).reduce((a,b) => a+b, 0);
  console.log("Total questions in table:", total);
}
checkSubtopics().catch(console.error);
