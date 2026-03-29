
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY to update database.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function deleteBadQuestions() {
  console.log("Fetching questions with bad formatted answers...");
  
  const { data: questions, error } = await supabase
    .from('exam_questions')
    .select('id, all_answers, track, subtopic')
    .eq('track', '11plus')
    .eq('subtopic', 'geometry|coordinates');

  if (error) {
    console.error("Fetch failed:", error);
    return;
  }

  let idsToDelete = [];
  
  for (const q of questions) {
    if (q.all_answers && Array.isArray(q.all_answers)) {
      for (const ans of q.all_answers) {
        if (typeof ans === 'string' && (ans.endsWith('b') || ans.endsWith('a') || ans.endsWith('c') || ans.endsWith('d')) && ans.includes(')')) {
          idsToDelete.push(q.id);
          break; // move to next question
        }
      }
    }
  }

  console.log(`Found ${idsToDelete.length} bad coordinates questions to delete.`);

  if (idsToDelete.length === 0) {
    console.log("Nothing to delete. Exiting.");
    return;
  }

  // Delete them via chunks
  const chunkSize = 100;
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const { error: delErr } = await supabase
      .from('exam_questions')
      .delete()
      .in('id', chunk);
      
    if (delErr) {
      console.error("Deletion failed:", delErr);
    } else {
      console.log(`Deleted chunk ${i / chunkSize + 1}`);
    }
  }

  console.log("Successfully wiped bad string-suffixed (a,b,c,d) questions in coordinates.");
}

deleteBadQuestions();
