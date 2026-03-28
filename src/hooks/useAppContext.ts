import { useOutletContext } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface OutletContext {
  user: User;
  profile: {
    id: string;
    user_id: string;
    founder_track?: 'competitor' | 'founder' | null;
    track?: 'gcse' | '11plus' | null;
    premium_track?: 'gcse' | '11plus' | 'eleven_plus' | null;
    tier?: string;
    plan?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean | null;
    onboarding?: Record<string, unknown>;
    onboarding_completed_at?: string | null;
  };
  onProfileUpdate: () => void;
}

export const useAppContext = () => useOutletContext<OutletContext>();
