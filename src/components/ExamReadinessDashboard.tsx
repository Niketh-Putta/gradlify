import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  getReadinessOverview, 
  manualSetReadiness, 
  getReadinessHistory,
  type TopicReadiness,
  type ReadinessHistory
} from '@/lib/readinessApi';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { resolveUserTrack } from '@/lib/track';
import type { OnboardingAnswers } from '@/components/EditOnboardingDetailsModal';
import { useAppContext } from '@/hooks/useAppContext';
import { useOverallReadiness } from '@/hooks/useOverallReadiness';
import { useSubject } from '@/contexts/SubjectContext';
import { ELEVEN_PLUS_ENGLISH_READINESS_MAP } from '@/lib/trackCurriculum';

export default function ExamReadinessDashboard() {
  const { user, profile } = useAppContext();
  const { currentSubject } = useSubject();
  const { overall, loading: overallLoading } = useOverallReadiness(user?.id, profile?.track ?? null, currentSubject);
  const [overview, setOverview] = useState<TopicReadiness[]>([]);
  const [recentHistory, setRecentHistory] = useState<ReadinessHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [historyTopic, setHistoryTopic] = useState<string | null>(null);
  const [topicHistory, setTopicHistory] = useState<ReadinessHistory[]>([]);
  const [topicHistoryLoading, setTopicHistoryLoading] = useState(false);
  const onboardingAnswers = profile?.onboarding as OnboardingAnswers | undefined;
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const trackLabel = currentSubject === 'english' ? '11+ English' : '11+ Maths';
  const targetMessage = useMemo(() => {
    const defaultMessage = 'Define your goal level in the 11+ starter answers.';
    if (!onboardingAnswers) return defaultMessage;

    if (onboardingAnswers.goalLevel) return `Goal level: ${onboardingAnswers.goalLevel}`;
    if (Array.isArray(onboardingAnswers.targetSchools) && onboardingAnswers.targetSchools.length > 0) {
      const primary = onboardingAnswers.targetSchools.slice(0, 2).join(', ');
      const extra =
        onboardingAnswers.targetSchools.length > 2
          ? ` +${onboardingAnswers.targetSchools.length - 2} more`
          : '';
      return `Target schools: ${primary}${extra}`;
    }

    return defaultMessage;
  }, [onboardingAnswers]);

const loadData = async () => {
  try {
    setLoading(true);
    const [overviewData, historyData] = await Promise.all([
      getReadinessOverview(),
      getReadinessHistory() // Get all recent history
    ]);
    
    // Filter overviewData by subject topics using the definitive curriculum map
    const isEnglish = currentSubject === 'english';
    const englishTopicTokens = Object.values(ELEVEN_PLUS_ENGLISH_READINESS_MAP).flat();
    const englishTopicKeys = Object.keys(ELEVEN_PLUS_ENGLISH_READINESS_MAP);
    
    const isEng = (topicName: string) => {
      // Must be an exact match to an english readiness key or source topic
      return englishTopicTokens.includes(topicName) || englishTopicKeys.includes(topicName);
    };
    
    // Enforce strict FE isolation between Maths and English
    const filteredOverview = overviewData.filter(topic => {
      return isEnglish ? isEng(topic.topic) : !isEng(topic.topic);
    });

    const filteredHistory = historyData.filter(hist => {
      return isEnglish ? isEng(hist.topic) : !isEng(hist.topic);
    });
    
    setOverview(filteredOverview);
    setRecentHistory(filteredHistory.slice(0, 5)); // Keep latest 5 for insights
  } catch (error) {
    console.error('Failed to load readiness data:', error);
  } finally {
    setLoading(false);
  }
};

const loadTopicHistory = async (topic: string) => {
  try {
    setTopicHistoryLoading(true);
    const history = await getReadinessHistory(topic);
    setTopicHistory(history.slice(0, 5));
  } catch (error) {
    console.error('Failed to load topic history:', error);
  } finally {
    setTopicHistoryLoading(false);
  }
};

  useEffect(() => {
    loadData();
    
    // Listen for mode changes to refresh data
    const handleModeChange = () => {
      loadData();
    };
    
    window.addEventListener('readiness-mode-changed', handleModeChange);
    
    // Set up realtime subscription to readiness_history
    if (!user?.id) return;
    
    const channel = supabase
      .channel('readiness-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'readiness_history',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Reload data when new readiness history entry is added
          loadData();
        }
      )
      .subscribe();
    
    return () => {
      window.removeEventListener('readiness-mode-changed', handleModeChange);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleEdit = (topic: string, currentReadiness: number) => {
    setEditingTopic(topic);
    setEditValue(currentReadiness.toString());
  };

  const handleSave = async (topic: string) => {
    const value = parseFloat(editValue);
    
    if (isNaN(value) || value < 0 || value > 100) {
      toast.error('Readiness must be between 0 and 100');
      return;
    }

    try {
      setSaving(true);
      await manualSetReadiness(topic, value);
      toast.success('Readiness updated successfully');
      setEditingTopic(null);
      // Reload data to show updated readiness and history
      await loadData();
    } catch (error) {
      console.error('Failed to update readiness:', error);
      toast.error('Failed to update readiness');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingTopic(null);
    setEditValue('');
  };

  const getReadinessLevel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: 'Strong', color: 'text-green-600 dark:text-green-400' };
    if (score >= 60) return { label: 'Proficient', color: 'text-blue-600 dark:text-blue-400' };
    if (score >= 40) return { label: 'Developing', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Needs Work', color: 'text-red-600 dark:text-red-400' };
  };

  const formatInsight = (hist: ReadinessHistory) => {
    // Calculate actual change from before/after values instead of using stored change
    const actualChange = hist.readiness_after - hist.readiness_before;
    const direction = actualChange > 0 ? '+' : actualChange < 0 ? '' : '';
    const changeStr = actualChange !== 0 ? `${direction}${Math.round(actualChange)}%` : 'no change';
    
    if (hist.reason === 'auto:update') {
      return `${hist.topic} ${changeStr} from recent practice`;
    }
    return `${hist.topic} manually set to ${hist.readiness_after.toFixed(1)}%`;
  };

  const trackingMode = overview.length > 0 ? overview[0].tracking_mode : 'auto';
  const isManualMode = trackingMode === 'manual';

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <Skeleton className="h-24 sm:h-28 md:h-32 w-full" />
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40 sm:h-44 md:h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="grid gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
          {/* Overall Readiness */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Overall Exam Readiness</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Aggregate readiness score across all topics
              </CardDescription>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] sm:text-xs">
                <Badge variant="outline" className="text-[11px] uppercase tracking-[0.25em]">
                  {trackLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {targetMessage}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                {/* Circular Progress Gauge */}
                <div className="relative flex-shrink-0">
                  <svg className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-secondary"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - overall / 100)}`}
                      className={`transition-all duration-500 ${
                        overall >= 80 ? 'text-green-500' :
                        overall >= 60 ? 'text-blue-500' :
                        overall >= 40 ? 'text-amber-500' :
                        'text-red-500'
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Centered percentage */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg sm:text-2xl md:text-3xl font-bold">
                      {Math.round(overall)}%
                    </span>
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1 space-y-2 sm:space-y-3 md:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="text-xl sm:text-3xl md:text-4xl font-bold transition-all duration-500">
                        {overall.toFixed(1)}%
                      </div>
                      <div className={`text-xs sm:text-sm font-medium transition-colors duration-500 ${getReadinessLevel(overall).color}`}>
                        {getReadinessLevel(overall).label}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {trackingMode === 'auto' ? 'Automatic Tracking' : 'Manual Tracking'}
                    </Badge>
                  </div>
                  <Progress value={overall} className="h-1.5 sm:h-3 transition-all duration-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Mode Info */}
          {isManualMode && (
            <Alert className="p-2 sm:p-3 md:p-4">
              <AlertDescription className="text-xs sm:text-sm">
                Automatic updates are off for your account. Set readiness percentages using the Edit button on each topic.
              </AlertDescription>
            </Alert>
          )}

          {/* Topic Breakdown */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Topic Breakdown</h3>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {overview.map(item => {
                const level = getReadinessLevel(item.readiness);
                const isEditing = editingTopic === item.topic;

                return (
                  <Card key={item.topic}>
                    <CardHeader className="p-2 sm:p-3 md:pb-3">
                      <CardTitle className="text-sm sm:text-base">{item.topic}</CardTitle>
                      <CardDescription className="text-xs">
                        Updated {formatDistanceToNow(new Date(item.last_updated), { addSuffix: true })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3 p-2 sm:p-3 pt-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 sm:h-8 text-sm"
                              autoFocus
                            />
                            <span className="text-xs sm:text-sm text-muted-foreground">%</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(item.topic)}
                              disabled={saving}
                              className="text-xs"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={saving}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xl sm:text-3xl font-bold transition-all duration-500">
                                {item.readiness.toFixed(1)}%
                              </div>
                              <div className={`text-xs font-medium transition-colors duration-500 ${level.color}`}>
                                {level.label}
                              </div>
                            </div>
                            {isManualMode && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(item.topic, item.readiness)}
                                className="text-xs"
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                          <Progress value={item.readiness} className="h-1 sm:h-2 transition-all duration-500" />
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {overview.length === 0 && (
            <Card>
              <CardContent className="py-8 sm:py-10 md:py-12 text-center p-3 sm:p-4 md:p-6">
                <div className="max-w-md mx-auto space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No readiness data yet — complete a practice to generate analytics.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your exam readiness will be calculated automatically as you complete practice sessions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Insights Panel */}
        {recentHistory.length > 0 && (
          <div className="lg:col-span-1 space-y-3 sm:space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Recent Activity</CardTitle>
                <CardDescription className="text-xs">Latest readiness updates</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {recentHistory.map((hist) => (
                    <div key={hist.id} className="flex items-start gap-2 text-xs sm:text-sm border-l-2 border-primary/20 pl-2 sm:pl-3 py-1">
                      <div className="flex-1">
                        <div className="font-medium">{formatInsight(hist)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(hist.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      {(() => {
                        const actualChange = hist.readiness_after - hist.readiness_before;
                        return actualChange !== 0 && (
                          <div className={`flex items-center gap-0.5 sm:gap-1 ${actualChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {actualChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
