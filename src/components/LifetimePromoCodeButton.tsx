import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { LIFETIME_PROMO, PREMIUM_PRICING, formatGbp, lifetimePriceWithPromo } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export async function copyLifetimePromoCode() {
  await navigator.clipboard.writeText(LIFETIME_PROMO.code);
  toast.success(
    `Copied ${LIFETIME_PROMO.code} — paste it at checkout for £${LIFETIME_PROMO.amountOffGbp} off`,
  );
}

type LifetimePromoPriceProps = {
  className?: string;
  priceClassName?: string;
  strikeClassName?: string;
  suffixClassName?: string;
  showSuffix?: boolean;
};

/** Strikethrough list price + promo price for Lifetime Premium. */
export function LifetimePromoPrice({
  className,
  priceClassName,
  strikeClassName,
  suffixClassName,
  showSuffix = true,
}: LifetimePromoPriceProps) {
  const promoPrice = lifetimePriceWithPromo();
  return (
    <span className={cn("inline-flex items-baseline flex-wrap gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-black tabular-nums", priceClassName)}>{formatGbp(promoPrice)}</span>
      <span className={cn("line-through opacity-50 tabular-nums", strikeClassName)}>
        {formatGbp(PREMIUM_PRICING.lifetime)}
      </span>
      {showSuffix ? (
        <span className={cn("text-xs font-bold uppercase tracking-widest opacity-70", suffixClassName)}>
          with {LIFETIME_PROMO.code}
        </span>
      ) : null}
    </span>
  );
}

type LifetimePromoCodeButtonProps = {
  className?: string;
  /** dark = amber-on-dark surfaces; light = orange-on-white paywalls */
  tone?: "dark" | "light" | "onGradient";
};

/** Copyable LIFETIME50 chip used on banners and paywalls. */
export function LifetimePromoCodeButton({
  className,
  tone = "light",
}: LifetimePromoCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyLifetimePromoCode();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Could not copy. Type ${LIFETIME_PROMO.code} at checkout.`);
    }
  };

  const toneClass =
    tone === "dark"
      ? "border-amber-300/50 bg-amber-300/15 text-amber-100 hover:bg-amber-300/25"
      : tone === "onGradient"
        ? "border-white/45 bg-white/15 text-white hover:bg-white/25"
        : "border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100";

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] transition sm:text-xs",
        toneClass,
        className,
      )}
      aria-label={`Copy promo code ${LIFETIME_PROMO.code}`}
    >
      Code{" "}
      <span className="font-mono tracking-normal normal-case opacity-95">{LIFETIME_PROMO.code}</span>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function lifetimePromoHint() {
  return `Paste ${LIFETIME_PROMO.code} at checkout for £${LIFETIME_PROMO.amountOffGbp} off`;
}
