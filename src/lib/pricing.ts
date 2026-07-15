/** Display amounts for Gradlify 11+ plans (GBP). Checkout uses Stripe Price IDs / price_data. */

export const PREMIUM_PRICING = {
  /** One-time lifetime Gradlify Premium — the only public offer. */
  lifetime: 149.99,
  /** Kept for copy about existing weekly subscribers; not offered at checkout. */
  weekly: 9.99,
  /** Strikethrough anchor in-app - keep modest; never £40 (scares parents). */
  weeklyOriginal: 11.99,
  /** Kept for Terms / legacy subscriber references; not offered at checkout. */
  annual: 249.99,
  /** Strikethrough vs paying weekly for 52 weeks (9.99 × 52). */
  annualOriginal: 519.48,
  /** Annual ÷ 52 — shown as the headline rate when annual billing is selected. */
  annualPerWeek: 4.81,
  /** Annual ÷ 12 — shown where monthly equivalent is useful. */
  annualPerMonth: 20.83,
  /** Weekly × 52 − annual (marketing). Rounded for SAVE badges. */
  annualSavings: 269,
} as const;

/** Landing banner code: £50 off lifetime Premium at Stripe Checkout. */
export const LIFETIME_PROMO = {
  code: "LIFETIME50",
  amountOffGbp: 50,
} as const;

export const lifetimePriceWithPromo = () =>
  Math.round((PREMIUM_PRICING.lifetime - LIFETIME_PROMO.amountOffGbp) * 100) / 100;

/** Marketing value stack shown on the /premium plan page. */
export const PREMIUM_VALUE_ITEMS = [
  { label: "Unlimited 11+ Maths & English practice bank", valueGbp: 120 },
  { label: "Full timed mock exams (auto-marked)", valueGbp: 90 },
  { label: "Unlimited Challenge questions", valueGbp: 45 },
  { label: "Revision notes by topic", valueGbp: 40 },
  { label: "Parent readiness tracking & weak-topic reports", valueGbp: 55 },
  { label: "Mistake tracker and progress analytics", valueGbp: 35 },
  { label: "GL / CEM / ISEB style coverage", valueGbp: 50 },
] as const;

export const premiumTotalValueGbp = () =>
  PREMIUM_VALUE_ITEMS.reduce((sum, item) => sum + item.valueGbp, 0);

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
