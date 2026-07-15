import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubject } from "@/contexts/SubjectContext";
import { useMembership } from "@/hooks/useMembership";
import { OnboardingModal } from "@/components/OnboardingModal";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BookOpen, Calculator, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { startPremiumCheckout } from "@/lib/checkout";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  founder_track?: 'competitor' | 'founder' | null;
  track?: 'gcse' | '11plus' | null;
  premium_track?: 'gcse' | '11plus' | 'eleven_plus' | null;
  tier?: string;
  onboarding?: Record<string, unknown>;
  onboarding_completed_at?: string | null;
  daily_uses?: number | null;
  daily_mock_uses?: number | null;
  exam_readiness?: number | null;
}

const hasCompletedOnboarding = (onboarding?: Record<string, unknown>) => {
  const requiredKeys = [
    'preferredName',
    'examBoard',
    'yearGroup',
    'studyTime',
    'currentGrade',
    'targetGrade',
  ];
  return requiredKeys.every((key) => {
    const value = onboarding?.[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
};

const hasExistingProgress = (profile?: Profile | null) =>
  Boolean(
    profile &&
      ((profile.daily_uses ?? 0) > 0 ||
        (profile.daily_mock_uses ?? 0) > 0 ||
        profile.exam_readiness !== null)
  );

export default function SubjectSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSubject } = useSubject();
  const { isUltra, isPremium } = useMembership();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const displayTier = isUltra ? 'Ultra' : isPremium ? 'Premium' : 'Free';
  const planIntent = new URLSearchParams(location.search).get('intent') === 'plans';
  const checkoutIntent = new URLSearchParams(location.search).get('intent') === 'checkout';
  const postPlanSetupPath = "/select-subject#settings";
  const [startingCheckout, setStartingCheckout] = useState(false);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);
      if (!currentUserId) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, founder_track, track, premium_track, tier, onboarding, onboarding_completed_at, daily_uses, daily_mock_uses, exam_readiness')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: currentUserId })
          .select('user_id, founder_track, track, premium_track, tier, onboarding, onboarding_completed_at, daily_uses, daily_mock_uses, exam_readiness')
          .single();

        if (insertError) throw insertError;
        setProfile(inserted as Profile);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error('Failed to load subject selection profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const onboardingComplete =
    Boolean(profile?.onboarding_completed_at) ||
    hasCompletedOnboarding(profile?.onboarding) ||
    hasExistingProgress(profile);

  useEffect(() => {
    if (profileLoading || !userId || onboardingComplete) return;
    setShowOnboarding(true);
  }, [onboardingComplete, profileLoading, userId]);

  useEffect(() => {
    if (profileLoading || !userId || !planIntent || !onboardingComplete) return;
    navigate(postPlanSetupPath, { replace: true });
  }, [onboardingComplete, planIntent, profileLoading, userId, navigate]);

  useEffect(() => {
    if (profileLoading || !userId || !checkoutIntent || !onboardingComplete || startingCheckout) return;

    const params = new URLSearchParams(location.search);
    const justUpgraded = params.get("upgraded") === "true";
    // After successful payment PayReturn can land here with intent=checkout - do not re-open Stripe.
    if (justUpgraded || isPremium || isUltra) {
      navigate("/home?upgraded=true", { replace: true });
      return;
    }

    setStartingCheckout(true);
    void (async () => {
      try {
        toast.message("Opening Lifetime Premium checkout…");
        await startPremiumCheckout("lifetime");
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "Could not start checkout.";
        toast.error(message);
        setStartingCheckout(false);
        navigate("/premium", { replace: true });
      }
    })();
  }, [
    checkoutIntent,
    onboardingComplete,
    profileLoading,
    startingCheckout,
    userId,
    navigate,
    location.search,
    isPremium,
    isUltra,
  ]);

  const handleSelect = (subject: 'maths' | 'english') => {
    setSubject(subject);
    if (profileLoading) return;
    if (userId && !onboardingComplete) {
      setShowOnboarding(true);
      return;
    }
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative">
      
      {/* Top Right Plan Badge */}
      <div className="sm:absolute sm:top-8 sm:right-8 z-20 mb-10 sm:mb-0">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm text-xs font-bold uppercase tracking-widest transition-all",
          displayTier === 'Ultra' 
            ? "bg-gradient-to-r from-amber-200 to-amber-500 text-slate-900 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
            : displayTier === 'Premium'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              : "bg-card border-border text-muted-foreground"
        )}>
          {displayTier} Plan
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[900px] relative z-10"
      >
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            Select Your Subject
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-medium">
            Choose a curriculum to begin your focused revision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Maths Professional Card */}
          <button
            onClick={() => handleSelect('maths')}
            className="group relative flex flex-col justify-between text-left p-8 sm:p-10 rounded-2xl bg-card border border-border dark:border-blue-500/30 border-t-4 border-t-blue-500/70 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-400 transition-all duration-300"
          >
            <div>
              <div className="w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center mb-8 shadow-sm group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                <Calculator className="w-7 h-7 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Mathematics</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-medium">
                Comprehensive curriculum covering advanced number theory, algebraic reasoning, and geometrical patterns.
              </p>
            </div>

            <div className="w-full flex items-center justify-between mt-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-blue-600 transition-colors duration-300">
                Select Subject
              </span>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </button>

          {/* English Professional Card */}
          <button
            onClick={() => handleSelect('english')}
            className="group relative flex flex-col justify-between text-left p-8 sm:p-10 rounded-2xl bg-card border border-border dark:border-amber-500/30 border-t-4 border-t-amber-500/70 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-400 transition-all duration-300"
          >
            <div>
              <div className="w-14 h-14 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center mb-8 shadow-sm group-hover:bg-amber-500 group-hover:border-amber-500 transition-all duration-300">
                <BookOpen className="w-7 h-7 text-amber-600 dark:text-amber-400 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">English</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-medium">
                Advanced curriculum covering extensive vocabulary, reading comprehension, and critical literary analysis.
              </p>
            </div>

            <div className="w-full flex items-center justify-between mt-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-amber-600 transition-colors duration-300">
                Select Subject
              </span>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </motion.div>

      {userId ? (
        <OnboardingModal
          isOpen={showOnboarding}
          userId={userId}
          tier={profile?.tier}
          premiumTrack={profile?.premium_track ?? null}
          founderTrack={profile?.founder_track ?? null}
          initialAnswers={profile?.onboarding ?? {}}
          onCompleted={() => {
            setShowOnboarding(false);
            void fetchProfile();
          }}
          continuePath={
            checkoutIntent
              ? "/select-subject?intent=checkout"
              : planIntent
                ? postPlanSetupPath
                : "/home"
          }
          skipUpsell={planIntent || checkoutIntent}
        />
      ) : null}
    </div>
  );
}
