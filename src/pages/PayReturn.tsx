import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncBillingStatus } from '@/lib/billingSync';

const STORAGE_KEY = 'gradlify:checkout:returnTo';

const PayReturn = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isSuccessReturn = window.location.pathname === '/pay/success';
    const stored = localStorage.getItem(STORAGE_KEY);
    const params = new URLSearchParams(window.location.search);
    const queryReturn = params.get("returnTo") ?? "";
    if (stored) {
      localStorage.removeItem(STORAGE_KEY);
    }

    const fallback = '/practice-page';
    const sanitizePath = (value: string | null) => {
      if (!value) return null;
      if (!value.startsWith('/')) return null;
      if (value.startsWith('/pay/')) return null;
      return value;
    };

    const baseTarget = sanitizePath(stored) ?? sanitizePath(queryReturn) ?? fallback;
    const targetUrl = new URL(baseTarget, window.location.origin);
    if (isSuccessReturn) {
      targetUrl.searchParams.set('upgraded', 'true');
    }

    const finishReturn = () => {
      navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`, { replace: true });
    };

    if (isSuccessReturn) {
      syncBillingStatus()
        .catch(() => null)
        .finally(() => {
          window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
          finishReturn();
        });
      return;
    }

    finishReturn();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p>Returning to your account...</p>
      </div>
    </div>
  );
};

export default PayReturn;
