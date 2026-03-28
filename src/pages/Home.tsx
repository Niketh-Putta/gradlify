import { computeReadinessGrades } from '@/lib/readinessGrades';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NotesProgressCard } from "@/components/NotesProgressCard";
import { OverallReadinessCard } from "@/components/OverallReadinessCard";
import { useAppContext } from "@/hooks/useAppContext";
import { useReadiness } from "@/hooks/useReadiness";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  BookOpen, 
  Calculator,
  PieChart,
  TrendingUp,
  Crown,
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  CheckCircle2,
  Trophy,
  FileText,
  Clock,
  Ruler,
  Percent,
  Activity,
  Target,
  Gauge
} from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeaderboardSnapshot } from "@/components/LeaderboardSnapshot";
import { PremiumUpgradeButton } from "@/components/PremiumUpgradeButton";
import { useReadinessStore } from "@/lib/stores/useReadinessStore";

import { FoundersSprintModal } from "@/components/FoundersSprintModal";
import { DiscordFooterEntry } from "@/components/DiscordFooterEntry";
import { getFoundersSprintInfo } from "@/lib/foundersSprint";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { getTrackCopy } from "@/lib/trackContent";
import { resolveUserTrack, UserTrack } from "@/lib/track";
import { isAbortLikeError } from "@/lib/errors";
import { buildTrackReadinessRows, getTrackLabel, getTrackReadinessSummaryLabel, getTrackReadinessSections } from "@/lib/trackCurriculum";
import { isForcedStarterUser } from "@/lib/starterOverrides";

const TOPIC_ICONS = {
  number: Calculator,
  algebra: TrendingUp,
  ratio: PieChart,
  geometry: Target,
  probability: Sparkles,
  statistics: BookOpen,
  number_arithmetic: Calculator,
  algebra_ratio: Percent,
  geometry_measures: Ruler,
  statistics_data: BookOpen,
} as const;

export function Home() { 
  const { user, profile, onProfileUpdate } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === "11plus";
  const trackCopy = getTrackCopy(userTrack);
  const trackLabel = getTrackLabel(userTrack);
  const { remainingUses, isPremium, dailyLimit, fetchUsageData } = usePremium();
  const navigate = useNavigate();
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [practiceCount, setPracticeCount] = useState<number | null>(null);
  const [trackSwitching, setTrackSwitching] = useState(false);
  const [showFoundersSprintModal, setShowFoundersSprintModal] = useState(false);
  const isFounder = profile?.founder_track === 'founder';

  const premiumBannerTitle = "Gradlify Premium\nStart Your 3 Day Free Trial";
  const premiumBannerSubtitle = AI_FEATURE_ENABLED
    ? "Get unlimited AI questions, full mock exams, and personalised revision plans."
    : "Get unlimited questions, full mock exams, and personalised revision plans.";

  const { topics: readinessTopics, loading: readinessLoading, overall: overallReadiness } = useReadiness(user?.id, userTrack);
  const lowestReadinessTopic = useMemo(() => {
    if (!readinessTopics?.length) return null;
    return readinessTopics.reduce((lowest, topic) => {
      if (!lowest) return topic;
      return topic.readiness < lowest.readiness ? topic : lowest;
    }, null as (typeof readinessTopics)[number] | null);
  }, [readinessTopics]);

  // Handle successful upgrade from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('upgraded') === 'true') {
      fetchUsageData();
      toast.success('Trial started! Premium features are now unlocked.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchUsageData]);

  // Scroll animation hook
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements(prev => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return;
    const { isActive, sprintId } = getFoundersSprintInfo();
    if (!isActive) return;
    const storageKey = `founders-sprint-modal:${user.id}:${sprintId}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "true");
    setShowFoundersSprintModal(true);
  }, [user?.id]);

  // Check if this is the user's first visit
  useEffect(() => {
    const checkFirstVisit = async () => {
      if (!user?.id) return;

      try {
        const [practiceRes, mockRes, sessionRes] = await Promise.all([
          supabase
            .from('practice_results')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('mock_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('study_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .limit(1)
        ]);

        const hasActivity = 
          (practiceRes.count && practiceRes.count > 0) ||
          (mockRes.count && mockRes.count > 0) ||
          (sessionRes.count && sessionRes.count > 0);

        setPracticeCount(practiceRes.count ?? 0);
        setIsFirstVisit(!hasActivity);
      } catch (error) {
        console.error('Error checking first visit:', error);
        setIsFirstVisit(false);
        setPracticeCount(null);
      }
    };

    checkFirstVisit();
  }, [user?.id]);

  const topicTone: Record<string, { hoverBorder: string; cardBg: string; iconWrap: string; icon: string; score: string }> = {
    number: {
      hoverBorder: 'hover:border-primary/30 dark:hover:border-blue-400/50',
      cardBg: 'bg-blue-50/70 dark:bg-blue-950/35',
      iconWrap: 'bg-primary/10 dark:bg-blue-400/15',
      icon: 'text-primary dark:text-blue-300',
      score: 'text-primary dark:text-blue-300',
    },
    algebra: {
      hoverBorder: 'hover:border-violet-500/30 dark:hover:border-violet-400/50',
      cardBg: 'bg-violet-50/70 dark:bg-violet-950/35',
      iconWrap: 'bg-violet-500/12 dark:bg-violet-400/18',
      icon: 'text-violet-700 dark:text-violet-300',
      score: 'text-violet-700 dark:text-violet-300',
    },
    ratio: {
      hoverBorder: 'hover:border-accent/30 dark:hover:border-emerald-400/50',
      cardBg: 'bg-emerald-50/70 dark:bg-emerald-950/35',
      iconWrap: 'bg-accent/10 dark:bg-emerald-400/15',
      icon: 'text-accent dark:text-emerald-300',
      score: 'text-accent dark:text-emerald-300',
    },
    geometry: {
      hoverBorder: 'hover:border-warning/30 dark:hover:border-amber-400/50',
      cardBg: 'bg-amber-50/70 dark:bg-amber-950/35',
      iconWrap: 'bg-warning/10 dark:bg-amber-400/15',
      icon: 'text-warning dark:text-amber-300',
      score: 'text-warning dark:text-amber-300',
    },
    probability: {
      hoverBorder: 'hover:border-destructive/30 dark:hover:border-rose-400/50',
      cardBg: 'bg-rose-50/70 dark:bg-rose-950/35',
      iconWrap: 'bg-destructive/10 dark:bg-rose-400/15',
      icon: 'text-destructive dark:text-rose-300',
      score: 'text-destructive dark:text-rose-300',
    },
    statistics: {
      hoverBorder: 'hover:border-cyan-500/30 dark:hover:border-cyan-400/50',
      cardBg: 'bg-cyan-50/70 dark:bg-cyan-950/35',
      iconWrap: 'bg-cyan-500/12 dark:bg-cyan-400/15',
      icon: 'text-cyan-700 dark:text-cyan-300',
      score: 'text-cyan-700 dark:text-cyan-300',
    },
    number_arithmetic: {
      hoverBorder: 'hover:border-blue-500/30 dark:hover:border-blue-400/50',
      cardBg: 'bg-blue-50/70 dark:bg-blue-950/35',
      iconWrap: 'bg-blue-500/12 dark:bg-blue-400/15',
      icon: 'text-blue-700 dark:text-blue-300',
      score: 'text-blue-700 dark:text-blue-300',
    },
    algebra_ratio: {
      hoverBorder: 'hover:border-pink-500/30 dark:hover:border-pink-400/50',
      cardBg: 'bg-pink-50/70 dark:bg-pink-950/35',
      iconWrap: 'bg-pink-500/12 dark:bg-pink-400/15',
      icon: 'text-pink-700 dark:text-pink-300',
      score: 'text-pink-700 dark:text-pink-300',
    },
    geometry_measures: {
      hoverBorder: 'hover:border-amber-500/30 dark:hover:border-amber-400/50',
      cardBg: 'bg-amber-50/70 dark:bg-amber-950/35',
      iconWrap: 'bg-amber-500/12 dark:bg-amber-400/15',
      icon: 'text-amber-700 dark:text-amber-300',
      score: 'text-amber-700 dark:text-amber-300',
    },
    statistics_data: {
      hoverBorder: 'hover:border-teal-500/30 dark:hover:border-teal-400/50',
      cardBg: 'bg-teal-50/70 dark:bg-teal-950/35',
      iconWrap: 'bg-teal-500/12 dark:bg-teal-400/15',
      icon: 'text-teal-700 dark:text-teal-300',
      score: 'text-teal-700 dark:text-teal-300',
    },
  };

  const readinessRows = useMemo(
    () => buildTrackReadinessRows(userTrack, readinessTopics),
    [userTrack, readinessTopics]
  );

  const topicReadinessMap = useMemo(() => {
    const map = new Map<string, number>();
    readinessRows.forEach((topic) => {
      map.set(topic.topic, topic.readiness);
    });
    return map;
  }, [readinessRows]);

  const topicData = useMemo(() => {
    return getTrackReadinessSections(userTrack).map((section) => {
      const rawScore = topicReadinessMap.get(section.label) ?? 0;
      const roundedScore = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
      const clampedScore = Math.max(0, Math.min(100, roundedScore));

      return {
        key: section.key,
        name: section.label,
        color: section.color,
        score: clampedScore,
        Icon: TOPIC_ICONS[section.key as keyof typeof TOPIC_ICONS] || Target,
      };
    });
  }, [topicReadinessMap, userTrack]);

  const topicLoading = readinessLoading;

  type OnboardingDetails = { preferredName?: string | null; [key: string]: unknown };
  const onboarding = (profile?.onboarding as OnboardingDetails | undefined) ?? {};
  const preferredName = typeof onboarding.preferredName === 'string' ? onboarding.preferredName.trim() : '';
  const userName = preferredName || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';
  const usagePercentage = isPremium ? 100 : Math.round((remainingUses / dailyLimit) * 100);
  const readinessValues = useMemo(
    () => readinessTopics.map((topic) => Number(topic.readiness || 0)).filter((value) => Number.isFinite(value)),
    [readinessTopics]
  );
  const lowestTopicReadiness = useMemo(() => {
    if (!readinessValues.length) return null;
    return readinessValues.reduce((min, value) => Math.min(min, value), 100);
  }, [readinessValues]);
  const readinessNonZeroCount = useMemo(() => readinessValues.filter((value) => value > 0).length, [readinessValues]);
  const readinessMostlyEmpty =
    !readinessLoading &&
    (overallReadiness <= 0 || readinessValues.length === 0 || readinessNonZeroCount < 3);
  const forcedStarter = isForcedStarterUser(user?.id);
  const isNewUser =
    forcedStarter || isFirstVisit || (practiceCount !== null && practiceCount < 10) || readinessMostlyEmpty;

  const onboardingCurrentGrade =
    typeof onboarding.currentGrade === 'string' && onboarding.currentGrade.trim() && onboarding.currentGrade.trim() !== 'Unsure'
      ? onboarding.currentGrade.trim()
      : undefined;
  const onboardingTargetGrade =
    typeof onboarding.targetGrade === 'string' && onboarding.targetGrade.trim() && onboarding.targetGrade.trim() !== 'Unsure'
      ? onboarding.targetGrade.trim()
      : undefined;

  const computedGrades = useMemo(() => {
    if (readinessLoading) return null;
    if (lowestTopicReadiness === null) return null;

    return computeReadinessGrades({
      overallReadiness,
      lowestTopicReadiness,
      onboardingCurrentGrade,
      onboardingTargetGrade,
    });
  }, [overallReadiness, readinessLoading, lowestTopicReadiness, onboardingCurrentGrade, onboardingTargetGrade]);

  const startFocusedPractice = () => {
    const params = new URLSearchParams();
    if (lowestReadinessTopic?.topic) {
      params.set('topics', lowestReadinessTopic.topic);
    }
    params.set('tier', 'both');
    params.set('paperType', 'both');
    params.set('mode', 'practice');
    navigate(`/practice-page?${params.toString()}`);
  };

  const targetTrack: UserTrack = isElevenPlus ? "gcse" : "11plus";
  const targetTrackLabel = targetTrack === "gcse" ? "GCSE Maths" : "11+ Maths";
  const trackSwitchLabel = `Switch to ${targetTrackLabel}`;

  const handleTrackSwitch = async () => {
    if (!user?.id || trackSwitching) return;
    setTrackSwitching(true);
    try {
      const rpcResult = await supabase.rpc("update_user_track", {
        p_user_id: user.id,
        p_track: targetTrack,
      });

      if (rpcResult.error) {
        const { error: fallbackError } = await supabase
          .from("profiles")
          .update({ track: targetTrack })
          .eq("user_id", user.id)
          .select("track")
          .single();
        if (fallbackError) throw fallbackError;
      }

      useReadinessStore.getState().reset();
      window.dispatchEvent(new CustomEvent("track-switched"));
      window.dispatchEvent(new CustomEvent("gradlify:profile-updated"));
      onProfileUpdate?.();
      toast.success(`Switched to ${targetTrackLabel}`, { icon: null, variant: "default" });
    } catch (error) {
      const errorMessage = isAbortLikeError(error)
        ? "Track update timed out. Please try again."
        : "Failed to switch tracks. Please retry.";
      console.error("Home track switch error:", error);
      toast.error(errorMessage);
    } finally {
      setTrackSwitching(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-['DM_Sans']">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FoundersSprintModal open={showFoundersSprintModal} onOpenChange={setShowFoundersSprintModal} />
      <div className="pt-6 pb-10 sm:pt-8 sm:pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        <div className="mb-4">
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {trackLabel}
          </span>
        </div>
        {/* Hero Welcome Section */}
        <div 
          id="welcome"
          data-animate
          className={`relative overflow-hidden rounded-2xl bg-gradient-card border border-border/40 shadow-card p-6 sm:p-8 lg:p-10 mb-8 transition-all duration-700 ${
            visibleElements.has('welcome') 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(80,120,255,0.10),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(160,110,255,0.10),transparent_50%),radial-gradient(circle_at_60%_80%,rgba(80,120,255,0.08),transparent_60%)]" />
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                {isNewUser && (
                  <p className="text-xs sm:text-sm font-semibold text-primary mb-2">
                    New here? Start with exam-style practice to build confidence.
                  </p>
                )}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-3 tracking-tight">
                  <span className="text-foreground">{isNewUser ? 'Welcome,' : 'Welcome back,'}</span>{' '}
                  <span className="text-primary">{userName}!</span>
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
                  {isNewUser 
                    ? trackCopy.newUserMessage
                    : "Keep up the great work. Your consistency is building exam confidence."
                  }
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {isNewUser ? (
                  <Button 
                    onClick={() => navigate('/practice-page?mode=practice')}
                    size="lg"
                    variant="hero"
                    className="font-medium shadow-glow min-w-[220px]"
                  >
                    Start exam-style practice
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/mocks')}
                    size="lg"
                    variant="premium"
                    className="font-medium shadow-glow min-w-[170px]"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Start Revising
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Overall Readiness Card */}
          <div 
            id="overall-readiness"
            data-animate
            className={`transition-all duration-700 delay-100 ${
              visibleElements.has('overall-readiness') 
                ? 'translate-y-0 opacity-100' 
                : 'translate-y-8 opacity-0'
            }`}
          >
            <OverallReadinessCard
              userId={user?.id}
              trackKey={userTrack}
              overallOverride={overallReadiness}
              loadingOverride={readinessLoading}
              currentGrade={computedGrades?.displayCurrentGrade}
              targetGrade={computedGrades?.displayPotentialGrade}
              className="h-full"
              onClick={() => navigate('/readiness')}
            />
          </div>

          {/* Notes Progress Card */}
          <div 
            id="notes-progress"
            data-animate
            className={`transition-all duration-700 delay-150 ${
              visibleElements.has('notes-progress') 
                ? 'translate-y-0 opacity-100' 
                : 'translate-y-8 opacity-0'
            }`}
          >
            <NotesProgressCard
              className="h-full"
              isVisible={visibleElements.has('notes-progress')}
              onClick={() => navigate('/notes')}
            />
          </div>

          {AI_FEATURE_ENABLED && (
            <div 
              id="ai-usage"
              data-animate
              className={`transition-all duration-700 delay-200 ${
                visibleElements.has('ai-usage') 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-8 opacity-0'
              }`}
            >
              <Card className="h-full relative overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-primary/10 to-transparent" aria-hidden="true" />
                <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">AI Study Helper</h3>
                      <p className="text-sm text-muted-foreground">
                        {isPremium ? "Unlimited queries" : `${remainingUses}/${dailyLimit} today`}
                      </p>
                    </div>
                  </div>
                  
                  <Progress 
                    value={usagePercentage} 
                    className="h-2 mb-4"
                  />
                  
                  <Button 
                    onClick={() => navigate('/chat')}
                    variant="outline"
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with AI
                  </Button>

                  {/* Embedded illustration (kept in-flow to avoid overlapping controls) */}
                  <div className="mt-4">
                    <div
                      className="pointer-events-none select-none relative overflow-hidden rounded-2xl bg-primary/5"
                      aria-hidden="true"
                    >
                      <div className="flex items-center justify-center h-[140px]">
                        <img
                          src="/book.png"
                          alt=""
                          className="block dark:hidden w-[78%] max-w-[280px] h-auto opacity-85"
                        />
                        <img
                          src="/book1.png"
                          alt=""
                          className="hidden dark:block w-[78%] max-w-[280px] h-auto opacity-85"
                        />
                      </div>
                      {/* Soft fade into the card (no sticker look) */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/70" />
                      <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!AI_FEATURE_ENABLED && (
            <div 
              id="focus-topic"
              data-animate
              className={`transition-all duration-700 delay-200 ${
                visibleElements.has('focus-topic') 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-8 opacity-0'
              }`}
            >
              <Card className="h-full relative overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-primary/12 via-transparent to-transparent" aria-hidden="true" />
                <div className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
                <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" aria-hidden="true" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground mb-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500" />
                    <span>Focus Topic</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lowestReadinessTopic
                      ? `Section: ${lowestReadinessTopic.topic}`
                      : 'Start your first practice session'}
                  </p>
                  {lowestReadinessTopic && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Readiness: {Math.round(lowestReadinessTopic.readiness)}%
                    </p>
                  )}

                  <Progress 
                    value={lowestReadinessTopic ? Math.round(lowestReadinessTopic.readiness) : 0} 
                    className="h-2 mb-4 mt-4"
                  />

                  <Button 
                    onClick={startFocusedPractice}
                    variant="outline"
                    className="w-full"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Start focused practice
                  </Button>

                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-indigo-700">
                      Personalised focus
                    </span>
                    <span>Mixed tiers • Exam-style</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Topic Breakdown Section */}
        <div 
          id="topics"
          data-animate
          className={`mb-8 transition-all duration-700 delay-250 ${
            visibleElements.has('topics') 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-8 opacity-0'
          }`}
        >
          <Card className="dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Topic Progress</CardTitle>
                  <CardDescription>
                    {getTrackReadinessSummaryLabel(userTrack)}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/readiness')}
                  className="text-primary hover:text-primary/80"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {topicLoading ? (
                <div className={`grid sm:grid-cols-2 ${isElevenPlus ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4`}>
                  {[...Array(isElevenPlus ? 4 : 6)].map((_, i) => (
                    <div key={i} className="animate-pulse p-4 rounded-xl bg-muted">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-muted-foreground/20 rounded-xl"></div>
                        <div className="flex-1">
                          <div className="h-4 w-24 bg-muted-foreground/20 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-muted-foreground/20 rounded"></div>
                        </div>
                      </div>
                      <div className="h-2 bg-muted-foreground/20 rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`grid sm:grid-cols-2 ${isElevenPlus ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4`}>
                  {topicData.map((topic) => (
                    (() => {
                      const tone = topicTone[topic.key] || topicTone.number;
                      return (
                    <div 
                      key={topic.key} 
                      className={`group p-4 rounded-xl border border-border ${tone.cardBg} ${tone.hoverBorder} hover:shadow-sm cursor-pointer transition-all duration-200`}
                      onClick={() => navigate('/readiness')}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className={`p-2.5 rounded-xl ${tone.iconWrap} transition-transform duration-200 group-hover:scale-105`}
                        >
                          <topic.Icon className={`h-5 w-5 ${tone.icon}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm dark:text-slate-100">{topic.name}</h4>
                          <p className="text-xs text-muted-foreground dark:text-slate-300/80">{topic.score}% ready</p>
                        </div>
                        <span className={`text-lg font-semibold ${tone.score}`}>
                          {topic.score}%
                        </span>
                      </div>
                      <Progress 
                        value={topic.score} 
                        className="h-2"
                      />
                    </div>
                      );
                    })()
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div 
          id="actions"
          data-animate
          className={`mb-8 transition-all duration-700 delay-300 ${
            visibleElements.has('actions') 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/mocks')}
              className="group p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 text-left dark:bg-slate-950/70 dark:border-white/10 dark:hover:border-primary/40"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-3 group-hover:scale-105 transition-transform duration-200">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Practice Questions</h3>
              <p className="text-sm text-muted-foreground dark:text-slate-300">Test your knowledge with exam-style questions</p>
            </button>

            <button
              onClick={() => navigate('/readiness')}
              className="group p-5 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-sm transition-all duration-200 text-left dark:bg-slate-950/70 dark:border-white/10 dark:hover:border-accent/40"
            >
              <div className="p-3 rounded-xl bg-accent/10 w-fit mb-3 group-hover:scale-105 transition-transform duration-200">
                <Gauge className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Exam Readiness</h3>
              <p className="text-sm text-muted-foreground dark:text-slate-300">Track your progress across all topics</p>
            </button>

            {AI_FEATURE_ENABLED && (
              <button
                onClick={() => navigate('/chat')}
                className="group p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 text-left dark:bg-slate-950/70 dark:border-white/10 dark:hover:border-primary/40"
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-3 group-hover:scale-105 transition-transform duration-200">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">AI Study Helper</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-300">Get instant help with any question</p>
              </button>
            )}

            {!AI_FEATURE_ENABLED && (
              <button
                onClick={() => navigate('/connect')}
                className="group p-5 rounded-xl bg-card border border-border hover:border-emerald-500/30 hover:shadow-sm transition-all duration-200 text-left dark:bg-slate-950/70 dark:border-white/10 dark:hover:border-emerald-400/40"
              >
                <div className="p-3 rounded-xl bg-emerald-500/10 w-fit mb-3 group-hover:scale-105 transition-transform duration-200">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Leaderboard</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-300">See top learners and your monthly rank</p>
              </button>
            )}

            <button
              onClick={() => navigate('/notes')}
              className="group p-5 rounded-xl bg-card border border-border hover:border-warning/30 hover:shadow-sm transition-all duration-200 text-left dark:bg-slate-950/70 dark:border-white/10 dark:hover:border-amber-400/40"
            >
              <div className="p-3 rounded-xl bg-warning/10 w-fit mb-3 group-hover:scale-105 transition-transform duration-200">
                <BookOpen className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Revision Notes</h3>
              <p className="text-sm text-muted-foreground dark:text-slate-300">Review key concepts and formulas</p>
            </button>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div 
          id="leaderboard"
          data-animate
          className={`mb-8 transition-all duration-700 delay-350 ${
            visibleElements.has('leaderboard') 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-8 opacity-0'
          }`}
        >
          <LeaderboardSnapshot />
        </div>

        {/* Premium Upgrade Banner - Only hide for paid premium users */}
        {!isPremium && !isFounder && (
          <div 
            id="premium"
            data-animate
            className={`mb-8 transition-all duration-700 delay-400 ${
              visibleElements.has('premium') 
                ? 'translate-y-0 opacity-100' 
                : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="rounded-2xl overflow-hidden border border-border/40">
              <div className="relative overflow-hidden bg-gradient-hero p-6 sm:p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/5 to-transparent" aria-hidden="true" />
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.20) 18%, rgba(255,255,255,0) 36%, rgba(255,255,255,0.16) 52%, rgba(255,255,255,0) 70%)',
                    backgroundSize: '220% 100%',
                    animation: 'premiumShimmer 3.8s ease-in-out infinite',
                  }}
                  aria-hidden="true"
                />
                <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" aria-hidden="true" />
                <div className="absolute -bottom-10 left-6 w-56 h-56 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
                <div className="absolute -top-12 left-1/3 w-64 h-64 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
                <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_30%,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.16),transparent_45%)]" aria-hidden="true" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 whitespace-pre-line leading-snug">
                        {premiumBannerTitle}
                      </h3>
                      <p className="text-white/85 max-w-md">
                        {premiumBannerSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="w-full lg:w-auto">
                    <PremiumUpgradeButton variant="homeBanner" label="Start Your 3 Day Free Trial" />
                  </div>
                </div>

                <style>{`
                  @keyframes premiumShimmer {
                    0% { background-position: 220% 0%; opacity: 0.20; }
                    45% { opacity: 0.34; }
                    100% { background-position: -40% 0%; opacity: 0.20; }
                  }
                `}</style>
              </div>

              <div className="bg-background/70 p-4 sm:p-5">
                <div className="rounded-xl bg-gradient-card border border-border/40 p-4 sm:p-5">
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>
                      {AI_FEATURE_ENABLED
                        ? 'Unlimited AI practice tailored to your exam board'
                        : 'Unlimited practice tailored to your exam board'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Real exam-style mock tests with timed conditions</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>A daily revision plan built from your weak areas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative mt-8 pb-6 sm:pb-8">
          <DiscordFooterEntry variant="spotlight" className="relative z-10 w-full" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 -bottom-2 h-16 rounded-[999px] bg-gradient-to-b from-slate-900/30 via-slate-900/12 to-transparent blur-2xl sm:inset-x-8 sm:h-20"
          />
        </div>

      </div>
    </div>
  );
}
