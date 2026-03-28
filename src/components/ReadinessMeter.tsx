import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { SyncStatusIndicator, SyncStatus } from "@/components/ui/sync-status";
import { RAGBadge } from "@/components/ui/rag-badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Edit3, 
  Target,
  BarChart3,
  Info
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface SubtopicProgress {
  subtopic_key: string;
  title: string;
  score: number;
  order_index: number;
}

interface TopicData {
  topic_key: string;
  topic_name: string;
  subtopics: SubtopicProgress[];
  average_score: number;
}

interface ReadinessMeterProps {
  userId: string;
  onProgressUpdate?: () => void;
}

const TOPIC_NAMES = {
  number: 'Number',
  algebra: 'Algebra', 
  ratio: 'Ratio & Proportion',
  geometry: 'Geometry & Measures',
  probability: 'Probability',
  statistics: 'Statistics'
};

// RAG Status with colored backgrounds - touch-friendly and responsive
const ragClass = (score: number) => {
  if (score >= 70) return "bg-[#10b981] text-white";
  if (score >= 40) return "bg-[#f59e0b] text-white";
  return "bg-[#ef4444] text-white";
};

const getRAGText = (score: number) => {
  if (score >= 70) return "Strong";
  if (score >= 40) return "Developing";
  return "Needs Work";
};

export function ReadinessMeter({ userId, onProgressUpdate }: ReadinessMeterProps) {
  const [topicsData, setTopicsData] = useState<TopicData[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingSubtopic, setEditingSubtopic] = useState<{topic: string, subtopic: string, score: number} | null>(null);
  const [tempScores, setTempScores] = useState<Record<string, number>>({});
  const [quickCheckOpen, setQuickCheckOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string>('');

  useEffect(() => {
    fetchProgressData();
  }, [userId]);

  const fetchProgressData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to view your progress');
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke('progress-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (!result.ok) {
        const friendlyMessages = {
          'NO_AUTH': 'Please sign in to view your progress',
          'INVALID_AUTH': 'Your session has expired. Please sign in again',
          'CATALOG_ERROR': 'Failed to load topic catalog. Please try again',
          'PROGRESS_ERROR': 'Failed to load your progress. Please try again',
          'SEED_ERROR': 'Failed to initialize your progress. Please try again',
          'FINAL_FETCH_ERROR': 'Failed to load updated progress. Please try again'
        };
        
        const message = friendlyMessages[result.code as keyof typeof friendlyMessages] || result.message;
        toast.error(message);
        return;
      }

      setTopicsData(result.data.topics);
      console.log('Progress data loaded:', result.data.stats);
      
    } catch (error) {
      console.error('Error fetching progress data:', error);
      const message = error instanceof Error ? error.message : 'Failed to load progress data';
      toast.error(`${message} - Please try refreshing the page`);
    } finally {
      setLoading(false);
    }
  };

  const retryLoadData = () => {
    setLoading(true);
    fetchProgressData();
  };

  const toggleTopic = (topicKey: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicKey)) {
      newExpanded.delete(topicKey);
    } else {
      newExpanded.add(topicKey);
    }
    setExpandedTopics(newExpanded);
  };

  const updateSubtopicScore = async (topicKey: string, subtopicKey: string, newScore: number) => {
    try {
      setSyncStatus('syncing');
      setSyncError('');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to update progress');
        setSyncStatus('error');
        setSyncError('Authentication required');
        return;
      }

      // Optimistic update first
      setTopicsData(prev => prev.map(topic => 
        topic.topic_key === topicKey 
          ? {
              ...topic,
              subtopics: topic.subtopics.map(subtopic => 
                subtopic.subtopic_key === subtopicKey 
                  ? { ...subtopic, score: newScore }
                  : subtopic
              ),
              average_score: topic.subtopics.length > 0 
                ? Math.round(topic.subtopics.map(subtopic => 
                    subtopic.subtopic_key === subtopicKey ? newScore : subtopic.score
                  ).reduce((sum, score) => sum + score, 0) / topic.subtopics.length)
                : 0
            }
          : topic
      ));

      const response = await supabase.functions.invoke('update-subtopic', {
        body: { 
          updates: [{ topic_key: topicKey, subtopic_key: subtopicKey, score: newScore }]
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (!result.ok) {
        throw new Error(result.message);
      }

      // Update with fresh server data for consistency
      if (result.data) {
        setTopicsData(result.data.topics);
      }

      setSyncStatus('saved');
      setLastSavedAt(new Date());
      setTimeout(() => setSyncStatus('idle'), 2000); // Show "Saved" for 2 seconds

      onProgressUpdate?.();
      toast.success('Progress updated!');
    } catch (error) {
      console.error('Error updating progress:', error);
      // Revert optimistic update on error
      fetchProgressData();
      setSyncStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to update progress';
      setSyncError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleQuickSave = async () => {
    try {
      const updates = Object.entries(tempScores).map(([key, score]) => {
        const [topic_key, subtopic_key] = key.split('.');
        return { topic_key, subtopic_key, score };
      });

      if (updates.length === 0) {
        setQuickCheckOpen(false);
        return;
      }

      setSyncStatus('syncing');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to save changes');
        setSyncStatus('idle');
        return;
      }

      // Optimistic update first
      setTopicsData(prev => prev.map(topic => ({
        ...topic,
        subtopics: topic.subtopics.map(subtopic => {
          const key = `${topic.topic_key}.${subtopic.subtopic_key}`;
          const newScore = tempScores[key];
          return newScore !== undefined 
            ? { ...subtopic, score: newScore }
            : subtopic;
        }),
        average_score: topic.subtopics.length > 0 
          ? Math.round(topic.subtopics.map(subtopic => {
              const key = `${topic.topic_key}.${subtopic.subtopic_key}`;
              return tempScores[key] !== undefined ? tempScores[key] : subtopic.score;
            }).reduce((sum, score) => sum + score, 0) / topic.subtopics.length)
          : 0
      })));

      const response = await supabase.functions.invoke('update-subtopic', {
        body: { updates },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (!result.ok) {
        throw new Error(result.message);
      }

      // Update with fresh server data for consistency
      if (result.data) {
        setTopicsData(result.data.topics);
        // Clear temp scores after state is updated to show saved values
        setTimeout(() => {
          setTempScores({});
          setQuickCheckOpen(false);
        }, 100);
      } else {
        setQuickCheckOpen(false);
      }

      setSyncStatus('saved');
      setLastSavedAt(new Date());
      setTimeout(() => setSyncStatus('idle'), 2000);

      onProgressUpdate?.();
      
      toast.success(result.message);
    } catch (error) {
      console.error('Error saving quick check:', error);
      // Revert optimistic update on error
      fetchProgressData();
      setSyncStatus('idle');
      const message = error instanceof Error ? error.message : 'Failed to save changes';
      toast.error(message);
    }
  };

  const overallReadiness = topicsData.length > 0 
    ? Math.round(topicsData.reduce((sum, topic) => sum + topic.average_score, 0) / topicsData.length)
    : 0;

  if (loading) {
    return (
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent animate-spin" />
            Exam Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Loading progress...</div>
        </CardContent>
      </Card>
    );
  }

  // Show retry option if no data loaded but not loading
  if (!loading && topicsData.length === 0) {
    return (
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Exam Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-muted-foreground">
            No progress data found. This might be your first visit!
          </div>
          <Button onClick={retryLoadData} className="w-full sm:w-auto">
            Load Progress Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Exam Readiness
              {/* Sync Status Indicator */}
              <SyncStatusIndicator 
                status={syncStatus}
                lastSavedAt={lastSavedAt}
                error={syncError}
                className="ml-4"
              />
            </div>
          <Dialog open={quickCheckOpen} onOpenChange={(open) => {
            if (!open) {
              // Only clear temp scores if not in the middle of saving
              if (syncStatus !== 'syncing') {
                setTempScores({});
              }
            }
            setQuickCheckOpen(open);
          }}>
              <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={topicsData.length === 0}
              className="btn-text-nowrap max-w-[160px]"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Start Self-Check
            </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle>Self-Check: Rate Your Readiness</DialogTitle>
                <DialogDescription>
                  Rate your readiness in each subtopic from 0-100 to track your progress
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue={topicsData[0]?.topic_key}>
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                  {topicsData.map((topic) => (
                    <TabsTrigger 
                      key={topic.topic_key} 
                      value={topic.topic_key}
                      className="text-xs"
                    >
                      {topic.topic_name.split(' ')[0]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {topicsData.map((topic) => (
                     <TabsContent key={topic.topic_key} value={topic.topic_key} className="space-y-4">
                       <h3 className="font-semibold text-lg">{topic.topic_name}</h3>
                       <div className="space-y-3">
                         {topic.subtopics.map((subtopic) => {
                           const key = `${topic.topic_key}.${subtopic.subtopic_key}`;
                           // Show current saved score or temp score if being edited
                           const currentScore = tempScores[key] !== undefined ? tempScores[key] : subtopic.score;
                           
                           return (
                             <div key={subtopic.subtopic_key} className="space-y-2">
                               <div className="flex justify-between items-center">
                                 <label className="text-sm font-medium">{subtopic.title}</label>
                                 <span className="text-sm font-bold min-w-[3ch]">{currentScore}</span>
                               </div>
                               <Slider
                                 value={[currentScore]}
                                 onValueChange={([value]) => {
                                   setTempScores(prev => ({ ...prev, [key]: value }));
                                 }}
                                 max={100}
                                 step={5}
                                 className="w-full"
                               />
                             </div>
                           );
                         })}
                       </div>
                     </TabsContent>
                ))}
              </Tabs>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => {
                  setTempScores({});
                  setQuickCheckOpen(false);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleQuickSave}
                  disabled={syncStatus === 'syncing'}
                  className="btn-text-nowrap"
                >
                  {syncStatus === 'syncing' ? 'Saving...' : 'Save All Changes'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Track your readiness across all GCSE Mathematics topics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center space-y-4">
          <div className="text-4xl font-bold text-accent">
            {overallReadiness}%
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="bg-gradient-success h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallReadiness}%` }}
            />
          </div>
          <Tooltip>
            <TooltipTrigger>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Overall Exam Readiness
                <Info className="h-3 w-3" />
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p>Average of all your subtopic scores across 6 main topics</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Topics Breakdown */}
        <div className="space-y-2">
          {topicsData.map((topic) => {
            const isExpanded = expandedTopics.has(topic.topic_key);
            
            return (
              <div key={topic.topic_key} className="border rounded-lg p-3">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleTopic(topic.topic_key)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{topic.topic_name}</div>
                      <Progress value={topic.average_score} className="h-2 mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold min-w-[3ch]">{topic.average_score}%</span>
                    <RAGBadge score={topic.average_score} />
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-3 pl-7 space-y-2">
                    {topic.subtopics.map((subtopic) => {
                      
                      return (
                        <div key={subtopic.subtopic_key} className="flex items-center justify-between py-1">
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">{subtopic.title}</div>
                            <Progress value={subtopic.score} className="h-1 mt-1 w-full" />
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className="text-xs font-medium min-w-[3ch]">{subtopic.score}%</span>
                            <RAGBadge score={subtopic.score} size="sm" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSubtopic({
                                  topic: topic.topic_key,
                                  subtopic: subtopic.subtopic_key,
                                  score: subtopic.score
                                });
                              }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Edit Subtopic Dialog */}
        <Dialog 
          open={editingSubtopic !== null} 
          onOpenChange={(open) => !open && setEditingSubtopic(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Progress</DialogTitle>
              <DialogDescription>
                Rate your confidence from 0-100
              </DialogDescription>
            </DialogHeader>
            
            {editingSubtopic && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{editingSubtopic.score}%</div>
                </div>
                <Slider
                  value={[editingSubtopic.score]}
                  onValueChange={([value]) => 
                    setEditingSubtopic(prev => prev ? { ...prev, score: value } : null)
                  }
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingSubtopic(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    if (editingSubtopic) {
                      updateSubtopicScore(
                        editingSubtopic.topic,
                        editingSubtopic.subtopic,
                        editingSubtopic.score
                      );
                      setEditingSubtopic(null);
                    }
                  }}>
                    Save
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}