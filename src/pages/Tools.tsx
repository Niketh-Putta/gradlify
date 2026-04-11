import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ToolsNav } from "@/components/ToolsNav";
import { Download, FileText } from "lucide-react";

const TOOLS_URL = "https://gradlify.com/free-resources";
const TOOLS_TITLE = "Free 11+ PDF Resources by Gradlify";
const TOOLS_DESCRIPTION =
  "Download free 11+ PDF resources for Maths, English, Creative Writing, Verbal Reasoning, and Non-Verbal Reasoning.";
const OG_IMAGE_URL = "https://gradlify.com/og-logo-v2.png";
const DRIVE_LINK = "https://drive.google.com/drive/folders/18zm3eRDKyJsb4ATgyy7WiIQ_9mKLGjnv?usp=drive_link";

const TOOLS_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Free 11+ Resources by Gradlify",
  url: TOOLS_URL,
};

const PDF_CATEGORIES = [
  {
    id: "school-bundles",
    title: "School Bundles & QE Guides",
    theme: "amber",
    description: "Premium, hyper-focused PDF packs tailored for specific competitive school entrances.",
    items: [
      { title: "QE Admissions Details", subtitle: "Essential admissions info", type: "PDF Bundle", link: "/revision-guides/The Level Field - QE BUNDLE - Admissions Details(1).pdf" },
      { title: "Maths Distractors Guide", subtitle: "Critical maths technique", type: "PDF Bundle", link: "/revision-guides/The Level Field - QE BUNDLE - Distractors In Maths(2).pdf" },
      { title: "Answer Sheet Protocols", subtitle: "Precision marking rules", type: "PDF Bundle", link: "/revision-guides/The Level Field - QE BUNDLE - Answer Sheet Precision Protocols(3).pdf" },
      { title: "English Paper Strategy", subtitle: "Advanced paper tactics", type: "PDF Bundle", link: "/revision-guides/The Level Field - QE BUNDLE - How to Tackle the English Paper(4).pdf" }
    ]
  },
  {
    id: "english",
    title: "English",
    theme: "sky",
    description: "High-quality passage extracts, comprehension questions, and SPaG worksheets.",
    items: [
      { title: "Creative Writing Overview", subtitle: "Mastering the narrative", type: "PDF Pack", link: "/revision-guides/The Level Field - Creative Writing Overview (1).pdf" },
      { title: "Comprehension Guide", subtitle: "Understanding passages", type: "PDF Pack", link: "/revision-guides/The Level Field - Comprehension - Understanding Passages (1).pdf" },
      { title: "Creative Writing Dictionary", subtitle: "Expanded vocabulary", type: "PDF Pack", link: "/revision-guides/The Level Field - Creative Writing Dictionary (2).pdf" },
      { title: "Comprehension Tips 1-5", subtitle: "Core techniques", type: "PDF Pack", link: "/revision-guides/The Level Field - Comprehension Tips 1-5 (1).pdf" },
      { title: "Comprehension Questions", subtitle: "Practice booklet", type: "PDF Pack", link: "/revision-guides/The Level Field - Comprehension Questions Booklet (1).pdf" },
      { title: "SPaG Notes", subtitle: "Grammar architecture", type: "PDF Pack", link: "/revision-guides/The Level Field - SPaG Notes1 (1).pdf" }
    ]
  },
  {
    id: "maths",
    title: "Mathematics",
    theme: "blue",
    description: "Core arithmetic, multi-step problem solving, and geometry preparation.",
    items: [
      { title: "Mathematics Intro", subtitle: "Free 11+ material", type: "PDF Pack", link: "/revision-guides/Level Field - Mathematics Intro - Free 11+ Material  (2).pdf" },
      { title: "Proportion & Scaling (Content)", subtitle: "Subject theory", type: "PDF Pack", link: "/revision-guides/The Level Field - Proportion and Scaling (CONTENT) (1).pdf" },
      { title: "Proportion & Scaling (Questions)", subtitle: "Practice set", type: "PDF Pack", link: "/revision-guides/The Level Field - Proportion and Scaling (QUESTIONS) (1).pdf" },
      { title: "Essential Mathematics Pack 1", subtitle: "Drive Download", type: "PDF Pack", link: "https://drive.google.com/uc?export=download&id=150kxfSdSkicNcKpRtaFe8g-nxBFstF5G" },
      { title: "Essential Mathematics Pack 2", subtitle: "Drive Download", type: "PDF Pack", link: "https://drive.google.com/uc?export=download&id=1GJIhxM8YAE0JwnMnb6v2CM41BKyfXlT0" }
    ]
  },
  {
    id: "vr",
    title: "Verbal Reasoning",
    theme: "amber",
    description: "Code breaking, logic problems, and advanced vocabulary.",
    items: [
      { title: "VR Word & Meaning Guide", subtitle: "Logic & Vocab", type: "PDF Pack", link: "/revision-guides/The Level Field - VR - Word and Meaning Questions Guide.pdf" },
      { title: "VR Overview", subtitle: "Subject summary", type: "PDF Pack", link: "/revision-guides/The Level Field - VR Overview (1).pdf" },
      { title: "VR Word & Meaning Pt. 3", subtitle: "Advanced practice", type: "PDF Pack", link: "/revision-guides/The Level Field - VR - Word and Meaning Questions pt3.pdf" },
      { title: "VR Word & Meaning Pt. 1", subtitle: "Practice set", type: "PDF Pack", link: "/revision-guides/The Level Field - VR - Word and Meaning Practice Questions - Pt1.pdf" }
    ]
  },
  {
    id: "nvr",
    title: "Non-Verbal Reasoning",
    theme: "emerald",
    description: "Spatial awareness, sequences, and transformational geometry.",
    items: [
      { title: "NVR Overview", subtitle: "Spatial logic", type: "PDF Pack", link: "/revision-guides/The Level Field - NVR Overview.pdf" }
    ]
  }
];

export default function Tools() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(239,68,68,0.18),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(251,146,60,0.2),transparent_68%),#fff7ed] text-slate-900 dark:bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(185,28,28,0.25),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(234,88,12,0.2),transparent_68%),#04050a] dark:text-white transition-colors duration-300">
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
      
      <ToolsNav />

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8 relative z-10">
        <header className="mb-16 max-w-2xl">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-[#E65C2B] dark:text-amber-500/80 mb-4">
            Free resources
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446] leading-[1.1]">
            Free 11+ PDF Drops
          </h1>
          <p className="mt-6 text-base sm:text-lg font-medium leading-relaxed text-[#334155] dark:text-slate-300">
            Download our beautifully formatted, high-quality PDFs covering every core 11+ subject. No signup required—just click to grab them from Google Drive.
          </p>
        </header>

        <div className="space-y-24">
          {PDF_CATEGORIES.map((category) => (
            <section key={category.id} className="scroll-mt-32" id={category.id}>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                  {category.title}
                  <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest border
                    ${category.theme === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300' : ''}
                    ${category.theme === 'sky' ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300' : ''}
                    ${category.theme === 'purple' ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300' : ''}
                    ${category.theme === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300' : ''}
                    ${category.theme === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : ''}
                  `}>
                    11+ PDFs
                  </span>
                </h2>
                <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl text-sm sm:text-base font-medium">
                  {category.description}
                </p>
              </div>

              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.items.map((item, idx) => (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    key={idx}
                    className="group relative flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white/60 dark:bg-black/20 dark:border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-sm dark:shadow-[0_8px_32px_-16px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-60 transition-opacity duration-500
                      ${category.theme === 'blue' ? 'bg-blue-500' : ''}
                      ${category.theme === 'sky' ? 'bg-sky-500' : ''}
                      ${category.theme === 'purple' ? 'bg-purple-500' : ''}
                      ${category.theme === 'amber' ? 'bg-amber-500' : ''}
                      ${category.theme === 'emerald' ? 'bg-emerald-500' : ''}
                    `} />
                    
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-2.5 rounded-xl border
                          ${category.theme === 'blue' ? 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400' : ''}
                          ${category.theme === 'sky' ? 'border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400' : ''}
                          ${category.theme === 'purple' ? 'border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400' : ''}
                          ${category.theme === 'amber' ? 'border-amber-100 bg-amber-50 text-orange-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-orange-400' : ''}
                          ${category.theme === 'emerald' ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400' : ''}
                        `}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                          {item.type}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors
                      ${category.theme === 'blue' ? 'text-blue-600 dark:text-blue-400' : ''}
                      ${category.theme === 'sky' ? 'text-sky-600 dark:text-sky-400' : ''}
                      ${category.theme === 'purple' ? 'text-purple-600 dark:text-purple-400' : ''}
                      ${category.theme === 'amber' ? 'text-orange-600 dark:text-orange-400' : ''}
                      ${category.theme === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                    ">
                      <span className="group-hover:underline decoration-2 underline-offset-4">Download PDF</span>
                      <Download className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-24 p-8 sm:p-12 rounded-[32px] border border-amber-200/50 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-950 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
              Need the full School Bundles?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-8">
              Access entire PDF bundles specifically targeted for Queen Elizabeth's, grammar schools, and independent school entrance formats.
            </p>
            <a href={DRIVE_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/30 hover:to-orange-500 transition-transform hover:-translate-y-0.5">
              Access Full Bundles <Download className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
