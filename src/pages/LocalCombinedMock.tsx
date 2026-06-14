import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { useAppContext } from "@/hooks/useAppContext";
import { useMembership } from "@/hooks/useMembership";
import { cn } from "@/lib/utils";
import { formatLiveMockPrice, LIVE_MOCK_STANDARD_PRICE_GBP } from "@/lib/liveMockPricing";
import { fetchCombinedMockSignup, registerForCombinedMock } from "@/lib/liveMockRegistration";
import {
  BREAK_MINUTES,
  BREAK_SECONDS,
  COMBINED_MOCK_EVENT_SLUG,
  ENGLISH_PAPER,
  isCombinedMockReleased,
  MATHS_PAPER,
  type MockPaper,
  paperQuestionCount,
  paperSeconds,
  sectionForQuestion,
} from "@/lib/liveMockCombinedConfig";

const MOCK_SLUG = COMBINED_MOCK_EVENT_SLUG;
const MATHS_SECONDS = paperSeconds(MATHS_PAPER);
const ENGLISH_SECONDS = paperSeconds(ENGLISH_PAPER);
/** Short timers for localhost flow testing (?fast=1). Order stays maths → break → english. */
const FAST_MATHS_SECONDS = 30;
const FAST_BREAK_SECONDS = 10;
const FAST_ENGLISH_SECONDS = 30;

type Phase = "instructions" | "maths" | "break" | "english" | "complete";
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

/**
 * The English paper reuses the EXACT app split-view (EnglishSplitViewDemo) via
 * the live-mock session route, pointed at the seeded `both_subjects_english`
 * paper: left = comprehension passage, right = questions, with the same SPaG
 * styling. Maths/break run in this prototype; English hands off to that page.
 */
const ENGLISH_SESSION_URL = `/live-mock-exams/session?${new URLSearchParams({
  track: "11plus",
  subject: "english",
  topics: "Comprehension,SPaG",
  mode: "mock-exam",
  questions: String(paperQuestionCount(ENGLISH_PAPER)),
  duration: String(ENGLISH_PAPER.durationMinutes),
  liveMockSlug: ENGLISH_PAPER.slug,
}).toString()}`;

export default function LocalCombinedMock() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const membership = useMembership();
  const isPremium = membership.isPremium;
  const [searchParams] = useSearchParams();
  const fastMode = searchParams.get("fast") === "1" && import.meta.env.DEV;
  // `?dev=1` skips the registration/payment check, so it must never work in production.
  const devBypass = searchParams.get("dev") === "1" && import.meta.env.DEV;
  const storageKey = user ? `gradlify_local_combined_mock_${user.id}` : "gradlify_local_combined_mock_anon";
  const [registering, setRegistering] = useState(false);
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
  const [hasCompleted, setHasCompleted] = useState(false);
  const combinedAnalyticsUrl = "/live-mock-exams/analytics?combined=1&subject=english";
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

  const checkEligibility = useCallback(async () => {
    if (!user) {
      setEligibility({ loading: false, registered: false, error: null });
      return;
    }
    if (devBypass) {
      setEligibility({ loading: false, registered: true, error: null });
      return;
    }
    setEligibility((current) => ({ ...current, loading: true, error: null }));
    const signupResult = await supabase
      .from("live_mock_exam_signups" as never)
      .select("id")
      .eq("mock_slug", MOCK_SLUG)
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

    setEligibility({
      loading: false,
      registered: Boolean(signupResult.data),
      error: null,
    });
  }, [devBypass, user]);

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
        .eq("slug", MATHS_PAPER.slug)
        .maybeSingle();
      if (paperError) throw paperError;
      const pid = (paper as { id?: string } | null)?.id ?? null;
      if (!pid) throw new Error("Maths paper not found");

      const [{ data: sections, error: sectionsError }, { data: questions, error: questionsError }] =
        await Promise.all([
          supabase.from("live_mock_sections" as never).select("id, section_key").eq("paper_id", pid),
          supabase
            .from("live_mock_questions" as never)
            .select("id, section_id, question_number, question_type, stem, options")
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
        options: (Array.isArray(q.options) ? (q.options as Record<string, unknown>[]) : []).map((o) => ({
          id: String(o.id),
          text: String(o.text),
          correct: Boolean(o.correct),
        })),
      }));
      if (mapped.length === 0) throw new Error("Maths paper returned no questions");
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
  }, [reloadKey]);

  // One attempt only: a submitted attempt on EITHER combined paper (Maths or
  // English) counts as having used your single sitting, so the entry screen
  // shows results instead of letting anyone restart and overwrite a score.
  useEffect(() => {
    if (!user?.id) {
      setHasCompleted(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: papers } = await supabase
        .from("live_mock_papers" as never)
        .select("id")
        .in("slug", [MATHS_PAPER.slug, ENGLISH_PAPER.slug]);
      const paperIds = ((papers as { id: string }[] | null) || []).map((p) => p.id);
      if (paperIds.length === 0 || cancelled) return;
      const { data: attempt } = await supabase
        .from("live_mock_attempts" as never)
        .select("id")
        .in("paper_id", paperIds)
        .eq("user_id", user.id)
        .eq("status", "submitted")
        .limit(1)
        .maybeSingle();
      if (!cancelled) setHasCompleted(Boolean(attempt));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    void supabase.functions
      .invoke("live-mock-signup-count", { body: { mockSlug: MOCK_SLUG } })
      .then(({ data }) => {
        if (typeof data?.currentPriceGbp === "number") {
          setLiveMockPriceGbp(data.currentPriceGbp);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!user?.id || devBypass || eligibility.registered) return;
    if (searchParams.get("upgraded") !== "true") return;

    let cancelled = false;
    let attempt = 0;

    const pollSignup = async () => {
      attempt += 1;
      try {
        const row = await fetchCombinedMockSignup(user.id);
        if (cancelled) return;
        if (row) {
          setEligibility({ loading: false, registered: true, error: null });
          toast.success("You're registered for the mock.");
          window.history.replaceState({}, "", window.location.pathname + window.location.search.replace(/[?&]upgraded=true/, ""));
          return;
        }
      } catch {
        // keep polling
      }
      if (attempt < 12 && !cancelled) {
        window.setTimeout(pollSignup, 1000);
      }
    };

    void pollSignup();
    return () => {
      cancelled = true;
    };
  }, [devBypass, eligibility.registered, searchParams, user?.id]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as SavedMockState;
      // English is handed off to the real split-view page; never resume into it here.
      if (saved.phase === "english" || saved.phase === "complete") {
        window.localStorage.removeItem(storageKey);
        return;
      }
      setPhase(saved.phase);
      setCurrentQuestion(saved.currentQuestion);
      setAnswers(saved.answers || {});
      setFlagged(saved.flagged || []);
      setPhaseEndsAt(saved.phaseEndsAt);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    const saved: SavedMockState = { phase, currentQuestion, answers, flagged, phaseEndsAt };
    window.localStorage.setItem(storageKey, JSON.stringify(saved));
  }, [answers, currentQuestion, flagged, phase, phaseEndsAt, storageKey]);

  const launchEnglish = useCallback(() => {
    // Hand off to the real split-view English paper (same code as the app).
    window.localStorage.removeItem(storageKey);
    navigate(ENGLISH_SESSION_URL);
  }, [navigate, storageKey]);

  const goToBreak = useCallback(() => {
    setPhase("break");
    setCurrentQuestion(1);
    setPhaseEndsAt(Date.now() + durations.break * 1000);
  }, [durations.break]);

  // Submit Maths (paper 1) to Supabase so the combined analytics Maths tab shows
  // the real score, placement and per-question review, then move to the break.
  const submitMaths = useCallback(async () => {
    if (mathsSubmittedRef.current || submittingMaths) return;
    mathsSubmittedRef.current = true;
    setSubmittingMaths(true);
    try {
      if (user?.id && mathsPaperId && mathsQuestions.length > 0) {
        const userEmail =
          typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;
        const allocated = durations.maths;
        const elapsedSeconds = Math.max(0, allocated - secondsLeft);

        const rows = mathsQuestions.map((q) => {
          const selected = answers[`maths-${q.questionNumber}`] || null;
          const correct = q.options.find((o) => o.correct);
          const selectedChoice = selected ? q.options.find((o) => o.id === selected) : undefined;
          return { q, selected, correct, selectedChoice };
        });
        const answeredCount = rows.filter((r) => r.selected).length;

        const { data: attempt, error: attemptError } = await supabase
          .from("live_mock_attempts" as never)
          .upsert(
            {
              paper_id: mathsPaperId,
              user_id: user.id,
              user_email: userEmail,
              status: "submitted",
              submitted_at: new Date().toISOString(),
              duration_seconds: elapsedSeconds,
              question_count: mathsQuestions.length,
              answered_count: answeredCount,
            } as never,
            { onConflict: "paper_id,user_id" },
          )
          .select("id")
          .single();

        if (attemptError) throw attemptError;
        const attemptId = (attempt as { id: string }).id;

        const answerRows = rows.map((r) => ({
          attempt_id: attemptId,
          paper_id: mathsPaperId,
          question_id: r.q.dbQuestionId,
          user_id: user.id,
          question_number: r.q.questionNumber,
          section_key: r.q.sectionKey,
          question_type: r.q.questionType,
          stem_snapshot: r.q.stem,
          correct_option_id: r.correct?.id ?? null,
          correct_option_label: r.correct?.text ?? null,
          selected_option: r.selected,
          selected_option_label: r.selectedChoice?.text ?? null,
          options_snapshot: r.q.options.map((o) => ({ id: o.id, text: o.text, correct: o.correct })),
          is_correct: r.selected ? Boolean(r.correct && r.selected === r.correct.id) : null,
          answered_at: new Date().toISOString(),
        }));

        const { error: answersError } = await supabase
          .from("live_mock_answers" as never)
          .upsert(answerRows as never, { onConflict: "attempt_id,question_id" });
        if (answersError) throw answersError;
      }
    } catch (error) {
      console.error("Maths submit error:", error);
      mathsSubmittedRef.current = false;
      toast.error("Could not save your Maths answers. You can still continue to the break.");
    } finally {
      setSubmittingMaths(false);
      goToBreak();
    }
  }, [answers, durations.maths, goToBreak, mathsPaperId, mathsQuestions, secondsLeft, submittingMaths, user]);

  useEffect(() => {
    if (!phaseEndsAt || !["maths", "break"].includes(phase)) return;

    let expiredHandled = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !expiredHandled) {
        expiredHandled = true;
        if (phase === "maths") void submitMaths();
        else if (phase === "break") launchEnglish();
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [launchEnglish, phase, phaseEndsAt, submitMaths]);

  const eligible = eligibility.registered;
  const paperOrder = phase === "english" ? 2 : 1;
  const currentPaper: MockPaper = phase === "english" ? ENGLISH_PAPER : MATHS_PAPER;
  const subject = phase === "english" ? "English" : "Non-calculator Maths";
  const questionsThisPaper =
    phase === "english"
      ? paperQuestionCount(ENGLISH_PAPER)
      : mathsQuestions.length || paperQuestionCount(MATHS_PAPER);
  const currentSection = sectionForQuestion(currentPaper, currentQuestion);
  const currentMathsQuestion = mathsQuestions.find((q) => q.questionNumber === currentQuestion) || null;
  const questionKey = `${subject.toLowerCase()}-${currentQuestion}`;
  const answeredCount = useMemo(
    () => Object.keys(answers).filter((key) => key.startsWith(subject.toLowerCase())).length,
    [answers, subject],
  );

  const startMock = () => {
    mathsSubmittedRef.current = false;
    setAnswers({});
    setFlagged([]);
    setCurrentQuestion(1);
    setPhase("maths");
    setPhaseEndsAt(Date.now() + durations.maths * 1000);
    setStartDialogOpen(false);
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

    setRegistering(true);
    try {
      const result = await registerForCombinedMock({
        userId: user.id,
        email: user.email,
        isPremium,
        returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      });
      if (result === "registered") {
        setEligibility({ loading: false, registered: true, error: null });
        toast.success("You're registered for the mock.");
      }
    } catch (error) {
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

  const devBanner = (fastMode || devBypass) ? (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-950">
      Localhost only
      {fastMode ? " · fast timers (30s maths / 10s break / 30s english)" : ""}
      {devBypass ? " · registration check bypassed" : ""}
    </div>
  ) : null;

  // Available in local dev, and in production once the mock has gone live.
  if (!import.meta.env.DEV && !isCombinedMockReleased()) {
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
          <p className="mt-2 text-sm text-slate-600">Sign in with a registered mock account to use the local prototype.</p>
          <Button asChild className="mt-6 bg-orange-600 text-white hover:bg-orange-700">
            <Link to="/11-plus">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (eligibility.loading) {
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
        {devBanner}
        <section className="mx-auto max-w-4xl px-4 py-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            Back to live mocks
          </Link>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-orange-200 bg-white shadow-[0_20px_60px_rgba(124,45,18,0.08)]">
            <div className="border-b border-orange-100 bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-7 text-white sm:px-9">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                Local mock prototype
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">11+ Maths &amp; English Mock</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-orange-50 sm:text-base">
                Paper order: non-calculator Maths first, then a break, then English. Full marked papers with answers,
                explanations and a results comparison.
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-9">
              {[
                {
                  icon: Calculator,
                  title: "1. Maths",
                  detail: `Non-calculator · ${paperQuestionCount(MATHS_PAPER)} questions · ${MATHS_PAPER.durationMinutes} minutes`,
                },
                { icon: Coffee, title: "2. Break", detail: `${BREAK_MINUTES} minutes · automatic` },
                {
                  icon: BookOpen,
                  title: "3. English",
                  detail: `${paperQuestionCount(ENGLISH_PAPER)} questions · ${ENGLISH_PAPER.durationMinutes} minutes`,
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
                    ? `${user.email} is registered for this mock.`
                    : "This account is not registered for the mock yet. Register on the live mocks page (Premium or fixed-price) to unlock it."}
                </p>
              </div>

              {eligibility.error && <p className="mt-4 text-sm font-semibold text-rose-600">{eligibility.error}</p>}

              {eligible && hasCompleted ? (
                <div className="mt-6 space-y-3">
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
                    className="h-12 w-full rounded-xl bg-orange-600 text-base font-bold text-white hover:bg-orange-700"
                    onClick={() => navigate(combinedAnalyticsUrl)}
                  >
                    See how you did
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : eligible && questionsError ? (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm font-semibold text-rose-700">
                    We could not load the mock questions just now. This is usually a brief connection hiccup.
                  </div>
                  <Button
                    className="h-12 w-full rounded-xl bg-orange-600 text-base font-bold text-white hover:bg-orange-700"
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : eligible ? (
                <Button
                  className="mt-6 h-12 w-full rounded-xl bg-orange-600 text-base font-bold text-white hover:bg-orange-700"
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
                  <p className="text-sm leading-6 text-slate-600">
                    Register to unlock this mock. Premium members (including trials) register free. Everyone else pays{" "}
                    <span className="font-black text-orange-700">{formatLiveMockPrice(liveMockPriceGbp)}</span> once.
                  </p>
                  <Button
                    className="h-12 w-full rounded-xl bg-orange-600 text-base font-bold text-white hover:bg-orange-700"
                    disabled={registering}
                    onClick={() => void handleRegister()}
                  >
                    {registering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening checkout...
                      </>
                    ) : isPremium ? (
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
                  <Button asChild variant="outline" className="h-11 w-full rounded-xl">
                    <Link to="/live-mock-exams/details">View mock details</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start the full mock?</DialogTitle>
              <DialogDescription>
                Non-calculator Maths is paper 1. Your {fastMode ? "30-second" : "50-minute"} timer begins immediately
                after you confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Prepare paper, a pencil and a quiet workspace before starting.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStartDialogOpen(false)}>Not yet</Button>
              <Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={startMock}>Begin Maths</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );
  }

  if (phase === "break") {
    return (
      <main className="min-h-screen bg-[#faf9f4] text-slate-950">
        {devBanner}
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
          <Button className="mt-6 bg-orange-600 text-white hover:bg-orange-700" onClick={launchEnglish}>
            Start English paper now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    const mathsAnswered = Object.keys(answers).filter((key) => key.startsWith("maths")).length;
    const englishAnswered = Object.keys(answers).filter((key) => key.startsWith("english")).length;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f4] p-6">
        <section className="w-full max-w-xl rounded-[24px] border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-5 text-3xl font-black">Mock complete</h1>
          <p className="mt-2 text-sm text-slate-500">Both papers submitted. See your marks, explanations and how you compare.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4"><strong>{mathsAnswered}/{paperQuestionCount(MATHS_PAPER)}</strong><p className="text-xs text-slate-500">Maths answered</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><strong>{englishAnswered}/{paperQuestionCount(ENGLISH_PAPER)}</strong><p className="text-xs text-slate-500">English answered</p></div>
          </div>
          <Button className="mt-6 w-full bg-orange-600 text-white hover:bg-orange-700" onClick={() => navigate(combinedAnalyticsUrl)}>
            See how you did
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" className="mt-3 w-full" onClick={resetPrototype}>
            Reset local prototype
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f5f0] text-slate-950">
      {devBanner}
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
              const key = `${subject.toLowerCase()}-${number}`;
              return (
                <button
                  key={number}
                  onClick={() => setCurrentQuestion(number)}
                  className={cn(
                    "h-7 rounded-md text-[11px] font-bold transition sm:h-8 sm:text-xs",
                    currentQuestion === number && "bg-slate-950 text-white",
                    currentQuestion !== number && answers[key] && "bg-emerald-100 text-emerald-800",
                    currentQuestion !== number && !answers[key] && "bg-slate-100 text-slate-500 hover:bg-orange-100",
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
                    onClick={() => setAnswers((current) => ({ ...current, [questionKey]: option.id }))}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition",
                      answers[questionKey] === option.id
                        ? "border-orange-500 bg-orange-50 shadow-[0_0_0_2px_rgba(249,115,22,0.12)]"
                        : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/40",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-black", answers[questionKey] === option.id ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 bg-white")}>
                      {answers[questionKey] === option.id ? <Check className="h-4 w-4" /> : option.id}
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
                className="w-full bg-orange-600 text-white hover:bg-orange-700 sm:w-auto"
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
              <Button className="w-full bg-orange-600 text-white hover:bg-orange-700 sm:w-auto" onClick={() => setCurrentQuestion((value) => Math.min(questionsThisPaper, value + 1))}>
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
              <Button className="bg-orange-600 text-white hover:bg-orange-700" disabled={submittingMaths} onClick={confirmSubmitMaths}>
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
