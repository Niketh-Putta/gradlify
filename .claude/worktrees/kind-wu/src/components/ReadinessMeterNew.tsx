// Force recompile - removed Dialog references
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  CheckCircle2,
  AlertCircle,
  Minus
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useReadiness } from '@/lib/stores/readiness';
import { useReadinessData } from '@/hooks/useReadinessData';

interface ReadinessMeterProps {
  userId: string;
  onProgressUpdate?: () => void;
}

interface SubtopicData {
  topic_key: string;
  subtopic_key: string;
  title: string;
  order_index: number;
}

interface TopicData {
  key: string;
  name: string;
  subtopics: SubtopicData[];
  average: number;
  color: string;
}

const TOPIC_CONFIG = {
  number: { name: 'Number', color: '#3b82f6' },
  algebra: { name: 'Algebra', color: '#8b5cf6' },
  ratio: { name: 'Ratio & Proportion', color: '#10b981' },
  geometry: { name: 'Geometry & Measures', color: '#f59e0b' },
  probability: { name: 'Probability', color: '#ef4444' },
  statistics: { name: 'Statistics', color: '#06b6d4' }
};

export function ReadinessMeter({ userId, onProgressUpdate }: ReadinessMeterProps) {
  const [topicsData, setTopicsData] = useState<TopicData[]>([]);
  const [overallReadiness, setOverallReadiness] = useState<number>(0);
  
  const { bySubtopic } = useReadiness();
  const { loading, saving, byTopic, overall, isHydrated, updateScore } = useReadinessData(userId);

  // Load subtopics structure and calculate averages
  useEffect(() => {
    if (!isHydrated) return;

    void loadSubtopicsStructure();
  }, [isHydrated, loadSubtopicsStructure]);

  const loadSubtopicsStructure = useCallback(async () => {
    try {
      // Load subtopics structure
      const { data: subtopicsData, error: subtopicsError } = await supabase
        .from('topic_catalog')
        .select('topic_key, subtopic_key, title, order_index')
        .order('topic_key')
        .order('order_index');

      if (subtopicsError) throw subtopicsError;

      // Group subtopics by topic and calculate averages
      const topicsMap: Record<string, TopicData> = {};
      
      subtopicsData?.forEach(subtopic => {
        const key = `${subtopic.topic_key}.${subtopic.subtopic_key}`;
        const score = bySubtopic[key] || 0;
        
        if (!topicsMap[subtopic.topic_key]) {
          topicsMap[subtopic.topic_key] = {
            key: subtopic.topic_key,
            name: TOPIC_CONFIG[subtopic.topic_key as keyof typeof TOPIC_CONFIG]?.name || subtopic.topic_key,
            color: TOPIC_CONFIG[subtopic.topic_key as keyof typeof TOPIC_CONFIG]?.color || '#6b7280',
            subtopics: [],
            average: 0
          };
        }
        
        topicsMap[subtopic.topic_key].subtopics.push(subtopic);
      });

      // Calculate topic averages from current values
      Object.values(topicsMap).forEach(topic => {
        const subtopicScores = topic.subtopics.map(s => 
          bySubtopic[`${s.topic_key}.${s.subtopic_key}`] || 0
        );
        topic.average = subtopicScores.length > 0 
          ? Math.round(subtopicScores.reduce((sum, score) => sum + score, 0) / subtopicScores.length)
          : 0;
      });

      const topics = Object.values(topicsMap);
      setTopicsData(topics);

      // Use overall from store instead of recalculating
      setOverallReadiness(overall);
    } catch (error) {
      console.error('Error loading subtopics structure:', error);
      toast.error('Failed to load subtopics data');
    }
  }, [bySubtopic, overall]);

  // Debounced save function

  // Remove old handler since we use updateScore from the hook

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

  const getReadinessIcon = (score: number) => {
    if (score >= 70) return CheckCircle2;
    if (score >= 40) return Minus;
    return AlertCircle;
  };

  if (loading || !isHydrated) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Readiness */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target className="h-5 w-5 text-primary" />
            </div>
            Overall Exam Readiness
            <Badge 
              variant="outline" 
              className="ml-auto"
              style={{ 
                borderColor: getReadinessColor(overallReadiness),
                color: getReadinessColor(overallReadiness)
              }}
            >
              {overallReadiness}% {getReadinessLabel(overallReadiness)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress 
              value={overallReadiness} 
              className="h-4"
              style={{
                backgroundColor: '#f3f4f6',
              }}
            />
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: getReadinessColor(overallReadiness) }}>
                {overallReadiness}%
              </p>
              <p className="text-muted-foreground">
                Average across all GCSE Mathematics topics
              </p>
            </div>
            {saving && (
              <div className="text-center text-sm text-muted-foreground">
                Saving...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topicsData.map((topic) => {
          const Icon = getReadinessIcon(topic.average);
          return (
            <Card key={topic.key} className="bg-gradient-card border-0 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: topic.color }}
                    />
                    {topic.name}
                  </div>
                  <Icon 
                    className="h-4 w-4" 
                    style={{ color: getReadinessColor(topic.average) }}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <Progress 
                    value={topic.average} 
                    className="h-2"
                    style={{
                      backgroundColor: '#f3f4f6',
                    }}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {topic.subtopics.length} subtopics
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: getReadinessColor(topic.average) }}
                    >
                      {topic.average}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
