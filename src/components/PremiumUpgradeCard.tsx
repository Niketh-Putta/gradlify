import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMembership } from '@/hooks/useMembership';
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { startPremiumCheckout } from "@/lib/checkout";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { PREMIUM_PRICING, formatGbp } from "@/lib/pricing";

export function PremiumUpgradeCard() {
  const [isLoading, setIsLoading] = useState(false);
  const { isPremium, isUltra, isFounder } = useMembership();
  const sprintCopy = getSprintUpgradeCopy();

  if (isUltra || isFounder || isPremium) {
    return null;
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

  return (
    <Card className="border-0 overflow-hidden relative transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-premium opacity-95" />
      <div className="relative z-10">
        <CardHeader className="pb-3 lg:pb-4">
          <CardTitle className="flex flex-col gap-3 text-foreground">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shrink-0 bg-white/20 text-foreground">
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-2">
                  <span className="text-responsive-lg font-bold whitespace-pre-line leading-snug">
                    {sprintCopy.bannerTitle}
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-foreground border-white/30 w-fit text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Lifetime · {formatGbp(PREMIUM_PRICING.lifetime)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-foreground">
              <Check className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
              <span className="text-responsive-sm">
                {AI_FEATURE_ENABLED ? 'Unlimited AI Study Questions' : 'Unlimited Study Questions'}
              </span>
            </div>
            <div className="flex items-start gap-3 text-foreground">
              <Check className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
              <span className="text-responsive-sm">Full Mock Exams (20, 30, 50 questions)</span>
            </div>
            <div className="flex items-start gap-3 text-foreground">
              <Check className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
              <span className="text-responsive-sm">Advanced Study Planner Features</span>
            </div>
            <div className="flex items-start gap-3 text-foreground">
              <Check className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
              <span className="text-responsive-sm">Lifetime Premium - pay once, keep access</span>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-responsive-xl font-black tabular-nums text-foreground">
                {formatGbp(PREMIUM_PRICING.lifetime)}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
                lifetime
              </span>
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full font-semibold min-h-[44px] text-responsive-sm bg-white text-primary hover:bg-white/90"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="truncate">Starting Checkout...</span>
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  <span className="truncate">{sprintCopy.buttonTertiary}</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
