import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { LogOut, Moon, Settings2, Sun, UserRound } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { clearProteinGuestMode } from "@/lib/protein/host";
import { ProteinBillingDetails } from "@/components/protein/ProteinBillingDetails";
import { ProteinPaymentPlans } from "@/components/protein/ProteinPaymentPlans";
import { ProteinWhatsNew } from "@/components/protein/ProteinWhatsNew";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  isGuest?: boolean;
  proteinGoal: number;
  darkMode: boolean;
  hasPremiumAccess: boolean;
  isFounderEmail: boolean;
  scansUsedToday: number;
  onProteinGoalChange: (goal: number) => void;
  onDarkModeChange: (dark: boolean) => void;
  onSignedOut?: () => void;
};

export function ProteinSettings({
  open,
  onOpenChange,
  user,
  isGuest = false,
  proteinGoal,
  darkMode,
  hasPremiumAccess,
  isFounderEmail,
  scansUsedToday,
  onProteinGoalChange,
  onDarkModeChange,
  onSignedOut,
}: Props) {
  const [goalInput, setGoalInput] = useState(String(proteinGoal));
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setGoalInput(String(proteinGoal));
  }, [proteinGoal]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      if (isGuest) {
        clearProteinGuestMode();
        toast.success("Local session cleared");
      } else {
        await supabase.auth.signOut({ scope: "global" });
        toast.success("Signed out");
      }
      onOpenChange(false);
      onSignedOut?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign out failed";
      toast.error(message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-emerald-500" />
            Protein settings
          </SheetTitle>
          <SheetDescription>Manage your account, goals, and subscription.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="plans">Payment &amp; plans</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                  <UserRound className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {isGuest ? "Guest mode" : user?.email ?? "Signed in"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isGuest ? "Data saved on this device only" : "Protein Lens account"}
                  </p>
                </div>
              </div>
            </div>

            <ProteinBillingDetails
              hasPremiumAccess={hasPremiumAccess}
              isFounderEmail={isFounderEmail}
              userEmail={user?.email}
              scansUsedToday={scansUsedToday}
            />

            <div className="space-y-2">
              <Label htmlFor="settings-protein-goal">Daily protein goal (g)</Label>
              <Input
                id="settings-protein-goal"
                type="number"
                min={50}
                max={300}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onBlur={() => onProteinGoalChange(Number(goalInput) || proteinGoal)}
                className="rounded-xl"
              />
            </div>

            <ProteinWhatsNew />

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {darkMode ? (
                  <Moon className="h-4 w-4 text-slate-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
                <Label htmlFor="settings-dark-mode">Dark mode</Label>
              </div>
              <Switch
                id="settings-dark-mode"
                checked={darkMode}
                onCheckedChange={onDarkModeChange}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:hover:bg-red-950/30"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? "Signing out..." : isGuest ? "Clear local session" : "Sign out"}
            </Button>
          </TabsContent>

          <TabsContent value="plans" className="mt-4">
            <ProteinPaymentPlans
              hasPremiumAccess={hasPremiumAccess}
              isFounderEmail={isFounderEmail}
              userEmail={user?.email}
              scansUsedToday={scansUsedToday}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
