import { supabase } from '@/integrations/supabase/client';

const STORED_REFERRAL_KEY = 'gradlify:pendingReferral';

type StoredReferral = {
  code: string;
  capturedAt: number;
};

const normalizeReferralCode = (value: string | null | undefined) =>
  (value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();

const readStoredReferral = (): StoredReferral | null => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORED_REFERRAL_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const code = normalizeReferralCode(parsed.code);
    const capturedAt = Number(parsed.capturedAt);
    if (!code || !Number.isFinite(capturedAt)) return null;
    return { code, capturedAt };
  } catch {
    return null;
  }
};

export const captureReferralFromSearch = (search: string) => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(search);
  const code = normalizeReferralCode(params.get('ref') ?? params.get('r'));
  if (!code) return null;

  const stored: StoredReferral = { code, capturedAt: Date.now() };
  localStorage.setItem(STORED_REFERRAL_KEY, JSON.stringify(stored));
  return stored;
};

export const hasStoredReferral = () => Boolean(readStoredReferral());

export const clearStoredReferral = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORED_REFERRAL_KEY);
};

export const claimStoredReferral = async (userCreatedAt?: string | null) => {
  const stored = readStoredReferral();
  if (!stored) return { attempted: false, claimed: false, reason: 'missing_code' };

  if (userCreatedAt) {
    const createdAtMs = new Date(userCreatedAt).getTime();
    if (Number.isFinite(createdAtMs) && createdAtMs < stored.capturedAt - 5 * 60 * 1000) {
      clearStoredReferral();
      return { attempted: false, claimed: false, reason: 'existing_account' };
    }
  }

  const { data, error } = await (supabase as any).rpc('claim_referral', {
    p_code: stored.code,
  });

  if (error) throw error;
  clearStoredReferral();

  return {
    attempted: true,
    claimed: Boolean(data?.claimed),
    reason: typeof data?.reason === 'string' ? data.reason : null,
    rewardedCredits: Number(data?.rewarded_credits ?? 0),
  };
};
