import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  COMBINED_MOCK_DISPLAY_TITLE,
  SECOND_MOCK_DISPLAY_TITLE,
  SECOND_MOCK_RELEASE_AT,
  isCombinedMockReleased,
  isSecondMockReleased,
} from "@/lib/liveMockCombinedConfig";

type MockCard = {
  title: string;
  blurb: string;
  href: string;
  live: boolean;
  /** Shown on the CTA + status pill when the mock is not yet open. */
  opensAt?: Date;
};

/** "Sat 21 Jun" style label for an upcoming mock's open date. */
function formatOpensLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function StatusPill({ live, opensAt }: { live: boolean; opensAt?: Date }) {
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
      {opensAt ? `Opens ${formatOpensLabel(opensAt)}` : "Coming soon"}
    </span>
  );
}

function MockExamCard({ card }: { card: MockCard }) {
  const { title, blurb, href, live, opensAt } = card;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border bg-white transition-shadow",
        live
          ? "border-orange-200 shadow-[0_20px_60px_rgba(124,45,18,0.10)]"
          : "border-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.05)]",
      )}
    >
      <div
        className={cn(
          "px-6 py-8 text-white sm:px-9 sm:py-10",
          live
            ? "bg-gradient-to-r from-orange-600 to-amber-500"
            : "bg-gradient-to-r from-slate-700 to-slate-500",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]">
            Live mock exam
          </span>
          <StatusPill live={live} opensAt={opensAt} />
        </div>
        <h2 className="mt-4 text-2xl font-black capitalize tracking-tight sm:text-3xl">{title}</h2>
        <p className={cn("mt-2 text-sm font-medium sm:text-base", live ? "text-orange-50" : "text-slate-200")}>
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

        {!live ? (
          <p className="mt-4 text-sm text-slate-500">
            Free for Gradlify Premium members. Everyone else can reserve a place for £14.99.
          </p>
        ) : null}

        <Button
          asChild
          className={cn(
            "mt-6 h-12 w-full rounded-xl text-base font-bold text-white",
            live ? "bg-orange-600 hover:bg-orange-700" : "bg-slate-900 hover:bg-slate-800",
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

function PremiumBanner() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-amber-300/70 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-[0_10px_30px_rgba(124,45,18,0.06)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Gradlify Premium
          </div>
          <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
            Free access to every mock, past and future
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Premium members sit all previous and upcoming live mocks at no extra cost, for just{" "}
            <span className="font-bold text-slate-900">£19.99 a month</span>.
          </p>
        </div>
        <Button
          onClick={goToPremiumSettings}
          className="h-12 w-full shrink-0 rounded-xl bg-orange-600 px-6 text-base font-bold text-white hover:bg-orange-700 sm:w-auto"
        >
          Get Gradlify Premium
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Live mock landing at `/live-mock-exams`. Lists each mock with a clear status
 * (open now vs upcoming) driven by the release dates in liveMockCombinedConfig,
 * so cards flip from "reserve" to "open" automatically on their release date.
 */
export default function LiveMockHub() {
  const cards: MockCard[] = [
    {
      title: COMBINED_MOCK_DISPLAY_TITLE,
      blurb: "A full, timed 11+ live mock exam. Marked papers, explanations and how you compare.",
      href: "/live-mock-exams/local-preview",
      live: isCombinedMockReleased(),
    },
    {
      title: SECOND_MOCK_DISPLAY_TITLE,
      blurb: "Our next full, timed 11+ live mock exam. Reserve your place now.",
      href: "/live-mock-exams/local-preview2",
      live: isSecondMockReleased(),
      opensAt: SECOND_MOCK_RELEASE_AT,
    },
  ];

  return (
    <main className="min-h-screen bg-[#faf9f4] text-slate-950">
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="mb-7 sm:mb-9">
          <PremiumBanner />
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
            <MockExamCard key={card.href} card={card} />
          ))}
        </div>
      </section>
    </main>
  );
}
