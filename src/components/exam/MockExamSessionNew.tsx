import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Flag, ChevronLeft, ChevronRight, Check, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppContext } from "@/hooks/useAppContext";
import { usePremium } from "@/hooks/usePremium";
import MathText from "@/components/MathText";
import RichQuestionContent, { normalizeNewlines } from "@/components/RichQuestionContent";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatExplanation } from "@/lib/formatExplanation";
import { cn } from "@/lib/utils";
import { getTopicAndSubtopicLabels, getTrackTopicLabel } from "@/lib/subtopicDisplay";
import { parseMultipartQuestion, MultipartQuestion } from "@/lib/multipart";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { parseDbArray } from "@/lib/parseDbArray";
import { resolveUserTrack } from "@/lib/track";

interface MockQuestion {
  id: string;
  idx: number;
  topic: string;
  subtopic?: string | null;
  difficulty?: number | null;
  tier?: string | null;
  calculator?: string | null;
  prompt: string;
  marks: number;
  correct_answer: string | Record<string, unknown>;
  all_answers: string[];
  user_answer?: string;
  image_url?: string;
  image_alt?: string;
  explanation?: string;
  awarded_marks?: number;
  multipart?: MultipartQuestion | null;
}

interface MockAttempt {
  id: string;
  title: string;
  total_marks: number;
  score: number;
  status: string;
}

type MockStartQuestionRow = Omit<MockQuestion, 'idx' | 'all_answers' | 'user_answer' | 'awarded_marks'> & {
  wrong_answers?: unknown;
};

type AnswerValue = string | string[];

type MockStartResponse = {
  attempt: MockAttempt;
  questions: MockStartQuestionRow[];
};

const parseStringArray = (value: unknown): string[] => {
  return parseDbArray(value).map(String);
};

const parseUserAnswerValue = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      if (value.trim()) return [value];
    }
  }
  return [];
};

const getDisplayDifficultyLevel = (difficulty?: number | null): 1 | 2 | 3 | null => {
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) return null;
  return Math.max(1, Math.min(3, Math.round(difficulty))) as 1 | 2 | 3;
};

const getDifficultyTagClass = (level: 1 | 2 | 3): string => {
  if (level === 1) return 'border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (level === 2) return 'border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-rose-300/40 bg-rose-500/10 text-rose-700 dark:text-rose-300';
};

const getQuestionDifficultyWeight = (difficulty?: number | null): number => {
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) return 2;
  return Math.max(1, Math.min(4, Math.round(difficulty)));
};

const shuffleArray = (array: string[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const extractMultipartFromCorrectAnswer = (value: unknown): MultipartQuestion | null => {
  if (!value || typeof value !== 'object') return null;
  const payload = value as { stem?: unknown; parts?: unknown };
  if (!Array.isArray(payload.parts)) return null;
  const parts = payload.parts
    .map((part: any, idx: number) => {
      const prompt = String(part?.prompt || '').trim();
      const correct = String(part?.correct_answer || '').trim();
      const wrong = Array.isArray(part?.wrong_answers) ? part.wrong_answers.map(String) : [];
      if (!prompt || !correct) return null;
      return {
        label: part?.label ? String(part.label) : `Part ${String.fromCharCode(65 + idx)}`,
        prompt,
        correct_answer: correct,
        wrong_answers: wrong,
        all_answers: Array.isArray(part?.all_answers) ? part.all_answers.map(String) : [],
      };
    })
    .filter(Boolean) as MultipartQuestion['parts'];

  if (parts.length === 0) return null;
  return {
    stem: payload.stem ? String(payload.stem) : undefined,
    parts,
  };
};

interface TopicBreakdown {
  [topic: string]: { earned: number; total: number };
}

interface MockExamSessionProps {
  onBack: () => void;
  settings: {
    tiers: string[];
    calculators: string[];
    length: number;
    mode: 'practice' | 'exam';
    topic?: string;
  };
}

export default function MockExamSessionNew({ onBack, settings }: MockExamSessionProps) {
  const navigate = useNavigate();
  const { user, profile } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === '11plus';
  const examBoard = (profile?.onboarding as any)?.examBoard;
  const { canStartMockExam, refreshUsage } = usePremium();

  // State
  const [view, setView] = useState<'exam' | 'results'>('exam');
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [partIndices, setPartIndices] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(settings.length * 90);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<MockAttempt | null>(null);
  const [results, setResults] = useState<{
    score: number;
    total: number;
    percentage: number;
    grade: string;
    topicBreakdown: TopicBreakdown;
    showGrade: boolean;
    avgLevel: number;
  } | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const getQuestionPartIndex = (questionId: string, partsLength: number): number => {
    const raw = partIndices[questionId] ?? 0;
    return Math.max(0, Math.min(partsLength - 1, raw));
  };

  const setQuestionPartIndex = (questionId: string, index: number) => {
    setPartIndices(prev => ({ ...prev, [questionId]: index }));
  };

  const getQuestionAnswerState = (question: MockQuestion) => {
    const raw = answers[question.id];
    const userAnswers = parseUserAnswerValue(raw);
    const parts = question.multipart?.parts ?? [];
    const hasAny = userAnswers.length > 0 && userAnswers.some(Boolean);
    const isComplete = question.multipart
      ? parts.every((_, idx) => Boolean(userAnswers[idx]))
      : typeof raw === 'string' && raw.trim() !== '';
    return { hasAny, isComplete, userAnswers };
  };

  const startExam = useCallback(async () => {
    try {
      if (!canStartMockExam) {
        toast.error("Daily mock exam limit reached.");
        onBack();
        return;
      }
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      let session = sessionData.session;
      if (!session) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        session = refreshData.session;
      }
      if (!session) {
        setLoading(false);
        toast.error("Please sign in to start a mock exam.");
        onBack();
        return;
      }

      const { data, error } = await supabase.functions.invoke('mock-start', {
        body: {
          mode: settings.topic ? 'topic' : 'mini',
          topics: settings.topic ? [settings.topic] : undefined,
          count: settings.length,
          tiers: settings.tiers,
          calculators: settings.calculators,
          examMode: settings.mode === 'exam'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        const contextBody = (error as any)?.context?.body;
        let message = (error as any)?.message ?? 'Failed to start mock exam';
        if (contextBody) {
          try {
            const parsed = typeof contextBody === 'string' ? JSON.parse(contextBody) : contextBody;
            if (parsed?.error) message = parsed.error;
          } catch {
            // ignore parse failures
          }
        }
        throw new Error(message);
      }

      const payload = data as unknown as MockStartResponse;
      setAttempt(payload.attempt);
      setQuestions(payload.questions.map((q, idx) => {
        const providedOptions = Array.isArray((q as any).options) ? (q as any).options : [];
        const rawMultipart =
          (q as any).multipart ||
          extractMultipartFromCorrectAnswer(q.correct_answer) ||
          parseMultipartQuestion(q.prompt);
        const multipart = rawMultipart
          ? {
              stem: rawMultipart.stem ?? q.prompt,
              parts: rawMultipart.parts.map((part, partIndex) => {
                const options = part.all_answers && part.all_answers.length > 0
                  ? part.all_answers
                  : shuffleArray([part.correct_answer, ...part.wrong_answers]);
                return {
                  ...part,
                  label: part.label ?? `Part ${String.fromCharCode(65 + partIndex)}`,
                  all_answers: options,
                };
              }),
            }
          : null;

        const wrong = parseStringArray(q.wrong_answers);
        const baseAnswers = providedOptions.length > 0
          ? providedOptions
          : [String(q.correct_answer || ''), ...wrong].filter(Boolean);

        const baseMarks = typeof q.marks === 'number' && Number.isFinite(q.marks) ? q.marks : 1;
        const computedMarks = multipart ? Math.max(baseMarks, multipart.parts.length) : baseMarks;

        return {
          ...q,
          prompt: multipart ? (multipart.stem ?? "") : q.prompt,
          idx,
          marks: computedMarks,
          all_answers: multipart ? [] : shuffleArray(baseAnswers),
          multipart,
        };
      }));
      setPartIndices({});
      setAnswers({});
      setLoading(false);
      void refreshUsage();
    } catch (error) {
      console.error("Error starting mock:", error);
      const message = error instanceof Error ? error.message : "Failed to start mock exam";
      toast.error(message);
      onBack();
    }
  }, [canStartMockExam, onBack, refreshUsage, settings]);

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeLeft <= 60) return "timer-critical";
    if (timeLeft <= 300) return "timer-warning";
    return "timer-normal";
  };

  const handleSelectAnswer = (question: MockQuestion, answer: string) => {
    let nextValue: AnswerValue = answer;
    if (question.multipart) {
      const partIndex = getQuestionPartIndex(question.id, question.multipart.parts.length);
      const existing = answers[question.id];
      const next = Array.isArray(existing) ? [...existing] : [];
      next[partIndex] = answer;
      nextValue = next;
    }

    setAnswers(prev => ({ ...prev, [question.id]: nextValue }));

    const persistedAnswer = Array.isArray(nextValue) ? JSON.stringify(nextValue) : nextValue;
    supabase
      .from('mock_questions')
      .update({ user_answer: persistedAnswer })
      .eq('id', question.id)
      .then(({ error }) => {
        if (error) console.error("Error saving answer:", error);
      });
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const goToQuestion = (idx: number) => {
    setCurrentIndex(idx);
  };

  const handleSubmitExam = useCallback(async () => {
    try {
      if (!AI_FEATURE_ENABLED) {
        toast.message("This feature is currently unavailable while we focus on core practice and competition.");
        navigate("/mocks");
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('mock-submit', {
        body: { attemptId: attempt?.id, examBoard }
      });

      if (error) throw error;

      const totalScore = data.questions.reduce((sum: number, q: MockQuestion) => sum + (q.awarded_marks || 0), 0);
      const totalMarks = data.questions.reduce((sum: number, q: MockQuestion) => sum + q.marks, 0);
      const weightedEarned = data.questions.reduce(
        (sum, q) => sum + ((q.awarded_marks || 0) * getQuestionDifficultyWeight(q.difficulty)),
        0
      );
      const weightedTotal = data.questions.reduce(
        (sum, q) => sum + (q.marks * getQuestionDifficultyWeight(q.difficulty)),
        0
      );
      // Display score percentage from awarded marks, not weighted difficulty.
      const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

      let grade = "1";
      if (percentage >= 90) grade = "9";
      else if (percentage >= 80) grade = "8";
      else if (percentage >= 70) grade = "7";
      else if (percentage >= 60) grade = "6";
      else if (percentage >= 50) grade = "5";
      else if (percentage >= 40) grade = "4";
      else if (percentage >= 30) grade = "3";
      else if (percentage >= 20) grade = "2";

      const topicBreakdown: TopicBreakdown = {};
      data.questions.forEach((q: MockQuestion) => {
        const displayTopic = getTrackTopicLabel({
          track: userTrack,
          questionType: q.topic,
          subtopicId: q.subtopic ?? null,
          fallbackTopic: settings.topic ?? null,
        }) ?? q.topic;
        if (!topicBreakdown[displayTopic]) {
          topicBreakdown[displayTopic] = { earned: 0, total: 0 };
        }
        topicBreakdown[displayTopic].earned += q.awarded_marks || 0;
        topicBreakdown[displayTopic].total += q.marks;
      });

      const mergedQuestions = data.questions.map((serverQuestion: MockQuestion) => {
        const local = questions.find((q) => q.id === serverQuestion.id) || questions[serverQuestion.idx - 1];
        const mergedMultipart =
          local?.multipart ||
          serverQuestion.multipart ||
          extractMultipartFromCorrectAnswer(serverQuestion.correct_answer) ||
          parseMultipartQuestion(serverQuestion.prompt);
        return {
          ...local,
          ...serverQuestion,
          all_answers: local?.all_answers ?? serverQuestion.all_answers ?? [],
          multipart: mergedMultipart,
        };
      });

      setQuestions(mergedQuestions);
      const showGrade = !isElevenPlus;
      const avgLevel = totalMarks > 0 ? weightedTotal / totalMarks : 0;
      setResults({ score: totalScore, total: totalMarks, percentage, grade, topicBreakdown, showGrade, avgLevel });
      setView('results');
      toast.success("Exam submitted!");
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast.error("Failed to submit exam");
    } finally {
      setLoading(false);
    }
  }, [attempt?.id, examBoard, navigate, questions, settings.topic, userTrack]);

  const handleSubmitExamRef = useRef(handleSubmitExam);
  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startExam();
  }, [startExam]);

  useEffect(() => {
    if (view !== 'exam') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmitExamRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view]);

  const currentQuestion = questions[currentIndex];
  const currentDifficultyLevel = getDisplayDifficultyLevel(currentQuestion?.difficulty);
  const letters = ["A", "B", "C", "D", "E", "F"];
  const multipartParts = currentQuestion?.multipart?.parts ?? null;
  const currentPartIndex = multipartParts
    ? getQuestionPartIndex(currentQuestion.id, multipartParts.length)
    : 0;
  const currentPart = multipartParts ? multipartParts[currentPartIndex] : null;
  const currentPartLabel = currentPart?.label ?? (currentQuestion?.multipart ? `Part ${String.fromCharCode(65 + currentPartIndex)}` : null);
  const currentAnswers = currentPart?.all_answers ?? currentQuestion?.all_answers ?? [];
  const currentSelectedAnswer = (() => {
    if (!currentQuestion) return null;
    const stored = answers[currentQuestion.id];
    if (Array.isArray(stored)) return stored[currentPartIndex] ?? null;
    return stored ?? null;
  })();
  const multipartPartsCount = multipartParts?.length ?? 0;
  const hasMoreParts = Boolean(currentQuestion?.multipart && currentPartIndex < multipartPartsCount - 1);

  const { subtopicLabel } = getTopicAndSubtopicLabels({
    questionType: currentQuestion?.topic ?? null,
    subtopicId: currentQuestion?.subtopic ?? null,
    fallbackTopic: settings.topic ?? null,
  });

  const questionTierLabel = (() => {
    const raw = String(currentQuestion?.tier ?? '').trim();
    if (!raw) return null;
    if (raw.toLowerCase().includes('foundation')) return 'Foundation';
    if (raw.toLowerCase().includes('higher')) return 'Higher';
    return raw;
  })();

  const questionCalculatorLabel = (() => {
    const raw = String(currentQuestion?.calculator ?? '').trim();
    if (!raw) return null;
    if (raw.toLowerCase().includes('non')) return 'Non-calc';
    if (raw.toLowerCase().includes('calc')) return 'Calc';
    return raw;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Results View
  if (view === 'results' && results) {
    const gridColsClass = results.showGrade ? 'grid-cols-3' : 'grid-cols-2';
    const avgLevelLabel = results.avgLevel.toFixed(2);
    return (
      <div className="max-w-2xl mx-auto px-4 w-full">
        {/* Header */}
        <div className="text-center py-8 fade-up fade-up-1">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 mb-5 shadow-lg">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-foreground">Exam Complete</h1>
          <p className="text-sm text-muted-foreground">Here's your performance analysis</p>
        </div>

        {/* Score Cards */}
        <div className={`grid ${gridColsClass} gap-3 mb-5 fade-up fade-up-2`}>
          <div className="card rounded-2xl p-4 text-center glow-subtle exam-card-border">
            <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Score</p>
            <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">{results.percentage}%</p>
            <p className="text-xs mt-1 text-muted-foreground">{results.score} of {results.total} correct</p>
          </div>
          {results.showGrade ? (
            <div className="card rounded-2xl p-4 text-center exam-card-border">
              <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Grade</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{results.grade}</p>
              <p className="text-xs mt-1 text-muted-foreground">
                {results.percentage >= 60 ? "Strong Pass" : results.percentage >= 40 ? "Pass" : "Needs Work"}
              </p>
            </div>
          ) : (
            <div className="card rounded-2xl p-4 text-center exam-card-border">
              <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Difficulty</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{avgLevelLabel}</p>
              <p className="text-xs mt-1 text-muted-foreground">Average level of session</p>
            </div>
          )}
          <div className="card rounded-2xl p-4 text-center exam-card-border">
            <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Time</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{formatTime(settings.length * 90 - timeLeft)}</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {Math.round((settings.length * 90 - timeLeft) / questions.length)}s avg
            </p>
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="card rounded-2xl p-5 mb-4 exam-card-border fade-up fade-up-3">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Topic Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(results.topicBreakdown).map(([topic, { earned, total }]) => {
              const pct = Math.round((earned / total) * 100);
              const isStrong = pct >= 70;
              const needsFocus = pct < 50;
              
              return (
                <div key={topic}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{topic}</span>
                      {isStrong && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          Strong
                        </span>
                      )}
                      {needsFocus && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 bg-amber-500/10">
                          Needs focus
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-semibold",
                      isStrong ? "text-emerald-500" : needsFocus ? "text-amber-500" : "text-primary"
                    )}>
                      {earned}/{total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isStrong ? "bg-emerald-500" : needsFocus ? "bg-amber-500" : "bg-gradient-to-r from-primary to-violet-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Review */}
        <div className="card rounded-2xl p-5 mb-5 exam-card-border fade-up fade-up-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Question Review</h3>
          </div>
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const resolvedMultipart =
                q.multipart ||
                extractMultipartFromCorrectAnswer(q.correct_answer) ||
                parseMultipartQuestion(q.prompt);
              const displayQuestion = resolvedMultipart ? { ...q, multipart: resolvedMultipart } : q;
              const { userAnswers } = getQuestionAnswerState(displayQuestion);
              const mergedAnswers = userAnswers.length > 0 ? userAnswers : parseUserAnswerValue(q.user_answer);
              const isCorrect = q.awarded_marks === q.marks;
              const isExpanded = expandedQuestion === q.id;
              
              return (
                <div key={q.id} className="overflow-hidden rounded-xl">
                  <button 
                    onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                    className={cn(
                      "review-item w-full flex items-center justify-between p-3 text-left transition-all duration-200",
                      isCorrect ? "bg-muted/50" : "bg-red-500/5 border border-red-200 dark:border-red-500/30",
                      isExpanded ? "rounded-t-xl" : "rounded-xl hover:translate-x-1"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"
                      )}>
                        {isCorrect ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Q{idx + 1}: {getTrackTopicLabel({
                            track: userTrack,
                            questionType: q.topic,
                            subtopicId: q.subtopic ?? null,
                            fallbackTopic: settings.topic ?? null,
                          }) ?? q.topic}
                        </p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          {isCorrect ? "Correct" : "Review recommended"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )} />
                  </button>
                  
                  {/* Expanded Question Details */}
                  {isExpanded && (
                    <div className={cn(
                      "p-4 border-t animate-in slide-in-from-top-2 duration-200",
                      isCorrect ? "bg-muted/30 border-border" : "bg-red-500/5 border-red-200 dark:border-red-500/30"
                    )}>
                      {/* Question Text */}
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Question</p>
                        <div className="text-sm text-foreground">
                          <RichQuestionContent text={displayQuestion.prompt} className="space-y-1" />
                        </div>
                      </div>
                      
                      {/* Question Image */}
                      {q.image_url && (
                        <div className="mb-4">
                          <div className="question-image-shell">
                            <ImageWithFallback
                              src={q.image_url}
                              alt={q.image_alt || "Question diagram"}
                              className="question-image-media"
                            />
                          </div>
                        </div>
                      )}
                      
                      {displayQuestion.multipart ? (
                        <div className="space-y-4 mb-4">
                          {displayQuestion.multipart.parts.map((part, partIndex) => {
                            const partLabel = part.label ?? `Part ${String.fromCharCode(65 + partIndex)}`;
                            const partAnswers = part.all_answers ?? [];
                            const userAnswer = mergedAnswers[partIndex];
                            return (
                              <div key={`${q.id}-part-${partIndex}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                                  {partLabel}
                                </div>
                                <div className="text-sm text-foreground mb-3">
                                  <RichQuestionContent text={part.prompt} className="space-y-1" />
                                </div>
                                <div className="space-y-2">
                                  {partAnswers.map((option, optIdx) => {
                                    const isThisCorrect = option === part.correct_answer;
                                    const isUserAnswer = option === userAnswer;
                                    return (
                                      <div 
                                        key={optIdx}
                                        className={cn(
                                          "flex items-center gap-3 p-2.5 rounded-lg text-sm",
                                          isThisCorrect && "bg-emerald-500/10 border border-emerald-500/30",
                                          isUserAnswer && !isThisCorrect && "bg-red-500/10 border border-red-500/30",
                                          !isThisCorrect && !isUserAnswer && "bg-muted/50"
                                        )}
                                      >
                                        <span className={cn(
                                          "w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold",
                                          isThisCorrect && "bg-emerald-500 text-white",
                                          isUserAnswer && !isThisCorrect && "bg-red-500 text-white",
                                          !isThisCorrect && !isUserAnswer && "bg-muted-foreground/20 text-muted-foreground"
                                        )}>
                                          {letters[optIdx]}
                                        </span>
                                        <span className={cn(
                                          "flex-1",
                                          isThisCorrect && "text-emerald-600 dark:text-emerald-400 font-medium",
                                          isUserAnswer && !isThisCorrect && "text-red-600 dark:text-red-400"
                                        )}>
                                          <MathText text={option} />
                                        </span>
                                        {isThisCorrect && (
                                          <Check className="w-4 h-4 text-emerald-500" />
                                        )}
                                        {isUserAnswer && !isThisCorrect && (
                                          <X className="w-4 h-4 text-red-500" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-4 pt-3 border-t border-border mt-3">
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Your answer: </span>
                                    <span className={cn(
                                      "font-medium",
                                      userAnswer ? "text-emerald-500" : "text-red-500"
                                    )}>
                                      {userAnswer ? <MathText text={userAnswer} /> : "Not answered"}
                                    </span>
                                  </div>
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Correct: </span>
                                    <span className="font-medium text-emerald-500">
                                      <MathText text={part.correct_answer} />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Options</p>
                          <div className="space-y-2">
                            {(q.all_answers || []).map((option, optIdx) => {
                              const isThisCorrect = option === q.correct_answer;
                              const userAnswer = mergedAnswers[0];
                              const isUserAnswer = option === userAnswer;
                              
                              return (
                                <div 
                                  key={optIdx}
                                  className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-lg text-sm",
                                    isThisCorrect && "bg-emerald-500/10 border border-emerald-500/30",
                                    isUserAnswer && !isThisCorrect && "bg-red-500/10 border border-red-500/30",
                                    !isThisCorrect && !isUserAnswer && "bg-muted/50"
                                  )}
                                >
                                  <span className={cn(
                                    "w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold",
                                    isThisCorrect && "bg-emerald-500 text-white",
                                    isUserAnswer && !isThisCorrect && "bg-red-500 text-white",
                                    !isThisCorrect && !isUserAnswer && "bg-muted-foreground/20 text-muted-foreground"
                                  )}>
                                    {letters[optIdx]}
                                  </span>
                                  <span className={cn(
                                    "flex-1",
                                    isThisCorrect && "text-emerald-600 dark:text-emerald-400 font-medium",
                                    isUserAnswer && !isThisCorrect && "text-red-600 dark:text-red-400"
                                  )}>
                                    <MathText text={option} />
                                  </span>
                                  {isThisCorrect && (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  )}
                                  {isUserAnswer && !isThisCorrect && (
                                    <X className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!displayQuestion.multipart && (
                        <div className="flex items-center gap-4 pt-3 border-t border-border">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Your answer: </span>
                            <span className={cn(
                              "font-medium",
                              isCorrect ? "text-emerald-500" : "text-red-500"
                            )}>
                              {mergedAnswers[0] ? <MathText text={mergedAnswers[0]} /> : "Not answered"}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Correct: </span>
                            <span className="font-medium text-emerald-500">
                              <MathText text={typeof q.correct_answer === 'string' ? q.correct_answer : String((q.correct_answer as any)?.answer ?? '')} />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Explanation</p>
                        <div className="text-sm text-foreground leading-relaxed bg-muted/30 border border-border rounded-lg p-3">
                          {q.explanation ? (
                            <div className="space-y-2 break-words">
                              <RichQuestionContent text={formatExplanation(q.explanation)} className="space-y-2" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No explanation available for this question yet.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="fade-up fade-up-5 pb-8">
          <button onClick={onBack} className="w-full ripple py-3.5 btn-primary rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-violet-500 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
            Return to Practice
          </button>
        </div>
      </div>
    );
  }

  // Exam View
  return (
    <div className="max-w-2xl mx-auto px-4 w-full pt-2 pb-8">
      {/* Header */}
      <div className="py-4 fade-up fade-up-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowExitModal(true)}
              className="p-1.5 -ml-1.5 rounded-lg transition-all duration-200 hover:bg-muted hover:scale-105 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-foreground">{currentIndex + 1}</span>
              <span className="text-sm text-muted-foreground">of {questions.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200",
              flagged.size > 0 ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
            )}>
              <Flag className="w-3.5 h-3.5" fill={flagged.size > 0 ? "currentColor" : "none"} />
              <span className="text-xs font-medium">{flagged.size} flagged</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
              getTimerClass()
            )}>
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className={cn(
                "text-sm font-semibold",
                timeLeft <= 60 ? "text-red-500" : timeLeft <= 300 ? "text-amber-500" : "text-foreground"
              )}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Navigation */}
      <div className="card rounded-2xl p-3 mb-4 exam-card-border fade-up fade-up-2">
        <div className="flex flex-wrap gap-1.5">
          {questions.map((_, idx) => {
            const navQuestion = questions[idx];
            const { hasAny, isComplete } = getQuestionAnswerState(navQuestion);
            const isAnswered = hasAny;
            const isFlagged = flagged.has(idx);
            const isCurrent = idx === currentIndex;
            
            return (
              <button
                key={idx}
                onClick={() => goToQuestion(idx)}
                className={cn(
                  "q-nav-btn w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-110 active:scale-95",
                  isCurrent && "bg-gradient-to-r from-primary to-violet-500 text-white shadow-md",
                  isFlagged && !isCurrent && "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-400/40",
                  isComplete && !isCurrent && !isFlagged && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                  isAnswered && !isComplete && !isCurrent && !isFlagged && "bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-400/40",
                  !isAnswered && !isCurrent && !isFlagged && "bg-muted text-muted-foreground"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="card rounded-2xl mb-4 overflow-hidden exam-card-border glow-subtle fade-up fade-up-3">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Question {currentIndex + 1}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {currentQuestion.marks ?? 1} mark{(currentQuestion.marks ?? 1) === 1 ? "" : "s"}
                </span>
                {currentDifficultyLevel && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getDifficultyTagClass(currentDifficultyLevel)}`}>
                    lvl {currentDifficultyLevel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {subtopicLabel && (
                  <span className="inline-flex max-w-[200px] items-center truncate rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {subtopicLabel}
                  </span>
                )}
                {questionCalculatorLabel && questionCalculatorLabel !== 'Non-calc' && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {questionCalculatorLabel}
                  </span>
                )}
                {questionTierLabel && questionTierLabel !== '11+ Standard' && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {questionTierLabel}
                  </span>
                )}
                <button 
                  onClick={toggleFlag}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 border",
                    flagged.has(currentIndex) 
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-500" 
                      : "border-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Flag className="w-4 h-4" fill={flagged.has(currentIndex) ? "currentColor" : "none"} />
                  <span className="text-xs font-medium">{flagged.has(currentIndex) ? "Flagged" : "Flag"}</span>
                </button>
              </div>
            </div>

            {currentQuestion.prompt && (
              <div className="text-lg sm:text-xl font-medium leading-relaxed mb-5 text-foreground">
                <RichQuestionContent text={currentQuestion.prompt} className="space-y-2" />
              </div>
            )}

            {currentPart && (
              <div className="mb-5 rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  <span>{currentPartLabel}</span>
                  <span>{currentPartIndex + 1}/{currentQuestion.multipart?.parts.length}</span>
                </div>
                <div className="text-sm sm:text-base text-foreground">
                  <RichQuestionContent text={currentPart.prompt} className="space-y-2" />
                </div>
              </div>
            )}

            {currentQuestion.image_url && (
              <div className="mb-6">
                <div className="question-image-shell">
                  <ImageWithFallback
                    src={currentQuestion.image_url}
                    alt="Question diagram"
                    className="question-image-media"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {currentAnswers.map((answer, idx) => {
                const isSelected = currentSelectedAnswer === answer;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(currentQuestion, answer)}
                    className={cn(
                      "option-card w-full text-left p-4 rounded-xl transition-all duration-200 border",
                      isSelected 
                        ? "border-primary bg-gradient-to-r from-primary/10 to-violet-500/10 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]" 
                        : "border-border bg-card hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-violet-500/5 hover:translate-x-1"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "flex-shrink-0 w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all duration-200",
                        isSelected 
                          ? "bg-gradient-to-r from-primary to-violet-500 text-white border-transparent" 
                          : "border-border text-muted-foreground"
                      )}>
                        {letters[idx]}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        <MathText text={answer} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 fade-up fade-up-4">
        <button 
          onClick={() => {
            if (currentQuestion?.multipart && currentPartIndex > 0) {
              setQuestionPartIndex(currentQuestion.id, currentPartIndex - 1);
              return;
            }
            setCurrentIndex(Math.max(0, currentIndex - 1));
          }}
          disabled={currentIndex === 0 && (!currentQuestion?.multipart || currentPartIndex === 0)}
          className="flex-1 py-3 text-sm font-medium btn-secondary rounded-xl flex items-center justify-center gap-2 bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          {currentQuestion?.multipart && currentPartIndex > 0 ? "Previous Part" : "Previous"}
        </button>
        {currentIndex === questions.length - 1 ? (
          <button 
            onClick={() => {
              if (hasMoreParts && currentQuestion) {
                setQuestionPartIndex(currentQuestion.id, currentPartIndex + 1);
                return;
              }
              handleSubmitExam();
            }}
            className="ripple flex-1 py-3 btn-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-violet-500 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            {hasMoreParts ? "Next Part" : "Submit Exam"}
          </button>
        ) : (
          <button 
            onClick={() => {
              if (hasMoreParts && currentQuestion) {
                setQuestionPartIndex(currentQuestion.id, currentPartIndex + 1);
                return;
              }
              setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1));
            }}
            className="ripple flex-1 py-3 btn-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-violet-500 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            {hasMoreParts ? "Next Part" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
            onClick={() => setShowExitModal(false)}
          />
          <div className="relative card border border-border rounded-2xl p-6 max-w-sm w-full scale-in bg-card shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">End examination?</h3>
            <p className="text-sm mb-6 text-muted-foreground">Your progress will be lost and cannot be recovered. Are you sure you want to exit?</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowExitModal(false)}
                className="py-3 btn-secondary rounded-xl text-sm font-semibold bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
              >
                Continue Exam
              </button>
              <button 
                onClick={onBack}
                className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              >
                End Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
