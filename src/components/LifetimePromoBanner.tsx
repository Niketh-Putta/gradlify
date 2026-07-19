import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { LIFETIME_PROMO } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type LifetimePromoBannerProps = {
  onCta?: () => void;
  ctaLabel?: string;
  className?: string;
  /** Prefer compact single-line layout; still wraps on very small screens. */
  compact?: boolean;
};

/**
 * Landing-page only dark promo strip.
 * Do not import this outside LandingPage — LIFETIME50 must not appear elsewhere in UI.
 */
export function LifetimePromoBanner({
  onCta,
  ctaLabel = "Get Premium",
  className,
  compact = false,
}: LifetimePromoBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(LIFETIME_PROMO.code);
      toast.success(
        `Copied ${LIFETIME_PROMO.code} - paste it at checkout for £${LIFETIME_PROMO.amountOffGbp} off`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Could not copy. Type ${LIFETIME_PROMO.code} at checkout.`);
    }
  };

  return (
    <div
      className={cn(
        "relative flex w-full justify-center overflow-hidden text-[#e8e8e8]",
        "bg-[linear-gradient(90deg,#0b1220_0%,#111827_45%,#0c0a09_100%)]",
        compact ? "py-2" : "py-2.5",
        className,
      )}
    >
      {/* Soft brand glows - restrained orange/amber, not solid black */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_120px_at_18%_50%,rgba(234,88,12,0.22),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_100px_at_82%_50%,rgba(245,158,11,0.14),transparent_68%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/35 to-transparent"
        aria-hidden
      />

      <div
        className={cn(
          "relative z-[1] inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-3 text-center sm:gap-x-2.5 sm:px-6",
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
          className="inline-flex items-center gap-1.5 rounded-md border border-orange-400/25 bg-white/5 px-2.5 py-0.5 font-mono text-[12px] font-semibold tracking-wide text-white backdrop-blur-sm transition hover:border-orange-400/45 hover:bg-white/10 sm:text-[13px]"
          aria-label={`Copy promo code ${LIFETIME_PROMO.code}`}
          title="Click to copy"
        >
          {LIFETIME_PROMO.code}
          {copied ? <Check className="h-3 w-3 text-emerald-400" strokeWidth={2.5} /> : null}
        </button>

        <span className="hidden text-white/25 sm:inline" aria-hidden="true">
          ·
        </span>

        <span className="text-[12px] font-medium tracking-wide text-amber-200/80 sm:text-[13px]">
          3 days left
        </span>

        {onCta ? (
          <button
            type="button"
            onClick={onCta}
            className="ml-0.5 font-semibold text-orange-400 transition hover:text-orange-300 hover:underline sm:ml-1"
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
