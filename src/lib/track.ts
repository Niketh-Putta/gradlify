import { supabase } from '@/integrations/supabase/client';
import { is11Plus } from './track-config';

export type UserTrack = 'gcse' | '11plus';

export const DEFAULT_TRACK: UserTrack = is11Plus ? '11plus' : 'gcse';
const SIGNUP_TRACK_KEY = 'gradlify:signup-track';

export function normalizeTrack(value?: string | null): UserTrack {
  if (!value) return DEFAULT_TRACK;
  const normalized = value.trim().toLowerCase();
  if (normalized === '11+' || normalized === '11 plus' || normalized === 'eleven plus') return '11plus';
  if (normalized === '11plus' || normalized === 'eleven_plus') return '11plus';
  return 'gcse';
}

export function getDashboardPath(): string {
  return '/dashboard';
}

export function setSignupTrack(track: UserTrack) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SIGNUP_TRACK_KEY, track);
}

export function getSignupTrack(): UserTrack | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(SIGNUP_TRACK_KEY);
  if (!raw) return null;
  return normalizeTrack(raw);
}

export function clearSignupTrack() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SIGNUP_TRACK_KEY);
}

export function resolveUserTrack(profileTrack?: string | null): UserTrack {
  return normalizeTrack(profileTrack ?? DEFAULT_TRACK);
}

export async function fetchUserTrack(userId: string): Promise<UserTrack> {
  const { data } = await supabase
    .from('profiles')
    .select('track')
    .eq('user_id', userId)
    .maybeSingle();
  return resolveUserTrack(data?.track ?? null);
}

export async function applySignupTrack(userId: string): Promise<UserTrack | null> {
  const signupTrack = getSignupTrack();
  if (!signupTrack) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('track')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    await supabase.from('profiles').insert({ user_id: userId, track: signupTrack });
  } else if (profile.track !== signupTrack) {
    await supabase.from('profiles').update({ track: signupTrack }).eq('user_id', userId);
  }

  clearSignupTrack();
  return signupTrack;
}
