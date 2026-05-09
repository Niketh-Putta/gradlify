import { BarChart3, CheckCircle2, Clock3, FileText, ListChecks, Medal, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const metricCards = [
  { label: "Your score", value: "Hidden", sub: "released after checks", icon: FileText },
  { label: "Percentile", value: "Pending", sub: "cohort comparison", icon: Medal },
  { label: "Cohort mean", value: "Pending", sub: "all submissions", icon: Users },
  { label: "Question report", value: "70 items", sub: "item-level analysis", icon: ListChecks },
];

const distributionBars = [18, 28, 42, 58, 74, 88, 76, 61, 39, 22];

const sectionRows = [
  { label: "Comprehension", status: "Processing", width: "68%" },
  { label: "SPaG accuracy", status: "Processing", width: "54%" },
  { label: "Timing profile", status: "Processing", width: "76%" },
];

const questionRows = [
  { question: "Q12", label: "Inference", missed: "Cohort miss rate pending" },
  { question: "Q31", label: "Punctuation", missed: "Common distractor pending" },
  { question: "Q58", label: "Vocabulary", missed: "Difficulty index pending" },
];

export default function LiveMockAnalytics() {
  return (
    <main className="min-h-screen bg-[#faf9f4] px-3 py-3 text-slate-950 sm:px-4 sm:py-4">
      <section className="mx-auto w-full max-w-6xl rounded-[16px] border border-slate-200/80 bg-white px-3 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:px-4">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-700">
              Live mock analytics
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[32px]">
              11+ English complete mock exam
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
              Your submission is locked. The visual cohort report will unlock after moderation and score processing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Submitted
            </span>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
              <Clock3 className="h-3.5 w-3.5" />
              Processing
            </span>
          </div>
        </div>

        <div className="grid gap-3 pt-3 lg:grid-cols-4">
          {metricCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <card.icon className="h-4 w-4 text-blue-600" />
                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Pending
                </span>
              </div>
              <div className="mt-3 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-950">{card.value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 pt-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#fbfdff_0%,#ffffff_62%,#f8fbff_100%)] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Cohort distribution
                </h2>
                <p className="text-xs text-slate-500">A visual score curve will appear here after all scripts are processed.</p>
              </div>
              <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:inline-flex">
                Preview
              </span>
            </div>

            <div className="flex h-40 items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 pb-3 pt-4">
              {distributionBars.map((height, index) => (
                <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-[linear-gradient(180deg,#2563eb_0%,#93c5fd_100%)] opacity-80"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] font-semibold text-slate-400">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-3">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Readiness snapshot
              </h2>
              <p className="text-xs text-slate-500">Your final band will compare you to the live cohort.</p>
            </div>

            <div className="space-y-2">
              {sectionRows.map((row) => (
                <div key={row.label} className="rounded-lg bg-slate-50/80 px-3 py-2">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{row.label}</span>
                    <span className="text-slate-400">{row.status}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-blue-500/70" style={{ width: row.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 pt-3 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950">
              <ListChecks className="h-4 w-4 text-blue-600" />
              Question-level review
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Wrong answers will become a ranked checklist with cohort miss rates.
            </p>
            <div className="mt-3 space-y-2">
              {questionRows.map((row) => (
                <div key={row.question} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-blue-700">
                      {row.question}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{row.label}</div>
                      <div className="text-[11px] text-slate-500">{row.missed}</div>
                    </div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] p-3">
            <h2 className="text-base font-bold tracking-tight text-slate-950">Release workflow</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {["Collect attempts", "Moderate answers", "Release analytics"].map((step, index) => (
                <div key={step} className="rounded-lg bg-white px-3 py-3 text-center shadow-sm ring-1 ring-slate-200">
                  <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-blue-500/70" />
                  <div className="text-xs font-semibold text-slate-800">{step}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              Scores stay hidden until every live attempt can be compared fairly against the same paper.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:justify-end">
          <Link to="/live-mock-exams">
            <Button variant="outline" className="h-10 w-full rounded-xl sm:w-auto">
              Back to live mock
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
