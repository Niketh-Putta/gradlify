import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Replicate robust generation from the platform, tailored for explicit generation
function generateSensibleWrongOption(correct: string, existing: string[]): string | null {
  // Check for £/money
  if (correct.includes('£')) {
    const numeric = Number(correct.replace(/[£,\s]/g, ''));
    if (Number.isFinite(numeric)) {
      const cands = [numeric * 1.1, numeric * 0.9, numeric + 5, Math.max(0, numeric - 5), numeric + 10, numeric / 2, numeric * 2];
      for (const val of cands) {
         const str = `£${val.toFixed(2).replace(/\.00$/, '')}`;
         if (!existing.includes(str) && str !== correct) { existing.push(str); return str; }
      }
    }
  }

  // Check for ratios
  const ratioMatch = correct.match(/^([0-9]+(?:\.[0-9]+)?)\s*:\s*([0-9]+(?:\.[0-9]+)?)$/);
  if (ratioMatch) {
    const a = Number(ratioMatch[1]); const b = Number(ratioMatch[2]);
    const cands = [
      `${a + 1}:${b}`, `${a}:${b + 1}`, `${b}:${a}`, `${Math.max(1, a - 1)}:${b}`, `${a}:${Math.max(1, b - 1)}`, `${a * 2}:${b}`, `${a}:${b * 2}`, `${a + 2}:${b}`, `${a}:${b + 2}`
    ];
    for (const opt of cands) {
       if (!existing.includes(opt) && opt !== correct) { existing.push(opt); return opt; }
    }
  }

  // Check generic numerical + units
  const numRegex = /^(-?[\d.,]+)(.*)$/;
  const match = correct.match(numRegex);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2] || '';
    if (Number.isFinite(val)) {
      const offsets = [-10, -5, -2, -1, 1, 2, 5, 10, val * 0.5, val * 2, val + 0.5, val - 0.5, val * 5, val / 5, val * 10, val / 10, val + 20, val - 20, val + 100];
      for (const offset of offsets) {
        const wrongNum = val + offset;
        if (wrongNum === val || (wrongNum <= 0 && val > 0)) continue;
        
        let str = Number.isInteger(wrongNum) ? wrongNum.toString() : wrongNum.toFixed(2).replace(/\.?0+$/, '');
        str += unit;
        
        if (!existing.includes(str) && str !== correct) { existing.push(str); return str; }
      }
    }
  }
  
  // Generic word manipulation (if no numbers found at all)
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const l of letters) {
     const str = correct + " " + l;
     if (!existing.includes(str) && str !== correct) { existing.push(str); return str; }
  }

  return null;
}

// Ensure math answers don't collide
function areEquivalent(a: string, b: string) {
    if (a.toLowerCase().trim() === b.toLowerCase().trim()) return true;
    const numA = parseFloat(a.replace(/[^\d.]/g, ''));
    const numB = parseFloat(b.replace(/[^\d.]/g, ''));
    if (!isNaN(numA) && !isNaN(numB) && numA === numB && a.includes('£') === b.includes('£')) {
        return a.replace(/[\d.\s]/g,'') === b.replace(/[\d.\s]/g,'');
    }
    return false;
}

async function run() {
  console.log('Fetching 11+ questions...');
  let hasMore = true;
  let offset = 0;
  const BATCH = 500;
  let fixedCount = 0;

  while (hasMore) {
    const { data: questions, error } = await supabase
      .from('exam_questions')
      .select('id, question, correct_answer, wrong_answers')
      .eq('track', '11plus')
      .range(offset, offset + BATCH - 1);

    if (error || !questions || questions.length === 0) {
      hasMore = false;
      break;
    }

    for (const q of questions) {
      const correct = String(q.correct_answer || '').trim();
      const wrongRaw = Array.isArray(q.wrong_answers) ? q.wrong_answers : [];
      let needsFix = false;

      // Evaluate if current wrong answers are high-quality
      let isGarbage = false;
      const BAD = ["cannot", "nonsense", "none of", "not enough", "different answer", "using", "pack a", "pack b"];
      
      const filteredWrong: string[] = [];
      const activeExisting = [correct];

      for (const w of wrongRaw) {
         const wStr = String(w).trim();
         const wLower = wStr.toLowerCase();
         if (!wStr || wStr === correct) { isGarbage = true; continue; }
         if (BAD.some(b => wLower.includes(b))) { isGarbage = true; continue; }
         
         // If it's pure alphabetical text but the correct answer is numeric
         if (!wStr.match(/\d/) && correct.match(/\d/)) { isGarbage = true; continue; }
         
         filteredWrong.push(wStr);
         activeExisting.push(wStr);
      }

      // If less than 4 valid wrong answers found, we might as well just wipe and regenerate 
      // if it was heavily garbage, to ensure consistency.
      if (filteredWrong.length < 4 || isGarbage || filteredWrong.length > 4) {
         needsFix = true;
         // Ensure we just keep whatever valid ones we have and fill the rest
         filteredWrong.splice(4);
         
         while (filteredWrong.length < 4) {
             let newOpt = generateSensibleWrongOption(correct, activeExisting);
             if (!newOpt) {
                 // Absolute fallback
                 const lastResortCount = filteredWrong.length + 2;
                 newOpt = correct.replace(/[\d.]+/g, (m) => (parseFloat(m) + lastResortCount).toString());
                 if (activeExisting.includes(newOpt) || newOpt === correct || !newOpt.match(/\d/)) {
                     newOpt = `Option ${String.fromCharCode(65 + filteredWrong.length * 2)}`;
                 }
                 activeExisting.push(newOpt);
             }
             filteredWrong.push(newOpt);
         }
      }

      if (needsFix) {
         // Shuffle answers properly so 'D' or 'E' isn't predictably the only generated wrong one
         const all_answers = [correct, ...filteredWrong].sort(() => Math.random() - 0.5);
         
         const { error: updateErr } = await supabase
           .from('exam_questions')
           .update({
               wrong_answers: filteredWrong,
               all_answers: all_answers
           })
           .eq('id', q.id);
           
         if (updateErr) {
             console.error(`Error updating ${q.id}:`, updateErr);
         } else {
             fixedCount++;
             if (fixedCount % 50 === 0) console.log(`Fixed ${fixedCount}...`);
         }
      }
    }
    
    offset += BATCH;
  }
  
  console.log(`✅ Done. Fixed ${fixedCount} total questions in the database.`);
}

run().catch(console.error);
