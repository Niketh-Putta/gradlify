import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
              £100?
            </span>
          </h1>
          <p className="max-w-xl text-lg font-medium leading-relaxed text-slate-400 sm:text-xl">
            The Gradlify Sprint is a high-performance competition where accuracy and consistency earn you real rewards.
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
                Only correct answers from full <span className="text-slate-900 font-semibold underline decoration-indigo-200 underline-offset-4">Mock Exams</span> contribute to your leaderboard score.
              </p>
            </div>
            <div className="relative pt-6 border-t border-slate-200 opacity-60">
              <span className="absolute -top-2.5 left-0 bg-[#F9F8F3] pr-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">02</span>
              <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-400">Practice Mode</h3>
              <p className="text-base leading-relaxed text-slate-400">
                Standard practice questions are for learning and do not count toward your ranking.
              </p>
            </div>
          </div>
        </section>

        {/* Prize Podium Visual */}
        <section className="mb-24">
          <div className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white p-3 shadow-2xl shadow-slate-200/40">
            <img 
              src="/sprint-prizes.jpg" 
              alt="Gradlify Sprint Podium" 
              className="rounded-[24px] w-full object-cover"
            />
          </div>
        </section>

        {/* Rewards Breakdown */}
        <section className="mb-32">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/50 p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">1st Place</span>
              <div className="mt-1 text-3xl font-bold text-slate-900 font-serif italic">£50</div>
              <p className="mt-2 text-xs font-medium text-slate-400">Waterstones Gift Card</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/50 p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">2nd Place</span>
              <div className="mt-1 text-3xl font-bold text-slate-900 font-serif italic">£35</div>
              <p className="mt-2 text-xs font-medium text-slate-400">Waterstones + Amazon</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/50 p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-700/60">3rd Place</span>
              <div className="mt-1 text-3xl font-bold text-slate-900 font-serif italic">£25</div>
              <p className="mt-2 text-xs font-medium text-slate-400">Waterstones Gift Card</p>
            </div>
          </div>
        </section>

        {/* Meta Info */}
        <footer className="border-t border-slate-200 pt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-4">Starts Monday, 20 April</p>
          <p className="text-sm font-medium text-slate-400">Join Gradlify today to start your sprint.</p>
          <button 
            onClick={() => navigate("/11-plus")}
            className="mt-8 text-xs font-bold text-primary hover:underline underline-offset-4"
          >
            Get Started &rarr;
          </button>
        </footer>
      </div>
    </div>
  );
}
