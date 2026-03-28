import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

interface HistoryEntry {
  id: number;
  topic: string;
  readiness_before: number;
  readiness_after: number;
  change: number;
  reason: string;
  created_at: string;
}

interface HistoryTimelineProps {
  history: HistoryEntry[];
}

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  const getReasonBadge = (reason: string) => {
    const aiLabel = AI_FEATURE_ENABLED ? 'AI' : 'Auto';
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      'ai_inference': { label: aiLabel, variant: 'default' },
      'practice': { label: 'Practice', variant: 'secondary' },
      'mock': { label: 'Mock', variant: 'outline' },
      'manual:update': { label: 'Manual', variant: 'outline' },
      'auto:update': { label: 'Auto', variant: 'secondary' },
    };
    return variants[reason] || { label: reason, variant: 'outline' };
  };

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-base sm:text-lg md:text-xl">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        {history.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
            No activity yet
          </p>
        ) : (
          <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {history.map((entry) => {
                const reasonInfo = getReasonBadge(entry.reason);
                // Calculate actual change from before/after values
                const actualChange = entry.readiness_after - entry.readiness_before;
                const isPositive = actualChange > 0;
                
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className={`mt-0.5 sm:mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-semibold">{entry.topic}</span>
                        <Badge variant={reasonInfo.variant} className="text-xs">
                          {reasonInfo.label}
                        </Badge>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {Math.round(entry.readiness_before)}% → {Math.round(entry.readiness_after)}%
                        <span className={`ml-1 sm:ml-2 font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          ({isPositive ? '+' : ''}{Math.round(actualChange)}%)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
