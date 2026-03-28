import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PremiumLoader } from "@/components/PremiumLoader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getLeaderboard, getMyGlobalOptIn, setGlobalOptIn, LeaderboardEntry } from "@/lib/connectApi";
import { Globe, Users, Target, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FoundersSprintLabel } from "@/components/FoundersSprintLabel";
import { useMembership } from "@/hooks/useMembership";
import { useAppContext } from "@/hooks/useAppContext";
import { resolveUserTrack } from "@/lib/track";

export function LeaderboardTab() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalOptIn, setGlobalOptInState] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);
  const { toast } = useToast();
  const { isFounder } = useMembership();
  const { profile } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const founderHandles = new Set(['abhi.korapati999', 'raghavjanga']);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(period, scope, userTrack);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [period, scope, userTrack]);

  const loadGlobalOptIn = useCallback(async () => {
    try {
      const optIn = await getMyGlobalOptIn();
      setGlobalOptInState(optIn);
    } catch (error) {
      console.error('Failed to load global opt-in status:', error);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
    void loadGlobalOptIn();
  }, [loadGlobalOptIn, loadLeaderboard]);

  // Poll leaderboard every 10s to keep sprint scores fresh.
  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadLeaderboard();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [loadLeaderboard]);

  const handleGlobalOptInToggle = async (checked: boolean) => {
    setOptInLoading(true);
    try {
      await setGlobalOptIn(checked);
      setGlobalOptInState(checked);
      toast({
        title: checked ? "Visible on Global leaderboard" : "Hidden from Global leaderboard",
        description: checked 
          ? "Your correct answers are now visible to everyone on the Global leaderboard."
          : "Your correct answers are now only visible to friends.",
      });
      // Refresh leaderboard if we're on global scope
      if (scope === 'global') {
        await loadLeaderboard();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update privacy settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOptInLoading(false);
    }
  };

  // Realtime updates - subscribe to practice, mock, and challenge events
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const handleRealtimeUpdate = () => {
      // Debounce refetch - shorter delay for faster updates
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadLeaderboard();
      }, 500);
    };

    const practiceChannel = supabase
      .channel('leaderboard_practice_results')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'practice_results'
        },
        handleRealtimeUpdate
      )
      .subscribe();

    const mockChannel = supabase
      .channel('leaderboard_mock_attempts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mock_attempts'
        },
        handleRealtimeUpdate
      )
      .subscribe();

    // Also listen to mock_questions for when answers are graded
    const mockQuestionsChannel = supabase
      .channel('leaderboard_mock_questions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mock_questions'
        },
        handleRealtimeUpdate
      )
      .subscribe();

    const challengeChannel = supabase
      .channel('leaderboard_extreme_results')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'extreme_results'
        },
        handleRealtimeUpdate
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(practiceChannel);
      supabase.removeChannel(mockChannel);
      supabase.removeChannel(mockQuestionsChannel);
      supabase.removeChannel(challengeChannel);
    };
  }, [loadLeaderboard]);

  const maxQuestions = leaderboard[0]?.correct_count || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v === 'day' || v === 'week' || v === 'month' ? v : 'day')}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="day">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant={scope === 'global' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScope('global')}
            >
              <Globe className="h-4 w-4 mr-2" />
              Global
            </Button>
            <Button
              variant={scope === 'friends' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScope('friends')}
            >
              <Users className="h-4 w-4 mr-2" />
              Friends
            </Button>
          </div>
        </div>

        {scope === 'global' && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {globalOptIn ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="space-y-0.5">
                    <Label htmlFor="global-opt-in" className="text-sm font-medium cursor-pointer">
                      Show my correct answers on Global leaderboard
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {globalOptIn 
                        ? "Your correct answers are visible to everyone" 
                        : "Your correct answers are only visible to friends"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="global-opt-in"
                  checked={globalOptIn}
                  onCheckedChange={handleGlobalOptInToggle}
                  disabled={optInLoading}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div>
            <FoundersSprintLabel className="mb-2" />
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Correct Answers
            </CardTitle>
            <CardDescription>
              Rankings by correct answers {period === 'day' ? 'today' : period === 'week' ? 'this week' : 'this month'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <PremiumLoader />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No study activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => {
                const showSelf = entry.is_self && !isFounder;
                const nameKey = entry.name.toLowerCase();
                const isFounderTag = entry.founder_track === 'founder' || founderHandles.has(nameKey);
                return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    showSelf
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="text-lg font-bold text-muted-foreground w-8 text-center">
                      #{entry.rank}
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback>
                        {entry.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {entry.name}
                        {showSelf && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                        {isFounderTag && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/80 border border-muted-foreground/30 px-1.5 py-0.5 rounded-full">
                            Founders&apos; circle
                          </span>
                        )}
                      </div>
                      <Progress
                        value={(entry.correct_count / maxQuestions) * 100}
                        className="h-1.5 mt-1"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                    {entry.correct_count} correct
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
