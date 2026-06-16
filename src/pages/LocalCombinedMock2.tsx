import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
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
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { useMembership } from "@/hooks/useMembership";
import { cn } from "@/lib/utils";
import { formatLiveMockPrice, LIVE_MOCK_STANDARD_PRICE_GBP } from "@/lib/liveMockPricing";
import { fetchSecondMockSignup, registerForSecondMock } from "@/lib/liveMockRegistration";
import {
  BREAK_MINUTES,
  ENGLISH_PAPER,
  isSecondMockReleased,
  MATHS_PAPER,
  paperQuestionCount,
  SECOND_MOCK_DISPLAY_TITLE,
  SECOND_MOCK_EVENT_SLUG,
} from "@/lib/liveMockCombinedConfig";

/**
 * Mock 2 registration / reservation page.
 *
 * IMPORTANT: this page is registration + reservation ONLY. Mock 2 has no seeded
 * questions and does not go live until Saturday, so the exam engine is never run
 * here and nothing about mock 1 (slug `both_subjects_live_mock`), its scoring or
 * saved scores is touched. Everything keys off SECOND_MOCK_EVENT_SLUG.
 *
 * Access model (mirrors mock 1):
 *  - Paying Gradlify Premium: registers free via a direct signup row.
 *  - Trial Premium: must pay the one-off fee (trials do not include live mocks).
 *  - Everyone else: pays £14.99 via Stripe Checkout; the webhook records the row.
 */
const MOCK_SLUG = SECOND_MOCK_EVENT_SLUG;

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
  const [released, setReleased] = useState<boolean>(() => isSecondMockReleased());

  // Flip to "open" automatically the moment the Saturday release time passes.
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

  // After returning from Stripe (`?upgraded=true`), the webhook records the
  // signup asynchronously — poll briefly until the reservation row appears.
  useEffect(() => {
    if (!user?.id || eligibility.registered) return;
    if (searchParams.get("upgraded") !== "true") return;

    let cancelled = false;
    let attempt = 0;

    const pollSignup = async () => {
      attempt += 1;
      try {
        const row = await fetchSecondMockSignup(user.id);
        if (cancelled) return;
        if (row) {
          setEligibility({ loading: false, registered: true, error: null });
          toast.success("Your place is reserved for mock 2.");
          window.history.replaceState(
            {},
            "",
            window.location.pathname + window.location.search.replace(/[?&]upgraded=true/, ""),
          );
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
  }, [eligibility.registered, searchParams, user?.id]);

  const handleRegister = async () => {
    if (!user?.id || !user.email) {
      toast.error("Please sign in to reserve your place for this mock.");
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
      const message = error instanceof Error ? error.message : "Could not open registration checkout.";
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf9f4] p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-8 w-8 text-orange-600" />
          <h1 className="mt-4 text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to reserve your place for this live mock.
          </p>
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

        <div className="mt-5 overflow-hidden rounded-[24px] border border-orange-200 bg-white shadow-[0_20px_60px_rgba(124,45,18,0.08)]">
          <div className="border-b border-orange-100 bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-7 text-white sm:px-9">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
              Live mock exam
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{SECOND_MOCK_DISPLAY_TITLE}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-orange-50 sm:text-base">
              Paper order: non-calculator Maths first, then a break, then English. Reserve your place now and sit it
              when it opens.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
              <CalendarDays className="h-4 w-4" />
              {released ? "Now open" : "Available from Saturday"}
            </div>
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
                    ? `${user.email} is registered. The mock is open — come back to sit it.`
                    : `${user.email} is registered. This mock opens Saturday — we'll have your place saved.`
                  : isTrialing
                    ? "Reserve your place now. Your 3-day trial does not include live mocks — pay once or upgrade to paid Premium."
                    : "Reserve your place now. Paid Premium members reserve free; everyone else pays once."}
              </p>
            </div>

            {eligibility.error && (
              <p className="mt-4 text-sm font-semibold text-rose-600">{eligibility.error}</p>
            )}

            {eligibility.registered ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
                {released ? (
                  <>You're registered and the mock is now open. Reload this page if the exam does not appear yet.</>
                ) : (
                  <>
                    You're registered — opens Saturday. There's nothing more to do for now; we'll keep your place
                    saved and you can start the mock from here once it goes live.
                  </>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm leading-6 text-slate-600">
                  {released
                    ? "Register to unlock this mock. "
                    : "This mock goes live on Saturday — reserve your place now. "}
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
                  className="h-12 w-full rounded-xl bg-orange-600 text-base font-bold text-white hover:bg-orange-700"
                  disabled={registering}
                  onClick={() => void handleRegister()}
                >
                  {registering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening checkout...
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
