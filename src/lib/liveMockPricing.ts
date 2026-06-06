/** Marketing display cap for £9.99 spots (matches WhatsApp/poster copy). */
export const LIVE_MOCK_DISCOUNT_DISPLAY_CAP = 80;

export const LIVE_MOCK_DISCOUNT_PRICE_GBP = 9.99;
export const LIVE_MOCK_STANDARD_PRICE_GBP = 14.99;

/**
 * Must match LiveMockExams signup display offset.
 * Calibrated against the real paid signup count so the page shows the intended
 * number of remaining £9.99 spots: at 12 real signups, offset 56 -> displayed 68,
 * leaving 12 spots before the 80 cap. Because real signups only grow from that
 * anchor, each new paid signup increments the displayed count by exactly 1
 * (12 spots -> 11 -> ...) until the discount cap is reached.
 */
export const LIVE_MOCK_SIGNUP_DISPLAY_OFFSET = 56;
export const LIVE_MOCK_MIN_DISPLAYED_SIGNUPS = 68;

export const getDisplayedLiveMockSignupCount = (count: number) =>
  Math.max(LIVE_MOCK_MIN_DISPLAYED_SIGNUPS, count + LIVE_MOCK_SIGNUP_DISPLAY_OFFSET);

/** Real DB signups at which discount ends (keeps UI spots in sync with checkout). */
export const LIVE_MOCK_DISCOUNT_REAL_CAP =
  LIVE_MOCK_DISCOUNT_DISPLAY_CAP - LIVE_MOCK_SIGNUP_DISPLAY_OFFSET;

export const getDiscountedSpotsRemaining = (realSignupCount: number) =>
  Math.max(0, LIVE_MOCK_DISCOUNT_DISPLAY_CAP - getDisplayedLiveMockSignupCount(realSignupCount));

export const isLiveMockDiscountAvailable = (realSignupCount: number) =>
  realSignupCount < LIVE_MOCK_DISCOUNT_REAL_CAP;

export const formatLiveMockPrice = (amountGbp: number) =>
  `£${amountGbp.toFixed(2).replace(/\.00$/, "")}`;
