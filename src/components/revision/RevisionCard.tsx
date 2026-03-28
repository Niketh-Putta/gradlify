import { cn } from "@/lib/utils";
import { BookOpen, Lightbulb, AlertTriangle, Target, CheckCircle2, FileText } from "lucide-react";
import { ReactNode } from "react";

interface RevisionCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: "info" | "example" | "tips" | "mistakes" | "summary" | "exam";
}

const variantConfig = {
  info: {
    accent: "border-l-blue-500",
    bg: "bg-blue-900/10 dark:bg-blue-900/10",
    icon: BookOpen,
  },
  example: {
    accent: "border-l-indigo-500",
    bg: "bg-indigo-900/10 dark:bg-indigo-900/10",
    icon: Target,
  },
  tips: {
    accent: "border-l-sky-500",
    bg: "bg-sky-900/10 dark:bg-sky-900/10",
    icon: Lightbulb,
  },
  mistakes: {
    accent: "border-l-red-500",
    bg: "bg-red-900/10 dark:bg-red-900/10",
    icon: AlertTriangle,
  },
  summary: {
    accent: "border-l-emerald-500",
    bg: "bg-emerald-900/10 dark:bg-emerald-900/10",
    icon: CheckCircle2,
  },
  exam: {
    accent: "border-l-amber-500",
    bg: "bg-amber-900/10 dark:bg-amber-900/10",
    icon: FileText,
  },
};

export function RevisionCard({ children, className, title, variant = "info" }: RevisionCardProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-900/50",
        "shadow-sm",
        "p-5 md:p-6",
        "border-l-4",
        config.accent,
        config.bg,
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-5 h-5" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        </div>
      )}
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1">
        {children}
      </div>
    </div>
  );
}
