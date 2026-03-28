import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

interface RAGBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function RAGBadge({ score, size = 'md', showTooltip = false, className }: RAGBadgeProps) {
  const getRAGConfig = (score: number) => {
    if (score >= 70) return { 
      className: "rag-strong", 
      text: "Strong",
      description: "70-100%: Strong understanding and readiness"
    };
    if (score >= 40) return { 
      className: "rag-developing", 
      text: "Developing",
      description: "40-69%: Good progress, keep practicing"
    };
    return { 
      className: "rag-needs-work", 
      text: "Needs Work",
      description: AI_FEATURE_ENABLED
        ? "0-39%: Focus needed, use AI Chat for help"
        : "0-39%: Focus needed, practice these topics"
    };
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'pill-centered text-xs px-2 py-0.5 min-h-[28px] max-w-[120px]';
      case 'lg':
        return 'pill-centered text-base px-4 py-2 min-h-[40px] max-w-[180px] pill-mobile-friendly';
      default:
        return 'pill-centered';
    }
  };

  const ragConfig = getRAGConfig(score);
  
  const badge = (
    <div className={cn(
      getSizeClasses(size),
      ragConfig.className,
      className
    )}>
      {ragConfig.text}
    </div>
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {badge}
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{ragConfig.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
