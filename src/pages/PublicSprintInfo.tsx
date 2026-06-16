import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe2 } from "lucide-react";
import { getSprintEventDisplayLabels } from "@/lib/foundersSprint";

const sprintEvent = getSprintEventDisplayLabels();

export default function PublicSprintInfo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F9F8F3] text-slate-900 font-sans overflow-x-hidden">
      {/* Simple Navigation */}
      <nav className="sticky top-0 z-30 w-full bg-[#F9F8F3]/60 backdrop-blur-xl border-b border-slate-200/40">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-900"
          >
            <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Home
          </button>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Gradlify Sprint</span>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 pb-24 pt-12 sm:pt-16">
        {/* Hero Section */}
        <header className="mb-16">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 px-2.5 py-0.5 mb-6">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Limited Event</span>
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-7xl">
            Want to <br />
            win <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-700">
              the prize?
            </span>
          </h1>
          <p className="max-w-xl text-lg font-medium leading-relaxed text-slate-400 sm:text-xl">
            Live for 30 days. When it closes, whoever has the highest leaderboard score wins the only cash prize. Only correct answers from full mock exams count; practice questions do not.
          </p>
        </header>

        {/* The Rules */}
        <section className="mb-24">
          <h2 className="mb-10 text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">The Rules</h2>
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
            <div className="relative pt-6 border-t border-slate-200">
              <span className="absolute -top-2.5 left-0 bg-[#F9F8F3] pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">01</span>
              <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Mock Exams Only</h3>
              <p className="text-base leading-relaxed text-slate-500">
                Only correct answers from completed full <span className="text-slate-900 font-semibold underline decoration-indigo-200 underline-offset-4">mock exams</span> add to your sprint leaderboard score.
              </p>
            </div>
            <div className="relative pt-6 border-t border-slate-200 opacity-60">
              <span className="absolute -top-2.5 left-0 bg-[#F9F8F3] pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">02</span>
              <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-400">Practice Mode</h3>
              <p className="text-base leading-relaxed text-slate-400">
                Correct answers from practice questions do <span className="font-semibold">not</span> count toward your sprint leaderboard score.
              </p>
            </div>
          </div>
        </section>

        {/* Prize visual */}
        <section className="mb-24">
          <div className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white p-3 shadow-2xl shadow-slate-200/40">
            <img 
              src="/sprint-prizes-new.jpeg" 
              alt="Gradlify Sprint, cash prize" 
              className="rounded-[24px] w-full object-cover"
            />
          </div>
        </section>

        {/* Prize */}
        <section className="mb-32">
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/50 p-8 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Winner</span>
            <div className="mt-2 text-4xl font-bold text-slate-900 font-serif italic">Prize</div>
            <p className="mt-2 text-sm font-medium text-slate-500">
              One cash prize · highest mock-only leaderboard score when the sprint closes (see local times below) · verified by Gradlify
            </p>
          </div>
        </section>

        {/* Meta Info */}
        <footer className="border-t border-slate-200 pt-12">
          <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe2 className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Sprint schedule</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Your device’s local time</p>
                {sprintEvent.localTimeZoneId ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {sprintEvent.localTimeZoneShort ? (
                      <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-900 ring-1 ring-amber-100">
                        {sprintEvent.localTimeZoneShort}
                      </span>
                    ) : null}
                    <span className="break-all font-mono text-[10px] font-medium leading-snug text-slate-500">
                      {sprintEvent.localTimeZoneId}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid gap-0 sm:grid-cols-2">
              <div className="border-b border-slate-100 p-5 sm:border-b-0 sm:border-r">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Opens</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{sprintEvent.startLabel}</p>
              </div>
              <div className="p-5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Closes</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{sprintEvent.endLabel}</p>
              </div>
            </div>
          </div>
          <p className="mt-10 text-center text-sm font-medium text-slate-400">Join Gradlify today to compete.</p>
          <button
            onClick={() => navigate("/11-plus")}
            className="mx-auto mt-8 flex text-xs font-bold text-primary hover:underline underline-offset-4"
          >
            Get Started &rarr;
          </button>
        </footer>
      </div>
    </div>
  );
}
