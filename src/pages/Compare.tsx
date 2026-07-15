import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ExternalLink, HelpCircle, Minus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/LogoMark";
import { PREMIUM_PRICING, formatGbp } from "@/lib/pricing";

const CHECKED_ON = "6 June 2026";

type Verdict = "yes" | "partial" | "no" | "not-advertised";

type Provider = {
  name: string;
  label: string;
  price: string;
  bestFor: string;
  caveat: string;
  source?: string;
  highlighted?: boolean;
  values: Record<string, Verdict>;
};

const rows = [
  {
    key: "mathsEnglish",
    label: "Maths and English 11+ practice",
    detail: "Covers the core skills most selective school prep needs.",
  },
  {
    key: "timedMocks",
    label: "Full timed mocks",
    detail: "Useful because exam stamina and timing are usually separate problems from knowledge.",
  },
  {
    key: "parentReports",
    label: "Parent-friendly reports",
    detail: "Clear weak topics and next steps, not just a score.",
  },
  {
    key: "dailySystem",
    label: "Daily self-serve system",
    detail: "Designed for regular independent practice without booking sessions.",
  },
  {
    key: "liveTutor",
    label: "Live tutor accountability",
    detail: "A human tutor checking in every week.",
  },
  {
    key: "founderContext",
    label: "Built by someone who sat the selective school process",
    detail: "Useful when the prep needs to feel practical, not generic.",
  },
] as const;

const providers: Provider[] = [
  {
    name: "Gradlify",
    label: "Best all-round focused 11+ system",
    price: `${formatGbp(PREMIUM_PRICING.lifetime)} lifetime`,
    bestFor: "Families who want the full improvement loop: daily practice, full mocks, weak-topic diagnosis, parent reports, and founder-led 11+ strategy without tutor-level pricing.",
    caveat: "The strongest choice when your child can practise independently and parents want clear proof of what to fix next.",
    source: "/11-plus",
    highlighted: true,
    values: {
      mathsEnglish: "yes",
      timedMocks: "yes",
      parentReports: "yes",
      dailySystem: "yes",
      liveTutor: "no",
      founderContext: "yes",
    },
  },
  {
    name: "Atom Learning",
    label: "Large adaptive 7-11+ platform",
    price: "Published 11+ plans from £39.99/mo; exam prep plan shown at £69.99/mo",
    bestFor: "Parents who want a large general platform and are comfortable paying materially more for broad adaptive learning.",
    caveat: "Broad and established, but more expensive than Gradlify and less personally built around Niketh’s selective-school path.",
    values: {
      mathsEnglish: "yes",
      timedMocks: "yes",
      parentReports: "yes",
      dailySystem: "yes",
      liveTutor: "no",
      founderContext: "not-advertised",
    },
  },
  {
    name: "Explore Learning",
    label: "Tuition centre membership",
    price: "Pricing page shows £29 per session and £124 per month examples; prices may vary by centre",
    bestFor: "Families who mainly need a live adult, a centre routine, and external accountability.",
    caveat: "Useful for accountability, but far less efficient if what you need is targeted mock practice and weak-topic clarity.",
    source: "https://www.explorelearning.co.uk/pricing/",
    values: {
      mathsEnglish: "yes",
      timedMocks: "partial",
      parentReports: "yes",
      dailySystem: "partial",
      liveTutor: "yes",
      founderContext: "not-advertised",
    },
  },
  {
    name: "Bond Online",
    label: "Low-cost question bank",
    price: "Published at £7.50 per month for a single user",
    bestFor: "Families who want cheap extra questions on top of a separate plan.",
    caveat: "Cheap question volume is not the same as a complete improvement system with reports, strategy, and clear next steps.",
    source: "https://www.bond11plus.co.uk/bond-online",
    values: {
      mathsEnglish: "yes",
      timedMocks: "yes",
      parentReports: "partial",
      dailySystem: "yes",
      liveTutor: "no",
      founderContext: "not-advertised",
    },
  },
  {
    name: "Books and PDFs",
    label: "Offline worksheets",
    price: "Usually lowest upfront cost",
    bestFor: "Families who already know exactly what to practise and prefer paper.",
    caveat: "Cheap upfront, but expensive in wasted time if parents have to diagnose weak topics and build the plan manually.",
    source: "/free-resources",
    values: {
      mathsEnglish: "yes",
      timedMocks: "partial",
      parentReports: "no",
      dailySystem: "no",
      liveTutor: "no",
      founderContext: "no",
    },
  },
];

const statusMeta: Record<Verdict, { label: string; className: string; icon: JSX.Element }> = {
  yes: {
    label: "Yes",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: <Check className="h-4 w-4" />,
  },
  partial: {
    label: "Partial",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: <Minus className="h-4 w-4" />,
  },
  no: {
    label: "No",
    className: "bg-slate-100 text-slate-500 ring-slate-200",
    icon: <X className="h-4 w-4" />,
  },
  "not-advertised": {
    label: "Not advertised",
    className: "bg-slate-100 text-slate-500 ring-slate-200",
    icon: <HelpCircle className="h-4 w-4" />,
  },
};

function StatusPill({ verdict }: { verdict: Verdict }) {
  const meta = statusMeta[verdict];
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-black ring-1 ${
        verdict === "yes" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : meta.className
      }`}
      aria-label={meta.label}
      title={meta.label}
    >
      {verdict === "yes" ? "✓" : verdict === "partial" ? "–" : "×"}
    </span>
  );
}

export default function Compare() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(239,68,68,0.14),transparent_62%),radial-gradient(900px_420px_at_84%_0%,rgba(251,191,36,0.18),transparent_66%),#fffaf5] text-slate-900">
      <Helmet>
        <title>Gradlify vs 11+ Competitors | Why Gradlify Wins for Focused 11+ Prep</title>
        <meta
          name="description"
          content="See why Gradlify is the stronger focused 11+ prep choice compared with broad platforms, tuition centres, question banks, and traditional worksheets."
        />
        <link rel="canonical" href="https://gradlify.com/compare" />
      </Helmet>

      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/11-plus" className="flex items-center gap-3">
            <LogoMark className="h-9 w-9 shadow-sm" variant="light" />
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">Gradlify</div>
              <div className="hidden text-xs font-medium text-slate-500 sm:block">11+ Practised Properly.</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/11-plus" className="hidden text-sm font-bold text-slate-600 transition hover:text-slate-950 sm:inline">
              11+
            </Link>
            <Button asChild className="rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-300 px-4 text-sm font-black text-white shadow-lg shadow-orange-500/25">
              <Link to="/11-plus?auth=signup">
                Start free practice <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <header className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-[#E65C2B]">Why Gradlify wins</p>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-[#0B1528] sm:text-6xl lg:text-7xl">
              Gradlify is built to beat generic 11+ prep.
            </h1>
          </div>
          <div className="rounded-[28px] border border-orange-100 bg-white/75 p-6 shadow-[0_24px_70px_-38px_rgba(154,52,18,0.45)] backdrop-blur">
            <p className="text-lg font-semibold leading-8 text-slate-700">
              Most 11+ options either sell question volume, expensive tutoring, or broad adaptive learning. Gradlify is narrower and sharper: mocks, weak-topic diagnosis, parent clarity, and a plan built by someone who actually went through the selective-school process.
            </p>
            <p className="mt-4 text-sm font-bold text-slate-500">Last checked: {CHECKED_ON}</p>
          </div>
        </header>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ["Clear winner for focused prep", `${formatGbp(PREMIUM_PRICING.lifetime)} lifetime for the full practice loop`],
            ["Built around outcomes", "Mocks, weak topics, parent reports, next steps"],
            ["Founder-led advantage", "Built from real QE Boys and selective-school experience"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">{label}</p>
              <p className="mt-3 text-xl font-black leading-snug text-slate-950">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.35)]">
          <div className="overflow-hidden">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="w-[42%] px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 sm:w-[36%] sm:px-5 sm:py-5 sm:text-xs sm:tracking-[0.18em]">Features</th>
                  {providers.map((provider) => (
                    <th
                      key={provider.name}
                      className={`px-1 py-4 text-center align-top sm:px-3 sm:py-5 ${provider.highlighted ? "bg-orange-50/80" : ""}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-950 sm:text-sm sm:tracking-[0.12em]">
                        {provider.name === "Explore Learning" ? "Explore" : provider.name === "Atom Learning" ? "Atom" : provider.name === "Bond Online" ? "Bond" : provider.name === "Books and PDFs" ? "Books" : provider.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-3 text-xs font-black leading-snug text-slate-950 sm:px-5 sm:py-4 sm:text-sm">£149.99 lifetime</td>
                  {providers.map((provider) => (
                    <td key={`${provider.name}-price`} className={`px-1 py-3 text-center align-top sm:px-3 sm:py-4 ${provider.highlighted ? "bg-orange-50/50" : ""}`}>
                      <StatusPill verdict={provider.name === "Gradlify" || provider.name === "Bond Online" || provider.name === "Books and PDFs" ? "yes" : "no"} />
                    </td>
                  ))}
                </tr>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100">
                    <td className="px-3 py-3 align-top sm:px-5 sm:py-4">
                      <div className="text-xs font-black leading-snug text-slate-950 sm:text-sm">{row.label}</div>
                    </td>
                    {providers.map((provider) => (
                      <td key={`${provider.name}-${row.key}`} className={`px-1 py-3 text-center align-top sm:px-3 sm:py-4 ${provider.highlighted ? "bg-orange-50/50" : ""}`}>
                        <StatusPill verdict={provider.values[row.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">The blunt answer</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Gradlify should be the default choice before paying hundreds for generic prep.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-slate-600">
              If your child needs someone physically sitting beside them every week, a tutor can help. But if the real problem is knowing what to practise, how exam-ready they are, and what parents should do next, Gradlify is the more impressive and efficient product.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-300 px-6 py-6 text-base font-black text-white shadow-xl shadow-orange-500/25">
                <Link to="/11-plus?auth=signup">
                  Start free practice <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-slate-200 px-6 py-6 text-base font-black text-slate-700">
                <Link to="/11-plus#pricing">View plans</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[28px] border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-700">Important context</p>
            <div className="mt-5 space-y-4">
              {providers.map((provider) => (
                <div key={`${provider.name}-caveat`} className="rounded-2xl border border-white/70 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{provider.name}</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{provider.caveat}</p>
                    </div>
                    {provider.source && (
                      <a
                        href={provider.source}
                        target={provider.source.startsWith("http") ? "_blank" : undefined}
                        rel={provider.source.startsWith("http") ? "noreferrer" : undefined}
                        className="shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-orange-600"
                        aria-label={`Open source for ${provider.name}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[24px] border border-slate-200 bg-white/70 p-5 text-sm font-medium leading-7 text-slate-600">
          <p className="font-black text-slate-900">Sources checked</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <a className="text-orange-700 underline underline-offset-4" href="https://www.explorelearning.co.uk/pricing/" target="_blank" rel="noreferrer">Explore Learning pricing</a>
            <a className="text-orange-700 underline underline-offset-4" href="https://www.bond11plus.co.uk/bond-online" target="_blank" rel="noreferrer">Bond Online</a>
            <Link className="text-orange-700 underline underline-offset-4" to="/11-plus">Gradlify 11+</Link>
          </div>
          <p className="mt-3">
            Where a feature is not clearly advertised, the table says "Not advertised" rather than assuming it does not exist.
          </p>
        </section>
      </main>
    </div>
  );
}
