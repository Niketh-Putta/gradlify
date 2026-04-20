import { Link } from "react-router-dom";
import { Trophy, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SprintBannerProps {
  className?: string;
}

export function SprintBanner({ className }: SprintBannerProps) {
  return (
    <Link 
      to="/sprint-details" 
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
          
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <span className="text-[12px] sm:text-base font-black tracking-tight uppercase sm:normal-case">
              Do you want to win £160?
            </span>
            <span className="flex items-center gap-1.5 text-[11px] sm:text-sm font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-md">
              Click here to see how the Gradlify Sprint works
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
      
      {/* Decorative shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:animate-[shine_1.5s_infinite]" />
    </Link>
  );
}
