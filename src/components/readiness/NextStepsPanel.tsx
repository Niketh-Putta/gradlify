import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubject } from '@/contexts/SubjectContext';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

interface Topic {
  topic: string;
  readiness: number;
}

interface NextStepsPanelProps {
  topics: Topic[];
  loading?: boolean;
}

export function NextStepsPanel({ topics, loading }: NextStepsPanelProps) {
  const navigate = useNavigate();
  const { currentSubject } = useSubject();
  
  if (loading) {
    return null;
  }

  // Sort topics by readiness (lowest first) and take top 3
  const weakestTopics = [...topics]
    .sort((a, b) => a.readiness - b.readiness)
    .slice(0, 3);

  const getReadinessColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const handleTopicClick = (topicName: string) => {
    const params = new URLSearchParams({
      topics: topicName,
      tier: 'both',
      paperType: 'both',
      mode: 'practice'
    });
    navigate(`/practice/${currentSubject}?${params.toString()}`);
  };

  return (
    <Card className="hidden lg:block">
      <CardHeader className="p-4 md:p-6 pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">What to Work On Next</CardTitle>
        </div>
        <CardDescription className="text-sm">
          {AI_FEATURE_ENABLED
            ? 'AI-recommended focus areas based on your readiness'
            : 'Recommended focus areas based on your readiness'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 space-y-3">
        {weakestTopics.map((topic, index) => (
          <div
            key={topic.topic}
            onClick={() => handleTopicClick(topic.topic)}
            className="relative rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1} Priority
                  </Badge>
                  {topic.readiness < 40 && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
                <h4 className="font-semibold text-sm">{topic.topic}</h4>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xl font-bold ${getReadinessColor(topic.readiness)}`}>
                  {topic.readiness}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Brain className="h-3 w-3" />
              <span>{AI_FEATURE_ENABLED ? 'AI Suggestion' : 'Suggestion'}</span>
            </div>

            {/* Progress indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
              <div
                className={`h-full transition-all ${
                  topic.readiness >= 70
                    ? 'bg-green-500'
                    : topic.readiness >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${topic.readiness}%` }}
              />
            </div>
          </div>
        ))}

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-primary">Pro Tip</p>
              <p className="text-xs text-muted-foreground mt-1">
                Focus on your weakest topics first. Small improvements in low-scoring areas boost your overall readiness faster.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
