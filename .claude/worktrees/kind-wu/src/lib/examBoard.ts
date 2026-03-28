export type ExamBoard = 'Edexcel' | 'AQA' | 'OCR' | 'IGCSE' | 'Unsure';

const BOARD_NAMES: ExamBoard[] = ['Edexcel', 'AQA', 'OCR', 'IGCSE', 'Unsure'];
const BOARD_PATTERN = /(Edexcel|AQA|OCR|IGCSE)/g;
const GCSE_BOARD_PATTERN = /GCSE\s+(Edexcel|AQA|OCR|IGCSE)/g;
const BOARD_GCSE_PATTERN = /(Edexcel|AQA|OCR|IGCSE)\s+GCSE/g;

export function normalizeExamBoard(value: unknown): ExamBoard | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (BOARD_NAMES.includes(trimmed as ExamBoard)) return trimmed as ExamBoard;
  return undefined;
}

export function getExamBoardShort(value: unknown): string {
  return normalizeExamBoard(value) ?? 'Unsure';
}

export function getExamBoardBadge(value: unknown): string {
  const board = normalizeExamBoard(value);
  if (!board || board === 'Unsure') return 'GCSE 9-1';
  return `${board} GCSE 9-1`;
}

export function getExamBoardSubtitle(value: unknown): string {
  const board = normalizeExamBoard(value);
  if (!board || board === 'Unsure') return 'GCSE Mathematics';
  return `GCSE Mathematics · ${board}`;
}

export function getExamBoardSpecSubtitle(value: unknown): string {
  const board = normalizeExamBoard(value);
  if (!board || board === 'Unsure') return 'GCSE Mathematics · Specification';
  return `GCSE Mathematics · ${board} Specification`;
}

export function replaceExamBoardReferences(text: string, value: unknown, fallback = 'GCSE'): string {
  const board = normalizeExamBoard(value);
  const replacement = board && board !== 'Unsure' ? board : fallback;
  const gcsePrefixReplacement = board && board !== 'Unsure' ? `GCSE ${replacement}` : fallback;
  const gcseSuffixReplacement = board && board !== 'Unsure' ? `${replacement} GCSE` : fallback;

  return text
    .replace(GCSE_BOARD_PATTERN, gcsePrefixReplacement)
    .replace(BOARD_GCSE_PATTERN, gcseSuffixReplacement)
    .replace(BOARD_PATTERN, replacement);
}
