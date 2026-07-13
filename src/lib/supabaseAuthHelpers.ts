import type { EmailOtpType, Session } from '@supabase/supabase-js';

import { SUPABASE_URL, supabase } from '@/integrations/supabase/client';

export const PASSWORD_RESET_CONFIRM_PATH = '/auth/reset-confirm';
export const PASSWORD_UPDATE_PATH = '/update-password';

export function getPasswordResetRedirectUrl(): string {
  if (typeof window === 'undefined') {
    return `https://gradlify.com${PASSWORD_RESET_CONFIRM_PATH}`;
  }

  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}${PASSWORD_RESET_CONFIRM_PATH}`;
  }

  return `https://gradlify.com${PASSWORD_RESET_CONFIRM_PATH}`;
}

export function buildManualOAuthUrl(provider: string) {
  const redirect = encodeURIComponent(`${window.location.origin}/auth/callback`);
  return `${SUPABASE_URL}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${redirect}`;
}

export function openManualOAuth(provider: string) {
  window.open(buildManualOAuthUrl(provider), '_blank');
}

function hasAuthParamsInUrl(url: URL): boolean {
  const hash = url.hash.replace(/^#/, '');
  return (
    url.searchParams.has('code') ||
    url.searchParams.has('token_hash') ||
    url.searchParams.has('type') ||
    hash.includes('access_token') ||
    hash.includes('type=recovery')
  );
}

export function clearAuthParamsFromUrl(pathname = window.location.pathname): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (!hasAuthParamsInUrl(url)) return;

  url.searchParams.delete('code');
  url.searchParams.delete('token_hash');
  url.searchParams.delete('type');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.hash = '';

  const nextSearch = url.searchParams.toString();
  window.history.replaceState({}, '', `${pathname}${nextSearch ? `?${nextSearch}` : ''}`);
}

async function waitForAuthSession(timeoutMs = 3000): Promise<Session | null> {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) {
    return existing.data.session;
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(async () => {
      subscription.unsubscribe();
      const { data } = await supabase.auth.getSession();
      resolve(data.session ?? null);
    }, timeoutMs);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
      resolve(session);
    });
  });
}

export async function establishPasswordRecoverySession(
  options: { requireUserAction?: boolean } = {},
): Promise<Session | null> {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  if (options.requireUserAction && !code && !(tokenHash && type)) {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  }

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) throw error;
      clearAuthParamsFromUrl(PASSWORD_UPDATE_PATH);
      return data.session ?? null;
    }

    if (tokenHash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) throw error;
      clearAuthParamsFromUrl(PASSWORD_UPDATE_PATH);
      return data.session ?? null;
    }

    if (hasAuthParamsInUrl(url)) {
      const session = await waitForAuthSession();
      clearAuthParamsFromUrl(PASSWORD_UPDATE_PATH);
      return session;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  } catch (error) {
    console.error('Failed to establish password recovery session:', error);
    return null;
  }
}

type PasswordResetResponse = {
  ok?: boolean;
  sent?: boolean;
  exists?: boolean;
  code?: string;
  message?: string;
};

export async function requestPasswordResetEmail(email: string): Promise<{
  sent: boolean;
  exists: boolean | null;
}> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.functions.invoke('request-password-reset', {
    body: { email: normalizedEmail },
  });

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as PasswordResetResponse;
  if (!payload.ok) {
    throw new Error(payload.message || 'Failed to send reset email');
  }

  return {
    sent: Boolean(payload.sent),
    exists: typeof payload.exists === 'boolean' ? payload.exists : null,
  };
}
