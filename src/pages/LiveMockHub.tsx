import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Lock, Sparkles, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMembership } from "@/hooks/useMembership";
import { supabase } from "@/integrations/supabase/client";
import { PREMIUM_PRICING } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  formatLiveMockPrice,
  getDefaultPromoSpotsRemaining,
  getDisplayedLiveMockSignupCount,
  LIVE_MOCK_STANDARD_PRICE_GBP,
  resolveLiveMockSignupDisplay,
  SECOND_MOCK_MIN_DISPLAYED_SIGNUPS,
  SECOND_MOCK_PROMO_CODE,
} from "@/lib/liveMockPricing";
import {
  COMBINED_MOCK_DISPLAY_TITLE,
  COMBINED_MOCK_EVENT_SLUG,
  SECOND_MOCK_DISPLAY_TITLE,
  SECOND_MOCK_EVENT_SLUG,
  SECOND_MOCK_RELEASE_AT,
  SECOND_MOCK_RELEASE_SCHEDULE,
  isCombinedMockReleased,
  isSecondMockReleased,
} from "@/lib/liveMockCombinedConfig";

type MockCard = {
  slug: string;
  title: string;
  blurb: string;
  href: string;
  live: boolean;
  opensAt?: Date;
};

type MockCardStats = {
  displayedCount: number;
  promoCode: string | null;
  promoSpotsRemaining: number;
};

/** "Sat 21 Jun" style label for an upcoming mock's open date. */
function formatOpensLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function StatusPill({
  live,
  opensAt,
  releaseSchedule,
}: {
  live: boolean;
  opensAt?: Date;
  releaseSchedule?: string;
}) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
        </span>
        Open now
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
      <CalendarClock className="h-3.5 w-3.5" />
      {releaseSchedule ? `Opens ${releaseSchedule}` : opensAt ? `Opens ${formatOpensLabel(opensAt)}` : "Coming soon"}
    </span>
  );
}

function MockExamCard({
  card,
  stats,
  hasPaidPremiumLiveMockAccess,
}: {
  card: MockCard;
  stats: MockCardStats;
  hasPaidPremiumLiveMockAccess: boolean;
}) {
  const { slug, title, blurb, href, live, opensAt } = card;
  const isMock2 = slug === SECOND_MOCK_EVENT_SLUG;
  const showPromo = !hasPaidPremiumLiveMockAccess && stats.promoSpotsRemaining > 0 && stats.promoCode;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border bg-white transition-shadow",
        isMock2
          ? "border-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
          : live
            ? "border-orange-200 shadow-[0_20px_60px_rgba(124,45,18,0.10)]"
            : "border-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.05)]",
      )}
    >
      <div
        className={cn(
          "px-6 py-8 text-white sm:px-9 sm:py-10",
          isMock2 || !live
            ? "bg-gradient-to-r from-slate-700 to-slate-500"
            : "bg-gradient-to-r from-orange-600 to-amber-500",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]">
            Live mock exam
          </span>
          <StatusPill
            live={live}
            opensAt={opensAt}
            releaseSchedule={isMock2 ? SECOND_MOCK_RELEASE_SCHEDULE : undefined}
          />
        </div>
        <h2 className="mt-4 text-2xl font-black capitalize tracking-tight sm:text-3xl">{title}</h2>
        <p className={cn("mt-2 text-sm font-medium sm:text-base", isMock2 || !live ? "text-slate-200" : "text-orange-50")}>
          {blurb}
        </p>
      </div>

      <div className="px-6 py-7 sm:px-9 sm:py-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <Clock3 className="h-4 w-4 text-orange-600" />
            Maths + English · one sitting
          </span>
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Available to sit now
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">
              <Lock className="h-4 w-4" />
              Reserve your place
            </span>
          )}
        </div>

        <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-[14px] border border-orange-100 bg-orange-50/60 px-3 py-2 text-xs font-semibold text-slate-700 sm:text-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-orange-700">
            <UsersRound className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="font-black text-orange-700">{stats.displayedCount}</span>{" "}
            {isMock2 ? "families have enrolled so far" : "people have already enrolled so far"}.
          </span>
        </div>

        {!live && isMock2 ? (
          <p className="mt-4 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
            Released on{" "}
            <span className="font-black text-slate-950">{SECOND_MOCK_RELEASE_SCHEDULE}</span>.
          </p>
        ) : null}

        {!live ? (
          <p className="mt-4 text-sm text-slate-500">
            Free for paid Gradlify Premium members only. 3-day trial accounts and everyone else can reserve a place for{" "}
            {formatLiveMockPrice(LIVE_MOCK_STANDARD_PRICE_GBP)}.
          </p>
        ) : null}

        {showPromo ? (
          <div className="mt-4 rounded-[14px] border border-orange-200 bg-[linear-gradient(135deg,#fff4e6_0%,#fff_70%)] px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
              <Sparkles className="h-3 w-3" />
              Use code {stats.promoCode}
            </span>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {isMock2 ? (
                <>
                  <span className="font-black text-orange-700">{stats.promoSpotsRemaining} more uses</span> of discount
                  code <span className="font-black text-slate-950">{stats.promoCode}</span> remain. After that,
                  full price ({formatLiveMockPrice(LIVE_MOCK_STANDARD_PRICE_GBP)}).
                </>
              ) : (
                <>
                  Enter <span className="font-black text-slate-950">{stats.promoCode}</span> at checkout for a discount.
                  Only <span className="font-black text-orange-700">{stats.promoSpotsRemaining} uses</span> left before
                  full price.
                </>
              )}
            </p>
          </div>
        ) : null}

        <Button
          asChild
          className={cn(
            "mt-6 h-12 w-full rounded-xl text-base font-bold text-white",
            isMock2
              ? "bg-slate-900 hover:bg-slate-800"
              : live
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-slate-900 hover:bg-slate-800",
          )}
        >
          <Link to={href}>
            {live ? "Open mock" : "Reserve your place"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Opens the in-app Settings view (where Premium upgrade lives) via the hash. */
function goToPremiumSettings() {
  window.location.hash = "settings";
}

function PremiumBanner({
  hasPaidPremiumLiveMockAccess,
  isTrialing,
}: {
  hasPaidPremiumLiveMockAccess: boolean;
  isTrialing: boolean;
}) {
  const heading = hasPaidPremiumLiveMockAccess
    ? "Your paid Premium includes every mock, past and future"
    : isTrialing
      ? "Your 3-day trial does not include free live mocks"
      : "Paid Premium unlocks every mock, past and future";

  return (
    <div className="overflow-hidden rounded-[20px] border border-amber-300/70 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-[0_10px_30px_rgba(124,45,18,0.06)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Gradlify Premium
          </div>
          <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950 sm:text-xl">{heading}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {hasPaidPremiumLiveMockAccess ? (
              <>You have paying Gradlify Premium, so every previous and upcoming live mock is included at no extra cost.</>
            ) : isTrialing ? (
              <>
                Upgrade to paid Premium to include all live mocks. During the 3-day trial, each live mock is charged
                separately at checkout.
              </>
            ) : (
              <>
                Paid Premium members sit all previous and upcoming live mocks at no extra cost, for just{" "}
                <span className="font-bold text-slate-900">£{PREMIUM_PRICING.weekly} a week</span>. Free trials are not included.
              </>
            )}
          </p>
        </div>
        {hasPaidPremiumLiveMockAccess ? (
          <div className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-6 text-base font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            Paying Premium. Mocks included
          </div>
        ) : isTrialing ? (
          <Button
            onClick={goToPremiumSettings}
            className="h-12 w-full shrink-0 rounded-xl bg-orange-600 px-6 text-base font-bold text-white hover:bg-orange-700 sm:w-auto"
          >
            Upgrade to paid Premium
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={goToPremiumSettings}
            className="h-12 w-full shrink-0 rounded-xl bg-orange-600 px-6 text-base font-bold text-white hover:bg-orange-700 sm:w-auto"
          >
            Get Gradlify Premium
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

const defaultStatsForSlug = (slug: string): MockCardStats => ({
  displayedCount:
    slug === SECOND_MOCK_EVENT_SLUG
      ? SECOND_MOCK_MIN_DISPLAYED_SIGNUPS
      : getDisplayedLiveMockSignupCount(0, slug),
  promoCode: slug === SECOND_MOCK_EVENT_SLUG ? SECOND_MOCK_PROMO_CODE : null,
  promoSpotsRemaining:
    slug === SECOND_MOCK_EVENT_SLUG
      ? getDefaultPromoSpotsRemaining(SECOND_MOCK_EVENT_SLUG)
      : 0,
});

/**
 * Live mock landing at `/live-mock-exams`. Lists each mock with a clear status
 * (open now vs upcoming) driven by the release dates in liveMockCombinedConfig,
 * so cards flip from "reserve" to "open" automatically on their release date.
 */
export default function LiveMockHub() {
  const { isTrialing, hasPaidPremiumLiveMockAccess } = useMembership();
  const cards: MockCard[] = [
    {
      slug: COMBINED_MOCK_EVENT_SLUG,
      title: COMBINED_MOCK_DISPLAY_TITLE,
      blurb: "A full, timed 11+ live mock exam. Marked papers, explanations and how you compare.",
      href: "/live-mock-exams/local-preview",
      live: isCombinedMockReleased(),
    },
    {
      slug: SECOND_MOCK_EVENT_SLUG,
      title: SECOND_MOCK_DISPLAY_TITLE,
      blurb: `Our next full, timed 11+ live mock exam. Released on ${SECOND_MOCK_RELEASE_SCHEDULE}. Reserve your place now.`,
      href: "/live-mock-exams/local-preview2",
      live: isSecondMockReleased(),
      opensAt: SECOND_MOCK_RELEASE_AT,
    },
  ];

  const [statsBySlug, setStatsBySlug] = useState<Record<string, MockCardStats>>(() =>
    Object.fromEntries(cards.map((card) => [card.slug, defaultStatsForSlug(card.slug)])),
  );

  useEffect(() => {
    void Promise.all(
      cards.map(async (card) => {
        try {
          const { data, error } = await supabase.functions.invoke("live-mock-signup-count", {
            body: { mockSlug: card.slug },
          });
          if (error) throw error;
          return [
            card.slug,
            {
              displayedCount:
                typeof data?.displayedCount === "number"
                  ? data.displayedCount
                  : defaultStatsForSlug(card.slug).displayedCount,
              promoCode: typeof data?.promoCode === "string" ? data.promoCode : defaultStatsForSlug(card.slug).promoCode,
              promoSpotsRemaining:
                typeof data?.promoSpotsRemaining === "number"
                  ? data.promoSpotsRemaining
                  : defaultStatsForSlug(card.slug).promoSpotsRemaining,
            } satisfies MockCardStats,
          ] as const;
        } catch {
          return [card.slug, defaultStatsForSlug(card.slug)] as const;
        }
      }),
    ).then((entries) => {
      setStatsBySlug(Object.fromEntries(entries));
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#faf9f4] text-slate-950">
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="mb-7 sm:mb-9">
          <PremiumBanner
            hasPaidPremiumLiveMockAccess={hasPaidPremiumLiveMockAccess}
            isTrialing={isTrialing}
          />
        </div>

        <header className="mb-7 sm:mb-9">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">Gradlify</p>
          <h1 className="mt-1 font-serif text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Live Mock Exams
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Full, timed 11+ mocks under real exam conditions. Open mocks can be sat now; upcoming
            mocks can be reserved ahead of their open date.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {cards.map((card) => (
            <MockExamCard
              key={card.href}
              card={card}
              stats={statsBySlug[card.slug] ?? defaultStatsForSlug(card.slug)}
              hasPaidPremiumLiveMockAccess={hasPaidPremiumLiveMockAccess}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
