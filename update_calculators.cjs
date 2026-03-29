
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
// We need the service role key to perform bulk updates without RLS getting in the way
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY to update database.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function updateAll11Plus() {
  console.log("Starting bulk update...");
  // Use `eq` on track to set all 11plus questions to Non-calculator
  const { data, error } = await supabase
    .from('exam_questions')
    .update({ calculator: 'Non-Calculator' })
    .eq('track', '11plus');

  if (error) {
    console.error("Bulk update failed:", error);
  } else {
    console.log("Successfully updated 11+ questions to Non-Calculator.");
  }
}

updateAll11Plus();
