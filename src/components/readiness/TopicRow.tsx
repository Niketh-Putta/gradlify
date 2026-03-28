import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

interface TopicRowProps {
  topic: string;
  readiness: number;
  lastChange?: {
    delta: number;
    reason: string;
    created_at: string;
    readiness_before: number;
    readiness_after: number;
  };
  onClick: () => void;
}

const getReasonBadgeVariant = (reason: string): "default" | "secondary" | "destructive" | "outline" => {
  const lower = reason.toLowerCase();
  if (lower.includes('mock')) return 'default';
  if (lower.includes('practice')) return 'secondary';
  if (lower.includes('ai')) return AI_FEATURE_ENABLED ? 'outline' : 'secondary';
  return 'secondary';
};

const getReasonLabel = (reason: string): string => {
  const lower = reason.toLowerCase();
  if (lower.includes('mock')) return 'Mock';
  if (lower.includes('practice')) return 'Practice';
  if (lower.includes('ai')) return AI_FEATURE_ENABLED ? 'AI' : 'Auto';
  if (lower.includes('manual')) return 'Manual';
  return 'Update';
};

export function TopicRow({ topic, readiness, lastChange, onClick }: TopicRowProps) {
  const getProgressColorClass = (value: number): string => {
    if (value >= 70) return 'bg-green-500 dark:bg-green-600';
    if (value >= 40) return 'bg-amber-500 dark:bg-amber-600';
    return 'bg-red-500 dark:bg-red-600';
  };
  
  return (
    <div
      onClick={onClick}
      className="group p-2 sm:p-3 md:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <h3 className="font-semibold text-xs sm:text-sm">{topic}</h3>
          <span className="text-xs sm:text-sm text-muted-foreground">{readiness.toFixed(1)}%</span>
        </div>
        
        {lastChange && lastChange.delta !== 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <div className={`flex items-center gap-0.5 sm:gap-1 text-xs font-medium ${
                    lastChange.delta > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {lastChange.delta > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{lastChange.delta > 0 ? '+' : ''}{lastChange.delta.toFixed(1)}%</span>
                  </div>
                  <Badge variant={getReasonBadgeVariant(lastChange.reason)} className="text-xs">
                    {getReasonLabel(lastChange.reason)}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {formatDistanceToNow(new Date(lastChange.created_at), { addSuffix: true })}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {lastChange.readiness_before.toFixed(1)}% → {lastChange.readiness_after.toFixed(1)}% via {getReasonLabel(lastChange.reason)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(lastChange.created_at).toLocaleString()}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">No updates yet</span>
        )}
      </div>
      
      <div className="relative h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
        <div 
          className={`h-full transition-all duration-500 ease-out rounded-full ${getProgressColorClass(readiness)}`}
          style={{ width: `${Math.max(0, Math.min(100, readiness))}%` }}
        />
      </div>
    </div>
  );
}
