import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMembership } from '@/hooks/useMembership';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { startPremiumCheckout } from "@/lib/checkout";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

export function PremiumUpgradeCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const { tier, isPremium, isFounder } = useMembership();
  const sprintCopy = getSprintUpgradeCopy();

  // Don't show upgrade card if user is already premium
  if (isPremium || tier === 'premium' || isFounder) {
    return null;
  }

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      await startPremiumCheckout(selectedPlan);
    } catch (error) {
      console.error('Error creating checkout:', error);
      const message = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="card-hero border-0 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-premium opacity-90"></div>
      <div className="relative z-10">
        <CardHeader className="pb-3 lg:pb-4">
          <CardTitle className="flex flex-col gap-3 text-foreground">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl shrink-0">
                <Crown className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-2">
                  <span className="text-responsive-lg font-bold whitespace-pre-line leading-snug">{sprintCopy.bannerTitle}</span>
                  <Badge variant="secondary" className="bg-white/20 text-foreground border-white/30 w-fit text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
	        <CardContent className="space-y-4">
	          <div className="space-y-3">
            <div className="flex items-start gap-3 text-foreground">
              <Check className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
              <span className="text-responsive-sm">
                {AI_FEATURE_ENABLED ? 'Unlimited AI Study Questions' : 'Unlimited Study Questions'}
              </span>
            </div>
            <div className="flex items-start gap-3 text-foreground">
              <Check className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
              <span className="text-responsive-sm">Full Mock Exams (20, 30, 50 questions)</span>
            </div>
            <div className="flex items-start gap-3 text-foreground">
              <Check className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
              <span className="text-responsive-sm">Advanced Study Planner Features</span>
            </div>
	            <div className="flex items-start gap-3 text-foreground">
	              <Check className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
	              <span className="text-responsive-sm">Priority Support</span>
	            </div>
	            <p className="text-xs text-foreground/80">
	              GCSE Premium unlocks GCSE content only. 11+ Premium unlocks 11+ content only.
	            </p>
	          </div>

          <div className="pt-2">
            <Tabs value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as 'monthly' | 'annual')} className="w-full mb-4">
              <TabsList className="grid w-full grid-cols-2 bg-white/20">
                <TabsTrigger value="monthly" className="text-foreground data-[state=active]:bg-white data-[state=active]:text-primary">
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="annual" className="text-foreground data-[state=active]:bg-white data-[state=active]:text-primary">
                  Annual
                  <Badge variant="secondary" className="ml-2 bg-green-500/20 text-foreground border-0 text-xs">
                    Save 37%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-responsive-xl font-bold text-foreground">
                {selectedPlan === 'monthly' ? '£19.99' : '£149.99'}
              </span>
              <span className="text-muted-foreground text-responsive-sm">
                /{selectedPlan === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-white text-primary hover:bg-white/90 font-semibold min-h-[44px] text-responsive-sm"
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
