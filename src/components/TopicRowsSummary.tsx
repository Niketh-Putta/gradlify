import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useReadinessStore } from "@/lib/stores/useReadinessStore";
import { TOPIC_CONFIG, getAllSubtopicKeys, getTopicSubtopicKeys } from "@/lib/topicConstants";
import { BarChart3, BookOpen, Calculator, PieChart, Sparkles, Target, TrendingUp } from "lucide-react";

interface TopicRowsSummaryProps {
  loading?: boolean;
}

export function TopicRowsSummary({ loading }: TopicRowsSummaryProps) {
  const { scores } = useReadinessStore();

  // Calculate topic averages from ALL subtopic scores (including 0s)
  const calculateTopicScores = () => {
    const topicScores: Record<string, number> = {};
    
    Object.keys(TOPIC_CONFIG).forEach(topicKey => {
      const subtopicKeys = getTopicSubtopicKeys(topicKey);
      const topicTotal = subtopicKeys.reduce((sum, key) => {
        return sum + (scores[key] || 0); // Default to 0 if not set
      }, 0);
      
      topicScores[topicKey] = subtopicKeys.length > 0 
        ? Math.round(topicTotal / subtopicKeys.length) 
        : 0;
    });

    return topicScores;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Object.entries(TOPIC_CONFIG).map(([key]) => (
          <div key={key} className="animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-muted rounded-full"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="ml-auto h-4 w-8 bg-muted rounded"></div>
            </div>
            <div className="h-2 bg-muted rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  const topicScores = calculateTopicScores();

  const getTopicIcon = (topicKey: string) => {
    switch(topicKey) {
      case 'number': return <Calculator className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />;
      case 'algebra': return <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />;
      case 'ratio': return <PieChart className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />;
      case 'geometry': return <Target className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />;
      case 'probability': return <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />;
      case 'statistics': return <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />;
      default: return <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 font-bold';
    if (score >= 40) return 'text-amber-600 font-bold'; 
    return 'text-red-600 font-bold';
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'var(--gradient-success)';
    if (score >= 40) return 'var(--gradient-developing)';
    return 'var(--gradient-needs-work)';
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {Object.entries(TOPIC_CONFIG).map(([key, config]) => {
        const score = topicScores[key] || 0;
        return (
          <Card key={key} className="border-0 shadow-md hover-scale transition-all duration-300" style={{ backgroundColor: 'hsl(var(--card))' }}>
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-muted/30 rounded-lg sm:rounded-xl shrink-0 text-muted-foreground">
                      {getTopicIcon(key)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">{config.name}</h3>
                      <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                        <div 
                          className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-xs sm:text-sm text-muted-foreground truncate">Mathematics Topic</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${getScoreColor(score)}`}>
                      {score}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                      {score >= 70 ? 'Strong' : score >= 40 ? 'Developing' : 'Needs Work'}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={score} className="h-2 sm:h-2.5 md:h-3 progress-modern" />
                  <div 
                    className="progress-topic absolute inset-0 rounded-full"
                    style={{
                      background: getProgressColor(score),
                      width: `${score}%`,
                      transition: 'width 0.8s ease-out'
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}