import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { syncBillingStatus } from '@/lib/billingSync';
import {
  confirmLiveMockRegistrationAfterPayment,
  mockEventSlugFromReturnPath,
} from '@/lib/liveMockCheckoutFlow';

const GRADLIFY_STORAGE_KEY = 'gradlify:checkout:returnTo';

const PayReturn = () => {
  const navigate = useNavigate();
  const [statusLine, setStatusLine] = useState('Returning to your account...');

  useEffect(() => {
    const isSuccessReturn = window.location.pathname === '/pay/success';
    const gradlifyCheckout = localStorage.getItem(GRADLIFY_STORAGE_KEY);
    const params = new URLSearchParams(window.location.search);
    const queryReturn = params.get("returnTo") ?? "";
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

    const run = async () => {
      if (isSuccessReturn) {
        const liveMockSlug = mockEventSlugFromReturnPath(baseTarget);
        if (liveMockSlug) {
          setStatusLine('Payment received. Confirming your mock registration...');
          const { registered } = await confirmLiveMockRegistrationAfterPayment(baseTarget);
          if (registered) {
            setStatusLine('Registration confirmed. Opening your mock...');
          } else {
            setStatusLine('Payment received. Finishing setup...');
          }
        } else {
          await syncBillingStatus().catch(() => null);
          window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
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
