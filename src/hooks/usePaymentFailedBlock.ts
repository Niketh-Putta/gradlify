import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncBillingStatus } from "@/lib/billingSync";
import {
  isPaymentFailedBlocklistedEmail,
  shouldBlockForFailedPayment,
} from "@/lib/paymentBlocklist";
import { isAbortLikeError } from "@/lib/errors";

type PaymentBlockState = {
  checking: boolean;
  isBlocked: boolean;
  refresh: () => Promise<void>;
};

export function usePaymentFailedBlock(user: User | null): PaymentBlockState {
  const [checking, setChecking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.email || !isPaymentFailedBlocklistedEmail(user.email)) {
      setIsBlocked(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      try {
        await syncBillingStatus();
      } catch (syncError) {
        console.warn("[usePaymentFailedBlock] billing sync failed:", syncError);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("stripe_subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const status = data?.stripe_subscription_status ?? null;
      setIsBlocked(shouldBlockForFailedPayment(user.email, status));
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error("[usePaymentFailedBlock] profile check failed:", error);
      setIsBlocked(shouldBlockForFailedPayment(user.email, "past_due"));
    } finally {
      setChecking(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { checking, isBlocked, refresh };
}
