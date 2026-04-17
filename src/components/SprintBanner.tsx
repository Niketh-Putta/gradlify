import { Link } from "react-router-dom";
import { Trophy, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SprintBannerProps {
  className?: string;
}

export function SprintBanner({ className }: SprintBannerProps) {
  return (
    <Link 
      to="/sprint-details" 
      className={cn(
        "group relative block w-full overflow-hidden transition-all duration-300",
        "bg-[#4f46e5]", // Gradlify primary indigo
        className
      )}
    >
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Glow */}
        <div className="absolute -left-[10%] -top-[100%] h-[300%] w-[50%] animate-[gradient-slow_10s_linear_infinite] opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4),transparent_70%)]" />
        
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        {/* Right side accent */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-2 sm:py-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-8">
          
          {/* Main Message */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20 duration-[3000ms]" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-500/20">
                <Trophy className="h-4 w-4 text-amber-900" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-baseline gap-1 sm:gap-2">
              <span className="text-[13px] sm:text-[15px] font-black uppercase tracking-tight text-white">
                Win £100 Cash
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-indigo-100/80 italic">
                in the Gradlify Sprint
              </span>
            </div>
          </div>

          {/* CTA Link */}
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 border border-white/20 backdrop-blur-sm transition-all group-hover:bg-white/20 group-hover:border-white/30">
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide">
              See how it works
            </span>
            <ArrowRight className="h-3 w-3 text-white transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
      
      {/* Animated Shine Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
      </div>
      
      {/* Bottom accent border */}
      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-50" />
    </Link>
  );
}
