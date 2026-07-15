import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle, ShieldCheck, Sparkles, MousePointer2, Compass, Layers, SlidersHorizontal, AlertTriangle, Trophy, Volume2, VolumeX, Pause } from "lucide-react";
import { PREMIUM_PRICING, ULTRA_PRICING, formatGbp } from "@/lib/pricing";
import { LifetimePromoBanner } from "@/components/LifetimePromoBanner";

import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { captureReferralFromSearch } from "@/lib/referrals";
import { getPartnerReferralLabel, readStoredReferralCode } from "@/lib/partnerRefs";
import { AI_FEATURE_ENABLED, EXAM_READINESS_ENABLED, ULTRA_PLAN_ENABLED } from "@/lib/featureFlags";
import { getDashboardPath, setSignupTrack } from "@/lib/track";
import { getSprintUpgradeCopy } from "@/lib/foundersSprint";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/LogoMark";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

/** Same clips as in `src/assets/`, but loaded from `/public` so they are not embedded in the JS bundle. */
const PRACTICE_SHOWCASE_VIDEO = "/videos/practice-question.mov";

const HEAT_GRADIENT = {
  tailwind: "from-red-600 via-orange-400 to-amber-300",
  inline: "linear-gradient(135deg, #991B1B, #F97316, #FCD34D)",
  from: "from-red-600",
  via: "via-orange-400",
  to: "to-amber-300",
} as const;

const LANDING_EASING: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PDF_RESOURCES = {
  english: [
    { name: "Creative Writing Overview", file: "The Level Field - Creative Writing Overview (1).pdf" },
    { name: "Comprehension Guide", file: "The Level Field - Comprehension - Understanding Passages (1).pdf" },
    { name: "Creative Writing Dictionary", file: "The Level Field - Creative Writing Dictionary (2).pdf" },
    { name: "Comprehension Tips 1-5", file: "The Level Field - Comprehension Tips 1-5 (1).pdf" },
    { name: "Comprehension Questions", file: "The Level Field - Comprehension Questions Booklet (1).pdf" },
    { name: "SPaG Notes", file: "The Level Field - SPaG Notes1 (1).pdf" },
  ],
  maths: [
    { name: "Mathematics Intro", file: "Level Field - Mathematics Intro - Free 11+ Material  (2).pdf" },
    { name: "Proportion & Scaling (Content)", file: "The Level Field - Proportion and Scaling (CONTENT) (1).pdf" },
    { name: "Proportion & Scaling (Questions)", file: "The Level Field - Proportion and Scaling (QUESTIONS) (1).pdf" },
  ],
  vr: [
    { name: "VR Word & Meaning Guide", file: "The Level Field - VR - Word and Meaning Questions Guide.pdf" },
    { name: "VR Overview", file: "The Level Field - VR Overview (1).pdf" },
    { name: "VR Word & Meaning Pt. 3", file: "The Level Field - VR - Word and Meaning Questions pt3.pdf" },
    { name: "VR Word & Meaning Pt. 1", file: "The Level Field - VR - Word and Meaning Practice Questions - Pt1.pdf" },
  ],
  nvr: [
    { name: "NVR Overview", file: "The Level Field - NVR Overview.pdf" },
  ],
};

// New premium helper components for the Hero overhaul
const FloatingProductCard = ({ children, className, isDark, isSecondary }: { children: React.ReactNode; className?: string; isDark: boolean; isSecondary?: boolean }) => (
  <div className={cn(
    "relative group",
    className
  )}>
    {/* Product Glow - Refined for zero-clutter elegance */}
    {!isSecondary && (
      <div className={cn(
        "absolute -inset-10 rounded-[60px] opacity-0 group-hover:opacity-100 transition-all duration-1000 blur-[100px] pointer-events-none",
        isDark ? "bg-gradient-to-tr from-red-600/15 via-orange-500/5 to-amber-400/15" : "bg-gradient-to-tr from-red-500/8 via-orange-400/4 to-amber-300/8"
      )} />
    )}
    
    <div className={cn(
      "relative rounded-[32px] border overflow-hidden transition-all duration-700 ease-out",
      isSecondary 
        ? (isDark ? "bg-black/40 border-white/5 opacity-40 scale-[0.92] -translate-x-8 -translate-y-8 blur-[1px]" : "bg-white/40 border-slate-200/40 opacity-40 scale-[0.92] -translate-x-8 -translate-y-8 blur-[1px]")
        : (isDark ? "bg-[#0a0a0a]/70 border-white/10 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] group-hover:shadow-[0_48px_80px_-16px_rgba(245,158,11,0.2)]" : "bg-white/80 border-slate-200/80 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] group-hover:shadow-[0_48px_80px_-16px_rgba(245,158,11,0.12)]")
    )}>
      {/* Gloss Effect overlay */}
      {!isSecondary && <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none opacity-50" />}
      {children}
    </div>
  </div>
);

function useLandingMotion() {
  const prefersReducedMotion = useReducedMotion();

  const fadeUp = {
    hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: LANDING_EASING },
    },
  };

  const fade = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.7, ease: LANDING_EASING } },
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const viewport = { once: true, amount: 0.2 } as const;

  return { prefersReducedMotion, fadeUp, fade, stagger, viewport };
}

interface LandingPageProps {
  onAuthAction: (action: "login" | "signup") => void;
  theme?: "dark" | "light";
  onThemeToggle?: () => void;
  variant?: "11plus";
}

type WinnerShowcaseItem = {
  name: string;
  mediaSrc: string;
  mediaType: "video" | "image";
  prizeLabel: string;
};

function ResourceScrollCard({ 
  title, 
  description, 
  resources, 
  icon, 
  isDark, 
  primaryText, 
  mutedText, 
  cardSurface,
  accentColor 
}: {
  title: string;
  description: string;
  resources: { name: string; file: string }[];
  icon: React.ReactNode;
  isDark: boolean;
  primaryText: string;
  mutedText: string;
  cardSurface: string;
  accentColor: "sky" | "blue" | "emerald" | "amber";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const accentStyles = {
    sky: {
      bg: "bg-sky-500/10",
      ring: "ring-sky-500/20",
      text: "text-sky-500",
      borderHover: "hover:border-sky-500/30",
      iconBg: "bg-sky-500/10"
    },
    blue: {
      bg: "bg-blue-500/10",
      ring: "ring-blue-500/20",
      text: "text-blue-500",
      borderHover: "hover:border-blue-500/30",
      iconBg: "bg-blue-500/10"
    },
    emerald: {
      bg: "bg-emerald-500/10",
      ring: "ring-emerald-500/20",
      text: "text-emerald-500",
      borderHover: "hover:border-emerald-500/30",
      iconBg: "bg-emerald-500/10"
    },
    amber: {
      bg: "bg-amber-500/10",
      ring: "ring-amber-500/20",
      text: "text-amber-500",
      borderHover: "hover:border-amber-500/30",
      iconBg: "bg-amber-500/10"
    }
  };

  const style = accentStyles[accentColor];

  return (
    <div className={`rounded-[32px] border p-8 shadow-xl flex flex-col justify-between ${cardSurface} ${style.borderHover} group transition-all duration-300 h-full`}>
      <div className="w-full">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ring-1 group-hover:scale-110 transition-transform ${style.bg} ${style.ring} ${style.text}`}>
          {icon}
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">PDFs</span>
        </div>
        <h3 className={`text-xl font-bold ${primaryText} mb-3`}>{title}</h3>
        <p className={`text-[13px] sm:text-sm ${mutedText} leading-relaxed mb-6`}>{description}</p>
        
        <div className="relative group/scroll">
          <div 
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {resources.map((res) => (
              <a 
                key={res.file}
                href={`/revision-guides/${res.file}`}
                download
                className={`flex-none w-[140px] p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.05] ${
                  isDark 
                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200" 
                    : "bg-white border-slate-200 hover:border-amber-300 text-slate-700 shadow-sm"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg mb-3 flex items-center justify-center ${style.bg} ${style.text}`}>
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <span className="text-[11px] font-bold block leading-tight line-clamp-3">{res.name}</span>
              </a>
            ))}
          </div>
          {resources.length > 3 && (
            <div className={`absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity ${isDark ? 'from-slate-950' : 'from-white'}`} />
          )}
        </div>
      </div>
      <a href="https://drive.google.com/drive/folders/18zm3eRDKyJsb4ATgyy7WiIQ_9mKLGjnv?usp=drive_link" target="_blank" rel="noreferrer" className={`mt-6 hover:opacity-80 inline-flex items-center text-sm font-bold uppercase tracking-wide ${style.text}`}>
        View Full Folder <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </a>
    </div>
  );
}

export function LandingPage({ onAuthAction, theme = "light", onThemeToggle, variant = "11plus" }: LandingPageProps) {
  const navigate = useNavigate();
  const motionCfg = useLandingMotion();
  const isDark = false;
  const isElevenPlus = true;
  const trackTitle = "11+";
  const trackShort = "11+";
  const sprintCopy = getSprintUpgradeCopy();
  const [isScrolled, setIsScrolled] = useState(false);
  const [ambientEffectsEnabled, setAmbientEffectsEnabled] = useState(true);
  const [showInternationalTagline, setShowInternationalTagline] = useState(false);
  const [partnerReferralLabel, setPartnerReferralLabel] = useState<string | null>(null);
  const hasSession = false;
  const sessionChecked = true;
  const dashboardPath = getDashboardPath();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const locale =
      (navigator.languages && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language) ?? "";
    const normalized = locale.toLowerCase();
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase() ?? "";
    const inUk =
      normalized.includes("gb") ||
      normalized.includes("en-gb") ||
      normalized.includes("engb") ||
      timeZone.includes("london") ||
      timeZone.includes("uk");
    setShowInternationalTagline(!inUk);

    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);



  useEffect(() => {
    if (typeof window === "undefined") return;
    const smallScreen = window.matchMedia("(max-width: 1023px)");
    const deviceMemory = "deviceMemory" in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) : 8;
    const cpuCores = "hardwareConcurrency" in navigator ? Number(navigator.hardwareConcurrency) : 8;
    const lowPower = deviceMemory <= 4 || cpuCores <= 4;
    const update = () => setAmbientEffectsEnabled(!motionCfg.prefersReducedMotion && !smallScreen.matches && !lowPower);
    update();
    smallScreen.addEventListener("change", update);
    return () => smallScreen.removeEventListener("change", update);
  }, [motionCfg.prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const recordLandingVisit = async () => {
      try {
        const storageKey = "gradlify:landing-visitor-id";
        let visitorId = window.localStorage.getItem(storageKey);
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          window.localStorage.setItem(storageKey, visitorId);
        }

        await supabase.functions.invoke("record-visit", {
          method: "POST",
          body: { visitorId },
        });
      } catch (error) {
        console.error("Landing visit logging failed", error);
      }
    };

    recordLandingVisit();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    captureReferralFromSearch(window.location.search);
    const code = readStoredReferralCode();
    setPartnerReferralLabel(getPartnerReferralLabel(code) ?? (code ? code : null));
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const setPlanPostAuthRedirect = () => {
    setPostAuthRedirect({
      path: "/select-subject?intent=checkout",
      message: "Finish your quick setup, then we'll open Lifetime Premium checkout.",
    });
  };
  const handleViewPlans = () => {
    navigate("/premium");
  };
  const handleSignup = () => {
    setSignupTrack("11plus");
    onAuthAction('signup');
  };
  const handlePurchasePlan = () => {
    setPlanPostAuthRedirect();
    handleSignup();
  };
  const handleDashboardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onAuthAction('login');
  };

  const faqs = useMemo(
    () => [
      {
        q: "Which 11+ formats does Gradlify support?",
        a: "11+ Maths and English preparation for all major exam styles, including GL, CEM, ISEB, and independent-school formats.",
      },
      {
        q: "Can I practise mixed 11+ question styles?",
        a: "Yes. You can practise varied 11+ question styles with structured progression across all major 11+ exam formats.",
      },
      {
        q: "Can I practise on mobile or tablet?",
        a: "Yes. The interface is built to stay readable and usable across phones, tablets, and desktops.",
      },
      {
        q: "How long is a typical session?",
        a: "You control the length. Start a short practice session or run a full mock when you have the time.",
      },
      {
        q: "Who built this platform?",
        a: "A student at QE Boys, Barnet named Niketh Putta",
      },
      {
        q: "Is there a free plan?",
        a: AI_FEATURE_ENABLED
          ? "Yes - start for free, then upgrade when you want deeper analytics and higher AI limits."
          : "Yes - start for free, then upgrade when you want deeper analytics and higher limits.",
      },
    ],
    []
  );

  const navLinkClass = isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const mutedText = isDark ? "text-slate-200/90" : "text-slate-600";
  const subtleText = isDark ? "text-slate-300/75" : "text-slate-500";
  const accentText = isElevenPlus ? (isDark ? "text-rose-200" : "text-rose-600") : isDark ? "text-indigo-300" : "text-indigo-600";
  const sectionSurface = isDark ? "bg-transparent" : "bg-slate-50";
  const guidePromoSurface = isDark
    ? (isElevenPlus ? "border-white/15 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(239,68,68,0.15),transparent_60%)]" : "border-white/15 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(129,140,248,0.18),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(14,165,233,0.15),transparent_60%)]")
    : (isElevenPlus ? "border-slate-200/80 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(245,158,11,0.16),transparent_58%),radial-gradient(120%_120%_at_100%_100%,rgba(239,68,68,0.12),transparent_62%)]" : "border-slate-200/80 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.16),transparent_58%),radial-gradient(120%_120%_at_100%_100%,rgba(14,165,233,0.12),transparent_62%)]");
  const guidePromoGlow = isDark
    ? (isElevenPlus ? "shadow-[0_30px_80px_-40px_rgba(245,158,11,0.55)]" : "shadow-[0_30px_80px_-40px_rgba(99,102,241,0.55)]")
    : (isElevenPlus ? "shadow-[0_30px_80px_-45px_rgba(217,119,6,0.35)]" : "shadow-[0_30px_80px_-45px_rgba(79,70,229,0.35)]");
  const guidePromoBadge = isDark
    ? "border-white/10 bg-white/10 text-white"
    : "border-white/70 bg-white text-slate-800";
  const guidePromoMuted = isDark ? "text-slate-300/90" : "text-slate-700/80";
  const guidePromoMeta = isDark ? "text-slate-200" : "text-slate-800";
  const chipClass = isDark
    ? "border-white/10 bg-white/5 text-slate-200"
    : "border-slate-200/80 bg-white text-slate-700";
  const cardSurface = isDark
    ? "border-white/10 bg-black/20 backdrop-blur-xl"
    : "border-slate-200/80 bg-white";
  const panelSurface = isDark
    ? "border-white/10 bg-white/5 backdrop-blur-md"
    : "border-slate-200/80 bg-slate-50";
  const premiumCardGradient = "bg-gradient-to-br from-red-600 via-orange-500 to-amber-400 border border-red-500/70 text-white";
  const feedbackButtonGradient = "bg-gradient-to-r from-red-600 via-orange-500 to-amber-400";
  const outlineButtonClass = isDark
    ? "border-white/20 text-white bg-white/10 hover:bg-white/20 hover:text-white"
    : "border-slate-200 text-slate-900 bg-white hover:bg-slate-100";

  const accentGradient = HEAT_GRADIENT;

  const schoolLogos = [
    { name: "QE Boys", domain: "qebarnet.co.uk" },
    { name: "Wilson's", domain: "wilsons.school" },
    { name: "HBS Girls", domain: "hbschool.org.uk", logoUrl: "/hbs_logo.png" },
    { name: "St. Paul's", domain: "stpaulsschool.org.uk", logoUrl: "/st_pauls_logo.png" },
    { name: "Haberdashers'", domain: "habsboys.org.uk" },
    { name: "Wycombe Abbey", domain: "wycombeabbey.com" },
    { name: "Eton College", domain: "etoncollege.com" },
  ];

  const winnerShowcase: WinnerShowcaseItem[] = [
    {
      name: "Lupin",
      mediaSrc: "/Lupin_winner.mp4",
      mediaType: "video",
      prizeLabel: "Winner · Amazon Gift Card",
    },
    {
      name: "Srinika",
      mediaSrc: "/Srinika_winner.mov",
      mediaType: "video",
      prizeLabel: "Winner · £75 Amazon Gift Card",
    },
    {
      name: "Vivaan",
      mediaSrc: "/Vivaan_winner.mp4",
      mediaType: "video",
      prizeLabel: "2nd Place · £50 Waterstones Gift Card",
    },
  ];

  const showcaseRows = useMemo(
    () => [
      {
        key: "exam",
        label: "Priority 01",
        title: "The English Split-View. No more scrolling back and forth.",
        body: "Authentic 11+ comprehension feels different. We put the passage and questions side-by-side with synchronized evidence highlighting. This is how the 1% train.",
        badge: "English Split-View",
        hoverFact: "Evidence highlights automatically as you read questions.",
        media: (
          <HoverVideo
            src={PRACTICE_SHOWCASE_VIDEO}
            className="h-full w-full object-containScale"
            playOnHover
            tone={theme}
            accentGradient={isElevenPlus ? HEAT_GRADIENT : undefined}
          />
        ),
        mediaAspect: "aspect-[5/8] sm:aspect-[4/5] lg:aspect-[3/4]",
        frameClassName: "max-w-[440px] sm:max-w-[480px] lg:max-w-[520px] mx-auto lg:mx-0",
      },
      {
        key: "feedback",
        label: "Priority 02",
        title: EXAM_READINESS_ENABLED
          ? "Readiness Tracking. Know exactly when they are ready."
          : "Mock Analytics. Review every paper with clarity.",
        body: EXAM_READINESS_ENABLED
          ? "Stop guessing. Our dashboard aggregates every session into a real-time 'Readiness Score'. See subtopic mastery across Maths and English at a single glance."
          : "Review mock performance, spot repeated mistakes, and build stronger exam habits across Maths and English.",
        badge: EXAM_READINESS_ENABLED ? "Readiness Dashboard" : "Mock Analytics",
        hoverFact: EXAM_READINESS_ENABLED
          ? "Proprietary algorithm mimics actual 11+ grading."
          : "Detailed review helps every completed mock become the next practice plan.",
        media: (
          <HoverVideo
            src={PRACTICE_SHOWCASE_VIDEO}
            className="h-full w-full object-cover"
            playOnHover
            tone={theme}
            accentGradient={isElevenPlus ? HEAT_GRADIENT : undefined}
          />
        ),
        mediaAspect: "aspect-[5/8] sm:aspect-[4/5] lg:aspect-[3/4]",
      },
      {
        key: "notes",
        label: "Priority 03",
        title: "Expert Revision Notes. The ultimate digital textbook.",
        body: "Not just text - interactive revision. Integrated 'Expert Tips', 'Common Mistakes', and 'Instant Practice' blocks built directly into the workflow. Everything is actionable.",
        badge: "Interactive Revision",
        hoverFact: "Updated weekly by top-tier 11+ tutors.",
        media: <NotesPreview tone={theme} />,
        reverse: true,
      },
      {
        key: "mock",
        label: "Priority 04",
        title: "Full Mock Exams. Built for extreme realism.",
        body: "Timed, high-pressure environments built for all major 11+ exam styles, including GL, CEM, ISEB, and independent-school formats. Detailed post-exam reports show exactly where time was lost.",
        badge: "Realistic Mocks",
        hoverFact: "Timed conditions build critical exam stamina.",
        media: <MockBuilderPreview tone={theme} />,
        reverse: true,
      },
    ],
    [isElevenPlus, theme]
  );

  return (
    <div
      className={`min-h-screen overflow-x-hidden ${
        isElevenPlus
          ? isDark
            ? "bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(185,28,28,0.25),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(234,88,12,0.2),transparent_68%),#04050a] text-white"
            : "bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(239,68,68,0.18),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(251,146,60,0.2),transparent_68%),#fff7ed] text-slate-900"
          : isDark
            ? "bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(124,58,237,0.20),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(56,189,248,0.15),transparent_68%),#04050a] text-white"
            : "bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(99,102,241,0.15),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(14,165,233,0.12),transparent_68%),#f8fafc] text-slate-900"
      }`}
    >
      {/* Nav */}
      <nav
        className={[
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? isDark
              ? "bg-[#04050a]/80 backdrop-blur-lg border-b border-white/5 text-white shadow-lg shadow-black/25"
              : "bg-white/95 backdrop-blur border-b border-black/5 text-slate-900 shadow-sm"
            : isDark
              ? "bg-[#04050a]/40 backdrop-blur-md border-b border-transparent text-white"
              : "bg-white/80 backdrop-blur-sm border-b border-transparent text-slate-900",
        ].join(" ")}
      >
        {isElevenPlus && (
          <LifetimePromoBanner onCta={handleViewPlans} ctaLabel="Get Premium" />
        )}
        <div className="max-w-7xl mx-auto px-3 pr-4 sm:px-6 sm:pr-6 py-2.5 sm:py-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <a href="#" className="flex items-center gap-3">
              <LogoMark className="w-8 h-8 sm:w-9 sm:h-9 shadow-sm" variant={isDark ? "dark" : "light"} />
              <div className="leading-tight">
                <div className={`text-[13px] sm:text-sm font-semibold ${primaryText}`}>Gradlify</div>
                <div className={`text-[11px] sm:text-xs ${subtleText} hidden sm:block`}>
                  11+ Practised Properly.
                </div>
              </div>
            </a>

            <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <Link to="/11-plus" className={navLinkClass}>11+</Link>
              <button type="button" onClick={() => scrollTo("compare")} className={navLinkClass}>Compare</button>
              <button type="button" onClick={handleViewPlans} className={navLinkClass}>Pricing</button>
              <a href="/free-resources" className={navLinkClass}>
                Free Resources
              </a>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => onAuthAction("login")}
              className={`px-1.5 py-1 text-[10px] sm:text-sm sm:px-3 sm:py-2 ${
                isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </Button>
            <Button
              onClick={handleSignup}
              className={`rounded-full bg-gradient-to-r ${accentGradient.tailwind} text-white font-semibold px-2.5 py-1 text-[10px] sm:text-sm sm:px-5 sm:py-2.5 shadow-xl shadow-rose-500/40 max-w-[140px] sm:max-w-none whitespace-nowrap`}
            >
              <span className="sm:hidden">Start free</span>
              <span className="hidden sm:inline">Start free practice</span>
            </Button>
            </div>
          </div>
        </div>
      </nav>

      <main
        className={cn(
          isElevenPlus
            ? "pt-[9.5rem] sm:pt-[6.5rem] lg:pt-[6.25rem]"
            : "pt-24 sm:pt-28 lg:pt-8"
        )}
      >
        {/* Hero: top padding accounts for fixed nav + offer strip (11+) */}
        <section className="relative pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-18 lg:pb-20 overflow-hidden">
          {ambientEffectsEnabled && (
            <div className="absolute inset-0 pointer-events-none">
              {isDark ? (
                <>
                  <div className={isElevenPlus ? "absolute inset-0 pointer-events-none bg-[radial-gradient(900px_420px_at_20%_-5%,rgba(245,158,11,0.22),transparent_65%)]" : "absolute inset-0 pointer-events-none bg-[radial-gradient(900px_420px_at_20%_-5%,rgba(99,102,241,0.22),transparent_65%)]"} />
                  <div className={isElevenPlus ? "absolute inset-0 pointer-events-none bg-[radial-gradient(720px_420px_at_80%_35%,rgba(248,113,113,0.14),transparent_62%)]" : "absolute inset-0 pointer-events-none bg-[radial-gradient(720px_420px_at_80%_35%,rgba(56,189,248,0.14),transparent_62%)]"} />
                </>
              ) : (
                <>
                  <div className={isElevenPlus ? "absolute inset-0 pointer-events-none bg-[radial-gradient(900px_420px_at_20%_-5%,rgba(217,119,6,0.14),transparent_65%)]" : "absolute inset-0 pointer-events-none bg-[radial-gradient(900px_420px_at_20%_-5%,rgba(79,70,229,0.14),transparent_65%)]"} />
                  <div className={isElevenPlus ? "absolute inset-0 pointer-events-none bg-[radial-gradient(720px_420px_at_80%_35%,rgba(248,113,113,0.10),transparent_62%)]" : "absolute inset-0 pointer-events-none bg-[radial-gradient(720px_420px_at_80%_35%,rgba(56,189,248,0.10),transparent_62%)]"} />
                </>
              )}
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div className="grid lg:grid-cols-12 gap-8 sm:gap-8 lg:gap-10 items-start" initial="hidden" animate="show" variants={motionCfg.stagger}>
              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-5 lg:pr-4 flex flex-col justify-center">
                <h1 className="leading-[1.05] tracking-tighter mb-5 max-w-3xl">
                  <span className={cn(
                    "text-5xl sm:text-6xl lg:text-[76px] xl:text-[88px] block font-extrabold mb-1",
                    isDark ? "text-slate-100" : "text-[#0B1528]"
                  )}>
                    11+
                  </span>
                  <span className={cn(
                    "text-5xl sm:text-6xl lg:text-[70px] xl:text-[82px] font-extrabold block leading-[1.15] pt-1 pb-4 -mb-3",
                    isElevenPlus 
                      ? "text-transparent bg-clip-text bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446]" 
                      : "text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-500"
                  )}>
                    Practised Properly.
                  </span>
                </h1>

                <p className={cn(
                  "mt-4 sm:mt-8 text-lg sm:text-xl font-medium max-w-lg leading-[1.6]",
                  isDark ? "text-slate-300" : "text-[#334155]"
                )}>
                  The definitive system behind top 11+ results. Master both Maths & English with intelligent Split-View practice and full mock exams.
                </p>



                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                   <HeroCTA onClick={handleSignup} tone={theme} accentGradient={accentGradient} />
                   <Button
                     variant="outline"
                     onClick={() => scrollTo("product")}
                     className={`rounded-full px-5 py-4 text-sm font-semibold ${outlineButtonClass}`}
                   >
                     Explore the system
                   </Button>
                </div>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-7 relative mt-6 lg:mt-8 h-[460px] lg:h-[520px] w-full max-w-[600px] mx-auto lg:ml-auto">
                {/* 3D Stacked Deck - True Product Surface Overhaul */}
                
                {/* Card 1: TRUE Exam Readiness (Back Left) */}
                <div className={cn(
                  "absolute top-10 left-[-15px] sm:left-[-20px] w-[250px] sm:w-[380px] rounded-[24px] sm:rounded-[32px] border shadow-2xl transition-all duration-700 ease-out pointer-events-none block",
                  "transform origin-bottom-left -rotate-[10deg] sm:-rotate-[12deg] scale-[0.85] sm:scale-[0.9] -translate-x-4 sm:-translate-x-16 -translate-y-8 sm:-translate-y-12 opacity-90 sm:opacity-100",
                  isDark ? "bg-[radial-gradient(100%_100%_at_0%_0%,#1e293b,#0a0a0a)] border-white/10" : "bg-[radial-gradient(100%_100%_at_0%_0%,#f8fafc,#ffffff)] border-slate-200"
                )}>
                  <div className={cn("h-[200px] sm:h-[280px] w-full p-0 flex flex-col rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-colors duration-700", isDark ? "bg-[#0B1528]" : "bg-white")}>
                    <img 
                      src="/hero-analytics.png" 
                      alt="Cognitive Readiness Profile" 
                      className={cn("w-full h-full object-cover object-left-top transition-all duration-700", isDark && "invert hue-rotate-180 brightness-95 contrast-[1.15] opacity-90")} 
                    />
                  </div>
                </div>

                {/* Card 2: TRUE Revision Notes (Back Right) */}
                <div className={cn(
                  "absolute top-14 right-[-15px] sm:right-[-20px] w-[250px] sm:w-[380px] rounded-[24px] sm:rounded-[32px] border shadow-2xl transition-all duration-700 ease-out pointer-events-none block",
                  "transform origin-bottom-right rotate-[12deg] sm:rotate-[14deg] scale-[0.85] sm:scale-[0.9] translate-x-4 sm:translate-x-16 -translate-y-6 sm:-translate-y-8 opacity-90 sm:opacity-100",
                  isDark ? "bg-[radial-gradient(100%_100%_at_100%_0%,#1e293b,#0a0a0a)] border-white/10" : "bg-[radial-gradient(100%_100%_at_100%_0%,#f8fafc,#ffffff)] border-slate-200"
                )}>
                  <div className={cn("h-[220px] sm:h-[300px] w-full p-0 flex flex-col rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-colors duration-700", isDark ? "bg-[#0B1528]" : "bg-white")}>
                    <img 
                      src="/hero-spag.png" 
                      alt="SPaG Toolkit and Practice" 
                      className={cn("w-full h-full object-cover object-left-top transition-all duration-700", isDark && "invert hue-rotate-180 brightness-95 contrast-[1.15] opacity-90")} 
                    />
                  </div>
                </div>

                {/* Card 3: TRUE English Split-View (Front Center) */}
                <FloatingProductCard isDark={isDark} className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[310px] sm:w-[500px] z-30">

                  {/* Mock English Split-View Showcase */}
                  <div className="flex flex-col h-[270px] sm:h-[420px]">
                    {/* Header bar */}
                    <div className={cn("px-4 py-2 sm:py-3 border-b flex items-center justify-between", isDark ? "bg-white/5 border-white/5" : "bg-slate-50/50 border-slate-100")}>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400/50" />
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
                      </div>
                      <div className={cn("text-[7px] sm:text-[10px] font-bold tracking-tight px-2 py-0.5 sm:py-1 rounded-full uppercase", isDark ? "bg-white/10 text-white" : "bg-white text-slate-600 shadow-sm border border-slate-100")}>
                        English Mastery: Comprehension
                      </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                      {/* Left Sidebar (Passage) - High-Fidelity Typesetting */}
                      <div className={cn("w-3/5 border-r p-2.5 sm:p-6 py-3 sm:py-5 select-none", isDark ? "border-white/5" : "border-slate-100")}>
                        <div className={cn("text-[7px] sm:text-[9px] uppercase tracking-[0.25em] font-bold mb-3 sm:mb-6 opacity-40", isDark ? "text-white" : "text-slate-900")}>The Passage • Vol. 12</div>
                        <div className="space-y-3 sm:space-y-4">
                           <div className={cn("font-serif text-[9px] sm:text-[13px] leading-relaxed opacity-90", isDark ? "text-slate-100" : "text-slate-800")}>
                              The village was peaceful, tucked away in the shadow of the mountains. Nothing moved except for a lone crow circling the church spire.
                           </div>
                           {/* Real-time Evidence Highlight */}
                           <div className={cn("relative p-2 sm:p-3 rounded-lg sm:rounded-xl border group/evidence transition-all duration-300", isDark ? "bg-amber-500/20 border-amber-500/40" : "bg-amber-50/70 border-amber-200/50 shadow-sm")}>
                              <div className={cn("font-serif text-[9px] sm:text-[13px] leading-relaxed", isDark ? "text-amber-100" : "text-amber-950 font-medium")}>
                                 "The old oak tree stood like a <span className="underline decoration-amber-500/50 decoration-2 underline-offset-4 font-bold">silent sentinel</span>, watching over the town."
                              </div>
                              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse" />
                           </div>
                        </div>
                      </div>

                      {/* Right Sidebar (Question) - Software Interface */}
                      <div className="flex-1 p-2.5 sm:p-6 flex flex-col justify-center bg-black/5 dark:bg-white/[0.01]">
                         <div className={cn("mb-3 sm:mb-6 p-2 sm:p-4 rounded-lg sm:rounded-2xl border shadow-sm", isDark ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100")}>
                            <div className={cn("text-[7px] sm:text-[10px] font-bold uppercase tracking-wider mb-1", isDark ? "text-amber-400" : "text-orange-600")}>Comprehension</div>
                            <div className={cn("text-[9px] sm:text-[13px] font-semibold leading-snug", isDark ? "text-white" : "text-slate-900")}>
                               What literary device is used?
                            </div>
                         </div>
                         <div className="space-y-1 sm:space-y-2.5">
                           {[
                             { label: "Simile", id: "B", active: true },
                             { label: "Metaphor", id: "C" },
                             { label: "Hyperbole", id: "D" }
                           ].map((opt) => (
                             <div key={opt.id} className={cn(
                               "w-full h-7 sm:h-11 rounded-md sm:rounded-xl border flex items-center px-2 sm:px-4 gap-1.5 sm:gap-3 transition-all duration-300", 
                               opt.active 
                                ? (isDark ? "bg-amber-500/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20" : "bg-amber-50 border-amber-300 shadow-sm") 
                                : (isDark ? "bg-white/5 border-white/5 opacity-50" : "bg-white border-slate-100 opacity-70")
                             )}>
                                <div className={cn("w-4 h-4 sm:w-6 sm:h-6 rounded sm:rounded-lg flex items-center justify-center text-[7px] sm:text-[10px] font-bold", opt.active ? "bg-amber-500 text-white" : (isDark ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"))}>
                                   {opt.id}
                                </div>
                                <div className={cn("text-[8px] sm:text-[12px] font-bold", opt.active ? (isDark ? "text-amber-100" : "text-amber-900") : (isDark ? "text-slate-400" : "text-slate-500"))}>
                                  {opt.label}
                                </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  </div>
                </FloatingProductCard>
              </motion.div>
            </motion.div>
          </div>
        </section>



        {/* School Carousel Section */}
        <section className="py-10 pb-20 overflow-hidden relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 text-center text-sm font-bold uppercase tracking-[0.3em] opacity-40">
            Your route to:
          </div>
          <div className="relative flex overflow-hidden max-w-6xl mx-auto [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <motion.div 
              className="flex whitespace-nowrap py-2 w-max items-center"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ ease: "linear", duration: 30, repeat: Infinity }}
            >
              {[...schoolLogos, ...schoolLogos, ...schoolLogos, ...schoolLogos].map((school, i) => (
                <div key={i} className="mx-8 sm:mx-12 flex items-center gap-3 sm:gap-4 group cursor-default">
                  <img 
                    src={school.logoUrl || `https://www.google.com/s2/favicons?domain=${school.domain}&sz=128`} 
                    alt={`${school.name} Logo`}
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 object-contain transition-all duration-700 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100",
                      isDark ? "invert" : "contrast-125"
                    )}
                    loading="lazy"
                  />
                  <span className={cn(
                    "text-lg sm:text-xl font-bold tracking-tight transition-all duration-700",
                    isDark ? "text-slate-400 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900"
                  )}>
                    {school.name}
                  </span>
                </div>
              ))}
            </motion.div>
            
            {/* Gradient masks for smooth fade */}
            <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-slate-50 dark:from-[#0a0f1c] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-slate-50 dark:from-[#0a0f1c] to-transparent z-10 pointer-events-none" />
          </div>
        </section>

        {/* Bento Box Features */}
        <section id="features" className={`relative py-10 sm:py-18 lg:py-24 ${sectionSurface}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div initial="hidden" whileInView="show" viewport={motionCfg.viewport} variants={motionCfg.stagger}>
              
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 lg:mb-16">

                <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight ${primaryText}`}>
                  See what you're getting
                </h2>
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 auto-rows-auto">
                {/* Tile 1: English Split-View (Large, spans 2 columns) */}
                <motion.div initial={{ x: -80, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0 }} className={`md:col-span-2 rounded-[24px] sm:rounded-[32px] overflow-hidden ${cardSurface} border shadow-xl flex flex-col group relative hover:border-orange-500/30 hover:shadow-orange-500/10 transition-colors duration-500`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent dark:from-orange-500/10 dark:via-amber-500/5 dark:to-transparent z-0 pointer-events-none" />
                  <div className="p-5 sm:p-7 pb-0 z-10">
                    <h3 className={`text-lg sm:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446] mb-2`}>English Comprehension Engine</h3>
                    <p className={`${mutedText} max-w-lg font-medium leading-relaxed text-sm sm:text-base`}>Master comprehension with side-by-side passage and question rendering. Eliminate context-switching fatigue and visually isolate literary devices within the text.</p>
                  </div>
                  <div className="mt-3 sm:mt-4 flex-1 relative w-[calc(100%-1rem)] sm:w-[calc(100%-1.75rem)] rounded-tl-[24px] sm:rounded-tl-[34px] border-t border-l border-border/50 shadow-[inset_0_2px_20px_rgba(0,0,0,0.03)] bg-slate-50 dark:bg-[#0f172a] ml-4 sm:ml-7 overflow-hidden group/img p-2 sm:p-4 pb-0 flex flex-col justify-end min-h-[190px] sm:min-h-[240px]">
                    <motion.img 
                      initial={{ y: 30, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ duration: 1.0, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                      src="/Comprehension.png" alt="English Split-View Dashboard" 
                      className={cn(
                        "w-[100%] max-w-none h-auto object-contain object-right-bottom transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-2 group-hover:-translate-x-2 drop-shadow-[0_10px_30px_rgba(0,0,0,0.12)] border-t border-l border-slate-200/60 dark:border-white/10 rounded-tl-xl sm:rounded-tl-2xl mb-[-1px] ml-auto",
                        isDark && "invert hue-rotate-180 brightness-[0.85] contrast-[1.2] opacity-95"
                      )} 
                    />
                  </div>
                </motion.div>

                {/* Tile 2: Mathematical Agility (Tall, spans 1 column) */}
                <motion.div initial={{ x: 80, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.1 }} className={`rounded-[24px] sm:rounded-[32px] overflow-hidden ${cardSurface} border shadow-xl flex flex-col group relative hover:border-orange-500/30 hover:shadow-orange-500/10 transition-colors duration-500`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-amber-500/5 to-transparent dark:from-orange-500/10 dark:via-amber-500/5 dark:to-transparent z-0 pointer-events-none" />
                  <div className="p-5 sm:p-6 pb-2 z-10">
                    <h3 className={`text-lg sm:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446] mb-2`}>Mathematical Agility</h3>
                    <p className={`${mutedText} text-xs sm:text-sm font-medium leading-relaxed`}>Multi-step reasoning environments built for GL, CEM, ISEB, and broader selective-school formats.</p>
                  </div>
                  <div className="flex-1 relative overflow-hidden z-10 flex flex-col items-center justify-end mt-2 sm:mt-3 mx-3 sm:mx-5 rounded-t-[24px] sm:rounded-t-[28px] border-t border-x border-border/50 shadow-[inset_0_2px_20px_rgba(0,0,0,0.03)] bg-slate-50 dark:bg-[#0f172a] px-1 sm:px-3 pt-3 sm:pt-5 min-h-[130px] sm:min-h-[180px]">
                    <motion.img 
                      initial={{ y: 30, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ duration: 1.0, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
                      src="/Maths_Question.png" alt="Maths Deep Dive Engine" 
                      className={cn(
                        "w-[105%] sm:w-full max-w-[420px] h-auto object-contain object-bottom transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-2 drop-shadow-[0_-10px_30px_rgba(0,0,0,0.15)] rounded-t-xl sm:rounded-t-2xl border-t border-x border-slate-200/70 dark:border-white/10 mb-[-1px]",
                        isDark && "invert hue-rotate-180 brightness-[0.85] contrast-[1.2] opacity-95"
                      )} 
                    />
                  </div>
                </motion.div>

                {/* Tile 3: Leaderboard (Wide bottom, spans 2 columns) */}
                <motion.div initial={{ x: -80, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.2 }} className={`md:col-span-2 rounded-[24px] sm:rounded-[32px] overflow-hidden ${cardSurface} border shadow-xl flex flex-col sm:flex-row items-center group relative md:h-[270px] lg:h-[290px] hover:border-orange-500/30 hover:shadow-orange-500/10 transition-colors duration-500`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent dark:from-orange-500/10 dark:via-amber-500/5 dark:to-transparent z-0 pointer-events-none" />
                  <div className="p-5 sm:p-6 sm:w-[44%] z-10 sm:py-5 self-start sm:self-center">
                    <h3 className={`text-lg sm:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446] mb-2`}>Leaderboard</h3>
                    <p className={`${mutedText} text-xs sm:text-sm font-medium leading-relaxed`}>Build momentum consistently with healthy, optional competition rooted purely in live practice metrics.</p>
                  </div>
                  <div className="sm:w-[56%] h-full w-[calc(100%-1.5rem)] sm:w-full relative bg-slate-50 dark:bg-[#0f172a] sm:border-y border-t border-x sm:border-r-0 border-border/50 rounded-t-[24px] sm:rounded-t-none sm:rounded-l-[34px] mx-3 sm:ml-6 sm:mr-0 mt-3 sm:mt-0 flex flex-col items-center justify-center overflow-hidden shadow-[inset_0_2px_20px_rgba(0,0,0,0.03)] group/img p-3 sm:p-5">
                    <motion.img 
                      initial={{ x: 30, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ duration: 1.0, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
                      src="/Leaderboard.png" alt="Leaderboard Activity" 
                      className={cn(
                        "w-[112%] sm:w-[108%] max-w-none h-auto object-contain transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-x-3 group-hover:-translate-y-2 transform scale-[1.04] sm:scale-[1.08] drop-shadow-2xl border border-slate-200/70 dark:border-white/10 rounded-xl sm:rounded-2xl",
                        isDark && "invert hue-rotate-180 brightness-[0.85] contrast-[1.2] opacity-95"
                      )} 
                    />
                  </div>
                </motion.div>

                {/* Tile 4: SPaG Toolkit (Square, spans 1 column) */}
                <motion.div initial={{ x: 80, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.3 }} className={`rounded-[32px] overflow-hidden ${cardSurface} border shadow-xl flex flex-col group relative md:h-[270px] lg:h-[290px] hover:border-orange-500/30 hover:shadow-orange-500/10 transition-colors duration-500`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent dark:from-orange-500/10 dark:via-amber-500/5 dark:to-transparent z-0 pointer-events-none" />
                  <div className="p-5 sm:p-6 pb-3 z-10 text-center">
                    <h3 className={`text-lg sm:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#DF3526] via-[#F17E31] to-[#FAD446] mb-2`}>SPaG Toolkit</h3>
                    <p className={`${mutedText} text-xs sm:text-sm font-medium`}>Instantly reference grammatical architecture to secure SPaG marks.</p>
                  </div>
                  <div className="flex-1 relative overflow-hidden z-10 flex items-start justify-center mt-2 sm:mt-3 mx-3 sm:mx-5 rounded-t-[28px] border-t border-x border-border/50 bg-slate-100 dark:bg-[#0f172a] pt-4 sm:pt-5 px-0 sm:px-2">
                    <motion.img 
                      initial={{ y: 30, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ duration: 1.0, ease: [0.23, 1, 0.32, 1], delay: 0.4 }}
                      src="/SPaG.png" alt="SPaG Diagnostics" 
                      className={cn(
                        "transform translate-y-4 scale-[0.95] sm:scale-[0.95] w-[105%] sm:w-full max-w-none h-auto object-cover object-top transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-y-0 group-hover:scale-[0.9] drop-shadow-2xl border border-b-0 border-border/50 origin-top rounded-[16px]",
                        isDark && "invert hue-rotate-180 brightness-[0.85] contrast-[1.2] opacity-95"
                      )} 
                    />
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </div>
        </section>

        <section className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(620px_320px_at_20%_25%,rgba(245,158,11,0.12),transparent_65%)]"
                  : "bg-[radial-gradient(620px_320px_at_20%_25%,rgba(245,158,11,0.08),transparent_65%)]"
              }`}
            />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={motionCfg.viewport} variants={motionCfg.stagger}>
              <motion.div variants={motionCfg.fadeUp} className="max-w-3xl mx-auto text-center">
                <div className={`text-sm font-semibold ${accentText}`}>Past Winners</div>
                <h2 className={`mt-3 text-2xl sm:text-4xl font-semibold tracking-tight ${primaryText}`}>
                  Real students. Real prizes.
                </h2>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className="mt-8 sm:mt-10">
                <div className="relative -mx-4 sm:mx-0">
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:hidden",
                      isDark ? "bg-gradient-to-r from-slate-950 to-transparent" : "bg-gradient-to-r from-slate-50 to-transparent"
                    )}
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:hidden",
                      isDark ? "bg-gradient-to-l from-slate-950 to-transparent" : "bg-gradient-to-l from-slate-50 to-transparent"
                    )}
                  />
                  <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-6 pt-1 [scroll-padding-inline:1rem] md:justify-center md:gap-5 md:overflow-visible md:px-0 lg:gap-6">
                    {winnerShowcase.map((winner) => (
                      <WinnerShowcaseCard
                        key={winner.name}
                        winner={winner}
                        isDark={isDark}
                        cardSurface={cardSurface}
                        primaryText={primaryText}
                        mutedText={mutedText}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Founder Trust Section */}
        <section className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(680px_360px_at_20%_20%,rgba(245,158,11,0.10),transparent_65%),radial-gradient(560px_300px_at_88%_28%,rgba(239,68,68,0.08),transparent_62%)]" />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={motionCfg.viewport}
              variants={motionCfg.stagger}
              className={cn(
                "relative overflow-hidden rounded-[28px] border px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11",
                isDark
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200/80 bg-white shadow-[0_26px_80px_-58px_rgba(180,83,9,0.45)]"
              )}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-orange-400 to-amber-300" />
              <div className="space-y-7">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_390px]">
                  <motion.div variants={motionCfg.fadeUp} className="lg:pt-3">
                    <p className={cn("text-xs font-black uppercase tracking-[0.28em]", accentText)}>
                      Who built this
                    </p>
                    <h2 className={cn("mt-4 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-[4.3rem] xl:text-[4.65rem]", primaryText)}>
                      Built by people who aced the 11+
                      <span className="block text-slate-400">because the prep we wanted did not exist.</span>
                    </h2>
                  </motion.div>

                  <motion.div variants={motionCfg.fadeUp} className="self-start">
                    <div className="mx-auto w-full max-w-[330px] lg:max-w-none">
                      <div className={cn(
                        "relative overflow-hidden rounded-[24px] border p-1.5 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.72)]",
                        isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
                      )}>
                        <div className="pointer-events-none absolute -inset-6 bg-[radial-gradient(240px_180px_at_22%_18%,rgba(249,115,22,0.16),transparent_68%),radial-gradient(220px_170px_at_86%_12%,rgba(59,130,246,0.12),transparent_70%)]" />
                        <div className="relative overflow-hidden rounded-[19px] bg-slate-100">
                          <img
                            src="/founder-niketh.jpg"
                            alt="Niketh Putta, founder of Gradlify"
                            className="aspect-[4/5] h-full w-full scale-[1.16] object-cover object-[43%_47%]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/28 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12">
                            <p className="text-sm font-black text-white drop-shadow-sm">Niketh Putta</p>
                            <p className="text-xs font-bold text-white/90 drop-shadow-sm">Founder, Gradlify</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div variants={motionCfg.fadeUp} className="space-y-3">
                  <p className={cn("text-xs font-black uppercase tracking-[0.24em]", accentText)}>
                    Gradlify:
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {[
                    ["01", "Saves you time"],
                    ["02", "Gets you the same results I did"],
                    ["03", "Saves you money"],
                    ].map(([number, line]) => (
                      <div
                        key={line}
                        className={cn(
                          "group flex min-h-[82px] items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                          isDark
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200/80 bg-white/90 shadow-[0_12px_34px_-30px_rgba(15,23,42,0.5)] hover:bg-white"
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 via-orange-500 to-amber-300 text-[11px] font-black text-white shadow-[0_10px_24px_-14px_rgba(249,115,22,0.9)]">
                          {number}
                        </span>
                        <span className={cn("font-serif text-[1.2rem] font-black leading-tight tracking-tight sm:text-[1.35rem]", primaryText)}>
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={motionCfg.fadeUp} className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className={cn("rounded-2xl border p-5 sm:p-6", isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-slate-50/70")}>
                      <p className={cn("text-xs font-black uppercase tracking-[0.2em]", accentText)}>
                        Why I built it
                      </p>
                      <div className={cn("mt-4 space-y-3 text-sm font-medium leading-6 sm:text-base", mutedText)}>
                      <p>
                        I’m Niketh Putta. I go to QE Boys, and I also got into Wilson’s, Eton College, and every other school I applied for. At 14, I scored 1530 on the SAT.
                      </p>
                      <p>
                        But I do not think families should have to pay £2,000 a month for a child to have a real shot at their dream school. That never felt fair to me.
                      </p>
                      <p>
                        I’m building Gradlify to be the prep I wish existed: clear practice, honest feedback, and a smarter path that saves you time, helps you aim for the same results, and does not waste your money on generic tutoring.
                      </p>
                      </div>
                    </div>

                    <div className={cn("flex flex-col justify-between rounded-2xl border p-5 sm:p-6", isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-white")}>
                      <div>
                        <p className={cn("text-xs font-black uppercase tracking-[0.2em]", accentText)}>
                          Proof points
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["QE Boys", "Wilson's", "Eton College", "1530 SAT at 14"].map((item) => (
                            <span key={item} className={cn("rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]", chipClass)}>
                              {item}
                            </span>
                          ))}
                        </div>
                        <p className={cn("mt-5 max-w-md text-sm font-semibold leading-6", mutedText)}>
                          The point is not more generic tutoring. It is a clearer path: practise the right things, see what is weak, then improve without wasting months.
                        </p>
                      </div>

                      <div className={cn("mt-6 border-t pt-4", isDark ? "border-white/10" : "border-slate-200")}>
                        <a
                          href="https://wa.me/447442194299"
                          target="_blank"
                          rel="noreferrer"
                          className={cn("block text-sm font-black leading-6 transition-colors", isDark ? "text-slate-200 hover:text-white" : "text-slate-700 hover:text-slate-950")}
                        >
                          Want to talk to me directly: +44 7442194299
                        </a>

                        <button
                          type="button"
                          onClick={handleViewPlans}
                          className={cn("mt-3 inline-flex items-center gap-2 text-sm font-black", accentText)}
                        >
                          View plans <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Comparison */}
        <section id="compare" className={`relative py-10 sm:py-14 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(720px_360px_at_14%_10%,rgba(249,115,22,0.10),transparent_64%)]" />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={motionCfg.viewport}
              variants={motionCfg.stagger}
              className="space-y-6"
            >
              <motion.div variants={motionCfg.fadeUp} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-[0.24em]", accentText)}>
                    Comparison
                  </p>
                  <h2 className={cn("mt-3 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl", primaryText)}>
                    Gradlify gives you the outcome layer most prep misses.
                  </h2>
                </div>
                <p className={cn("max-w-md text-sm font-semibold leading-6", mutedText)}>
                  Other options can give you questions or tutoring. Gradlify is built around the full loop: practise, mock, diagnose, report, and improve without tutor-level spend.
                </p>
              </motion.div>

              <motion.div
                variants={motionCfg.fadeUp}
                className={cn(
                  "overflow-hidden rounded-[28px] border",
                  isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-white shadow-[0_26px_80px_-58px_rgba(180,83,9,0.45)]"
                )}
              >
                <div className="overflow-hidden">
                  <table className="w-full table-fixed text-left">
                    <thead>
                      <tr className={cn("border-b", isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50")}>
                        <th className={cn("w-[42%] px-3 py-4 text-[10px] font-black uppercase tracking-[0.12em] sm:w-[38%] sm:px-5 sm:py-5 sm:text-xs sm:tracking-[0.18em]", subtleText)}>
                          Features
                        </th>
                        {["Gradlify", "Atom", "Explore", "Bond"].map((name) => (
                          <th
                            key={name}
                            className={cn(
                              "px-1 py-4 text-center text-[9px] font-black uppercase tracking-[0.08em] sm:px-3 sm:py-5 sm:text-xs sm:tracking-[0.16em]",
                              name === "Gradlify"
                                ? "bg-orange-50 text-orange-700"
                                : subtleText
                            )}
                          >
                            {name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Full timed 11+ mocks", "yes", "yes", "partial", "yes"],
                        ["Daily Maths + English practice", "yes", "yes", "partial", "yes"],
                        ["Weak-topic diagnosis", "yes", "partial", "partial", "partial"],
                        ["Parent-ready report", "yes", "partial", "partial", "partial"],
                        ["Built from selective-school experience", "yes", "no", "no", "no"],
                        ["Focused 11+ system at £149.99 lifetime", "yes", "no", "no", "yes"],
                        ["Clear next-step plan after each mock", "yes", "partial", "partial", "no"],
                      ].map(([feature, gradlify, atom, explore, bond]) => (
                        <tr key={feature} className={cn("border-b last:border-b-0", isDark ? "border-white/10" : "border-slate-100")}>
                          <td className={cn("px-3 py-3 text-xs font-black leading-snug sm:px-5 sm:py-4 sm:text-sm", primaryText)}>{feature}</td>
                          {[gradlify, atom, explore, bond].map((value, index) => (
                            <td
                              key={`${feature}-${index}`}
                              className={cn(
                                "px-1 py-3 text-center sm:px-3 sm:py-4",
                                index === 0 && !isDark ? "bg-orange-50/70" : ""
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-black sm:h-8 sm:w-8 sm:text-base",
                                  value === "yes" && (index === 0
                                    ? "bg-gradient-to-br from-red-600 via-orange-500 to-amber-300 text-white shadow-[0_10px_22px_-14px_rgba(249,115,22,0.9)]"
                                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"),
                                  value === "partial" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                                  value === "no" && "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                )}
                              >
                                {value === "yes" ? "✓" : value === "partial" ? "–" : "×"}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={cn("text-xs font-semibold leading-5", subtleText)}>
                  Pricing checked from public competitor pages. Last checked 6 June 2026.
                </p>
                <Link to="/compare" className={cn("inline-flex items-center gap-2 text-sm font-black", accentText)}>
                  Open full comparison <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(620px_360px_at_85%_20%,rgba(124,58,237,0.12),transparent_65%)]"
                  : "bg-[radial-gradient(620px_360px_at_85%_20%,rgba(124,58,237,0.10),transparent_65%)]"
              }`}
            />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={motionCfg.viewport} variants={motionCfg.stagger}>
              <motion.div variants={motionCfg.fadeUp} className="max-w-2xl">
                <div className={`text-sm font-semibold ${accentText}`}>Pricing</div>
                <h2 className={`mt-3 text-2xl sm:text-4xl font-semibold tracking-tight ${primaryText}`}>
                  Start free. Unlock Lifetime Premium when ready.
                </h2>
                <p className={`mt-4 ${mutedText} leading-relaxed`}>One payment. Keep Premium forever.</p>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className="mt-8 sm:mt-10 grid lg:grid-cols-3 md:grid-cols-2 gap-4 sm:gap-5 max-w-6xl mx-auto">
                {/* Free Tier */}
                <motion.div variants={motionCfg.fadeUp} className={`rounded-[20px] sm:rounded-[22px] border p-5 sm:p-7 shadow-sm flex flex-col ${cardSurface} order-1`}>
                  <div>
                    <div className={`text-lg sm:text-xl font-gradlify font-bold tracking-tight ${primaryText}`}>Free</div>
                    <div className="mt-4 flex items-end gap-2">
                      <div className={`text-3xl sm:text-4xl font-semibold ${primaryText}`}>£0</div>
                      <div className={`text-sm ${subtleText} pb-1`}>forever</div>
                    </div>
                    <div className={`mt-5 sm:mt-6 space-y-3 text-[13px] sm:text-sm ${mutedText}`}>
                      {[
                        "Topic practice questions",
                        "Mini mocks",
                        AI_FEATURE_ENABLED ? "Daily AI help limit" : "Daily help limit",
                        "Basic progress tracking",
                      ].map((line) => (
                        <div key={line} className="flex items-start gap-3">
                          <CheckCircle className={`mt-0.5 h-5 w-5 ${accentText}`} />
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto pt-6 sm:pt-8 w-full">
                    <Button
                      onClick={handlePurchasePlan}
                      className={`w-full rounded-full font-semibold py-4 sm:py-6 ${
                        isDark ? "bg-white text-slate-900 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-900"
                      }`}
                    >
                      Start practising free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <div className={`mt-2 sm:mt-3 text-[11px] sm:text-xs text-center ${subtleText}`}>Free forever plan available</div>
                  </div>
                </motion.div>

                {/* Premium Tier */}
                <motion.div variants={motionCfg.fadeUp} className={`rounded-[20px] sm:rounded-[22px] ${premiumCardGradient} p-5 sm:p-7 shadow-xl scale-100 lg:scale-105 z-10 flex flex-col order-2`}>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg sm:text-xl font-gradlify font-bold text-white/95 tracking-tight">Premium</div>
                      <div className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                        Best for exams
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-black text-white">{formatGbp(PREMIUM_PRICING.lifetime)}</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-white/75">lifetime</span>
                    </div>
                    <div className="mt-4 rounded-xl border border-white/25 bg-white/15 p-3 shadow-inner shadow-white/10">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">Why parents switch</p>
                          <p className="mt-1 text-sm font-semibold text-white">One tutor hour costs £40–60. Premium is {formatGbp(PREMIUM_PRICING.lifetime)} lifetime.</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-2xl font-black text-white">{formatGbp(PREMIUM_PRICING.lifetime)}</div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">one-time</div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] sm:text-sm text-white/80">
                      {AI_FEATURE_ENABLED ? 'More mocks, deeper analytics, higher AI limits.' : 'More mocks, deeper analytics, higher limits.'}
                    </p>
                    <div className="mt-5 sm:mt-6 space-y-3 text-[13px] sm:text-sm text-white/90">
                      {[
                        "Full timed mock exams",
                        EXAM_READINESS_ENABLED ? "Deeper readiness analytics" : "Detailed mock analytics",
                        AI_FEATURE_ENABLED ? "Higher AI explanation limits" : "Higher explanation limits",
                        "Priority support",
                      ].map((line) => (
                        <div key={line} className="flex items-start gap-3">
                          <CheckCircle className="mt-0.5 h-5 w-5 text-white" />
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto pt-6 sm:pt-8 w-full">
                    <Button
                      onClick={handleSignup}
                      className="w-full rounded-full bg-white text-orange-700 font-semibold py-4 sm:py-6 hover:bg-white shadow-lg"
                    >
                      Get Lifetime Premium
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <div className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-white/80 text-center">
                      One-time payment · lifetime access
                    </div>
                  </div>
                </motion.div>

                {ULTRA_PLAN_ENABLED && (
                <motion.div variants={motionCfg.fadeUp} className={`font-sans rounded-[20px] sm:rounded-[22px] ${isDark ? 'bg-gradient-to-br from-indigo-300 via-purple-500 to-indigo-600 shadow-[0_0_60px_-10px_rgba(124,58,237,0.55)]' : 'bg-gradient-to-br from-[#1a1c29] via-[#241e16] to-[#1a1c29] border border-amber-500/30 shadow-2xl'} p-[2px] scale-100 lg:scale-110 z-30 flex flex-col order-3 relative overflow-hidden group`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.35),transparent_60%)] rounded-[20px]"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.35),transparent_60%)] rounded-[20px]"></div>
                  <div className={`h-full rounded-[18px] sm:rounded-[20px] bg-black/60 backdrop-blur-xl p-5 sm:p-7 flex flex-col relative z-10`}>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-lg sm:text-xl font-gradlify font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 tracking-tight">Ultra</div>
                        <div className="rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-[10px] sm:text-xs font-semibold text-amber-300 backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                          1-to-1 Live
                        </div>
                      </div>
                      <div className="mt-4 flex items-end gap-2">
                        <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">£{ULTRA_PRICING.monthly}</div>
                        <div className="text-sm text-amber-200/60 pb-1">/month</div>
                      </div>
                      <p className="mt-4 text-[13px] sm:text-sm text-amber-100/80 leading-relaxed">
                        Everything in Premium <span className="text-amber-400 font-semibold">+</span> weekly live human tutoring.
                      </p>
                      <div className="mt-6 sm:mt-8 space-y-4 text-[13px] sm:text-sm text-amber-50/90">
                        {[
                          "All Premium features unlocked",
                          "Weekly live 1-to-1 tutoring sessions",
                          "Personalised Sprint Plans",
                          "Direct access to Founders & Tutors",
                        ].map((line) => (
                          <div key={line} className="flex items-start gap-3">
                            <CheckCircle className="mt-[2px] h-5 w-5 text-amber-400 shrink-0 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                            <span className="font-normal">{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto pt-8 sm:pt-10 w-full relative">
                      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
                      <Button
                        onClick={handleSignup}
                        className="w-full rounded-xl font-semibold py-5 sm:py-6 border-0 bg-gradient-to-r from-amber-500 hover:from-amber-400 via-amber-400 hover:via-amber-300 to-amber-600 hover:to-amber-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-300"
                      >
                        Start your Ultra trial
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                      <div className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-center text-amber-200/50">Cancel anytime</div>
                    </div>
                  </div>
                </motion.div>
                )}

              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className={`mt-6 sm:mt-8 flex items-center gap-3 text-[13px] sm:text-sm ${mutedText}`}>
                <ShieldCheck className={`h-4 w-4 ${accentText}`} />
                Payments are handled securely. Cancel anytime.
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(640px_320px_at_10%_30%,rgba(245,158,11,0.10),transparent_65%)]"
                  : (isElevenPlus ? "bg-[radial-gradient(640px_320px_at_10%_30%,rgba(245,158,11,0.08),transparent_65%)]" : "bg-[radial-gradient(640px_320px_at_10%_30%,rgba(99,102,241,0.08),transparent_65%)]")
              }`}
            />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <div className={`text-sm font-semibold ${accentText}`}>FAQ</div>
                <h2 className={`mt-3 text-2xl sm:text-4xl font-semibold tracking-tight ${primaryText}`}>
                  Answers, clearly.
                </h2>
                <p className={`mt-4 ${mutedText} leading-relaxed`}>
                  The essentials - so you can decide quickly.
                </p>
              </div>
              <div className="lg:col-span-8">
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {faqs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className={`rounded-2xl border px-4 sm:px-5 ${cardSurface}`}
                    >
                      <AccordionTrigger className={`text-left font-semibold hover:no-underline py-4 sm:py-5 ${primaryText}`}>
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className={`pb-4 sm:pb-5 ${mutedText}`}>{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className={`py-8 sm:py-10 ${sectionSurface}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <LogoMark className="w-8 h-8 sm:w-9 sm:h-9" variant={isDark ? "dark" : "light"} />
              <div className="leading-tight">
                <div className={`text-[13px] sm:text-sm font-semibold ${primaryText}`}>Gradlify</div>
                <div className={`text-[11px] sm:text-xs ${subtleText}`}>11+ Practised Properly.</div>
              </div>
            </div>
            <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${mutedText}`}>
              <button
                type="button"
                className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
                onClick={() => scrollTo("why")}
              >
                Why Gradlify
              </button>
              <button
                type="button"
                className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
                onClick={() => scrollTo("product")}
              >
                Product
              </button>
              <button
                type="button"
                className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
                onClick={() => scrollTo("leaderboard")}
              >
                Momentum
              </button>
              <Link to="/free-resources" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>
                Free Resources
              </Link>
              <button type="button" onClick={() => scrollTo("compare")} className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>
                Compare
              </button>
              <button
                type="button"
                className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
                onClick={handleViewPlans}
              >
                Pricing
              </button>
              <Link to="/privacy" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>
                Privacy
              </Link>
              <Link to="/terms" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>
                Terms
              </Link>
            </div>
          </div>
          <div className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${mutedText}`}>
            <a
              href="mailto:team@gradlify.com"
              className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
            >
              Message: team@gradlify.com
            </a>
            <a
              href="https://wa.me/447442194299"
              target="_blank"
              rel="noreferrer"
              className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
            >
              WhatsApp: +44 7442 194299
            </a>
          </div>
          <div className={`mt-8 text-xs ${subtleText}`}>
            © {new Date().getFullYear()} Gradlify. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroCTA({
  onClick,
  tone,
  accentGradient,
}: {
  onClick: () => void;
  tone: "dark" | "light";
  accentGradient: { tailwind: string; inline: string };
}) {
  const isDark = tone === "dark";
  return (
    <div className="group flex flex-col items-center">
      <SpotlightButton onClick={onClick} gradient={accentGradient.inline} />
    </div>
  );
}

function SpotlightButton({
  onClick,
  gradient,
}: {
  onClick: () => void;
  gradient: string;
}) {
  const [pos, setPos] = useState({ x: 86, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isPointerFine = useMemo(() => (typeof window !== "undefined" ? window.matchMedia("(pointer: fine)").matches : false), []);

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerFine) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
    setIsHovering(true);
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
  };

  const spotlight = `radial-gradient(240px circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,${
    isHovering ? 0.65 : 0.38
  }), transparent 60%)`;
  const baseGradient = gradient;
  const glow = isHovering
    ? "0 18px 52px rgba(217,119,6,0.55), 0 0 35px rgba(245,158,11,0.55)"
    : "0 16px 40px rgba(217,119,6,0.4), 0 0 28px rgba(245,158,11,0.35)";

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="group relative overflow-hidden rounded-full px-4 py-2.5 text-[13px] sm:px-6 sm:py-4 sm:text-base font-semibold text-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-600"
      style={{
        backgroundImage: isPointerFine ? `${spotlight}, ${baseGradient}` : baseGradient,
        transform: isHovering ? "translateY(-1px) scale(1.01)" : "translateY(0)",
        boxShadow: glow,
        transition: "transform 150ms ease, background 180ms ease, box-shadow 180ms ease",
      }}
    >
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="absolute inset-0 translate-x-[-35%] bg-[linear-gradient(120deg,transparent_10%,rgba(255,255,255,0.55)_45%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-[35%]" />
      </span>
      <span className="relative z-10 flex items-center gap-2">
        Start practising free
        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
    </button>
  );
}

function HoverVideo({
  src,
  className,
  playOnHover = false,
  hint,
  tone = "dark",
  accentGradient,
}: {
  src: string;
  className?: string;
  playOnHover?: boolean;
  hint?: string;
  tone?: "dark" | "light";
  accentGradient?: { tailwind: string; inline: string; from: string; via: string; to: string };
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isPointerFine, setIsPointerFine] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isDark = tone === "dark";
  const hoverHint = hint ?? (isPointerFine ? "Hover to play" : "Tap to play");
  const videoFilter = isDark ? "invert(1) hue-rotate(180deg) brightness(0.93) contrast(1.05) saturate(1.12)" : "none";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const shouldAutoPlayOnScroll = playOnHover && !isPointerFine;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(pointer: fine)");
    setIsPointerFine(media.matches);
    const listener = (event: MediaQueryListEvent) => setIsPointerFine(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    if (prefersReducedMotion) {
      videoRef.current.pause();
      return;
    }
    if (!playOnHover) {
      videoRef.current.play().catch(() => undefined);
      return;
    }
    if (shouldAutoPlayOnScroll) {
      return;
    }
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  }, [prefersReducedMotion, playOnHover, shouldAutoPlayOnScroll]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldAutoPlayOnScroll) return;
    if (prefersReducedMotion) {
      video.pause();
      return;
    }
    if (isInView) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [shouldAutoPlayOnScroll, isInView, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }
    const container = containerRef.current;
    if (!container || !shouldAutoPlayOnScroll) {
      setIsInView(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.55 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldAutoPlayOnScroll]);

  const handleEnter = () => {
    if (!playOnHover || !isPointerFine || prefersReducedMotion) return;
    videoRef.current?.play().catch(() => undefined);
  };

  const handleLeave = () => {
    if (!playOnHover || !isPointerFine || prefersReducedMotion) return;
    videoRef.current?.pause();
  };

  const handleTap = () => {
    if (!playOnHover || isPointerFine || prefersReducedMotion) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const showHint = playOnHover && (isPointerFine || !isPlaying);

  return (
    <div
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onClick={handleTap}
      ref={containerRef}
      className="group relative h-full w-full"
      role={!isPointerFine && playOnHover ? "button" : undefined}
      aria-label={!isPointerFine && playOnHover ? "Tap to play preview" : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        className={`${className ?? ""} transition-[filter] duration-300`.trim()}
        style={isDark ? { filter: videoFilter } : undefined}
        muted
        loop
        playsInline
        preload="metadata"
      />
      {accentGradient && !isDark && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: accentGradient.inline,
            opacity: 0.35,
            mixBlendMode: "screen",
          }}
        />
      )}
      {showHint && (
        <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur transition-opacity ${
              isDark
                ? "border-white/20 bg-slate-950/70 text-slate-200"
                : "border-slate-200/80 bg-white/90 text-slate-700"
            } opacity-80 group-hover:opacity-100`}
          >
            <MousePointer2 className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isDark ? "text-orange-300" : "text-orange-500"}`} />
            {hoverHint}
          </div>
        </div>
      )}
    </div>
  );
}

function ShowcaseRow({
  row,
  variants,
  tone,
}: {
  row: {
    key: string;
    label: string;
    title: string;
    body: string;
    badge: string;
    hoverFact?: string;
    media: React.ReactNode;
    mediaAspect?: string;
    frameClassName?: string;
    reverse?: boolean;
  };
  variants: Variants;
  tone: "dark" | "light";
}) {
  const isDark = tone === "dark";
  const textOrder = row.reverse ? "lg:order-2" : "lg:order-1";
  const mediaOrder = row.reverse ? "lg:order-1" : "lg:order-2";

  return (
    <motion.div variants={variants} className="group grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
      <div className={`lg:col-span-5 ${textOrder}`}>
        <div className={`text-[10px] sm:text-xs uppercase tracking-[0.2em] ${isDark ? "text-slate-500/70" : "text-slate-500"}`}>
          {row.label}
        </div>
        <h3 className={`mt-3 text-xl sm:text-2xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{row.title}</h3>
        <p className={`mt-4 text-sm sm:text-base leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>{row.body}</p>
        <div className="mt-6 flex flex-col items-start gap-3 relative z-10 transition-transform duration-300">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-all duration-300 ${
              isDark 
                ? "bg-white/5 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/10 group-hover:bg-white/10 group-hover:ring-white/20 group-hover:shadow-[0_4px_14px_rgba(0,0,0,0.2)]" 
                : "bg-white text-slate-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] ring-1 ring-inset ring-slate-200/80 group-hover:bg-slate-50 group-hover:ring-slate-300 group-hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-500 group-hover:scale-110 ${isDark ? "text-amber-300" : "text-amber-600"}`} />
            {row.badge}
          </div>
          {row.hoverFact && (
            <HoverFact tone={tone}>{row.hoverFact}</HoverFact>
          )}
        </div>
      </div>

      <div className={`lg:col-span-7 ${mediaOrder}`}>
        <MediaFrame tone={tone} aspectClassName={row.mediaAspect} frameClassName={row.frameClassName}>
          {row.media}
        </MediaFrame>
      </div>
    </motion.div>
  );
}

function MediaFrame({
  children,
  tone,
  aspectClassName = "aspect-[16/9]",
  frameClassName,
}: {
  children: React.ReactNode;
  tone: "dark" | "light";
  aspectClassName?: string;
  frameClassName?: string;
}) {
  const isDark = tone === "dark";
  return (
    <div
      className={`group relative rounded-[22px] sm:rounded-[26px] border shadow-2xl overflow-hidden ${
        isDark ? "border-white/10 bg-white/5" : "border-slate-200/80 bg-white"
      }${frameClassName ? ` ${frameClassName}` : ""}`}
    >
      <div
        className={`absolute inset-0 pointer-events-none ${
          isDark
            ? "bg-[radial-gradient(280px_220px_at_20%_0%,rgba(245,158,11,0.18),transparent_70%)]"
            : "bg-[radial-gradient(280px_220px_at_20%_0%,rgba(245,158,11,0.12),transparent_70%)]"
        }`}
      />
      <div className={`relative ${aspectClassName} ${isDark ? "bg-slate-950/60" : "bg-slate-50"}`}>{children}</div>
    </div>
  );
}

function WinnerShowcaseCard({
  winner,
  isDark,
  cardSurface,
  primaryText,
  mutedText,
}: {
  winner: WinnerShowcaseItem;
  isDark: boolean;
  cardSurface: string;
  primaryText: string;
  mutedText: string;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaFrameRef = useRef<HTMLDivElement | null>(null);
  const [rankLabel, prizeDetail] = winner.prizeLabel.split("·").map((part) => part.trim());

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => undefined);
      }
    }
  }, [isMuted]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPaused(false);
    const handlePause = () => setIsPaused(true);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const frame = mediaFrameRef.current;
    if (!frame || hasEnteredViewport) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setHasEnteredViewport(true);
        observer.disconnect();
      },
      { threshold: 0.45 }
    );

    observer.observe(frame);

    return () => observer.disconnect();
  }, [hasEnteredViewport]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasEnteredViewport || isPaused) return;
    video.play().catch(() => undefined);
  }, [hasEnteredViewport, isPaused]);

  return (
    <div
      className={cn(
        "snap-center flex-none w-[84vw] max-w-[340px] scroll-mx-4 rounded-[24px] border shadow-xl overflow-hidden transition-transform duration-300 md:w-[330px] md:max-w-none md:rounded-[26px] md:hover:-translate-y-1 lg:w-[350px]",
        cardSurface
      )}
    >
      <div className="relative p-3 sm:p-4">
        <div className="absolute inset-0 bg-[radial-gradient(280px_180px_at_20%_0%,rgba(245,158,11,0.10),transparent_72%)] pointer-events-none" />
        <div className="relative flex min-w-0 items-center justify-between gap-3 pb-3">
          <div className={cn(
            "inline-flex min-w-0 shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
            isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
          )}>
            {winner.name}
          </div>
          <div className={cn("min-w-0 truncate text-right text-[10px] font-medium sm:text-[11px]", mutedText)}>Gradlify Sprint Winner</div>
        </div>

        <div className={cn(
          "relative overflow-hidden rounded-[20px] border",
          isDark ? "border-white/10 bg-black/40" : "border-slate-200 bg-slate-100"
        )} ref={mediaFrameRef}>
          <div className="aspect-[4/5] w-full">
            {winner.mediaType === "video" ? (
              <>
                <video
                  ref={videoRef}
                  src={winner.mediaSrc}
                  className="h-full w-full object-cover"
                  autoPlay={hasEnteredViewport}
                  muted={isMuted}
                  loop
                  playsInline
                  preload="metadata"
                  onClick={togglePlayback}
                />
                {isPaused && (
                  <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-black/20 text-white shadow-lg backdrop-blur-sm">
                    <Pause className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                  <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleMute();
                  }}
                  className={cn(
                    "absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-[1.03]",
                    isDark ? "bg-black/40 hover:bg-black/55" : "bg-black/45 hover:bg-black/60"
                  )}
                  aria-label={isMuted ? `Unmute ${winner.name} winner video` : `Mute ${winner.name} winner video`}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </>
            ) : (
              <img
                src={winner.mediaSrc}
                alt={`${winner.name} winner showcase`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        </div>

        <div className={cn(
          "mt-3 overflow-hidden rounded-[22px] border",
          isDark ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)]"
        )}>
          <div className="relative p-3.5 sm:p-4">
            <div className="absolute inset-0 bg-[radial-gradient(240px_140px_at_0%_0%,rgba(245,158,11,0.10),transparent_72%)] pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", mutedText)}>Prize Won</div>
                <div className={cn("mt-2 text-base font-semibold leading-snug tracking-tight sm:text-lg", primaryText)}>
                  {prizeDetail ?? winner.prizeLabel}
                </div>
                {prizeDetail && (
                  <div className={cn("mt-1 text-[13px] leading-relaxed sm:text-sm", mutedText)}>
                    {rankLabel}
                  </div>
                )}
              </div>
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                isDark ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-600"
              )}>
                <Trophy className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className={cn(
              "relative mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-[12px] font-medium sm:text-[13px]",
              isDark ? "border-white/10 bg-black/15 text-slate-200" : "border-slate-200/80 bg-white/80 text-slate-700"
            )}>
              <span className="truncate">Gradlify Sprint Result</span>
              <span className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                isDark ? "bg-white/8 text-amber-200" : "bg-slate-100 text-amber-700"
              )}>
                {rankLabel ?? "Winner"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesPreview({ tone }: { tone: "dark" | "light" }) {
  const isDark = tone === "dark";
  return (
    <div className="h-full w-full p-4 sm:p-6 space-y-4 relative z-10 overflow-hidden">
      <div className={cn("rounded-2xl border p-4 space-y-3", isDark ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm")}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className={cn("w-3.5 h-3.5", isDark ? "text-amber-400" : "text-amber-600")} />
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-amber-400" : "text-amber-700")}>Expert Tip</span>
        </div>
        <p className={cn("text-[12px] leading-relaxed italic", isDark ? "text-amber-100/90" : "text-amber-900/80")}>
          "When identifying a simile, check for the word 'like' or 'as'. It must compare two different things to highlight a shared characteristic."
        </p>
      </div>

      <div className={cn("rounded-2xl border p-4 space-y-3", isDark ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200")}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-rose-400" : "text-rose-700")}>Mistake to avoid</span>
        </div>
        <p className={cn("text-[12px] leading-relaxed", isDark ? "text-rose-100/90" : "text-rose-900/80")}>
          Don't confuse metaphors with similes. A metaphor says something IS something else, without using 'like' or 'as'.
        </p>
      </div>

      <div className={cn("rounded-2xl border p-4", isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200")}>
        <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 opacity-50", isDark ? "text-white" : "text-slate-900")}>Quick Check</div>
        <div className="flex items-center justify-between gap-4">
           <div className={cn("flex-1 h-2 rounded-full", isDark ? "bg-white/10" : "bg-slate-200")} />
           <div className={cn("text-[11px] font-bold", isDark ? "text-amber-400" : "text-amber-600")}>Try Question</div>
        </div>
      </div>
    </div>
  );
}

function ExplanationPreview({ tone }: { tone: "dark" | "light" }) {
  const isDark = tone === "dark";
  return (
    <div className="h-full w-full p-5 sm:p-7 flex flex-col justify-between gap-5 tracking-tight relative z-10">
      <div className="space-y-4">
        {/* Question Bubble */}
        <div
          className={`relative rounded-2xl rounded-tl-sm px-5 py-4 text-[13px] sm:text-sm font-medium shadow-sm transition-all duration-300 ${
            isDark 
              ? "bg-slate-800/80 text-slate-200 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.2)]" 
              : "bg-white text-slate-800 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
          }`}
        >
          <div className={`absolute -top-2.5 -left-2.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm ${isDark ? "bg-slate-700 border-white/10 text-slate-300" : "bg-white border-slate-200 text-slate-500"}`}>
            <span className="text-[10px] font-bold">Q</span>
          </div>
          <span className="opacity-90">Question:</span> <span className="font-semibold tracking-wide">Which word is a synonym for 'valiant'?</span>
        </div>

        {/* Options */}
        <div className="grid gap-2.5 pl-4 sm:pl-6 border-l-2 border-dashed border-slate-200/50 dark:border-white/10">
          {["Timid", "Courageous", "Fragile"].map((option, index) => (
            <div
              key={option}
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-[13px] sm:text-sm font-medium transition-all duration-300 ${
                index === 1
                  ? isDark
                    ? "bg-emerald-500/15 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-emerald-500/40"
                    : "bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-inset ring-emerald-500/30"
                  : isDark
                    ? "bg-white/[0.03] text-slate-400 ring-1 ring-inset ring-white/10 hover:bg-white/10 cursor-default"
                    : "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/60 hover:bg-white cursor-default"
              }`}
            >
              <span>{option}</span>
              {index === 1 && (
                <CheckCircle className={`h-4 w-4 ${isDark ? "text-emerald-400" : "text-emerald-600"} drop-shadow-sm`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Explanation Bubble */}
      <div
        className={`relative mt-2 rounded-2xl rounded-tr-sm px-5 py-4 text-[12px] sm:text-[13px] leading-relaxed shadow-lg transition-all duration-300 ${
          isDark 
            ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-100 ring-1 ring-inset ring-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_30px_-6px_rgba(245,158,11,0.2)]" 
            : "bg-gradient-to-br from-amber-50 to-orange-50/50 text-amber-900 ring-1 ring-inset ring-amber-500/20 shadow-[0_8px_30px_-6px_rgba(245,158,11,0.15)]"
        }`}
      >
        <div className={`absolute -top-3 -right-2 flex h-7 w-7 items-center justify-center rounded-full shadow-md ring-2 ${isDark ? "bg-amber-500 ring-slate-900 text-white" : "bg-amber-500 ring-white text-white"}`}>
          <span className="text-[10px] font-bold">!</span>
        </div>
        <div className="font-semibold mb-1 opacity-90 text-[10px] uppercase tracking-wider">Tutor Insight</div>
        <p className="opacity-90">'Valiant' and 'Courageous' both describe extreme bravery, often in the face of danger.</p>
      </div>
    </div>
  );
}

function HoverFact({ tone, children }: { tone: "dark" | "light"; children: React.ReactNode }) {
  const isDark = tone === "dark";
  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-[10.5px] sm:text-[11.5px] font-semibold tracking-wide transition-all duration-500 ease-out ${
        isDark 
          ? "bg-amber-500/10 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_20px_-6px_rgba(245,158,11,0.2)] ring-1 ring-inset ring-amber-500/20 backdrop-blur-md" 
          : "bg-gradient-to-b from-amber-50/80 to-amber-100/30 text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_20px_-6px_rgba(245,158,11,0.15)] ring-1 ring-inset ring-amber-500/20 backdrop-blur-md"
      } opacity-0 translate-y-3 scale-[0.97] filter blur-[2px] group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:blur-0`}
      style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.25)" }}
    >
      <MousePointer2 className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-500 delay-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
      <span className="opacity-90">{children}</span>
    </div>
  );
}

function MockBuilderPreview({ tone }: { tone: "dark" | "light" }) {
  const isDark = tone === "dark";
  return (
    <div className={`h-full w-full p-5 sm:p-7 flex flex-col gap-6 text-[12px] sm:text-[13px] relative z-10 ${isDark ? "text-slate-200" : "text-slate-600"}`}>
      {/* Timeline line */}
      <div className={`absolute left-7 sm:left-9 top-12 bottom-12 w-px ${isDark ? "bg-white/[0.08]" : "bg-slate-200"}`} />

      {/* Step 1 */}
      <div className="relative pl-6 sm:pl-8">
        <div className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ${isDark ? "bg-amber-400 ring-slate-900 shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "bg-amber-500 ring-white shadow-sm"}`} />
        <div className="flex items-center justify-between mb-3">
          <div className={`font-semibold tracking-tight text-sm sm:text-base ${isDark ? "text-white" : "text-slate-900"}`}>Session Type</div>
          <div className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"}`}>Step 1</div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Practice", active: true },
            { label: "Mock Exam" },
            { label: "Challenge" },
          ].map((item) => (
            <div
              key={item.label}
              className={`relative flex items-center justify-center rounded-xl px-2 py-2.5 text-[10px] sm:text-[11px] font-medium transition-all duration-300 text-center ${
                item.active
                  ? isDark
                    ? "bg-amber-500/20 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-amber-500/40"
                    : "bg-amber-50 text-amber-700 shadow-[0_2px_10px_-2px_rgba(245,158,11,0.2)] ring-1 ring-inset ring-amber-500/30"
                  : isDark
                    ? "bg-white/[0.03] text-slate-400 ring-1 ring-inset ring-white/10 hover:bg-white/10 cursor-default"
                    : "bg-slate-50/80 text-slate-500 ring-1 ring-inset ring-slate-200/80 hover:bg-white cursor-default"
              }`}
            >
              {item.label}
              {item.active && <div className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${isDark ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "bg-amber-500 shadow-sm"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 */}
      <div className="relative pl-6 sm:pl-8">
        <div className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ${isDark ? "bg-cyan-400 ring-slate-900 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-cyan-500 ring-white shadow-sm"}`} />
        <div className="flex items-center justify-between mb-3">
          <div className={`font-semibold tracking-tight text-sm sm:text-base ${isDark ? "text-white" : "text-slate-900"}`}>Constraints</div>
          <div className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"}`}>Step 2</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["Adaptive", "GL", "CEM", "ISEB", "Mixed"].map((item, index) => (
            <span
              key={item}
              className={`rounded-full px-3.5 py-1.5 text-[11px] sm:text-[12px] font-medium transition-all duration-300 ${
                index === 0
                  ? isDark
                    ? "bg-cyan-500/20 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-cyan-500/40"
                    : "bg-cyan-50 text-cyan-700 shadow-[0_2px_8px_-2px_rgba(6,182,212,0.2)] ring-1 ring-inset ring-cyan-500/30"
                  : isDark
                    ? "bg-white/[0.03] text-slate-400 ring-1 ring-inset ring-white/10 hover:bg-white/10 cursor-default"
                    : "bg-slate-50/80 text-slate-500 ring-1 ring-inset ring-slate-200/80 hover:bg-white cursor-default"
              }`}
            >
              {item === "Adaptive" && <Sparkles className="inline-block w-3 h-3 mr-1.5 -mt-0.5 opacity-80" />}
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Step 3 */}
      <div className="relative pl-6 sm:pl-8">
        <div className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ${isDark ? "bg-emerald-400 ring-slate-900 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-emerald-500 ring-white shadow-sm"}`} />
        <div className="flex items-center justify-between mb-3">
          <div className={`font-semibold tracking-tight text-sm sm:text-base ${isDark ? "text-white" : "text-slate-900"}`}>Content Scope</div>
          <div className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"}`}>Step 3</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["Maths", "English", "Verbal", "Non-Verbal", "Mixed"].map((item, index) => (
            <span
              key={item}
              className={`rounded-full px-3.5 py-1.5 text-[11px] sm:text-[12px] font-medium transition-all duration-300 ${
                index < 2
                  ? isDark
                    ? "bg-emerald-500/20 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-emerald-500/40"
                    : "bg-emerald-50 text-emerald-700 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.2)] ring-1 ring-inset ring-emerald-500/30"
                  : isDark
                    ? "bg-white/[0.03] text-slate-400 ring-1 ring-inset ring-white/10 hover:bg-white/10 cursor-default"
                    : "bg-slate-50/80 text-slate-500 ring-1 ring-inset ring-slate-200/80 hover:bg-white cursor-default"
              }`}
            >
              {index < 2 && <CheckCircle className="inline-block w-3 h-3 mr-1.5 -mt-0.5 opacity-80" />}
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeaderboardPreview({ tone }: { tone: "dark" | "light" }) {
  const isDark = tone === "dark";
  return (
    <div
      className={`group rounded-[22px] sm:rounded-[26px] border shadow-2xl p-4 sm:p-6 ${
        isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-slate-200/80 bg-white text-slate-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>

          <div className={`text-[13px] sm:text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Leaderboard</div>
          <div className={`text-[11px] sm:text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Ranked by correct answers</div>
        </div>
        <div
          className={`rounded-full border text-[11px] sm:text-xs font-semibold px-3 py-1 ${
            isDark ? "border-orange-400/30 bg-orange-500/10 text-orange-200" : "border-orange-500/30 bg-orange-500/10 text-orange-700"
          }`}
        >
          #3 this week
        </div>
      </div>

      <div className={`mt-3 sm:mt-4 flex items-center gap-3 text-[11px] sm:text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        <span
          className={`rounded-full border px-3 py-1 font-semibold ${
            isDark ? "border-white/10 bg-white/10 text-slate-100" : "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          All
        </span>
        <span className={isDark ? "text-slate-500" : "text-slate-500"}>Friends</span>
      </div>

      <div className={`mt-4 sm:mt-5 rounded-2xl border overflow-x-auto ${isDark ? "border-white/10" : "border-slate-200"}`}>
        <div
          className={`grid grid-cols-[40px,1fr,80px] gap-3 px-4 py-3 text-[11px] sm:text-xs font-semibold ${
            isDark ? "text-slate-400 bg-slate-900/70" : "text-slate-500 bg-slate-100"
          }`}
        >
          <span>#</span>
          <span>Learner</span>
          <span className="text-right">Score</span>
        </div>
        {[
          { rank: 1, name: "quinnsterland", score: 63 },
          { rank: 2, name: "24pvennama", score: 34 },
          { rank: 3, name: "You", score: 23, highlight: true },
          { rank: 4, name: "nkmaps13", score: 19 },
          { rank: 5, name: "akshajk1812", score: 11 },
        ].map((row) => (
          <div
            key={row.rank}
            className={`grid grid-cols-[40px,1fr,80px] gap-3 px-4 py-3 text-[13px] sm:text-sm ${
              row.highlight
                ? isDark
                  ? "bg-orange-500/15 text-orange-100 font-semibold"
                  : "bg-orange-500/10 text-orange-700 font-semibold"
                : isDark
                  ? "bg-slate-950/40 text-slate-200"
                  : "bg-white text-slate-700"
            }`}
          >
            <span>{row.rank}</span>
            <span>{row.name}</span>
            <span className="text-right">{row.score}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <HoverFact tone={tone}>Optional visibility keeps it distraction-free.</HoverFact>
      </div>
    </div>
  );
}
