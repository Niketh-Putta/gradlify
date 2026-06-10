import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Infinity, Loader2, Scan, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { startProteinCheckout } from "@/lib/protein/checkout";
import { toast } from "sonner";
import { FREE_DAILY_SCANS } from "@/hooks/useProteinTracker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scansUsedToday?: number;
};

export function ProteinPaywall({ open, onOpenChange, scansUsedToday = FREE_DAILY_SCANS }: Props) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await startProteinCheckout();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout failed";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-none p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-6 py-8 text-white">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Crown className="h-8 w-8" />
            </div>
            <DialogHeader className="space-y-2 text-center text-white">
              <DialogTitle className="text-2xl font-black">Unlock unlimited scans</DialogTitle>
              <DialogDescription className="text-emerald-50">
                You&apos;ve used {scansUsedToday}/{FREE_DAILY_SCANS} free scans today.
              </DialogDescription>
            </DialogHeader>
          </motion.div>
        </div>

        <div className="space-y-4 p-6">
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-3">
              <Scan className="h-4 w-4 text-emerald-500 shrink-0" />
              Unlimited AI food scans
            </li>
            <li className="flex items-center gap-3">
              <Infinity className="h-4 w-4 text-teal-500 shrink-0" />
              Full Gradlify Premium — mocks, notes &amp; analytics
            </li>
            <li className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-cyan-500 shrink-0" />
              Priority protein AI accuracy updates
            </li>
          </ul>

          <Button
            onClick={() => void handleCheckout()}
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold uppercase tracking-wider hover:from-emerald-600 hover:to-teal-700"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Upgrade with Checkout"}
          </Button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
