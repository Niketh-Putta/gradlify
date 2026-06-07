import { Link } from "react-router-dom";
import { CalendarDays, Sparkles } from "lucide-react";

import { LIVE_MOCK_PROMO_CODE } from "@/lib/liveMockPricing";

const MOCK_DATE = new Date("2026-06-14T12:00:00+01:00");

function getDaysUntilMock() {
  const now = new Date();
  const diff = MOCK_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

type LiveMockPromoBannerProps = {
  variant?: "compact" | "full";
  refCode?: string;
};

export function LiveMockPromoBanner({ variant = "full", refCode }: LiveMockPromoBannerProps) {
  const daysLeft = getDaysUntilMock();
  const href = refCode ? `/live-mock-exams?ref=${refCode}` : "/live-mock-exams";

  if (variant === "compact") {
    return (
      <Link
        to={href}
        className="group flex items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#fffbeb_100%)] px-4 py-3 shadow-[0_12px_28px_rgba(234,88,12,0.08)] transition hover:border-amber-300"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
              <Sparkles className="h-3 w-3" />
              Live mock
            </span>
            <span className="text-sm font-bold text-slate-950">Sunday 14 June</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Maths + English · score + weak topics after · Premium free
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
          {daysLeft === 0 ? "Today" : `${daysLeft}d left`}
        </span>
      </Link>
    );
  }

  return (
    <div className="relative overflow-hidden border-b border-amber-200/60 bg-[#1a0f08] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(520px_120px_at_12%_20%,rgba(239,68,68,0.35),transparent_68%),radial-gradient(480px_120px_at_88%_0%,rgba(251,191,36,0.28),transparent_66%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/40 bg-amber-200/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-100">
            <CalendarDays className="h-3 w-3" />
            {daysLeft === 0 ? "Mock day" : `${daysLeft} days left`}
          </span>
          <span className="text-sm font-black sm:text-base">Live 11+ Mock · Sunday 14 June</span>
          <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-white/80 sm:text-xs">
            Timed Maths + English · score + weak topics straight after
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-100">
            Premium: free · New families: use code {LIVE_MOCK_PROMO_CODE}
          </span>
          <Link
            to={href}
            className="rounded-md bg-gradient-to-r from-red-600 to-orange-500 px-3 py-1 text-[11px] font-black text-white shadow-[0_0_14px_rgba(249,115,22,0.38)] transition hover:brightness-110 sm:text-xs"
          >
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
}
