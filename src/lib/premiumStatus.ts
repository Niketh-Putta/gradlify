import { supabase } from "@/integrations/supabase/client";
import { getMissingColumnFromError, markProfileColumnMissing, profileSelect } from "@/lib/schemaCompatibility";

export type PremiumStatus = {
  isPremium: boolean;
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

  const premiumUntil = data?.premium_until ?? data?.current_period_end ?? null;
  const isFounder = data?.founder_track === 'founder';
  const now = Date.now();
  const hasActivePeriod = premiumUntil ? new Date(premiumUntil).getTime() > now : false;
  const subscriptionStatus = data?.stripe_subscription_status ?? data?.subscription_status ?? null;
  const isTrialing = subscriptionStatus === 'trialing';
  const hasPaidPlan = Boolean(data?.plan && data.plan !== 'free');
  const isPremiumFlag = Boolean(data?.is_premium) && (!premiumUntil || hasActivePeriod);
  const isPremiumTier = data?.tier === 'premium';
  const currentTrack = normalizeTrack((data as { track?: string | null } | null)?.track ?? null) ?? 'gcse';
  const premiumTrack = normalizeTrack((data as { premium_track?: string | null } | null)?.premium_track ?? null);
  const hasTrackPremium = premiumTrack ? premiumTrack === currentTrack : currentTrack === 'gcse';
  // A trialing subscription only counts if a premiumTrack is assigned.
  // This prevents a cancelled/incomplete Stripe checkout from showing 'Manage Billing'.
  const isActiveTrialing = isTrialing && premiumTrack !== null;
  const hasPremiumSubscription = isPremiumTier || isActiveTrialing || (hasPaidPlan && hasActivePeriod) || isPremiumFlag;
  const isPremium = isFounder || (hasPremiumSubscription && hasTrackPremium);

  return {
    isPremium,
    hasPremiumSubscription: isFounder || hasPremiumSubscription,
    hasTrackPremium,
    premiumUntil,
    plan: data?.plan ?? "free",
    founderTrack: data?.founder_track ?? null,
    premiumTrack,
    track: currentTrack,
    billingCycle: data?.subscription_interval ?? null,
    subscriptionStatus,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    tier: data?.tier ?? null,
  };
}
