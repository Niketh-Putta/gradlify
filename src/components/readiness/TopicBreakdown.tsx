import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Topic {
  topic: string;
  readiness: number;
  updated_at: string;
}

interface TopicBreakdownProps {
  topics: Topic[];
}

export function TopicBreakdown({ topics }: TopicBreakdownProps) {
  const getColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-blue-500';
    if (score >= 25) return 'text-amber-500';
    return 'text-red-500';
  };

  const getVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 75) return 'default';
    if (score >= 50) return 'secondary';
    if (score >= 25) return 'outline';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No topic data yet. Complete some practice or mock questions to build your readiness profile.
          </p>
        ) : (
          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="font-medium">{topic.topic}</span>
                    {topic.readiness === 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Needs work – complete practice to build your readiness
                      </p>
                    )}
                  </div>
                  <Badge variant={getVariant(topic.readiness)}>
                    {Math.round(topic.readiness)}%
                  </Badge>
                </div>
                <Progress value={topic.readiness} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
