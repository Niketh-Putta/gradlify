import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from './useAppContext';
let adminRpcMissing = false;

export function useTestingMode() {
  const contextData = useAppContext();
  const [isAdminAccount, setIsAdminAccount] = useState(false);
  const user = contextData?.user ?? null;

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) {
        setIsAdminAccount(false);
        return;
      }
      if (adminRpcMissing) {
        setIsAdminAccount(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });
        if (error) {
          if ((error as { code?: string }).code === 'PGRST202' || /not found/i.test(error.message ?? '')) {
            adminRpcMissing = true;
            setIsAdminAccount(false);
            return;
          }
          console.error('Error checking admin role:', error);
          setIsAdminAccount(false);
        } else {
          setIsAdminAccount(Boolean(data));
        }
      } catch (err) {
        console.error('Error in admin check:', err);
        setIsAdminAccount(false);
      }
    };
    checkAdminRole();
  }, [user?.id]);

  const isTestingMode = isAdminAccount;
  const canBypassPremium = isAdminAccount;

  const toggleTestingMode = (_enabled: boolean) => {
    // No-op: testing mode is account-based (admin only)
  };

  const getUsageOverride = (actualUsed: number, actualLimit: number) => {
    if (isTestingMode) {
      return {
        used: 0,
        remaining: Infinity as number,
        isUnlimited: true,
        testing: true,
      };
    }
    return {
      used: actualUsed,
      remaining: actualLimit - actualUsed,
      isUnlimited: false,
      testing: false,
    };
  };

  return {
    isTestingMode,
    canBypassPremium,
    showTestingBanner: isTestingMode,
    toggleTestingMode,
    getUsageOverride,
  };
}
