import { COMBINED_MOCK_EVENT_SLUG, SECOND_MOCK_EVENT_SLUG } from "@/lib/liveMockCombinedConfig";

export const LIVE_MOCK_STANDARD_PRICE_GBP = 14.99;

export type LiveMockSignupPromoConfig = {
  promoCode: string;
  promoMaxRedemptions: number;
  signupDisplayOffset: number;
  minDisplayedSignups: number;
};

export const LIVE_MOCK_SIGNUP_CONFIG: Record<string, LiveMockSignupPromoConfig> = {
  [COMBINED_MOCK_EVENT_SLUG]: {
    promoCode: "LEVELFIELD",
    promoMaxRedemptions: 3,
    signupDisplayOffset: 55,
    minDisplayedSignups: 76,
  },
  [SECOND_MOCK_EVENT_SLUG]: {
    promoCode: "MOCK2",
    promoMaxRedemptions: 7,
    signupDisplayOffset: 36,
    minDisplayedSignups: 43,
  },
};

/** Mock 1 promo. Kept for existing registration UI. */
export const LIVE_MOCK_PROMO_CODE = LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].promoCode;
export const LIVE_MOCK_PROMO_SPOTS_REMAINING =
  LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].promoMaxRedemptions;

export const SECOND_MOCK_PROMO_CODE = LIVE_MOCK_SIGNUP_CONFIG[SECOND_MOCK_EVENT_SLUG].promoCode;
export const SECOND_MOCK_PROMO_SPOTS_REMAINING =
  LIVE_MOCK_SIGNUP_CONFIG[SECOND_MOCK_EVENT_SLUG].promoMaxRedemptions;
export const SECOND_MOCK_MIN_DISPLAYED_SIGNUPS =
  LIVE_MOCK_SIGNUP_CONFIG[SECOND_MOCK_EVENT_SLUG].minDisplayedSignups;

export const getLiveMockSignupConfig = (mockSlug: string): LiveMockSignupPromoConfig | null =>
  LIVE_MOCK_SIGNUP_CONFIG[mockSlug] ?? null;

export const getDisplayedLiveMockSignupCount = (count: number, mockSlug: string) => {
  const config = getLiveMockSignupConfig(mockSlug);
  if (!config) return count;
  return Math.max(config.minDisplayedSignups, count + config.signupDisplayOffset);
};

/** @deprecated use getDisplayedLiveMockSignupCount(count, mockSlug) */
export const LIVE_MOCK_SIGNUP_DISPLAY_OFFSET =
  LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].signupDisplayOffset;
/** @deprecated use getDisplayedLiveMockSignupCount(count, mockSlug) */
export const LIVE_MOCK_MIN_DISPLAYED_SIGNUPS =
  LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].minDisplayedSignups;

export const formatLiveMockPrice = (amountGbp: number) =>
  `£${amountGbp.toFixed(2).replace(/\.00$/, "")}`;
