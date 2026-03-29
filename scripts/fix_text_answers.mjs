import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const env = fs.readFileSync(envPath, 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: questions, error } = await supabase
    .from('exam_questions')
    .select('id, question, correct_answer, wrong_answers')
    .eq('track', '11plus');

  if (error) {
    console.error(error);
    return;
  }

  const updates = [];
  
  for (const q of questions) {
    const w = q.wrong_answers || [];
    
    // Check if any wrong answer is exactly the correct answer plus a single letter a-e
    const isCorrupted = w.some(ans => {
        if (typeof ans !== 'string') return false;
        if (!ans.startsWith(q.correct_answer)) return false;
        const remainder = ans.replace(q.correct_answer, '');
        return /^[a-e]$/i.test(remainder);
    });

    if (isCorrupted) {
      let new_w = null;
      if (q.correct_answer === 'Equal') new_w = ["Supplementary", "Complementary", "Parallel"];
      else if (q.correct_answer === 'Line Graph') new_w = ["Pie Chart", "Bar Chart", "Scatter Graph"];
      else if (q.correct_answer === 'No') new_w = ["Yes", "Cannot tell", "Not enough info"];
      else if (q.correct_answer === 'Yes') new_w = ["No", "Cannot tell", "Not enough info"];
      else if (q.correct_answer === 'Neither, they are equal') new_w = ["The first is greater", "The second is greater", "Cannot be determined"];
      else if (q.correct_answer.includes('Quadrant')) {
        const quadrants = ["Top Right (Quadrant I)", "Top Left (Quadrant II)", "Bottom Left (Quadrant III)", "Bottom Right (Quadrant IV)"];
        const extractNumeral = (s) => (s.match(/I{1,3}|IV/) || [''])[0];
        const currentNum = extractNumeral(q.correct_answer);
        new_w = quadrants.filter(x => extractNumeral(x) !== currentNum).slice(0, 3);
      }
      else if (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(q.correct_answer)) {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        new_w = days.filter(x => x !== q.correct_answer).slice(0, 3);
      }
      else {
        // Name options
        // Only trigger this if we are pretty sure it's a name!
        // We know text generators usually are Logic type questions where `ans = p1`
        // Exclude purely numeric strings like '22.5cm²'
        if (q.correct_answer.match(/^[a-zA-Z]+$/)) {
          const words = q.question.split(/[\s\.\,\?\!]+/);
          const nameCandidates = words.filter(word => word.length > 2 && word[0] === word[0].toUpperCase() && !["Who", "What", "When", "Where", "Why", "The", "If", "Are", "In", "A", "An"].includes(word));
          const names = [...new Set(nameCandidates)].filter(x => x !== q.correct_answer);
          if (names.length > 0) {
              new_w = names.concat(["Cannot be determined", "Information missing"]).slice(0, 3);
          }
        }
      }
      
      if (new_w) {
         updates.push({ id: q.id, wrong_answers: new_w });
      }
    }
  }

  console.log(`Found ${updates.length} more questions to fix.`);
  
  let successes = 0;
  for (const update of updates) {
    const { error: updErr } = await supabase
      .from('exam_questions')
      .update({ wrong_answers: update.wrong_answers })
      .eq('id', update.id);
    if (updErr) {
      console.error(`Error updating ${update.id}:`, updErr);
    } else {
      successes++;
    }
  }
  
  console.log(`Successfully updated ${successes} questions.`);
}

run();
