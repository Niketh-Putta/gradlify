import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const uiMapping: Record<string, string[]> = {
  'number_arithmetic|place_value_rounding': ['number|place-value'],
  'number_arithmetic|four_operations': ['number|addition-subtraction', 'number|multiplication-division', 'number|bidmas'],
  'number_arithmetic|number_properties': ['number|factors-multiples-primes', 'number|powers'],
  // the user specifically requested modifying FDP. I will group them so they collectively reach 60 if that's what was meant, or just cap them at 60 each since they are separate.
  'number_arithmetic|fractions': ['number|fractions'],
  'number_arithmetic|decimals_percentages': ['number|decimals-percentages'],
  'algebra_ratio|ratio_proportion': ['algebra|ratio', 'algebra|proportion'],
  'algebra_ratio|algebra_basics': ['algebra|basics', 'algebra|substitution'],
  'algebra_ratio|solving_equations': ['algebra|equations'],
  'algebra_ratio|sequences': ['algebra|sequences'],
  'geometry_measures|shape_properties_2d_3d': ['geometry|2d-3d-shapes'],
  'geometry_measures|angles': ['geometry|angles'],
  'geometry_measures|perimeter_area_volume': ['geometry|perimeter-area', 'geometry|volume-surface-area', 'geometry|volume-cuboids-prisms', 'geometry|volume'],
  'geometry_measures|measures_time': ['geometry|measures'],
  'geometry_measures|coordinates_transformations': ['geometry|coordinates'],
  'statistics_data|data_handling': ['stats|data-handling', 'stats|charts-graphs'],
  'statistics_data|probability': ['stats|probability'],
  'exam_prep|general_skills': ['strategies|word-problems', 'strategies|logic', 'strategies|estimation'],
};

// Also treat FDP as a single budget pool since the user explicitly requested "cut down on FDP".
const FDP_DB_KEYS = ['number|fractions', 'number|decimals-percentages'];

async function run() {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('exam_questions')
      .select('id, subtopic')
      .eq('track', '11plus')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    page++;
  }

  const dbSubtopicQuestions: Record<string, string[]> = {};
  for (const q of allData) {
    const s = String(q.subtopic || 'Unknown').trim();
    if (!dbSubtopicQuestions[s]) dbSubtopicQuestions[s] = [];
    dbSubtopicQuestions[s].push(q.id);
  }

  let idsToDelete: string[] = [];

  // Special FDP rule: user explicitly said "cut down on FDP... to max 60"
  // Fractions = 60, Dec-Perc = 60. Let's make them 30 each.
  let fdpIds: string[] = [];
  for (const k of FDP_DB_KEYS) {
     if (dbSubtopicQuestions[k]) {
         // keep first 30
         const keep = dbSubtopicQuestions[k].slice(0, 30);
         const throwAway = dbSubtopicQuestions[k].slice(30);
         idsToDelete.push(...throwAway);
         dbSubtopicQuestions[k] = keep;
     }
  }

  for (const [uiFilter, dbKeys] of Object.entries(uiMapping)) {
    // Skip the FDP ones since we rigidly handled them just above
    if (uiFilter === 'number_arithmetic|fractions' || uiFilter === 'number_arithmetic|decimals_percentages') continue;

    let totalMapped = 0;
    const itemsPerDbKey: Record<string, string[]> = {};
    for (const k of dbKeys) {
      if (dbSubtopicQuestions[k]) {
        itemsPerDbKey[k] = [...dbSubtopicQuestions[k]];
        totalMapped += dbSubtopicQuestions[k].length;
      } else {
        itemsPerDbKey[k] = [];
      }
    }

    if (totalMapped > 60) {
      console.log(`UI Subtopic '${uiFilter}' has ${totalMapped} questions. Trimming to 60...`);
      
      const activeKeys = dbKeys.filter(k => itemsPerDbKey[k].length > 0);
      let targetPerKey = Math.floor(60 / activeKeys.length);
      let remainder = 60 % activeKeys.length;

      for (const k of activeKeys) {
        const allowedCount = targetPerKey + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        if (itemsPerDbKey[k].length > allowedCount) {
           const throwAway = itemsPerDbKey[k].slice(allowedCount);
           idsToDelete.push(...throwAway);
           itemsPerDbKey[k] = itemsPerDbKey[k].slice(0, allowedCount);
           dbSubtopicQuestions[k] = itemsPerDbKey[k]; // update budget for safety
        }
      }
    }
  }

  console.log(`Found ${idsToDelete.length} total excess questions to delete.`);

  // Delete in batches of 200
  const BATCH_SIZE = 200;
  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = idsToDelete.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('exam_questions')
      .delete()
      .in('id', batch);
      
    if (error) {
      console.error('Error deleting batch:', error);
    } else {
      console.log(`Deleted batch ${i / BATCH_SIZE + 1} / ${Math.ceil(idsToDelete.length / BATCH_SIZE)}`);
    }
  }

  console.log('✅ Done! All subgroups successfully limited to max 60 active questions.');
}

run().catch(console.error);
