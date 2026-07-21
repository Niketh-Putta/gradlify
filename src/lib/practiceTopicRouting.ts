/**
 * Maps Target Focus / readiness topics → practice session query params.
 * Readiness uses canonical labels (Probability, Grammar); the bank uses
 * 11+ section labels (Statistics & Data, SPaG).
 */

export type PracticeSubject = 'maths' | 'english';

export type PracticeRouteParams = {
  topics: string;
  subtopic?: string;
};

/** Normalize a readiness/Target Focus topic into bank fetch params. */
export function routePracticeTopic(
  rawTopic: string,
  subject: PracticeSubject,
): PracticeRouteParams {
  const topic = String(rawTopic ?? '').trim();
  const lower = topic.toLowerCase();

  if (subject === 'english') {
    if (lower === 'grammar') {
      return { topics: 'SPaG', subtopic: 'grammar' };
    }
    if (lower === 'spelling') {
      return { topics: 'SPaG', subtopic: 'spelling' };
    }
    if (lower === 'punctuation') {
      return { topics: 'SPaG', subtopic: 'punctuation' };
    }
    if (lower === 'spag') {
      return { topics: 'SPaG' };
    }
    if (lower === 'vocabulary' || lower.includes('vocab')) {
      return { topics: 'Vocabulary' };
    }
    if (lower === 'comprehension' || lower.includes('comprehension')) {
      return { topics: 'Comprehension' };
    }
    // Default English weakness → comprehension
    return { topics: topic || 'Comprehension' };
  }

  // Maths
  if (lower === 'probability') {
    return { topics: 'Statistics & Data', subtopic: 'stats|probability' };
  }
  if (lower === 'statistics' || lower === 'statistics & data' || lower === 'data') {
    return { topics: 'Statistics & Data' };
  }
  if (lower === 'algebra' || lower === 'algebra & ratio') {
    return { topics: 'Algebra & Ratio' };
  }
  if (lower === 'ratio' || lower === 'ratio & proportion') {
    return { topics: 'Algebra & Ratio' };
  }
  if (lower === 'number' || lower === 'number & arithmetic') {
    return { topics: 'Number & Arithmetic' };
  }
  if (lower === 'geometry' || lower === 'geometry & measures') {
    return { topics: 'Geometry & Measures' };
  }

  return { topics: topic || 'Number & Arithmetic' };
}

/** Map English readiness labels to english_passages.sectionId values. */
export function mapEnglishSectionIds(topicParams: string[]): string[] {
  const ids = new Set<string>();
  for (const raw of topicParams) {
    const t = String(raw ?? '').trim().toLowerCase();
    if (!t || t === 'all') {
      ids.add('comprehension');
      ids.add('spag');
      ids.add('vocabulary');
      continue;
    }
    if (t === 'grammar' || t === 'spelling' || t === 'spag') ids.add('spag');
    else if (t.includes('vocab')) ids.add('vocabulary');
    else if (t.includes('comprehension')) ids.add('comprehension');
    else ids.add(t);
  }
  return Array.from(ids);
}
