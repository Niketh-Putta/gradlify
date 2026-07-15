import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { openBillingPortal } from "@/lib/billingPortal";
import { toast } from "sonner";

type PaymentFailedGateProps = {
  user: User;
  onSignOut: () => void | Promise<void>;
};

export function PaymentFailedGate({ user, onSignOut }: PaymentFailedGateProps) {
  const [openingPortal, setOpeningPortal] = useState(false);

  const handleUpdatePayment = async () => {
    setOpeningPortal(true);
    try {
      const returnUrl = `${window.location.origin}/pay/success`;
      const result = await openBillingPortal(returnUrl);
      if (!result.ok) {
        toast.error("Couldn't open billing portal. Please try again.");
        setOpeningPortal(false);
      }
    } catch {
      toast.error("Couldn't open billing portal. Please try again.");
      setOpeningPortal(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border-border/80">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <CreditCard className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Your payment did not go through</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            We couldn&apos;t renew your subscription. Update your payment method in
            Stripe to restore access to Gradlify.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {user.email ? (
            <p className="text-center text-xs text-muted-foreground">
              Signed in as {user.email}
            </p>
          ) : null}
          <Button
            className="w-full h-11"
            onClick={() => void handleUpdatePayment()}
            disabled={openingPortal}
          >
            {openingPortal ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening Stripe…
              </>
            ) : (
              "Update payment in Stripe"
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void onSignOut()}
            disabled={openingPortal}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
