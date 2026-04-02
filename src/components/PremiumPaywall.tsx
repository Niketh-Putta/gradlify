import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Check, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { startPremiumCheckout } from "@/lib/checkout";
import { useMembership } from "@/hooks/useMembership";
import { cn } from "@/lib/utils";

interface PaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  freeFeatures?: string[];
  premiumFeatures?: string[];
  secondaryLabel?: string;
  onComeBack?: () => void;
  primaryLabel?: string;
  children?: React.ReactNode;
}

export function PremiumPaywall({
  open,
  onOpenChange,
  title,
  description,
  secondaryLabel = "Maybe later",
  onComeBack,
  primaryLabel = "Continue to Checkout",
  children,
}: PaywallProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { isFounder, isPremium } = useMembership();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedTier, setSelectedTier] = useState<'premium' | 'ultra'>('premium');

  useEffect(() => {
    if (isFounder && open) {
      onOpenChange(false);
    }
  }, [isFounder, onOpenChange, open]);

  if (isFounder || isPremium) {
    return null;
  }

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    let planId: 'monthly' | 'annual' | 'ultra' | 'ultra_annual' = 'monthly';
    
    if (selectedTier === 'premium') {
      planId = billingCycle === 'monthly' ? 'monthly' : 'annual';
    } else {
      planId = billingCycle === 'monthly' ? 'ultra' : 'ultra_annual';
    }

    try {
      await startPremiumCheckout(planId);
    } catch (error) {
      console.error("Failed to start checkout:", error);
      const message = error instanceof Error ? error.message : "Failed to start checkout. Please try again.";
      toast.error(message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl mx-auto p-0 rounded-[2rem] border-none bg-background dark:bg-slate-900 shadow-2xl overflow-y-auto max-h-[90dvh] md:max-h-[85vh]" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
        
        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          <DialogHeader className="text-center space-y-2 mb-6 sm:mb-8">
            <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 max-w-[85%] mx-auto font-medium lowercase italic tracking-tight">
              {description}
            </p>
          </DialogHeader>

          {/* Billing Switcher (Extremely Concise) */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="inline-flex p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all",
                  billingCycle === 'monthly' ? "text-slate-900 bg-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={cn(
                  "px-4 sm:px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all flex items-center gap-1.5 sm:gap-2",
                  billingCycle === 'annual' ? "text-slate-900 bg-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Annual
                <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black">SAVE 35%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Premium Plan (Blue) */}
            <button
              onClick={() => setSelectedTier('premium')}
              className={cn(
                "group text-left rounded-3xl p-5 sm:p-6 md:p-8 transition-all duration-300 relative border-2",
                selectedTier === 'premium' ? "bg-white border-primary shadow-xl shadow-blue-500/5" : "bg-white border-slate-100 hover:border-blue-200"
              )}
            >
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Gradlify Premium</h3>
                  <p className="text-[9px] md:text-[10px] font-bold text-blue-500/60 uppercase tracking-[0.15em] mt-1">FOUNDATIONAL MASTERY</p>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      £{billingCycle === 'monthly' ? '19.99' : '12.50'}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-300 tracking-tight shrink-0">/mo</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Billed as £149.99 annually</p>
                  )}
                </div>
                <div className="h-px w-full bg-slate-50 dark:bg-slate-800" />
                <ul className="space-y-3">
                  {[
                    "Full Practice Bank Access", 
                    "Infinite Mock Exam Generator", 
                    "Advanced AI Pedagogy Engine", 
                    "Standard 11+ Study Notes"
                  ].map(feat => (
                    <li key={feat} className="flex items-start md:items-center gap-2 md:gap-3">
                      <Check className="w-3.5 h-3.5 text-blue-500 stroke-[3px] shrink-0 mt-0.5 md:mt-0" />
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-500 leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>

            {/* Ultra Plan (Amber) */}
            <button
              onClick={() => setSelectedTier('ultra')}
              className={cn(
                "group text-left rounded-3xl p-5 sm:p-6 md:p-8 transition-all duration-300 relative border-2",
                selectedTier === 'ultra' ? "bg-white border-amber-500 shadow-xl shadow-amber-500/5" : "bg-white border-slate-100 hover:border-amber-200"
              )}
            >
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Gradlify Ultra</h3>
                  <p className="text-[9px] md:text-[10px] font-bold text-amber-500/60 uppercase tracking-[0.15em] mt-1">ULTIMATE PREPARATION</p>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      £{billingCycle === 'monthly' ? '99.99' : '83.33'}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-300 tracking-tight shrink-0">/mo</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Billed as £999.99 annually</p>
                  )}
                </div>
                <div className="h-px w-full bg-slate-50 dark:bg-slate-800" />
                <ul className="space-y-3">
                  {[
                    "Everything in Premium", 
                    "1 to 1 weekly sessions with tutor team & founders", 
                    "Handwritten mocks from tutor team specialised for your child"
                  ].map(feat => (
                    <li key={feat} className="flex items-start md:items-center gap-2 md:gap-3">
                      <Check className="w-3.5 h-3.5 text-amber-500 stroke-[3px] shrink-0 mt-0.5 md:mt-0" />
                      <span className="text-[10px] md:text-[11px] font-black text-slate-700 leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          </div>

          <div className="mt-8 sm:mt-10 flex flex-col items-center space-y-4 sm:space-y-5">
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full max-w-sm h-12 md:h-14 rounded-2xl text-[12px] md:text-[14px] font-black uppercase tracking-[0.2em] bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] border-none"
            >
              {isUpgrading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Checkout for {selectedTier === 'ultra' ? 'Ultra Plan' : 'Premium Plan'} <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                </>
              )}
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-500 transition-colors pb-2"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Minimal missing icons
function X(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  );
}

// Simple fallback icon definitions to prevent breaking issues if lucide is missing specific exports
function LockIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
