import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNavigateBackOrHome } from "@/hooks/useNavigateBackOrHome";
import { ForceTheme } from "@/components/ForceTheme";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Gift,
  Globe2,
  ListOrdered,
  ShieldCheck,
} from "lucide-react";
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getFoundersSprintInfo, getSprintEventDisplayLabels } from "@/lib/foundersSprint";

const PRIZE_PHRASE = "cash prize";

export default function SprintMysterySpin() {
  const navigate = useNavigate();
  const goBackOrHome = useNavigateBackOrHome();
  const { currentSubject } = useSubject();
  const isEnglish = currentSubject === "english";

  const sprintEventLabels = useMemo(() => getSprintEventDisplayLabels(), []);
  const { isActive, hasEnded } = getFoundersSprintInfo();

  const essentials = useMemo(
    () =>
      [
        {
          title: "How you win",
          body:
            "After the one-month window closes, whoever has the highest sprint leaderboard score wins the " +
            PRIZE_PHRASE +
            " (verified by Gradlify).",
        },
        {
          title: "What counts on the leaderboard",
          body:
            "Only correct answers in completed full mock exams count. Correct answers from practice questions do not count.",
        },
        {
          title: "Sprint window & timing",
          body: `Runs ${sprintEventLabels.startLabel} until ${sprintEventLabels.endLabel} in your device’s local time. Only activity before the closing time can affect your score.`,
        },
        {
          title: "Account & fair play",
          body:
            "You need a Gradlify account and must follow the sprint rules on Sprint details (including fair use and one entry per person where stated).",
        },
        {
          title: "Winner & tie-breakers",
          body:
            "Winner selection, announcement timing, and any tie-breakers are in the official sprint brief. We contact the winner using the email on their account.",
        },
      ] as const,
    [sprintEventLabels.endLabel, sprintEventLabels.startLabel],
  );

  const navStatus = hasEnded ? "Sprint ended" : isActive ? "Sprint live" : "Sprint upcoming";
  const navDot = hasEnded ? "bg-slate-400" : isActive ? "bg-emerald-500" : "bg-amber-500";

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen overflow-x-hidden bg-background text-slate-900">
        <nav className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5 sm:px-8">
            <button
              type="button"
              onClick={goBackOrHome}
              className="group flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 transition-colors hover:text-slate-900"
            >
              <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              Return
            </button>
            <div className="flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", navDot)} />
              <span className="text-[9px] font-black uppercase text-slate-500">{navStatus}</span>
            </div>
          </div>
        </nav>

        <main className="pb-24">
          <section className="relative border-b border-border/40 bg-gradient-to-br from-white via-background to-orange-50/50">
            <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-10 px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="text-center lg:text-left">
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 shadow-sm lg:mx-0 mx-auto">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600">
                    {PRIZE_PHRASE}
                  </span>
                </div>

                <h1 className="mx-auto max-w-4xl font-serif text-5xl font-black leading-snug sm:text-7xl sm:leading-snug lg:text-8xl lg:leading-[1.12] lg:mx-0">
                  <span className="block text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-violet-600 to-orange-500">
                    <span className="block leading-[1.12] sm:leading-[1.1] lg:leading-[1.08]">Cash prize</span>
                    <span className="mt-1.5 block leading-[1.12] sm:mt-2 sm:leading-[1.1] lg:mt-2.5 lg:leading-[1.08]">
                      Amazon
                    </span>
                    <span className="mt-1.5 block leading-[1.12] sm:mt-2 sm:leading-[1.1] lg:mt-2.5 lg:leading-[1.08]">
                      gift card
                    </span>
                  </span>
                </h1>

                <div
                  className={cn(
                    "mt-6 max-w-2xl overflow-hidden rounded-2xl border mx-auto lg:mx-0",
                    isEnglish ? "border-amber-100/90 bg-gradient-to-br from-amber-50/80 via-white to-white" : "border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-white to-white",
                  )}
                >
                  <div className="flex flex-col gap-3 border-b border-slate-200/60 bg-white/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      <CalendarRange className={cn("h-4 w-4 shrink-0", isEnglish ? "text-amber-600" : "text-primary")} />
                      Sprint window
                    </div>
                    {sprintEventLabels.localTimeZoneId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[10px] shadow-sm">
                          <Globe2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                          {sprintEventLabels.localTimeZoneShort ? (
                            <span className="font-bold tabular-nums text-slate-800">{sprintEventLabels.localTimeZoneShort}</span>
                          ) : null}
                          <span className="max-w-[14rem] truncate font-mono text-[9px] font-medium leading-tight text-slate-500 sm:max-w-[18rem]">
                            {sprintEventLabels.localTimeZoneId}
                          </span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-0 sm:grid-cols-2">
                    <div className="border-b border-slate-200/50 p-4 sm:border-b-0 sm:border-r sm:p-5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Opens</p>
                      <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{sprintEventLabels.startLabel}</p>
                    </div>
                    <div className="p-4 sm:p-5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Closes</p>
                      <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{sprintEventLabels.endLabel}</p>
                    </div>
                  </div>
                </div>

                <p className="mt-6 max-w-2xl text-lg font-semibold italic leading-8 text-slate-500 sm:text-xl mx-auto lg:mx-0">
                  Gradlify Sprint: one {PRIZE_PHRASE} for whoever has the highest leaderboard score when the month ends. Only correct answers from full mock exams count; practice does not. Full rules on Sprint details.
                </p>

                <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Button
                    type="button"
                    size="lg"
                    className={cn(
                      "rounded-full px-8 font-black uppercase tracking-wide",
                      isEnglish ? "bg-amber-600 hover:bg-amber-700" : "",
                    )}
                    onClick={() => navigate("/sprint-details")}
                  >
                    Sprint details &amp; rules
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="rounded-full font-black uppercase" onClick={() => navigate("/connect")}>
                    Connect leaderboard
                  </Button>
                </div>
              </div>

              <div className="lg:pt-14">
                <div className="relative">
                  <div
                    className={cn(
                      "absolute -inset-1 rounded-[32px] opacity-50 blur-xl",
                      isEnglish ? "bg-amber-200" : "bg-orange-200",
                    )}
                  />
                  <div className="relative overflow-hidden rounded-[32px] border border-border/60 bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Prize</p>
                        <p className="mt-2 font-serif text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                          {PRIZE_PHRASE}
                        </p>
                      </div>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-orange-500 text-white shadow-md">
                        <Gift className="h-7 w-7" />
                      </div>
                    </div>
                    <ul className="mt-8 space-y-3 border-t border-border/60 pt-8">
                      {["Single winner", "Digital delivery to winner’s email", "Subject to Amazon’s terms"].map((line) => (
                        <li key={line} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <CheckCircle2 className={cn("h-4 w-4 shrink-0", isEnglish ? "text-amber-600" : "text-primary")} />
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/90 to-white p-5">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Schedule</p>
                        {sprintEventLabels.localTimeZoneId ? (
                          <span className="max-w-[70%] truncate rounded-md bg-white/80 px-2 py-0.5 font-mono text-[9px] font-medium text-slate-500 ring-1 ring-slate-200/80 sm:max-w-[55%]">
                            {sprintEventLabels.localTimeZoneId}
                          </span>
                        ) : null}
                      </div>
                      <div className="relative pl-1">
                        <div className="absolute left-[7px] top-2 bottom-6 w-px bg-gradient-to-b from-emerald-300 via-slate-200 to-orange-300" aria-hidden />
                        <div className="relative flex gap-3 pb-6">
                          <span className="relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-emerald-500 shadow-sm ring-1 ring-emerald-200" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Open</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">{sprintEventLabels.startLabel}</p>
                          </div>
                        </div>
                        <div className="relative flex gap-3">
                          <span className="relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-orange-500 shadow-sm ring-1 ring-orange-200" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Close</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">{sprintEventLabels.endLabel}</p>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 border-t border-slate-200/70 pt-4 text-center text-xs font-medium leading-relaxed text-slate-500">
                        Full rules and winner timing on{" "}
                        <span className="font-semibold text-slate-700">Sprint details</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-14 lg:items-start">
              <div className="lg:sticky lg:top-24">
                <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <ListOrdered className={cn("h-3.5 w-3.5", isEnglish ? "text-amber-600" : "text-primary")} aria-hidden />
                  How it works
                </div>
                <h2 className="mt-3 font-serif text-3xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-4xl">
                  Competition essentials
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                  Five things every entrant should know. Dates and the full legal brief live on{" "}
                  <Link
                    to="/sprint-details"
                    className={cn(
                      "font-semibold underline decoration-slate-300 underline-offset-2 transition-colors hover:decoration-slate-500",
                      isEnglish ? "text-amber-700" : "text-primary",
                    )}
                  >
                    Sprint details
                  </Link>
                  {". This section is the quick scan."}
                </p>
              </div>

              <div
                className={cn(
                  "overflow-hidden rounded-2xl border shadow-sm",
                  isEnglish
                    ? "border-amber-200/50 bg-white shadow-amber-900/[0.03]"
                    : "border-slate-200/80 bg-white shadow-slate-900/[0.04]",
                )}
              >
                <ol className="m-0 list-none divide-y divide-slate-100 p-0">
                  {essentials.map((item, index) => (
                    <li key={item.title}>
                      <div className="flex gap-4 p-5 sm:gap-5 sm:p-6">
                        <div className="shrink-0 pt-0.5">
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black tabular-nums shadow-sm",
                              isEnglish
                                ? "bg-gradient-to-br from-amber-50 to-white text-amber-900 ring-1 ring-amber-100"
                                : "bg-gradient-to-br from-blue-50 to-white text-primary ring-1 ring-blue-100/80",
                            )}
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[13px] font-bold tracking-tight text-slate-900 sm:text-sm">{item.title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{item.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <footer className="mx-auto grid max-w-6xl grid-cols-1 gap-10 border-t border-border px-5 pt-10 sm:grid-cols-2 sm:px-8">
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase text-slate-950">Eligibility</h4>
              <p className="text-sm leading-7 text-slate-500">
                Open to participants who meet the sprint criteria published on Sprint details. Staff accounts and
                duplicate or fraudulent entries may be disqualified at Gradlify’s discretion.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase text-slate-950">Prize</h4>
              <p className="text-sm leading-7 text-slate-500">
                One prize: a <span className="font-bold text-slate-950">{PRIZE_PHRASE}</span>. No cash alternative
                alternative unless we state otherwise on the Sprint page. Amazon is not a sponsor of this promotion.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </ForceTheme>
  );
}
