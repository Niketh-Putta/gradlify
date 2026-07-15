import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { startPremiumCheckout } from "@/lib/checkout";
import { useMembership } from "@/hooks/useMembership";
import { LIFETIME_PROMO } from "@/lib/pricing";
import {
  LifetimePromoCodeButton,
  LifetimePromoPrice,
  lifetimePromoHint,
} from "@/components/LifetimePromoCodeButton";
import { LifetimePromoBanner } from "@/components/LifetimePromoBanner";

interface PaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  freeFeatures?: string[];
  premiumFeatures?: string[];
  secondaryLabel?: string;
  onComeBack?: () => void;
  primaryLabel?: string;
  children?: React.ReactNode;
}

export function PremiumPaywall({
  open,
  onOpenChange,
  title,
  description,
  secondaryLabel = "Maybe later",
  onComeBack,
  primaryLabel = "Unlock Lifetime Premium",
  children,
}: PaywallProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { isFounder, isPremium } = useMembership();

  useEffect(() => {
    if (isFounder && open) {
      onOpenChange(false);
    }
  }, [isFounder, onOpenChange, open]);

  if (isFounder || isPremium) {
    return null;
  }

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await startPremiumCheckout("lifetime");
    } catch (error) {
      console.error("Failed to start checkout:", error);
      const message = error instanceof Error ? error.message : "Failed to start checkout. Please try again.";
      toast.error(message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-lg mx-auto p-0 rounded-[2rem] border-none bg-background dark:bg-slate-900 shadow-2xl overflow-y-auto max-h-[90dvh] md:max-h-[85vh]">
        <LifetimePromoBanner
          compact
          className="rounded-t-[2rem]"
          onCta={() => void handleUpgrade()}
          ctaLabel="Get Premium"
        />
        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          <DialogHeader className="text-center space-y-2 mb-6 sm:mb-8">
            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 max-w-[90%] mx-auto font-medium">
              {description}
            </p>
          </DialogHeader>

          {children}

          <div className="rounded-3xl border-2 border-primary bg-white p-6 sm:p-8 shadow-xl shadow-orange-500/5">
            <div className="space-y-5">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Gradlify Premium Lifetime
                </h3>
                <p className="text-[10px] font-bold text-orange-600/70 uppercase tracking-[0.15em] mt-1">
                  £{LIFETIME_PROMO.amountOffGbp} off · one payment · forever
                </p>
              </div>
              <LifetimePromoPrice
                priceClassName="text-3xl sm:text-4xl text-slate-900"
                strikeClassName="text-base text-slate-400"
                suffixClassName="text-slate-400"
              />
              <LifetimePromoCodeButton tone="pill" className="w-fit" />
              <div className="h-px w-full bg-slate-100" />
              <ul className="space-y-3">
                {[
                  "Full practice bank access",
                  "Unlimited mock exams",
                  "Revision notes and tracked readiness",
                  "Lifetime Premium — no renewals",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check className="w-3.5 h-3.5 text-orange-500 stroke-[3px] shrink-0 mt-0.5" />
                    <span className="text-[11px] font-bold text-slate-500 leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center space-y-4">
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full max-w-sm h-12 md:h-14 rounded-2xl text-[12px] md:text-[14px] font-black uppercase tracking-[0.15em] bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] border-none"
            >
              {isUpgrading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                primaryLabel
              )}
            </Button>
            <p className="text-[10px] font-bold text-slate-400 text-center max-w-sm">{lifetimePromoHint()}</p>
            <button
              onClick={() => {
                onComeBack?.();
                onOpenChange(false);
              }}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-500 transition-colors pb-2"
            >
              {secondaryLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
