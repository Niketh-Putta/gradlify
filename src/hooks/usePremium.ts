import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from './useAppContext';
import { FREE_CHALLENGE_LIMIT } from '@/lib/limits';
import { isAbortLikeError } from '@/lib/errors';
import { resolveUserTrack, type UserTrack } from '@/lib/track';
import { getMissingColumnFromError, markProfileColumnMissing, profileSelect, isKnownMissingProfileColumn } from '@/lib/schemaCompatibility';

const emitMockUsageUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mockUsageUpdated'));
  }
};

const emitChallengeUsageUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('challengeUsageUpdated'));
  }
};

const challengeLocalKey = (track: UserTrack) => `gradlify:challengeUsageLocal:${track}`;
const guestChallengeUsageKey = (track: UserTrack) => `guestChallengeUsage:${track}`;
let adminRpcMissing = false;

const readLocalChallengeUsage = (track: UserTrack) => {
  if (typeof window === 'undefined') return { uses: 0, resetAt: null as string | null };
  try {
    const raw = localStorage.getItem(challengeLocalKey(track));
    if (!raw) return { uses: 0, resetAt: null };
    const parsed = JSON.parse(raw);
    return {
      uses: Number.isFinite(parsed?.uses) ? parsed.uses : 0,
      resetAt: typeof parsed?.resetAt === 'string' ? parsed.resetAt : null,
    };
  } catch {
    return { uses: 0, resetAt: null };
  }
};

const writeLocalChallengeUsage = (track: UserTrack, uses: number, resetAt: string | null) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    challengeLocalKey(track),
    JSON.stringify({ uses, resetAt })
  );
};

const mockLocalKey = (subj: string | null | undefined) => `gradlify:mockUsageLocal:${subj || 'general'}`;

const readLocalMockUsage = (subj: string | null | undefined): { uses: number; resetAt: string | null } => {
  if (typeof window === 'undefined') return { uses: 0, resetAt: null };
  try {
    const raw = localStorage.getItem(mockLocalKey(subj));
    if (!raw) return { uses: 0, resetAt: null };
    const parsed = JSON.parse(raw);
    return {
      uses: Number.isFinite(parsed?.uses) ? parsed.uses : 0,
      resetAt: typeof parsed?.resetAt === 'string' ? parsed.resetAt : null,
    };
  } catch {
    return { uses: 0, resetAt: null };
  }
};

const writeLocalMockUsage = (subj: string | null | undefined, uses: number, resetAt: string | null) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(mockLocalKey(subj), JSON.stringify({ uses, resetAt }));
};

const isPlanActive = (plan: string, currentPeriodEnd: string | null) => {
  if (!plan || plan === 'free') return false;
  if (!currentPeriodEnd) return false;
  return new Date(currentPeriodEnd).getTime() > Date.now();
};

interface UsageData {
  daily_uses: number;
  daily_reset_at: string | null;
  daily_mock_uses: number;
  daily_mock_reset_at: string | null;
  daily_maths_mock_uses?: number;
  daily_maths_mock_reset_at?: string | null;
  daily_english_mock_uses?: number;
  daily_english_mock_reset_at?: string | null;
  daily_challenge_uses: number;
  daily_challenge_reset_at: string | null;
  founder_track: 'competitor' | 'founder' | null;
  premium_track: DatabasePremiumTrack | null;
  tier: string;
  plan: string | null;
  current_period_end: string | null;
  is_premium?: boolean;
  premium_until?: string | null;
}

type DatabasePremiumTrack = 'gcse' | '11plus' | 'eleven_plus' | null;

const normalizePremiumTrack = (value: DatabasePremiumTrack): UserTrack | null => {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (normalized === 'gcse') return 'gcse';
  if (normalized === '11plus' || normalized === 'eleven_plus') return '11plus';
  return null;
};

const readGuestUsage = (key: string) => {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function usePremium(trackOverride?: UserTrack, subject?: 'maths' | 'english' | null) {
  const contextData = useAppContext();
  const user = contextData?.user ?? null;
  const profile = contextData?.profile ?? null;
  const hasUserContext = Boolean(user?.id && profile?.user_id);
  const activeTrack: UserTrack = trackOverride ?? resolveUserTrack(profile?.track ?? null);

  const [isLoading, setIsLoading] = useState(hasUserContext);
  const [dailyUses, setDailyUses] = useState(0);
  const [dailyMockUses, setDailyMockUses] = useState(0);
  const [dailyChallengeUses, setDailyChallengeUses] = useState(0);
  const [tier, setTier] = useState<string>(profile?.tier ?? 'free');
  const [plan, setPlan] = useState<string>(profile?.plan ?? 'free');
  const [premiumTrack, setPremiumTrack] = useState<UserTrack | null>(
    normalizePremiumTrack((profile as { premium_track?: DatabasePremiumTrack } | null)?.premium_track ?? null)
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(
    profile?.current_period_end ?? null
  );
  const [founderTrack, setFounderTrack] = useState<'competitor' | 'founder' | null>(
    profile?.founder_track ?? null
  );
  const [isAdmin, setIsAdmin] = useState(false);

  // Subject-specific guest states
  const guestMockKey = subject ? `guestMockUsage_${subject}` : 'guestMockUsage';
  const [guestMockUses, setGuestMockUses] = useState(() => readGuestUsage(guestMockKey));
  const [guestChallengeUses, setGuestChallengeUses] = useState(() => readGuestUsage(guestChallengeUsageKey(activeTrack)));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGuestMockUsageChanged = () => setGuestMockUses(readGuestUsage(guestMockKey));
    const handleGuestChallengeUsageChanged = () => setGuestChallengeUses(readGuestUsage(guestChallengeUsageKey(activeTrack)));

    window.addEventListener('guestMockUsageChanged', handleGuestMockUsageChanged);
    window.addEventListener('guestChallengeUsageChanged', handleGuestChallengeUsageChanged);

    return () => {
      window.removeEventListener('guestMockUsageChanged', handleGuestMockUsageChanged);
      window.removeEventListener('guestChallengeUsageChanged', handleGuestChallengeUsageChanged);
    };
  }, [activeTrack, guestMockKey]);

  useEffect(() => {
    setGuestChallengeUses(readGuestUsage(guestChallengeUsageKey(activeTrack)));
  }, [activeTrack]);

  useEffect(() => {
    if (!profile) return;
    if (profile.tier) setTier(profile.tier);
    if (profile.plan) setPlan(profile.plan);
    if (profile.current_period_end) setCurrentPeriodEnd(profile.current_period_end);
    if (profile.founder_track) setFounderTrack(profile.founder_track);
    setPremiumTrack(normalizePremiumTrack((profile as { premium_track?: DatabasePremiumTrack }).premium_track ?? null));
  }, [profile]);

  // Check if user is admin via database role
  const checkIsAdmin = useCallback(async () => {
    if (!user?.id) return false;
    if (adminRpcMissing) return false;

    try {
      const { data, error } = await supabase.rpc('is_admin', {
        _user_id: user.id
      });

      if (error) {
        if ((error as { code?: string }).code === 'PGRST202' || /not found/i.test(error.message ?? '')) {
          adminRpcMissing = true;
          return false;
        }
        if (isAbortLikeError(error)) return false;
        console.error('Error checking admin role:', error);
        return false;
      }

      return data || false;
    } catch (err) {
      if (isAbortLikeError(err)) return false;
      console.error('Error in admin check:', err);
      return false;
    }
  }, [user?.id]);

  const resetDailyUsage = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const { error } = await supabase
        .from('profiles')
        .update({
          daily_uses: 0,
          daily_reset_at: tomorrow.toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setDailyUses(0);
      setTier(tier);
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error('Error resetting daily usage:', error);
    }
  }, [profile?.user_id, tier]);

  const resetDailyMockUsage = useCallback(async (isSpecificSubject: boolean, subjectColRaw?: string, resetColRaw?: string) => {
    if (!profile?.user_id) return;

    const useCol = isSpecificSubject && subjectColRaw ? subjectColRaw : 'daily_mock_uses';
    const resetCol = isSpecificSubject && resetColRaw ? resetColRaw : 'daily_mock_reset_at';

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const { error } = await supabase
        .from('profiles')
        .update({
          [useCol]: 0,
          [resetCol]: tomorrow.toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setDailyMockUses(0);
      emitMockUsageUpdate();
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error('Error resetting daily mock usage:', error);
    }
  }, [profile?.user_id]);

  const resetDailyChallengeUsage = useCallback(async (mockResetAt?: Date | null) => {
    if (!profile?.user_id) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const resetAt = mockResetAt && mockResetAt > new Date() ? mockResetAt : tomorrow;

      const { error } = await supabase
        .from('profiles')
        .update({
          daily_challenge_reset_at: resetAt.toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setDailyChallengeUses(0);
      writeLocalChallengeUsage(activeTrack, 0, resetAt.toISOString());
      emitChallengeUsageUpdate();
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error('Error resetting daily challenge usage:', error);
    }
  }, [activeTrack, profile?.user_id]);

  const fetchUsageData = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      const requiredColumns = ['daily_uses', 'daily_reset_at', 'daily_mock_uses', 'daily_mock_reset_at', 'daily_challenge_uses', 'daily_challenge_reset_at', 'founder_track', 'tier', 'plan', 'current_period_end'] as const;
      const optionalColumns = ['premium_track', 'daily_maths_mock_uses', 'daily_maths_mock_reset_at', 'daily_english_mock_uses', 'daily_english_mock_reset_at', 'is_premium', 'premium_until'] as const;
      const attemptUsageFetch = async () =>
        supabase
          .from('profiles')
          .select(profileSelect(requiredColumns, optionalColumns))
          .eq('user_id', profile.user_id)
          .single();

      let { data, error } = await attemptUsageFetch();
      while (error) {
        const missingColumn = getMissingColumnFromError(error);
        if (!missingColumn) break;
        markProfileColumnMissing(missingColumn);
        ({ data, error } = await attemptUsageFetch());
      }
      if (error) throw error;

      if (data) {
        const now = new Date();
        const resetAt = data.daily_reset_at ? new Date(data.daily_reset_at) : null;
        
        let usesVal = data.daily_mock_uses || 0;
        let mockResetAtDt: Date | null = null;
        if (data.daily_mock_reset_at) mockResetAtDt = new Date(data.daily_mock_reset_at);

        const challengeResetAt = data.daily_challenge_reset_at ? new Date(data.daily_challenge_reset_at) : null;
        setFounderTrack(data.founder_track || null);
        setPremiumTrack(normalizePremiumTrack((data as UsageData).premium_track ?? null));

        // Check if we need to reset daily usage
        if (!resetAt || now > resetAt) {
          await resetDailyUsage();
        } else {
          setDailyUses(data.daily_uses || 0);
          setTier(data.tier || 'free');
          setPlan(data.plan || 'free');
          setCurrentPeriodEnd(data.current_period_end || null);
        }

        // Check if we need to reset daily mock usage
        if (!mockResetAtDt || now > mockResetAtDt) {
          await resetDailyMockUsage(false);
          // Also reset subject-specific local mock counter
          const nextReset = new Date();
          nextReset.setDate(nextReset.getDate() + 1);
          nextReset.setHours(0, 0, 0, 0);
          writeLocalMockUsage(subject, 0, nextReset.toISOString());
        } else {
          // Read subject-specific local mock usage (not the shared DB counter)
          const localMock = readLocalMockUsage(subject);
          const localResetAt = localMock.resetAt ? new Date(localMock.resetAt) : null;
          const subjectMockUses = localResetAt && now > localResetAt ? 0 : localMock.uses;
          setDailyMockUses(subjectMockUses);
        }

        if (!challengeResetAt || now > challengeResetAt) {
          await resetDailyChallengeUsage(mockResetAtDt);
        } else {
          const localUsage = readLocalChallengeUsage(activeTrack);
          const localResetAt = localUsage.resetAt ? new Date(localUsage.resetAt) : null;
          const localUses = localResetAt && now > localResetAt ? 0 : localUsage.uses;

          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          const { data: trackChallengeData, error: challengeCountError } = await supabase
            .from('extreme_results')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('track', activeTrack)
            .gte('created_at', startOfDay.toISOString())
            .limit(1);
          if (challengeCountError) throw challengeCountError;

          const serverUses = trackChallengeData?.length ? 1 : 0;
          const effectiveUses = Math.max(serverUses, localUses);
          setDailyChallengeUses(effectiveUses);
          writeLocalChallengeUsage(activeTrack, effectiveUses, data.daily_challenge_reset_at || localUsage.resetAt || null);
          emitChallengeUsageUpdate();
        }
      }
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error('Error fetching usage data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTrack, profile?.user_id, resetDailyChallengeUsage, resetDailyMockUsage, resetDailyUsage, subject]);

  useEffect(() => {
    if (!hasUserContext) {
      setIsLoading(false);
      setIsAdmin(false);
      return;
    }

    let isActive = true;

    const initializeUserData = async () => {
      setIsLoading(true);
      const adminStatus = await checkIsAdmin();
      if (!isActive) return;
      setIsAdmin(adminStatus);
      await fetchUsageData();
    };
    
    void initializeUserData();

    return () => {
      isActive = false;
    };
  }, [hasUserContext, checkIsAdmin, fetchUsageData]);

  useEffect(() => {
    if (!hasUserContext || typeof window === 'undefined') return;

    const handleProfileRefresh = () => {
      void fetchUsageData();
    };

    window.addEventListener('gradlify:profile-updated', handleProfileRefresh);
    window.addEventListener('track-switched', handleProfileRefresh);

    return () => {
      window.removeEventListener('gradlify:profile-updated', handleProfileRefresh);
      window.removeEventListener('track-switched', handleProfileRefresh);
    };
  }, [hasUserContext, fetchUsageData]);

  const incrementUsage = async (cost: number = 1) => {
    if (!hasUserContext) return false;
    if (isAdmin) return true; // Admin bypasses usage tracking

    try {
      const safeCost = Math.max(1, Math.round(cost));
      const updatedUses = dailyUses + safeCost;
      const { data, error } = await supabase
        .from('profiles')
        .update({
          daily_uses: updatedUses
        })
        .eq('user_id', profile.user_id)
        .select('daily_uses')
        .single();

      if (error) throw error;

      setDailyUses(data.daily_uses);
      return true;
    } catch (error) {
      if (isAbortLikeError(error)) return false;
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  const incrementChallengeUsage = async () => {
    if (!hasUserContext) {
      const currentUses = guestChallengeUses;
      const allowed = currentUses < FREE_CHALLENGE_LIMIT;
      const nextUses = allowed ? currentUses + 1 : currentUses;
      setGuestChallengeUses(nextUses);
      if (typeof window !== 'undefined') {
        localStorage.setItem(guestChallengeUsageKey(activeTrack), String(nextUses));
        window.dispatchEvent(new CustomEvent('guestChallengeUsageChanged'));
      }
      return { allowed, uses: nextUses, limit: FREE_CHALLENGE_LIMIT };
    }
    if (isAdmin) {
      return { allowed: true, uses: dailyChallengeUses, limit: Infinity };
    }
    const localUsage = readLocalChallengeUsage(activeTrack);
    const localResetAt = localUsage.resetAt ? new Date(localUsage.resetAt) : null;
    const now = new Date();
    const localPrevUses = localResetAt && now > localResetAt ? 0 : localUsage.uses;
    let serverUses = 0;
    let resetAtRaw = null;
    let limit = FREE_CHALLENGE_LIMIT;
    try {
      // Always fetch the latest from the server
      const requiredColumns = ['daily_challenge_reset_at', 'founder_track', 'tier', 'plan', 'current_period_end'] as const;
      const optionalColumns = ['premium_track'] as const;
      const attemptChallengeFetch = async () =>
        supabase
          .from('profiles')
          .select(profileSelect(requiredColumns, optionalColumns))
          .eq('user_id', profile.user_id)
          .single();

      let { data, error } = await attemptChallengeFetch();
      while (error) {
        const missingColumn = getMissingColumnFromError(error);
        if (!missingColumn) break;
        markProfileColumnMissing(missingColumn);
        ({ data, error } = await attemptChallengeFetch());
      }
      if (!error && data) {
        resetAtRaw = data.daily_challenge_reset_at || null;
        const hasPlanAccess = isPlanActive(data.plan || 'free', data.current_period_end || null);
        const isFounder = data.founder_track === 'founder';
        const dbPremiumTrack = normalizePremiumTrack((data as { premium_track?: DatabasePremiumTrack }).premium_track ?? null);
        const hasTrackPremium = dbPremiumTrack ? dbPremiumTrack === activeTrack : activeTrack === 'gcse';
        limit = isFounder || ((hasPlanAccess || data.tier === 'premium') && hasTrackPremium) ? Infinity : FREE_CHALLENGE_LIMIT;

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const { data: trackChallengeData, error: countError } = await supabase
          .from('extreme_results')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('track', activeTrack)
          .gte('created_at', startOfDay.toISOString())
          .limit(1);
        if (!countError) {
          serverUses = trackChallengeData?.length ? 1 : 0;
        }
      }
    } catch (e) {
      // fallback: use local only
    }
    const currentUses = Math.max(dailyChallengeUses, localPrevUses, serverUses);
    const allowed = currentUses < limit;
    const nextUses = allowed ? Math.min(limit, currentUses + 1) : currentUses;
    setDailyChallengeUses(nextUses);
    writeLocalChallengeUsage(activeTrack, nextUses, resetAtRaw ?? localUsage.resetAt ?? null);
    emitChallengeUsageUpdate();
    return { allowed, uses: nextUses, limit };
  };

  const incrementMockUsage = async (questionCount: number = 10) => {
    if (!hasUserContext) {
      const currentUses = guestMockUses;
      const allowed = currentUses < 1; // 1 mock per day for guests per subject
      const nextUses = allowed ? currentUses + 1 : currentUses;
      setGuestMockUses(nextUses);
      if (typeof window !== 'undefined') {
        localStorage.setItem(guestMockKey, String(nextUses));
        window.dispatchEvent(new CustomEvent('guestMockUsageChanged'));
      }
      return { allowed, uses: nextUses, limit: 1, message: allowed ? '' : 'Daily limit reached.' };
    }
    if (isAdmin) return { allowed: true, uses: dailyMockUses, limit: Infinity, message: '' };
    if (isPremium) return { allowed: true, uses: dailyMockUses, limit: Infinity, message: '' };

    try {
      // Server-side atomic check (global limit = 2, i.e. 1 english + 1 maths)
      const { data: usageData, error: usageError } = await supabase.rpc('consume_mock_session', {
        p_question_count: questionCount
      });

      if (usageError) {
        console.error('Error consuming mock session:', usageError);
        return { allowed: false, uses: dailyMockUses, limit: 1, message: 'Could not register mock attempt. Please try again.' };
      }

      const usageResult = usageData as { allowed?: boolean; message?: string; daily_mock_reset_at?: string } | null;
      if (!usageResult?.allowed) {
        return { allowed: false, uses: dailyMockUses, limit: 1, message: usageResult?.message || 'Daily mock exam limit reached.' };
      }

      // Server allowed — update subject-specific local counter
      const localMock = readLocalMockUsage(subject);
      const newUses = (localMock.uses || 0) + 1;
      const resetAt = usageResult?.daily_mock_reset_at || localMock.resetAt || null;
      writeLocalMockUsage(subject, newUses, resetAt);
      setDailyMockUses(newUses);
      emitMockUsageUpdate();
      return { allowed: true, uses: newUses, limit: 1, message: '' };
    } catch (error) {
      console.error('Error incrementing mock usage:', error);
      return { allowed: false, uses: dailyMockUses, limit: 1, message: 'Error starting mock exam.' };
    }
  };

  const isFounder = founderTrack === 'founder';
  const profileTier = profile?.tier ?? null;
  const profilePlan = profile?.plan ?? null;
  const profilePeriodEnd = profile?.current_period_end ?? null;
  const profileIsPremium = (profile as any)?.is_premium ?? null;
  const profilePremiumUntil = (profile as any)?.premium_until ?? null;
  const profilePremiumTrack = normalizePremiumTrack(
    (profile as { premium_track?: DatabasePremiumTrack } | null)?.premium_track ?? null
  );
  const effectivePremiumTrack = premiumTrack ?? profilePremiumTrack;

  // Premium features
  const premiumUntilStr = profilePremiumUntil ?? profilePeriodEnd ?? currentPeriodEnd ?? null;
  const hasActivePeriod = !premiumUntilStr || new Date(premiumUntilStr).getTime() > Date.now();
  const isPremiumFlag = Boolean(profileIsPremium) && hasActivePeriod;

  const hasPremiumSubscription =
    tier === 'premium' ||
    profileTier === 'premium' ||
    isPlanActive(plan, currentPeriodEnd) ||
    isPlanActive(profilePlan || 'free', profilePeriodEnd) ||
    isPremiumFlag;

  const isUltra = plan === 'ultra' || profilePlan === 'ultra';
  
  // Since there is only one gradlify product, any valid premium/ultra subscription opens all modules.
  const isPremium =
    isAdmin ||
    isFounder ||
    hasPremiumSubscription;
  const isUnlimited = isPremium;
  const dailyLimit = isPremium ? Infinity : 5;
  const remainingUses = isPremium ? Infinity : Math.max(0, dailyLimit - dailyUses);
  const canUseFeature = isPremium || dailyUses < dailyLimit;
  const canSpendUsage = (cost: number = 1) => {
    if (isPremium) return true;
    const safeCost = Math.max(1, Math.round(cost));
    return dailyUses + safeCost <= dailyLimit;
  };

  // Mock exam restrictions
  const dailyMockLimit = isPremium ? Infinity : 1;
  const remainingMockUses = isPremium ? Infinity : Math.max(0, dailyMockLimit - dailyMockUses);
  const canStartMockExam = isPremium || dailyMockUses < dailyMockLimit;
  const dailyChallengeLimit = isPremium ? Infinity : FREE_CHALLENGE_LIMIT;
  const remainingChallengeUses = isPremium ? Infinity : Math.max(0, dailyChallengeLimit - dailyChallengeUses);
  const canStartChallengeSession = isPremium || dailyChallengeUses < dailyChallengeLimit;
  const canUse10Questions = true; // Always free
  const canUse20Questions = isPremium;
  const canUse30Questions = isPremium;
  const canUse40Questions = isPremium;
  const canUseFullPaper = isPremium;

  const refreshUsage = async () => {
    if (!hasUserContext) return;
    await fetchUsageData();
  };

  const effectiveTier = hasUserContext ? tier : 'free';
  const effectiveFounderTrack = hasUserContext ? founderTrack : null;
  const effectiveDailyUses = hasUserContext ? dailyUses : 0;
  const effectiveDailyLimit = hasUserContext ? dailyLimit : 5;
  const effectiveRemainingUses = hasUserContext ? remainingUses : 5;
  const effectiveDailyMockLimit = hasUserContext ? dailyMockLimit : 1;
  const effectiveDailyMockUses = hasUserContext ? dailyMockUses : guestMockUses;
  const effectiveRemainingMockUses = hasUserContext
    ? remainingMockUses
    : Math.max(0, effectiveDailyMockLimit - guestMockUses);
  const effectiveDailyChallengeLimit = hasUserContext ? dailyChallengeLimit : FREE_CHALLENGE_LIMIT;
  const effectiveDailyChallengeUses = hasUserContext ? dailyChallengeUses : guestChallengeUses;
  const effectiveRemainingChallengeUses = hasUserContext
    ? remainingChallengeUses
    : Math.max(0, effectiveDailyChallengeLimit - guestChallengeUses);
  const effectiveIsPremium = hasUserContext ? isPremium : false;
  const effectiveIsUltra = hasUserContext ? isUltra : false;
  const effectiveIsFounder = hasUserContext ? isFounder : false;
  const effectiveCanUseFeature = hasUserContext ? canUseFeature : true;
  const effectiveCanStartMockExam = hasUserContext ? canStartMockExam : guestMockUses < effectiveDailyMockLimit;
  const effectiveCanStartChallengeSession = hasUserContext
    ? canStartChallengeSession
    : guestChallengeUses < effectiveDailyChallengeLimit;
  const effectiveIsLoading = hasUserContext ? isLoading : false;

  return {
    isLoading: effectiveIsLoading,
    isPremium: effectiveIsPremium,
    isUltra: effectiveIsUltra,
    isFounder: effectiveIsFounder,
    isAdmin: hasUserContext ? isAdmin : false,
    isUnlimited: hasUserContext ? isUnlimited : false,
    founderTrack: effectiveFounderTrack,
    premiumTrack: effectivePremiumTrack,
    tier: effectiveTier,
    dailyUses: effectiveDailyUses,
    dailyLimit: effectiveDailyLimit,
    remainingUses: effectiveRemainingUses,
    dailyMockUses: effectiveDailyMockUses,
    dailyMockLimit: effectiveDailyMockLimit,
    remainingMockUses: effectiveRemainingMockUses,
    dailyChallengeUses: effectiveDailyChallengeUses,
    dailyChallengeLimit: effectiveDailyChallengeLimit,
    remainingChallengeUses: effectiveRemainingChallengeUses,
    canUseFeature: effectiveCanUseFeature,
    canStartMockExam: effectiveCanStartMockExam,
    canStartChallengeSession: effectiveCanStartChallengeSession,
    canUse10Questions,
    canUse20Questions: hasUserContext ? canUse20Questions : false,
    canUse30Questions: hasUserContext ? canUse30Questions : false,
    canUse40Questions: hasUserContext ? canUse40Questions : false,
    canUseFullPaper: hasUserContext ? canUseFullPaper : false,
    incrementUsage,
    incrementChallengeUsage,
    incrementMockUsage,
    fetchUsageData: hasUserContext ? fetchUsageData : async () => {},
    canSpendUsage,
    refreshUsage
  };
}
