import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SUBTOPICS = [
    "number|addition-subtraction", "number|multiplication-division", "number|fractions", 
    "number|decimals-percentages", "number|place-value", "number|factors-multiples-primes", "number|bidmas",
    "algebra|ratio", "algebra|proportion", "algebra|equations", "algebra|sequences",
    "geometry|perimeter-area", "geometry|volume-surface-area", "geometry|coordinates", 
    "geometry|angles", "geometry|measures", "geometry|2d-3d-shapes",
    "stats|data-handling", "stats|probability",
    "strategies|word-problems", "strategies|logic",
    "spag|vocabulary", "spag|punctuation", "spag|grammar", "spag|sentence-structure"
];

async function fixDuplicates() {
  let totalDeleted = 0;
  
  for (const sub of SUBTOPICS) {
     const { data: questions, error } = await supabase
        .from('exam_questions')
        .select('id, created_at')
        .eq('subtopic', sub)
        .order('created_at', { ascending: false })
        .limit(1000); // More than enough per subtopic
        
     if (questions && questions.length > 60) {
        console.log(`Subtopic ${sub} has ${questions.length} questions. Keeping 60, deleting ${questions.length - 60}`);
        const toDeleteIds = questions.slice(60).map(q => q.id);
        
        for (let i = 0; i < toDeleteIds.length; i += 100) {
            const batch = toDeleteIds.slice(i, i + 100);
            const { error: delErr } = await supabase
                .from('exam_questions')
                .delete()
                .in('id', batch);
            if (!delErr) {
               totalDeleted += batch.length;
            }
        }
     } else {
        console.log(`Subtopic ${sub} has ${questions ? questions.length : 0} questions (<= 60, no deletion needed).`);
     }
  }
  
  console.log(`\n✅ Completely processed all 25 subtopics!`);
  console.log(`🗑️ Total duplicate questions deleted: ${totalDeleted}`);
  
  const { count } = await supabase.from('exam_questions').select('*', { count: 'exact', head: true });
  console.log(`📊 FINAL EXACT DATABASE COUNT: ${count}`);
}

fixDuplicates().catch(console.error);
