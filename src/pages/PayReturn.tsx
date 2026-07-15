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

const isPremiumSyncResult = (result: unknown) => {
  const reason = (result as { reason?: string } | null)?.reason;
  const isPremium = Boolean((result as { db_is_premium?: boolean } | null)?.db_is_premium);
  return (
    isPremium ||
    reason === 'lifetime_premium' ||
    reason === 'lifetime_checkout_session' ||
    reason === 'lifetime_checkout_recovery'
  );
};

const sanitizePath = (value: string | null) => {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('/pay/')) return null;
  try {
    const url = new URL(value, window.location.origin);
    // Avoid sending payers back into auto-checkout.
    if (url.searchParams.get('intent') === 'checkout') {
      return '/home';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

const PayReturn = () => {
  const navigate = useNavigate();
  const [statusLine, setStatusLine] = useState('Returning to your account...');
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isSuccessReturn = window.location.pathname === '/pay/success';
    const gradlifyCheckout = localStorage.getItem(GRADLIFY_STORAGE_KEY);
    const params = new URLSearchParams(window.location.search);
    const queryReturn = params.get("returnTo") ?? "";
    const checkoutSessionId = params.get("session_id");
    if (gradlifyCheckout) {
      localStorage.removeItem(GRADLIFY_STORAGE_KEY);
    }

    const fallback = '/home';
    const baseTarget = sanitizePath(gradlifyCheckout) ?? sanitizePath(queryReturn) ?? fallback;
    const targetUrl = new URL(baseTarget, window.location.origin);
    if (isSuccessReturn) {
      targetUrl.searchParams.set('upgraded', 'true');
      targetUrl.searchParams.delete('intent');
    }

    const finishReturn = () => {
      if (cancelled) return;
      navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`, { replace: true });
    };

    const syncPremiumAfterCheckout = async (attempts: number) => {
      setStatusLine('Payment received. Unlocking Premium...');
      let lastResult: unknown = null;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        lastResult = await syncBillingStatus({ sessionId: checkoutSessionId }).catch(() => null);
        if (isPremiumSyncResult(lastResult)) {
          window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
          return true;
        }
        if (attempt < attempts - 1) {
          setStatusLine('Confirming your payment...');
          await sleep(1000 * (attempt + 1));
        }
      }
      window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
      return false;
    };

    const run = async () => {
      if (!isSuccessReturn) {
        finishReturn();
        return;
      }

      const liveMockSlug = mockEventSlugFromReturnPath(baseTarget);

      if (liveMockSlug) {
        // Lifetime bought from a mock page still needs a grant attempt, but
        // live-mock fee checkouts should not block on lifetime confirmation.
        await syncPremiumAfterCheckout(2);
        setStatusLine('Payment received. Confirming your mock registration...');
        const { registered } = await confirmLiveMockRegistrationAfterPayment(baseTarget);
        if (registered) {
          setStatusLine('Registration confirmed. Opening your mock...');
        } else {
          setStatusLine('Payment received. Opening your mock...');
        }
        finishReturn();
        return;
      }

      const confirmed = await syncPremiumAfterCheckout(5);
      if (cancelled) return;
      if (confirmed) {
        finishReturn();
        return;
      }

      setSyncFailed(true);
      setStatusLine('Payment received. Premium is still syncing - tap Retry or open Home.');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (syncFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f4] px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-sm font-semibold text-slate-700">{statusLine}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              Retry unlock
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => navigate('/home?upgraded=true', { replace: true })}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

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
