import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, BookOpen, ChevronLeft, ChevronRight, Trophy, Star, Lightbulb } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import MathText from '@/components/MathText';
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import confetti from 'canvas-confetti';
import { areMathEquivalent, uniqueMathAnswers } from '@/lib/areMathEquivalent';
import { sanitizeAnswerSet } from '@/lib/answerSanitizer';
import { resolveQuestionImageUrl } from '@/lib/resolveQuestionImageUrl';
import RichQuestionContent from '@/components/RichQuestionContent';
import { getTopicAndSubtopicLabels } from '@/lib/subtopicDisplay';
import { resolveUserTrack } from '@/lib/track';
import { parseDbArray } from '@/lib/parseDbArray';

// Topic mapping: normalize various topic names to canonical format
const TOPIC_MAPPING: Record<string, string> = {
  number: "Number",
  algebra: "Algebra",
  "ratio and proportion": "Ratio & Proportion",
  "ratio & proportion": "Ratio & Proportion",
  ratio: "Ratio & Proportion",
  geometry: "Geometry & Measures",
  "geometry & measures": "Geometry & Measures",
  "geometry and measures": "Geometry & Measures",
  probability: "Probability",
  statistics: "Statistics",
};

function normalizeTopicName(topic: string): string {
  const normalized = TOPIC_MAPPING[topic.toLowerCase()];
  return normalized || topic;
}

interface PracticeQuestion {
  id: string;
  question: string;
  correct_answer: string;
  all_answers: string[];
  question_type: string;
  subtopic?: string;
  tier: string;
  calculator: string;
  difficulty?: number;
  marks?: number;
  estimated_time_sec?: number;
  image_url?: string;
  image_alt?: string;
  explanation?: string;
  explain_on?: string;
}

type RawPracticeQuestion = Omit<PracticeQuestion, 'all_answers'> & {
  all_answers?: unknown;
  wrong_answers?: unknown;
};

interface TopicPracticeQuestionsProps {
  topicSlug: string;
  topicTitle: string;
  userId?: string;
}

const DECIMAL_FRAGMENT = /(\d+\.\d+)/g;

const formatDecimalSegment = (segment: string) => {
  const parts = segment.split('.');
  if (parts.length !== 2) return segment;
  if (parts[1].length <= 2) return segment;
  const value = Number(segment);
  if (!Number.isFinite(value)) return segment;

  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return rounded.endsWith('.00') ? rounded.slice(0, -3) : rounded;
};

const formatAnswerText = (text: string) => {
  return text.replace(DECIMAL_FRAGMENT, (match) => formatDecimalSegment(match));
};

const parseArray = (value: unknown): string[] => {
  return parseDbArray(value).map(String);
};

export function TopicPracticeQuestions({ topicSlug, topicTitle, userId }: TopicPracticeQuestionsProps) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [sessionStats, setSessionStats] = useState<Record<string, { correct: number; attempts: number }>>({});
  const [userTrack, setUserTrack] = useState<'gcse' | '11plus'>('gcse');

  useEffect(() => {
    if (!userId) {
      setUserTrack('gcse');
      return;
    }

    const loadTrack = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('track')
        .eq('user_id', userId)
        .maybeSingle();
      setUserTrack(resolveUserTrack(data?.track ?? null));
    };

    void loadTrack();
  }, [userId]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      // Extract main topic from URL path (e.g., 'algebra', 'number', 'geometry-measures')
      const pathParts = window.location.pathname.split('/');
      const sectionFromPath = pathParts[2]; // e.g., 'algebra'
      const topicFromPath = pathParts[3]; // e.g., 'solving-linear-equations'
      
      let data: RawPracticeQuestion[] | null = null;
      
      // Strategy 1: Try matching with the specific topic from the URL slug
      if (topicSlug) {
        // Convert slug to searchable keywords (e.g., 'solving-linear-equations' -> 'linear equations')
        const topicKeywords = topicSlug
          .replace(/-/g, ' ')
          .split(' ')
          .filter(word => word.length > 3);
        
        for (const keyword of topicKeywords) {
          const { data: topicData, error } = await supabase
            .from('exam_questions')
            .select('*')
            .or(`question_type.ilike.%${keyword}%,question.ilike.%${keyword}%`)
            // TRACK FILTER — Ensures separation between GCSE and 11+
            .eq('track', userTrack)
            .limit(8);
          
          if (!error && topicData && topicData.length > 0) {
            data = topicData as unknown as RawPracticeQuestion[];
            break;
          }
        }
      }
      
      // Strategy 2: Try matching with the main section (Number, Algebra, etc.)
      if ((!data || data.length === 0) && sectionFromPath) {
        const sectionMapping: Record<string, string> = {
          'number': 'Number',
          'algebra': 'Algebra',
          'ratio': 'Ratio & Proportion',
          'geometry-measures': 'Geometry & Measures',
          'probability': 'Probability',
          'statistics': 'Statistics'
        };
        
        const mappedSection = sectionMapping[sectionFromPath] || sectionFromPath;
        
        const { data: sectionData, error } = await supabase
          .from('exam_questions')
          .select('*')
          .ilike('question_type', `%${mappedSection}%`)
          // TRACK FILTER — Ensures separation between GCSE and 11+
          .eq('track', userTrack)
          .limit(8);
        
        if (!error && sectionData && sectionData.length > 0) {
          data = sectionData as unknown as RawPracticeQuestion[];
        }
      }
      
      // Strategy 3: Try matching by keywords from the topic title
      if (!data || data.length === 0) {
        const keywords = topicTitle.toLowerCase().split(/[\s-]+/).filter(k => k.length > 3);
        
        for (const keyword of keywords) {
          const { data: keywordData, error } = await supabase
            .from('exam_questions')
            .select('*')
            .ilike('question_type', `%${keyword}%`)
            // TRACK FILTER — Ensures separation between GCSE and 11+
            .eq('track', userTrack)
            .limit(8);
          
          if (!error && keywordData && keywordData.length > 0) {
            data = keywordData as unknown as RawPracticeQuestion[];
            break;
          }
        }
      }
      
      // Strategy 4: Last resort - get any questions
      if (!data || data.length === 0) {
        const { data: anyData, error } = await supabase
          .from('exam_questions')
          .select('*')
          // TRACK FILTER — Ensures separation between GCSE and 11+
          .eq('track', userTrack)
          .limit(8);
        
        if (!error && anyData) {
          data = anyData as unknown as RawPracticeQuestion[];
        }
      }
      
      if (data) {
        // Shuffle answers for each question to randomize correct answer position
        const processedQuestions: PracticeQuestion[] = data.map((question) => {
          const provided = parseArray(question.all_answers);
          const wrong = parseArray(question.wrong_answers);
          const baseAnswers = provided.length > 0
            ? uniqueMathAnswers(provided)
            : uniqueMathAnswers([String(question.correct_answer || ''), ...wrong]);
          const sanitized = sanitizeAnswerSet({
            options: baseAnswers,
            correct: String(question.correct_answer || ''),
            questionType: question.question_type,
            subtopic: question.subtopic,
          });

          return {
            ...(question as Omit<PracticeQuestion, 'all_answers'>),
            correct_answer: formatAnswerText(sanitized.correct),
            all_answers: sanitized.options.map(formatAnswerText).sort(() => Math.random() - 0.5),
          };
        }).filter((question) => question.all_answers.length >= 4);
        setQuestions(processedQuestions);
      }
    } catch (error) {
      console.error('Error fetching practice questions:', error);
      // Silently fail - no toast in notes section
    } finally {
      setLoading(false);
    }
  }, [topicSlug, topicTitle, userTrack]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const { topicLabel, subtopicLabel } = getTopicAndSubtopicLabels({
    questionType: currentQuestion?.question_type ?? null,
    subtopicId: currentQuestion?.subtopic ?? null,
    fallbackTopic: topicTitle,
  });

  const handleSubmit = async () => {
    if (!currentQuestion || !userId) return;

    const isCorrect = areMathEquivalent(selectedAnswer, currentQuestion.correct_answer);
    setHasSubmitted(true);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    // Immediately save to practice_results (each question gets its own row)
    const topic = normalizeTopicName(currentQuestion.question_type || 'General');
    const timestamp = new Date().toISOString();

    try {
      // Insert a new practice result for this specific question
      const { error: insertError } = await supabase
        .from("practice_results")
        .insert({
          user_id: userId,
          session_id: sessionId,
          topic,
          question_id: currentQuestion.id,
          correct: isCorrect ? 1 : 0,
          attempts: 1,
          difficulty: currentQuestion.tier || 'medium',
          mode: 'practice',
          started_at: timestamp,
          finished_at: timestamp,
        });

      if (insertError) {
        console.error("Error inserting practice result:", insertError);
        // Silently fail - progress saving is optional in notes section
      } else {
        console.log("Practice result saved successfully");
      }

      // Call update-readiness edge function (silently)
      const difficulty = 3;
      const { data: readinessData, error: readinessError } = await supabase.functions.invoke('update-readiness', {
        body: { 
          user_id: userId, 
          topic, 
          difficulty, 
          correct: isCorrect, 
          timestamp 
        }
      });

      if (readinessError) {
        console.error("Error calling update-readiness:", readinessError);
      }
      // No toast notifications for readiness updates in notes section

    } catch (error) {
      console.error("Error in handleSubmit:", error);
      // Silently fail - progress saving is optional in notes section
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      confetti({
        particleCount: 3,
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      });
    }, 250);
  };

  const handleFinish = () => {
    setShowCompletionModal(true);
    triggerConfetti();
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer('');
      setHasSubmitted(false);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer('');
      setHasSubmitted(false);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setHasSubmitted(false);
    setShowExplanation(false);
    setCorrectCount(0);
    setShowCompletionModal(false);
  };

  const getScoreMessage = () => {
    const percentage = (correctCount / questions.length) * 100;
    if (percentage === 100) return "Perfect Score!";
    if (percentage >= 80) return "Excellent Work!";
    if (percentage >= 60) return "Good Job!";
    if (percentage >= 40) return "Keep Practicing!";
    return "Try Again!";
  };

  const getScoreColor = () => {
    const percentage = (correctCount / questions.length) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-orange-600";
  };

  const resolveImageUrl = resolveQuestionImageUrl;

  const getAnswerColor = (answer: string) => {
    if (!hasSubmitted || !currentQuestion) return '';
    
    if (answer === currentQuestion.correct_answer) {
      return 'border-green-500 bg-green-50 dark:bg-green-950';
    }
    if (selectedAnswer === answer && answer !== currentQuestion.correct_answer) {
      return 'border-red-500 bg-red-50 dark:bg-red-950';
    }
    return '';
  };

  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Practice Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading practice questions...</p>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const imageUrl = currentQuestion ? resolveImageUrl(currentQuestion.image_url) : undefined;
  const isCorrect = hasSubmitted && selectedAnswer === currentQuestion?.correct_answer;

  return (
    <>
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Practice Complete!
            </DialogTitle>
            <DialogDescription>
              Here's how you did on this practice session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="text-6xl font-bold text-center">
                  <span className={getScoreColor()}>{correctCount}</span>
                  <span className="text-muted-foreground">/{questions.length}</span>
                </div>
                <div className="absolute -top-2 -right-2">
                  <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xl font-semibold mb-2">{getScoreMessage()}</p>
              <p className="text-sm text-muted-foreground">
                You got {Math.round((correctCount / questions.length) * 100)}% correct
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Correct Answers:</span>
                <span className="font-semibold text-green-600">{correctCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Incorrect Answers:</span>
                <span className="font-semibold text-red-600">{questions.length - correctCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Questions:</span>
                <span className="font-semibold">{questions.length}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRestart} className="flex-1" size="lg">
                Try Again
              </Button>
              <Button onClick={() => setShowCompletionModal(false)} variant="outline" className="flex-1" size="lg">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="mt-8 mb-8 border-2 border-primary/20 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="border-b border-primary/10 bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-6 w-6 text-primary" />
              Practice Questions
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Test your understanding with these practice questions
            </p>
          </div>
          {questions.length > 0 && (
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              {(topicLabel || subtopicLabel) && (
                <div className="flex items-center gap-2">
                  {topicLabel && (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-muted-foreground">
                      {topicLabel}
                    </Badge>
                  )}
                  {subtopicLabel && (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-muted-foreground">
                      {subtopicLabel}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {questions.length > 0 && (
          <div className="mt-3">
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {!currentQuestion ? (
          <p className="text-muted-foreground text-center py-8">
            No practice questions available for this topic yet.
          </p>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="text-foreground mb-6 text-lg font-medium bg-muted/50 p-4 rounded-lg border border-border">
                <RichQuestionContent text={currentQuestion.question} />
              </div>
              
              {imageUrl && (
                <div className="mb-4">
                  <div className="question-image-shell">
                    <ImageWithFallback
                      src={imageUrl}
                      alt={currentQuestion.image_alt || 'Question diagram'}
                      className="question-image-media"
                    />
                  </div>
                </div>
              )}

              <RadioGroup
                value={selectedAnswer}
                onValueChange={setSelectedAnswer}
                disabled={hasSubmitted}
                className="space-y-3"
              >
                {currentQuestion.all_answers.map((answer, idx) => (
                  <div
                    key={answer}
                    className={`flex items-center space-x-3 border-2 rounded-xl p-4 transition-all hover:shadow-md ${
                      getAnswerColor(answer) || 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <RadioGroupItem value={answer} id={answer} className="sr-only" />
                    <Label
                      htmlFor={answer}
                      className="flex-1 cursor-pointer text-base"
                    >
                      <MathText text={answer} display={false} />
                    </Label>
                    {hasSubmitted && answer === currentQuestion.correct_answer && (
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                    )}
                    {hasSubmitted && selectedAnswer === answer && answer !== currentQuestion.correct_answer && (
                      <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </RadioGroup>

              {hasSubmitted && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                    {isCorrect ? (
                      <>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-950">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-600">Correct!</p>
                          <p className="text-sm text-muted-foreground">Great job!</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950">
                          <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-600">Incorrect</p>
                          <p className="text-sm text-muted-foreground">Review the explanation below</p>
                        </div>
                      </>
                    )}
                    <div className="ml-auto">
                      <Badge variant="outline" className="text-base px-3 py-1">
                        Score: {correctCount}/{currentQuestionIndex + 1}
                      </Badge>
                    </div>
                  </div>

                  {currentQuestion.explanation && (
                    <div>
                      <Button
                        onClick={() => setShowExplanation(!showExplanation)}
                        variant="outline"
                        size="default"
                        className="w-full"
                      >
                        {showExplanation ? 'Hide' : 'Show'} Explanation
                      </Button>
                      
                        {showExplanation && (
                        <div className="mt-3 p-5 bg-primary/5 rounded-lg border border-primary/20">
                          <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-primary" />
                            Explanation:
                          </h4>
                          <div className="text-sm text-foreground leading-relaxed">
                            <RichQuestionContent text={currentQuestion.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border/50">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                size="lg"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              {!hasSubmitted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  size="lg"
                  className="px-8"
                >
                  Check Answer
                </Button>
              ) : (
                <Button
                  onClick={isLastQuestion ? handleFinish : handleNext}
                  disabled={!isLastQuestion && currentQuestionIndex === questions.length - 1}
                  size="lg"
                  className="px-8"
                >
                  {isLastQuestion ? (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Finish
                    </>
                  ) : (
                    <>
                      Next Question
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
