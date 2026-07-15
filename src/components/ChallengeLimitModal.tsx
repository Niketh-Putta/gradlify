import { PremiumPaywall } from "@/components/PremiumPaywall";
import { FREE_CHALLENGE_LIMIT } from "@/lib/limits";
import { LIFETIME_PROMO } from "@/lib/pricing";

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
  "Detailed mock analytics",
];

export function ChallengeLimitModal({
  open,
  onOpenChange,
  onComeBack,
}: ChallengeLimitModalProps) {
  return (
    <PremiumPaywall
      open={open}
      onOpenChange={onOpenChange}
      title="Daily Challenge limit reached"
      description={`You’ve reached today’s Challenge limit. Lifetime Premium (£${LIFETIME_PROMO.amountOffGbp} off with ${LIFETIME_PROMO.code}) removes this limit so you can keep competing and improving.`}
      freeFeatures={freeFeatures}
      premiumFeatures={premiumFeatures}
      secondaryLabel="Come back tomorrow"
      onComeBack={onComeBack}
      primaryLabel="Unlock Lifetime Premium"
    />
  );
}
