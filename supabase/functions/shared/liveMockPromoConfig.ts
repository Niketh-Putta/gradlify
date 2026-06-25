export const BOTH_SUBJECTS_LIVE_MOCK_SLUG = "both_subjects_live_mock";
export const SECOND_LIVE_MOCK_SLUG = "both_subjects_live_mock_2";

export const LIVE_MOCK_STANDARD_PRICE_GBP = 14.99;

/** Display-only signup counters (not promo / discount codes). */
export type LiveMockSignupDisplayConfig = {
  signupDisplayOffset: number;
  minDisplayedSignups: number;
};

export const LIVE_MOCK_SIGNUP_DISPLAY_BY_SLUG: Record<string, LiveMockSignupDisplayConfig> = {
  [BOTH_SUBJECTS_LIVE_MOCK_SLUG]: {
    signupDisplayOffset: 55,
    minDisplayedSignups: 76,
  },
  [SECOND_LIVE_MOCK_SLUG]: {
    signupDisplayOffset: 17,
    minDisplayedSignups: 44,
  },
};

export const getLiveMockSignupDisplayConfig = (mockSlug: string): LiveMockSignupDisplayConfig | null =>
  LIVE_MOCK_SIGNUP_DISPLAY_BY_SLUG[mockSlug] ?? null;

/** @deprecated Promos disabled — always null. */
export const getLiveMockPromoConfig = (_mockSlug: string): null => null;

export const getDisplayedLiveMockSignupCount = (realCount: number, mockSlug: string): number => {
  const config = getLiveMockSignupDisplayConfig(mockSlug);
  if (!config) return realCount;
  return Math.max(config.minDisplayedSignups, realCount + config.signupDisplayOffset);
};

/** @deprecated Promos disabled — always 0. */
export const getPromoSpotsRemaining = (_timesRedeemed: number, _mockSlug: string): number => 0;

/** @deprecated Promos disabled — always 0. */
export const getPromoSpotsRemainingFromDisplay = (_displayedSignupCount: number, _mockSlug: string): number => 0;
