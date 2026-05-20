/** Users who see a full-app payment gate when Stripe subscription is past due. */
const PAYMENT_FAILED_BLOCKLIST_EMAILS = new Set([
  "vivek.botcha@gmail.com",
]);

const FAILED_PAYMENT_STATUSES = new Set(["past_due", "unpaid"]);

export function isPaymentFailedBlocklistedEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return PAYMENT_FAILED_BLOCKLIST_EMAILS.has(email.trim().toLowerCase());
}

export function shouldBlockForFailedPayment(
  email: string | null | undefined,
  stripeSubscriptionStatus: string | null | undefined
): boolean {
  if (!isPaymentFailedBlocklistedEmail(email)) return false;
  const status = stripeSubscriptionStatus?.trim().toLowerCase() ?? "";
  return FAILED_PAYMENT_STATUSES.has(status);
}

/** Routes that stay reachable while payment is blocked (e.g. return from Stripe). */
export function isPaymentGateExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/pay/success") ||
    pathname.startsWith("/pay/cancelled")
  );
}
