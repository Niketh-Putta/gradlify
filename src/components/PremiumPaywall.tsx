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
      <DialogContent className="w-[96vw] max-w-3xl mx-auto px-4 py-6 sm:px-8 sm:py-8 rounded-3xl border-border/50 bg-background/95 backdrop-blur-3xl shadow-2xl overflow-hidden" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
        
        {/* Ambient Glow */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-purple-500/10 via-amber-500/5 to-transparent pointer-events-none" />

        <DialogHeader className="relative text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-purple-500/20 ring-1 ring-purple-500/30">
            <LockIcon className="w-7 h-7 text-white" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {title}
          </DialogTitle>
          <p className="text-sm sm:text-[15px] mt-2 text-muted-foreground max-w-[85%] mx-auto font-medium leading-relaxed">
            {description}
          </p>
        </DialogHeader>

        {children}

        {/* Billing Toggle */}
        <div className="flex justify-center mt-6">
          <div className="relative flex p-1 bg-muted/60 hover:bg-muted/80 transition-colors rounded-full ring-1 ring-border/50">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "relative z-10 px-6 py-2 text-sm font-bold rounded-full transition-all duration-300",
                billingCycle === 'monthly' ? "text-foreground shadow-sm bg-background ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Pay Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn(
                "relative z-10 px-8 py-2 text-sm font-bold rounded-full transition-all duration-300 flex items-center gap-2",
                billingCycle === 'annual' ? "text-foreground shadow-sm bg-background ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Pay Annually
              <span className={cn("px-2 py-0.5 text-[10px] uppercase font-black rounded-full shadow-sm tracking-wider", billingCycle === 'annual' ? "bg-emerald-500/10 text-emerald-600" : "bg-emerald-500/10 text-emerald-600 bg-opacity-50")}>Save 40%</span>
            </button>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 relative z-10">
          
          {/* Premium Tier */}
          <button
            onClick={() => setSelectedTier('premium')}
            className={cn(
              "text-left rounded-3xl p-6 transition-all duration-300 border-2 relative overflow-hidden group outline-none",
              selectedTier === 'premium' 
                ? "border-purple-500 bg-purple-500/5 shadow-[0_0_30px_rgba(168,85,247,0.15)] scale-[1.02]" 
                : "border-border/60 bg-muted/30 hover:border-purple-500/40 hover:bg-muted/50"
            )}
          >
            {selectedTier === 'premium' && <div className="absolute top-4 right-4"><CheckCircle className="w-6 h-6 text-purple-500" /></div>}
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-xl transition-colors", selectedTier === 'premium' ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25" : "bg-muted-foreground/10 text-muted-foreground")}>
                <Crown className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Premium</h3>
            </div>
            <div className="mb-6 mt-4">
              <span className="text-4xl font-black">${billingCycle === 'monthly' ? '29' : '17'}</span>
              <span className="text-sm font-bold text-muted-foreground">/mo</span>
              {billingCycle === 'annual' && <div className="text-[11px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">Billed $204 yearly</div>}
            </div>
            <ul className="space-y-3.5 mt-6">
              {[
                "Full Practice Bank Access",
                "Infinite Mock Exam Generator",
                "Advanced AI Pedagogy Engine",
                "Standard 11+ Study Notes"
              ].map(feat => (
                <li key={feat} className="flex items-start gap-3">
                  <Check className={cn("w-4 h-4 mt-0.5 shrink-0", selectedTier === 'premium' ? "text-purple-500" : "text-muted-foreground/70")} />
                  <span className={cn("text-sm font-medium leading-tight", selectedTier === 'premium' ? "text-foreground" : "text-muted-foreground")}>{feat}</span>
                </li>
              ))}
            </ul>
          </button>

          {/* Ultra Tier */}
          <button
            onClick={() => setSelectedTier('ultra')}
            className={cn(
              "text-left rounded-3xl p-6 transition-all duration-300 border-2 relative overflow-hidden group outline-none",
              selectedTier === 'ultra' 
                ? "border-amber-500 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.15)] scale-[1.02]" 
                : "border-border/60 bg-muted/30 hover:border-amber-500/40 hover:bg-muted/50"
            )}
          >
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500/20 to-transparent w-32 h-32 blur-3xl pointer-events-none" />
            {selectedTier === 'ultra' && <div className="absolute top-4 right-4"><CheckCircle className="w-6 h-6 text-amber-500" /></div>}
            
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-xl transition-colors", selectedTier === 'ultra' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25" : "bg-muted-foreground/10 text-muted-foreground")}>
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Ultra Elite</h3>
            </div>
            <div className="mb-6 mt-4 relative">
              <span className="text-4xl font-black">${billingCycle === 'monthly' ? '89' : '49'}</span>
              <span className="text-sm font-bold text-muted-foreground">/mo</span>
              {billingCycle === 'annual' && <div className="text-[11px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">Billed $588 yearly</div>}
            </div>
            <ul className="space-y-3.5 mt-6 relative">
              {[
                "Everything in Premium",
                "Olympiad & Level 3 Engine",
                "Elite Target School Matching",
                "1-on-1 Virtual Tutoring Priority"
              ].map(feat => (
                <li key={feat} className="flex items-start gap-3">
                  <Check className={cn("w-4 h-4 mt-0.5 shrink-0", selectedTier === 'ultra' ? "text-amber-500" : "text-muted-foreground/70")} />
                  <span className={cn("text-sm font-medium leading-tight", selectedTier === 'ultra' ? "text-foreground" : "text-muted-foreground")}>{feat}</span>
                </li>
              ))}
            </ul>
          </button>

        </div>

        <div className="mt-8 sm:mt-10 space-y-3 relative z-10 pt-6 border-t border-border/40">
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className={cn(
              "w-full justify-center text-[15px] font-bold h-14 rounded-2xl shadow-lg transition-all",
              selectedTier === 'ultra' ? "bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-amber-500/20" : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
            )}
          >
            {isUpgrading ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                <span>Securing your plan...</span>
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5 fill-current" />
                <span>Checkout for {selectedTier === 'ultra' ? 'Ultra Elite' : 'Premium'}</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onComeBack?.();
            }}
            className="w-full text-sm font-semibold text-muted-foreground hover:text-foreground h-12 rounded-xl"
          >
            {secondaryLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
