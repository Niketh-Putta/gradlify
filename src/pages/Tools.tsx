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
    <ForceTheme theme="dark">
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(185,28,28,0.25),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(234,88,12,0.2),transparent_68%),#04050a] text-white" style={{ colorScheme: "dark" }}>
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
        <ToolsNav label="Free 11+ Tools" lockTheme="dark" />

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8 relative z-10">
          <header className="mb-16 max-w-2xl">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-amber-500/80 mb-4">
              Free tools
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446] leading-[1.1]">
              Free Tools by Gradlify
            </h1>
            <p className="mt-6 text-base sm:text-lg font-medium leading-relaxed text-slate-300">
              Focused tools built for 11+ students who want fast answers, clearer targets, and smarter revision.
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-3">


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
                className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-xl p-6 sm:p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] group relative overflow-hidden transition-all duration-500 hover:border-orange-500/30 hover:shadow-[0_48px_80px_-16px_rgba(245,158,11,0.12)] opacity-85 hover:opacity-100"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent z-0 pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                        Coming soon
                      </span>
                      <span
                        className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm uppercase tracking-widest"
                      >
                        {track}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight leading-snug">{title}</h3>
                  </div>
                </div>
                <p className="relative z-10 mt-3 text-sm font-medium leading-relaxed text-slate-400">{subtitle}</p>
                <button
                  type="button"
                  disabled
                  className="relative z-10 mt-8 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs sm:text-sm font-bold tracking-wide text-slate-400 uppercase transition-colors"
                >
                  Coming soon
                </button>
              </div>
            ))}
          </section>

          <p className="mt-12 text-sm font-medium text-slate-500 max-w-2xl">
            More tools coming soon. We're building focused helpers for grades, revision, and 11+ exam readiness.
          </p>


        </main>
      </div>
    </ForceTheme>
  );
}
