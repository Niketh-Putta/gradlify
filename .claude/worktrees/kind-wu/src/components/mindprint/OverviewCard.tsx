import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface OverviewCardProps {
  efficiencyScore: number;
  peakHours: string;
  topError: string;
  updatedAt: string;
  lastAnswerCount: number;
  loading: boolean;
  onSuggestedSession: () => void;
  onWeeklyReport: () => void;
}

export function OverviewCard({
  efficiencyScore,
  peakHours,
  topError,
  updatedAt,
  lastAnswerCount,
  loading,
  onSuggestedSession,
  onWeeklyReport,
}: OverviewCardProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-40 rounded-full mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-cyan-500';
    return 'text-orange-500';
  };

  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (efficiencyScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="rounded-2xl bg-gradient-to-br from-background via-background to-muted/20 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Brain className="h-5 w-5 text-violet-500" />
            Mind Efficiency Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Circular Gauge */}
          <div className="flex justify-center">
            <div className="relative w-40 h-40">
              <svg className="transform -rotate-90 w-40 h-40">
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className={getScoreColor(efficiencyScore)}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(efficiencyScore)}`}>
                    {efficiencyScore}
                  </div>
                  <div className="text-xs text-muted-foreground">out of 100</div>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Last {lastAnswerCount} answers
            </Badge>
            <Badge variant="outline" className="gap-1">
              Updated {updatedAt}
            </Badge>
          </div>

          {/* Quick Facts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                Peak hours
              </span>
              <span className="font-medium text-foreground">{peakHours}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Top error
              </span>
              <span className="font-medium text-foreground">{topError}</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              onClick={onSuggestedSession}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700"
            >
              Suggested Session
            </Button>
            <Button variant="outline" onClick={onWeeklyReport}>
              Weekly Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
