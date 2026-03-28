import { CheckCircle, Loader2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSavedAt?: Date | null;
  error?: string;
  className?: string;
}

export function SyncStatusIndicator({ 
  status, 
  lastSavedAt, 
  error, 
  className 
}: SyncStatusIndicatorProps) {
  const content = (() => {
    switch (status) {
      case 'syncing':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Syncing...',
          className: 'text-muted-foreground sync-pulse'
        };
      case 'saved':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Saved',
          className: 'text-green-600'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Error',
          className: 'text-destructive'
        };
      case 'idle':
      default:
        if (lastSavedAt) {
          return {
            icon: <Clock className="h-3 w-3" />,
            text: `Last saved at ${lastSavedAt.toLocaleTimeString()}`,
            className: 'text-muted-foreground'
          };
        }
        return null;
    }
  })();

  if (!content) return null;

  const indicator = (
    <div className={cn("flex items-center gap-1 text-xs", content.className, className)}>
      {content.icon}
      <span className="btn-text-nowrap max-w-[120px]">{content.text}</span>
    </div>
  );

  if (status === 'error' && error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p>{error}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (status === 'idle' && lastSavedAt) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p>Progress automatically saved</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return indicator;
}