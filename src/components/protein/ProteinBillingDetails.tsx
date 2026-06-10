import { useState } from "react";
import {
  CreditCard,
  Crown,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMembership } from "@/hooks/useMembership";
import { FREE_DAILY_SCANS } from "@/hooks/useProteinTracker";
import { openBillingPortal } from "@/lib/billingPortal";
import { startProteinCheckout } from "@/lib/protein/checkout";
import { PROTEIN_PREMIUM_PRICE_GBP } from "@/lib/protein/types";
import { formatGbp } from "@/lib/pricing";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  hasPremiumAccess: boolean;
  isFounderEmail: boolean;
  scansUsedToday: number;
  compact?: boolean;
  className?: string;
};

function formatRenewalDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Not subscribed";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProteinBillingDetails({
  hasPremiumAccess,
  isFounderEmail,
  scansUsedToday,
  compact = false,
  className,
}: Props) {
  const { data: membership, loading: membershipLoading } = useMembership();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentPlanLabel = isFounderEmail
    ? "Founder"
    : hasPremiumAccess
      ? "Protein Premium"
      : "Free";

  const renewalDate = formatRenewalDate(membership?.current_period_end);
  const subscriptionStatus = isFounderEmail
    ? "Complimentary"
    : hasPremiumAccess
      ? formatStatus(membership?.subscription_status)
      : "Free tier";

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      await startProteinCheckout();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout failed";
      toast.error(message);
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const result = await openBillingPortal(`${window.location.origin}/protein`);
      if (!result.ok) {
        toast.error(result.error ?? "Could not open billing portal.");
        setPortalLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open billing portal.";
      toast.error(message);
      setPortalLoading(false);
    }
  };

  const detailRows = [
    {
      label: "Plan",
      value: currentPlanLabel,
      icon: Crown,
    },
    {
      label: "Price",
      value: isFounderEmail
        ? "Complimentary access"
        : hasPremiumAccess
          ? `${formatGbp(PROTEIN_PREMIUM_PRICE_GBP, { decimals: 2 })}/month`
          : "£0.00",
      icon: Receipt,
    },
    {
      label: "Status",
      value: membershipLoading ? "Loading..." : subscriptionStatus,
      icon: ShieldCheck,
    },
    {
      label: "Daily scans",
      value: hasPremiumAccess
        ? "Unlimited"
        : `${scansUsedToday} of ${FREE_DAILY_SCANS} used today`,
      icon: Sparkles,
    },
    ...(renewalDate && hasPremiumAccess && !isFounderEmail
      ? [
          {
            label: membership?.cancel_at_period_end ? "Access until" : "Next billing date",
            value: renewalDate,
            icon: CreditCard,
          },
        ]
      : []),
    {
      label: "Payments",
      value: isFounderEmail ? "Founder account" : "Processed securely by Stripe",
      icon: CreditCard,
    },
  ];

  return (
    <section
      className={cn(
        "rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900/40",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Payment details
          </p>
          {!compact && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Your Protein Lens subscription and billing information.
            </p>
          )}
        </div>
        <Badge
          variant={hasPremiumAccess ? "default" : "secondary"}
          className={cn(
            hasPremiumAccess
              ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              : "",
          )}
        >
          {hasPremiumAccess ? "Active" : "Free"}
        </Badge>
      </div>

      <dl className="space-y-3">
        {detailRows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <row.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {row.label}
            </dt>
            <dd className="text-right text-sm font-semibold text-slate-900 dark:text-white">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {membership?.cancel_at_period_end && hasPremiumAccess && !isFounderEmail && (
        <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
          Your subscription will not renew. You keep access until {renewalDate ?? "the end of this period"}.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {hasPremiumAccess && !isFounderEmail ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-emerald-200 dark:border-emerald-900/50"
            disabled={portalLoading || membershipLoading}
            onClick={() => void handleManageBilling()}
          >
            {portalLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {portalLoading ? "Opening billing portal..." : "Manage billing in Stripe"}
          </Button>
        ) : !hasPremiumAccess ? (
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold uppercase tracking-wider hover:from-emerald-600 hover:to-teal-700"
            disabled={checkoutLoading || membershipLoading}
            onClick={() => void handleUpgrade()}
          >
            {checkoutLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Protein Premium
              </>
            )}
          </Button>
        ) : (
          <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Founder access includes unlimited scans with no billing required.
          </p>
        )}
      </div>
    </section>
  );
}
