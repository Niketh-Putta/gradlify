import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

type FAQItem = {
  question: string;
  answer: string;
};

interface FreeToolSEOProps {
  title: string;
  description: string;
  canonicalPath: string;
  toolName: string;
  intro: string;
  helpTitle: string;
  helpText: string;
  faqItems: FAQItem[];
  children: React.ReactNode;
  ogImageUrl?: string;
}

const SITE_URL = "https://gradlify.com";
const DEFAULT_OG_IMAGE = "https://gradlify.com/og-logo-v2.png";

export function FreeToolSEO({
  title,
  description,
  canonicalPath,
  toolName,
  intro,
  helpTitle,
  helpText,
  faqItems,
  children,
  ogImageUrl = DEFAULT_OG_IMAGE,
}: FreeToolSEOProps) {
  const toolUrl = `${SITE_URL}${canonicalPath}`;
  const canonicalUrl = toolUrl;

  const webAppData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: toolName,
    url: toolUrl,
    applicationCategory: "EducationApplication",
    operatingSystem: "Web",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
    },
    description,
    publisher: {
      "@type": "Organization",
      name: "Gradlify",
      url: SITE_URL,
    },
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Free Tools",
        item: `${SITE_URL}/free-tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: toolName,
        item: toolUrl,
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Gradlify" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImageUrl} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImageUrl} />

        <script type="application/ld+json">{JSON.stringify(webAppData)}</script>
        <script type="application/ld+json">{JSON.stringify(faqData)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbData)}</script>
      </Helmet>

      <div className="mx-auto w-full max-w-5xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 flex max-w-3xl items-center">
          <Link
            to="/free-tools"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← Back to Free Tools
          </Link>
        </div>

        <header className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Free GCSE Maths tool
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {toolName}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{intro}</p>
        </header>

        <section className="mx-auto mt-6 max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm leading-7 text-slate-700 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">{helpTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{helpText}</p>
        </section>
      </div>

      {children}
    </>
  );
}
