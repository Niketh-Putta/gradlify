export const BOTH_SUBJECTS_LIVE_MOCK_SLUG = "both_subjects_live_mock";
export const SECOND_LIVE_MOCK_SLUG = "both_subjects_live_mock_2";

export const LIVE_MOCK_STANDARD_PRICE_GBP = 14.99;

export type LiveMockPromoConfig = {
  promoCode: string;
  promoMaxRedemptions: number;
  signupDisplayOffset: number;
  minDisplayedSignups: number;
};

export const LIVE_MOCK_PROMO_BY_SLUG: Record<string, LiveMockPromoConfig> = {
  [BOTH_SUBJECTS_LIVE_MOCK_SLUG]: {
    promoCode: "LEVELFIELD",
    promoMaxRedemptions: 3,
    signupDisplayOffset: 55,
    minDisplayedSignups: 76,
  },
  [SECOND_LIVE_MOCK_SLUG]: {
    promoCode: "MOCK2",
    promoMaxRedemptions: 7,
    signupDisplayOffset: 36,
    minDisplayedSignups: 43,
  },
};

export const getLiveMockPromoConfig = (mockSlug: string): LiveMockPromoConfig | null =>
  LIVE_MOCK_PROMO_BY_SLUG[mockSlug] ?? null;

export const getDisplayedLiveMockSignupCount = (realCount: number, mockSlug: string): number => {
  const config = getLiveMockPromoConfig(mockSlug);
  if (!config) return realCount;
  return Math.max(config.minDisplayedSignups, realCount + config.signupDisplayOffset);
};

export const getPromoSpotsRemaining = (timesRedeemed: number, mockSlug: string): number => {
  const config = getLiveMockPromoConfig(mockSlug);
  if (!config) return 0;
  return Math.max(0, config.promoMaxRedemptions - timesRedeemed);
};
