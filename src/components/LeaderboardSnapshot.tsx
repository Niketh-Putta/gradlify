import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeaderboard, LeaderboardEntry } from "@/lib/connectApi";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/useMembership";
import { useAppContext } from "@/hooks/useAppContext";
import { resolveUserTrack } from "@/lib/track";
import { isAbortLikeError } from "@/lib/errors";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";

export function LeaderboardSnapshot() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isFounder } = useMembership();
  const { profile } = useAppContext();
  const { currentSubject } = useSubject();
  const userTrack = resolveUserTrack(profile?.track ?? null);

  useEffect(() => {
    loadLeaderboard();
  }, [userTrack]);

  // Realtime updates
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const handleRealtimeUpdate = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadLeaderboard();
      }, 2000);
    };

    const practiceChannel = supabase
      .channel('practice_snapshot_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'practice_results' }, handleRealtimeUpdate)
      .subscribe();

    const mockChannel = supabase
      .channel('mock_snapshot_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_attempts' }, handleRealtimeUpdate)
      .subscribe();

    const mockQuestionsChannel = supabase
      .channel('mock_questions_snapshot_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_questions' }, handleRealtimeUpdate)
      .subscribe();

    const challengeChannel = supabase
      .channel('challenge_snapshot_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'extreme_results' }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(practiceChannel);
      supabase.removeChannel(mockChannel);
      supabase.removeChannel(mockQuestionsChannel);
      supabase.removeChannel(challengeChannel);
    };
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard('month', 'global', userTrack);
      setLeaderboard(data.slice(0, 4));
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxQuestions = leaderboard[0]?.correct_count || 1;
  const currentUser = isFounder ? null : leaderboard.find(e => e.is_self);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Top Learners This Month
            </CardTitle>
            <CardDescription>Correct answers</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No activity recorded this week
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {leaderboard.map((entry) => {
                const showSelf = entry.is_self && !isFounder;
                return (
                <div key={entry.user_id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="text-sm font-bold text-muted-foreground w-6">
                      #{entry.rank}
                    </div>
                    <Avatar className={cn("h-10 w-10 border-2", currentSubject === 'english' ? "border-amber-500/20" : "border-primary/20")}>
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback>
                        {entry.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {entry.name}
                        {showSelf && (
                           <span className={cn("ml-1 text-xs", currentSubject === 'english' ? "text-amber-500" : "text-primary")}>(You)</span>
                        )}
                      </div>
                      <Progress
                        value={(entry.correct_count / maxQuestions) * 100}
                        indicatorClassName={currentSubject === 'english' ? "bg-amber-500" : undefined}
                        className="h-1 mt-1"
                      />
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {entry.correct_count} correct
                  </div>
                </div>
              )})}
            </div>

            {currentUser && currentUser.rank > 3 && (
              <div className="pt-3 border-t">
                <div className={cn("flex items-center gap-3 p-2 rounded-lg", currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10")}>
                  <div className={cn("text-sm font-bold w-6", currentSubject === 'english' ? "text-amber-500" : "text-primary")}>
                    #{currentUser.rank}
                  </div>
                  <Avatar className={cn("h-8 w-8 border-2", currentSubject === 'english' ? "border-amber-500" : "border-primary")}>
                    <AvatarImage src={currentUser.avatar_url || undefined} />
                    <AvatarFallback>
                      {currentUser.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Your rank</div>
                  </div>
                  <div className={cn("text-xs font-semibold", currentSubject === 'english' ? "text-amber-500" : "text-primary")}>
                    {currentUser.correct_count} correct
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/connect')}
            >
              View Full Leaderboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
