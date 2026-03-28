import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

interface ReadinessGaugeProps {
  overall: number;
  previousOverall?: number;
}

export function ReadinessGauge({ overall, previousOverall }: ReadinessGaugeProps) {
  const getLabel = (score: number) => {
    if (score >= 75) return { text: 'Exam Ready', color: 'bg-green-500' };
    if (score >= 50) return { text: 'On Track', color: 'bg-blue-500' };
    if (score >= 25) return { text: 'Building', color: 'bg-amber-500' };
    return { text: 'Needs Work', color: 'bg-red-500' };
  };

  const label = getLabel(overall);
  const trend = previousOverall !== undefined ? overall - previousOverall : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Overall Exam Readiness</span>
          <Badge variant="outline" className={label.color}>
            {label.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-5xl font-bold text-primary">
            {Math.round(overall)}%
          </div>
          {trend !== 0 && (
            <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
              {trend > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{trend.toFixed(1)}%</span>
                </>
              ) : trend < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{trend.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4" />
                  <span>No change</span>
                </>
              )}
            </div>
          )}
        </div>
        <Progress value={overall} className="h-3" />
        <p className="text-sm text-muted-foreground text-center">
          {AI_FEATURE_ENABLED
            ? 'Based on your practice, mocks, and AI-assessed performance across all topics'
            : 'Based on your practice and mocks across all topics'}
        </p>
      </CardContent>
    </Card>
  );
}
