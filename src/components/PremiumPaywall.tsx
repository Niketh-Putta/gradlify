import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Check } from "lucide-react";
import { toast } from "sonner";
import { startPremiumCheckout } from "@/lib/checkout";
import { useMembership } from "@/hooks/useMembership";

interface PaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  freeFeatures: string[];
  premiumFeatures: string[];
  secondaryLabel?: string;
  onComeBack?: () => void;
  primaryLabel?: string;
  upgradePlan?: 'monthly' | 'annual' | 'ultra' | 'ultra_annual';
  children?: React.ReactNode;
}

export function PremiumPaywall({
  open,
  onOpenChange,
  title,
  description,
  freeFeatures,
  premiumFeatures,
  secondaryLabel = "Maybe later",
  onComeBack,
  primaryLabel = "Start Your 3 Day Free Trial",
  upgradePlan = "monthly",
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
      await startPremiumCheckout(upgradePlan);
    } catch (error) {
      console.error("Failed to start checkout:", error);
      const message = error instanceof Error ? error.message : "Failed to start checkout. Please try again.";
      toast.error(message);
    } finally {
      setIsUpgrading(false);
    }
  };

  const compactFreeFeatures = freeFeatures.slice(0, 2);
  const compactPremiumFeatures = premiumFeatures.slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-[340px] sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto text-center px-3 py-3 sm:px-6 sm:py-6 rounded-2xl" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold">
            {title}
          </DialogTitle>
          <p className="text-xs sm:text-base mt-1.5 sm:mt-2 text-muted-foreground">
            {description}
          </p>
          <p className="text-[11px] sm:text-sm mt-1 text-muted-foreground">
            GCSE Premium unlocks GCSE content only. 11+ Premium unlocks 11+ content only.
          </p>
        </DialogHeader>

        {children}

        <div className="mt-4 sm:mt-6 hidden sm:grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 w-full">
            <p className="text-base sm:text-lg font-semibold text-slate-800 mb-2 text-center">Free</p>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-purple-200 bg-gradient-to-b from-purple-500/20 via-purple-200/70 to-purple-50 p-4 space-y-3 w-full">
            <p className="text-base sm:text-lg font-semibold text-purple-700 mb-2 text-center flex items-center justify-center gap-1">
              <Crown className="h-4 w-4 text-purple-600" />
              Premium
            </p>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sm:hidden mt-3 space-y-2 text-left">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">Free</p>
            <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
              {compactFreeFeatures.map((feature) => (
                <li key={`compact-free-${feature}`} className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 flex items-center gap-1">
              <Crown className="h-3 w-3 text-purple-600" />
              Premium
            </p>
            <ul className="mt-1 space-y-1 text-[11px] text-slate-700">
              {compactPremiumFeatures.map((feature) => (
                <li key={`compact-premium-${feature}`} className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 space-y-2.5 sm:space-y-3">
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="w-full justify-center text-xs sm:text-sm font-semibold min-h-[36px] sm:min-h-[44px]"
          >
            {isUpgrading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Starting Checkout...</span>
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4 text-purple-600" />
                <span>{primaryLabel}</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onComeBack?.();
            }}
            className="w-full text-xs sm:text-sm text-slate-500 hover:text-slate-700 min-h-[36px]"
          >
            {secondaryLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
