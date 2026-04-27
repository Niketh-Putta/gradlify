import { useNavigate } from "react-router-dom";
import { ForceTheme } from "@/components/ForceTheme";
import { ArrowRight, Crown, Sparkles, Users } from "lucide-react";
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
              )}>Starts 28 April</span>
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Mystery <br className="hidden sm:block" />
              <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", isEnglish ? "from-amber-500 to-amber-700" : "from-primary to-blue-700")}>
                Spin Win
              </span>
            </h1>
            <p className="max-w-xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg italic">
              Gain 50 points this week to enter our Mystery Spin. Exactly 3 winners will be selected for Gradlify Premium for 3 months!
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
            <div className="relative group mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-white border border-border/40 p-1 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl hover:border-primary/20">
              <div className="w-full overflow-hidden rounded-[28px]">
                <img 
                  src="/Premium_spin.jpeg" 
                  alt="Mystery Spin Win Premium" 
                  className="w-full h-auto block transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 rounded-[32px] ring-1 ring-inset ring-black/5 pointer-events-none" />
            </div>
          </section>

          {/* Prize Breakdown - Redesigned for Premium Minimalist Aesthetic */}
          <section className="mb-24 sm:mb-32">
            <div className="mb-12 text-center">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">The Reward</h2>
            </div>
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="relative group">
                <div className={cn(
                  "absolute inset-0 blur-3xl opacity-20 transition-opacity group-hover:opacity-30",
                  isEnglish ? "bg-amber-500" : "bg-primary"
                )} />
                <div className="relative text-center px-4">
                  <div className="inline-flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <Crown className={cn("h-3 w-3", isEnglish ? "text-amber-500" : "text-primary")} />
                    Grand Prize
                  </div>
                  <h3 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                    3 Months <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", isEnglish ? "from-amber-500 to-amber-700" : "from-primary to-blue-700")}>Free</span>
                  </h3>
                  <div className="flex flex-col items-center gap-4 mb-8">
                    <p className="text-lg sm:text-xl font-medium text-slate-500 max-w-lg mx-auto leading-relaxed">
                      You get Gradlify Premium for free for <span className="text-slate-900 underline decoration-slate-200 underline-offset-8">3 whole months</span>.
                    </p>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-300",
                      isEnglish 
                        ? "bg-amber-50 text-amber-700 border-amber-200/50 shadow-sm shadow-amber-100/50" 
                        : "bg-indigo-50 text-primary border-primary/10 shadow-sm shadow-indigo-100/50"
                    )}>
                      <Users className="w-3.5 h-3.5" />
                      Limited to 3 Students
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Global Meta */}
          <footer className="grid grid-cols-1 gap-10 sm:grid-cols-2 border-t border-border/40 pt-12 mb-24">
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Event Window</h4>
              <p className="text-base leading-relaxed text-slate-500">
                Qualifying starts <span className="text-slate-900 font-semibold underline decoration-slate-200 decoration-2 underline-offset-4">Tuesday, 28 April at 18:30</span> and ends Tuesday, 5 May at 18:30.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Selection Process</h4>
              <p className="text-sm leading-relaxed text-slate-500">
                Exactly <span className="text-slate-900 font-bold">3 students</span> will be selected randomly from the pool of all learners who reached 50 points. Winners will be announced via the Gradlify dashboard.
              </p>
            </div>
          </footer>

          {/* Fixed Bottom Action */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mt-12 flex items-center gap-4">
              <div className="h-px w-8 bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">WIN PREMIUM ACCESS</span>
              <div className="h-px w-8 bg-border" />
            </div>
          </div>        </div>
      </div>
    </ForceTheme>
  );
}
