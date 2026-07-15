import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { syncBillingStatus } from '@/lib/billingSync';
import {
  confirmLiveMockRegistrationAfterPayment,
  mockEventSlugFromReturnPath,
} from '@/lib/liveMockCheckoutFlow';

const GRADLIFY_STORAGE_KEY = 'gradlify:checkout:returnTo';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PayReturn = () => {
  const navigate = useNavigate();
  const [statusLine, setStatusLine] = useState('Returning to your account...');

  useEffect(() => {
    const isSuccessReturn = window.location.pathname === '/pay/success';
    const gradlifyCheckout = localStorage.getItem(GRADLIFY_STORAGE_KEY);
    const params = new URLSearchParams(window.location.search);
    const queryReturn = params.get("returnTo") ?? "";
    const checkoutSessionId = params.get("session_id");
    if (gradlifyCheckout) {
      localStorage.removeItem(GRADLIFY_STORAGE_KEY);
    }

    const fallback = '/home';
    const sanitizePath = (value: string | null) => {
      if (!value) return null;
      if (!value.startsWith('/')) return null;
      if (value.startsWith('/pay/')) return null;
      return value;
    };

    const baseTarget = sanitizePath(gradlifyCheckout) ?? sanitizePath(queryReturn) ?? fallback;
    const targetUrl = new URL(baseTarget, window.location.origin);
    if (isSuccessReturn) {
      targetUrl.searchParams.set('upgraded', 'true');
    }

    const finishReturn = () => {
      navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`, { replace: true });
    };

    const syncPremiumAfterCheckout = async () => {
      setStatusLine('Payment received. Unlocking Premium...');
      // Webhook can lag; pass session_id so billing-sync can grant lifetime immediately.
      let lastResult: unknown = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        lastResult = await syncBillingStatus({ sessionId: checkoutSessionId }).catch(() => null);
        const reason = (lastResult as { reason?: string } | null)?.reason;
        const isPremium = Boolean((lastResult as { db_is_premium?: boolean } | null)?.db_is_premium);
        if (
          isPremium ||
          reason === 'lifetime_premium' ||
          reason === 'lifetime_checkout_session' ||
          reason === 'lifetime_checkout_recovery'
        ) {
          break;
        }
        if (attempt < 3) {
          setStatusLine('Confirming your payment...');
          await sleep(900 * (attempt + 1));
        }
      }
      window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
      return lastResult;
    };

    const run = async () => {
      if (isSuccessReturn) {
        // Always unlock Premium first - even if returnTo is a live-mock page
        // (user may have bought Lifetime Premium from a mock preview).
        await syncPremiumAfterCheckout();

        const liveMockSlug = mockEventSlugFromReturnPath(baseTarget);
        if (liveMockSlug) {
          setStatusLine('Payment received. Confirming your mock registration...');
          const { registered } = await confirmLiveMockRegistrationAfterPayment(baseTarget);
          if (registered) {
            setStatusLine('Registration confirmed. Opening your mock...');
          } else {
            setStatusLine('Premium unlocked. Opening your mock...');
          }
        }
      }
      finishReturn();
    };

    void run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f4] px-4">
      <div className="text-center space-y-3 max-w-md">
        <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">{statusLine}</p>
      </div>
    </div>
  );
};

export default PayReturn;
