import { computeReadinessGrades } from '@/lib/readinessGrades';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NotesProgressCard } from "@/components/NotesProgressCard";
import { OverallReadinessCard } from "@/components/OverallReadinessCard";
import { useAppContext } from "@/hooks/useAppContext";
import { useReadiness } from "@/hooks/useReadiness";
import { useSubject } from "@/contexts/SubjectContext";
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
  Gauge,
  BrainCircuit,
  Swords,
  Flame
} from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeaderboardSnapshot } from "@/components/LeaderboardSnapshot";
import { SprintBanner } from "@/components/SprintBanner";
import { PremiumUpgradeButton } from "@/components/PremiumUpgradeButton";
import { useReadinessStore } from "@/lib/stores/useReadinessStore";
import { PracticeConfirmationModal } from "@/components/readiness/PracticeConfirmationModal";

import { DiscordFooterEntry } from "@/components/DiscordFooterEntry";
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
  const { currentSubject } = useSubject();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === "11plus";
  const trackCopy = getTrackCopy(userTrack);
  const trackLabel = getTrackLabel(userTrack, currentSubject);
  const { remainingUses, isPremium, dailyLimit, fetchUsageData } = usePremium();
  const isFounder = profile?.founder_track === 'founder' || profile?.founder_track === 'competitor';
  const navigate = useNavigate();
    const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [practiceCount, setPracticeCount] = useState<number | null>(null);
  const [trackSwitching, setTrackSwitching] = useState(false);
  
  // Practice Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    topic: string;
    mode: "weakness" | "general";
  }>({ topic: "", mode: "general" });
    
  const premiumBannerTitle = "Gradlify Premium\nStart Your 3 Day Free Trial";
  const premiumBannerSubtitle = AI_FEATURE_ENABLED
    ? "Get unlimited AI questions, full mock exams, and personalised revision plans."
    : "Get unlimited questions, full mock exams, and personalised revision plans.";

  const { topics: readinessTopics, loading: readinessLoading, overall: overallReadiness } = useReadiness(user?.id, userTrack, currentSubject);
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

  


  // Check if this is the user's first visit
  useEffect(() => {
    const checkFirstVisit = async () => {
      if (!user?.id) return;

      try {
        const [practiceRes, mockRes, sessionRes] = await Promise.all([
          supabase
            .from('practice_results')
            .select('id')
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('mock_attempts')
            .select('id')
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('study_sessions')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
        ]);

        const hasActivity = 
          (practiceRes.data && practiceRes.data.length > 0) ||
          (mockRes.data && mockRes.data.length > 0) ||
          (sessionRes.data && sessionRes.data.length > 0);

        setPracticeCount(practiceRes.data ? practiceRes.data.length : 0);
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
    comprehension: {
      hoverBorder: 'hover:border-amber-500/30 dark:hover:border-amber-400/50',
      cardBg: 'bg-amber-50/70 dark:bg-amber-950/35',
      iconWrap: 'bg-amber-500/12 dark:bg-amber-400/15',
      icon: 'text-amber-700 dark:text-amber-300',
      score: 'text-amber-700 dark:text-amber-300',
    },
    spag: {
      hoverBorder: 'hover:border-amber-500/30 dark:hover:border-amber-400/50',
      cardBg: 'bg-amber-50/70 dark:bg-amber-950/35',
      iconWrap: 'bg-amber-500/12 dark:bg-amber-400/15',
      icon: 'text-amber-700 dark:text-amber-300',
      score: 'text-amber-700 dark:text-amber-300',
    },
    vocabulary: {
      hoverBorder: 'hover:border-amber-500/30 dark:hover:border-amber-400/50',
      cardBg: 'bg-amber-50/70 dark:bg-amber-950/35',
      iconWrap: 'bg-amber-500/12 dark:bg-amber-400/15',
      icon: 'text-amber-700 dark:text-amber-300',
      score: 'text-amber-700 dark:text-amber-300',
    },
  };

  const activeReadinessRows = useMemo(
    () => buildTrackReadinessRows(userTrack, readinessTopics, currentSubject),
    [userTrack, readinessTopics, currentSubject]
  );

  const topicReadinessMap = useMemo(() => {
    const map = new Map<string, number>();
    activeReadinessRows.forEach((topic) => {
      map.set(topic.topic, topic.readiness);
    });
    return map;
  }, [activeReadinessRows]);

  const topicData = useMemo(() => {
    return getTrackReadinessSections(userTrack, currentSubject).map((section) => {
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

  const initiatePractice = (topicOverride?: string, practiceMode: "weakness" | "general" = "general") => {
    const topic = topicOverride || (practiceMode === "weakness" ? lowestReadinessTopic?.topic : (currentSubject === "english" ? "General English" : "General Maths")) || (currentSubject === "english" ? "General English" : "General Maths");
    setConfirmModalData({ topic, mode: practiceMode });
    setIsConfirmModalOpen(true);
  };

  const startFocusedPractice = () => {
    const params = new URLSearchParams();
    if (confirmModalData.topic) {
      params.set('topics', confirmModalData.topic);
    }
    params.set('tier', 'both');
    params.set('paperType', 'both');
    params.set('mode', 'practice');
    navigate(currentSubject === 'english' ? `/english-demo?${params.toString()}` : `/mock-exam?${params.toString()}`);
  };

  const targetTrack: UserTrack = isElevenPlus ? "gcse" : "11plus";
  const targetTrackLabel = targetTrack === "gcse" ? "GCSE Maths" : "11+ Maths";
  const trackSwitchLabel = `Switch to ${targetTrackLabel}`;

  const handleTrackSwitch = async () => {
    if (!user?.id || trackSwitching) return;
    setTrackSwitching(true);
    try {
      const rpcResult = await supabase.rpc("update_user_track" as any, {
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
      toast.success(`Switched to ${targetTrackLabel}`, { icon: null });
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
      <SprintBanner className="mb-0" />
      <div className="pt-6 pb-10 sm:pt-8 sm:pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        <div className="mb-4 flex items-center justify-between">
          <span className={cn(
             "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
             currentSubject === 'english'
               ? "border-amber-500/25 bg-amber-500/10 text-amber-500"
               : "border-primary/25 bg-primary/10 text-primary"
          )}>
            {trackLabel}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/select-subject')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Switch Subject
          </Button>
        </div>
        {/* Hero Welcome Section */}
        <div 
          className="relative overflow-hidden rounded-2xl bg-gradient-card border border-border/40 shadow-card p-6 sm:p-8 lg:p-10 mb-8 transition-all duration-700"
        >
          {/* Decorative elements */}
          <div className={cn(
             "absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2",
             currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/5"
          )} />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className={cn(
             "absolute inset-0",
             currentSubject === 'english'
               ? "bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.10),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(252,211,77,0.10),transparent_50%),radial-gradient(circle_at_60%_80%,rgba(245,158,11,0.08),transparent_60%)]"
               : "bg-[radial-gradient(circle_at_20%_20%,rgba(80,120,255,0.10),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(160,110,255,0.10),transparent_50%),radial-gradient(circle_at_60%_80%,rgba(80,120,255,0.08),transparent_60%)]"
          )} />
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                {isNewUser && (
                  <p className={cn(
                     "text-xs sm:text-sm font-semibold mb-2",
                     currentSubject === 'english' ? "text-amber-500" : "text-primary"
                  )}>
                    New here? Start with exam-style practice to build confidence.
                  </p>
                )}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-3 tracking-tight">
                  <span className={cn(
                    "bg-clip-text text-transparent transform-gpu",
                    currentSubject === "english" 
                      ? "bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 dark:from-white dark:via-slate-200 dark:to-amber-500" 
                      : "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 dark:from-white dark:via-slate-200 dark:to-blue-500"
                  )}>
                    {isNewUser ? 'Welcome,' : 'Welcome back,'} {userName}!
                  </span>
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
                    onClick={() => initiatePractice("", "general")}
                    size="lg"
                    className={cn(
                       "font-medium shadow-glow min-w-[220px]",
                       currentSubject === 'english' ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20" : ""
                    )}
                    variant={currentSubject === 'english' ? 'default' : 'hero'}
                  >
                    Start exam-style practice
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => initiatePractice("", "general")}
                    size="lg"
                    className={cn(
                       "font-medium shadow-glow min-w-[170px]",
                       currentSubject === 'english' ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] border-0" : ""
                    )}
                    variant={currentSubject === 'english' ? 'default' : 'premium'}
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
            className="delay-100"
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
            className="delay-150"
          >
            <NotesProgressCard
              className="h-full"
              isVisible={true}
              onClick={() => navigate('/notes')}
            />
          </div>

          {AI_FEATURE_ENABLED && (
            <div 
              className="delay-200"
            >
              <Card className="h-full relative overflow-hidden">
                <div className={cn(
                   "absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t to-transparent",
                   currentSubject === 'english' ? "from-amber-500/10" : "from-primary/10"
                )} aria-hidden="true" />
                <div className={cn(
                   "absolute -bottom-8 -right-8 h-40 w-40 rounded-full blur-2xl",
                   currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10"
                )} aria-hidden="true" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                       "p-2.5 rounded-xl",
                       currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10"
                    )}>
                      <Brain className={cn(
                         "h-5 w-5",
                         currentSubject === 'english' ? "text-amber-500" : "text-primary"
                      )} />
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
                    indicatorClassName={currentSubject === 'english' ? "bg-amber-500" : undefined}
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
                      className={cn(
                         "pointer-events-none select-none relative overflow-hidden rounded-2xl",
                         currentSubject === 'english' ? "bg-amber-500/5" : "bg-primary/5"
                      )}
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
              className="delay-200"
            >
              <Card className={cn(
                "h-full border transition-all duration-500 overflow-hidden relative shadow-md group hover:shadow-lg",
                currentSubject === 'english' ? "border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5 hover:border-amber-500/50" : "border-primary/30 bg-gradient-to-br from-card to-primary/5 hover:border-primary/50"
              )}>
                {/* Extremely subtle ambient corner glow */}
                <div className={cn(
                  "absolute -right-20 -top-20 w-40 h-40 rounded-full blur-[50px] opacity-15 transition-opacity group-hover:opacity-30",
                  currentSubject === 'english' ? "bg-amber-500" : "bg-primary"
                )} />

                <CardContent className="h-full p-6 pt-6 sm:pt-6 flex flex-col relative z-10">
                  {/* Header */}
                  <div className="flex-[0_0_auto]">
                    <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-1 mb-1">
                      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-sm", currentSubject === 'english' ? "bg-amber-500/10 border-amber-500/20" : "bg-primary/10 border-primary/20")}>
                        <Flame className={cn("w-3.5 h-3.5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
                        <span className={cn("font-bold tracking-widest uppercase text-[9px] md:text-[10px]", currentSubject === 'english' ? "text-amber-600 dark:text-amber-500" : "text-primary dark:text-blue-400")}>
                          Target Focus
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 shadow-sm backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Personalised</span>
                      </div>
                    </div>
                  </div>

                  {/* Centered Middle Section */}
                  <div className="flex-1 flex flex-col justify-center py-2">
                    {/* Topic Name */}
                    <div className="mb-4">
                      <h3 className="text-2xl lg:text-[1.35rem] xl:text-2xl 2xl:text-3xl font-bold text-foreground tracking-tight leading-tight mb-2 line-clamp-2">
                        {isFirstVisit ? 'Initial Baseline' : lowestReadinessTopic ? lowestReadinessTopic.topic : 'Initial Assessment'}
                      </h3>
                      <div className="flex items-center justify-between mt-3 text-xs font-semibold">
                        <span className="text-muted-foreground">Mastery Level</span>
                        <span className={cn(
                          "rounded-md px-1.5 py-0.5 border",
                          isFirstVisit ? "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20" :
                          lowestReadinessTopic && lowestReadinessTopic.readiness < 40 
                            ? "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20" :
                          lowestReadinessTopic && lowestReadinessTopic.readiness < 70 
                            ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" : 
                            "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        )}>{isFirstVisit ? 'Untested' : lowestReadinessTopic ? Math.round(lowestReadinessTopic.readiness) + '%' : '0%'}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-secondary rounded-full h-[3px] overflow-hidden shadow-inner">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          currentSubject === 'english' ? "bg-amber-500" : "bg-primary"
                        )}
                        style={{ width: `${isFirstVisit ? 0 : lowestReadinessTopic ? Math.max(2, Math.round(lowestReadinessTopic.readiness)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="pt-6 border-t border-border/40 mt-auto flex-[0_0_auto]">
                    {/* Action Button */}
                    <Button 
                      onClick={() => initiatePractice(lowestReadinessTopic?.topic, "weakness")}
                      className={cn(
                        "w-full h-12 text-sm font-semibold rounded-xl shadow-xl transition-all duration-300 relative overflow-hidden group/btn",
                        "hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                        "border border-white/20",
                        currentSubject === 'english' 
                          ? "bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] border-0" 
                          : "bg-gradient-to-r from-primary to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-primary/25"
                      )}
                    >
                      {/* Subtle Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover/btn:animate-shine" />
                      
                      <div className="flex items-center justify-center relative z-10 transition-transform group-hover/btn:scale-[1.02]">
                        <Zap className="h-4 w-4 mr-2" />
                        <span>
                          {isFirstVisit ? 'Start Baseline Test' : 'Train Weakness'}
                        </span>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Topic Breakdown Section */}
        <div 
          className="mb-8 delay-250"
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{currentSubject === 'english' ? 'English Progress' : 'Topic Progress'}</CardTitle>
                  <CardDescription>
                    {currentSubject === 'english' ? 'Your readiness across the curriculum' : getTrackReadinessSummaryLabel(userTrack)}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/readiness')}
                  className={currentSubject === 'english' ? "text-amber-500 hover:text-amber-500/80" : "text-primary hover:text-primary/80"}
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
                <div className={`grid sm:grid-cols-2 ${currentSubject === 'english' ? 'lg:grid-cols-3' : isElevenPlus ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4`}>
                  {topicData.map((topic) => {
                      const isEnglish = currentSubject === 'english';
                      return (
                    <div 
                      key={topic.key} 
                      className={cn(
                        "group p-4 rounded-xl border border-border/60 bg-card hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-0.5",
                        isEnglish ? "hover:border-amber-500/30" : "hover:border-primary/30"
                      )}
                      onClick={() => navigate('/readiness')}
                    >
                    <div className="flex items-center gap-3 mb-3">
                        <div 
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm",
                            isEnglish ? "bg-amber-500 shadow-amber-500/10" : "bg-primary shadow-primary/10"
                          )}
                        >
                          {topic.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm">{topic.name}</h4>
                          <p className="text-xs text-muted-foreground">{topic.score}% ready</p>
                        </div>
                        <span className={cn(
                          "text-lg font-semibold",
                          isEnglish ? "text-amber-600 dark:text-amber-400" : "text-primary dark:text-blue-400"
                        )}>
                          {topic.score}%
                        </span>
                      </div>
                      <Progress 
                        value={topic.score} 
                        indicatorClassName={isEnglish ? "bg-amber-500" : "bg-primary"}
                        className="h-2"
                      />
                    </div>
                      );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div 
          className="mb-8 delay-300"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/mocks')}
              className={cn(
                 "group p-5 rounded-xl bg-card border transition-all duration-200 text-left hover:shadow-sm",
                 currentSubject === 'english' ? "border-border hover:border-amber-500/30" : "border-border hover:border-primary/30"
              )}
            >
              <div className={cn(
                 "p-3 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform duration-200",
                 currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10"
              )}>
                <BookOpen className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
              </div>
              <h3 className="font-medium text-foreground mb-1">Practice Questions</h3>
              <p className="text-sm text-muted-foreground">Test your knowledge with exam-style questions</p>
            </button>

            <button
              onClick={() => navigate('/readiness')}
              className={cn(
                 "group p-5 rounded-xl bg-card border transition-all duration-200 text-left hover:shadow-sm",
                 currentSubject === 'english' ? "border-border hover:border-amber-500/30" : "border-border hover:border-primary/30"
              )}
            >
              <div className={cn(
                 "p-3 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform duration-200",
                 currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10"
              )}>
                <Gauge className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
              </div>
              <h3 className="font-medium text-foreground mb-1">Exam Readiness</h3>
              <p className="text-sm text-muted-foreground">Track your progress across all topics</p>
            </button>

            {AI_FEATURE_ENABLED && (
              <button
                onClick={() => navigate('/chat')}
                className={cn(
                   "group p-5 rounded-xl bg-card border transition-all duration-200 text-left hover:shadow-sm",
                   currentSubject === 'english' ? "border-border hover:border-amber-500/30" : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                   "p-3 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform duration-200",
                   currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10"
                )}>
                  <MessageSquare className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
                </div>
                <h3 className="font-medium text-foreground mb-1">AI Study Helper</h3>
                <p className="text-sm text-muted-foreground">Get instant help with any question</p>
              </button>
            )}

            {!AI_FEATURE_ENABLED && (
              <button
                onClick={() => navigate('/connect')}
                className={cn(
                   "group p-5 rounded-xl bg-card border transition-all duration-200 text-left hover:shadow-sm",
                   currentSubject === 'english' ? "border-border hover:border-amber-500/30" : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                   "p-3 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform duration-200",
                   currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10"
                )}>
                  <Trophy className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
                </div>
                <h3 className="font-medium text-foreground mb-1">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">See top learners and your monthly rank</p>
              </button>
            )}

            <button
              onClick={() => navigate('/notes')}
              className={cn(
                 "group p-5 rounded-xl bg-card border transition-all duration-200 text-left hover:shadow-sm",
                 currentSubject === 'english' ? "border-border hover:border-amber-500/30" : "border-border hover:border-primary/30"
              )}
            >
              <div className={cn(
                 "p-3 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform duration-200",
                 currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10"
              )}>
                <BookOpen className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
              </div>
              <h3 className="font-medium text-foreground mb-1">Revision Notes</h3>
              <p className="text-sm text-muted-foreground">Review key concepts and formulas</p>
            </button>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div 
          className="mb-8 delay-350"
        >
          <LeaderboardSnapshot />
        </div>

        {/* Premium Upgrade Banner - Only hide for paid premium users */}
        {!isPremium && !isFounder && (
          <div 
            className="mb-8 delay-400"
          >
            <div className="rounded-2xl overflow-hidden border border-border/40">
              <div className={cn(
                 "relative overflow-hidden p-6 sm:p-8",
                 currentSubject === 'english' ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white" : "bg-gradient-hero"
              )}>
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
                    <CheckCircle2 className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
                    <span>
                      {AI_FEATURE_ENABLED
                        ? 'Unlimited AI practice tailored to your exam board'
                        : 'Unlimited practice tailored to your exam board'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
                    <span>Real exam-style mock tests with timed conditions</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
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
        
        <PracticeConfirmationModal
          isOpen={isConfirmModalOpen}
          onOpenChange={setIsConfirmModalOpen}
          onConfirm={startFocusedPractice}
          topicName={confirmModalData.topic}
          subject={currentSubject as "maths" | "english"}
          mode={confirmModalData.mode}
        />

      </div>
    </div>
  );
}
