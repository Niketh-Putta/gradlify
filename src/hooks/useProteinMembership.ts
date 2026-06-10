import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/useMembership";
import { fetchProteinProfile } from "@/lib/protein/storage";
import { FOUNDER_EMAIL } from "@/lib/protein/types";
import { isAbortLikeError } from "@/lib/errors";

type Options = {
  userEmail?: string | null;
};

export function useProteinMembership({ userEmail }: Options = {}) {
  const membership = useMembership();
  const [hasProteinPremium, setHasProteinPremium] = useState(false);
  const [proteinLoading, setProteinLoading] = useState(true);

  const refreshProteinProfile = useCallback(async () => {
    setProteinLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHasProteinPremium(false);
        return;
      }

      const profile = await fetchProteinProfile(user.id);
      setHasProteinPremium(Boolean(profile?.is_premium || profile?.unlimited_scans));
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.warn("[useProteinMembership] protein profile fetch failed:", error);
      }
    } finally {
      setProteinLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProteinProfile();
  }, [refreshProteinProfile]);

  const isFounderEmail = userEmail?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
  const hasGradlifyPremium = membership.isPremium || membership.isFounder;
  const hasPremiumAccess = isFounderEmail || hasGradlifyPremium || hasProteinPremium;
  const loading = membership.loading || proteinLoading;

  return useMemo(
    () => ({
      data: membership.data,
      error: membership.error,
      loading,
      tier: membership.tier,
      plan: membership.plan,
      founderTrack: membership.founderTrack,
      isFounder: membership.isFounder,
      isPremium: membership.isPremium,
      isUltra: membership.isUltra,
      statusLabel: membership.statusLabel,
      hasProteinPremium,
      hasGradlifyPremium,
      hasPremiumAccess,
      isFounderEmail,
      refreshProteinProfile,
    }),
    [
      membership.data,
      membership.error,
      membership.tier,
      membership.plan,
      membership.founderTrack,
      membership.isFounder,
      membership.isPremium,
      membership.isUltra,
      membership.statusLabel,
      hasProteinPremium,
      hasGradlifyPremium,
      hasPremiumAccess,
      isFounderEmail,
      loading,
      refreshProteinProfile,
    ],
  );
}
