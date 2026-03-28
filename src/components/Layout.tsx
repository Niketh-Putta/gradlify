import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { OnboardingModal } from '@/components/OnboardingModal';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { isAbortLikeError } from '@/lib/errors';
import { getMissingColumnFromError, markProfileColumnMissing, profileSelect } from '@/lib/schemaCompatibility';

interface Profile {
  id: string;
  user_id: string;
  founder_track?: 'competitor' | 'founder' | null;
  track?: 'gcse' | '11plus' | null;
  premium_track?: 'gcse' | '11plus' | 'eleven_plus' | null;
  tier?: string;
  is_premium?: boolean | null;
  premium_until?: string | null;
  plan?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  onboarding?: Record<string, unknown>;
  onboarding_completed_at?: string | null;
  daily_uses?: number | null;
  daily_mock_uses?: number | null;
  exam_readiness?: number | null;
  created_at?: string;
}

interface LayoutProps {
  user: User;
  onSettings: () => void;
  onSignOut: () => void;
}

type OverscrollStyle = CSSStyleDeclaration & { overscrollBehaviorY?: string };

const PROFILE_ABORT_RETRY_DELAY_MS = 300;
const PROFILE_ABORT_MAX_RETRIES = 4;
const PROFILE_REQUIRED_COLUMNS = ['id', 'user_id'] as const;
const PROFILE_OPTIONAL_COLUMNS = [
  'founder_track',
  'track',
  'premium_track',
  'tier',
  'is_premium',
  'premium_until',
  'plan',
  'current_period_end',
  'cancel_at_period_end',
  'onboarding',
  'onboarding_completed_at',
  'daily_uses',
  'daily_mock_uses',
  'exam_readiness',
  'created_at',
] as const;

export function Layout({ user, onSettings, onSignOut }: LayoutProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProgress, setHasProgress] = useState(false);
  const location = useLocation();
  const onboardingCompletionWrite = useRef(false);
  const abortRetryRef = useRef(0);
  const retryScheduledRef = useRef(false);
  const profileFetchInFlightRef = useRef(false);

  const isChatRoute = location.pathname.startsWith('/chat');
  const isFreeToolsRoute =
    location.pathname.startsWith('/tools') ||
    location.pathname.startsWith('/free-tools') ||
    location.pathname.startsWith('/gcse-maths-grade-boundaries') ||
    location.pathname.startsWith('/gcse-maths-topic-weakness-test') ||
    location.pathname.startsWith('/gcse-maths-grade-target-planner');
  const hasCompletedOnboarding = (onboarding?: Record<string, unknown>) => {
    const requiredKeys = [
      'preferredName',
      'examBoard',
      'yearGroup',
      'studyTime',
      'currentGrade',
      'targetGrade'
    ];
    return requiredKeys.every((key) => {
      const value = onboarding?.[key];
      return typeof value === 'string' && value.trim().length > 0;
    });
  };
  const hasExistingProgress = (currentProfile: Profile) =>
    (currentProfile.daily_uses ?? 0) > 0 ||
    (currentProfile.daily_mock_uses ?? 0) > 0 ||
    currentProfile.exam_readiness !== null;

  const fetchProfile = useCallback(async () => {
    if (profileFetchInFlightRef.current) {
      return;
    }
    profileFetchInFlightRef.current = true;

    const isRetrying = retryScheduledRef.current;
    if (isRetrying) {
      retryScheduledRef.current = false;
    } else {
      abortRetryRef.current = 0;
    }
    let keepLoadingForRetry = false;
    try {
      let profileData: Profile | null = null;
      let dbError = null;

      const getSelectFields = () => {
        return profileSelect(PROFILE_REQUIRED_COLUMNS, PROFILE_OPTIONAL_COLUMNS);
      };

      const attemptSelect = async (fields: string) => {
        const result = await supabase
          .from('profiles')
          .select(fields)
          .eq('user_id', user.id)
          .single();
        return result;
      };

      let { data, error } = await attemptSelect(getSelectFields());
      while (error) {
        const missingColumn = getMissingColumnFromError(error);
        if (!missingColumn) break;
        if (PROFILE_REQUIRED_COLUMNS.includes(missingColumn as (typeof PROFILE_REQUIRED_COLUMNS)[number])) break;
        markProfileColumnMissing(missingColumn);
        ({ data, error } = await attemptSelect(getSelectFields()));
      }

      if (error) {
        const isMissingProfile =
          (error as { code?: string; details?: string })?.code === 'PGRST116' ||
          /0 rows|no rows/i.test((error as { details?: string; message?: string })?.details ?? '') ||
          /0 rows|no rows/i.test((error as { message?: string })?.message ?? '');

        if (isMissingProfile) {
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert({ user_id: user.id })
            .select(getSelectFields())
            .single();
          if (insertError) throw insertError;
          setProfile(inserted as Profile);
          abortRetryRef.current = 0;
          setHasProgress(false);
          return;
        }
        dbError = error;
      } else {
        profileData = data as Profile;
      }

      if (dbError) {
        throw dbError;
      }

      abortRetryRef.current = 0;
      setProfile(profileData as Profile);

      // Progress counters are best-effort; don't block profile rendering on these.
      const planPromise = supabase
        .from('study_plans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const readinessPromise = supabase
        .from('readiness_scores')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const sessionsPromise = supabase
        .from('study_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const progressResults = await Promise.allSettled([planPromise, readinessPromise, sessionsPromise]);
      const planCount = progressResults[0].status === 'fulfilled' ? progressResults[0].value.count : 0;
      const readinessCount = progressResults[1].status === 'fulfilled' ? progressResults[1].value.count : 0;
      const sessionCount = progressResults[2].status === 'fulfilled' ? progressResults[2].value.count : 0;
      setHasProgress(Boolean(planCount || readinessCount || sessionCount));
    } catch (error) {
      const abortError = isAbortLikeError(error);
      if (abortError) {
        const nextAttempt = abortRetryRef.current + 1;
        if (nextAttempt <= PROFILE_ABORT_MAX_RETRIES) {
          abortRetryRef.current = nextAttempt;
          keepLoadingForRetry = true;
          retryScheduledRef.current = true;
          const retryDelay = Math.min(PROFILE_ABORT_RETRY_DELAY_MS * nextAttempt, 2000);
          setTimeout(() => {
            void fetchProfile();
          }, retryDelay);
          return;
        }

        // Fail open after repeated aborts so the app does not get stuck on loading.
        setProfile((prev) => prev ?? ({
          id: `fallback-${user.id}`,
          user_id: user.id,
          track: 'gcse',
          tier: 'free',
          onboarding: {},
        } as Profile));
        setHasProgress(false);
        return;
      }

      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');

      // Fallback layout so we don't block the UI when the profile fetch fails.
      setProfile((prev) => prev ?? ({
        id: `fallback-${user.id}`,
        user_id: user.id,
        track: 'gcse',
        tier: 'free',
        onboarding: {},
      } as Profile));
      setHasProgress(false);
    } finally {
      profileFetchInFlightRef.current = false;
      if (!keepLoadingForRetry) {
        setLoading(false);
      }
    }
  }, [user.id]);

  useEffect(() => {
    if (!isChatRoute) return;

    const bodyStyle = document.body.style as OverscrollStyle;
    const htmlStyle = document.documentElement.style as OverscrollStyle;
    const prevBodyOverflow = bodyStyle.overflow;
    const prevHtmlOverflow = htmlStyle.overflow;
    const prevBodyOverscroll = bodyStyle.overscrollBehaviorY;
    const prevHtmlOverscroll = htmlStyle.overscrollBehaviorY;

    bodyStyle.overflow = 'hidden';
    htmlStyle.overflow = 'hidden';
    bodyStyle.overscrollBehaviorY = 'none';
    htmlStyle.overscrollBehaviorY = 'none';

    return () => {
      bodyStyle.overflow = prevBodyOverflow;
      htmlStyle.overflow = prevHtmlOverflow;
      bodyStyle.overscrollBehaviorY = prevBodyOverscroll;
      htmlStyle.overscrollBehaviorY = prevHtmlOverscroll;
    };
  }, [isChatRoute]);

  useEffect(() => {
    if (isFreeToolsRoute) return;
    document.title = '11+ Practised Properly';
  }, [isFreeToolsRoute, location.pathname]);

  useEffect(() => {
    if (!profile) return;
    if (profile.onboarding_completed_at) return;
    if (!hasCompletedOnboarding(profile.onboarding)) return;
    if (onboardingCompletionWrite.current) return;
    onboardingCompletionWrite.current = true;

    const backfillCompletion = async () => {
      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: completedAt } as never)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to backfill onboarding completion:', error);
        onboardingCompletionWrite.current = false;
        return;
      }

      setProfile((prev) => (prev ? { ...prev, onboarding_completed_at: completedAt } : prev));
    };

    backfillCompletion();
  }, [profile, user.id]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('gradlify:profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('gradlify:profile-updated', handleProfileUpdate);
    };
  }, [fetchProfile]);

  useEffect(() => {
    void fetchProfile();

    // Subscribe to profile changes for realtime tier updates
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated:', payload);
          const oldTier = (payload.old as Profile)?.tier;
          const newTier = (payload.new as Profile)?.tier;
          
          setProfile(payload.new as Profile);
          
          // Only show toast if subscription tier actually changed
          if (oldTier !== newTier) {
            toast.success('Your subscription status has been updated!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile, user.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to load profile data</p>
        </div>
      </div>
    );
  }

  const onboardingComplete =
    Boolean(profile.onboarding_completed_at) ||
    hasCompletedOnboarding(profile.onboarding) ||
    hasExistingProgress(profile) ||
    hasProgress;

  return (
    <div className={isChatRoute ? "h-screen h-[100dvh] overflow-hidden bg-background" : "min-h-screen bg-background"}>
      <Navigation
        user={user}
        profile={profile}
        onSettings={onSettings}
        onSignOut={onSignOut}
      />

      <OnboardingModal
        isOpen={Boolean(profile && !onboardingComplete)}
        userId={user.id}
        tier={profile?.tier}
        premiumTrack={profile?.premium_track ?? null}
        founderTrack={profile?.founder_track ?? null}
        initialAnswers={profile?.onboarding ?? {}}
        onCompleted={fetchProfile}
      />
      
      {/* Main Content */}
      <main
        className={
          isChatRoute
            ? "lg:ml-16 pb-0 h-screen h-[100dvh] overflow-hidden transition-all duration-200 ease-in-out"
            : "lg:ml-16 pb-16 sm:pb-20 lg:pb-4 transition-all duration-200 ease-in-out"
        }
      >
        <div className={isChatRoute ? "w-full h-full max-w-full overflow-hidden" : "w-full max-w-full overflow-x-hidden"}>
          <Outlet context={{ user, profile, onProfileUpdate: fetchProfile }} />
        </div>
      </main>
    </div>
  );
}
