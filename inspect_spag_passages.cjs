const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};

const url = getVal('VITE_SUPABASE_URL');
const serviceKey = getVal('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, serviceKey);

async function inspectSpag() {
  console.log('Inspecting "spag" passages in english_passages...');
  const { data, error } = await supabase
    .from('english_passages')
    .select('id, sectionId, subtopic, title, passageBlocks, questions')
    .ilike('sectionId', '%spag%');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${data.length} SPaG passages.`);
  data.forEach(p => {
    console.log(`\nID: ${p.id} | Title: ${p.title} | Subtopic: ${p.subtopic}`);
    console.log(`Passage Block Count: ${p.passageBlocks?.length}`);
    if (p.passageBlocks && p.passageBlocks.length > 0) {
      console.log(`First Block Text: ${p.passageBlocks[0].text.substring(0, 100)}...`);
    }
    console.log(`Questions Count: ${p.questions?.length}`);
    if (p.questions && p.questions.length > 0) {
      console.log(`First Question Text: ${p.questions[0].text.substring(0, 100)}...`);
    }
  });
}

inspectSpag();
