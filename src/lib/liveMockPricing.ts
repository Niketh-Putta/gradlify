import { COMBINED_MOCK_EVENT_SLUG, SECOND_MOCK_EVENT_SLUG } from "@/lib/liveMockCombinedConfig";

export const LIVE_MOCK_STANDARD_PRICE_GBP = 14.99;

export type LiveMockSignupPromoConfig = {
  promoCode: string;
  promoMaxRedemptions: number;
  /** When set, remaining uses = promoDisplayCap − displayed signup count. */
  promoDisplayCap?: number;
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
    promoMaxRedemptions: 50,
    promoDisplayCap: 50,
    signupDisplayOffset: 36,
    minDisplayedSignups: 43,
  },
};

/** Mock 1 promo. Kept for existing registration UI. */
export const LIVE_MOCK_PROMO_CODE = LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].promoCode;
export const LIVE_MOCK_PROMO_SPOTS_REMAINING =
  LIVE_MOCK_SIGNUP_CONFIG[COMBINED_MOCK_EVENT_SLUG].promoMaxRedemptions;

export const getLiveMockSignupConfig = (mockSlug: string): LiveMockSignupPromoConfig | null =>
  LIVE_MOCK_SIGNUP_CONFIG[mockSlug] ?? null;

export const getDisplayedLiveMockSignupCount = (count: number, mockSlug: string) => {
  const config = getLiveMockSignupConfig(mockSlug);
  if (!config) return count;
  return Math.max(config.minDisplayedSignups, count + config.signupDisplayOffset);
};

/** MOCK2: discount uses left = 50 minus families shown enrolled. */
export const getPromoSpotsRemainingFromDisplay = (displayedSignupCount: number, mockSlug: string) => {
  const config = getLiveMockSignupConfig(mockSlug);
  if (!config?.promoDisplayCap) return 0;
  return Math.max(0, config.promoDisplayCap - displayedSignupCount);
};

export const getDefaultPromoSpotsRemaining = (mockSlug: string, realSignupCount = 0) => {
  const config = getLiveMockSignupConfig(mockSlug);
  if (!config) return 0;
  if (config.promoDisplayCap) {
    return getPromoSpotsRemainingFromDisplay(
      getDisplayedLiveMockSignupCount(realSignupCount, mockSlug),
      mockSlug,
    );
  }
  return config.promoMaxRedemptions;
};

export const SECOND_MOCK_PROMO_CODE = LIVE_MOCK_SIGNUP_CONFIG[SECOND_MOCK_EVENT_SLUG].promoCode;
export const SECOND_MOCK_PROMO_SPOTS_REMAINING = getDefaultPromoSpotsRemaining(SECOND_MOCK_EVENT_SLUG);
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
