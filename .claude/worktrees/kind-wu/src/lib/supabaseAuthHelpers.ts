import { SUPABASE_URL } from '@/integrations/supabase/client';

export function buildManualOAuthUrl(provider: string) {
  // Construct a fallback authorize URL to help debug provider issues.
  const redirect = encodeURIComponent(`${window.location.origin}/auth/callback`);
  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${redirect}`;
  return url;
}

export function openManualOAuth(provider: string) {
  const url = buildManualOAuthUrl(provider);
  // Open in new tab to allow inspection
  window.open(url, '_blank');
}
