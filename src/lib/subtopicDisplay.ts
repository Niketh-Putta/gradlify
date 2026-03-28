import { TOPIC_SUBTOPICS } from '@/lib/topicConstants';
import { getSubtopicKeys } from '@/lib/subtopic-mapping';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOPIC_NAME_ALIASES: Record<string, string> = {
  number: 'Number',
  algebra: 'Algebra',
  stats: 'Statistics & Data',
  ratio: 'Ratio & Proportion',
  probability: 'Probability',
  statistics: 'Statistics',
  geometry: 'Geometry & Measures',
  'geometry & measures': 'Geometry & Measures',
  'geometry and measures': 'Geometry & Measures',
  'ratio and proportion': 'Ratio & Proportion',
  'ratio & proportion': 'Ratio & Proportion',
};

const ELEVEN_PLUS_MODULE_LABEL_BY_TOPIC_KEY: Record<string, string> = {
  number: 'Number & Arithmetic',
  algebra: 'Algebra & Ratio',
  geometry: 'Geometry & Measures',
  data: 'Statistics & Data',
  statistics: 'Statistics & Data',
  strategies: 'Problem Solving & Strategies',
  'problem-solving': 'Problem Solving & Strategies',
  problem_solving: 'Problem Solving & Strategies',
};

const ELEVEN_PLUS_MODULE_LABEL_ALIASES: Record<string, string> = {
  number: 'Number & Arithmetic',
  'number & arithmetic': 'Number & Arithmetic',
  algebra: 'Algebra & Ratio',
  'algebra & ratio': 'Algebra & Ratio',
  'algebra and ratio': 'Algebra & Ratio',
  geometry: 'Geometry & Measures',
  'geometry & measures': 'Geometry & Measures',
  'geometry and measures': 'Geometry & Measures',
  data: 'Statistics & Data',
  statistics: 'Statistics & Data',
  'statistics & data': 'Statistics & Data',
  'problem solving': 'Problem Solving & Strategies',
  'problem solving & strategies': 'Problem Solving & Strategies',
  'problem-solving': 'Problem Solving & Strategies',
  strategies: 'Problem Solving & Strategies',
  logic: 'Problem Solving & Strategies',
  estimation: 'Problem Solving & Strategies',
  'word problems': 'Problem Solving & Strategies',
  'word-problems': 'Problem Solving & Strategies',
};

const SUBTOPIC_KEY_ALIASES: Record<string, string> = {
  'powers-roots': 'powers',
  'powers_roots': 'powers',
  'powers-and-roots': 'powers',
  '2d-3d-shapes': 'shapes',
  '2d_3d_shapes': 'shapes',
  'data-handling': 'handling',
  'data_handling': 'handling',
  'charts-graphs': 'charts',
  'charts_graphs': 'charts',
};

const SUBTOPIC_LABEL_OVERRIDES: Record<string, string> = {
  'geometry|2d-3d-shapes': '2D & 3D Shapes',
  'geometry|measures': 'Measures, Time & Speed',
  'geometry|volume-surface-area': 'Volume & Surface Area',
  'stats|data-handling': 'Data Handling',
  'stats|charts-graphs': 'Charts & Graphs',
  'stats|probability': 'Probability',
};

function normalizeSubtopicKey(raw: string): string {
  const value = String(raw ?? '').trim();
  if (!value) return value;
  return SUBTOPIC_KEY_ALIASES[value.toLowerCase()] ?? value;
}

function normalizeTopicLabel(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  const alias = TOPIC_NAME_ALIASES[value.toLowerCase()];
  if (alias) return alias;

  const maybeKey = value.toLowerCase() as keyof typeof TOPIC_SUBTOPICS;
  if (maybeKey in TOPIC_SUBTOPICS) {
    return TOPIC_SUBTOPICS[maybeKey].name;
  }

  return value;
}

function looksLikeCanonicalSubtopicId(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  if (UUID_RE.test(v)) return true;
  return v.includes('|') || v.includes('.');
}

function canonicalizeSubtopicId(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  if (UUID_RE.test(value)) {
    const keys = getSubtopicKeys(value);
    const first = keys[0];
    if (!first) return null;
    const [topicKey, subtopicKey] = first.split('.');
    if (!topicKey || !subtopicKey) return null;
    return `${topicKey}|${subtopicKey}`;
  }

  if (value.includes('|')) {
    const [topicKey, subtopicRaw] = value.split('|');
    const subtopicKey = normalizeSubtopicKey(subtopicRaw);
    if (!topicKey || !subtopicKey) return null;
    return `${topicKey}|${subtopicKey}`;
  }

  if (value.includes('.')) {
    const [topicKey, subtopicRaw] = value.split('.');
    const subtopicKey = normalizeSubtopicKey(subtopicRaw);
    if (!topicKey || !subtopicKey) return null;
    return `${topicKey}|${subtopicKey}`;
  }

  return null;
}

function lookupSubtopicName(canonicalId: string): { topicLabel: string | null; subtopicLabel: string | null } {
  const override = SUBTOPIC_LABEL_OVERRIDES[canonicalId];
  if (override) {
    const [topicKeyRaw] = canonicalId.split('|');
    return {
      topicLabel: normalizeTopicLabel(topicKeyRaw),
      subtopicLabel: override,
    };
  }

  const [topicKeyRaw, subtopicKeyRaw] = canonicalId.split('|');
  const topicKey = (topicKeyRaw || '').trim().toLowerCase() as keyof typeof TOPIC_SUBTOPICS;
  const subtopicKey = (subtopicKeyRaw || '').trim();

  const topic = TOPIC_SUBTOPICS[topicKey];
  if (!topic) {
    return { topicLabel: normalizeTopicLabel(topicKeyRaw), subtopicLabel: subtopicKey || null };
  }

  const sub = topic.subtopics.find((s) => s.key === subtopicKey);
  return {
    topicLabel: topic.name,
    subtopicLabel: sub?.name ?? (subtopicKey || null),
  };
}

export function getTopicAndSubtopicLabels(args: {
  questionType?: string | null;
  subtopicId?: string | null;
  fallbackTopic?: string | null;
}): { topicLabel: string | null; subtopicLabel: string | null } {
  const questionType = String(args.questionType ?? '').trim();
  const fallbackTopic = normalizeTopicLabel(args.fallbackTopic);

  const canonicalFromSubtopic = canonicalizeSubtopicId(args.subtopicId);
  const canonicalFromQuestionType = questionType && looksLikeCanonicalSubtopicId(questionType)
    ? canonicalizeSubtopicId(questionType)
    : null;

  const canonical = canonicalFromSubtopic ?? canonicalFromQuestionType;
  if (canonical) {
    const lookedUp = lookupSubtopicName(canonical);
    const topicLabel = lookedUp.topicLabel ?? normalizeTopicLabel(questionType) ?? fallbackTopic;
    return {
      topicLabel,
      subtopicLabel: lookedUp.subtopicLabel,
    };
  }

  return {
    topicLabel: normalizeTopicLabel(questionType) ?? fallbackTopic,
    subtopicLabel: null,
  };
}

export function getTrackTopicLabel(args: {
  track?: string | null;
  questionType?: string | null;
  subtopicId?: string | null;
  fallbackTopic?: string | null;
}): string | null {
  const track = String(args.track ?? '').trim().toLowerCase();
  if (track !== '11plus') {
    return normalizeTopicLabel(args.questionType) ?? normalizeTopicLabel(args.fallbackTopic);
  }

  const canonicalSubtopic = canonicalizeSubtopicId(args.subtopicId);
  if (canonicalSubtopic) {
    const [topicKeyRaw] = canonicalSubtopic.split('|');
    const topicKey = String(topicKeyRaw ?? '').trim().toLowerCase();
    const mapped = ELEVEN_PLUS_MODULE_LABEL_BY_TOPIC_KEY[topicKey];
    if (mapped) return mapped;
  }

  const rawQuestionType = String(args.questionType ?? '').trim();
  if (rawQuestionType) {
    const mapped = ELEVEN_PLUS_MODULE_LABEL_ALIASES[rawQuestionType.toLowerCase()];
    if (mapped) return mapped;
    return rawQuestionType;
  }

  return normalizeTopicLabel(args.fallbackTopic);
}
