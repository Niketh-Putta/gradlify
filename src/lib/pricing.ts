/** Display amounts for Gradlify 11+ plans (GBP). Checkout uses Stripe Price IDs from env. */

export const PREMIUM_PRICING = {
  monthly: 19.99,
  monthlyOriginal: 39.99,
  annual: 199.99,
  annualOriginal: 399.99,
  annualPerMonth: 16.67,
  annualSavings: 200,
} as const;

export const ULTRA_PRICING = {
  monthly: 249.99,
  annual: 2499.99,
  /** Shown when annual billing is selected (£2499.99 / 12). */
  annualPerMonth: 208.33,
  /** Monthly × 12 − annual (marketing). */
  annualSavings: 499.89,
} as const;

export const formatGbp = (amount: number, options?: { decimals?: number }) => {
  const decimals = options?.decimals ?? (Number.isInteger(amount) ? 0 : 2);
  return `£${amount.toFixed(decimals)}`;
};
