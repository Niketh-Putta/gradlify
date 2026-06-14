import { ArrowRight, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

interface LiveMockExamBannerProps {
  className?: string;
  onClick?: () => void;
  mode?: "link" | "button";
}

const bannerContent = (
  <>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-sm sm:h-9 sm:w-9">
      <CalendarClock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
    </div>

    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center sm:flex-row sm:justify-center sm:gap-3">
      <span className="text-[12px] font-semibold leading-tight tracking-tight text-white sm:text-base">
        Live 11+ Maths &amp; English mock is open now
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md sm:text-sm">
        Start mock
        <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </div>
  </>
);

const bannerClassName = (className?: string) =>
  cn(
    "group relative block w-full overflow-hidden bg-[linear-gradient(90deg,#0f766e_0%,#2563eb_48%,#4f46e5_100%)] transition-all hover:brightness-105",
    "shadow-[0_10px_28px_rgba(37,99,235,0.16)]",
    className,
  );

const innerClassName = "relative z-10 mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 sm:py-3";

const shine = (
  <>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_50%,rgba(255,255,255,0.22),transparent_32%),radial-gradient(circle_at_76%_35%,rgba(255,255,255,0.14),transparent_36%)]" />
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
  </>
);

export function LiveMockExamBanner({ className, onClick, mode = "link" }: LiveMockExamBannerProps) {
  if (mode === "button") {
    return (
      <button type="button" onClick={onClick} className={bannerClassName(className)}>
        {shine}
        <span className={innerClassName}>{bannerContent}</span>
      </button>
    );
  }

  return (
    <Link to="/live-mock-exams" className={bannerClassName(className)}>
      {shine}
      <span className={innerClassName}>{bannerContent}</span>
    </Link>
  );
}
