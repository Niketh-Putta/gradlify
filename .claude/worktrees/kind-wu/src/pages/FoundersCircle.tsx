import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ForceTheme } from "@/components/ForceTheme";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getFoundersSprintInfo, getNextSprintInfo, getNextSprintStartText, getSprintEndLabel } from "@/lib/foundersSprint";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

export default function FoundersCircle() {
  const navigate = useNavigate();
  const [ctaHref, setCtaHref] = useState("/gcse?auth=signup");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currentMembers = 6;
  const totalSpots = 20;
  const progressPercent = Math.min(100, Math.round((currentMembers / totalSpots) * 100));
  const nextSprintStart = getNextSprintStartText();
  const { daysToGo } = getNextSprintInfo();
  const { isActive, daysLeft } = getFoundersSprintInfo();
  const daysToGoLabel = `${daysToGo} ${daysToGo === 1 ? "day" : "days"} to go`;
  const daysLeftLabel = `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
  const sprintStatusLabel = isActive
    ? `Sprint live — ${daysLeftLabel}`
    : `Next sprint starts ${nextSprintStart} — ${daysToGoLabel}`;
  const sprintCtaLabel = isActive ? "Enter the Sprint" : "Register for Next Sprint";

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const isAuthed = Boolean(data.session);
      setIsAuthenticated(isAuthed);
      setCtaHref(isAuthed ? "/connect" : "/gcse?auth=signup");
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isAuthed = Boolean(session);
      setIsAuthenticated(isAuthed);
      setCtaHref(isAuthed ? "/connect" : "/gcse?auth=signup");
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ForceTheme theme="light">
      <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),transparent_55%),radial-gradient(circle_at_20%_20%,_rgba(59,130,246,0.16),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(circle,_rgba(59,130,246,0.35)_1.2px,transparent_1.2px)] bg-[length:28px_28px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-700"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Cohort 02 Open
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
              {sprintStatusLabel}
            </span>
          </header>

          <section className="mt-12 grid gap-12 lg:grid-cols-[1.35fr,0.65fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-indigo-500">
                The exclusive cohort
              </p>
              <h1 className="text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
                Gradlify{" "}
                <span className="bg-gradient-to-r from-indigo-700 via-blue-600 to-sky-500 bg-clip-text text-transparent">
                  Founders&apos; Circle.
                </span>
              </h1>
              <p className="max-w-xl text-base text-slate-600 sm:text-lg">
                {isActive
                  ? `${getSprintEndLabel()}. ${daysLeftLabel}.`
                  : `${getSprintEndLabel()}. Next sprint starts ${nextSprintStart} — ${daysToGoLabel}.`}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <Button asChild className="rounded-full border border-slate-900/80 bg-slate-900 px-6 py-3 text-white shadow-[0_20px_45px_-24px_rgba(15,23,42,0.75)] hover:bg-slate-800">
                  <Link to={ctaHref}>{sprintCtaLabel}</Link>
                </Button>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {isActive ? "Sprint Live" : "Next Sprint"}
                </span>
                <span className="text-sm text-slate-600 font-semibold">Merit based — No payment.</span>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-indigo-300/30 blur-3xl" />
              <div className="relative rounded-[28px] border-[3px] border-slate-200 bg-white p-7 shadow-[0_35px_90px_-55px_rgba(79,70,229,0.6)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Available slots
                </p>
                <div className="mt-4 flex items-end gap-2 text-5xl font-black text-slate-900">
                  {currentMembers}
                  <span className="text-base font-semibold text-slate-400">/ {totalSpots}</span>
                </div>
                <div className="mt-5 h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-indigo-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="text-emerald-600">{currentMembers} founders</span>
                  <span className="text-rose-500">{totalSpots - currentMembers} left</span>
                </div>
                <div className="mt-6 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                  {sprintStatusLabel}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-[28px] border-[3px] border-slate-200 bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.5)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Built by those who use it.</h2>
              <p className="mt-3 text-sm text-slate-600">
                Gradlify is early and evolving. Instead of building in isolation, we&apos;re partnering with students,
                parents, and teachers who live the GCSE challenge every day.
              </p>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                {AI_FEATURE_ENABLED
                  ? "“Being a founding member is a strong signal for internships and US college applications—especially for students interested in AI and EdTech.”"
                  : "“Being a founding member is a strong signal for internships and US college applications—especially for students interested in EdTech.”"}
              </div>
            </div>

            <div className="rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 p-7 text-white shadow-[0_30px_80px_-50px_rgba(30,64,175,0.85)] ring-1 ring-indigo-300/50">
              <h2 className="text-lg font-semibold">Benefits of Entry</h2>
              <ul className="mt-4 space-y-3 text-sm text-indigo-50">
                {[
                  "Early access to alpha-tier features",
                  "Direct communication with the founder team",
                  "Lifetime legacy pricing tier",
                  "Profile Founding Member badge",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-indigo-500">The roadmap</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">How It Works</h2>
            <p className="mt-2 text-sm text-slate-500">
              We value consistency over intensity. {isActive ? `Sprint ends in ${daysLeftLabel}.` : `Next sprint starts ${nextSprintStart} — ${daysToGoLabel}.`}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Practice", text: "Engage with Gradlify naturally to master your topics." },
                { title: "Sprint", text: isActive ? `Sprint live — ends in ${daysLeftLabel}.` : `Next sprint starts ${nextSprintStart} — ${daysToGoLabel}.` },
                { title: "Qualify", text: "Top 10 users on the leaderboard get a strong chance at qualifying." },
                { title: "Access", text: "Join private group chats and bi-weekly Zoom sessions." },
              ].map((step, index) => (
                <div key={step.title} className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>{step.title.toUpperCase()}</span>
                    <span>0{index + 1}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="mt-2 text-xs text-slate-500">{step.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-[28px] border-2 border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Who should join?</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {[
                  { label: "Students", text: "Who want a say in the tools they use for their exams." },
                  { label: "Parents", text: "Seeking effective, high-quality resources for their kids." },
                  { label: "Teachers", text: "Dedicated to elevating GCSE practice globally." },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[28px] border-2 border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-indigo-600">The Student Challenge</h3>
              <p className="mt-2 text-sm text-slate-600">
                Rank inside the <strong>top 10 learners</strong> on the Connect leaderboard to qualify and get a strong chance
                at becoming part of the Founders&apos; Circle. Consistency during sprint windows is the key factor.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-full bg-slate-900 px-5 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.8)] hover:bg-slate-800">
                  <Link to={isAuthenticated ? "/connect" : "/gcse?auth=signup"}>Go to leaderboard</Link>
                </Button>
                <span className="text-xs text-slate-400">Winners announced via the private portal.</span>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-[32px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 p-8 text-white shadow-[0_35px_90px_-55px_rgba(30,64,175,0.85)] ring-1 ring-indigo-300/40">
              <h3 className="text-2xl font-semibold">Ready to shape what comes next?</h3>
              <p className="mt-2 text-sm text-indigo-100">
                {isActive ? `Sprint ends in ${daysLeftLabel}.` : `Next sprint starts ${nextSprintStart} — ${daysToGoLabel}.`}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-indigo-100">
                <Button asChild className="rounded-full bg-white px-6 text-indigo-700 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.5)] hover:bg-indigo-50">
                  <Link to={ctaHref}>{sprintCtaLabel}</Link>
                </Button>
                <span>Zero cost to join.</span>
              </div>
            </div>

            <div className="rounded-[28px] border-2 border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Partnerships</p>
              <div className="mt-2 space-y-3 text-xs text-slate-500">
                <p>
                  We’re open to working with teachers, schools, EdTech or SaaS builders — or anyone interested in helping build
                  an early-stage education startup focused on GCSE Maths practice.
                </p>
                <p>
                  This can involve shaping features, sharing feedback from real classroom or student use, or exploring how Gradlify
                  could fit into your teaching, product, or organisation.
                </p>
                <p>
                  If you’re already teaching, building in this space, or interested in collaborating more directly, feel free to reach
                  out — there’s no need to go through the sprint process.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold">Email us</span>
                <a href="mailto:team@gradlify.com" className="font-semibold text-indigo-600 hover:underline">
                  team@gradlify.com
                </a>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">We appreciate your expertise and time.</p>
            </div>
          </section>
        </div>
      </div>
    </ForceTheme>
  );
}
