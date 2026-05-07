import { useNavigate } from "react-router-dom";
import { ForceTheme } from "@/components/ForceTheme";
import { ArrowRight, Crown, Medal, PlayCircle, ShieldCheck, Trophy } from "lucide-react";
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";

const winners = ["67Aarav.g", "Rupesh.05", "reyaghosh"];

export default function SprintMysterySpin() {
  const navigate = useNavigate();
  const { currentSubject } = useSubject();
  const isEnglish = currentSubject === "english";

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen overflow-x-hidden bg-background text-slate-900">
        <nav className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5 sm:px-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 transition-colors hover:text-slate-900"
            >
              <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              Return
            </button>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black uppercase text-slate-500">
                Results live
              </span>
            </div>
          </div>
        </nav>

        <main className="pb-24">
          <section className="relative border-b border-border/40 bg-gradient-to-br from-white via-background to-blue-50/60">
            <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-10 px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 shadow-sm">
                  <ShieldCheck className={cn("h-4 w-4", isEnglish ? "text-amber-600" : "text-primary")} />
                  <span className="text-[11px] font-black uppercase text-slate-600">
                    Mystery Spin results
                  </span>
                </div>

                <h1 className="max-w-4xl font-serif text-5xl font-black leading-[0.88] text-slate-950 sm:text-7xl lg:text-8xl">
                  See who won the free
                  <span className={cn("block text-transparent bg-clip-text bg-gradient-to-r", isEnglish ? "from-amber-500 to-amber-700" : "from-primary to-blue-700")}>
                    Gradlify Premium!
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-lg font-semibold italic leading-8 text-slate-500 sm:text-xl">
                  From the Mystery Spin, these 3 students won free Gradlify Premium for 3 months.
                </p>

                <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
                  {winners.map((winner, index) => (
                    <div
                      key={winner}
                      className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-4 shadow-sm"
                    >
                      <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                        <Crown className={cn("h-4 w-4", isEnglish ? "text-amber-600" : "text-primary")} />
                        Winner 0{index + 1}
                      </div>
                      <div className="text-xl font-black text-slate-950">{winner}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:pt-14">
                <div className="relative">
                  <div className={cn("absolute -inset-1 rounded-[32px] opacity-60 blur-xl", isEnglish ? "bg-amber-200" : "bg-blue-200")} />
                  <div className="relative overflow-hidden rounded-[32px] border border-border/60 bg-white p-1 shadow-2xl shadow-slate-200/70">
                    <div className="overflow-hidden rounded-[28px] bg-black">
                      <video
                        className="block aspect-video w-full bg-black object-contain"
                        controls
                        playsInline
                        preload="metadata"
                      >
                        <source src="/gradlify-premium-mystery-spin.mp4" type="video/mp4" />
                        Your browser does not support the winner reveal video.
                      </video>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-center gap-3 text-center">
                  <div className="h-px w-8 bg-border" />
                  <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                    <PlayCircle className={cn("h-3.5 w-3.5", isEnglish ? "text-amber-600" : "text-primary")} />
                    Watch the winner reveal
                  </div>
                  <div className="h-px w-8 bg-border" />
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                  <Trophy className={cn("h-4 w-4", isEnglish ? "text-amber-600" : "text-primary")} />
                  Free Premium Access
                </div>
                <h2 className="mt-4 max-w-md font-serif text-4xl font-black leading-none text-slate-950 sm:text-6xl">
                  3 months free for 3 students
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-slate-500">
                  The Mystery Spin has closed. These accounts were selected in the winner reveal and now receive free Gradlify Premium.
                </p>
              </div>

              <div className="grid gap-4">
                {winners.map((winner, index) => (
                  <div
                    key={winner}
                    className="grid gap-4 border-t border-border bg-white/50 px-1 py-5 sm:grid-cols-[6rem_1fr_auto] sm:items-center"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                      <Medal className={cn("h-4 w-4", isEnglish ? "text-amber-600" : "text-primary")} />
                      No. 0{index + 1}
                    </div>
                    <div>
                      <div className="font-serif text-3xl font-black leading-none text-slate-950">
                        {winner}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-500">
                        Won free Gradlify Premium from the Mystery Spin
                      </div>
                    </div>
                    <div className={cn("w-fit rounded-full border px-3 py-1.5 text-[10px] font-black uppercase", isEnglish ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-100 bg-blue-50 text-primary")}>
                      Premium winner
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className="mx-auto grid max-w-6xl grid-cols-1 gap-10 border-t border-border px-5 pt-10 sm:grid-cols-2 sm:px-8">
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase text-slate-950">Announcement</h4>
              <p className="text-sm leading-7 text-slate-500">
                The free Gradlify Premium Mystery Spin has ended and the winners are now live.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase text-slate-950">Prize</h4>
              <p className="text-sm leading-7 text-slate-500">
                Each winner receives <span className="font-bold text-slate-950">free Gradlify Premium for 3 months</span>.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </ForceTheme>
  );
}
