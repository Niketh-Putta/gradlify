import { useCallback, useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIFeedbackPanel } from "@/components/AIFeedbackPanel";
import { Loader2, Calendar, Trophy, FileText, History } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

interface MockAttempt {
  id: string;
  title: string;
  mode: string;
  score: number;
  total_marks: number;
  status: string;
  created_at: string;
  duration_minutes: number;
}

interface MockExamHistoryProps {
  userId: string;
}

export function MockExamHistory({ userId }: MockExamHistoryProps) {
  const [attempts, setAttempts] = useState<MockAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const fetchAttempts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mock_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAttempts(data || []);
    } catch (err: unknown) {
      console.error('Error fetching mock attempts:', err);
      toast({
        title: "Error",
        description: "Failed to load your mock exam history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchAttempts();
  }, [fetchAttempts]);

  const getScorePercentage = (score: number, total: number) => {
    return Math.round((score / total) * 100);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (percentage >= 60) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (percentage >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No completed mock exams yet</p>
        <p className="text-sm text-muted-foreground">Your mock exam history will appear here after you complete exams</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[40vh] sm:h-[50vh] pr-3">
      <div className="space-y-4">
        {attempts.map((attempt) => {
          const percentage = getScorePercentage(attempt.score, attempt.total_marks);
          
          return (
            <Card key={attempt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{attempt.title}</h3>
                      <Badge variant="outline" className="capitalize">
                        {attempt.mode}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(attempt.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        {attempt.score}/{attempt.total_marks} marks
                      </div>
                    </div>

                    <Badge className={getGradeColor(percentage)}>
                      {percentage}% Score
                    </Badge>
                  </div>

                  {AI_FEATURE_ENABLED ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="default"
                          onClick={() => setSelectedAttemptId(attempt.id)}
                        >
                          View AI Feedback
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh]">
                        <DialogHeader>
                          <DialogTitle className="pr-8">AI Feedback - {attempt.title}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[70vh]">
                          <div className="pr-4">
                            {selectedAttemptId === attempt.id && (
                              <AIFeedbackPanel attemptId={attempt.id} />
                            )}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
