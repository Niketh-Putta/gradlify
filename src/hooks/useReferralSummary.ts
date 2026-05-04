import { useCallback, useEffect, useMemo, useState } from 'react';
import { getReferralSummary, REFERRAL_MOCK_REWARD, type ReferralSummary } from '@/lib/referrals';

export function useReferralSummary(enabled: boolean = true) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextSummary = await getReferralSummary();
      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Could not load referral summary'));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleRefresh = () => {
      void refresh();
    };

    window.addEventListener('mockUsageUpdated', handleRefresh);
    window.addEventListener('gradlify:profile-updated', handleRefresh);

    return () => {
      window.removeEventListener('mockUsageUpdated', handleRefresh);
      window.removeEventListener('gradlify:profile-updated', handleRefresh);
    };
  }, [enabled, refresh]);

  const derived = useMemo(() => {
    const bonusMockCredits = Number(summary?.bonusMockCredits ?? 0);
    const successfulReferrals = Number(summary?.successfulReferrals ?? 0);
    const earnedMockCredits = Number(summary?.earnedMockCredits ?? successfulReferrals * REFERRAL_MOCK_REWARD);
    const usedMockCredits = Math.max(0, earnedMockCredits - bonusMockCredits);

    return {
      bonusMockCredits,
      successfulReferrals,
      earnedMockCredits,
      usedMockCredits,
      code: summary?.code ?? '',
    };
  }, [summary]);

  return {
    summary,
    loading,
    error,
    refresh,
    ...derived,
  };
}
