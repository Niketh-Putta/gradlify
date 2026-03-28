import { supabase } from '@/integrations/supabase/client';
import { is11Plus } from './track-config';

export type UserTrack = 'gcse' | '11plus';

export const DEFAULT_TRACK: UserTrack = is11Plus ? '11plus' : 'gcse';

export function normalizeTrack(value?: string | null): UserTrack {
  return DEFAULT_TRACK;
}

export function getDashboardPath(): string {
  return '/dashboard';
}

export function setSignupTrack(track: UserTrack) {
  // No-op for decoupled environment
}

export function getSignupTrack(): UserTrack | null {
  return DEFAULT_TRACK;
}

export function clearSignupTrack() {}

export function resolveUserTrack(profileTrack?: string | null): UserTrack {
  return DEFAULT_TRACK;
}

export async function fetchUserTrack(userId: string): Promise<UserTrack> {
  // Completely decouple from database profile track.
  // The environment exclusively determines the track.
  return DEFAULT_TRACK;
}

export async function applySignupTrack(userId: string): Promise<UserTrack | null> {
  // Let the user exist in the DB without explicitly defining track anymore, 
  // since the platform is physically decoupled by VITE_APP_TRACK.
  return DEFAULT_TRACK;
}
