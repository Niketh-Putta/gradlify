import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPremiumStatus } from '@/lib/premiumStatus';
import { syncBillingStatus } from '@/lib/billingSync';
import { isAbortLikeError } from '@/lib/errors';

interface MembershipData {
  tier: string;
  plan: string;
  founderTrack?: 'competitor' | 'founder' | null;
  premiumTrack?: 'gcse' | '11plus' | null;
  track?: 'gcse' | '11plus' | null;
  hasPremiumSubscription?: boolean;
  hasTrackPremium?: boolean;
  isUltra?: boolean;
  subscription: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

type ProfileUpdatePayload = {
  new: { user_id?: string | null } | null;
};

export function useMembership() {
  const [data, setData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchMembership = async (skipSync = false) => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || !mounted) {
          setLoading(false);
          return;
        }

        if (!skipSync) {
          try {
            await syncBillingStatus();
          } catch (syncError) {
            console.warn("Billing sync failed:", syncError);
          }
        }

        const premiumStatus = await getPremiumStatus(user.id);
        if (mounted) {
          const membershipData: MembershipData = {
            tier: premiumStatus.isPremium ? 'premium' : 'free',
            plan: premiumStatus.plan,
            founderTrack: premiumStatus.founderTrack ?? null,
            premiumTrack: premiumStatus.premiumTrack ?? null,
            track: premiumStatus.track ?? null,
            hasPremiumSubscription: premiumStatus.hasPremiumSubscription,
            hasTrackPremium: premiumStatus.hasTrackPremium,
            isUltra: premiumStatus.plan === 'ultra',
            subscription: premiumStatus.billingCycle,
            subscription_status: premiumStatus.subscriptionStatus || null,
            current_period_end: premiumStatus.currentPeriodEnd || null,
            cancel_at_period_end: premiumStatus.cancelAtPeriodEnd || null,
          };

          console.debug('[useMembership:data]', { data: membershipData, error: null });
          setData(membershipData);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isAbortLikeError(err)) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error in useMembership:', err);
        setError(message);
        console.debug('[useMembership:data]', { data: null, error: message });
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchMembership();

    // Setup realtime subscription for profile changes
    const channel = supabase
      .channel('membership-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        async (payload: ProfileUpdatePayload) => {
          console.log('Profile updated via realtime:', payload);
          
          // Verify this update is for the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user && payload.new?.user_id === user.id && mounted) {
            fetchMembership(true);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    data, 
    loading, 
    error,
    tier: data?.tier || 'free',
    plan: data?.plan || 'free',
    founderTrack: data?.founderTrack ?? null,
    isFounder: data?.founderTrack === 'founder',
    isPremium: data ? data.tier === 'premium' : false,
    isUltra: data?.isUltra ?? false,
    statusLabel: data?.founderTrack === 'founder' ? 'Founder' : data?.isUltra ? 'Ultra' : data?.tier === 'premium' ? 'Premium' : 'Free'
  };
}
