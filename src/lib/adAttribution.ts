/**
 * Persist Google Ads / paid-search click attribution from the landing URL.
 * gtag already attributes conversions via gclid when present; we keep a copy
 * so product analytics and support can see source of a signup.
 */

const STORAGE_KEY = "gradlify:adAttribution";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export type AdAttribution = {
  gclid: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  capturedAt: number;
  landingPath: string | null;
};

const clean = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 200);
  return trimmed || null;
};

export const captureAdAttributionFromSearch = (search: string): AdAttribution | null => {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(search);
  const gclid = clean(params.get("gclid"));
  const utmSource = clean(params.get("utm_source"));
  const utmMedium = clean(params.get("utm_medium"));
  const utmCampaign = clean(params.get("utm_campaign"));
  const utmContent = clean(params.get("utm_content"));
  const utmTerm = clean(params.get("utm_term"));

  if (!gclid && !utmSource && !utmCampaign) return null;

  const attribution: AdAttribution = {
    gclid,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    capturedAt: Date.now(),
    landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 500),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // private mode / quota - ignore
  }

  return attribution;
};

export const readAdAttribution = (): AdAttribution | null => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as AdAttribution | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Number.isFinite(parsed.capturedAt)) return null;
    if (Date.now() - parsed.capturedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

/** True when this browser session came from Google paid search. */
export const isGooglePaidClick = (): boolean => {
  const attr = readAdAttribution();
  if (!attr) return false;
  if (attr.gclid) return true;
  return attr.utmSource === "google" && attr.utmMedium === "cpc";
};
