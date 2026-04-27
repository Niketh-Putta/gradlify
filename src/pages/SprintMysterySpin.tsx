import { useNavigate } from "react-router-dom";
import { ForceTheme } from "@/components/ForceTheme";
import { ArrowRight, Crown, Sparkles } from "lucide-react";
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";
import { getFoundersSprintInfo } from "@/lib/foundersSprint";

export default function SprintMysterySpin() {
  const navigate = useNavigate();
  const { currentSubject } = useSubject();
  const isEnglish = currentSubject === "english";
  const { isActive } = getFoundersSprintInfo();

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen bg-background text-slate-900 selection:bg-indigo-50 font-sans overflow-x-hidden">
        {/* Minimalist Navigation */}
        <nav className="sticky top-0 z-30 w-full bg-background/60 backdrop-blur-xl border-b border-border/40">
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
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-slate-300"></span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Upcoming Event
              </span>
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
              )}>Starts Tuesday 18:30</span>
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Mystery <br className="hidden sm:block" />
              <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", isEnglish ? "from-amber-500 to-amber-700" : "from-primary to-blue-700")}>
                Spin Win
              </span>
            </h1>
            <p className="max-w-xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg italic">
              Gain 50 points this week to enter our Mystery Spin. Multiple winners will be selected for Gradlify Premium for 3 months!
            </p>
          </header>

          {/* The Rules - Scaled Down */}
          <section className="mb-16 sm:mb-24">
             <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
              <div className="relative pt-6 border-t border-slate-200">
                <span className="absolute -top-2.5 left-0 bg-background pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Rule 01</span>
                <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Hit 50 Points</h3>
                <p className="text-base leading-relaxed text-slate-500">
                  Every correct answer in <span className="text-slate-900 font-semibold underline decoration-indigo-200 underline-offset-4">Mock Exams</span> earns you 1 point. Reach 50 to qualify.
                </p>
              </div>
              <div className="relative pt-6 border-t border-slate-200">
                <span className="absolute -top-2.5 left-0 bg-background pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Rule 02</span>
                <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Mystery Spin</h3>
                <p className="text-base leading-relaxed text-slate-500">
                  All qualifying students are entered into a live draw. If your name is picked, you win Gradlify Premium for 3 months.
                </p>
              </div>
            </div>
          </section>

          {/* Featured Visual Section */}
          <section className="mb-16 sm:mb-24">
            <div className="relative group mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-white border border-border/40 p-3 sm:p-4 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl hover:border-primary/20">
              <div className="aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
                    <Sparkles className="h-10 w-10 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight uppercase">Mystery Spin Entry</h3>
                  <p className="mt-2 text-slate-400 text-sm font-medium">Unlock 3 Months of Premium</p>
                </div>
              </div>
              <div className="absolute inset-0 rounded-[32px] ring-1 ring-inset ring-black/5" />
            </div>
          </section>

          {/* Prize Breakdown */}
          <section className="mb-16 sm:mb-24">
            <div className="mb-10 text-center">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">The Rewards</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="group rounded-2xl border border-border/40 bg-white/50 p-8 transition-all hover:bg-white hover:shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Premium</span>
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div className="mb-2 text-4xl font-bold text-slate-900 tracking-tighter">3 Months Free</div>
                <p className="text-xs font-medium leading-relaxed text-slate-500">Unlock all AI questions, full mock exams, and personalized readiness plans.</p>
              </div>

              <div className="group rounded-2xl border border-border/40 bg-white/50 p-8 transition-all hover:bg-white hover:shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Exclusive</span>
                  <Sparkles className="h-5 w-5 text-blue-500" />
                </div>
                <div className="mb-2 text-4xl font-bold text-slate-900 tracking-tighter">Full Access</div>
                <p className="text-xs font-medium leading-relaxed text-slate-500">Automatic entry into the next Sprint with 0 limits from day one.</p>
              </div>
            </div>
          </section>

          {/* Global Meta */}
          <footer className="grid grid-cols-1 gap-10 sm:grid-cols-2 border-t border-border/40 pt-12 mb-24">
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Event Window</h4>
              <p className="text-base leading-relaxed text-slate-500">
                Qualifying starts <span className="text-slate-900 font-semibold underline decoration-slate-200 decoration-2 underline-offset-4">Tuesday at 18:30</span> and ends the following Tuesday at 18:30.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Selection Process</h4>
              <p className="text-sm leading-relaxed text-slate-500">
                Winners will be selected randomly from the pool of all students who reached 50 points. Winners will be announced via the Gradlify dashboard.
              </p>
            </div>
          </footer>

          {/* Fixed Bottom Action */}
          <div className="flex flex-col items-center justify-center text-center">
            <button
              onClick={() => navigate("/connect")}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-12 py-5 text-base font-bold transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] shadow-2xl overflow-hidden text-white",
                isEnglish 
                  ? "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600" 
                  : "bg-primary shadow-primary/30"
              )}
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
              <span className="relative z-10">Check qualifying points</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <div className="mt-12 flex items-center gap-4">
              <div className="h-px w-8 bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">WIN PREMIUM ACCESS</span>
              <div className="h-px w-8 bg-border" />
            </div>
          </div>
        </div>
      </div>
    </ForceTheme>
  );
}
