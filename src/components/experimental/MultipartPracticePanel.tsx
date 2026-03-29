import { useMemo, useState } from 'react';
import { multipartQuestionsLocal, MultipartQuestionLocal, MultipartPartId } from '@/data/multipartQuestionsLocal';
import { Button } from '@/components/ui/button';
import MathText from '@/components/MathText';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'multipartExperimentalEnabled';

type PartState = {
  answer: string;
  submitted: boolean;
  isCorrect?: boolean;
};

function buildInitialState(question: MultipartQuestionLocal) {
  return question.parts.reduce<Record<MultipartPartId, PartState>>((acc, part) => {
    acc[part.partId] = { answer: '', submitted: false };
    return acc;
  }, {} as Record<MultipartPartId, PartState>);
}

function canAccessPart(partId: MultipartPartId, state: Record<MultipartPartId, PartState>) {
  if (partId === 'a') return true;
  if (partId === 'b') return state.a.submitted;
  if (partId === 'c') return state.a.submitted && state.b.submitted;
  return false;
}

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/−/g, '-');
}

function stripLeadingAssignment(value: string) {
  return value.replace(/^[a-z]=/i, '');
}

function extractSingleNumber(value: string) {
  const cleaned = value.replace(/,/g, '');
  const matches = cleaned.match(/-?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g);
  if (!matches || matches.length !== 1) return null;
  const token = matches[0];
  if (token.includes('/')) {
    const [rawNumerator, rawDenominator] = token.split('/');
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
    return numerator / denominator;
  }
  const parsed = Number(token);
  return Number.isFinite(parsed) ? parsed : null;
}

function areAnswersEquivalent(actual: string, expected: string) {
  if (!actual.trim()) return false;
  const normalizedActual = normalizeAnswer(actual);
  const normalizedExpected = normalizeAnswer(expected);
  if (normalizedActual === normalizedExpected) return true;

  const strippedActual = stripLeadingAssignment(normalizedActual);
  const strippedExpected = stripLeadingAssignment(normalizedExpected);
  if (strippedActual === strippedExpected) return true;

  const actualNumber = extractSingleNumber(strippedActual);
  const expectedNumber = extractSingleNumber(strippedExpected);
  if (actualNumber !== null && expectedNumber !== null) {
    return Math.abs(actualNumber - expectedNumber) < 1e-9;
  }

  return false;
}

const ALLOWED_EMAILS = new Set(['kputtab@gmail.com']);

type MultipartPracticePanelProps = {
  userEmail?: string | null;
};

export default function MultipartPracticePanel({ userEmail }: MultipartPracticePanelProps) {
  const normalizedEmail = userEmail?.trim().toLowerCase();
  const isAllowedUser = normalizedEmail ? ALLOWED_EMAILS.has(normalizedEmail) : false;
  const isEnabledByEnv = import.meta.env.VITE_MULTIPART_EXPERIMENTAL !== 'false';
  const [enabled, setEnabled] = useState(() => {
    if (!isAllowedUser || !isEnabledByEnv) return false;
    if (!isEnabledByEnv) return false;
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? stored === 'true' : true;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const question = useMemo(() => multipartQuestionsLocal[activeIndex] ?? multipartQuestionsLocal[0], [activeIndex]);
  const [partsState, setPartsState] = useState(() => buildInitialState(question));

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const handleReset = () => {
    setPartsState(buildInitialState(question));
  };

  const handleAnswerChange = (partId: MultipartPartId, value: string) => {
    setPartsState((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], answer: value },
    }));
  };

  const handleSubmit = (partId: MultipartPartId) => {
    const currentAnswer = partsState[partId]?.answer ?? '';
    const part = question.parts.find((p) => p.partId === partId);
    const expectedAnswer = part?.expectedAnswer ?? '';
    const isCorrect = areAnswersEquivalent(currentAnswer, expectedAnswer);
    setPartsState((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], submitted: true, isCorrect },
    }));
    console.log('[Multipart Experimental] Answer submitted', {
      questionId: question.id,
      partId,
      answer: currentAnswer,
      expectedAnswer,
      isCorrect,
    });
  };

  if (!isAllowedUser || !isEnabledByEnv) return null;

  return (
    <section className="mb-8 rounded-2xl border border-dashed border-purple-300 bg-purple-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-700">
            Experimental: Multi-part Questions (Testing)
          </h2>
          <p className="mt-1 text-sm text-purple-700/80">
            Experimental questions – not part of the main question bank.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-700">Enabled</span>
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'h-6 w-11 rounded-full border transition-colors',
              enabled ? 'bg-purple-600 border-purple-600' : 'bg-white border-purple-300'
            )}
            aria-pressed={enabled}
          >
            <span
              className={cn(
                'block h-5 w-5 translate-x-0 rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {!enabled ? (
        <div className="mt-4 rounded-xl border border-purple-200 bg-white p-4 text-sm text-purple-700">
          Experimental questions are currently disabled.
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-purple-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-purple-600">Question</p>
              <p className="text-base font-semibold text-slate-900">
                {question.tier} Tier – Multi-part
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset Question
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = (activeIndex + 1) % multipartQuestionsLocal.length;
                  setActiveIndex(next);
                  setPartsState(buildInitialState(multipartQuestionsLocal[next]));
                }}
              >
                Next Experimental
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {question.parts.map((part) => {
              const state = partsState[part.partId];
              const unlocked = canAccessPart(part.partId, partsState);
              return (
                <div
                  key={part.partId}
                  className={cn(
                    'rounded-xl border p-4',
                    unlocked ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-purple-600">Part {part.partId}</p>
                    {state?.submitted && (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          state.isCorrect ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {state.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-900 whitespace-pre-line">
                    <MathText text={part.prompt} />
                  </div>
                  {part.partId !== 'a' && partsState.a.submitted && (
                    <p className="mt-2 text-xs text-slate-500">
                      Your answer to part (a): <MathText text={partsState.a.answer || ' - '} />
                    </p>
                  )}
                  {part.partId === 'c' && partsState.b.submitted && (
                    <p className="mt-2 text-xs text-slate-500">
                      Your answer to part (b): <MathText text={partsState.b.answer || ' - '} />
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={state?.answer ?? ''}
                      onChange={(e) => handleAnswerChange(part.partId, e.target.value)}
                      disabled={!unlocked || state?.submitted}
                      placeholder="Type your answer"
                      className="h-10 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(part.partId)}
                      disabled={!unlocked || state?.submitted || !state?.answer?.trim()}
                    >
                      Submit part {part.partId}
                    </Button>
                  </div>
                  {state?.submitted && (
                    <div
                      className={cn(
                        'mt-3 rounded-lg border p-3 text-xs',
                        state.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
                          : 'border-rose-200 bg-rose-50/70 text-rose-700'
                      )}
                    >
                      <p className="font-medium">
                        {state.isCorrect ? 'Correct answer.' : 'Not quite.'}
                      </p>
                      <p className="mt-1">Your answer: {state.answer || ' - '}</p>
                      <p>Correct answer: {part.expectedAnswer}</p>
                      <div className="mt-2">
                        <p className="font-medium">Explanation</p>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          {part.solution.map((step, index) => (
                            <li key={`${part.partId}-step-${index}`}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
