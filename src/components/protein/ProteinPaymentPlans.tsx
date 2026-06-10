import { useState } from "react";
import { Crown, Infinity, Loader2, Scan, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProteinBillingDetails } from "@/components/protein/ProteinBillingDetails";
import { startProteinCheckout } from "@/lib/protein/checkout";
import { PROTEIN_PREMIUM_PRICE_GBP } from "@/lib/protein/types";
import { FREE_DAILY_SCANS } from "@/hooks/useProteinTracker";
import { formatGbp } from "@/lib/pricing";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  hasPremiumAccess: boolean;
  isFounderEmail: boolean;
  userEmail?: string | null;
  scansUsedToday: number;
  className?: string;
};

export function ProteinPaymentPlans({
  hasPremiumAccess,
  isFounderEmail,
  userEmail,
  scansUsedToday,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await startProteinCheckout();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout failed";
      toast.error(message);
      setLoading(false);
    }
  };

  const currentPlanLabel = isFounderEmail
    ? "Founder"
    : hasPremiumAccess
      ? "Protein Premium"
      : "Free";

  return (
    <div className={cn("space-y-4", className)}>
      <ProteinBillingDetails
        compact
        hasPremiumAccess={hasPremiumAccess}
        isFounderEmail={isFounderEmail}
        userEmail={userEmail}
        scansUsedToday={scansUsedToday}
      />

      <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current plan</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{currentPlanLabel}</p>
        </div>
        <Badge
          variant={hasPremiumAccess ? "default" : "secondary"}
          className={cn(
            hasPremiumAccess
              ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              : "",
          )}
        >
          {hasPremiumAccess ? "Active" : `${scansUsedToday}/${FREE_DAILY_SCANS} scans today`}
        </Badge>
      </div>

      <div className="grid gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scan className="h-4 w-4 text-slate-500" />
              Free
            </CardTitle>
            <CardDescription>{FREE_DAILY_SCANS} AI food scans per day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              Protein ring and daily meal log
            </p>
            <p className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-500" />
              Streaks, XP, and badges
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "rounded-2xl border-2",
            hasPremiumAccess
              ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10"
              : "border-emerald-200 dark:border-emerald-900/50",
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-emerald-600" />
              Protein Premium
              {!hasPremiumAccess && (
                <Badge className="ml-auto bg-emerald-500 text-[10px] uppercase">Recommended</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {formatGbp(PROTEIN_PREMIUM_PRICE_GBP, { decimals: 2 })}/month, cancel anytime
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Infinity className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Unlimited AI food scans
              </li>
              <li className="flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                Full Gradlify Premium mocks and analytics
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                Priority protein AI updates
              </li>
            </ul>

            {hasPremiumAccess ? (
              <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                You already have unlimited scans on this account.
              </p>
            ) : (
              <Button
                onClick={() => void handleUpgrade()}
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold uppercase tracking-wider hover:from-emerald-600 hover:to-teal-700"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Upgrade now"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
