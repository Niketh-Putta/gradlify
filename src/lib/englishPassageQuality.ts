/**
 * Guards for 11+ English practice bank quality.
 * Keeps Train Weakness / english-demo from serving broken SPaG/comprehension rows.
 */

export type EnglishPassageOption = {
  id?: string;
  text?: string;
  correct?: boolean;
};

export type EnglishPassageQuestion = {
  id?: string;
  text?: string;
  evidenceLine?: string;
  options?: EnglishPassageOption[];
};

export type EnglishPassageBlock = {
  id?: string;
  text?: string;
};

export type EnglishPassageRow = {
  id?: string;
  title?: string;
  sectionId?: string;
  subtopic?: string;
  passageBlocks?: EnglishPassageBlock[];
  questions?: EnglishPassageQuestion[];
};

export type EnglishPassageIssue = {
  code: string;
  message: string;
};

const POS_WORDS = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'determiner',
  'article',
]);

function normalizeId(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

/** True when this row is SPaG (spelling / punctuation / grammar). */
export function isSpagRow(row: Pick<EnglishPassageRow, 'sectionId' | 'subtopic'>): boolean {
  const id = normalizeId(row.sectionId);
  const sub = normalizeId(row.subtopic);
  return Boolean(id.match(/spag|spell|punct|gramm/) || sub.match(/spell|punct|gramm/));
}

/**
 * True when question stems depend on reading a real passage (not standalone SPaG lines).
 */
export function questionsNeedRealPassage(row: EnglishPassageRow): boolean {
  const questions = Array.isArray(row.questions) ? row.questions : [];
  return questions.some((q) =>
    /\b(paragraph|passage|as (it is )?used in|in the (first|second|third|final|last) paragraph|based on (the |paragraph)|in context)\b/i.test(
      String(q?.text ?? ''),
    ),
  );
}

/** Normalize cloze markers so blanks are visible and consistent in the left pane. */
export function normalizeClozeBlankText(text: string): string {
  return String(text ?? '')
    .replace(/\[\s*Blank\s*(\d+)\s*\]/gi, '[$1]')
    .replace(/\[\s*(\d+)\s*\]/g, '[$1]')
    .replace(/\(\s*Blank\s*(\d+)\s*\)/gi, '[$1]')
    .replace(/_{3,}/g, '[ ]');
}

/**
 * Detect stems that ask for a passage word while options are only parts of speech
 * (or the reverse) — common LLM bank corruption that looks "disgusting" in Train Weakness.
 */
export function hasStemOptionMismatch(question: EnglishPassageQuestion): boolean {
  const stem = String(question?.text ?? '').toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  if (!stem || options.length < 2) return false;

  const optionTexts = options.map((o) => String(o?.text ?? '').trim()).filter(Boolean);
  if (optionTexts.length < 2) return false;

  const firstTokens = optionTexts.map((t) => t.toLowerCase().split(/\s+/)[0] ?? '');
  const allPos =
    firstTokens.length >= 3 &&
    firstTokens.every((t) => POS_WORDS.has(t.replace(/[^a-z]/g, '')));

  const asksForWord =
    /\b(which word|what word|find the word|misspelled word|incorrectly|from the (first |second |third )?paragraph)\b/i.test(
      stem,
    ) && !/\b(part of speech|word class|type of word|is an? (noun|verb|adjective|adverb))\b/i.test(stem);

  if (asksForWord && allPos) return true;

  const asksPosOnly =
    /\b(part of speech|word class|what type of word)\b/i.test(stem) &&
    !/\bwhich (of these )?words?\b/i.test(stem);
  const lookLikePassageWords =
    !allPos &&
    optionTexts.every((t) => t.split(/\s+/).length <= 2 && t.length <= 18) &&
    optionTexts.some((t) => /[a-z]{4,}/i.test(t) && !POS_WORDS.has(t.toLowerCase()));

  if (asksPosOnly && lookLikePassageWords) return true;

  return false;
}

/**
 * Validate a single english_passages-shaped row.
 * Returns issues (empty = ok). Used by verify script + runtime filtering.
 */
export function validateEnglishPassageRow(row: EnglishPassageRow): EnglishPassageIssue[] {
  const issues: EnglishPassageIssue[] = [];
  const id = row.id || row.title || 'unknown';
  const blocks = Array.isArray(row.passageBlocks) ? row.passageBlocks : [];
  const questions = Array.isArray(row.questions) ? row.questions : [];

  if (blocks.length === 0) {
    issues.push({ code: 'empty_blocks', message: `${id}: no passageBlocks` });
    if (questionsNeedRealPassage(row) && !isSpagRow(row)) {
      issues.push({
        code: 'contextual_without_passage',
        message: `${id}: questions reference a paragraph/passage but passageBlocks are empty`,
      });
    }
  } else {
    const emptyBlock = blocks.find((b) => !String(b?.text ?? '').trim());
    if (emptyBlock) {
      issues.push({ code: 'blank_block', message: `${id}: blank passage block (${emptyBlock.id || '?'})` });
    }
  }

  if (questions.length === 0) {
    issues.push({ code: 'empty_questions', message: `${id}: no questions` });
    return issues;
  }

  const blockText = blocks.map((b) => String(b?.text ?? '')).join('\n');
  const hasClozeMarker = /\[\s*\d+\s*\]|\[\s*Blank\s*\d+\s*\]|_{3,}/i.test(blockText);
  const asksCloze = questions.some((q) =>
    /\b(blank\s*\d*|fills?\s*(blank|\[)|correct spelling to (fill|complete))\b/i.test(
      String(q?.text ?? ''),
    ),
  );
  if (asksCloze && blocks.length > 0 && !hasClozeMarker) {
    issues.push({
      code: 'missing_cloze_markers',
      message: `${id}: questions reference blanks but passage has no [n] markers`,
    });
  }

  const blockIds = new Set(blocks.map((b) => String(b?.id ?? '').trim()).filter(Boolean));
  const spag = isSpagRow(row);

  questions.forEach((q, idx) => {
    const qLabel = `${id} q${idx + 1}`;
    const stem = String(q?.text ?? '').trim();
    if (!stem) {
      issues.push({ code: 'blank_stem', message: `${qLabel}: blank stem` });
    }

    const options = Array.isArray(q?.options) ? q.options : [];
    if (options.length < 2) {
      issues.push({ code: 'few_options', message: `${qLabel}: fewer than 2 options` });
    }

    const correctCount = options.filter((o) => o?.correct === true).length;
    if (correctCount !== 1) {
      issues.push({
        code: 'correct_count',
        message: `${qLabel}: expected exactly 1 correct option, got ${correctCount}`,
      });
    }

    const blankOpt = options.find((o) => !String(o?.text ?? '').trim());
    if (blankOpt) {
      issues.push({ code: 'blank_option', message: `${qLabel}: blank option text` });
    }

    if (hasStemOptionMismatch(q)) {
      issues.push({
        code: 'stem_option_mismatch',
        message: `${qLabel}: stem and options do not ask the same thing`,
      });
    }

    const evidence = String(q?.evidenceLine ?? '').trim();
    if (evidence && blockIds.size > 0) {
      const evidenceKey = evidence.toLowerCase();
      const isGlobal =
        evidenceKey === 'global' ||
        evidenceKey === 'overall' ||
        evidenceKey.includes('passage') ||
        evidenceKey.includes('text') ||
        evidenceKey.includes('entire');
      if (!isGlobal && !blockIds.has(evidence) && !spag) {
        issues.push({
          code: 'evidence_mismatch',
          message: `${qLabel}: evidenceLine "${evidence}" not in passageBlocks`,
        });
      }
    }
  });

  return issues;
}

/**
 * If a row has questions but empty/blank passage blocks, build readable source
 * lines from question stems so the left pane is never blank.
 * Never invent a fake passage for contextual vocab/comprehension stems.
 */
export function ensurePassageBlocks(
  row: EnglishPassageRow,
): EnglishPassageBlock[] {
  const blocks = (Array.isArray(row.passageBlocks) ? row.passageBlocks : [])
    .map((b, i) => ({
      id: String(b?.id ?? `p${i + 1}`),
      text: normalizeClozeBlankText(String(b?.text ?? '').trim()),
    }))
    .filter((b) => b.text.length > 0);

  if (blocks.length > 0) return blocks;

  // Contextual / comprehension stems without a real passage must not fake one from stems.
  if (questionsNeedRealPassage(row) && !isSpagRow(row)) {
    return [];
  }

  const questions = Array.isArray(row.questions) ? row.questions : [];
  return questions.slice(0, 10).map((q, i) => ({
    id: `q-${i + 1}`,
    text: `${i + 1}. ${String(q?.text ?? 'Question').trim()}`,
  }));
}

/** Practice instruction copy by focus (not the comprehension-only line). */
export function practiceInstructionsForFocus(
  focus: 'comprehension' | 'spag' | 'vocab',
  sectionDesc?: string,
): string {
  const desc = String(sectionDesc ?? '').trim();
  if (desc) return desc;
  if (focus === 'spag') {
    return 'Read each line carefully. Choose the correct option, or mark N if there is no mistake.';
  }
  if (focus === 'vocab') {
    return 'Choose the best word or synonym for each question.';
  }
  return 'Answer the questions based on the source text.';
}

/** Prefer classic slash-line SPaG drills over long prose when picking practice rows. */
export function spagDrillQualityScore(row: EnglishPassageRow): number {
  const blocks = Array.isArray(row.passageBlocks) ? row.passageBlocks : [];
  const text = blocks.map((b) => String(b?.text ?? '')).join('\n');
  let score = 0;
  if (/\s\/\s/.test(text)) score += 3; // classic error-hunt lines
  if (/\[\s*\d+\s*\]|\[\s*Blank\s*\d+\s*\]/i.test(text)) score += 2;
  if (text.length > 0 && text.length < 900) score += 1;
  if (text.length > 1600) score -= 2;
  const fatal = validateEnglishPassageRow(row).some((i) =>
    ['empty_questions', 'correct_count', 'few_options', 'blank_stem', 'stem_option_mismatch', 'missing_cloze_markers'].includes(
      i.code,
    ),
  );
  if (fatal) score -= 10;
  return score;
}
