import { uniqueMathAnswers } from '@/lib/areMathEquivalent';

export const MULTIPART_PREFIX = "MULTIPART::";

export type MultipartPart = {
  label?: string;
  prompt: string;
  correct_answer: string;
  wrong_answers: string[];
  all_answers?: string[];
};

export type MultipartQuestion = {
  stem?: string;
  parts: MultipartPart[];
};

type MultipartPartInput = {
  label?: unknown;
  prompt?: unknown;
  correct_answer?: unknown;
  wrong_answers?: unknown;
  all_answers?: unknown;
};

type MultipartQuestionInput = {
  stem?: unknown;
  parts?: MultipartPartInput[];
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const partLabel = (index: number): string => {
  const letter = String.fromCharCode(65 + index);
  return `Part ${letter}`;
};

export const parseMultipartQuestion = (questionText?: string | null): MultipartQuestion | null => {
  if (!questionText) return null;
  if (!questionText.startsWith(MULTIPART_PREFIX)) return null;

  const raw = questionText.slice(MULTIPART_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(raw) as MultipartQuestionInput;
    const partsRaw = Array.isArray(parsed.parts) ? parsed.parts : [];
    const parts = partsRaw
      .map((part: MultipartPartInput, idx: number) => {
        const prompt = String(part?.prompt || "").trim();
        const correct = String(part?.correct_answer || "").trim();
        const wrong = toStringArray(part?.wrong_answers);
        const allAnswers = toStringArray(part?.all_answers);
        const safeAll = allAnswers.length >= 4 ? uniqueMathAnswers([correct, ...allAnswers]) : [];
        const combined = uniqueMathAnswers([correct, ...wrong, ...(safeAll.length >= 4 ? safeAll : [])]);
        if (!prompt || !correct || combined.length < 4) return null;
        const label = String(part?.label || partLabel(idx));
        return {
          label,
          prompt,
          correct_answer: correct,
          wrong_answers: wrong,
          all_answers: safeAll.length >= 4 ? safeAll : undefined,
        } satisfies MultipartPart;
      })
      .filter(Boolean) as MultipartPart[];

    if (parts.length === 0) return null;
    return {
      stem: parsed.stem ? String(parsed.stem) : undefined,
      parts,
    };
  } catch {
    return null;
  }
};
