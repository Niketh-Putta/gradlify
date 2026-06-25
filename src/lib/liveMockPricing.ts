import { COMBINED_MOCK_EVENT_SLUG, SECOND_MOCK_EVENT_SLUG } from "@/lib/liveMockCombinedConfig";

export const LIVE_MOCK_STANDARD_PRICE_GBP = 14.99;

export type LiveMockSignupDisplayConfig = {
  signupDisplayOffset: number;
  minDisplayedSignups: number;
};

export const LIVE_MOCK_SIGNUP_CONFIG: Record<string, LiveMockSignupDisplayConfig> = {
  [COMBINED_MOCK_EVENT_SLUG]: {
    signupDisplayOffset: 55,
    minDisplayedSignups: 76,
  },
  [SECOND_MOCK_EVENT_SLUG]: {
    signupDisplayOffset: 17,
    minDisplayedSignups: 44,
  },
};

export const getLiveMockSignupConfig = (mockSlug: string): LiveMockSignupDisplayConfig | null =>
  LIVE_MOCK_SIGNUP_CONFIG[mockSlug] ?? null;

export const getDisplayedLiveMockSignupCount = (count: number, mockSlug: string) => {
  const config = getLiveMockSignupConfig(mockSlug);
  if (!config) return count;
  return Math.max(config.minDisplayedSignups, count + config.signupDisplayOffset);
};

/** Client-side display math so UI stays in sync before edge deploy. Promos are disabled. */
export const resolveLiveMockSignupDisplay = (realSignupCount: number, mockSlug: string) => ({
  displayedCount: getDisplayedLiveMockSignupCount(realSignupCount, mockSlug),
});

export const SECOND_MOCK_MIN_DISPLAYED_SIGNUPS =
  LIVE_MOCK_SIGNUP_CONFIG[SECOND_MOCK_EVENT_SLUG].minDisplayedSignups;

/** @deprecated use getDisplayedLiveMockSignupCount(count, mockSlug) */
export const LIVE_MOCK_SIGNUP_DISPLAY_OFFSET =
  LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].signupDisplayOffset;
/** @deprecated use getDisplayedLiveMockSignupCount(count, mockSlug) */
export const LIVE_MOCK_MIN_DISPLAYED_SIGNUPS =
  LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].minDisplayedSignups;

export const formatLiveMockPrice = (amountGbp: number) =>
  `£${amountGbp.toFixed(2).replace(/\.00$/, "")}`;
