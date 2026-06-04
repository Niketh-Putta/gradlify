import { cn } from "@/lib/utils";
import { PREMIUM_PRICING, formatGbp } from "@/lib/pricing";

type OfferPriceProps = {
  className?: string;
  currentClassName?: string;
  originalClassName?: string;
  labelClassName?: string;
  suffix?: string;
  compact?: boolean;
  align?: "left" | "right" | "center";
  tone?: "light" | "dark";
};

export function DiagonalStrikePrice({
  amount = 39.99,
  className,
}: {
  amount?: number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-block whitespace-nowrap leading-none tabular-nums", className)}>
      <span>{formatGbp(amount)}</span>
      <span
        className="pointer-events-none absolute left-[-0.12em] right-[-0.12em] top-1/2 h-[0.16em] origin-center -rotate-12 rounded-full bg-red-600 shadow-[0_1px_0_rgba(255,255,255,0.5),0_0_8px_rgba(220,38,38,0.35)]"
        aria-hidden="true"
      />
    </span>
  );
}

export function OfferPrice({
  className,
  currentClassName,
  originalClassName,
  labelClassName,
  suffix,
  compact = false,
  align = "left",
  tone = "light",
}: OfferPriceProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "right" && "items-end text-right",
        align === "center" && "items-center text-center",
        className
      )}
    >
      <div className={cn("flex flex-wrap items-center gap-2.5", align === "right" && "justify-end", align === "center" && "justify-center")}>
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.18em]",
            tone === "dark" ? "text-white/80" : "text-red-600"
          )}
        >
          Was
        </span>
        <DiagonalStrikePrice
          className={cn(
            compact ? "text-lg font-black sm:text-xl" : "text-2xl font-black sm:text-3xl",
            tone === "dark" ? "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.28)]" : "text-slate-800",
            originalClassName
          )}
        />
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm",
            tone === "dark" ? "border-white/35 bg-white/20 text-white" : "border-red-200 bg-red-50 text-red-600",
            labelClassName
          )}
        >
          Limited time offer
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn(compact ? "text-xl font-black" : "text-3xl font-semibold sm:text-4xl", currentClassName)}>
          {formatGbp(PREMIUM_PRICING.monthly)}
        </span>
        {suffix && <span className={cn("text-sm", tone === "dark" ? "text-white/80" : "text-muted-foreground")}>{suffix}</span>}
      </div>
    </div>
  );
}
