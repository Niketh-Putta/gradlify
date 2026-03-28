import { areMathEquivalent, uniqueMathAnswers } from '@/lib/areMathEquivalent';

type AnswerSanitizeInput = {
  options: string[];
  correct: string;
  questionType?: string | null;
  subtopic?: string | null;
};

const PLACEHOLDER_RE = /^different answer 1$/i;
const NOT_PREFIX_RE = /^not\s+/i;

const isRatioContext = (questionType?: string | null, subtopic?: string | null, options?: string[], correct?: string) => {
  const haystack = `${questionType ?? ''} ${subtopic ?? ''}`.toLowerCase();
  if (haystack.includes('ratio') || haystack.includes('proportion')) return true;
  if (typeof correct === 'string' && correct.includes(':')) return true;
  if (Array.isArray(options) && options.some((opt) => typeof opt === 'string' && opt.includes(':'))) return true;
  if (typeof correct === 'string' && /pack\s+[ab]/i.test(correct)) return true;
  if (Array.isArray(options) && options.some((opt) => /pack\s+[ab]/i.test(opt))) return true;
  return false;
};

const trimFixed = (value: number) => {
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, '');
};

// Preserve authored numeric precision. Rounding here can silently corrupt
// decimal/place-value answers (for example questions expecting 3 d.p. answers).
const formatNumericText = (text: string) => String(text ?? '').trim();

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const isOptionTaken = (candidate: string, existing: string[], correct: string) => {
  if (areMathEquivalent(candidate, correct)) return true;
  return existing.some((opt) => sameText(opt, candidate) || areMathEquivalent(opt, candidate));
};

const buildRatioWrongOption = (correct: string, existing: string[]): string | null => {
  const lower = correct.toLowerCase();
  if (lower.includes('pack a') || lower.includes('pack b') || lower.includes('both are the same')) {
    const candidates = ['Neither is better', 'Cannot tell'];
    const pick = candidates.find((opt) => !isOptionTaken(opt, existing, correct));
    return pick ?? null;
  }

  const ratioMatch = correct.match(/^([0-9]+(?:\.[0-9]+)?)\s*:\s*([0-9]+(?:\.[0-9]+)?)$/);
  if (ratioMatch) {
    const a = Number(ratioMatch[1]);
    const b = Number(ratioMatch[2]);
    const candidates = [
      [a + 1, b],
      [a, b + 1],
      [b, a],
      [Math.max(1, a - 1), b],
      [a, Math.max(1, b - 1)],
    ]
      .map(([x, y]) => `${trimFixed(x)}:${trimFixed(y)}`)
      .map(formatNumericText);
    const pick = candidates.find((opt) => !isOptionTaken(opt, existing, correct));
    return pick ?? null;
  }

  if (correct.includes('£')) {
    const numeric = Number(correct.replace(/[£,\s]/g, ''));
    if (Number.isFinite(numeric)) {
      const candidates = [
        numeric * 1.1,
        numeric * 0.9,
        numeric + 5,
        Math.max(0, numeric - 5),
      ]
        .map((value) => `£${value.toFixed(2)}`);
      const pick = candidates.find((opt) => !isOptionTaken(opt, existing, correct));
      return pick ?? null;
    }
  }

  const numeric = Number(correct);
  if (Number.isFinite(numeric)) {
    const candidates = [numeric + 1, numeric - 1, numeric * 2, numeric / 2]
      .filter((value) => Number.isFinite(value))
      .map((value) => trimFixed(value));
    const pick = candidates.find((opt) => !isOptionTaken(opt, existing, correct));
    return pick ?? null;
  }

  return null;
};

export const sanitizeAnswerSet = ({
  options,
  correct,
  questionType,
  subtopic,
}: AnswerSanitizeInput) => {
  const ratioContext = isRatioContext(questionType, subtopic, options, correct);

  const formattedCorrect = formatNumericText(correct);
  const cleaned = options.map((option) => {
    const formatted = formatNumericText(option);
    if (PLACEHOLDER_RE.test(formatted) || NOT_PREFIX_RE.test(formatted)) {
      const fallback = ratioContext
        ? buildRatioWrongOption(formattedCorrect, options)
        : 'None of the above';
      return fallback ?? (ratioContext ? 'Cannot tell' : 'None of the above');
    }
    return formatted;
  });

  const merged = uniqueMathAnswers([formattedCorrect, ...cleaned]);
  return { correct: formattedCorrect, options: merged };
};
