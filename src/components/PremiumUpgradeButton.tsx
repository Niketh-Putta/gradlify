import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useMembership } from '@/hooks/useMembership';
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { startPremiumCheckout } from "@/lib/checkout";
import { PREMIUM_PRICING, formatGbp } from "@/lib/pricing";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

export function PremiumUpgradeButton({
  variant = 'default',
  size = 'default',
  label,
  className,
}: {
  variant?: 'default' | 'homeBanner';
  size?: 'default' | 'compact';
  label?: string;
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { isPremium, isFounder } = useMembership();
  const sprintCopy = getSprintUpgradeCopy();

  if (isFounder) {
    return null;
  }

  if (isPremium) {
    if (!AI_FEATURE_ENABLED) {
      return null;
    }
    return (
      <Button 
        onClick={() => window.location.href = "/chat"}
        variant="outline" 
        className="w-full justify-start text-responsive-sm min-h-[44px]"
      >
        <Crown className="h-4 w-4 mr-2" />
        <span className="truncate">Chat with AI</span>
      </Button>
    );
  }

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      await startPremiumCheckout('lifetime');
    } catch (error) {
      console.error('Error creating checkout:', error);
      const message = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const defaultLabel = label ?? `${sprintCopy.buttonPrimary} · ${formatGbp(PREMIUM_PRICING.lifetime)} lifetime`;

  return (
    <Button 
      disabled={isLoading}
      onClick={handleUpgrade}
      variant={variant === 'homeBanner' ? 'ghost' : 'premium'}
      className={
        variant === 'homeBanner'
          ? `w-full sm:w-auto justify-between gap-3 h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-background text-primary hover:bg-background/90${className ? ` ${className}` : ''}`
          : `w-full justify-center rounded-xl shadow-glow hover:shadow-lg ${size === 'compact' ? 'min-h-[44px] sm:min-h-[52px] text-xs sm:text-sm' : 'text-responsive-sm min-h-[60px]'}${className ? ` ${className}` : ''}`
      }
    >
      {isLoading ? (
        <>
          <Loader2 className={variant === 'homeBanner' ? "h-4 w-4 animate-spin" : "h-4 w-4 mr-2 animate-spin"} />
          <span className={variant === 'homeBanner' ? "text-sm font-medium" : ""}>Starting Checkout...</span>
        </>
      ) : (
        <>
          {variant === 'homeBanner' ? (
            <>
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-semibold">{label ?? sprintCopy.buttonSecondary}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Crown className="h-4 w-4 mr-2" />
              <span>{defaultLabel}</span>
            </>
          )}
        </>
      )}
    </Button>
  );
}
