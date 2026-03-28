import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useMembership } from '@/hooks/useMembership';
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { startPremiumCheckout } from "@/lib/checkout";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
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

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
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
              <span className={variant === 'homeBanner' ? "truncate text-sm font-medium" : "truncate"}>Starting Checkout...</span>
            </>
          ) : (
            <>
              {variant === 'homeBanner' ? (
                <>
                  <Trophy className="h-4 w-4" />
                  <span className="truncate text-sm font-semibold">{label ?? sprintCopy.buttonSecondary}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  <span className="truncate">{label ?? sprintCopy.buttonPrimary}</span>
                </>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => handleUpgrade('monthly')}>
          <div className="flex flex-col">
            <span className="font-medium">Monthly Plan</span>
            <span className="text-sm text-muted-foreground">3 Day Free Trial, then £19.99/month</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpgrade('annual')}>
          <div className="flex flex-col">
            <span className="font-medium">Annual Plan</span>
            <span className="text-sm text-muted-foreground">3 Day Free Trial, then £149.99/year</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
