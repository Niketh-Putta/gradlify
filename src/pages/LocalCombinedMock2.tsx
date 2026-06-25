import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coffee,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { useMembership } from "@/hooks/useMembership";
import { cn } from "@/lib/utils";
import {
  formatLiveMockPrice,
  LIVE_MOCK_STANDARD_PRICE_GBP,
  resolveLiveMockSignupDisplay,
  SECOND_MOCK_MIN_DISPLAYED_SIGNUPS,
} from "@/lib/liveMockPricing";
import { registerForSecondMock } from "@/lib/liveMockRegistration";
import {
  isLiveMockAlreadyRegisteredError,
  isLiveMockCheckoutPending,
  pollLiveMockSignupUntilReady,
} from "@/lib/liveMockCheckoutFlow";
import {
  BREAK_MINUTES,
  englishPaperForEvent,
  isSecondMockReleased,
  mathsPaperForEvent,
  paperQuestionCount,
  SECOND_MOCK_DISPLAY_TITLE,
  SECOND_MOCK_EVENT_SLUG,
  SECOND_MOCK_RELEASE_SCHEDULE,
} from "@/lib/liveMockCombinedConfig";

const MOCK_SLUG = SECOND_MOCK_EVENT_SLUG;
const MOCK2_MATHS = mathsPaperForEvent(MOCK_SLUG);
const MOCK2_ENGLISH = englishPaperForEvent(MOCK_SLUG);

/**
 * Mock 2 registration page. Maths and English papers load from Supabase
 * (`both_subjects_maths_mock_2` / `both_subjects_english_mock_2`).
 *
 * Fully separate from mock 1: own signup rows, paper slugs, attempts and results.
 *
 * Access model (mirrors mock 1):
 *  - Paying Gradlify Premium: registers free via a direct signup row.
 *  - Trial Premium: must pay the one-off fee (trials do not include live mocks).
 *  - Everyone else: pays £14.99 via Stripe Checkout; the webhook records the row.
 */

const MOCK2_PRIMARY_BUTTON =
  "h-12 w-full rounded-xl bg-slate-900 text-base font-bold text-white hover:bg-slate-800";
const MOCK2_SIGN_IN_BUTTON = "mt-6 bg-slate-900 text-white hover:bg-slate-800";

type Eligibility = {
  loading: boolean;
  registered: boolean;
  error: string | null;
};

export default function LocalCombinedMock2() {
  const { user } = useAppContext();
  const membership = useMembership();
  const { hasPaidPremiumLiveMockAccess, isTrialing } = membership;
  const [searchParams] = useSearchParams();

  const [eligibility, setEligibility] = useState<Eligibility>({
    loading: true,
    registered: false,
    error: null,
  });
  const [registering, setRegistering] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [released, setReleased] = useState<boolean>(() => isSecondMockReleased());
  const [signupCount, setSignupCount] = useState(SECOND_MOCK_MIN_DISPLAYED_SIGNUPS);

  useEffect(() => {
    void supabase.functions
      .invoke("live-mock-signup-count", { body: { mockSlug: MOCK_SLUG } })
      .then(({ data }) => {
        if (typeof data?.count === "number") {
          const display = resolveLiveMockSignupDisplay(data.count, MOCK_SLUG);
          setSignupCount(display.displayedCount);
        } else if (typeof data?.displayedCount === "number") {
          setSignupCount(data.displayedCount);
        }
      })
      .catch(() => null);
  }, []);

  // Flip to "open" automatically the moment the Sunday 10am release time passes.
  useEffect(() => {
    if (released) return;
    const interval = window.setInterval(() => {
      if (isSecondMockReleased()) setReleased(true);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [released]);

  const checkEligibility = useCallback(async () => {
    if (!user) {
      setEligibility({ loading: false, registered: false, error: null });
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
        error: "Could not verify your reservation. Refresh and try again.",
      });
      return;
    }

    setEligibility({
      loading: false,
      registered: Boolean(signupResult.data),
      error: null,
    });
  }, [user]);

  useEffect(() => {
    void checkEligibility();
  }, [checkEligibility]);

  useEffect(() => {
    if (!user?.id || eligibility.registered) return;
    const shouldPoll =
      searchParams.get("upgraded") === "true" || isLiveMockCheckoutPending(MOCK_SLUG);
    if (!shouldPoll) return;

    let cancelled = false;
    setConfirmingPayment(true);

    void pollLiveMockSignupUntilReady(user.id, MOCK_SLUG).then((registered) => {
      if (cancelled) return;
      setConfirmingPayment(false);
      if (registered) {
        setEligibility({ loading: false, registered: true, error: null });
        toast.success("Your place is reserved for mock 2.");
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
  }, [eligibility.registered, searchParams, user?.id]);

  const handleRegister = async () => {
    if (!user?.id || !user.email) {
      toast.error("Please sign in to reserve your place for this mock.");
      return;
    }
    if (eligibility.registered) {
      toast.info("You're already registered for mock 2.");
      return;
    }
    if (confirmingPayment || isLiveMockCheckoutPending(MOCK_SLUG)) {
      toast.info("We're confirming your payment. Please wait a moment.");
      return;
    }

    setRegistering(true);
    try {
      const result = await registerForSecondMock({
        userId: user.id,
        email: user.email,
        hasPaidPremiumLiveMockAccess,
        returnTo: "/live-mock-exams/local-preview2",
      });
      if (result === "registered") {
        setEligibility({ loading: false, registered: true, error: null });
        toast.success("Your place is reserved for mock 2.");
      }
    } catch (error) {
      if (isLiveMockAlreadyRegisteredError(error)) {
        setEligibility({ loading: false, registered: true, error: null });
        toast.success("You're already registered for mock 2.");
        return;
      }
      const message = error instanceof Error ? error.message : "Could not open registration checkout.";
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  const canStartMock = eligibility.registered && (released || import.meta.env.DEV);
  const sitUrl = import.meta.env.DEV
    ? "/live-mock-exams/local-preview2/sit?fast=1"
    : "/live-mock-exams/local-preview2/sit";

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf9f4] p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-8 w-8 text-orange-600" />
          <h1 className="mt-4 text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to reserve your place for this live mock.
          </p>
          <Button asChild className={MOCK2_SIGN_IN_BUTTON}>
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
        <span className="text-sm font-semibold text-slate-600">Checking your reservation...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f4] text-slate-950">
      <section className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/live-mock-exams"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-600/30 bg-gradient-to-r from-slate-700 to-slate-500 px-6 py-7 text-white sm:px-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                Live mock exam
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]">
                <CalendarDays className="h-3.5 w-3.5" />
                {released ? "Open now" : `Opens ${SECOND_MOCK_RELEASE_SCHEDULE}`}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{SECOND_MOCK_DISPLAY_TITLE}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-200 sm:text-base">
              Paper order: non-calculator Maths first, then a break, then English. This is mock 2 only: completely
              separate questions, registration and results from mock 1.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-9">
            {[
              {
                icon: Calculator,
                title: "1. Maths",
                detail: `Non-calculator · ${paperQuestionCount(MOCK2_MATHS)} questions · ${MOCK2_MATHS.durationMinutes} minutes`,
              },
              { icon: Coffee, title: "2. Break", detail: `${BREAK_MINUTES} minutes · automatic` },
              {
                icon: BookOpen,
                title: "3. English",
                detail: `${paperQuestionCount(MOCK2_ENGLISH)} questions · ${MOCK2_ENGLISH.durationMinutes} minutes`,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <item.icon className="h-6 w-6 text-orange-600" />
                <h2 className="mt-4 font-black">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 px-6 py-5 sm:px-9">
            <div className="inline-flex max-w-full items-center gap-2 rounded-[14px] border border-orange-100 bg-orange-50/60 px-3 py-2 text-xs font-semibold text-slate-700 sm:text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-orange-700">
                <UsersRound className="h-4 w-4" />
              </span>
              <span>
                <span className="font-black text-orange-700">{signupCount}</span> families have enrolled so far.
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-6 sm:px-9">
            <div
              className={cn(
                "rounded-xl border p-4",
                eligibility.registered ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
              )}
            >
              <div className="flex items-center gap-2 font-bold">
                {eligibility.registered ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Clock3 className="h-5 w-5 text-amber-600" />
                )}
                {eligibility.registered ? "Your place is reserved" : "Reservation"}
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {eligibility.registered
                  ? released
                    ? `${user.email} is registered. The mock is open. Come back to sit it.`
                    : `${user.email} is registered. This mock opens ${SECOND_MOCK_RELEASE_SCHEDULE}. We'll have your place saved.`
                  : isTrialing
                    ? "Reserve your place now. Your 3-day trial does not include live mocks. Pay once or upgrade to paid Premium."
                    : "Reserve your place now. Paid Premium members reserve free; everyone else pays once."}
              </p>
            </div>

            {eligibility.error && (
              <p className="mt-4 text-sm font-semibold text-rose-600">{eligibility.error}</p>
            )}

            {!eligibility.registered && (confirmingPayment || isLiveMockCheckoutPending(MOCK_SLUG)) ? (
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

            {eligibility.registered ? (
              canStartMock ? (
                <div className="mt-6 space-y-3">
                  <p className="text-sm leading-6 text-slate-600">
                    You're registered. Start the full mock when you're ready. Maths first, then a break, then English.
                  </p>
                  <Button asChild className={MOCK2_PRIMARY_BUTTON}>
                    <Link to={sitUrl}>
                      Start mock (Maths first)
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
                  You're registered. Opens {SECOND_MOCK_RELEASE_SCHEDULE}. We'll keep your place saved and you can start
                  the mock from here once it goes live.
                </div>
              )
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm leading-6 text-slate-600">
                  {released
                    ? "Register to unlock this mock. "
                    : `This mock is released on ${SECOND_MOCK_RELEASE_SCHEDULE}. Reserve your place now. `}
                  {isTrialing ? (
                    <>
                      Your 3-day Premium trial does not include live mocks. Pay{" "}
                      <span className="font-black text-orange-700">
                        {formatLiveMockPrice(LIVE_MOCK_STANDARD_PRICE_GBP)}
                      </span>{" "}
                      once to reserve, or upgrade to paid Premium for free access.
                    </>
                  ) : (
                    <>
                      Paid Premium members register free. Everyone else pays{" "}
                      <span className="font-black text-orange-700">
                        {formatLiveMockPrice(LIVE_MOCK_STANDARD_PRICE_GBP)}
                      </span>{" "}
                      once.
                    </>
                  )}
                </p>
                <Button
                  className={MOCK2_PRIMARY_BUTTON}
                  disabled={registering || confirmingPayment || isLiveMockCheckoutPending(MOCK_SLUG)}
                  onClick={() => void handleRegister()}
                >
                  {registering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening checkout...
                    </>
                  ) : confirmingPayment || isLiveMockCheckoutPending(MOCK_SLUG) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming payment...
                    </>
                  ) : hasPaidPremiumLiveMockAccess ? (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Reserve free with Premium
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay {formatLiveMockPrice(LIVE_MOCK_STANDARD_PRICE_GBP)} and reserve
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
