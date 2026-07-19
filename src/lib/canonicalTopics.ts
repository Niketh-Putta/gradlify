/**
 * Single source of truth for readiness topic labels.
 * Keep in sync with public.canonicalize_readiness_topic() in Supabase.
 *
 * Bank/UI may use 11+ section names ("Algebra & Ratio"); readiness storage
 * must use canonical GCSE-style topics ("Algebra") or mastery stays at 0%.
 */

export const CANONICAL_READINESS_TOPICS = [
  'Number',
  'Algebra',
  'Ratio & Proportion',
  'Geometry',
  'Probability',
  'Statistics',
  'Comprehension',
  'Vocabulary',
  'Grammar',
  'Spelling',
] as const;

export type CanonicalReadinessTopic = (typeof CANONICAL_READINESS_TOPICS)[number];

/** Aliases → primary readiness topic (mirrors SQL canonicalize_readiness_topic). */
const PRIMARY_ALIAS_MAP: Record<string, CanonicalReadinessTopic> = {
  number: 'Number',
  'arithmetic & number skills': 'Number',
  'number & arithmetic': 'Number',
  'number and arithmetic': 'Number',

  algebra: 'Algebra',
  'algebra & ratio': 'Algebra',
  'algebra and ratio': 'Algebra',

  ratio: 'Ratio & Proportion',
  'ratio & proportion': 'Ratio & Proportion',
  'ratio and proportion': 'Ratio & Proportion',
  'word problems & reasoning': 'Ratio & Proportion',
  'fractions/decimals/percentages (fdp)': 'Ratio & Proportion',
  fdp: 'Ratio & Proportion',

  geometry: 'Geometry',
  'geometry & measures': 'Geometry',
  'geometry and measures': 'Geometry',
  'geometry & spatial awareness': 'Geometry',

  probability: 'Probability',
  'speed & accuracy': 'Probability',
  'data, probability & problem solving': 'Probability',

  statistics: 'Statistics',
  'statistics & data': 'Statistics',
  'statistics and data': 'Statistics',
  data: 'Statistics',

  comprehension: 'Comprehension',
  'comprehension masterclass': 'Comprehension',
  vocabulary: 'Vocabulary',
  'advanced vocabulary': 'Vocabulary',
  grammar: 'Grammar',
  'grammar & syntax': 'Grammar',
  spelling: 'Spelling',
  'spelling & punctuation': 'Spelling',
  spag: 'Grammar',
};

/** Combined 11+ sections also credit a secondary topic (mirrors SQL secondary fn). */
const SECONDARY_ALIAS_MAP: Record<string, CanonicalReadinessTopic> = {
  'algebra & ratio': 'Ratio & Proportion',
  'algebra and ratio': 'Ratio & Proportion',
  'statistics & data': 'Probability',
  'statistics and data': 'Probability',
  // SPaG bank is one section; Grammar practice also moves Spelling so Target Focus isn't stuck at 0%.
  grammar: 'Spelling',
  spag: 'Spelling',
  'spag (technical accuracy)': 'Spelling',
};

const PROBLEM_SOLVING_ALIASES = new Set([
  'problem solving',
  'problem-solving',
  'problem solving & strategies',
  'problem solving and strategies',
  'problem-solving & strategies',
  'problem-solving and strategies',
  'exam preparation',
  'strategies',
]);

function normalizeKey(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Map any bank/UI/mock label to the primary readiness topic, or null if not assessed. */
export function canonicalizeReadinessTopic(raw: string): CanonicalReadinessTopic | null {
  const key = normalizeKey(raw);
  if (!key) return null;
  if (PROBLEM_SOLVING_ALIASES.has(key)) return null;
  return PRIMARY_ALIAS_MAP[key] ?? null;
}

/** Secondary credit for combined 11+ sections (Algebra & Ratio → also Ratio). */
export function canonicalizeReadinessTopicSecondary(raw: string): CanonicalReadinessTopic | null {
  const key = normalizeKey(raw);
  if (!key) return null;
  return SECONDARY_ALIAS_MAP[key] ?? null;
}

/**
 * For write paths: return canonical topic when known, otherwise original trimmed string.
 * Never invent labels — unknown strings pass through (DB view still aliases known ones).
 */
export function toStoredReadinessTopic(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return trimmed;
  return canonicalizeReadinessTopic(trimmed) ?? trimmed;
}

/**
 * For mock_questions / practice_results rows that feed dual-credit sections:
 * keep the combined 11+ label so Ratio / Probability still update alongside Algebra / Statistics.
 * Other labels are stored as primary readiness topics.
 */
export function toStoredMockTopic(raw: string): string {
  const key = normalizeKey(raw);
  if (!key) return '';
  if (key === 'algebra & ratio' || key === 'algebra and ratio') return 'Algebra & Ratio';
  if (key === 'statistics & data' || key === 'statistics and data') return 'Statistics & Data';
  return toStoredReadinessTopic(raw);
}

/** Regression fixtures — must stay green in scripts/verify_topic_aliases.mjs */
export const TOPIC_ALIAS_REGRESSION_CASES: Array<{
  input: string;
  primary: CanonicalReadinessTopic | null;
  secondary: CanonicalReadinessTopic | null;
}> = [
  { input: 'Algebra & Ratio', primary: 'Algebra', secondary: 'Ratio & Proportion' },
  { input: 'algebra and ratio', primary: 'Algebra', secondary: 'Ratio & Proportion' },
  { input: 'Statistics & Data', primary: 'Statistics', secondary: 'Probability' },
  { input: 'Number & Arithmetic', primary: 'Number', secondary: null },
  { input: 'Geometry & Measures', primary: 'Geometry', secondary: null },
  { input: 'Algebra', primary: 'Algebra', secondary: null },
  { input: 'Ratio & Proportion', primary: 'Ratio & Proportion', secondary: null },
  { input: 'Problem Solving', primary: null, secondary: null },
  { input: 'comprehension', primary: 'Comprehension', secondary: null },
  { input: 'spag', primary: 'Grammar', secondary: 'Spelling' },
  { input: 'Grammar', primary: 'Grammar', secondary: 'Spelling' },
];
