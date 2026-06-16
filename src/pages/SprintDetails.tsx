import { useMemo } from "react";
import { useNavigateBackOrHome } from "@/hooks/useNavigateBackOrHome";
import { ForceTheme } from "@/components/ForceTheme";
import { ArrowRight, Trophy } from "lucide-react";
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";
import { getFoundersSprintInfo, getSprintEventDisplayLabels } from "@/lib/foundersSprint";

export function SprintDetails() {
  const goBackOrHome = useNavigateBackOrHome();
  const subjectContext = useSubject();
  const currentSubject = subjectContext?.currentSubject ?? "maths";
  const isEnglish = currentSubject === "english";
  const { isActive } = getFoundersSprintInfo();
  const sprintEventLabels = useMemo(() => getSprintEventDisplayLabels(), []);

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen bg-background text-slate-900 selection:bg-indigo-50 font-sans overflow-x-hidden">
        {/* Minimalist Navigation */}
        <nav className="sticky top-0 z-30 w-full bg-background/60 backdrop-blur-xl border-b border-border/40">
          <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
            <button
              type="button"
              onClick={goBackOrHome}
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-900"
            >
              <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              Return
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-1.5 w-1.5">
                {isActive && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-slate-300",
                  )}
                />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Live</span>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-3xl px-6 pb-24 pt-8 sm:pt-12">
          {/* Hero Section */}
          <header className="mb-12 sm:mb-16">
            <div className="inline-flex items-center rounded-full border border-border/60 bg-white/50 px-2.5 py-0.5 mb-6">
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-[0.2em]",
                  isEnglish ? "text-amber-600" : "text-primary",
                )}
              >
                Live now · ends {sprintEventLabels.endDateOnly}
              </span>
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Want to <br className="hidden sm:block" />
              win{" "}
              <span
                className={cn(
                  "text-transparent bg-clip-text bg-gradient-to-r",
                  isEnglish ? "from-amber-500 to-amber-700" : "from-primary to-blue-700",
                )}
              >
                the prize?
              </span>
            </h1>
            <p className="max-w-xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg italic">
              The competition runs for 30 days. When it ends, whoever has the{" "}
              <span className="font-semibold not-italic text-slate-600">highest</span> leaderboard score wins the only
              cash prize. Only correct answers from full mock exams count; practice questions
              do not.
            </p>
          </header>

          {/* The Rules - Scaled Down */}
          <section className="mb-16 sm:mb-24">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
              <div className="relative border-t border-slate-200 pt-6">
                <span className="absolute -top-2.5 left-0 bg-background pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                  Rule 01
                </span>
                <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Mock Exams Only</h3>
                <p className="text-base leading-relaxed text-slate-500">
                  Only <span className="font-semibold text-slate-900">correct</span> answers in completed{" "}
                  <span className="font-semibold text-slate-900 underline decoration-indigo-200 underline-offset-4">
                    full mock exams
                  </span>{" "}
                  add to your sprint leaderboard score.
                </p>
              </div>
              <div className="relative border-t border-slate-200 pt-6 opacity-60">
                <span className="absolute -top-2.5 left-0 bg-background pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                  Rule 02
                </span>
                <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-400">Practice Mode</h3>
                <p className="text-base leading-relaxed text-slate-400">
                  Correct answers from practice or topic drills do{" "}
                  <span className="font-semibold italic">not</span> count toward your sprint leaderboard score.
                </p>
              </div>
            </div>
          </section>

          {/* Prize Pool Breakdown - Ultra Clean & Scaled */}
          <section className="mb-16 sm:mb-24">
            <div className="mb-10 text-center">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">The Prize</h2>
            </div>
            <div className="mx-auto grid max-w-md grid-cols-1 gap-4">
              <div className="group rounded-2xl border border-border/40 bg-white/50 p-8 text-center transition-all hover:bg-white hover:shadow-lg hover:shadow-amber-500/5">
                <div className="mb-4 flex items-center justify-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Winner</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                </div>
                <div className="mb-1 font-serif text-5xl font-bold italic tracking-tighter text-slate-900">Prize</div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Amazon gift card</p>
                <p className="text-sm font-medium leading-relaxed text-slate-500">
                  After the month closes, whoever has the highest mock-only leaderboard score wins this cash prize
                  (verified by Gradlify).
                </p>
              </div>
            </div>
          </section>

          {/* Global Meta */}
          <footer className="mb-24 grid grid-cols-1 gap-10 border-t border-border/40 pt-12 sm:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Timing Policy</h4>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-white/70 shadow-sm">
                <div className="grid gap-0 sm:grid-cols-2">
                  <div className="border-b border-border/30 p-4 sm:border-b-0 sm:border-r sm:p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Opened</p>
                    <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">
                      {sprintEventLabels.startLabel}
                    </p>
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Closes</p>
                    <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">
                      {sprintEventLabels.endLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Fair Use</h4>
              <p className="text-sm leading-relaxed text-slate-500">
                Results are manually audited by the Gradlify team. We verify the winning performer to ensure consistent
                accuracy and academic integrity.
              </p>
            </div>
          </footer>

          {/* Final Call to Action */}
          <div className="flex flex-col items-center justify-center text-center">
            <div
              className={cn(
                "rounded-2xl border border-border/40 bg-white p-4 shadow-xl",
                isEnglish ? "shadow-amber-500/5" : "shadow-primary/5",
              )}
            >
              <Trophy className={cn("mx-auto mb-2 h-8 w-8", isEnglish ? "text-amber-500" : "text-primary")} />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-900">Good Luck in the Sprint!</p>
            </div>
            <div className="mt-12 flex items-center gap-4">
              <div className="h-px w-8 bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                cash prize
              </span>
              <div className="h-px w-8 bg-border" />
            </div>
          </div>
        </div>
      </div>
    </ForceTheme>
  );
}

export default SprintDetails;
