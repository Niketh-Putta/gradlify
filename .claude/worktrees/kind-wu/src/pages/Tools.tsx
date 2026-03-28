import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ToolsNav } from "@/components/ToolsNav";
import { ForceTheme } from "@/components/ForceTheme";

const TOOLS_URL = "https://gradlify.com/free-tools";
const TOOLS_TITLE = "Free GCSE Maths Tools by Gradlify";
const TOOLS_DESCRIPTION =
  "Free GCSE Maths tools for grade boundaries, topic weakness diagnostics, and grade target planning. Built for clarity, speed, and exam alignment.";
const OG_IMAGE_URL = "https://gradlify.com/og-logo-v2.png";

const TOOL_LINKS = [
  {
    name: "GCSE Maths Grade Boundaries Calculator",
    url: "https://gradlify.com/gcse-maths-grade-boundaries",
  },
  {
    name: "GCSE Maths Topic Weakness Test",
    url: "https://gradlify.com/free-tools/gcse-maths-topic-weakness-test",
  },
  {
    name: "GCSE Maths Grade Target Planner",
    url: "https://gradlify.com/free-tools/gcse-maths-grade-target-planner",
  },
];

const TOOLS_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Free GCSE Maths Tools by Gradlify",
  url: TOOLS_URL,
  itemListElement: TOOL_LINKS.map((tool, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: tool.name,
    url: tool.url,
  })),
};

export default function Tools() {
  return (
    <ForceTheme theme="light">
      <div className="min-h-screen bg-white text-slate-900" style={{ colorScheme: "light" }}>
        <Helmet>
          <title>{TOOLS_TITLE}</title>
          <meta name="description" content={TOOLS_DESCRIPTION} />
          <meta name="robots" content="index, follow, max-image-preview:large" />
          <link rel="canonical" href={TOOLS_URL} />

          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Gradlify" />
          <meta property="og:title" content={TOOLS_TITLE} />
          <meta property="og:description" content={TOOLS_DESCRIPTION} />
          <meta property="og:url" content={TOOLS_URL} />
          <meta property="og:image" content={OG_IMAGE_URL} />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={TOOLS_TITLE} />
          <meta name="twitter:description" content={TOOLS_DESCRIPTION} />
          <meta name="twitter:image" content={OG_IMAGE_URL} />

          <script type="application/ld+json">{JSON.stringify(TOOLS_STRUCTURED_DATA)}</script>
        </Helmet>
        <ToolsNav label="Free Tools by Gradlify" lockTheme="light" />

        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <header className="mb-10 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Free tools</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Free Tools by Gradlify
            </h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Focused tools built for GCSE Maths students who want fast answers, clearer targets, and smarter revision.
            </p>
          </header>

          <section className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-lg shadow-slate-200/40 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    GCSE Maths Grade Boundaries Calculator
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Estimate your grade instantly using real past grade boundaries.
                  </p>
                </div>
              </div>
              <Link
                to="/gcse-maths-grade-boundaries"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-105"
              >
                Open calculator
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    GCSE Maths Topic Weakness Test
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Answer 10 questions and find the topics you need to focus on.
                  </p>
                </div>
              </div>
              <Link
                to="/free-tools/gcse-maths-topic-weakness-test"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-105"
              >
                Start test
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    GCSE Maths Grade Target Planner
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Find out how many marks you need to reach your target grade.
                  </p>
                </div>
              </div>
              <Link
                to="/free-tools/gcse-maths-grade-target-planner"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-105"
              >
                Plan my grade
              </Link>
            </div>

            {[
              {
                title: "11+ Timed Arithmetic Generator",
                subtitle: "Fresh arithmetic drills, timed to sprint-ready pacing.",
                track: "11+",
              },
              {
                title: "11+ Readiness Estimator",
                subtitle: "Track your mock performance and see when you’re ready.",
                track: "11+",
              },
              {
                title: "11+ Revision Planner Generator",
                subtitle: "Build a focused week of practice that matches exams.",
                track: "11+",
              },
            ].map(({ title, subtitle, track }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-md shadow-slate-200/30 opacity-70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Coming soon
                      </span>
                      <span
                        className={`rounded-full px-2 text-[11px] font-semibold ${
                          track === "11+" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {track}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    Coming soon
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400"
                >
                  Coming soon
                </button>
              </div>
            ))}
          </section>

          <p className="mt-8 text-sm text-slate-500">
            More tools coming soon. We’re building focused helpers for grades, revision, and exam readiness.
          </p>

          <section className="mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Quick routes
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <a
                href="/free-tools/gcse-maths-grade-target-planner"
                className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300"
              >
                <span className="font-semibold text-slate-900">
                  Plan your next grade → Grade Target Planner
                </span>
                <span className="mt-1 block text-slate-600">
                  See how many marks you need to move up a grade.
                </span>
              </a>
              <a
                href="/gcse-maths-grade-boundaries"
                className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300"
              >
                <span className="font-semibold text-slate-900">
                  Check published thresholds → Grade Boundaries Calculator
                </span>
                <span className="mt-1 block text-slate-600">
                  Convert marks to grades by board and year.
                </span>
              </a>
              <a
                href="/free-tools/gcse-maths-topic-weakness-test"
                className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300"
              >
                <span className="font-semibold text-slate-900">
                  Find your weakest topics → Topic Weakness Test
                </span>
                <span className="mt-1 block text-slate-600">
                  Get a topic-by-topic signal in 10 questions.
                </span>
              </a>
            </div>
          </section>
        </main>
      </div>
    </ForceTheme>
  );
}
