/** Shared guards so live mock submit always writes scorable answer rows. */

export type ScorableOption = { id: string; text: string; correct: boolean };

export function normalizeLiveMockOptions(
  rawOptions: unknown,
  correctAnswerLetter?: string | null,
): ScorableOption[] {
  const options: ScorableOption[] = (Array.isArray(rawOptions) ? rawOptions : []).map((o) => {
    const r = o as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      text: String(r.text ?? ""),
      correct: Boolean(r.correct),
    };
  });

  const correctCount = options.filter((o) => o.correct).length;
  if (correctCount === 1) return options;

  const letter = correctAnswerLetter != null ? String(correctAnswerLetter).trim() : "";
  if (letter) {
    return options.map((o) => ({ ...o, correct: o.id === letter }));
  }

  return options;
}

export type ScorableQuestion = {
  questionNumber: number;
  dbQuestionId: string;
  options: ScorableOption[];
};

export function assertLiveMockPaperScorable(
  questions: ScorableQuestion[],
): { ok: true } | { ok: false; reason: string } {
  if (questions.length === 0) {
    return { ok: false, reason: "No questions loaded." };
  }

  for (const q of questions) {
    if (!q.dbQuestionId?.trim()) {
      return { ok: false, reason: `Question ${q.questionNumber} is missing a database id.` };
    }
    const correctCount = q.options.filter((o) => o.correct).length;
    if (correctCount !== 1) {
      return {
        ok: false,
        reason: `Question ${q.questionNumber} does not have exactly one correct answer (${correctCount}).`,
      };
    }
  }

  return { ok: true };
}
