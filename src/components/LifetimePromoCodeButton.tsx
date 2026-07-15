import { toast } from "sonner";
import { LIFETIME_PROMO } from "@/lib/pricing";

/** Used only by the landing-page LifetimePromoBanner. */
export async function copyLifetimePromoCode() {
  await navigator.clipboard.writeText(LIFETIME_PROMO.code);
  toast.success(
    `Copied ${LIFETIME_PROMO.code} — paste it at checkout for £${LIFETIME_PROMO.amountOffGbp} off`,
  );
}
