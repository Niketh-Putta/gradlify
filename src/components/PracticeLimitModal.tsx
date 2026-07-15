import { PremiumPaywall } from "@/components/PremiumPaywall";
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
  return (
    <PremiumPaywall
      open={open}
      onOpenChange={onOpenChange}
      title="Daily practice limit reached"
      description="You’ve reached your free practice limit for today. Lifetime Premium removes the limit so you can keep building confidence."
      freeFeatures={freeFeatures}
      premiumFeatures={premiumFeatures}
      onComeBack={onComeBack}
      primaryLabel="Unlock Lifetime Premium"
      secondaryLabel="Come back tomorrow"
    />
  );
}
