import { useCallback, useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Loader2, TrendingUp, TrendingDown, BookOpen, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

interface AIFeedback {
  summary: {
    overall_score: string;
    performance_level: string;
    topic_accuracy: Array<{
      topic: string;
      accuracy: number;
      status: string;
    }>;
  };
  strengths: string[];
  weaknesses: Array<{
    area: string;
    note: string;
  }>;
  explanations: Array<{
    topic: string;
    common_mistake: string;
    worked_example: {
      question: string;
      step_by_step: string[];
      answer: string;
    };
  }>;
  recommendations: string[];
}

interface AIFeedbackPanelProps {
  attemptId: string;
}

export function AIFeedbackPanel({ attemptId }: AIFeedbackPanelProps) {
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-feedback', {
        body: { attempt_id: attemptId }
      });

      if (invokeError) throw invokeError;

      setFeedback(data.feedback);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load AI feedback';
      console.error('Error fetching AI feedback:', err);
      setError(message);
      toast({
        title: "Error",
        description: "Failed to load AI feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    if (!AI_FEATURE_ENABLED) return;
    if (attemptId) {
      fetchFeedback();
    }
  }, [attemptId, fetchFeedback]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'strong':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'weak':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!AI_FEATURE_ENABLED) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Generating your personalized AI feedback...</p>
        <p className="text-sm text-muted-foreground">This may take 10-20 seconds</p>
      </div>
    );
  }


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-destructive">AI Feedback Unavailable</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={fetchFeedback} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground">No feedback available</p>
      </div>
    );
  }

  const weakTopics = feedback.recommendations || [];

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className="text-2xl font-bold text-primary">{feedback.summary.overall_score}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Performance Level</p>
              <p className="text-xl font-semibold">{feedback.summary.performance_level}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Topic Performance</p>
            <div className="flex flex-wrap gap-2">
              {feedback.summary.topic_accuracy.map((topic, idx) => (
                <Badge key={idx} className={getStatusColor(topic.status)}>
                  {topic.topic}: {topic.accuracy}%
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {feedback.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-1" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Weaknesses Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Areas for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {feedback.weaknesses.map((weakness, idx) => (
              <li key={idx} className="space-y-1">
                <p className="font-medium">{weakness.area}</p>
                <p className="text-sm text-muted-foreground">{weakness.note}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Worked Examples Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Worked Examples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {feedback.explanations.map((example, idx) => (
              <AccordionItem key={idx} value={`example-${idx}`}>
                <AccordionTrigger>
                  <div className="text-left">
                    <p className="font-medium">{example.topic}</p>
                    <p className="text-sm text-muted-foreground">{example.common_mistake}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="font-medium text-sm mb-2">Question:</p>
                      <p className="text-sm bg-muted p-3 rounded-md">{example.worked_example.question}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-2">Step-by-Step Solution:</p>
                      <ol className="space-y-2">
                        {example.worked_example.step_by_step.map((step, stepIdx) => (
                          <li key={stepIdx} className="flex gap-2 text-sm">
                            <span className="font-medium text-primary">{stepIdx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-2">Answer:</p>
                      <p className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-md font-medium">
                        {example.worked_example.answer}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

    </div>
  );
}
