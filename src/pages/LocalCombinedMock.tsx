import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  Clock3,
  Coffee,
  CreditCard,
  Flag,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  readLiveMockLocalState,
  shouldPersistLiveMockSession,
} from "@/lib/liveMockSessionGuard";
import { useAppContext } from "@/hooks/useAppContext";
import { useMembership } from "@/hooks/useMembership";
import { cn } from "@/lib/utils";
import { formatLiveMockPrice, LIVE_MOCK_STANDARD_PRICE_GBP } from "@/lib/liveMockPricing";
import { fetchCombinedMockSignup, registerForCombinedMock } from "@/lib/liveMockRegistration";
import {
  isLiveMockAlreadyRegisteredError,
  isLiveMockCheckoutPending,
  pollLiveMockSignupUntilReady,
} from "@/lib/liveMockCheckoutFlow";
import {
  BREAK_MINUTES,
  BREAK_SECONDS,
  combinedMockAnalyticsUrl,
  COMBINED_MOCK_EVENT_SLUG,
  COMBINED_MOCK_DISPLAY_TITLE,
  ENGLISH_PAPER,
  englishPaperForEvent,
  isCombinedMockReleased,
  MATHS_PAPER,
  mathsPaperForEvent,
  SECOND_MOCK_EVENT_SLUG,
  type MockPaper,
  paperQuestionCount,
  paperSeconds,
  sectionForQuestion,
} from "@/lib/liveMockCombinedConfig";
import { assertLiveMockPaperScorable, normalizeLiveMockOptions } from "@/lib/liveMockScoringGuard";
import {
  ensureLiveMockInProgressAttempt,
  fetchLiveMockAttempt,
  loadLiveMockSavedAnswers,
  type LiveMockAttemptStatus,
} from "@/lib/liveMockAttemptResume";

export type LocalCombinedMockProps = {
  mockEventSlug?: string;
  displayTitle?: string;
  backHref?: string;
  checkReleased?: () => boolean;
};

const MATHS_SECONDS = paperSeconds(MATHS_PAPER);
const ENGLISH_SECONDS = paperSeconds(ENGLISH_PAPER);
/** Short timers for localhost flow testing (?fast=1). Order stays maths → break → english. */
const FAST_MATHS_SECONDS = 30;
const FAST_BREAK_SECONDS = 10;
const FAST_ENGLISH_SECONDS = 30;

// `maths_resit_complete` is the maths-only re-sit success screen for users hit by
// the key-mismatch bug; it links to analytics and never routes back to break/English.
type Phase = "instructions" | "maths" | "break" | "english" | "complete" | "maths_resit_complete";
type Eligibility = {
  loading: boolean;
  registered: boolean;
  error: string | null;
};

type SavedMockState = {
  phase: Phase;
  currentQuestion: number;
  answers: Record<string, string>;
  flagged: string[];
  phaseEndsAt: number | null;
  /** True while a maths-only re-sit is in progress, so a refresh resumes correctly. */
  resit?: boolean;
};

type MockOption = { id: string; text: string; correct: boolean };
type MathsQuestion = {
  questionNumber: number;
  dbQuestionId: string;
  sectionKey: string | null;
  questionType: string;
  stem: string;
  options: MockOption[];
};

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Stable localStorage keys — must match submitMaths lookup (not display labels like "Non-calculator Maths"). */
const MATHS_ANSWER_PREFIX = "maths";
const ENGLISH_ANSWER_PREFIX = "english";
/** Buggy prefix used before fix; still read on submit so in-flight sittings are not lost. */
const LEGACY_MATHS_ANSWER_PREFIX = "non-calculator maths";

function mathsAnswerKey(questionNumber: number) {
  return `${MATHS_ANSWER_PREFIX}-${questionNumber}`;
}

function englishAnswerKey(questionNumber: number) {
  return `${ENGLISH_ANSWER_PREFIX}-${questionNumber}`;
}

function answerKeyForPhase(phase: Phase, questionNumber: number) {
  return phase === "english" ? englishAnswerKey(questionNumber) : mathsAnswerKey(questionNumber);
}

function migrateSavedAnswers(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const legacy = key.match(/^non-calculator maths-(\d+)$/);
    if (legacy) out[mathsAnswerKey(Number(legacy[1]))] = value;
    else out[key] = value;
  }
  return out;
}

function migrateFlaggedKeys(flagged: string[]): string[] {
  return flagged.map((key) => {
    const legacy = key.match(/^non-calculator maths-(\d+)$/);
    return legacy ? mathsAnswerKey(Number(legacy[1])) : key;
  });
}

function getMathsSelectedAnswer(answers: Record<string, string>, questionNumber: number): string | null {
  return (
    answers[mathsAnswerKey(questionNumber)] ||
    answers[`${LEGACY_MATHS_ANSWER_PREFIX}-${questionNumber}`] ||
    null
  );
}

function hasMathsAnswer(answers: Record<string, string>, questionNumber: number): boolean {
  return Boolean(getMathsSelectedAnswer(answers, questionNumber));
}

function countMathsAnswers(answers: Record<string, string>): number {
  const seen = new Set<number>();
  for (const key of Object.keys(answers)) {
    if (!answers[key]) continue;
    const match = key.match(/^maths-(\d+)$/) || key.match(/^non-calculator maths-(\d+)$/);
    if (match) seen.add(Number(match[1]));
  }
  return seen.size;
}

function readSavedMockState(storageKey: string): SavedMockState | null {
  return readLiveMockLocalState<SavedMockState>(storageKey);
}

function isResumableSavedPhase(phase: Phase): phase is "maths" | "break" {
  return phase === "maths" || phase === "break";
}

/** Apply saved sitting state without redundant setState calls (prevents flicker loops). */
function applySavedMockState(
  saved: SavedMockState,
  setters: {
    setPhase: (phase: Phase) => void;
    setCurrentQuestion: (n: number) => void;
    setAnswers: (a: Record<string, string>) => void;
    setFlagged: (f: string[]) => void;
    setPhaseEndsAt: (t: number | null) => void;
    setResitMode: (r: boolean) => void;
  },
  current: {
    phase: Phase;
    currentQuestion: number;
    answers: Record<string, string>;
    flagged: string[];
    phaseEndsAt: number | null;
    resitMode: boolean;
  },
) {
  const nextAnswers = migrateSavedAnswers(saved.answers || {});
  const nextFlagged = migrateFlaggedKeys(saved.flagged || []);
  const nextResit = Boolean(saved.resit);

  if (saved.phase !== current.phase) setters.setPhase(saved.phase);
  if (saved.currentQuestion !== current.currentQuestion) setters.setCurrentQuestion(saved.currentQuestion);
  if (JSON.stringify(nextAnswers) !== JSON.stringify(current.answers)) setters.setAnswers(nextAnswers);
  if (JSON.stringify(nextFlagged) !== JSON.stringify(current.flagged)) setters.setFlagged(nextFlagged);
  if (saved.phaseEndsAt !== current.phaseEndsAt) setters.setPhaseEndsAt(saved.phaseEndsAt);
  if (nextResit !== current.resitMode) setters.setResitMode(nextResit);
}

/*
 * ───────────────────────────────────────────────────────────────────────────
 * REMEDIATION POPUP COPY — EDIT THE WORDING HERE (single source of truth).
 *
 * Niketh: this is the ONLY place the apology popup wording lives. Change the
 * title, body (including the £5 refund line) and button labels here and it
 * updates everywhere. The body below is an honest placeholder; swap it for the
 * final wording when ready. Keep the £5 refund mention and the restart button.
 * ───────────────────────────────────────────────────────────────────────────
 */
const REMEDIATION_POPUP_COPY = {
  title: "We need to put something right",
  body:
    "Due to a technical fault on our end, your Maths answers from earlier today were not saved and your score was lost. We're really sorry. We're refunding you £5 as an apology, and you can redo the Maths paper now - this time it will score correctly.",
  reassurance:
    "Your English paper is already done and stays saved - this only redoes Maths. No break, no English again.",
  restartButton: "Restart Maths paper",
  dismissButton: "Not now",
} as const;

/** Result of the precise affected-cohort DB check. */
type AffectedMathsState = {
  affected: boolean;
  attemptId: string | null;
  mathsPaperId: string | null;
};

const NOT_AFFECTED: AffectedMathsState = { affected: false, attemptId: null, mathsPaperId: null };

/**
 * AFFECTED-COHORT DETECTION — designed for ZERO false positives.
 *
 * A user is "affected" by the key-mismatch Maths bug ONLY when their
 * `both_subjects_maths` attempt satisfies ALL of:
 *   1. it exists (they actually sat Maths), and
 *   2. status === 'submitted', and
 *   3. answered_count === 0, and
 *   4. every live_mock_answers.selected_option for that attempt is NULL.
 *
 * Anyone with a real score (answered_count > 0 or any non-null selected_option),
 * an in-progress attempt, no Maths attempt at all, or ANY read error returns
 * `affected: false` — so the apology popup can never show to the wrong person.
 * The check runs against the DB (not client/localStorage state) every time.
 */
async function detectAffectedMathsAttempt(userId: string): Promise<AffectedMathsState> {
  const mock1MathsSlug = mathsPaperForEvent(COMBINED_MOCK_EVENT_SLUG).slug;
  try {
    const { data: paper, error: paperError } = await supabase
      .from("live_mock_papers" as never)
      .select("id")
      .eq("slug", mock1MathsSlug)
      .maybeSingle();
    if (paperError) return NOT_AFFECTED;
    const mathsPaperId = (paper as { id?: string } | null)?.id ?? null;
    if (!mathsPaperId) return NOT_AFFECTED;

    const { data: attempt, error: attemptError } = await supabase
      .from("live_mock_attempts" as never)
      .select("id, status, answered_count")
      .eq("paper_id", mathsPaperId)
      .eq("user_id", userId)
      .maybeSingle();
    if (attemptError) return { ...NOT_AFFECTED, mathsPaperId };

    const row = attempt as { id: string; status: string; answered_count: number | null } | null;
    // Condition 1 + 2: must have a SUBMITTED Maths attempt. (Never sat / in-progress => safe.)
    if (!row || row.status !== "submitted") return { ...NOT_AFFECTED, mathsPaperId };
    // Condition 3: a real score means answered_count > 0 — definitely not affected.
    if ((row.answered_count ?? 0) !== 0) return { ...NOT_AFFECTED, mathsPaperId };

    // Condition 4 (authoritative final guard): confirm against raw answer rows that
    // NOTHING was selected. If even one selected_option is non-null, do NOT flag.
    const { count, error: answersError } = await supabase
      .from("live_mock_answers" as never)
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", row.id)
      .not("selected_option", "is", null);
    if (answersError) return { ...NOT_AFFECTED, mathsPaperId };
    if ((count ?? 0) > 0) return { ...NOT_AFFECTED, mathsPaperId };

    return { affected: true, attemptId: row.id, mathsPaperId };
  } catch {
    // When in doubt, never show the popup.
    return NOT_AFFECTED;
  }
}

/**
 * The English paper reuses the EXACT app split-view (EnglishSplitViewDemo) via
 * the live-mock session route. Maths/break run here; English hands off to that page.
 */
export default function LocalCombinedMock({
  mockEventSlug = COMBINED_MOCK_EVENT_SLUG,
  displayTitle = COMBINED_MOCK_DISPLAY_TITLE,
  backHref = "/live-mock-exams",
  checkReleased = isCombinedMockReleased,
}: LocalCombinedMockProps = {}) {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const membership = useMembership();
  const { hasPaidPremiumLiveMockAccess, isTrialing } = membership;
  const [searchParams] = useSearchParams();
  const fastMode = searchParams.get("fast") === "1" && import.meta.env.DEV;
  // `?dev=1` skips the registration/payment check, so it must never work in production.
  const devBypass = searchParams.get("dev") === "1" && import.meta.env.DEV;
  const storageKey = user
    ? `gradlify_local_combined_mock_${mockEventSlug}_${user.id}`
    : `gradlify_local_combined_mock_${mockEventSlug}_anon`;
  const [registering, setRegistering] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [liveMockPriceGbp, setLiveMockPriceGbp] = useState(LIVE_MOCK_STANDARD_PRICE_GBP);

  const durations = useMemo(
    () => ({
      maths: fastMode ? FAST_MATHS_SECONDS : MATHS_SECONDS,
      break: fastMode ? FAST_BREAK_SECONDS : BREAK_SECONDS,
      english: fastMode ? FAST_ENGLISH_SECONDS : ENGLISH_SECONDS,
    }),
    [fastMode],
  );
  const [eligibility, setEligibility] = useState<Eligibility>({
    loading: true,
    registered: false,
    error: null,
  });
  const [hasFullyCompleted, setHasFullyCompleted] = useState(false);
  const [awaitingEnglish, setAwaitingEnglish] = useState(false);
  const [mathsAttemptStatus, setMathsAttemptStatus] = useState<LiveMockAttemptStatus>("none");
  const [phase, setPhase] = useState<Phase>("instructions");
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(MATHS_SECONDS);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [mathsQuestions, setMathsQuestions] = useState<MathsQuestion[]>([]);
  const [mathsPaperId, setMathsPaperId] = useState<string | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [submittingMaths, setSubmittingMaths] = useState(false);
  const mathsSubmittedRef = useRef(false);
  /** Which storage key we already hydrated from (prevents restore/save flicker loops). */
  const hydratedStorageKeyRef = useRef<string | null>(null);
  const skipPersistRef = useRef(false);
  const eligibilityResolvedRef = useRef(false);

  // Remediation (apology popup) + maths-only re-sit state for the affected cohort.
  const [remediation, setRemediation] = useState<AffectedMathsState>(NOT_AFFECTED);
  const [remediationOpen, setRemediationOpen] = useState(false);
  const [resitMode, setResitMode] = useState(false);
  const location = useLocation();

  // Autosave safety net: per-answer writes to the DB during the Maths phase so a
  // crash / early-exit can never silently wipe a student's answers again.
  const autosaveAttemptIdRef = useRef<string | null>(null);
  const pendingAutosaveRef = useRef<Map<number, string>>(new Map());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Lets auto-submit retry if the DB write fails when the maths timer hits zero. */
  const phaseExpiryHandledRef = useRef(false);
  // Mirror of `answers` for stable reads inside debounced autosave callbacks.
  const answersRef = useRef<Record<string, string>>({});
  const isMock2 = mockEventSlug === SECOND_MOCK_EVENT_SLUG;
  const activeMathsPaper = mathsPaperForEvent(mockEventSlug);
  const activeEnglishPaper = englishPaperForEvent(mockEventSlug);
  const englishSessionUrl = useMemo(
    () =>
      `/live-mock-exams/session?${new URLSearchParams({
        track: "11plus",
        subject: "english",
        topics: "Comprehension,SPaG",
        mode: "mock-exam",
        questions: String(paperQuestionCount(activeEnglishPaper)),
        duration: String(activeEnglishPaper.durationMinutes),
        liveMockSlug: activeEnglishPaper.slug,
      }).toString()}`,
    [activeEnglishPaper],
  );
  const combinedAnalyticsUrl = combinedMockAnalyticsUrl(mockEventSlug, "english");
  const mathsAnalyticsUrl = combinedMockAnalyticsUrl(mockEventSlug, "maths");
  const mockPrimaryBtn = cn(
    "text-white",
    isMock2 ? "bg-slate-900 hover:bg-slate-800" : "bg-orange-600 hover:bg-orange-700",
  );
  const mockPrimaryBtnLg = cn("h-12 w-full rounded-xl text-base font-bold", mockPrimaryBtn);
  const mockPrimaryBtnLgMt = cn("mt-6", mockPrimaryBtnLg);

  const checkEligibility = useCallback(async () => {
    if (!user) {
      setEligibility({ loading: false, registered: false, error: null });
      eligibilityResolvedRef.current = false;
      return;
    }
    if (devBypass) {
      setEligibility({ loading: false, registered: true, error: null });
      eligibilityResolvedRef.current = true;
      return;
    }
    setEligibility((current) => {
      // Never flash the full-page loader mid-exam on silent re-checks (auth refresh, etc.).
      if (current.registered || eligibilityResolvedRef.current) {
        return { ...current, loading: false, error: null };
      }
      return { ...current, loading: true, error: null };
    });
    const signupResult = await supabase
      .from("live_mock_exam_signups" as never)
      .select("id")
      .eq("mock_slug", mockEventSlug)
      .eq("user_id", user.id)
      .maybeSingle();

    if (signupResult.error) {
      setEligibility({
        loading: false,
        registered: false,
        error: "Could not verify mock access. Refresh and try again.",
      });
      return;
    }

    const registered = Boolean(signupResult.data);
    if (registered) eligibilityResolvedRef.current = true;
    setEligibility({
      loading: false,
      registered,
      error: null,
    });
  }, [devBypass, mockEventSlug, user]);

  useEffect(() => {
    void checkEligibility();
  }, [checkEligibility]);

  // Load the real Maths paper (questions, options, answers) from Supabase.
  // Retries a few times with backoff so a transient read failure during a
  // traffic spike self-heals instead of leaving the student an empty paper.
  useEffect(() => {
    let cancelled = false;

    const loadOnce = async (): Promise<MathsQuestion[]> => {
      const { data: paper, error: paperError } = await supabase
        .from("live_mock_papers" as never)
        .select("id")
        .eq("slug", activeMathsPaper.slug)
        .maybeSingle();
      if (paperError) throw paperError;
      const pid = (paper as { id?: string } | null)?.id ?? null;
      if (!pid) throw new Error(`Maths paper not found (${activeMathsPaper.slug})`);

      const [{ data: sections, error: sectionsError }, { data: questions, error: questionsError }] =
        await Promise.all([
          supabase.from("live_mock_sections" as never).select("id, section_key").eq("paper_id", pid),
          supabase
            .from("live_mock_questions" as never)
            .select("id, section_id, question_number, question_type, stem, options, correct_answer")
            .eq("paper_id", pid)
            .order("question_number", { ascending: true }),
        ]);
      if (sectionsError) throw sectionsError;
      if (questionsError) throw questionsError;

      const keyBySection = new Map<string, string>();
      ((sections as { id: string; section_key: string }[] | null) || []).forEach((s) =>
        keyBySection.set(s.id, s.section_key),
      );
      const mapped: MathsQuestion[] = (((questions as Record<string, unknown>[] | null) || [])).map((q) => ({
        questionNumber: Number(q.question_number),
        dbQuestionId: String(q.id),
        sectionKey: keyBySection.get(String(q.section_id)) ?? null,
        questionType: String(q.question_type || "maths"),
        stem: String(q.stem || ""),
        options: normalizeLiveMockOptions(q.options, q.correct_answer as string | null),
      }));
      if (mapped.length === 0) throw new Error("Maths paper returned no questions");
      const scorable = assertLiveMockPaperScorable(mapped);
      if (!scorable.ok) throw new Error(scorable.reason);
      setMathsPaperId(pid);
      return mapped;
    };

    void (async () => {
      setQuestionsLoading(true);
      setQuestionsError(false);
      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const mapped = await loadOnce();
          if (cancelled) return;
          setMathsQuestions(mapped);
          setQuestionsError(false);
          setQuestionsLoading(false);
          return;
        } catch (error) {
          if (cancelled) return;
          if (attempt === maxAttempts) {
            console.error("Maths paper load failed after retries:", error);
            setMathsQuestions([]);
            setQuestionsError(true);
            setQuestionsLoading(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeMathsPaper.slug, reloadKey]);

  // Fully complete only once the English paper is submitted. Maths submits mid-sitting
  // (before the break), so we must NOT treat a submitted Maths attempt as finished.
  useEffect(() => {
    if (!user?.id) {
      setHasFullyCompleted(false);
      setAwaitingEnglish(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: papers } = await supabase
        .from("live_mock_papers" as never)
        .select("id, slug")
        .in("slug", [activeMathsPaper.slug, activeEnglishPaper.slug]);
      const rows = (papers as { id: string; slug: string }[] | null) || [];
      const mathsPaperId = rows.find((p) => p.slug === activeMathsPaper.slug)?.id;
      const englishPaperId = rows.find((p) => p.slug === activeEnglishPaper.slug)?.id;
      if (!mathsPaperId || !englishPaperId || cancelled) return;

      const { data: attempts } = await supabase
        .from("live_mock_attempts" as never)
        .select("paper_id, status")
        .in("paper_id", [mathsPaperId, englishPaperId])
        .eq("user_id", user.id);

      const attemptRows = (attempts as { paper_id: string; status: string }[] | null) || [];
      const mathsRow = attemptRows.find((row) => row.paper_id === mathsPaperId);
      const mathsSubmitted = mathsRow?.status === "submitted";
      const englishSubmitted = attemptRows.some(
        (row) => row.paper_id === englishPaperId && row.status === "submitted",
      );
      const mathsStatus: LiveMockAttemptStatus = mathsRow
        ? mathsRow.status === "submitted"
          ? "submitted"
          : mathsRow.status === "in_progress"
            ? "in_progress"
            : "none"
        : "none";

      if (!cancelled) {
        setHasFullyCompleted(englishSubmitted);
        setAwaitingEnglish(mathsSubmitted && !englishSubmitted);
        setMathsAttemptStatus(mathsStatus);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeEnglishPaper.slug, activeMathsPaper.slug, user?.id]);

  // Mock 1 only: apology + maths re-sit for the affected cohort. Never run on mock 2.
  useEffect(() => {
    if (mockEventSlug !== COMBINED_MOCK_EVENT_SLUG) {
      setRemediation(NOT_AFFECTED);
      setRemediationOpen(false);
      return;
    }
    if (!user?.id || !hasFullyCompleted || resitMode) return;
    let cancelled = false;
    void (async () => {
      const result = await detectAffectedMathsAttempt(user.id);
      if (cancelled) return;
      setRemediation(result);
      if (result.affected) setRemediationOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasFullyCompleted, mockEventSlug, resitMode, user?.id, location.key]);

  useEffect(() => {
    void supabase.functions
      .invoke("live-mock-signup-count", { body: { mockSlug: mockEventSlug } })
      .then(({ data }) => {
        if (typeof data?.currentPriceGbp === "number") {
          setLiveMockPriceGbp(data.currentPriceGbp);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!user?.id || devBypass || eligibility.registered) return;
    const shouldPoll =
      searchParams.get("upgraded") === "true" || isLiveMockCheckoutPending(mockEventSlug);
    if (!shouldPoll) return;

    let cancelled = false;
    setConfirmingPayment(true);

    void pollLiveMockSignupUntilReady(user.id, mockEventSlug).then((registered) => {
      if (cancelled) return;
      setConfirmingPayment(false);
      if (registered) {
        eligibilityResolvedRef.current = true;
        setEligibility({ loading: false, registered: true, error: null });
        toast.success("You're registered for the mock.");
        const cleaned = window.location.search.replace(/[?&]upgraded=true/, "");
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (cleaned === "?" ? "" : cleaned),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [devBypass, eligibility.registered, mockEventSlug, searchParams, user?.id]);

  useEffect(() => {
    // Only clear saved progress once maths is submitted and the student is back on the
    // lobby — never yank them off the maths paper or break screen mid-sitting.
    if (mathsAttemptStatus === "submitted" && !resitMode && phase === "instructions") {
      window.localStorage.removeItem(storageKey);
      hydratedStorageKeyRef.current = storageKey;
    }
  }, [mathsAttemptStatus, phase, resitMode, storageKey]);

  // Hydrate sitting progress once per storage key when attempt status is known.
  // useLayoutEffect runs before paint so a resumed sitting does not flash the lobby.
  // Re-running restore on every status tick was resetting navigation (reported around Q45+).
  useLayoutEffect(() => {
    if (hydratedStorageKeyRef.current === storageKey) return;
    if (mathsAttemptStatus === "submitted" && !resitMode) {
      hydratedStorageKeyRef.current = storageKey;
      return;
    }

    const saved = readSavedMockState(storageKey);
    if (!saved) {
      if (mathsAttemptStatus !== "none" || resitMode) {
        hydratedStorageKeyRef.current = storageKey;
      }
      return;
    }

    if (
      saved.phase === "english" ||
      saved.phase === "complete" ||
      saved.phase === "maths_resit_complete"
    ) {
      window.localStorage.removeItem(storageKey);
      hydratedStorageKeyRef.current = storageKey;
      return;
    }

    const canResume =
      saved.resit || mathsAttemptStatus === "in_progress" || isResumableSavedPhase(saved.phase);
    if (!canResume) return;

    skipPersistRef.current = true;
    applySavedMockState(
      saved,
      { setPhase, setCurrentQuestion, setAnswers, setFlagged, setPhaseEndsAt, setResitMode },
      { phase, currentQuestion, answers, flagged, phaseEndsAt, resitMode },
    );
    skipPersistRef.current = false;
    hydratedStorageKeyRef.current = storageKey;
  }, [mathsAttemptStatus, resitMode, storageKey]);

  useEffect(() => {
    if (
      !shouldPersistLiveMockSession(
        skipPersistRef,
        hydratedStorageKeyRef,
        storageKey,
        phase === "instructions" && mathsAttemptStatus === "none",
      )
    ) {
      return;
    }

    const saved: SavedMockState = { phase, currentQuestion, answers, flagged, phaseEndsAt, resit: resitMode };
    window.localStorage.setItem(storageKey, JSON.stringify(saved));
  }, [answers, currentQuestion, flagged, mathsAttemptStatus, phase, phaseEndsAt, resitMode, storageKey]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Clear any pending autosave timer on unmount so a late flush cannot fire.
  useEffect(
    () => () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    },
    [],
  );

  const launchEnglish = useCallback(() => {
    // Hand off to the real split-view English paper (same code as the app).
    window.localStorage.removeItem(storageKey);
    navigate(englishSessionUrl);
  }, [navigate, storageKey]);

  const goToBreak = useCallback(() => {
    setPhase("break");
    setCurrentQuestion(1);
    setPhaseEndsAt(Date.now() + durations.break * 1000);
  }, [durations.break]);

  // Ensure there is an `in_progress` both_subjects_maths attempt to attach answers
  // to. Reuses the single row per (paper_id, user_id) via upsert onConflict, so a
  // re-sit RESETS the existing (blank, broken) attempt in place — it never creates
  // a second attempt row, which keeps cohort counts and rank to one row per user.
  const ensureInProgressAttempt = useCallback(async (): Promise<string | null> => {
    if (autosaveAttemptIdRef.current) return autosaveAttemptIdRef.current;
    if (!user?.id || !mathsPaperId) return null;
    const userEmail =
      typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;
    const result = await ensureLiveMockInProgressAttempt({
      paperId: mathsPaperId,
      userId: user.id,
      userEmail,
      questionCount: mathsQuestions.length || paperQuestionCount(activeMathsPaper),
      allowResetSubmitted: resitMode,
    });
    if (!result.ok) {
      if (result.reason === "submitted") {
        console.warn("autosave: maths attempt already submitted");
      }
      return null;
    }
    autosaveAttemptIdRef.current = result.attemptId;
    return result.attemptId;
  }, [activeMathsPaper, mathsPaperId, mathsQuestions.length, resitMode, user]);

  // Flush queued answer selections to live_mock_answers (overwrite in place via
  // onConflict attempt_id,question_id). Debounced from the option click handler.
  const flushAutosave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const pending = pendingAutosaveRef.current;
    if (pending.size === 0 || !user?.id || !mathsPaperId) return;

    const attemptId = await ensureInProgressAttempt();
    if (!attemptId) return;

    const entries = Array.from(pending.entries());
    pending.clear();

    const rows = entries.flatMap(([questionNumber, optionId]) => {
      const q = mathsQuestions.find((m) => m.questionNumber === questionNumber);
      if (!q) return [];
      const correct = q.options.find((o) => o.correct);
      const selectedChoice = q.options.find((o) => o.id === optionId);
      return [
        {
          attempt_id: attemptId,
          paper_id: mathsPaperId,
          question_id: q.dbQuestionId,
          user_id: user.id,
          question_number: q.questionNumber,
          section_key: q.sectionKey,
          question_type: q.questionType,
          stem_snapshot: q.stem,
          correct_option_id: correct?.id ?? null,
          correct_option_label: correct?.text ?? null,
          selected_option: optionId,
          selected_option_label: selectedChoice?.text ?? null,
          options_snapshot: q.options.map((o) => ({ id: o.id, text: o.text, correct: o.correct })),
          is_correct: Boolean(correct && optionId === correct.id),
          answered_at: new Date().toISOString(),
        },
      ];
    });
    if (rows.length === 0) return;

    const { error } = await supabase
      .from("live_mock_answers" as never)
      .upsert(rows as never, { onConflict: "attempt_id,question_id" });
    if (error) {
      console.error("autosave: flush answers", error);
      // Re-queue so the next flush (or the authoritative submit) still captures them.
      entries.forEach(([qn, opt]) => pending.set(qn, opt));
      return;
    }
    // Keep the attempt's answered_count roughly current for crash-recovery clarity;
    // the submit path recomputes it authoritatively, so a stale value is harmless.
    const answeredCount = countMathsAnswers(answersRef.current);
    void supabase
      .from("live_mock_attempts" as never)
      .update({ answered_count: answeredCount } as never)
      .eq("id", attemptId);
  }, [ensureInProgressAttempt, mathsPaperId, mathsQuestions, user]);

  useEffect(() => {
    const flushOnHide = () => {
      void flushAutosave();
    };
    window.addEventListener("pagehide", flushOnHide);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushAutosave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushOnHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flushAutosave]);

  // Submit Maths (paper 1) to Supabase so the combined analytics Maths tab shows
  // the real score, placement and per-question review, then move to the break.
  const submitMaths = useCallback(async () => {
    if (mathsSubmittedRef.current || submittingMaths) return;
    mathsSubmittedRef.current = true;
    setSubmittingMaths(true);
    // Cancel any pending debounced autosave; the upsert below writes the full,
    // authoritative answer set anyway.
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    let savedOk = false;
    try {
      if (user?.id && mathsPaperId && mathsQuestions.length > 0) {
        if (!resitMode) {
          const existing = await fetchLiveMockAttempt(mathsPaperId, user.id);
          if (existing?.status === "submitted") {
            throw new Error("You have already submitted the Maths paper.");
          }
        }

        await flushAutosave();

        const scorable = assertLiveMockPaperScorable(mathsQuestions);
        if (!scorable.ok) {
          throw new Error(scorable.reason);
        }

        const userEmail =
          typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;
        const allocated = durations.maths;
        const elapsedSeconds = Math.max(0, allocated - secondsLeft);

        const rows = mathsQuestions.map((q) => {
          const selected = getMathsSelectedAnswer(answers, q.questionNumber);
          const correct = q.options.find((o) => o.correct);
          const selectedChoice = selected ? q.options.find((o) => o.id === selected) : undefined;
          return { q, selected, correct, selectedChoice };
        });
        const answeredCount = rows.filter((r) => r.selected).length;

        const attemptId = await ensureInProgressAttempt();
        if (!attemptId) {
          throw new Error("Could not open your Maths attempt to submit.");
        }

        const answerRows = rows.map((r) => {
          if (!r.q.dbQuestionId?.trim()) {
            throw new Error(`Question ${r.q.questionNumber} is missing a database id.`);
          }
          if (!r.correct?.id) {
            throw new Error(`Question ${r.q.questionNumber} has no scorable correct answer.`);
          }
          return {
            attempt_id: attemptId,
            paper_id: mathsPaperId,
            question_id: r.q.dbQuestionId,
            user_id: user.id,
            question_number: r.q.questionNumber,
            section_key: r.q.sectionKey,
            question_type: r.q.questionType,
            stem_snapshot: r.q.stem,
            correct_option_id: r.correct.id,
            correct_option_label: r.correct.text ?? null,
            selected_option: r.selected,
            selected_option_label: r.selectedChoice?.text ?? null,
            options_snapshot: r.q.options.map((o) => ({ id: o.id, text: o.text, correct: o.correct })),
            is_correct: r.selected ? r.selected === r.correct.id : null,
            answered_at: new Date().toISOString(),
          };
        });

        if (answerRows.length !== mathsQuestions.length) {
          throw new Error("Could not build a full answer set for this paper.");
        }

        const { error: answersError } = await supabase
          .from("live_mock_answers" as never)
          .upsert(answerRows as never, { onConflict: "attempt_id,question_id" });
        if (answersError) throw answersError;

        const { error: attemptError } = await supabase
          .from("live_mock_attempts" as never)
          .update(
            {
              user_email: userEmail,
              status: "submitted",
              submitted_at: new Date().toISOString(),
              duration_seconds: elapsedSeconds,
              question_count: mathsQuestions.length,
              answered_count: answeredCount,
            } as never,
          )
          .eq("id", attemptId);
        if (attemptError) throw attemptError;

        setMathsAttemptStatus("submitted");
        setAwaitingEnglish(true);
        savedOk = true;
      } else if (!user?.id || !mathsPaperId || mathsQuestions.length === 0) {
        throw new Error("Maths paper is not ready to submit.");
      }
    } catch (error) {
      console.error("Maths submit error:", error);
      mathsSubmittedRef.current = false;
      toast.error("Could not save your Maths answers. Please refresh and try again.");
    } finally {
      setSubmittingMaths(false);
      autosaveAttemptIdRef.current = null;
      if (!savedOk) {
        if (secondsLeft <= 0) phaseExpiryHandledRef.current = false;
        return;
      }
      if (resitMode) {
        // Maths-only re-sit: English is already done — show the maths results
        // screen instead of routing back through the break / English paper.
        window.localStorage.removeItem(storageKey);
        setResitMode(false);
        setHasFullyCompleted(true);
        setRemediation(NOT_AFFECTED);
        setPhase("maths_resit_complete");
      } else {
        goToBreak();
      }
    }
  }, [answers, durations.maths, ensureInProgressAttempt, flushAutosave, goToBreak, mathsPaperId, mathsQuestions, resitMode, secondsLeft, storageKey, submittingMaths, user]);

  useEffect(() => {
    if (!phaseEndsAt || !["maths", "break"].includes(phase)) return;
    phaseExpiryHandledRef.current = false;

    const tick = () => {
      const left = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !phaseExpiryHandledRef.current) {
        phaseExpiryHandledRef.current = true;
        if (phase === "maths") void submitMaths();
        else if (phase === "break") launchEnglish();
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [launchEnglish, phase, phaseEndsAt, submitMaths]);

  // If maths auto-submit fails at 0:00 (network blip), retry until it saves or the student submits manually.
  useEffect(() => {
    if (phase !== "maths" || secondsLeft > 0 || resitMode) return;
    const retry = window.setInterval(() => {
      if (!submittingMaths && !mathsSubmittedRef.current) void submitMaths();
    }, 4000);
    return () => window.clearInterval(retry);
  }, [phase, resitMode, secondsLeft, submitMaths, submittingMaths]);

  const eligible = eligibility.registered;
  const paperOrder = phase === "english" ? 2 : 1;
  const currentPaper: MockPaper = phase === "english" ? activeEnglishPaper : activeMathsPaper;
  const subject = phase === "english" ? "English" : "Non-calculator Maths";
  const questionsThisPaper =
    phase === "english"
      ? paperQuestionCount(activeEnglishPaper)
      : mathsQuestions.length || paperQuestionCount(activeMathsPaper);
  const currentSection = sectionForQuestion(currentPaper, currentQuestion);
  const currentMathsQuestion = mathsQuestions.find((q) => q.questionNumber === currentQuestion) || null;
  const questionKey = answerKeyForPhase(phase, currentQuestion);
  const selectedOptionId =
    phase === "english" ? answers[questionKey] ?? null : getMathsSelectedAnswer(answers, currentQuestion);
  const answeredCount = useMemo(() => {
    if (phase === "english") {
      return Object.keys(answers).filter((key) => key.startsWith(`${ENGLISH_ANSWER_PREFIX}-`) && answers[key]).length;
    }
    return countMathsAnswers(answers);
  }, [answers, phase]);

  const mathsInProgress = mathsAttemptStatus === "in_progress" && !hasFullyCompleted && !awaitingEnglish;

  const continueMock = useCallback(async () => {
    mathsSubmittedRef.current = false;
    pendingAutosaveRef.current.clear();
    setResitMode(false);

    let restoredPhase: Phase = "maths";
    let restoredQuestion = 1;
    let restoredAnswers: Record<string, string> = {};
    let restoredFlagged: string[] = [];
    let restoredEndsAt = Date.now() + durations.maths * 1000;

    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as SavedMockState;
        if (saved.phase === "maths" || saved.phase === "break") {
          restoredPhase = saved.phase;
          restoredQuestion = saved.currentQuestion;
          restoredAnswers = migrateSavedAnswers(saved.answers || {});
          restoredFlagged = migrateFlaggedKeys(saved.flagged || []);
          if (saved.phaseEndsAt) restoredEndsAt = saved.phaseEndsAt;
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    if (user?.id && mathsPaperId) {
      const attempt = await fetchLiveMockAttempt(mathsPaperId, user.id);
      if (attempt?.status === "in_progress") {
        autosaveAttemptIdRef.current = attempt.id;
        const dbRows = await loadLiveMockSavedAnswers(attempt.id);
        for (const row of dbRows) {
          if (row.question_number != null && row.selected_option) {
            restoredAnswers[mathsAnswerKey(row.question_number)] = row.selected_option;
          }
        }
      }
    }

    setAnswers(restoredAnswers);
    setFlagged(restoredFlagged);
    setCurrentQuestion(restoredQuestion);
    setPhase(restoredPhase);
    setPhaseEndsAt(restoredEndsAt);
    setStartDialogOpen(false);
    hydratedStorageKeyRef.current = storageKey;
    void ensureInProgressAttempt();
  }, [durations.maths, ensureInProgressAttempt, mathsPaperId, storageKey, user?.id]);

  const startMock = () => {
    if (mathsAttemptStatus === "submitted" && !resitMode) {
      toast.error("You have already submitted the Maths paper.");
      return;
    }
    if (mathsInProgress) {
      void continueMock();
      return;
    }

    mathsSubmittedRef.current = false;
    autosaveAttemptIdRef.current = null;
    pendingAutosaveRef.current.clear();
    setResitMode(false);
    setAnswers({});
    setFlagged([]);
    setCurrentQuestion(1);
    setPhase("maths");
    setPhaseEndsAt(Date.now() + durations.maths * 1000);
    setStartDialogOpen(false);
    hydratedStorageKeyRef.current = storageKey;
    // Create the in_progress attempt up front so the autosave safety net is armed
    // from the very first answer.
    void ensureInProgressAttempt();
  };

  // Maths-only re-sit for an affected user. English is already done, so this runs
  // ONLY the Maths phase and ends on the maths results screen. ensureInProgressAttempt
  // upserts the SAME attempt row (onConflict paper_id,user_id), resetting the blank
  // broken attempt in place — no second attempt row, so cohort counts / rank stay 1:1.
  const startMathsResit = () => {
    setRemediationOpen(false);
    mathsSubmittedRef.current = false;
    autosaveAttemptIdRef.current = null;
    pendingAutosaveRef.current.clear();
    setResitMode(true);
    setAnswers({});
    setFlagged([]);
    setCurrentQuestion(1);
    setPhase("maths");
    setPhaseEndsAt(Date.now() + durations.maths * 1000);
    hydratedStorageKeyRef.current = storageKey;
    void ensureInProgressAttempt();
  };

  const dismissRemediation = () => {
    setRemediationOpen(false);
  };

  const submitCurrentPaper = () => {
    if (phase === "maths") setSubmitConfirmOpen(true);
  };

  const confirmSubmitMaths = () => {
    setSubmitConfirmOpen(false);
    void submitMaths();
  };

  const handleRegister = async () => {
    if (!user?.id || !user.email) {
      toast.error("Please sign in to register for this mock.");
      return;
    }
    if (eligibility.registered) {
      toast.info("You're already registered for this mock.");
      return;
    }
    if (confirmingPayment || isLiveMockCheckoutPending(mockEventSlug)) {
      toast.info("We're confirming your payment. Please wait a moment.");
      return;
    }

    setRegistering(true);
    try {
      const result = await registerForCombinedMock({
        userId: user.id,
        email: user.email,
        hasPaidPremiumLiveMockAccess,
        mockSlug: mockEventSlug,
        returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      });
      if (result === "registered") {
        eligibilityResolvedRef.current = true;
        setEligibility({ loading: false, registered: true, error: null });
        toast.success("You're registered for the mock.");
      }
    } catch (error) {
      if (isLiveMockAlreadyRegisteredError(error)) {
        eligibilityResolvedRef.current = true;
        setEligibility({ loading: false, registered: true, error: null });
        toast.success("You're already registered for this mock.");
        return;
      }
      const message = error instanceof Error ? error.message : "Could not open registration checkout.";
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  const resetPrototype = () => {
    mathsSubmittedRef.current = false;
    window.localStorage.removeItem(storageKey);
    setPhase("instructions");
    setAnswers({});
    setFlagged([]);
    setCurrentQuestion(1);
    setPhaseEndsAt(null);
    setSecondsLeft(durations.maths);
  };

  // Available in local dev, and in production once the mock has gone live.
  if (!import.meta.env.DEV && !checkReleased()) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf9f4] p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-8 w-8 text-orange-600" />
          <h1 className="mt-4 text-xl font-bold">Not open yet</h1>
          <p className="mt-2 text-sm text-slate-600">This mock opens shortly. Please check back in a moment.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf9f4] p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-8 w-8 text-orange-600" />
          <h1 className="mt-4 text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with the account you used to register for this live mock.
          </p>
          <Button asChild className={cn("mt-6", mockPrimaryBtn)}>
            <Link to="/11-plus">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (eligibility.loading && !eligibility.registered && !eligibilityResolvedRef.current) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-3 bg-[#faf9f4]">
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        <span className="text-sm font-semibold text-slate-600">Checking mock registration...</span>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <main className="min-h-screen bg-[#faf9f4] text-slate-950">
        <section className="mx-auto max-w-4xl px-4 py-8">
          <Link to={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div
            className={cn(
              "mt-5 overflow-hidden rounded-[24px] border bg-white",
              isMock2
                ? "border-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
                : "border-orange-200 shadow-[0_20px_60px_rgba(124,45,18,0.08)]",
            )}
          >
            <div
              className={cn(
                "border-b px-6 py-7 text-white sm:px-9",
                isMock2
                  ? "border-slate-600/30 bg-gradient-to-r from-slate-700 to-slate-500"
                  : "border-orange-100 bg-gradient-to-r from-orange-600 to-amber-500",
              )}
            >
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                Live mock exam
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{displayTitle}</h1>
              <p
                className={cn(
                  "mt-2 max-w-2xl text-sm font-medium sm:text-base",
                  isMock2 ? "text-slate-200" : "text-orange-50",
                )}
              >
                Paper order: non-calculator Maths first, then a break, then English. Full marked papers with answers,
                explanations and a results comparison.
                {isMock2
                  ? " Mock 2 is completely separate from mock 1: own registration, questions, score and rank."
                  : " Mock 1 is completely separate from mock 2: own registration, questions, score and rank."}
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-9">
              {[
                {
                  icon: Calculator,
                  title: "1. Maths",
                  detail: `Non-calculator · ${paperQuestionCount(activeMathsPaper)} questions · ${activeMathsPaper.durationMinutes} minutes`,
                },
                { icon: Coffee, title: "2. Break", detail: `${BREAK_MINUTES} minutes · automatic` },
                {
                  icon: BookOpen,
                  title: "3. English",
                  detail: `${paperQuestionCount(activeEnglishPaper)} questions · ${activeEnglishPaper.durationMinutes} minutes`,
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <item.icon className="h-6 w-6 text-orange-600" />
                  <h2 className="mt-4 font-black">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 px-6 py-6 sm:px-9">
              <div className={cn("rounded-xl border p-4", eligibility.registered ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
                <div className="flex items-center gap-2 font-bold">
                  {eligibility.registered ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <LockKeyhole className="h-5 w-5 text-rose-600" />}
                  Mock registration
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {eligibility.registered
                    ? `${user.email} is registered. The mock is live. Start when you are ready.`
                    : "This account is not registered yet. Register below to unlock the mock (free with paid Premium, or one fixed payment)."}
                </p>
              </div>

              {eligibility.error && <p className="mt-4 text-sm font-semibold text-rose-600">{eligibility.error}</p>}

              {!eligibility.registered && (confirmingPayment || isLiveMockCheckoutPending(mockEventSlug)) ? (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    Confirming your payment
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Payment received. We are saving your registration now. The pay button stays locked until this finishes.
                  </p>
                </div>
              ) : null}

              {eligible && hasFullyCompleted ? (
                <div className="mt-6 space-y-3">
                  {remediation.affected ? (
                    <>
                      {/* Persistent redo entry point for affected users — always
                          available on return visits, even if the popup was dismissed. */}
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <div className="flex items-center gap-2 font-bold text-amber-900">
                          <CheckCircle2 className="h-5 w-5 text-amber-600" />
                          Your Maths paper needs redoing
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          A technical fault meant your Maths answers were not saved. Your English paper is safe. Redo Maths now and it will score correctly. Your result updates in place.
                        </p>
                      </div>
                      <Button
                        className={mockPrimaryBtnLg}
                        onClick={startMathsResit}
                      >
                        Restart Maths paper
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 w-full rounded-xl text-base font-bold"
                        onClick={() => navigate(combinedAnalyticsUrl)}
                      >
                        See how you did
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 font-bold text-emerald-800">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          You have completed this mock
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          One attempt per student. See your personalised results and how you compare with everyone else.
                        </p>
                      </div>
                      <Button
                        className={mockPrimaryBtnLg}
                        onClick={() => navigate(combinedAnalyticsUrl)}
                      >
                        See how you did
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ) : eligible && awaitingEnglish ? (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <CheckCircle2 className="h-5 w-5 text-amber-600" />
                      Maths complete. English paper next
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      You finished the Maths paper. Tap below to continue to the English section and complete your mock.
                    </p>
                  </div>
                  <Button
                    className={mockPrimaryBtnLg}
                    onClick={launchEnglish}
                  >
                    Continue to English
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : eligible && mathsInProgress ? (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Clock3 className="h-5 w-5 text-blue-600" />
                      Mock in progress
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      You started this mock already. Continue where you left off. Your answers are saved as you go.
                    </p>
                  </div>
                  <Button
                    className={mockPrimaryBtnLg}
                    disabled={questionsLoading || mathsQuestions.length === 0}
                    onClick={() => void continueMock()}
                  >
                    Continue mock
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : eligible && questionsError ? (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm font-semibold text-rose-700">
                    We could not load the mock questions just now. This is usually a brief connection hiccup.
                  </div>
                  <Button
                    className={mockPrimaryBtnLg}
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : eligible ? (
                <Button
                  className={mockPrimaryBtnLgMt}
                  disabled={questionsLoading || mathsQuestions.length === 0}
                  onClick={() => setStartDialogOpen(true)}
                >
                  {questionsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading questions...
                    </>
                  ) : (
                    <>
                      Start mock (Maths first)
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="mt-6 space-y-3">
                  {isMock2 ? (
                    <>
                      <p className="text-sm leading-6 text-slate-600">
                        Reserve your place on the mock 2 registration page first. Registration, payment and your saved
                        score stay separate from mock 1.
                      </p>
                      <Button asChild className={mockPrimaryBtnLg}>
                        <Link to="/live-mock-exams/local-preview2">
                          Go to mock 2 registration
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm leading-6 text-slate-600">
                        {isTrialing ? (
                          <>
                            Your 3-day Premium trial does not include live mocks. Pay{" "}
                            <span className="font-black text-orange-700">{formatLiveMockPrice(liveMockPriceGbp)}</span> once
                            to register, or upgrade to paid Premium for free access to every mock.
                          </>
                        ) : (
                          <>
                            Register to unlock this mock. Paid Premium members register free. Everyone else pays{" "}
                            <span className="font-black text-orange-700">{formatLiveMockPrice(liveMockPriceGbp)}</span> once.
                          </>
                        )}
                      </p>
                      <Button
                        className={mockPrimaryBtnLg}
                        disabled={registering || confirmingPayment || isLiveMockCheckoutPending(mockEventSlug)}
                        onClick={() => void handleRegister()}
                      >
                        {registering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Opening checkout...
                          </>
                        ) : confirmingPayment || isLiveMockCheckoutPending(mockEventSlug) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Confirming payment...
                          </>
                        ) : hasPaidPremiumLiveMockAccess ? (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Register with Premium
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pay {formatLiveMockPrice(liveMockPriceGbp)} and register
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{mathsInProgress ? "Continue your mock?" : "Start the full mock?"}</DialogTitle>
              <DialogDescription>
                {mathsInProgress
                  ? "Your Maths timer and saved answers will be restored. One attempt per student."
                  : `Non-calculator Maths is paper 1. Your ${fastMode ? "30-second" : "50-minute"} timer begins immediately after you confirm.`}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Prepare paper, a pencil and a quiet workspace before starting.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStartDialogOpen(false)}>Not yet</Button>
              <Button className={mockPrimaryBtn} onClick={startMock}>
                {mathsInProgress ? "Continue Maths" : "Begin Maths"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/*
          Post-English apology + maths re-sit popup. Mounted ONLY when the DB check
          has verified this user is in the affected cohort. Re-opens on every visit
          to this tab until they submit a corrected Maths re-sit.
        */}
        {remediation.affected && (
          <Dialog
            open={remediationOpen}
            onOpenChange={(open) => {
              if (open) setRemediationOpen(true);
              else dismissRemediation();
            }}
          >
            <DialogContent className="rounded-2xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{REMEDIATION_POPUP_COPY.title}</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-slate-600">
                  {REMEDIATION_POPUP_COPY.body}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
                {REMEDIATION_POPUP_COPY.reassurance}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={dismissRemediation}>
                  {REMEDIATION_POPUP_COPY.dismissButton}
                </Button>
                <Button className={mockPrimaryBtn} onClick={startMathsResit}>
                  {REMEDIATION_POPUP_COPY.restartButton}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    );
  }

  if (phase === "break") {
    return (
      <main className="min-h-screen bg-[#faf9f4] text-slate-950">
        <section className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-[24px] border border-amber-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(124,45,18,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Coffee className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-amber-700">Maths submitted · paper 1 complete</p>
          <h1 className="mt-2 text-3xl font-black">{BREAK_MINUTES}-minute break</h1>
          <div className="mt-6 font-mono text-5xl font-black tabular-nums text-slate-950">{formatTime(secondsLeft)}</div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            English (paper 2) opens automatically when the break ends.
          </p>
          <Button className={cn("mt-6", mockPrimaryBtn)} onClick={launchEnglish}>
            Start English paper now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    const mathsAnswered = countMathsAnswers(answers);
    const englishAnswered = Object.keys(answers).filter((key) => key.startsWith("english")).length;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f4] p-6">
        <section className="w-full max-w-xl rounded-[24px] border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-5 text-3xl font-black">Mock complete</h1>
          <p className="mt-2 text-sm text-slate-500">Both papers submitted. See your marks, explanations and how you compare.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4"><strong>{mathsAnswered}/{paperQuestionCount(activeMathsPaper)}</strong><p className="text-xs text-slate-500">Maths answered</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><strong>{englishAnswered}/{paperQuestionCount(activeEnglishPaper)}</strong><p className="text-xs text-slate-500">English answered</p></div>
          </div>
          <Button className={cn("mt-6 w-full", mockPrimaryBtn)} onClick={() => navigate(combinedAnalyticsUrl)}>
            See how you did
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {import.meta.env.DEV && (
            <Button variant="outline" className="mt-3 w-full" onClick={resetPrototype}>
              Reset (dev only)
            </Button>
          )}
        </section>
      </main>
    );
  }

  if (phase === "maths_resit_complete") {
    const mathsAnswered = countMathsAnswers(answers);
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f4] p-6">
        <section className="w-full max-w-xl rounded-[24px] border border-emerald-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(124,45,18,0.08)]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-5 text-3xl font-black">Maths paper re-submitted</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Thanks for redoing it. Your Maths answers are saved and scored correctly this time, and your
            English result is unchanged.
          </p>
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <strong>
              {mathsAnswered}/{paperQuestionCount(activeMathsPaper)}
            </strong>
            <p className="text-xs text-slate-500">Maths answered</p>
          </div>
          <Button
            className={cn("mt-6 w-full", mockPrimaryBtn)}
            onClick={() => navigate(mathsAnalyticsUrl)}
          >
            See your Maths results
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f5f0] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">
              Paper {paperOrder} of 2 · {phase === "maths" ? "Non-calculator Maths first" : "English second"}
            </p>
            <h1 className="truncate text-base font-black sm:text-lg">{subject} paper</h1>
          </div>
          <div className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 font-mono text-base font-black sm:px-4 sm:text-lg", secondsLeft < 300 ? "bg-rose-50 text-rose-700" : "bg-slate-950 text-white")}>
            <Clock3 className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-3 sm:gap-5 sm:p-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,250px)]">
        <aside className="order-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:order-1">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Progress</span>
            <span>{answeredCount}/{questionsThisPaper}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-orange-500" style={{ width: `${(answeredCount / questionsThisPaper) * 100}%` }} />
          </div>
          <div className="mt-4 grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto sm:mt-5 sm:max-h-none sm:grid-cols-5 sm:gap-2 lg:max-h-[420px]">
            {Array.from({ length: questionsThisPaper }, (_, index) => index + 1).map((number) => {
              const key = answerKeyForPhase(phase, number);
              const answered =
                phase === "english" ? Boolean(answers[key]) : hasMathsAnswer(answers, number);
              return (
                <button
                  key={number}
                  onClick={() => setCurrentQuestion(number)}
                  className={cn(
                    "h-7 rounded-md text-[11px] font-bold transition sm:h-8 sm:text-xs",
                    currentQuestion === number && "bg-slate-950 text-white",
                    currentQuestion !== number && answered && "bg-emerald-100 text-emerald-800",
                    currentQuestion !== number && !answered && "bg-slate-100 text-slate-500 hover:bg-orange-100",
                  )}
                >
                  {number}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="order-1 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-2 lg:p-9">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-700 sm:text-xs">
              Question {currentQuestion} of {questionsThisPaper}
              {currentSection ? ` · ${currentSection.title}` : ""}
            </span>
            <button
              onClick={() => setFlagged((current) => current.includes(questionKey) ? current.filter((key) => key !== questionKey) : [...current, questionKey])}
              className={cn("inline-flex items-center gap-2 text-xs font-bold", flagged.includes(questionKey) ? "text-orange-600" : "text-slate-400")}
            >
              <Flag className="h-4 w-4" />
              {flagged.includes(questionKey) ? "Flagged" : "Flag"}
            </button>
          </div>

          {questionsLoading ? (
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
              <span className="text-sm font-semibold">Loading questions...</span>
            </div>
          ) : currentMathsQuestion ? (
            <>
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">
                  Question {currentQuestion}
                </p>
                <h2 className="mt-3 whitespace-pre-line text-lg font-bold leading-8 text-slate-900 sm:text-xl">
                  {currentMathsQuestion.stem}
                </h2>
                <p className="mt-3 text-xs font-semibold text-slate-400">
                  Non-calculator. Work it out on paper, then choose one answer.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {currentMathsQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setAnswers((current) => ({ ...current, [questionKey]: option.id }));
                      // Autosave safety net: queue this answer for a debounced DB write.
                      if (phase === "maths" && user?.id) {
                        pendingAutosaveRef.current.set(currentQuestion, option.id);
                        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                        autosaveTimerRef.current = setTimeout(() => {
                          void flushAutosave();
                        }, 500);
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition",
                      selectedOptionId === option.id
                        ? "border-orange-500 bg-orange-50 shadow-[0_0_0_2px_rgba(249,115,22,0.12)]"
                        : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/40",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-black", selectedOptionId === option.id ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 bg-white")}>
                      {selectedOptionId === option.id ? <Check className="h-4 w-4" /> : option.id}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{option.text}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-sm font-semibold text-rose-700">
              Question {currentQuestion} could not be loaded. Refresh the page to try again.
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" className="w-full sm:w-auto" disabled={currentQuestion === 1} onClick={() => setCurrentQuestion((value) => Math.max(1, value - 1))}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {currentQuestion === questionsThisPaper ? (
              <Button
                className={cn("w-full sm:w-auto", mockPrimaryBtn)}
                disabled={submittingMaths}
                onClick={() => setSubmitConfirmOpen(true)}
              >
                {submittingMaths ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit mock"
                )}
              </Button>
            ) : (
              <Button className={cn("w-full sm:w-auto", mockPrimaryBtn)} onClick={() => setCurrentQuestion((value) => Math.min(questionsThisPaper, value + 1))}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </section>

        <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit your Maths paper?</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit your Maths paper? You cannot change your answers after this.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitConfirmOpen(false)}>
                Keep working
              </Button>
              <Button className={mockPrimaryBtn} disabled={submittingMaths} onClick={confirmSubmitMaths}>
                {submittingMaths ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Maths paper"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <aside className="order-3 h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:order-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h2 className="mt-3 font-black">Exam conditions active</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your answers are saved to your results when you submit Maths.
          </p>
          <div className="mt-5 space-y-3 text-xs font-semibold text-slate-500">
            <div className="flex justify-between"><span>Answered</span><span>{answeredCount}/{questionsThisPaper}</span></div>
            <div className="flex justify-between"><span>Flagged</span><span>{flagged.filter((key) => key.startsWith(subject.toLowerCase())).length}</span></div>
            <div className="flex justify-between"><span>Remaining</span><span>{formatTime(secondsLeft)}</span></div>
          </div>
          <Button
            variant="outline"
            className="mt-5 w-full border-orange-200 text-orange-700 hover:bg-orange-50"
            disabled={submittingMaths}
            onClick={submitCurrentPaper}
          >
            {submittingMaths ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Maths...
              </>
            ) : (
              "Submit Maths · start break"
            )}
          </Button>
        </aside>
      </div>
    </main>
  );
}
