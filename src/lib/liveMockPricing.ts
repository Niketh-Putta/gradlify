export const LIVE_MOCK_STANDARD_PRICE_GBP = 19.99;
export const LIVE_MOCK_PROMO_CODE = "LEVELFIELD";
export const LIVE_MOCK_PROMO_SPOTS_REMAINING = 12;

/**
 * Must match LiveMockExams signup display offset.
 * Calibrated against the real paid signup count so the page shows the intended
 * public count: at 19 real signups, offset 49 -> displayed 68.
 */
export const LIVE_MOCK_SIGNUP_DISPLAY_OFFSET = 49;
export const LIVE_MOCK_MIN_DISPLAYED_SIGNUPS = 68;

export const getDisplayedLiveMockSignupCount = (count: number) =>
  Math.max(LIVE_MOCK_MIN_DISPLAYED_SIGNUPS, count + LIVE_MOCK_SIGNUP_DISPLAY_OFFSET);

export const formatLiveMockPrice = (amountGbp: number) =>
  `£${amountGbp.toFixed(2).replace(/\.00$/, "")}`;
