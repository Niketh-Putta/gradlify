import { useState } from "react";
import { PremiumPaywall } from "@/components/PremiumPaywall";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FREE_PRACTICE_LIMIT } from "@/lib/limits";

interface PracticeLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComeBack?: () => void;
}

const freeFeatures = [
  `${FREE_PRACTICE_LIMIT} practice sessions per day`,
  "Instant feedback after each question",
  "Progress tracking across topics",
];

const premiumFeatures = [
  "Unlimited practice questions",
  "Priority mastery analytics",
  "Track readiness across 11+ and GCSE maths",
];

export function PracticeLimitModal({
  open,
  onOpenChange,
  onComeBack,
}: PracticeLimitModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  return (
    <PremiumPaywall
      open={open}
      onOpenChange={onOpenChange}
      title="Daily practice limit reached"
      description="You’ve reached your free practice limit for today. Premium removes the limit so you can keep building confidence."
      freeFeatures={freeFeatures}
      premiumFeatures={premiumFeatures}
      onComeBack={onComeBack}
      primaryLabel={`Start Your 3 Day Free Trial (${selectedPlan === "monthly" ? "Monthly" : "Annual"})`}
      secondaryLabel="Come back tomorrow"
      upgradePlan={selectedPlan}
      children={
        <div className="w-full flex flex-col items-center mb-4">
          <Tabs
            value={selectedPlan}
            onValueChange={(v) => setSelectedPlan(v as "monthly" | "annual")}
            className="w-full mb-2"
          >
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
