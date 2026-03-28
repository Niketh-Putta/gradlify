import { useState } from "react";
import { PremiumPaywall } from "@/components/PremiumPaywall";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FREE_CHALLENGE_LIMIT } from "@/lib/limits";

interface ChallengeLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComeBack?: () => void;
}

const freeFeatures = [
  `${FREE_CHALLENGE_LIMIT} challenge questions per day`,
  "Timed challenge conditions",
  "Limit resets at midnight",
];

const premiumFeatures = [
  "Unlimited challenge questions",
  "Priority access to new challenge material",
  "Deep readiness analytics",
];

export function ChallengeLimitModal({
  open,
  onOpenChange,
  onComeBack,
}: ChallengeLimitModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  return (
    <PremiumPaywall
      open={open}
      onOpenChange={onOpenChange}
      title="Daily Challenge limit reached"
      description="You’ve reached today’s Challenge limit. Premium removes this limit so you can keep competing and improving."
      freeFeatures={freeFeatures}
      premiumFeatures={premiumFeatures}
      secondaryLabel="Come back tomorrow"
      onComeBack={onComeBack}
      primaryLabel={`Start Your 3 Day Free Trial (${selectedPlan === 'monthly' ? 'Monthly' : 'Annual'})`}
      upgradePlan={selectedPlan}
      // Plan selector UI
      children={
        <div className="w-full flex flex-col items-center mb-4">
          <Tabs value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as 'monthly' | 'annual')} className="w-full mb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
    />
  );
}
