import { Link } from "react-router-dom";
import { Trophy, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SPRINT_INFO_PATH = "/sprint-details";

interface SprintBannerProps {
  className?: string;
}

/** Full-width promo strip (matches sprint heat gradient). Links to sprint info. */
export function SprintBanner({ className }: SprintBannerProps) {
  return (
    <Link
      to={SPRINT_INFO_PATH}
      className={cn(
        "group relative block w-full overflow-hidden transition-all hover:brightness-105",
        "bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446]",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-2 sm:py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-white">
          <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Trophy className="h-4 w-4" />
          </div>

          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
            <span className="text-center text-[13px] font-black tracking-tight sm:text-left sm:text-lg">
              Sprint updates
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md sm:text-sm">
              Sprint rules &amp; dates. Tap here
              <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine" />
    </Link>
  );
}
