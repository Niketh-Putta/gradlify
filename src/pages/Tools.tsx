import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ToolsNav } from "@/components/ToolsNav";
import { ForceTheme } from "@/components/ForceTheme";

const TOOLS_URL = "https://gradlify.com/free-tools";
const TOOLS_TITLE = "Free 11+ Tools by Gradlify";
const TOOLS_DESCRIPTION =
  "Free 11+ tools for timed arithmetic, readiness estimators, and revision planning. Built for clarity, speed, and exam alignment.";
const OG_IMAGE_URL = "https://gradlify.com/og-logo-v2.png";

const TOOLS_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Free 11+ Tools by Gradlify",
  url: TOOLS_URL,
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
              Focused tools built for 11+ students who want fast answers, clearer targets, and smarter revision.
            </p>
          </header>

          <section className="grid gap-5 lg:grid-cols-3">


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


        </main>
      </div>
    </ForceTheme>
  );
}
