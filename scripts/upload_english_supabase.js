const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadEnglishBank() {
  console.log("Loading the new nested 11+ English Premium JSON Bank...");
  const data = JSON.parse(fs.readFileSync('supabase/data/generated/11plus_premium_english_bank.json', 'utf8'));
  
  // NOTE: If your users consume English questions via a new table called 'english_passages',
  // we will push the Master Passage raw objects directly.
  
  console.log(`Prepared to upload ${data.length} Master Passages (${data.length * 10} nested questions).`);
  
  // Choose your table architecture:
  // Option 1: Pushing into a dedicated 'english_passages' table.
  
  const { data: uploadData, error } = await supabase
    .from('english_passages')
    .upsert(data);
    
  if (error) console.error("Upload error:", error);
  else console.log("✅ Successfully pushed all Master Passages to 'english_passages' table!");
}

uploadEnglishBank();
