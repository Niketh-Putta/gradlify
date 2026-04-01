import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, BookOpen, Target, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface PracticeConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  topicName: string;
  subject: "maths" | "english";
  mode: "weakness" | "general";
}

export function PracticeConfirmationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  topicName,
  subject,
  mode,
}: PracticeConfirmationModalProps) {
  const isEnglish = subject === "english";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className={cn(
          "relative overflow-hidden rounded-[28px] border p-8 shadow-2xl transition-all duration-500",
          isEnglish 
            ? "bg-[#FFFDF8] dark:bg-[#0A0906] border-amber-500/20" 
            : "bg-[#F8FAFF] dark:bg-[#06080A] border-blue-500/20"
        )}>
          {/* Ambient Glows */}
          <div className={cn(
            "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20",
            isEnglish ? "bg-amber-500" : "bg-primary"
          )} />
          <div className={cn(
            "absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-10",
            isEnglish ? "bg-amber-400" : "bg-blue-400"
          )} />

          <div className="relative z-10">
            <DialogHeader className="mb-8">
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em]",
                    isEnglish ? "text-amber-600/60 dark:text-amber-500/50" : "text-primary/60"
                  )}>
                    Practice Initiation
                  </span>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                    Confirm Session
                  </DialogTitle>
                </div>
            </DialogHeader>

            <div className="space-y-6 mb-8">
              <div className={cn(
                "p-5 rounded-2xl border transition-all duration-300",
                isEnglish 
                  ? "bg-amber-500/[0.03] border-amber-500/10 dark:bg-amber-500/[0.02]" 
                  : "bg-primary/[0.03] border-primary/10 dark:bg-primary/[0.02]"
              )}>
                <p className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
                   <Sparkles className={cn("w-3.5 h-3.5", isEnglish ? "text-amber-500" : "text-primary")} />
                   Focus Topic
                </p>
                <h4 className="text-xl font-bold text-foreground tracking-tight">
                  {topicName || "General Focus"}
                </h4>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Personalized questions adjusted to your <span className="text-foreground font-medium">real-time skill level</span>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Build exam confidence through <span className="text-foreground font-medium">deliberate practice</span> cycles.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-1/3 rounded-xl hover:bg-muted font-medium text-muted-foreground h-12"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full sm:flex-1 h-12 text-sm font-bold rounded-xl shadow-xl transition-all duration-300 relative overflow-hidden group/btn border-0",
                  "hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                  isEnglish 
                    ? "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-amber-500/25" 
                    : "bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/25"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover/btn:animate-shine" />
                <div className="flex items-center justify-center relative z-10 font-serif italic text-[16px] tracking-wide">
                  Begin Session
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </div>
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
