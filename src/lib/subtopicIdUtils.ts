import { getSubtopicKeys, getSubtopicUUID } from '@/lib/subtopic-mapping';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ELEVEN_PLUS_SUBTOPIC_MAP: Record<string, string> = {
  'stats|data-handling': 'data|handling',
  'stats,data-handling': 'data|handling',
  'stats.data-handling': 'data|handling',
  'stats|charts-graphs': 'data|charts',
  'stats,charts-graphs': 'data|charts',
  'stats.charts-graphs': 'data|charts',
  'stats|probability': 'data|probability',
  'stats,probability': 'data|probability',
  'stats.probability': 'data|probability',
  'geometry|2d-3d-shapes': 'geometry|shapes',
  'geometry,2d-3d-shapes': 'geometry|shapes',
  'geometry.2d-3d-shapes': 'geometry|shapes',
  'geometry|measures': 'geometry|measures-time',
  'geometry,measures': 'geometry|measures-time',
  'geometry.measures': 'geometry|measures-time',
  'geometry|volume-surface-area': 'geometry|volume',
  'geometry,volume-surface-area': 'geometry|volume',
  'geometry.volume-surface-area': 'geometry|volume',
  'number|powers-roots': 'number|powers',
  'number|powers_roots': 'number|powers',
  'number|powers-and-roots': 'number|powers',
  'number,powers-roots': 'number|powers',
  'number,powers_roots': 'number|powers',
  'number,powers-and-roots': 'number|powers',
  'number.powers-roots': 'number|powers',
  'number.powers_roots': 'number|powers',
  'number.powers-and-roots': 'number|powers',
  'number_arithmetic|place_value_rounding': 'number,place-value',
  'number_arithmetic|negative_numbers': 'number,negatives',
  'number_arithmetic|addition_subtraction': 'number,addition-subtraction',
  'number_arithmetic|multiplication_division': 'number,multiplication-division',
  'number_arithmetic|order_of_operations_bidmas': 'number,bidmas',
  'number_arithmetic|factors_multiples_primes': 'number,factors-multiples-primes',
  'number_arithmetic|powers_roots_squares_cubes': 'number,powers',
  'number_arithmetic|fractions_basics_operations': 'number,fractions',
  'number_arithmetic|decimals_percentages': 'number,decimals-percentages',
  'algebra_ratio|ratio_sharing_simplifying': 'algebra,ratio',
  'algebra_ratio|proportion_recipes_costs': 'algebra,proportion',
  'algebra_ratio|algebra_basics_expressions': 'algebra,basics',
  'algebra_ratio|substitution': 'algebra,substitution',
  'algebra_ratio|solving_equations': 'algebra,equations',
  'algebra_ratio|sequences_nth_term': 'algebra,sequences',
  'geometry_measures|shapes_2d_3d': 'geometry|2d-3d-shapes',
  'geometry_measures|angles_parallel_lines': 'geometry,angles',
  'geometry_measures|perimeter_area': 'geometry,perimeter-area',
  'geometry_measures|volume_cuboids_prisms': 'geometry,volume',
  'geometry_measures|measures_time_speed': 'geometry,measures-time',
  'geometry_measures|coordinates_transformations': 'geometry,coordinates',
  'statistics_data|data_handling_averages': 'data,handling',
  'statistics_data|charts_graphs': 'data,charts',
  'statistics_data|probability': 'data,probability',
  'problem_solving_strategies|word_problems_rucsac': 'strategies|word-problems',
  'problem_solving_strategies|logic_reasoning': 'strategies|logic',
  'problem_solving_strategies|logic': 'strategies|logic',
  'problem_solving_strategies|logic_and_reasoning': 'strategies|logic',
  'problem_solving_strategies|logic-reasoning': 'strategies|logic',
  'problem_solving_strategies|estimation_checking': 'strategies|estimation',
  'strategies|logic-reasoning': 'strategies|logic',
  'strategies|logic_reasoning': 'strategies|logic',
  'strategies|logic and reasoning': 'strategies|logic',
  'strategies|logic-and-reasoning': 'strategies|logic',
  'strategies|logic&reasoning': 'strategies|logic',
  'strategies|estimation-checking': 'strategies|estimation',
  'strategies,logic-reasoning': 'strategies|logic',
  'strategies,logic_reasoning': 'strategies|logic',
  'strategies,logic and reasoning': 'strategies|logic',
  'strategies,logic-and-reasoning': 'strategies|logic',
  'strategies,estimation-checking': 'strategies|estimation',
  'problem-solving,word-problems': 'strategies|word-problems',
  'problem-solving,logic': 'strategies|logic',
  'problem-solving,logic_reasoning': 'strategies|logic',
  'problem-solving,logic-and-reasoning': 'strategies|logic',
  'problem-solving,logic-reasoning': 'strategies|logic',
  'problem-solving,estimation-checking': 'strategies|estimation',
  'strategies,word-problems': 'strategies|word-problems',
  'strategies,logic': 'strategies|logic',
  'english_comp|factual_retrieval': 'comprehension|literal',
  'english_comp|inference': 'comprehension|inference',
  'english_comp|vocabulary_context': 'vocabulary|context',
  'english_comp|text_structure': 'literary|structure',
  'english_comp|authorial_voice': 'comprehension|speculation',
  'english_comp|figurative_language': 'literary|technique',
  'english_comp|character_analysis': 'comprehension|speculation',
  'english_comp|speed_retrieval': 'comprehension|speed',
  'english_spag|spag-word_classes': 'grammar|word-classes',
  'english_spag|spag-punctuation_marks': 'punctuation|marks',
  'english_spag|spag-sentence_structure': 'grammar|sentence-structure',
  'english_spag|spag-spelling_rules': 'spelling|rules',
  'english_spag|spag-active_passive': 'grammar|sentence-structure',
  'english_vocab|synonyms': 'vocabulary|synonyms',
  'english_vocab|antonyms': 'vocabulary|synonyms',
  'english_vocab|homophones': 'spelling|rules',
  'english_vocab|prefixes': 'vocabulary|context',
  'english_vocab|suffixes': 'vocabulary|context',
  'english_vocab|root-words': 'vocabulary|context',
  'english_vocab|odd-one-out': 'vocabulary|odd-one-out',
  'english_vocab|cloze': 'vocabulary|cloze',
  'english_vocab|emotion': 'vocabulary|context',
  'english_vocab|adjectives': 'grammar|word-classes',
};
const ELEVEN_PLUS_TOPIC_TYPE_MAP: Record<string, string[]> = {
  'Number & Arithmetic': ['Number', 'Number & Arithmetic', 'NUMBER & ARITHMETIC'],
  'Number': ['Number', 'Number & Arithmetic', 'NUMBER & ARITHMETIC'],
  'Algebra & Ratio': ['Algebra', 'Algebra & Ratio', 'ALGEBRA & RATIO'],
  'Algebra': ['Algebra', 'Algebra & Ratio', 'ALGEBRA & RATIO'],
  'Geometry & Measures': ['Geometry & Measures', 'GEOMETRY & MEASURES', 'Geometry'],
  'Statistics & Data': ['Statistics', 'Data', 'Statistics & Data', 'STATISTICS & DATA'],
  'Statistics': ['Statistics', 'Data', 'Statistics & Data', 'STATISTICS & DATA'],
  'Data': ['Data', 'Statistics', 'Statistics & Data', 'STATISTICS & DATA'],
  'Problem Solving & Strategies': ['Problem Solving', 'Strategies', 'Logic', 'Problem Solving & Strategies', 'PROBLEM SOLVING & STRATEGIES'],
  'Problem Solving': ['Problem Solving', 'Strategies', 'Logic', 'Problem Solving & Strategies', 'PROBLEM SOLVING & STRATEGIES'],
  'Strategies': ['Strategies', 'Problem Solving', 'Logic', 'Problem Solving & Strategies', 'PROBLEM SOLVING & STRATEGIES'],
  'Comprehension': ['Comprehension', 'English', 'Literacy'],
  'Vocabulary': ['Vocabulary', 'Verbal Reasoning', 'English'],
  'SPaG': ['Grammar', 'Spelling', 'Punctuation', 'SPaG', 'Technical Accuracy', 'English'],
};

function addSubtopicVariants(value: string, candidates: Set<string>) {
  const raw = String(value ?? '').trim();
  if (!raw) return;
  candidates.add(raw);
  const match = raw.match(/^([^|,.]+)[|,.](.+)$/);
  if (!match) return;
  const topic = match[1]?.trim();
  const subtopic = match[2]?.trim();
  if (!topic || !subtopic) return;
  candidates.add(`${topic}|${subtopic}`);
  candidates.add(`${topic}.${subtopic}`);
  candidates.add(`${topic},${subtopic}`);
}

function canonicalizeSubtopicToken(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, '|')
    .replace(/\s+/g, ' ');
}

export function expandSubtopicIdsForDb(rawId: string): string[] {
  const value = String(rawId ?? '').trim();
  if (!value) return [];

  const candidates = new Set<string>();
  addSubtopicVariants(value, candidates);

  // If a UUID is passed, also include any known UI keys that map to it.
  if (UUID_RE.test(value)) {
    for (const key of getSubtopicKeys(value)) {
      const [topicKey, subtopicKey] = key.split('.');
      if (topicKey && subtopicKey) {
        candidates.add(`${topicKey}|${subtopicKey}`);
        candidates.add(`${topicKey}.${subtopicKey}`);
      }
    }

    return Array.from(candidates);
  }

  const canonicalInput = canonicalizeSubtopicToken(value);
  for (const [legacyKey, canonicalKey] of Object.entries(ELEVEN_PLUS_SUBTOPIC_MAP)) {
    const canonicalLegacy = canonicalizeSubtopicToken(legacyKey);
    const canonicalMapped = canonicalizeSubtopicToken(canonicalKey);
    if (canonicalLegacy === canonicalInput) {
      addSubtopicVariants(canonicalKey, candidates);
    }
    if (canonicalMapped === canonicalInput) {
      addSubtopicVariants(legacyKey, candidates);
    }
  }

  // geometry|volume-surface-area should match both legacy volume and surface-area variants.
  if (canonicalInput === 'geometry|volume-surface-area') {
    addSubtopicVariants('geometry|volume', candidates);
    addSubtopicVariants('geometry|surface-area', candidates);
    addSubtopicVariants('geometry_measures|volume_cuboids_prisms', candidates);
    addSubtopicVariants('geometry|volume-cuboids-prisms', candidates);
  }

  // Accept either "topicKey|subtopicKey" or "topicKey.subtopicKey".
  let topicKey: string | undefined;
  let subtopicKey: string | undefined;

  if (value.includes('|')) {
    [topicKey, subtopicKey] = value.split('|');
    if (topicKey && subtopicKey) candidates.add(`${topicKey}.${subtopicKey}`);
    if (topicKey && subtopicKey) candidates.add(`${topicKey},${subtopicKey}`);
  } else if (value.includes(',')) {
    [topicKey, subtopicKey] = value.split(',');
    if (topicKey && subtopicKey) candidates.add(`${topicKey}|${subtopicKey}`);
    if (topicKey && subtopicKey) candidates.add(`${topicKey}.${subtopicKey}`);
  } else if (value.includes('.')) {
    [topicKey, subtopicKey] = value.split('.');
    if (topicKey && subtopicKey) candidates.add(`${topicKey}|${subtopicKey}`);
    if (topicKey && subtopicKey) candidates.add(`${topicKey},${subtopicKey}`);
  }

  if (topicKey && subtopicKey) {
    const uuid = getSubtopicUUID(topicKey, subtopicKey);
    if (uuid) candidates.add(uuid);
  }

  return Array.from(candidates);
}

export function expandQuestionTypesForDb(rawTopicId: string): string[] {
  const topicId = String(rawTopicId ?? '').trim();
  if (!topicId) return [];

  const mappedElevenPlusTopic = ELEVEN_PLUS_TOPIC_TYPE_MAP[topicId];
  if (mappedElevenPlusTopic) return Array.from(new Set(mappedElevenPlusTopic));

  // Back-compat for legacy rows.
  if (topicId === 'Geometry & Measures') return ['Geometry & Measures', 'Geometry'];
  return [topicId];
}
