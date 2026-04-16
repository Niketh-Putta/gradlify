import { useNavigate } from "react-router-dom";
import { ForceTheme } from "@/components/ForceTheme";
import { ArrowRight } from "lucide-react";
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";

export default function SprintWinning() {
  const navigate = useNavigate();
  const { currentSubject } = useSubject();
  const isEnglish = currentSubject === "english";

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen bg-background text-slate-900 selection:bg-indigo-50 font-sans overflow-x-hidden">
        {/* Minimalist Navigation */}
        <nav className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl border-b border-border/40">
          <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-900"
            >
              <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              Return
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Event Live</span>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-3xl px-6 pb-24 pt-8 sm:pt-12">
          {/* Hero Section */}
          <header className="mb-12 sm:mb-16">
            <div className="inline-flex items-center rounded-full border border-border/60 bg-white/50 px-2.5 py-0.5 mb-6">
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.2em]",
                isEnglish ? "text-amber-600" : "text-primary"
              )}>Starts 20 April</span>
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Want to <br className="hidden sm:block" />
              win <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", isEnglish ? "from-amber-500 to-amber-700" : "from-primary to-blue-700")}>
                £100?
              </span>
            </h1>
            <p className="max-w-xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg italic">
              The Gradlify Sprint: A week of high performance learning where the top 3 win some real money!!
            </p>
          </header>

          {/* The Rules - Scaled Down */}
          <section className="mb-16 sm:mb-24">
             <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
              <div className="relative pt-6 border-t border-slate-200">
                <span className="absolute -top-2.5 left-0 bg-background pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Rule 01</span>
                <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Mock Exams Only</h3>
                <p className="text-base leading-relaxed text-slate-500">
                  Only correct answers submitted within full <span className="text-slate-900 font-semibold underline decoration-indigo-200 underline-offset-4">Mock Exams</span> contribute to your ranking.
                </p>
              </div>
              <div className="relative pt-6 border-t border-slate-200 opacity-60">
                <span className="absolute -top-2.5 left-0 bg-background pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Rule 02</span>
                <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-400">Practice Mode</h3>
                <p className="text-base leading-relaxed text-slate-400">
                  Standard practice questions are for learning and <span className="font-semibold italic">do not</span> count toward your competition leaderboard score.
                </p>
              </div>
            </div>
          </section>

          {/* Featured Visual Section - Scaled Down */}
          <section className="mb-16 sm:mb-24">
            <div className="relative group mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-white border border-border/40 p-3 sm:p-4 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl hover:border-primary/20">
              <div className="aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-[24px]">
                <img 
                  src="/sprint-prizes.jpg" 
                  alt="Gradlify Sprint Podium" 
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 rounded-[32px] ring-1 ring-inset ring-black/5" />
            </div>
          </section>

          {/* Prize Pool Breakdown - Ultra Clean & Scaled */}
          <section className="mb-16 sm:mb-24">
            <div className="mb-10 text-center">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">The Prize Pool</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* 1st Place */}
              <div className="group rounded-2xl border border-border/40 bg-white/50 p-6 transition-all hover:bg-white hover:shadow-lg hover:shadow-amber-500/5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">1st</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                </div>
                <div className="mb-1 text-4xl font-bold text-slate-900 tracking-tighter font-serif italic">£50</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Reward</p>
                <p className="text-xs font-medium leading-relaxed text-slate-500">Waterstones Gift Card</p>
              </div>

              {/* 2nd Place */}
              <div className="group rounded-2xl border border-border/40 bg-white/50 p-6 transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-500/5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">2nd</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                </div>
                <div className="mb-1 text-4xl font-bold text-slate-900 tracking-tighter font-serif italic">£35</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Total</p>
                <p className="text-xs font-medium leading-relaxed text-slate-500">£25 Waterstones + £10 Amazon</p>
              </div>

              {/* 3rd Place */}
              <div className="group rounded-2xl border border-border/40 bg-white/50 p-6 transition-all hover:bg-white hover:shadow-lg hover:shadow-orange-500/5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-700/60">3rd</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-200" />
                </div>
                <div className="mb-1 text-4xl font-bold text-slate-900 tracking-tighter font-serif italic">£25</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Reward</p>
                <p className="text-xs font-medium leading-relaxed text-slate-500">Waterstones Gift Card</p>
              </div>
            </div>
          </section>

          {/* Global Meta */}
          <footer className="grid grid-cols-1 gap-10 sm:grid-cols-2 border-t border-border/40 pt-12 mb-24">
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Timing Policy</h4>
              <p className="text-base leading-relaxed text-slate-500">
                Points reset this <span className="text-slate-900 font-semibold underline decoration-slate-200 decoration-2 underline-offset-4">Monday, 20 April at 00:00</span>. Competition window ends Sunday midnight.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Fair Use</h4>
              <p className="text-sm leading-relaxed text-slate-500">
                Results are manually audited by the Gradlify team. We verify the top three performers to ensure consistent accuracy and academic integrity.
              </p>
            </div>
          </footer>

          {/* Fixed Bottom Action - Redesigned for Premium Minimalist Aesthetic */}
          <div className="flex flex-col items-center justify-center text-center">
            <button
              onClick={() => navigate("/connect")}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-12 py-5 text-base font-bold transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] shadow-2xl overflow-hidden",
                isEnglish 
                  ? "bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600" 
                  : "bg-primary text-white shadow-primary/30"
              )}
            >
              {/* Subtle premium accent at the top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />

              <span className="relative z-10">Go to leaderboard</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <div className="mt-12 flex items-center gap-4">
              <div className="h-px w-8 bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">WIN FREE MONEY</span>
              <div className="h-px w-8 bg-border" />
            </div>
          </div>
        </div>
      </div>
    </ForceTheme>
  );
}
