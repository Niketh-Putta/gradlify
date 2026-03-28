// Feature flags for testing and development
export const PREMIUM_ENABLED = false;

// Testing mode configuration
export const TESTING_MODE = {
  UNLIMITED_USAGE: true,
  BYPASS_PREMIUM: true,
  SHOW_TESTING_BANNER: true,
};

// Usage limits (when premium is enabled)
export const USAGE_LIMITS = {
  FREE_DAILY_LIMIT: 10,
  PREMIUM_DAILY_LIMIT: Infinity,
};