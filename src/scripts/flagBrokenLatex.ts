import { supabase } from '@/integrations/supabase/client';

export async function flagBrokenLatex() {
  try {
    console.log('Scanning exam_questions for broken LaTeX patterns...');
    
    // Fetch all questions that aren't already flagged
    const { data: questions, error: fetchError } = await supabase
      .from('exam_questions')
      .select('id, question, all_answers')
      .eq('needs_fix', false);

    if (fetchError) {
      console.error('Error fetching questions:', fetchError);
      return;
    }

    const idsToFlag: string[] = [];

    // Patterns to detect broken LaTeX
    const brokenPatterns = {
      fracNoBrace: /\\frac[^{]/,
      fracIncomplete: /\\frac\{[^}]+\}[^{]/,
      sqrtNoBrace: /\\sqrt\d/,
      backslashDigit: /\\\d/,
      doubleDollar: /\$\$/,
      powerFrac: /\^\\frac/,
      unmatchedBraces: (text: string) => {
        const open = (text.match(/{/g) || []).length;
        const close = (text.match(/}/g) || []).length;
        return open !== close;
      }
    };

    // Check each question
    for (const q of questions || []) {
      let needsFix = false;

      // Check question text
      if (q.question) {
        for (const [name, pattern] of Object.entries(brokenPatterns)) {
          if (typeof pattern === 'function') {
            if (pattern(q.question)) {
              console.log(`Found ${name} in question ${q.id}`);
              needsFix = true;
              break;
            }
          } else if (pattern.test(q.question)) {
            console.log(`Found ${name} in question ${q.id}`);
            needsFix = true;
            break;
          }
        }
      }

      // Check answer options
      if (q.all_answers && Array.isArray(q.all_answers)) {
        for (const ans of q.all_answers) {
          if (typeof ans === 'string') {
            // Check for dollar signs (shouldn't be in answers)
            if (ans.includes('$')) {
              console.log(`Found dollar signs in answer for ${q.id}`);
              needsFix = true;
              break;
            }
            // Check for any LaTeX in answers
            if (ans.includes('\\')) {
              console.log(`Found LaTeX in answer for ${q.id}`);
              needsFix = true;
              break;
            }
          }
        }
      }

      if (needsFix) {
        idsToFlag.push(q.id);
      }
    }

    console.log(`Found ${idsToFlag.length} questions with broken LaTeX`);
    console.log('Sample IDs:', idsToFlag.slice(0, 5));

    // Update in batches of 100
    const batchSize = 100;
    for (let i = 0; i < idsToFlag.length; i += batchSize) {
      const batch = idsToFlag.slice(i, i + batchSize);
      const { error: updateError } = await supabase
        .from('exam_questions')
        .update({ needs_fix: true })
        .in('id', batch);

      if (updateError) {
        console.error('Error updating batch:', updateError);
      } else {
        console.log(`Updated batch ${i / batchSize + 1}: ${batch.length} rows`);
      }
    }

    return {
      flagged_count: idsToFlag.length,
      sample_ids: idsToFlag.slice(0, 5)
    };
  } catch (error) {
    console.error('Error in flagBrokenLatex:', error);
    throw error;
  }
}

// Run if called directly
const windowWithFlag = typeof window !== 'undefined'
  ? (window as Window & { flagBrokenLatex?: unknown })
  : null;

if (windowWithFlag && typeof windowWithFlag.flagBrokenLatex === 'function') {
  flagBrokenLatex().then(result => {
    console.log('Complete:', result);
  });
}
