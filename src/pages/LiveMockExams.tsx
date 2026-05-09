import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Hourglass,
  Loader2,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";

const LIVE_MOCK = {
  slug: "live-11plus-english-mock-2026-05-09-1700",
  startsAtIso: "2026-05-09T16:00:00.000Z",
  displayDate: "Saturday 9 May 2026",
  displayTime: "5:00 PM BST",
  durationMinutes: 50,
  questions: 70,
};

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
  const { user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [signup, setSignup] = useState<SignupRow | null>(null);
  /** Locks "Start" once an attempt row exists (created on first Start click). */
  const [attemptStatus, setAttemptStatus] = useState<LiveMockAttemptStatus>("none");

  useEffect(() => {
    let cancelled = false;

    const loadSignupAndAttempt = async () => {
      if (!user?.id) {
        setAttemptStatus("none");
        setLoading(false);
        return;
      }

      setLoading(true);

      const [{ data: paper }, signupResult] = await Promise.all([
        supabase.from("live_mock_papers" as never).select("id").eq("slug", LIVE_MOCK.slug).maybeSingle(),
        supabase
          .from("live_mock_exam_signups" as never)
          .select("id, registered_at")
          .eq("user_id", user.id)
          .eq("mock_slug", LIVE_MOCK.slug)
          .maybeSingle(),
      ]);

      if (cancelled) return;

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

      setLoading(false);
    };

    void loadSignupAndAttempt();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
        // Race: another tab already created the row — reload status and send user to session if in progress
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

  const detailRows = [
    { label: "Date", value: LIVE_MOCK.displayDate, icon: CalendarDays },
    { label: "Start", value: LIVE_MOCK.displayTime, icon: Clock3 },
    { label: "Duration", value: `${LIVE_MOCK.durationMinutes} minutes`, icon: Hourglass },
    { label: "Questions", value: String(LIVE_MOCK.questions), icon: FileText },
  ];

  return (
    <main className="min-h-screen bg-[#faf9f4] px-3 py-3 text-slate-950 sm:px-4 sm:py-4">
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-[16px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_58%,#fffdf8_100%)] px-3 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:px-4">
          <div className="flex items-center justify-end border-b border-slate-200/90 pb-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50/95 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
              Live mock
            </span>
          </div>

          <div className="grid gap-3 pt-3 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">
                QE Boys / Henrietta Barnett style
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[32px]">
                11+ English complete mock exam
              </h1>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">
                A {LIVE_MOCK.durationMinutes}-minute selective English paper covering comprehension and SPaG.
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

            <div className="rounded-[12px] border border-slate-200 bg-[linear-gradient(135deg,#fbfdff_0%,#ffffff_55%,#f8fbff_100%)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
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
                    Ready to begin?
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    Your {LIVE_MOCK.durationMinutes}-minute mock begins immediately once started.
                  </p>
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400 sm:text-xs">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                    <span>Use a quiet environment before continuing.</span>
                  </div>
                </div>
              </div>

              {attemptStatus === "submitted" ? (
                <p className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-950">
                  You have already completed this live mock. Each account may sit this paper only once.
                </p>
              ) : attemptStatus === "in_progress" ? (
                <p className="mt-3 rounded-[10px] border border-blue-200 bg-blue-50/90 px-3 py-2.5 text-xs font-medium leading-relaxed text-blue-950">
                  You have already started this mock. Continue to resume — you cannot restart a fresh attempt.
                </p>
              ) : null}

              <Button
                type="button"
                onClick={handleStartMockExam}
                disabled={loading || starting || attemptStatus === "submitted"}
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
                ) : attemptStatus === "submitted" ? (
                  <span>Mock already completed</span>
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
      </section>
    </main>
  );
}
