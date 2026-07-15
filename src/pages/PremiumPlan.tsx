import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { Button } from "@/components/ui/button";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { setSignupTrack } from "@/lib/track";
import {
  PREMIUM_PRICING,
  PREMIUM_VALUE_ITEMS,
  formatGbp,
  premiumTotalValueGbp,
} from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";

const CHECKOUT_AFTER_ONBOARDING = "/select-subject?intent=checkout";

const INCLUDED = [
  "Full practice bank access",
  "Unlimited timed mock exams",
  "Unlimited Challenge questions",
  "Revision notes and readiness tracking",
  "Parent-friendly weak-topic reports",
  "Lifetime access - no renewals",
] as const;

type PremiumPlanPageProps = {
  onAuthAction?: (action: "login" | "signup") => void;
};

export default function PremiumPlanPage({ onAuthAction }: PremiumPlanPageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const totalValue = premiumTotalValueGbp();
  const listPrice = PREMIUM_PRICING.lifetime;
  const savings = Math.round((totalValue - listPrice) * 100) / 100;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setIsLoggedIn(Boolean(data.session?.user));
        setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGetPremium = () => {
    setLoading(true);
    setSignupTrack("11plus");
    setPostAuthRedirect({
      path: CHECKOUT_AFTER_ONBOARDING,
      message: "Finish setup, then we'll open Lifetime Premium checkout.",
    });

    if (!isLoggedIn) {
      if (onAuthAction) {
        onAuthAction("signup");
        setLoading(false);
        return;
      }
      navigate(
        `/auth?mode=signup&track=11plus&redirect=${encodeURIComponent(CHECKOUT_AFTER_ONBOARDING)}`,
      );
      return;
    }

    navigate(CHECKOUT_AFTER_ONBOARDING);
  };

  return (
    <div className="min-h-screen bg-[#faf7f4] text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/11-plus" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 shadow-sm" variant="light" />
          <span className="text-sm font-semibold tracking-tight">Gradlify</span>
        </Link>
        <Link
          to="/11-plus"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Back
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <div className="mx-auto mb-8 max-w-xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Choose your 11+ prep plan.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Lifetime Gradlify Premium is the full self-study system for selective-school prep -
            mocks, weak-topic diagnosis, and parent clarity in one place.
          </p>
          <ul className="mt-5 flex flex-col items-center gap-2 text-[13px] font-medium text-slate-700 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5">
            {["Unlimited mocks & practice", "Parent readiness reports", "Pay once - keep forever"].map(
              (line) => (
                <li key={line} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-orange-500" strokeWidth={3} />
                  {line}
                </li>
              ),
            )}
          </ul>
        </div>

        <section className="relative overflow-hidden rounded-[28px] border border-orange-200/80 bg-white shadow-[0_28px_80px_-40px_rgba(194,65,12,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_180px_at_50%_0%,rgba(249,115,22,0.12),transparent_70%)]" />

          <div className="relative px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_0_24px_rgba(249,115,22,0.35)]">
                <Sparkles className="h-3 w-3" />
                Most popular
              </span>
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Gradlify Premium
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-orange-600">
                The complete 11+ self-study system most families need
              </p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                <span className="line-through">{formatGbp(totalValue)} value</span>
                <span className="mx-1.5 text-slate-300">·</span>
                Yours today
              </p>
              <div className="mt-1 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
                  {formatGbp(listPrice)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">one-time payment · lifetime access</p>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-left text-sm text-emerald-900">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p>
                  <span className="font-semibold">Secure Stripe checkout.</span> Card, Apple Pay, and
                  Google Pay where available. Existing weekly/annual members keep their plans.
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
              <ul className="divide-y divide-slate-200/80">
                {PREMIUM_VALUE_ITEMS.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-4 px-4 py-3 text-sm sm:px-5"
                  >
                    <span className="inline-flex items-start gap-2 text-slate-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" strokeWidth={3} />
                      {item.label}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {formatGbp(item.valueGbp)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Total value</span>
                  <span className="font-semibold tabular-nums line-through">{formatGbp(totalValue)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-950">
                  <span>Yours today</span>
                  <span className="tabular-nums text-orange-600">{formatGbp(listPrice)}</span>
                </div>
                <p className="text-xs text-slate-500">You save {formatGbp(savings)} vs buying the pieces separately.</p>
              </div>
            </div>

            <ul className="mt-6 space-y-2.5">
              {INCLUDED.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" strokeWidth={3} />
                  {line}
                </li>
              ))}
            </ul>

            <Button
              type="button"
              disabled={loading || checkingSession}
              onClick={() => handleGetPremium()}
              className="mt-8 h-12 w-full rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-[15px] font-bold text-white shadow-lg shadow-orange-500/25 hover:from-red-700 hover:to-amber-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting checkout…
                </>
              ) : (
                "Get Gradlify Premium"
              )}
            </Button>
            <p className="mt-3 text-center text-[12px] text-slate-500">
              Apple Pay, Google Pay or card · {formatGbp(listPrice)} one-time lifetime access
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
