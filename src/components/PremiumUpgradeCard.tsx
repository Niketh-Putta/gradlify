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
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'ultra'>('ultra');
  const { tier, isPremium, isUltra, isFounder } = useMembership();
  const sprintCopy = getSprintUpgradeCopy();

  // Don't show upgrade card if user is already ultra
  if (isUltra || isFounder) {
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
    <Card className={`border-0 overflow-hidden relative transition-all duration-300 ${selectedPlan === 'ultra' ? 'shadow-[0_0_30px_rgba(245,158,11,0.2)]' : ''}`}>
      <div className={`absolute inset-0 transition-opacity duration-300 ${selectedPlan === 'ultra' ? 'bg-gradient-to-br from-[#1a1c29] via-[#241e16] to-[#1a1c29]' : 'bg-gradient-premium'} opacity-95`}></div>
      {selectedPlan === 'ultra' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.15),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.15),transparent_50%)]"></div>
        </>
      )}
      <div className="relative z-10">
        <CardHeader className="pb-3 lg:pb-4">
          <CardTitle className="flex flex-col gap-3 text-foreground">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${selectedPlan === 'ultra' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/20 text-foreground'}`}>
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-2">
                  <span className={`text-responsive-lg font-bold whitespace-pre-line leading-snug ${selectedPlan === 'ultra' ? 'bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200' : ''}`}>
                    {selectedPlan === 'ultra' ? 'Gradlify Ultra' : sprintCopy.bannerTitle}
                  </span>
                  <Badge variant="secondary" className={`${selectedPlan === 'ultra' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/20 text-foreground border-white/30'} w-fit text-xs`}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    {selectedPlan === 'ultra' ? '1-to-1 Live Support' : 'Popular'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
	        <CardContent className="space-y-4">
	          <div className="space-y-3">
            <div className="flex items-start gap-3 text-foreground">
              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${selectedPlan === 'ultra' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-foreground'}`} />
              <span className={`text-responsive-sm ${selectedPlan === 'ultra' ? 'text-amber-50' : ''}`}>
                {AI_FEATURE_ENABLED ? 'Unlimited AI Study Questions' : 'Unlimited Study Questions'}
              </span>
            </div>
            <div className="flex items-start gap-3 text-foreground">
              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${selectedPlan === 'ultra' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-foreground'}`} />
              <span className={`text-responsive-sm ${selectedPlan === 'ultra' ? 'text-amber-50' : ''}`}>Full Mock Exams (20, 30, 50 questions)</span>
            </div>
            <div className="flex items-start gap-3 text-foreground">
              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${selectedPlan === 'ultra' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-foreground'}`} />
              <span className={`text-responsive-sm ${selectedPlan === 'ultra' ? 'text-amber-50' : ''}`}>Advanced Study Planner Features</span>
            </div>
	            <div className="flex items-start gap-3 text-foreground">
	              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${selectedPlan === 'ultra' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-foreground'}`} />
	              <span className={`text-responsive-sm ${selectedPlan === 'ultra' ? 'text-amber-50' : ''}`}>Priority Support</span>
	            </div>
              {selectedPlan === 'ultra' && (
                <div className="flex items-start gap-3 text-foreground bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
	                <Crown className="h-4 w-4 shrink-0 mt-0.5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
	                <span className="text-responsive-sm text-amber-50 font-bold">Weekly Live 1-to-1 Tutoring with Founders</span>
	              </div>
              )}
	            <p className={`text-xs ${selectedPlan === 'ultra' ? 'text-amber-200/60' : 'text-foreground/80'} mt-2`}>
	              GCSE Premium unlocks GCSE content only. 11+ Premium unlocks 11+ content only.
	            </p>
	          </div>

          <div className="pt-2">
            <Tabs value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as 'monthly' | 'annual' | 'ultra')} className="w-full mb-4">
              <TabsList className={`grid w-full grid-cols-3 ${selectedPlan === 'ultra' ? 'bg-amber-900/40 border border-amber-500/20' : 'bg-white/20'}`}>
                <TabsTrigger value="monthly" className={`text-foreground data-[state=active]:bg-white data-[state=active]:text-primary ${selectedPlan === 'ultra' ? 'text-amber-100 hover:text-amber-50 data-[state=active]:bg-transparent data-[state=active]:text-amber-300' : ''}`}>
                  Premium
                </TabsTrigger>
                <TabsTrigger value="annual" className={`text-foreground data-[state=active]:bg-white data-[state=active]:text-primary ${selectedPlan === 'ultra' ? 'text-amber-100 hover:text-amber-50 data-[state=active]:bg-transparent data-[state=active]:text-amber-300' : ''}`}>
                  Annual
                </TabsTrigger>
                <TabsTrigger value="ultra" className={`text-foreground flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-amber-600 data-[state=active]:text-slate-900 font-bold ${selectedPlan !== 'ultra' ? 'hover:text-amber-300 text-amber-200' : ''}`}>
                  ULTRA <Crown className="w-3 h-3" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-responsive-xl font-bold ${selectedPlan === 'ultra' ? 'text-white' : 'text-foreground'}`}>
                {selectedPlan === 'monthly' ? '£19.99' : selectedPlan === 'annual' ? '£149.99' : '£99.99'}
              </span>
              <span className={`text-responsive-sm ${selectedPlan === 'ultra' ? 'text-amber-200/60' : 'text-muted-foreground'}`}>
                /{selectedPlan === 'annual' ? 'year' : 'month'}
              </span>
            </div>
            
            {(isPremium && selectedPlan !== 'ultra') ? (
              <Button disabled className="w-full bg-white/50 text-foreground font-semibold min-h-[44px] text-responsive-sm" size="lg">
                <Check className="h-4 w-4 mr-2" />
                Already Active
              </Button>
            ) : (
              <Button
                onClick={handleUpgrade}
                disabled={isLoading}
                className={`w-full font-semibold min-h-[44px] text-responsive-sm ${selectedPlan === 'ultra' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-white text-primary hover:bg-white/90'}`}
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
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
