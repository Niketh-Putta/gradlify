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
        // Comprehension should point at a real block; SPaG often uses p1 for cloze.
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
 */
export function ensurePassageBlocks(
  row: EnglishPassageRow,
): EnglishPassageBlock[] {
  const blocks = (Array.isArray(row.passageBlocks) ? row.passageBlocks : [])
    .map((b, i) => ({
      id: String(b?.id ?? `p${i + 1}`),
      text: String(b?.text ?? '').trim(),
    }))
    .filter((b) => b.text.length > 0);

  if (blocks.length > 0) return blocks;

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
