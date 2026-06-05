import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useMembership } from '@/hooks/useMembership';
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { startPremiumCheckout } from "@/lib/checkout";
import { PREMIUM_PRICING, ULTRA_PRICING } from "@/lib/pricing";
import { AI_FEATURE_ENABLED, ULTRA_PLAN_ENABLED } from "@/lib/featureFlags";
import { DiagonalStrikePrice } from "@/components/OfferPrice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  // If user is already premium, show a different button
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

  const handleUpgrade = async (plan: 'monthly' | 'annual' | 'ultra' | 'ultra_annual') => {
    try {
      setIsLoading(true);
      await startPremiumCheckout(plan);
    } catch (error) {
      console.error('Error creating checkout:', error);
      const message = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          disabled={isLoading}
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
                  <span className="">{label ?? sprintCopy.buttonPrimary}</span>
                </>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuItem onClick={() => handleUpgrade('annual')}>
          <div className="flex flex-col gap-1">
            <span className="font-medium">Premium (Annual)</span>
            <span className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              3 Day Free Trial, then was
              <DiagonalStrikePrice amount={PREMIUM_PRICING.annualOriginal} className="font-semibold text-slate-400" />
              Annual <span className="font-semibold text-slate-900">£{PREMIUM_PRICING.annualPerMonth}/month</span>
            </span>
            <span className="text-xs font-semibold text-red-600">Limited time offer just for you.</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpgrade('monthly')}>
          <div className="flex flex-col">
            <span className="font-medium">Premium (Monthly)</span>
            <span className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              3 Day Free Trial, then
              <DiagonalStrikePrice className="font-semibold text-slate-400" />
              <span className="font-semibold text-slate-900">£{PREMIUM_PRICING.monthly}/month</span>
              <span className="text-red-600">limited time offer</span>
            </span>
          </div>
        </DropdownMenuItem>
        {ULTRA_PLAN_ENABLED && (
          <>
            <DropdownMenuItem onClick={() => handleUpgrade('ultra_annual')}>
              <div className="flex flex-col">
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700">Ultra (Annual) - Save £{ULTRA_PRICING.annualSavings}</span>
                <span className="text-sm font-medium text-amber-700/80">The ultimate mastery timeline</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpgrade('ultra')}>
              <div className="flex flex-col">
                <span className="font-medium text-indigo-600">Ultra (Monthly)</span>
                <span className="text-sm text-muted-foreground">Elite preparation, £{ULTRA_PRICING.monthly}/mo</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
