import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { LIFETIME_PROMO, PREMIUM_PRICING, formatGbp, lifetimePriceWithPromo } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useOfferCountdown } from "@/hooks/useOfferCountdown";
import { copyLifetimePromoCode } from "@/components/LifetimePromoCodeButton";

type LifetimePromoBannerProps = {
  onCta?: () => void;
  ctaLabel?: string;
  className?: string;
  /** Prefer compact single-line layout; still wraps on very small screens. */
  compact?: boolean;
};

/**
 * Minimal dark promo strip — same pattern as common SaaS top bars:
 * copy → code pill → accent CTA, plus a live countdown.
 */
export function LifetimePromoBanner({
  onCta,
  ctaLabel = "Get Premium",
  className,
  compact = false,
}: LifetimePromoBannerProps) {
  const countdown = useOfferCountdown();
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

  return (
    <div
      className={cn(
        "relative w-full bg-[#0a0a0a] text-[#e8e8e8]",
        compact ? "py-2" : "py-2.5",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-3 text-center sm:gap-x-2.5 sm:px-6",
          compact ? "text-[12px] sm:text-[13px]" : "text-[13px] sm:text-[14px]",
        )}
      >
        <p className="font-medium leading-snug tracking-tight text-[#d4d4d4]">
          Unlock Gradlify Premium?{" "}
          <span className="font-semibold text-white">£{LIFETIME_PROMO.amountOffGbp} OFF</span>{" "}
          Lifetime Premium with code
        </p>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#2a2a2a] px-2.5 py-0.5 font-mono text-[12px] font-semibold tracking-wide text-white transition hover:border-white/30 hover:bg-[#333] sm:text-[13px]"
          aria-label={`Copy promo code ${LIFETIME_PROMO.code}`}
          title="Click to copy"
        >
          {LIFETIME_PROMO.code}
          {copied ? <Check className="h-3 w-3 text-emerald-400" strokeWidth={2.5} /> : null}
        </button>

        <span className="hidden text-white/25 sm:inline" aria-hidden="true">
          ·
        </span>

        <span className="font-mono text-[12px] font-medium tabular-nums tracking-wide text-white/55 sm:text-[13px]">
          {countdown.label}
        </span>

        {onCta ? (
          <button
            type="button"
            onClick={onCta}
            className="ml-0.5 font-semibold text-orange-400 transition hover:text-orange-300 sm:ml-1"
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

