import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Hourglass,
  Loader2,
  ShieldCheck,
  ClipboardCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PremiumUpgradeButton } from "@/components/PremiumUpgradeButton";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { useMembership } from "@/hooks/useMembership";
import { getDataFastIds } from "@/lib/datafast";
import {
  formatLiveMockPrice,
  LIVE_MOCK_MIN_DISPLAYED_SIGNUPS,
  LIVE_MOCK_PROMO_CODE,
  LIVE_MOCK_PROMO_SPOTS_REMAINING,
  LIVE_MOCK_STANDARD_PRICE_GBP,
} from "@/lib/liveMockPricing";
import { COMBINED_MOCK_DISPLAY_TITLE, isCombinedMockReleased } from "@/lib/liveMockCombinedConfig";

// Toggle to re-enable the old English-only live mock (9 May 2026). Set to true to show it again.
const SHOW_ENGLISH_LIVE_MOCK = false;

const LIVE_MOCK = {
  slug: "live-11plus-english-mock-2026-05-09-1700",
  startsAtIso: "2026-05-09T16:00:00.000Z",
  displayDate: "Saturday 9 May 2026",
  displayTime: "5:00 PM BST",
  durationMinutes: 50,
  questions: 70,
};

const BOTH_SUBJECTS_LIVE_MOCK = {
  slug: "both_subjects_live_mock",
  title: COMBINED_MOCK_DISPLAY_TITLE,
};

const MIN_DISPLAYED_BOTH_SUBJECTS_SIGNUPS = LIVE_MOCK_MIN_DISPLAYED_SIGNUPS;

type SignupRow = {
  id: string;
  registered_at: string;
};

type LiveMockAttemptStatus = "none" | "in_progress" | "submitted";

function buildLiveMockSessionSearchParams(): URLSearchParams {
  return new URLSearchParams({
    track: "11plus",
    subject: "english",
    topics: "Comprehension,SPaG",
    mode: "mock-exam",
    questions: String(LIVE_MOCK.questions),
    duration: String(LIVE_MOCK.durationMinutes),
    liveMockSlug: LIVE_MOCK.slug,
  });
}

export default function LiveMockExams() {
  const navigate = useNavigate();
  const combinedMockLive = isCombinedMockReleased();
  const { user } = useAppContext();
  const membership = useMembership();
  const { isPremium } = membership;
  const isTrialingPremium = membership.data?.subscription_status === "trialing";
  const hasPremiumLiveMockAccess = isPremium && !isTrialingPremium;
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [registeringBothSubjects, setRegisteringBothSubjects] = useState(false);
  const [finalizingBothSubjectsPayment, setFinalizingBothSubjectsPayment] = useState(false);
  const [signup, setSignup] = useState<SignupRow | null>(null);
  const [bothSubjectsSignup, setBothSubjectsSignup] = useState<SignupRow | null>(null);
  const [bothSubjectsSignupCount, setBothSubjectsSignupCount] = useState(MIN_DISPLAYED_BOTH_SUBJECTS_SIGNUPS);
  const [promoSpotsRemaining, setPromoSpotsRemaining] = useState(LIVE_MOCK_PROMO_SPOTS_REMAINING);
  const [liveMockPriceGbp, setLiveMockPriceGbp] = useState(LIVE_MOCK_STANDARD_PRICE_GBP);
  /** Locks "Start" once an attempt row exists (created on first Start click). */
  const [attemptStatus, setAttemptStatus] = useState<LiveMockAttemptStatus>("none");

  const loadBothSubjectsSignupCount = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("live-mock-signup-count", {
        body: { mockSlug: BOTH_SUBJECTS_LIVE_MOCK.slug },
      });
      if (error) throw error;

      const count = typeof data?.count === "number" ? data.count : 0;
      const displayedCount =
        typeof data?.displayedCount === "number"
          ? data.displayedCount
          : Math.max(MIN_DISPLAYED_BOTH_SUBJECTS_SIGNUPS, count);
      setBothSubjectsSignupCount(displayedCount);
      setLiveMockPriceGbp(
        typeof data?.currentPriceGbp === "number" ? data.currentPriceGbp : LIVE_MOCK_STANDARD_PRICE_GBP,
      );
      setPromoSpotsRemaining(
        typeof data?.promoSpotsRemaining === "number" ? data.promoSpotsRemaining : LIVE_MOCK_PROMO_SPOTS_REMAINING,
      );
    } catch (error) {
      console.error("Failed to load live mock signup count", error);
      setBothSubjectsSignupCount((count) => Math.max(MIN_DISPLAYED_BOTH_SUBJECTS_SIGNUPS, count));
    }
  }, []);

  const loadSignupAndAttempt = useCallback(async () => {
    if (!user?.id) {
      setAttemptStatus("none");
      setSignup(null);
      setBothSubjectsSignup(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: paper }, signupResult, bothSubjectsSignupResult] = await Promise.all([
      supabase.from("live_mock_papers" as never).select("id").eq("slug", LIVE_MOCK.slug).maybeSingle(),
      supabase
        .from("live_mock_exam_signups" as never)
        .select("id, registered_at")
        .eq("user_id", user.id)
        .eq("mock_slug", LIVE_MOCK.slug)
        .maybeSingle(),
      supabase
        .from("live_mock_exam_signups" as never)
        .select("id, registered_at")
        .eq("user_id", user.id)
        .eq("mock_slug", BOTH_SUBJECTS_LIVE_MOCK.slug)
        .maybeSingle(),
    ]);

    const paperId = (paper as { id?: string } | null)?.id;
    if (paperId) {
      const { data: attempt } = await supabase
        .from("live_mock_attempts" as never)
        .select("status")
        .eq("paper_id", paperId)
        .eq("user_id", user.id)
        .maybeSingle();
      const status = (attempt as { status?: string } | null)?.status;
      if (status === "submitted") setAttemptStatus("submitted");
      else if (status === "in_progress") setAttemptStatus("in_progress");
      else setAttemptStatus("none");
    } else {
      setAttemptStatus("none");
    }

    if (signupResult.error) {
      console.error("Failed to load live mock signup", signupResult.error);
    } else {
      setSignup((signupResult.data as SignupRow | null) ?? null);
    }

    if (bothSubjectsSignupResult.error) {
      console.error("Failed to load both-subjects live mock signup", bothSubjectsSignupResult.error);
    } else {
      setBothSubjectsSignup((bothSubjectsSignupResult.data as SignupRow | null) ?? null);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadSignupAndAttempt();
  }, [loadSignupAndAttempt]);

  useEffect(() => {
    void loadBothSubjectsSignupCount();
    const interval = window.setInterval(() => {
      void loadBothSubjectsSignupCount();
    }, 45000);
    return () => window.clearInterval(interval);
  }, [loadBothSubjectsSignupCount]);

  useEffect(() => {
    if (!user?.id || bothSubjectsSignup) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "true") return;

    let cancelled = false;
    let attempt = 0;
    setFinalizingBothSubjectsPayment(true);

    const pollSignup = async () => {
      attempt += 1;
      const { data, error } = await supabase
        .from("live_mock_exam_signups" as never)
        .select("id, registered_at")
        .eq("user_id", user.id)
        .eq("mock_slug", BOTH_SUBJECTS_LIVE_MOCK.slug)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setBothSubjectsSignup(data as SignupRow);
        setFinalizingBothSubjectsPayment(false);
        void loadBothSubjectsSignupCount();
        toast.success(`You're registered for ${COMBINED_MOCK_DISPLAY_TITLE}.`);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      if (attempt < 12) {
        window.setTimeout(pollSignup, 1000);
        return;
      }

      setFinalizingBothSubjectsPayment(false);
      void loadSignupAndAttempt();
    };

    void pollSignup();

    return () => {
      cancelled = true;
    };
  }, [bothSubjectsSignup, loadBothSubjectsSignupCount, loadSignupAndAttempt, user?.id]);

  /** After submitting in another tab or returning from the session, pick up status === submitted. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && user?.id) void loadSignupAndAttempt();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadSignupAndAttempt, user?.id]);

  const navigateToSession = () => {
    navigate(`/live-mock-exams/session?${buildLiveMockSessionSearchParams().toString()}`);
  };

  const recordSignupIfNeeded = async () => {
    const email = user?.email?.trim().toLowerCase();
    if (!email || !user?.id) return;
    const { data, error } = await supabase
      .from("live_mock_exam_signups" as never)
      .upsert(
        {
          user_id: user.id,
          email,
          mock_slug: LIVE_MOCK.slug,
          mock_starts_at: LIVE_MOCK.startsAtIso,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mock_slug,user_id" },
      )
      .select("id, registered_at")
      .single();

    if (error) {
      console.error("Failed to record live mock signup", error);
    } else {
      setSignup(data as SignupRow);
    }
  };

  const recordBothSubjectsSignup = async () => {
    const email = user?.email?.trim().toLowerCase();
    if (!email || !user?.id) {
      throw new Error("Please sign in before registering.");
    }

    const { data, error } = await supabase
      .from("live_mock_exam_signups" as never)
      .upsert(
        {
          user_id: user.id,
          email,
          mock_slug: BOTH_SUBJECTS_LIVE_MOCK.slug,
          mock_starts_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mock_slug,user_id" },
      )
      .select("id, registered_at")
      .single();

    if (error) {
      console.error("Failed to record both-subjects live mock signup", error);
      throw new Error("Could not record your registration. Please try again.");
    }

    setBothSubjectsSignup(data as SignupRow);
    setBothSubjectsSignupCount((count) => Math.max(MIN_DISPLAYED_BOTH_SUBJECTS_SIGNUPS, count + 1));
    void loadBothSubjectsSignupCount();
  };

  const handleStartMockExam = async () => {
    if (!user?.id) {
      toast.error("Please sign in to start this mock exam.");
      return;
    }

    if (attemptStatus === "submitted") {
      toast.error("You have already completed this mock exam.");
      return;
    }

    // Resume without creating a new attempt
    if (attemptStatus === "in_progress") {
      setStarting(true);
      try {
        await recordSignupIfNeeded();
        navigateToSession();
      } finally {
        setStarting(false);
      }
      return;
    }

    setStarting(true);
    try {
      const { data: paper, error: paperError } = await supabase
        .from("live_mock_papers" as never)
        .select("id, question_count")
        .eq("slug", LIVE_MOCK.slug)
        .maybeSingle();

      if (paperError || !paper) {
        toast.error("Could not load this mock paper. Please try again.");
        return;
      }

      const paperRow = paper as { id: string; question_count?: number };
      const qc =
        typeof paperRow.question_count === "number" && paperRow.question_count > 0
          ? paperRow.question_count
          : LIVE_MOCK.questions;

      const { error: insertError } = await supabase.from("live_mock_attempts" as never).insert({
        paper_id: paperRow.id,
        user_id: user.id,
        status: "in_progress",
        question_count: qc,
        answered_count: 0,
      });

      if (insertError) {
        // Race: another tab already created the row - reload status and send user to session if in progress
        const { data: existing } = await supabase
          .from("live_mock_attempts" as never)
          .select("status")
          .eq("paper_id", paperRow.id)
          .eq("user_id", user.id)
          .maybeSingle();
        const st = (existing as { status?: string } | null)?.status;
        if (st === "submitted") {
          toast.error("You have already completed this mock exam.");
          setAttemptStatus("submitted");
          return;
        }
        if (st === "in_progress") {
          setAttemptStatus("in_progress");
          await recordSignupIfNeeded();
          navigateToSession();
          return;
        }
        console.error("Failed to start live mock attempt", insertError);
        toast.error("Could not start the mock exam. Please try again.");
        return;
      }

      setAttemptStatus("in_progress");
      await recordSignupIfNeeded();
      navigateToSession();
    } finally {
      setStarting(false);
    }
  };

  const handleBothSubjectsRegistration = async () => {
    if (!user?.id) {
      toast.error("Please sign in to register for this mock.");
      return;
    }

    setRegisteringBothSubjects(true);
    try {
      if (hasPremiumLiveMockAccess) {
        await recordBothSubjectsSignup();
        toast.success(`You're registered for ${COMBINED_MOCK_DISPLAY_TITLE}.`);
        return;
      }

      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const { data, error } = await supabase.functions.invoke("create-live-mock-payment", {
        body: {
          returnTo,
          baseUrl: window.location.origin,
          ...getDataFastIds(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Registration checkout URL was not returned.");

      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to start both-subjects live mock payment", error);
      const message = error instanceof Error ? error.message : "Could not open registration checkout.";
      toast.error(message);
    } finally {
      setRegisteringBothSubjects(false);
    }
  };

  const detailRows = [
    { label: "Date", value: LIVE_MOCK.displayDate, icon: CalendarDays },
    { label: "Start", value: LIVE_MOCK.displayTime, icon: Clock3 },
    { label: "Duration", value: `${LIVE_MOCK.durationMinutes} minutes`, icon: Hourglass },
    { label: "Questions", value: String(LIVE_MOCK.questions), icon: FileText },
  ];

  if (import.meta.env.DEV) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#f7f5ef] px-4 py-6 text-slate-950 sm:px-6 sm:py-10">
        <section className="mx-auto w-full max-w-5xl">
          <div className="overflow-hidden rounded-[28px] border border-orange-200/80 bg-white shadow-[0_30px_90px_rgba(124,45,18,0.10)]">
            <div className="relative overflow-hidden bg-[linear-gradient(125deg,#9a3412_0%,#ea580c_55%,#f59e0b_100%)] px-6 py-9 text-white sm:px-10 sm:py-12">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[40px] border-white/10" />
              <div className="absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
              <div className="relative max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Premium registered access
                </span>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                  {COMBINED_MOCK_DISPLAY_TITLE}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-orange-50 sm:text-base">
                  Your complete 11+ mock environment is ready. Sit both papers under timed conditions and move
                  automatically from Maths to the break and then English.
                </p>
              </div>
            </div>

            <div className="grid gap-8 px-6 py-7 sm:px-10 sm:py-9 lg:grid-cols-[1fr_330px] lg:items-start">
              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Calculator, label: "Maths", value: "60 questions", sub: "Non-calculator · 50 minutes" },
                    { icon: Hourglass, label: "Break", value: "15 minutes", sub: "Automatic transition" },
                    { icon: BookOpen, label: "English", value: "60 questions", sub: "50 minutes" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-[#fbfaf7] p-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-orange-700">
                        {item.label}
                      </p>
                      <p className="mt-1 text-base font-black">{item.value}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-lg font-black">Before you begin</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      "Use a quiet room and stable internet connection.",
                      "Have paper, pencils and an eraser ready.",
                      "The timer starts after your final confirmation.",
                      "Your local placeholder answers save automatically.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-sm leading-5 text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="rounded-[22px] border border-orange-200 bg-[linear-gradient(145deg,#fff7ed_0%,#ffffff_75%)] p-5 shadow-[0_16px_40px_rgba(234,88,12,0.10)]">
                {loading ? (
                  <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                    Checking registration...
                  </div>
                ) : bothSubjectsSignup ? (
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Registered
                    </span>
                    <h2 className="mt-5 text-2xl font-black tracking-tight">Ready to start?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Maths first, then break, then English. One final confirmation before the timer starts.
                    </p>
                    <Button
                      asChild
                      className="mt-6 h-12 w-full rounded-xl bg-[linear-gradient(90deg,#ea580c_0%,#f59e0b_100%)] text-base font-black text-white shadow-[0_12px_24px_rgba(234,88,12,0.24)] hover:brightness-105"
                    >
                      <Link to="/live-mock-exams/local-preview">
                        Start Mock
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-900">
                      <CreditCard className="h-3.5 w-3.5" />
                      Registration required
                    </span>
                    <h2 className="mt-5 text-2xl font-black tracking-tight">Join this mock</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {hasPremiumLiveMockAccess
                        ? "Register free with Premium, then start the mock."
                        : `Pay ${formatLiveMockPrice(liveMockPriceGbp)} once to register and sit ${COMBINED_MOCK_DISPLAY_TITLE}.`}
                    </p>
                    <Button
                      className="mt-6 h-12 w-full rounded-xl bg-[linear-gradient(90deg,#ea580c_0%,#f59e0b_100%)] text-base font-black text-white shadow-[0_12px_24px_rgba(234,88,12,0.24)] hover:brightness-105"
                      disabled={registeringBothSubjects || finalizingBothSubjectsPayment}
                      onClick={() => void handleBothSubjectsRegistration()}
                    >
                      {registeringBothSubjects || finalizingBothSubjectsPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {finalizingBothSubjectsPayment ? "Confirming payment..." : "Opening checkout..."}
                        </>
                      ) : hasPremiumLiveMockAccess ? (
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
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Total timed experience: 1h 55m
                </div>
              </aside>
            </div>
          </div>

          <p className="mt-4 text-center text-xs font-semibold text-slate-400">
            Local prototype only. No payment is required and no mock answers are sent to production.
          </p>
        </section>
      </main>
    );
  }

  const bothSubjectsRegistrationCard = (
    <div className="mb-3 rounded-[16px] border border-amber-200/80 bg-[linear-gradient(135deg,#fffaf0_0%,#ffffff_52%,#f8fbff_100%)] px-3 py-3 shadow-[0_14px_34px_rgba(146,64,14,0.07)] sm:px-4">
      {bothSubjectsSignup && (
        <div className="mb-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-3 shadow-[0_8px_18px_rgba(5,150,105,0.08)] sm:px-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-emerald-800 sm:text-base">
                You have registered for this mock
              </h3>
              <p className="mt-1 text-xs leading-5 text-emerald-700 sm:text-sm">
                {combinedMockLive
                  ? "Your spot is locked in. The mock is live — tap Start below to begin (Maths first, then break, then English)."
                  : `Your spot for ${COMBINED_MOCK_DISPLAY_TITLE} is locked in. Come back here on the day to sit it — no further action needed.`}
              </p>
              {combinedMockLive && (
                <Button
                  asChild
                  className="mt-4 h-11 w-full rounded-xl bg-orange-600 text-sm font-bold text-white hover:bg-orange-700"
                >
                  <Link to="/live-mock-exams/local-preview">
                    Start mock now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 sm:text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                Sunday 14 June 2026
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="grid min-w-0 gap-3 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-amber-800">
            <Sparkles className="h-3 w-3" />
            New registration
          </span>
          <h2 className="mt-2 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {BOTH_SUBJECTS_LIVE_MOCK.title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
            {COMBINED_MOCK_DISPLAY_TITLE} is on Sunday 14 June 2026. It is guided and built alongside real GL exam
            creators for top-school preparation. Paid Gradlify Premium members get this mock included. 3-day free
            trial accounts do not include live mock access. Everyone else registers with one upfront payment.
          </p>
          {!hasPremiumLiveMockAccess && (
            <div className="mt-3 rounded-[14px] border border-orange-200 bg-[linear-gradient(135deg,#fff4e6_0%,#fff_70%)] px-3 py-2.5 shadow-[0_8px_18px_rgba(234,88,12,0.08)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white">
                <Sparkles className="h-3 w-3" />
                Use code {LIVE_MOCK_PROMO_CODE}
              </span>
              <p className="mt-2 text-xs leading-5 text-slate-700 sm:text-sm">
                <span className="font-black text-orange-700">{bothSubjectsSignupCount} spots have already been taken.</span>{" "}
                Enter <span className="font-black text-slate-950">{LIVE_MOCK_PROMO_CODE}</span> at checkout for a discount.
              </p>
              <p className="mt-1.5 text-xs leading-5 text-slate-600 sm:text-sm">
                Only <span className="font-black text-orange-700">{promoSpotsRemaining} discount spots</span>{" "}
                remain before the promo code stops working.
              </p>
            </div>
          )}
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-[14px] border border-orange-100 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(234,88,12,0.07)] sm:text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-700">
              <UsersRound className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="font-black text-orange-700">{bothSubjectsSignupCount}</span>{" "}
              people have already saved their spot. You can too.
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 sm:text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/70 px-2.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
              {COMBINED_MOCK_DISPLAY_TITLE}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/70 px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              GL-style paper
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white/70 px-2.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Included with paid Premium
            </span>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white/85 p-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                {hasPremiumLiveMockAccess ? "Premium registration" : "Registration price"}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-2xl font-bold tracking-tight text-slate-950">
                  {hasPremiumLiveMockAccess
                    ? "Included"
                    : formatLiveMockPrice(liveMockPriceGbp)}
                </div>
              </div>
              {!hasPremiumLiveMockAccess && (
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-700">
                  <Sparkles className="h-3 w-3" />
                  Use code {LIVE_MOCK_PROMO_CODE} - {promoSpotsRemaining} uses left
                </div>
              )}
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void handleBothSubjectsRegistration()}
            disabled={registeringBothSubjects || finalizingBothSubjectsPayment || Boolean(bothSubjectsSignup)}
            className="mt-3 h-10 w-full rounded-[10px] bg-[linear-gradient(90deg,#f59e0b_0%,#ea580c_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(234,88,12,0.18)] hover:brightness-105 disabled:opacity-75"
          >
            {bothSubjectsSignup ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Registered for this mock
              </span>
            ) : registeringBothSubjects || finalizingBothSubjectsPayment ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {finalizingBothSubjectsPayment
                  ? "Finalising registration"
                  : hasPremiumLiveMockAccess
                    ? "Recording registration"
                    : "Opening checkout"}
              </span>
            ) : hasPremiumLiveMockAccess ? (
              <span className="inline-flex items-center gap-2">
                Register with Premium
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Register and pay {formatLiveMockPrice(liveMockPriceGbp)}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#faf9f4] px-3 py-3 text-slate-950 sm:px-4 sm:py-4">
      <section className="mx-auto w-full min-w-0 max-w-5xl">
        {bothSubjectsRegistrationCard}

        <div className="mb-3 rounded-[16px] border border-amber-200/90 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_58%,#fffdf7_100%)] px-4 py-4 shadow-[0_14px_34px_rgba(234,88,12,0.08)] sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                <Sparkles className="h-3 w-3" />
                Premium benefit
              </span>
              <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Only paid Gradlify Premium members get this mock for free.
              </h3>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                The 3-day free trial does not include live mock access. Premium is £19.99/month and includes this mock
                plus future Gradlify mocks.
              </p>
            </div>
            <PremiumUpgradeButton
              label="View Premium"
              className="h-11 min-h-0 w-auto shrink-0 rounded-[12px] bg-[linear-gradient(90deg,#f59e0b_0%,#ea580c_100%)] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(234,88,12,0.2)] hover:brightness-105"
            />
          </div>
        </div>

        {SHOW_ENGLISH_LIVE_MOCK && (
        <div className="rounded-[16px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_58%,#fffdf8_100%)] px-3 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:px-4">
          <div className="flex items-center justify-end border-b border-slate-200/90 pb-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50/95 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
              Live mock
            </span>
          </div>

          <div className="grid min-w-0 gap-3 pt-3 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">
                QE Boys / Henrietta Barnett style
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-[32px]">
                11+ English complete mock exam
              </h1>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">
                A {LIVE_MOCK.durationMinutes}-minute selective English paper covering comprehension and SPaG.
              </p>

              <p className="mt-3 max-w-xl border-l-2 border-amber-200/90 pl-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                This was undoubtedly a very difficult exam. Do not be disheartened if you have gotten lower than
                expected. But remember to keep practising and revising with exam-style questions until your real exam.
              </p>

              <div className="mt-3 rounded-[12px] border border-slate-200 bg-white/85 p-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
                <div className="grid gap-2 sm:grid-cols-2">
                  {detailRows.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 rounded-lg bg-slate-50/65 px-2 py-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-blue-600">
                        <item.icon className="h-4 w-4 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[8px] font-black uppercase tracking-[0.13em] text-blue-700">
                          {item.label}
                        </div>
                        <div className="mt-0.5 truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[12px] border border-slate-200 bg-[linear-gradient(135deg,#fbfdff_0%,#ffffff_55%,#f8fbff_100%)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-[radial-gradient(circle_at_center,#ffffff_0%,#f5f9ff_60%,#eef4ff_100%)] text-blue-600 shadow-[0_0_0_6px_rgba(37,99,235,0.035)]">
                  <ClipboardCheck className="h-6 w-6 stroke-[2.1]" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Live mock
                  </span>
                  <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                    {attemptStatus === "submitted"
                      ? "You're all done"
                      : attemptStatus === "in_progress"
                        ? "Continue where you left off"
                        : "Ready to begin?"}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    {attemptStatus === "submitted"
                      ? "Open your personalised breakdown: score, placement, and question-by-question review."
                      : attemptStatus === "in_progress"
                        ? "Resume your attempt. The timer and answers are saved on your account."
                        : `Your ${LIVE_MOCK.durationMinutes}-minute mock begins immediately once started.`}
                  </p>
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400 sm:text-xs">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                    <span>Use a quiet environment before continuing.</span>
                  </div>
                </div>
              </div>

              {attemptStatus === "submitted" ? (
                <p className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 text-xs font-medium leading-relaxed text-emerald-950">
                  You&apos;ve submitted this mock. Each account may sit this paper only once. View your full results below.
                </p>
              ) : attemptStatus === "in_progress" ? (
                <p className="mt-3 rounded-[10px] border border-blue-200 bg-blue-50/90 px-3 py-2.5 text-xs font-medium leading-relaxed text-blue-950">
                  You have already started this mock. Continue to resume: you cannot restart a fresh attempt.
                </p>
              ) : null}

              {attemptStatus === "submitted" ? (
                <Button
                  asChild
                  className="mt-3 h-10 w-full rounded-[10px] bg-[linear-gradient(90deg,#2563eb_0%,#2456f5_55%,#2553ea_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.18)] hover:brightness-105"
                >
                  <Link to="/live-mock-exams/analytics" className="inline-flex items-center justify-center gap-2">
                    See how you did in the mock
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleStartMockExam()}
                  disabled={loading || starting}
                  className="mt-3 h-10 w-full rounded-[10px] bg-[linear-gradient(90deg,#2563eb_0%,#2456f5_55%,#2553ea_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.18)] hover:brightness-105 disabled:opacity-75"
                >
                  {starting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {attemptStatus === "in_progress" ? "Opening mock…" : "Starting mock exam"}
                    </span>
                  ) : loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking access
                    </span>
                  ) : attemptStatus === "in_progress" ? (
                    <span className="inline-flex items-center gap-2">
                      Continue mock exam
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Start mock exam
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-400 sm:text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-slate-400" />
                  {LIVE_MOCK.questions} Questions
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3 w-3 text-slate-400" />
                  {LIVE_MOCK.durationMinutes} minutes
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-slate-400" />
                  Auto-submitted
                </span>
              </div>

              {signup ? (
                <p className="mt-2 text-[10px] font-medium text-slate-400">
                  Registration recorded for this account.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        )}

      </section>
    </main>
  );
}
