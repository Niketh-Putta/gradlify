import { supabase } from "@/integrations/supabase/client";
import { getMissingColumnFromError, markProfileColumnMissing, profileSelect } from "@/lib/schemaCompatibility";
import { ULTRA_PLAN_ENABLED } from "@/lib/featureFlags";

export type PremiumStatus = {
  isPremium: boolean;
  isUltra?: boolean;
  isTrialing?: boolean;
  hasPremiumSubscription: boolean;
  hasTrackPremium: boolean;
  premiumUntil: string | null;
  plan: string;
  founderTrack?: 'competitor' | 'founder' | null;
  premiumTrack?: 'gcse' | '11plus' | null;
  track?: 'gcse' | '11plus' | null;
  billingCycle: string | null;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
  tier?: string | null;
};

const normalizeTrack = (value: string | null | undefined): 'gcse' | '11plus' | null => {
  if (!value) return null;
  if (value === 'gcse') return 'gcse';
  if (value === '11plus' || value === 'eleven_plus') return '11plus';
  return null;
};

export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
  const requiredColumns = [
    "is_premium",
    "premium_until",
    "plan",
    "subscription_interval",
    "subscription_status",
    "stripe_subscription_status",
    "current_period_end",
    "cancel_at_period_end",
    "tier",
    "founder_track",
    "track",
  ] as const;
  const optionalColumns = ["premium_track"] as const;

  const attempt = async () =>
    supabase
      .from("profiles")
      .select(profileSelect(requiredColumns, optionalColumns))
      .eq("user_id", userId)
      .maybeSingle();

  let { data, error } = await attempt();
  while (error) {
    const missingColumn = getMissingColumnFromError(error);
    if (!missingColumn) break;
    markProfileColumnMissing(missingColumn);
    ({ data, error } = await attempt());
  }

  if (error) {
    throw error;
  }

  const pData = data as any;
  const premiumUntil = pData?.premium_until ?? pData?.current_period_end ?? null;
  const isFounder = pData?.founder_track === 'founder';
  const now = Date.now();
  const hasActivePeriod = premiumUntil ? new Date(premiumUntil).getTime() > now : false;
  const subscriptionStatus = pData?.stripe_subscription_status ?? pData?.subscription_status ?? null;
  const isLifetime =
    subscriptionStatus === 'lifetime' ||
    pData?.subscription_interval === 'lifetime' ||
    pData?.plan === 'premium_lifetime';
  const isTrialing = subscriptionStatus === 'trialing';
  const hasPaidPlan = Boolean(pData?.plan && pData.plan !== 'free');
  const isPremiumFlag = Boolean(pData?.is_premium) && (isLifetime || !premiumUntil || hasActivePeriod);
  const isPremiumTier = pData?.tier === 'premium';
  const currentTrack = normalizeTrack((pData as { track?: string | null } | null)?.track ?? null) ?? 'gcse';
  const premiumTrack = normalizeTrack((pData as { premium_track?: string | null } | null)?.premium_track ?? null);
  const hasTrackPremium = premiumTrack ? premiumTrack === currentTrack : currentTrack === 'gcse';
  const isActiveTrialing = isTrialing;
  const hasPremiumSubscription =
    isLifetime || isPremiumTier || isActiveTrialing || (hasPaidPlan && hasActivePeriod) || isPremiumFlag;
  const isPremium = isFounder || hasPremiumSubscription;
  const isLegacyUltra = pData?.plan === 'ultra' || pData?.plan === 'ultra_annual';
  const isUltra = ULTRA_PLAN_ENABLED && isLegacyUltra;

  return {
    isPremium,
    isUltra,
    isTrialing,
    hasPremiumSubscription: isFounder || hasPremiumSubscription,
    hasTrackPremium: true,
    premiumUntil,
    plan: pData?.plan ?? "free",
    founderTrack: pData?.founder_track ?? null,
    premiumTrack,
    track: currentTrack,
    billingCycle: pData?.subscription_interval ?? null,
    subscriptionStatus,
    cancelAtPeriodEnd: pData?.cancel_at_period_end ?? null,
    currentPeriodEnd: pData?.current_period_end ?? null,
    tier: pData?.tier ?? null,
  };
}

/**
 * Live mocks are included for paying Premium members only - not free trials.
 * Founders and active (non-trial) subscribers get free registration; trial users
 * must pay the one-off mock fee or upgrade to paid Premium first.
 */
export function hasPaidPremiumLiveMockAccess(status: PremiumStatus): boolean {
  if (status.founderTrack === 'founder') return true;
  if (status.isTrialing || status.subscriptionStatus === 'trialing') return false;
  if (
    status.subscriptionStatus === 'lifetime' ||
    status.billingCycle === 'lifetime' ||
    status.plan === 'premium_lifetime'
  ) {
    return true;
  }
  // Paid Premium with no expiry (lifetime-style flags) or active period.
  if (status.isPremium && status.tier === 'premium' && !status.isTrialing) {
    const premiumUntil = status.premiumUntil;
    if (!premiumUntil || new Date(premiumUntil).getTime() > Date.now()) return true;
  }
  if (status.subscriptionStatus === 'active' && status.hasPremiumSubscription) return true;
  const premiumUntil = status.premiumUntil;
  const hasActivePeriod = premiumUntil ? new Date(premiumUntil).getTime() > Date.now() : false;
  const hasPaidPlan = Boolean(status.plan && status.plan !== 'free');
  if (hasPaidPlan && hasActivePeriod) return true;
  if (status.tier === 'premium' && status.subscriptionStatus === 'active') return true;
  return false;
}
