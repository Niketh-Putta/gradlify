import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  ArrowRight
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverallReadiness } from '@/hooks/useOverallReadiness';

interface ReadinessSummaryProps {
  userId: string;
}

export function ReadinessSummary({ userId }: ReadinessSummaryProps) {
  const navigate = useNavigate();
  const { overall, loading } = useOverallReadiness(userId);

  const getReadinessColor = (score: number) => {
    if (score >= 70) return '#10b981'; // Green
    if (score >= 40) return '#f59e0b'; // Amber  
    return '#ef4444'; // Red
  };

  const getReadinessLabel = (score: number) => {
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Developing';
    return 'Needs Work';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target className="h-5 w-5 text-primary" />
            </div>
            Exam Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-0 shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target className="h-5 w-5 text-primary" />
            </div>
            Exam Readiness
          </div>
          <Badge 
            variant="outline"
            style={{ 
              borderColor: getReadinessColor(overall),
              color: getReadinessColor(overall)
            }}
          >
            {overall.toFixed(1)}% {getReadinessLabel(overall)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Average</span>
            <span 
              className="font-bold"
              style={{ color: getReadinessColor(overall) }}
            >
              {overall.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={overall} 
            className="h-3"
          />
        </div>


        {/* Action Button */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/exam-readiness')}
          >
            View Full Analytics
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}