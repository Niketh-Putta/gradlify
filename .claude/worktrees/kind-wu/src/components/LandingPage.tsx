import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle, ShieldCheck, Sparkles, Moon, Sun, MousePointer2 } from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DemoQuestion, elevenPlusDemoQuestions, mobileDemoQuestions } from "@/components/DemoQuestion";
import { FoundersBanner } from "@/components/FoundersBanner";
import { FoundersSprintLabel } from "@/components/FoundersSprintLabel";
import { LogoMark } from "@/components/LogoMark";
import { DiscordFooterEntry } from "@/components/DiscordFooterEntry";
import { supabase } from "@/integrations/supabase/client";
import { getSprintUpgradeCopy } from "@/lib/foundersSprint";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { QUADRATICS_GUIDE } from "@/lib/revisionGuide";
import { getDashboardPath, setSignupTrack } from "@/lib/track";
import readinessVideo from "@/assets/exam-readiness.mov";
import practiceVideo from "@/assets/practice-question.mov";
import homeScreenVideo from "@/assets/Home screen.mov";

const LANDING_EASING: [number, number, number, number] = [0.22, 1, 0.36, 1];

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
  variant?: "gcse" | "11plus";
}

type FeedbackType = "support" | "suggestion";
export function LandingPage({ onAuthAction, theme = "light", onThemeToggle, variant = "gcse" }: LandingPageProps) {
  const motionCfg = useLandingMotion();
  const isDark = theme === "dark";
  const isElevenPlus = variant === "11plus";
  const trackTitle = isElevenPlus ? "11+ Maths" : "GCSE Maths";
  const trackShort = isElevenPlus ? "11+" : "GCSE";
  const sprintCopy = getSprintUpgradeCopy();
  const [isScrolled, setIsScrolled] = useState(false);
  const [ambientEffectsEnabled, setAmbientEffectsEnabled] = useState(true);
  const [showInternationalTagline, setShowInternationalTagline] = useState(false);
  const hasSession = false;
  const sessionChecked = true;
  const [guideDownloading, setGuideDownloading] = useState(false);
  const dashboardPath = getDashboardPath();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("support");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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

  const handleGuideDownload = useCallback(async () => {
    if (guideDownloading) return;
    setGuideDownloading(true);

    const filename = "Gradlify_GCSE_Maths_Quadratics_Free_Notes_giveaway.pdf";
    try {
      const response = await fetch(QUADRATICS_GUIDE.pdfSrc, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to fetch guide: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success("Revision guide downloaded.");
    } catch (error) {
      console.error("Guide download failed:", error);
      window.open(QUADRATICS_GUIDE.pdfSrc, "_blank", "noopener");
      toast.error("Download started in a new tab.");
    } finally {
      setGuideDownloading(false);
    }
  }, [guideDownloading]);

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

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const handleSignup = () => {
    setSignupTrack(isElevenPlus ? "11plus" : "gcse");
    onAuthAction('signup');
  };
  const handleDashboardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onAuthAction('login');
  };

  const faqs = useMemo(
    () => [
      {
        q: isElevenPlus ? "Which 11+ formats does Gradlify support?" : "Which exam boards does Gradlify support?",
        a: isElevenPlus
          ? "11+ maths preparation with exam-style question formats and readiness tracking for GL, CEM, and ISEB."
          : "All GCSE boards — the content is aligned to the standard GCSE Maths curriculum.",
      },
      {
        q: isElevenPlus ? "Can I practise mixed 11+ question styles?" : "Does Gradlify support Foundation and Higher tier?",
        a: isElevenPlus
          ? "Yes. You can practise varied 11+ style questions with structured progression."
          : "Yes. You can practise across both tiers and mix calculator and non-calculator sessions.",
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
        q: "Is there a free plan?",
        a: AI_FEATURE_ENABLED
          ? "Yes — start for free, then upgrade when you want deeper analytics and higher AI limits."
          : "Yes — start for free, then upgrade when you want deeper analytics and higher limits.",
      },
    ],
    [isElevenPlus]
  );

  const handleSubmitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = feedbackMessage.trim();
    const trimmedEmail = feedbackEmail.trim();

    if (!trimmedMessage) {
      toast.error("Please enter a message before submitting.");
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { error } = await supabase.from("support_requests").insert({
        kind: feedbackType,
        message: trimmedMessage,
        email: trimmedEmail || null,
        user_id: session?.user?.id ?? null,
      });

      if (error) throw error;

      setFeedbackEmail("");
      setFeedbackMessage("");
      setFeedbackType("support");
      toast.success("Thanks! Your message has been sent.");
    } catch (error) {
      console.error("Support request error:", error);
      toast.error("Could not send your message. Please try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const navLinkClass = isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const mutedText = isDark ? "text-slate-200/90" : "text-slate-600";
  const subtleText = isDark ? "text-slate-300/75" : "text-slate-500";
  const accentText = isElevenPlus ? (isDark ? "text-rose-200" : "text-rose-600") : isDark ? "text-indigo-300" : "text-indigo-600";
  const sectionSurface = isDark ? "bg-[linear-gradient(180deg,#020617_0%,#050b1a_100%)]" : "bg-slate-50";
  const guidePromoSurface = isDark
    ? "border-white/15 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(129,140,248,0.18),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(14,165,233,0.15),transparent_60%)]"
    : "border-slate-200/80 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.16),transparent_58%),radial-gradient(120%_120%_at_100%_100%,rgba(14,165,233,0.12),transparent_62%)]";
  const guidePromoGlow = isDark
    ? "shadow-[0_30px_80px_-40px_rgba(99,102,241,0.55)]"
    : "shadow-[0_30px_80px_-45px_rgba(79,70,229,0.35)]";
  const guidePromoBadge = isDark
    ? "border-white/15 bg-white/10 text-slate-100"
    : "border-white/70 bg-white text-slate-800";
  const guidePromoMuted = isDark ? "text-slate-300/90" : "text-slate-700/80";
  const guidePromoMeta = isDark ? "text-slate-200" : "text-slate-800";
  const chipClass = isDark
    ? "border-white/10 bg-white/5 text-slate-200"
    : "border-slate-200/80 bg-white text-slate-700";
  const cardSurface = isDark
    ? "border-white/15 bg-[linear-gradient(160deg,rgba(15,23,42,0.90),rgba(15,23,42,0.72))] backdrop-blur-sm"
    : "border-slate-200/80 bg-white";
  const panelSurface = isDark
    ? "border-white/15 bg-[linear-gradient(160deg,rgba(2,6,23,0.85),rgba(2,6,23,0.68))]"
    : "border-slate-200/80 bg-slate-50";
  const heatGradient = {
    tailwind: "from-red-600 via-orange-400 to-amber-300",
    inline: "linear-gradient(135deg, #991B1B, #F97316, #FCD34D)",
  };
  const indigoGradient = {
    tailwind: "from-indigo-500 via-blue-500 to-purple-500",
    inline: "linear-gradient(90deg, #6366f1 0%, #2563eb 50%, #7c3aed 100%)",
  };
  const accentGradient = isElevenPlus ? heatGradient : indigoGradient;
  const heroGradient = isElevenPlus
    ? accentGradient.tailwind
    : isDark
      ? "from-indigo-300 via-sky-300 to-cyan-200"
      : indigoGradient.tailwind;
  const premiumCardGradient = isElevenPlus
    ? "bg-gradient-to-br from-red-600 via-orange-500 to-amber-400 border border-red-500/70 text-white"
    : "bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 border border-indigo-200 text-white";
  const feedbackButtonGradient = isElevenPlus
    ? "bg-gradient-to-r from-red-600 via-orange-500 to-amber-400"
    : "bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600";
  const supportButtonActiveClass = isElevenPlus
    ? `rounded-full px-4 py-2 sm:px-5 sm:py-2.5 ${feedbackButtonGradient} text-white hover:brightness-95`
    : "rounded-full px-4 py-2 sm:px-5 sm:py-2.5 bg-indigo-600/90 text-white hover:bg-indigo-600";
  const outlineButtonClass = isDark
    ? "border-white/20 text-white bg-white/10 hover:bg-white/20 hover:text-white"
    : "border-slate-200 text-slate-900 bg-white hover:bg-slate-100";

  const showcaseRows = useMemo(
    () => [
      {
        key: "exam",
        label: "Priority 01",
        title: isElevenPlus ? "Exam-style questions that feel like real 11+" : "Exam-style questions that feel like the real GCSE",
        body: isElevenPlus
          ? "Structured by 11+ maths skills and difficulty so practice translates directly into exam confidence."
          : "Structured by calculator/non-calculator, Foundation/Higher, and difficulty — practice translates directly into exam performance.",
        badge: "Exam-style practice",
        hoverFact: "Hover the preview — it mirrors the real exam flow.",
        media: (
          <HoverVideo
            src={practiceVideo}
            className="h-full w-full object-contain"
            playOnHover
            tone={theme}
            accentGradient={isElevenPlus ? heatGradient : undefined}
          />
        ),
        mediaAspect: "aspect-[5/8] sm:aspect-[4/5] lg:aspect-[3/4]",
        frameClassName: "max-w-[440px] sm:max-w-[480px] lg:max-w-[520px] mx-auto lg:mx-0",
      },
      {
        key: "feedback",
        label: "Priority 02",
        title: "Instant, step-by-step feedback (like a tutor)",
        body: "Clear working, common pitfalls, and next-step prompts. Students learn the method, parents see real teaching.",
        badge: "Explanation in seconds",
        hoverFact: "Hints show the method, not just the answer.",
        media: <ExplanationPreview tone={theme} />,
        reverse: true,
      },
      {
        key: "tracking",
        label: "Priority 03",
        title: "Weak-topic tracking that tells you what to revise next",
        body: "Automated focus lists remove decision fatigue. See readiness by topic, question type, and tier.",
        badge: "Readiness dashboard",
        hoverFact: "Your focus list updates as soon as you practise.",
        media: (
          <HoverVideo
            src={readinessVideo}
            className="h-full w-full object-cover"
            playOnHover
            tone={theme}
            accentGradient={isElevenPlus ? heatGradient : undefined}
          />
        ),
      },
      {
        key: "mock",
        label: "Priority 04",
        title: "Mock exams + exam readiness score",
        body: isElevenPlus
          ? "Timed 11+ mocks with grading. Readiness turns effort into a single, honest score you can move weekly."
          : "Timed mocks with calculator modes and grading. Readiness turns effort into a single, honest score you can move weekly.",
        badge: "Session builder",
        hoverFact: isElevenPlus ? "Mock scoring stays aligned to 11+ timing." : "Mock scoring stays aligned to GCSE timing.",
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
            ? "bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(185,28,28,0.25),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(234,88,12,0.2),transparent_68%),#100404] text-white"
            : "bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(239,68,68,0.18),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(251,146,60,0.2),transparent_68%),#fff7ed] text-slate-900"
          : isDark
            ? "bg-[radial-gradient(1200px_460px_at_20%_-5%,rgba(99,102,241,0.20),transparent_62%),radial-gradient(900px_420px_at_82%_8%,rgba(14,165,233,0.12),transparent_68%),#020617] text-white"
            : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Nav */}
      <nav
        className={[
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? isDark
              ? "bg-slate-950/95 backdrop-blur border-b border-white/10 text-white shadow-lg shadow-black/25"
              : "bg-white text-slate-900 shadow-sm"
            : isDark
              ? "bg-slate-950/90 backdrop-blur border-b border-white/10 text-white shadow-sm shadow-black/20"
              : "bg-white text-slate-900 shadow-sm",
        ].join(" ")}
      >
        <FoundersBanner track={isElevenPlus ? '11plus' : 'gcse'} />
        <div className="max-w-7xl mx-auto px-3 pr-4 sm:px-6 sm:pr-6 py-2.5 sm:py-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <a href="#" className="flex items-center gap-3">
              <div
                className={`rounded-full p-1 sm:p-1.5 shadow-lg ${
                  isDark ? "bg-slate-900/80 border border-white/10" : "bg-white border border-slate-200"
                }`}
              >
                <LogoMark className="w-8 h-8 sm:w-9 sm:h-9" variant={isDark ? "dark" : "light"} />
              </div>
              <div className="leading-tight">
                <div className={`text-[13px] sm:text-sm font-semibold ${primaryText}`}>Gradlify</div>
                <div className={`text-[11px] sm:text-xs ${subtleText} hidden sm:block`}>
                  {trackTitle}. Practised properly.
                </div>
              </div>
            </a>

            <div className="hidden lg:flex items-center gap-6 text-sm">
              <Link to="/11-plus" className={navLinkClass}>11+</Link>
              <Link to="/gcse" className={navLinkClass}>GCSE</Link>
              <a href="#pricing" className={navLinkClass}>Pricing</a>
              <a href="/free-tools" className={navLinkClass}>Free Tools</a>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {onThemeToggle && (
                <button
                  type="button"
                  onClick={onThemeToggle}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors sm:gap-2 sm:px-3 sm:py-2 sm:text-xs ${
                    isDark
                      ? "border-white/10 text-slate-200 hover:text-white hover:border-white/30"
                      : "border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400"
                  }`}
                  aria-label="Toggle landing page theme"
                >
                  {isDark ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  <span className="hidden sm:inline">{isDark ? "Light mode" : "Dark mode"}</span>
                </button>
              )}
            <Button
              variant="ghost"
              onClick={() => onAuthAction("login")}
              className={`px-1.5 py-1 text-[10px] sm:text-sm sm:px-3 sm:py-2 ${
                isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </Button>
            {!isElevenPlus && (
              <Button
                onClick={handleSignup}
                className={`rounded-full bg-gradient-to-r ${accentGradient.tailwind} text-white font-semibold px-2.5 py-1 text-[10px] sm:text-sm sm:px-5 sm:py-2.5 shadow-xl shadow-rose-500/40 max-w-[120px] sm:max-w-none whitespace-nowrap`}
              >
                <span className="sm:hidden">Start free</span>
                <span className="hidden sm:inline">Start practising free</span>
              </Button>
            )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16 sm:pt-0">
        {/* Hero */}
        <section className="relative pt-24 sm:pt-32 lg:pt-36 pb-12 sm:pb-18 lg:pb-20 overflow-hidden">
          {ambientEffectsEnabled && (
            <div className="absolute inset-0 pointer-events-none">
              {isDark ? (
                <>
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(900px_420px_at_20%_-5%,rgba(99,102,241,0.22),transparent_65%)]" />
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(720px_420px_at_80%_35%,rgba(56,189,248,0.14),transparent_62%)]" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(900px_420px_at_20%_-5%,rgba(79,70,229,0.14),transparent_65%)]" />
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(720px_420px_at_80%_35%,rgba(56,189,248,0.10),transparent_62%)]" />
                </>
              )}
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div className="grid lg:grid-cols-12 gap-8 sm:gap-8 lg:gap-10 items-start" initial="hidden" animate="show" variants={motionCfg.stagger}>
              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-6 lg:pr-6">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-xs font-semibold ${chipClass}`}>
                <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isDark ? (isElevenPlus ? "text-fuchsia-200" : "text-indigo-300") : (isElevenPlus ? "text-fuchsia-600" : "text-indigo-500")}`} />
                Real {trackTitle} practice, without the noise.
              </div>

                <h1 className={`mt-5 text-[28px] leading-tight sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight ${primaryText}`}>
                  {trackTitle}.{" "}
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${heroGradient}`}>
                    Practised properly.
                  </span>
                </h1>

                <p className={`mt-4 text-sm sm:text-lg ${mutedText} max-w-2xl leading-relaxed`}>
                  A serious {trackTitle} system that keeps practice aligned, progress visible, and revision simple.
                </p>
                {showInternationalTagline && (
                  <p className={`mt-2 text-[13px] sm:text-base ${mutedText} max-w-2xl`}>
                    Learn UK maths and practise properly from anywhere—our exam-style questions, step-by-step feedback, and readiness tracking are trusted by learners worldwide.
                  </p>
                )}

                <div className="mt-5 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                <HeroCTA onClick={handleSignup} tone={theme} accentGradient={accentGradient} />
                  <Button
                    variant="outline"
                    onClick={() => scrollTo("product")}
                    className={`rounded-full px-4 py-2.5 text-[13px] sm:px-6 sm:py-4 sm:text-sm font-semibold ${outlineButtonClass}`}
                  >
                    See the product
                  </Button>
                </div>

                <div
                  className={`mt-5 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-3 text-xs sm:text-sm ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  {[
                    isElevenPlus
                      ? "1,500+ 11+ style questions"
                      : `4,000+ ${trackShort}-style questions`,
                    isElevenPlus ? "11+ maths-aligned practice" : "GCSE-aligned (all boards)",
                    isElevenPlus ? "Core arithmetic + reasoning" : "Foundation + Higher",
                    isElevenPlus ? "Speed + accuracy training" : "Calculator & Non-Calculator",
                  ].map((label) => (
                    <div key={label} className={`inline-flex items-center gap-2 rounded-full px-2 py-1 sm:px-3 sm:py-2 ${chipClass}`}>
                    <CheckCircle className={`h-3 w-3 sm:h-4 sm:w-4 ${isDark ? (isElevenPlus ? "text-amber-200" : "text-indigo-300") : (isElevenPlus ? "text-amber-600" : "text-indigo-500")}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-6 lg:pl-2 relative">
                <div className={`relative rounded-[20px] sm:rounded-[28px] border shadow-2xl overflow-hidden ${cardSurface}`}>
                  <div
                    className={`absolute inset-0 pointer-events-none ${
                      isDark
                        ? "bg-[radial-gradient(340px_200px_at_80%_0%,rgba(99,102,241,0.25),transparent_60%)]"
                        : "bg-[radial-gradient(320px_200px_at_85%_0%,rgba(99,102,241,0.18),transparent_60%)]"
                    }`}
                  />
                  <div className="relative p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <div className={`flex items-center justify-between text-[11px] sm:text-sm ${mutedText}`}>
                      <div>
                        <div className={`text-[11px] sm:text-sm font-semibold ${primaryText}`}>Session Builder</div>
                        <div className={`text-[10px] sm:text-xs ${subtleText}`}>Choose modes, tiers, and topics in seconds</div>
                      </div>
                      <div
                        className={`rounded-full text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 border inline-flex items-center gap-2 ${
                          isDark
                            ? "bg-emerald-400/10 text-emerald-200 border-emerald-400/20"
                            : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        }`}
                      >
                        <MousePointer2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        Hover preview
                      </div>
                    </div>

                    <div className={`aspect-[16/9] rounded-2xl overflow-hidden border shadow-inner ${panelSurface}`}>
                      <HoverVideo
                        src={homeScreenVideo}
                        className="h-full w-full object-cover"
                        playOnHover
                        tone={theme}
                        accentGradient={isElevenPlus ? heatGradient : undefined}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3 text-[11px] sm:text-xs">
                      {[
                        { label: "Modes", value: "Practice • Mock • Challenge" },
                        { label: "Tiers", value: "Foundation • Higher • Mixed" },
                        { label: "Scope", value: "Topic + subtopic control" },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl border px-2.5 py-2 sm:px-4 sm:py-3 ${panelSurface}`}>
                          <div className={subtleText}>{item.label}</div>
                          <div className={`mt-1 text-[11px] sm:text-sm font-semibold ${primaryText}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          </div>
        </section>

        {sessionChecked && !hasSession && !isElevenPlus && (
          <section aria-label="Quadratics revision guide giveaway" className={`relative -mt-4 pb-8 sm:pb-12 ${sectionSurface}`}>
            <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
              <div className={`relative overflow-hidden rounded-[24px] sm:rounded-[28px] border px-5 py-5 sm:px-8 sm:py-8 ${guidePromoSurface} ${guidePromoGlow}`}>
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] sm:px-3 sm:py-1 sm:text-[11px] font-semibold uppercase tracking-[0.16em] ${guidePromoBadge}`}>
                        Free 20 pound giveaway
                      </span>
                      <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-[0.16em] ${guidePromoMeta}`}>
                        Quadratics notes drop
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className={`text-lg sm:text-2xl font-semibold tracking-tight ${primaryText}`}>
                        Quadratic Equations &amp; Graphs revision booklet
                      </h3>
                      <p className={`text-[13px] sm:text-[15px] ${guidePromoMuted}`}>
                        A premium, exam-board-aware guide you can print, annotate, and revise from today.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] sm:text-sm">
                      {[
                        "Higher tier clarity",
                        "Worked examples",
                        "Exam technique notes",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full border px-2.5 py-1 sm:px-3 sm:py-1.5 font-medium ${guidePromoBadge}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <Button
                      type="button"
                      variant="premium"
                      onClick={handleGuideDownload}
                      disabled={guideDownloading}
                      className="rounded-full px-5 py-2.5 text-[13px] sm:px-6 sm:text-sm font-semibold shadow-[0_20px_45px_-25px_rgba(79,70,229,0.6)]"
                    >
                      {guideDownloading ? "Preparing download..." : "Download the free guide"}
                    </Button>
                    <p className={`text-[10px] sm:text-[11px] ${guidePromoMuted}`}>
                      Instant download. No signup needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Why it works */}
        <section id="product" className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(700px_420px_at_15%_10%,rgba(56,189,248,0.10),transparent_60%)]"
                  : "bg-[radial-gradient(700px_420px_at_15%_10%,rgba(99,102,241,0.10),transparent_60%)]"
              }`}
            />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <motion.div initial="hidden" whileInView="show" viewport={motionCfg.viewport} variants={motionCfg.stagger} className="space-y-10">
              <motion.div id="why" variants={motionCfg.fadeUp} className="max-w-3xl">
                <div className={`text-sm font-semibold ${accentText}`}>Why Gradlify</div>
                <h2 className={`mt-3 text-2xl sm:text-4xl font-semibold tracking-tight ${primaryText}`}>
                  Designed for serious {trackShort} results.
                </h2>
                <p className={`mt-4 ${mutedText} leading-relaxed`}>
                  No vague blocks. Every panel is a real preview of what students actually see.
                </p>
                <div className={`mt-4 hidden md:inline-flex items-center gap-2 text-xs ${subtleText}`}>
                  <MousePointer2 className={`h-4 w-4 ${accentText}`} />
                  Videos play on hover, never on autoplay.
                </div>
              </motion.div>

              <div className="mt-10 space-y-12 sm:space-y-14 lg:space-y-16">
                {showcaseRows.map((row) => (
                  <ShowcaseRow key={row.key} row={row} variants={motionCfg.fadeUp} tone={theme} />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Leaderboard */}
        <section id="leaderboard" className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(600px_360px_at_85%_20%,rgba(99,102,241,0.12),transparent_62%)]"
                  : "bg-[radial-gradient(600px_360px_at_85%_20%,rgba(99,102,241,0.08),transparent_62%)]"
              }`}
            />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={motionCfg.viewport} variants={motionCfg.stagger} className="grid lg:grid-cols-12 gap-8 items-start">
              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-4 space-y-4">
                <div className={`text-sm font-semibold ${accentText}`}>Momentum</div>
                <h2 className={`text-2xl sm:text-4xl font-semibold tracking-tight ${primaryText}`}>
                  Leaderboard that feels motivating, not noisy.
                </h2>
                <p className={`${mutedText} leading-relaxed`}>
                  Visible progress builds consistency. Keep it friendly, optional, and grounded in real practice.
                </p>
                <div className={`space-y-3 text-[13px] sm:text-sm ${mutedText}`}>
                  {["Weekly view", "Friends and class modes", "Optional visibility"].map((line) => (
                    <div key={line} className="flex items-start gap-3">
                      <CheckCircle className={`mt-0.5 h-5 w-5 ${accentText}`} />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-8">
                <LeaderboardPreview tone={theme} />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Demo question */}
          <section id="demo" className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface} hidden sm:block`}>
          {ambientEffectsEnabled && (
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(620px_360px_at_15%_25%,rgba(56,189,248,0.10),transparent_65%)]"
                  : "bg-[radial-gradient(620px_360px_at_15%_25%,rgba(56,189,248,0.08),transparent_65%)]"
              }`}
            />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={motionCfg.viewport} variants={motionCfg.stagger} className="grid lg:grid-cols-12 gap-8 items-start">
              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-4 space-y-4">
                <div className={`text-sm font-semibold ${accentText}`}>Try it</div>
                <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight ${primaryText}`}>Practise now.</h2>
                <p className={`${mutedText} leading-relaxed`}>
                  A live question flow you can try in under a minute. Tap through and see how it feels.
                </p>
                <div className={`space-y-3 text-sm ${mutedText}`}>
                  {["Built for mobile screens", "No login required for preview", "Instant start"].map((line) => (
                    <div key={line} className="flex items-start gap-3">
                      <CheckCircle className={`mt-0.5 h-5 w-5 ${accentText}`} />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-8">
              <div className={`rounded-[24px] p-5 sm:p-7 ${cardSurface} group shadow-none sm:shadow-xl border border-transparent sm:border`}>
                <div className="hidden sm:flex items-center justify-between gap-3 mb-4">
                  <div className={`text-sm font-semibold ${primaryText}`}>Sample question</div>
                  <Button
                    size="sm"
                    onClick={handleSignup}
                    className={`rounded-full px-5 py-2 text-white shadow-lg shadow-rose-500/30 ${isElevenPlus ? feedbackButtonGradient : "bg-indigo-600"}`}
                  >
                    Start practising free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              <div className="w-full flex justify-start">
                  <div
                    className={`w-full max-w-3xl mx-auto rounded-2xl border border-transparent sm:border p-4 sm:p-6 ${
                      isDark ? "border-white/10 bg-slate-950/60" : "border-slate-200 bg-white"
                    }`}
                  >
                  <DemoQuestion
                    embedded
                    tone={theme}
                    onStartPracticeClick={handleSignup}
                    accentGradient={isElevenPlus ? heatGradient : undefined}
                    questions={isElevenPlus ? elevenPlusDemoQuestions : undefined}
                  />
                </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <HoverFact tone={theme}>Instant feedback appears after every answer.</HoverFact>
                  </div>
              </div>
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
                  Start free. Begin your 3 Day Free Trial when ready.
                </h2>
                <p className={`mt-4 ${mutedText} leading-relaxed`}>Honest pricing, cancel anytime.</p>
              </motion.div>

              <div className="mt-8 sm:mt-10 grid md:grid-cols-2 gap-4 sm:gap-5 max-w-5xl">
                <motion.div variants={motionCfg.fadeUp} className={`rounded-[20px] sm:rounded-[22px] border p-5 sm:p-7 shadow-sm ${cardSurface}`}>
                  <div className={`text-sm font-semibold ${subtleText}`}>Free</div>
                  <div className="mt-4 flex items-end gap-2">
                    <div className={`text-3xl sm:text-4xl font-semibold ${primaryText}`}>£0</div>
                    <div className={`text-sm ${subtleText} pb-1`}>/month</div>
                  </div>
                  <p className={`mt-3 text-[13px] sm:text-sm ${mutedText}`}>Everything you need to begin consistently.</p>
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
                  <Button
                    onClick={handleSignup}
                    className={`mt-6 sm:mt-8 w-full rounded-full font-semibold py-4 sm:py-6 ${
                      isDark ? "bg-white text-slate-900 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-900"
                    }`}
                  >
                    Start practising free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <div className={`mt-2 sm:mt-3 text-[11px] sm:text-xs text-center ${subtleText}`}>Free forever plan available</div>
                </motion.div>

                <motion.div variants={motionCfg.fadeUp} className={`rounded-[20px] sm:rounded-[22px] ${premiumCardGradient} p-5 sm:p-7 shadow-xl`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white/90">Premium</div>
                    <div className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                      Best for exams
                    </div>
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    <div className="text-3xl sm:text-4xl font-semibold">£4.99</div>
                    <div className="text-sm text-white/80 pb-1">/month</div>
                  </div>
                  <p className="mt-3 text-[13px] sm:text-sm text-white/80">
                    {AI_FEATURE_ENABLED ? 'More mocks, deeper analytics, higher AI limits.' : 'More mocks, deeper analytics, higher limits.'}
                  </p>
                  <div className="mt-5 sm:mt-6 space-y-3 text-[13px] sm:text-sm text-white/90">
                    {[
                      "Full timed mock exams",
                      "Deeper readiness analytics",
                      AI_FEATURE_ENABLED ? "Higher AI explanation limits" : "Higher explanation limits",
                      "Priority support",
                    ].map((line) => (
                      <div key={line} className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-5 w-5 text-white" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSignup}
                    className="mt-6 sm:mt-8 w-full rounded-full bg-white text-indigo-700 font-semibold py-4 sm:py-6 hover:bg-white"
                  >
                    {sprintCopy.buttonSecondary}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <div className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-white/80 text-center">Cancel anytime</div>
                </motion.div>
              </div>

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
                  ? "bg-[radial-gradient(640px_320px_at_10%_30%,rgba(59,130,246,0.10),transparent_65%)]"
                  : "bg-[radial-gradient(640px_320px_at_10%_30%,rgba(99,102,241,0.08),transparent_65%)]"
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
                  The essentials — so you can decide quickly.
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

        {/* Discord spotlight */}
        <section className={`relative py-12 sm:py-16 ${sectionSurface}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <DiscordFooterEntry variant="spotlight" className="w-full" />
          </div>
        </section>

        {/* Support */}
        <section id="support" className={`relative py-12 sm:py-16 lg:py-20 ${sectionSurface}`}>
          {ambientEffectsEnabled && (
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(620px_340px_at_80%_25%,rgba(99,102,241,0.12),transparent_60%)]"
                  : "bg-[radial-gradient(620px_340px_at_80%_25%,rgba(99,102,241,0.08),transparent_60%)]"
              }`}
            />
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" whileInView="show" viewport={motionCfg.viewport} variants={motionCfg.stagger} className="grid lg:grid-cols-12 gap-10 items-start">
              <motion.div variants={motionCfg.fadeUp} className="lg:col-span-4">
                <div className={`text-sm font-semibold ${accentText}`}>Support</div>
                <h2 className={`mt-3 text-2xl sm:text-4xl font-semibold tracking-tight ${primaryText}`}>
                  Talk to us.
                </h2>
                <p className={`mt-4 ${mutedText} leading-relaxed`}>
                  Found something confusing or want to suggest an improvement? Send a message — we read every one.
                </p>
              </motion.div>

              <motion.div variants={motionCfg.fadeUp} className={`lg:col-span-8 rounded-[26px] sm:rounded-3xl border shadow-lg p-5 sm:p-8 ${cardSurface}`}>
                <form onSubmit={handleSubmitFeedback} className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant={feedbackType === "support" ? "default" : "outline"}
                    className={
                        feedbackType === "support"
                          ? supportButtonActiveClass
                          : `rounded-full px-4 py-2 sm:px-5 sm:py-2.5 border ${isDark ? "text-slate-200 border-white/10" : "text-slate-700 border-slate-200"} bg-transparent`
                      }
                      onClick={() => setFeedbackType("support")}
                    >
                      Contact support
                    </Button>
                    <Button
                      type="button"
                      variant={feedbackType === "suggestion" ? "default" : "outline"}
                    className={
                        feedbackType === "suggestion"
                          ? supportButtonActiveClass
                          : `rounded-full px-4 py-2 sm:px-5 sm:py-2.5 border ${isDark ? "text-slate-200 border-white/10" : "text-slate-700 border-slate-200"} bg-transparent`
                      }
                      onClick={() => setFeedbackType("suggestion")}
                    >
                      Suggest improvement
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className={`text-sm font-medium ${primaryText}`}>Email (optional)</label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={feedbackEmail}
                        onChange={(event) => setFeedbackEmail(event.target.value)}
                        className={`mt-2 rounded-xl border ${
                          isDark
                            ? "border-white/10 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                            : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${primaryText}`}>Your message</label>
                      <Textarea
                        placeholder="Tell us what you need help with or what we should improve."
                        value={feedbackMessage}
                        onChange={(event) => setFeedbackMessage(event.target.value)}
                        className={`mt-2 min-h-[120px] sm:min-h-[140px] rounded-xl border ${
                          isDark
                            ? "border-white/10 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                            : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className={`text-sm ${subtleText}`}>
                      We review every message. Please do not share sensitive information.
                    </p>
                    <Button
                      type="submit"
                      disabled={feedbackSubmitting}
                    className={`rounded-full ${feedbackButtonGradient} text-white font-semibold px-5 py-2.5 sm:px-6 sm:py-3`}
                    >
                      {feedbackSubmitting ? "Sending..." : "Send message"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
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
                <div className={`text-[11px] sm:text-xs ${subtleText}`}>{trackTitle}. Practised properly.</div>
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
              <button
                type="button"
                className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
                onClick={() => scrollTo("demo")}
              >
                Demo
              </button>
              <button
                type="button"
                className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
                onClick={() => scrollTo("pricing")}
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
          <DiscordFooterEntry className="px-4 sm:px-6 mt-8" />
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
    <div className="group flex flex-col">
      <SpotlightButton onClick={onClick} gradient={accentGradient.inline} />
      <span
        className={`mt-2 text-[11px] sm:text-xs transition-colors ${
          isDark ? "text-slate-300/70 group-hover:text-slate-200" : "text-slate-500 group-hover:text-slate-700"
        }`}
      >
        No card. No pressure. Just real practice.
      </span>
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
    ? "0 18px 52px rgba(79,70,229,0.55), 0 0 35px rgba(99,102,241,0.55)"
    : "0 16px 40px rgba(79,70,229,0.4), 0 0 28px rgba(99,102,241,0.35)";

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="group relative overflow-hidden rounded-full px-4 py-2.5 text-[13px] sm:px-6 sm:py-4 sm:text-base font-semibold text-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
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
  accentGradient?: GradientDefinition;
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
      {accentGradient && (
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
            <MousePointer2 className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isDark ? "text-indigo-300" : "text-indigo-500"}`} />
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
  variants: Record<string, unknown>;
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
        <div
          className={`mt-6 inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] sm:text-xs ${
            isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-slate-200/80 bg-white text-slate-700"
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isDark ? "text-indigo-300" : "text-indigo-600"}`} />
          {row.badge}
        </div>
        {row.hoverFact && (
          <div className="mt-4">
            <HoverFact tone={tone}>{row.hoverFact}</HoverFact>
          </div>
        )}
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
            ? "bg-[radial-gradient(280px_220px_at_20%_0%,rgba(99,102,241,0.18),transparent_70%)]"
            : "bg-[radial-gradient(280px_220px_at_20%_0%,rgba(99,102,241,0.12),transparent_70%)]"
        }`}
      />
      <div className={`relative ${aspectClassName} ${isDark ? "bg-slate-950/60" : "bg-slate-50"}`}>{children}</div>
    </div>
  );
}

function ExplanationPreview({ tone }: { tone: "dark" | "light" }) {
  const isDark = tone === "dark";
  return (
    <div className="h-full w-full p-4 sm:p-6 flex flex-col justify-between gap-4">
      <div
        className={`rounded-2xl border px-4 py-3 text-[11px] sm:text-xs ${
          isDark ? "border-white/10 bg-slate-950/60 text-slate-300" : "border-slate-200/80 bg-white text-slate-600"
        }`}
      >
        Solve: 2x + 7 = 19
      </div>
      <div className="grid gap-2">
        {["x = 6", "x = 5", "x = 8"].map((option, index) => (
          <div
            key={option}
            className={`rounded-xl border px-4 py-3 text-[13px] sm:text-sm ${
              index === 1
                ? isDark
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : isDark
                  ? "border-white/10 bg-white/5 text-slate-200"
                  : "border-slate-200/80 bg-white text-slate-700"
            }`}
          >
            {option}
          </div>
        ))}
      </div>
      <div
        className={`rounded-2xl border px-4 py-3 text-[11px] sm:text-xs ${
          isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200/80 bg-slate-50 text-slate-600"
        }`}
      >
        Subtract 7 from both sides → 2x = 12, then divide by 2.
      </div>
    </div>
  );
}

function HoverFact({ tone, children }: { tone: "dark" | "light"; children: React.ReactNode }) {
  const isDark = tone === "dark";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] transition-all duration-300 ${
        isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200/80 bg-white text-slate-600"
      } opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0`}
    >
      <MousePointer2 className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isDark ? "text-indigo-300" : "text-indigo-500"}`} />
      {children}
    </div>
  );
}

function MockBuilderPreview({ tone }: { tone: "dark" | "light" }) {
  const isDark = tone === "dark";
  return (
    <div className={`h-full w-full p-4 sm:p-5 flex flex-col gap-3 text-[11px] sm:text-xs ${isDark ? "text-slate-200" : "text-slate-600"}`}>
      <div className="space-y-2">
        <div className={`text-[10px] sm:text-[11px] uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Step 1
        </div>
        <div className={`text-[13px] sm:text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Session Type</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Practice", active: true },
            { label: "Mock Exam" },
            { label: "Challenge" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border px-2.5 py-2 text-[10px] sm:text-[11px] ${
                item.active
                  ? isDark
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100"
                    : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700"
                  : isDark
                    ? "border-white/10 bg-white/5 text-slate-300"
                    : "border-slate-200/80 bg-white text-slate-600"
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className={`text-[10px] sm:text-[11px] uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Step 2
        </div>
        <div className={`text-[13px] sm:text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Constraints</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["Adaptive", "Foundation", "Higher", "Mixed"].map((item, index) => (
            <span
              key={item}
              className={`rounded-full border px-3 py-1 text-[10px] sm:text-[11px] ${
                index === 0
                  ? isDark
                    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-700"
                  : isDark
                    ? "border-white/10 bg-white/5 text-slate-300"
                    : "border-slate-200/80 bg-white text-slate-600"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className={`text-[10px] sm:text-[11px] uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Step 3
        </div>
        <div className={`text-[13px] sm:text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Content</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["Number", "Algebra", "Ratio", "Geometry", "Statistics"].map((item, index) => (
            <span
              key={item}
              className={`rounded-full border px-3 py-1 text-[10px] sm:text-[11px] ${
                index < 2
                  ? isDark
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : isDark
                    ? "border-white/10 bg-white/5 text-slate-300"
                    : "border-slate-200/80 bg-white text-slate-600"
              }`}
            >
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
          <FoundersSprintLabel className="mb-2" />
          <div className={`text-[13px] sm:text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Leaderboard</div>
          <div className={`text-[11px] sm:text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Ranked by correct answers</div>
        </div>
        <div
          className={`rounded-full border text-[11px] sm:text-xs font-semibold px-3 py-1 ${
            isDark ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200" : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700"
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
                  ? "bg-indigo-500/15 text-indigo-100 font-semibold"
                  : "bg-indigo-500/10 text-indigo-700 font-semibold"
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
