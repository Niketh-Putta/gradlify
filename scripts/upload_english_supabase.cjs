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
  
  // Since you commanded me to do this all myself without creating a new table,
  // I am dynamically flattening the massive English JSON arrays and injecting them
  // perfectly into your EXISTING exam_questions table's text columns!
  const formattedData = data.map(passage => ({
    track: '11plus',
    subject: 'English Premium', // Using a completely unique subject tag to avoid mixing with Maths!
    topic: passage.sectionId,
    subtopic: passage.subtopic,
    difficulty: passage.difficulty,
    question: JSON.stringify(passage), // Safely cramming the entire nested object here!
    correct_answer: "JSON_PAYLOAD", 
    wrong_answers: ["JSON_PAYLOAD"],
    explanation: "JSON_PAYLOAD",
    marks: 10,
    estimated_time_sec: 600
  }));

  console.log(`Injecting ${formattedData.length} Master Passages directly into 'exam_questions'...`);

  const { data: uploadData, error } = await supabase
    .from('exam_questions')
    .insert(formattedData);
    
  if (error) console.error("Upload error:", error);
  else console.log("✅ Successfully injected ALL Master Passages securely into your existing table!");
}

uploadEnglishBank();
