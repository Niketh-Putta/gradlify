import { useState, useEffect, useCallback } from "react";
import { useSubject } from "@/contexts/SubjectContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getLeaderboard,
  getFriends,
  getPendingRequests,
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  LeaderboardEntry,
  PendingFriendRequest,
  UserProfile,
  Friendship
} from "@/lib/connectApi";
import { Search, Plus, Users, X, Check, UserPlus, Trophy, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/hooks/useAppContext";
import { resolveUserTrack } from "@/lib/track";
import { SPRINT_START_AT } from "@/lib/foundersSprint";

const LEADERBOARD_SCORES_SINCE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Europe/London",
}).format(SPRINT_START_AT);
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Scope = 'global' | 'friends';

export default function Connect() {
  const { currentSubject } = useSubject();
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const [scope, setScope] = useState<Scope>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const { toast } = useToast();

  // Get current user's entry
  const myEntry = leaderboard.find((entry) => entry.is_self);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getPendingRequests(),
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  const loadLeaderboard = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const data = await getLeaderboard('sprint', scope, userTrack);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [scope, userTrack]);

  const handleFriendSearch = useCallback(async () => {
    setSearching(true);
    try {
      const results = await searchUsers(friendSearchQuery);
      setFriendSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  }, [friendSearchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  // Keep leaderboard scores moving after new mock answers are recorded.
  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadLeaderboard({ silent: true });
    }, 30000);
    return () => clearInterval(intervalId);
  }, [loadLeaderboard]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const handleRealtimeUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadLeaderboard({ silent: true });
      }, 500);
    };

    const mockAttemptsChannel = supabase
      .channel('connect_leaderboard_mock_attempts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_attempts' }, handleRealtimeUpdate)
      .subscribe();

    const mockQuestionsChannel = supabase
      .channel('connect_leaderboard_mock_questions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_questions' }, handleRealtimeUpdate)
      .subscribe();

    const liveMockAttemptsChannel = supabase
      .channel('connect_leaderboard_live_mock_attempts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_mock_attempts' }, handleRealtimeUpdate)
      .subscribe();

    const liveMockAnswersChannel = supabase
      .channel('connect_leaderboard_live_mock_answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_mock_answers' }, handleRealtimeUpdate)
      .subscribe();

    const friendChannel = supabase
      .channel('connect_friendships_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        void loadData();
        handleRealtimeUpdate();
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(mockAttemptsChannel);
      supabase.removeChannel(mockQuestionsChannel);
      supabase.removeChannel(liveMockAttemptsChannel);
      supabase.removeChannel(liveMockAnswersChannel);
      supabase.removeChannel(friendChannel);
    };
  }, [loadData, loadLeaderboard]);

  // Debounced friend search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (friendSearchQuery.length >= 2) {
        void handleFriendSearch();
      } else {
        setFriendSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [friendSearchQuery, handleFriendSearch]);

  const handleSendRequest = async (receiverId: string) => {
    setSendingTo(receiverId);
    try {
      await sendFriendRequest(receiverId);
      toast({ title: "Request sent", description: "Friend request sent successfully." });
      setFriendSearchResults(prev => prev.filter(u => u.user_id !== receiverId));
      setFriendSearchQuery("");
      setAddFriendOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({
        title: "Failed to send request",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingTo(null);
    }
  };

  const handleRespond = async (requestId: number, action: 'accept' | 'decline') => {
    setRespondingTo(requestId);
    const originalRequests = [...pendingRequests];
    setPendingRequests(prev => prev.filter(r => r.request_id !== requestId));

    try {
      await respondToFriendRequest(requestId, action);
      toast({
        title: action === 'accept' ? "Request accepted" : "Request declined",
        description: action === 'accept' ? "You are now friends!" : undefined,
      });
      if (action === 'accept') {
        await loadData();
        await loadLeaderboard({ silent: true });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${action} request.`;
      setPendingRequests(originalRequests);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRespondingTo(null);
    }
  };

  // Filter leaderboard by search
  const filteredLeaderboard = searchQuery
    ? leaderboard.filter((entry) => entry.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : leaderboard;

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-connect-gold';
    if (rank === 2) return 'text-connect-silver';
    if (rank === 3) return 'text-connect-bronze';
    return 'text-muted-foreground';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const isFriend = (userId: string) => {
    return friends.some(f => f.requester === userId || f.receiver === userId);
  };

  const getFriendshipByUserId = (userId: string) => {
    return friends.find(f => f.requester === userId || f.receiver === userId);
  };

  const handleRemoveFriendByUserId = async (userId: string, displayName: string) => {
    const friendship = getFriendshipByUserId(userId);
    if (!friendship) return;

    const confirmed = window.confirm(`Remove ${displayName} as a friend?`);
    if (!confirmed) return;

    try {
      await removeFriend(friendship.id);
      toast({
        title: "Friend removed",
        description: `${displayName} has been removed from your friends.`,
      });
      await loadData();
        await loadLeaderboard({ silent: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to remove friend.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const visibleLeaderboard = filteredLeaderboard;

  return (
    <div className="w-full max-w-2xl mx-auto px-2 sm:px-6 py-3 sm:py-4 h-full flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="mb-2 sm:mb-3 flex-shrink-0 animate-fade-in w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center bg-gradient-to-br",
              currentSubject === "english" ? "from-amber-400 to-amber-600" : "from-primary to-blue-600"
            )}>
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </div>
            <span className={cn(
              "text-[10px] sm:text-xs font-medium bg-clip-text text-transparent tracking-tight bg-gradient-to-r",
              currentSubject === "english" ? "from-amber-400 to-amber-600" : "from-primary to-blue-600"
            )}>Connect</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              <span className={cn(
                "bg-clip-text text-transparent transform-gpu",
                currentSubject === "english" 
                  ? "bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 dark:from-white dark:via-slate-200 dark:to-amber-500" 
                  : "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 dark:from-white dark:via-slate-200 dark:to-blue-500"
              )}>
                Leaderboard
              </span>
            </h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs font-light mt-0.5 truncate">Sprint: ranked by correct mock-exam answers only</p>
            <p className="text-muted-foreground text-[10px] sm:text-xs font-light truncate mb-1">Scores since {LEADERBOARD_SCORES_SINCE} (UK)</p>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider",
              currentSubject === "english" ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <Trophy className="w-3 h-3" />
              <span>Live leaderboard</span>
            </div>
          </div>

          {/* Your Position */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-baseline gap-0.5 justify-end">
                <span className="text-[10px] text-muted-foreground">#</span>
                <span className={cn(
                  "text-lg sm:text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r",
                  currentSubject === "english" ? "from-amber-400 to-amber-600" : "from-primary to-blue-600"
                )}>
                  {myEntry ? myEntry.rank : ' - '}
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">live</div>
            </div>
            <div className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-medium flex-shrink-0 bg-gradient-to-br",
              currentSubject === "english" ? "from-amber-400 to-amber-600" : "from-primary to-blue-600"
            )}>
              You
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        onClick={() => navigate("/sprint-details")}
        className="group mb-4 w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all duration-300 animate-in slide-in-from-top-4 hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
              currentSubject === "english" ? "from-amber-400 to-amber-600" : "from-primary to-blue-600"
            )}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-5 text-slate-950 sm:text-sm">
                100 pound Amazon gift card
              </p>
              <p className="text-[10px] font-black uppercase text-slate-400 sm:text-[11px]">
                Prize details &amp; rules
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </button>

      {/* Secondary Actions Row - Compact on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-shrink-0 animate-fade-in flex-wrap w-full" style={{ animationDelay: '0.05s' }}>
        {/* Your Correct Answers */}
        <div className="flex items-center gap-1 py-1 sm:py-1.5 px-2 sm:px-2.5 rounded-lg text-xs bg-muted/60">
          <span className="font-medium text-[10px] sm:text-[11px]">{myEntry?.correct_count || 0}</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">correct</span>
        </div>

        <div className="flex-1 min-w-0" />

        {/* Add Friend Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddFriendOpen(true)}
          className="flex items-center gap-1 py-1 sm:py-1.5 px-2 sm:px-3 rounded-full text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/60 h-auto"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden xs:inline">Add</span>
        </Button>
      </div>

      {/* Friend Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="mb-2 sm:mb-3 flex-shrink-0 animate-fade-in" style={{ animationDelay: '0.06s' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">Requests</span>
              <span className={cn(
                "text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[14px] text-center bg-gradient-to-r",
                currentSubject === "english" ? "from-amber-400 to-amber-600" : "from-primary to-blue-600"
              )}>
                {pendingRequests.length}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {pendingRequests.map((request) => (
              <div
                key={request.request_id}
                className="request-card rounded-lg sm:rounded-xl p-2 sm:p-3 flex-shrink-0 min-w-[150px] sm:min-w-[180px] bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6 sm:w-7 sm:h-7">
                    <AvatarImage src={request.sender_avatar || undefined} />
                    <AvatarFallback className="text-[9px] sm:text-[10px]">
                      {getInitials(request.sender_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] sm:text-xs font-medium truncate">{request.sender_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRespond(request.request_id, 'decline')}
                    disabled={respondingTo === request.request_id}
                    className="flex-1 py-1 rounded-md text-[9px] sm:text-[10px] font-medium h-auto bg-muted hover:bg-muted/80"
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRespond(request.request_id, 'accept')}
                    disabled={respondingTo === request.request_id}
                    className={cn(
                      "flex-1 py-1 rounded-md text-[9px] sm:text-[10px] font-medium h-auto hover:opacity-90",
                      currentSubject === "english" ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-primary to-blue-600"
                    )}
                  >
                    Yes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Row - Compact single line */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2 flex-shrink-0 animate-fade-in w-full" style={{ animationDelay: '0.08s' }}>
        <nav className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setScope('global')}
            className={cn(
              "text-[11px] sm:text-xs font-medium pb-1 border-b-2 transition-colors",
              scope === 'global' ? (currentSubject === "english" ? "text-amber-500 border-amber-500" : "text-primary border-primary") : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setScope('friends')}
            className={cn(
              "text-[11px] sm:text-xs font-medium pb-1 border-b-2 transition-colors",
              scope === 'friends' ? (currentSubject === "english" ? "text-amber-500 border-amber-500" : "text-primary border-primary") : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            Friends
          </button>
        </nav>

        <div className="flex-1" />

        {/* Search - Icon only on mobile */}
        <div className="relative">
          <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("text-[10px] sm:text-xs py-1 sm:py-1.5 pl-6 sm:pl-7 pr-2 sm:pr-3 rounded-full w-16 sm:w-24 h-6 sm:h-7 bg-muted/60 border-border/50", currentSubject === "english" ? "focus-visible:ring-amber-500" : "focus-visible:ring-primary")}
          />
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center gap-2 px-2 mb-1 flex-shrink-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="w-5 text-right">
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">#</span>
        </div>
        <div className="flex-1">
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Learner</span>
        </div>
        <div className="w-10 text-right">
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Correct</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="relative flex-1 min-h-0">
        <section
          className={cn(
            "overflow-y-auto leaderboard-scroll animate-fade-in h-[560px]"
          )}
          style={{ animationDelay: '0.12s' }}
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 px-2.5">
                  <Skeleton className="w-6 h-4" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-10 h-4" />
                </div>
              ))}
            </div>
          ) : visibleLeaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-xs">No results found</p>
            </div>
          ) : (
            visibleLeaderboard.map((entry, index) => {
              const isTopThree = entry.rank <= 3;
              const isYou = entry.is_self;
              const entryIsFriend = isFriend(entry.user_id);
              const canRemoveFriend = scope === 'friends' && entryIsFriend && !isYou;

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    "leaderboard-row py-2 mx-0 px-2 rounded-xl transition-colors group",
                    entry.rank <= 10 && (currentSubject === "english" ? "top-ten-highlight-english" : "top-ten-highlight"),
                    index > 0 && "border-t border-border/50",
                    isYou && (currentSubject === "english" ? "bg-amber-500/10 border-l-2 border-l-amber-500 pl-2" : "bg-primary/5 border-l-2 border-l-primary pl-2"),
                    canRemoveFriend && "cursor-pointer"
                  )}
                  onDoubleClick={() => {
                    if (!canRemoveFriend) return;
                    void handleRemoveFriendByUserId(entry.user_id, entry.name);
                  }}
                  onContextMenu={(e) => {
                    if (!canRemoveFriend) return;
                    e.preventDefault();
                    void handleRemoveFriendByUserId(entry.user_id, entry.name);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Rank */}
                    <div className="w-5 text-right flex-shrink-0">
                      <span className={cn(
                        "text-xs tabular-nums tracking-tight",
                        getRankColor(entry.rank),
                        isTopThree ? "font-semibold" : "font-normal"
                      )}>
                        {entry.rank}
                      </span>
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Avatar className={cn(
                          "w-7 h-7 flex-shrink-0",
                          isYou && (currentSubject === "english" ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-primary to-blue-600"),
                          entryIsFriend && !isYou && (currentSubject === "english" ? "ring-2 ring-offset-2 ring-offset-background ring-amber-400" : "ring-2 ring-offset-2 ring-offset-background ring-blue-400")
                        )}>
                          {isYou ? (
                            <AvatarFallback className={cn(
                              "text-white text-[11px] font-medium bg-gradient-to-br",
                              currentSubject === "english" ? "from-amber-400 to-amber-600" : "from-primary to-blue-600"
                            )}>
                              You
                            </AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage src={entry.avatar_url || undefined} />
                              <AvatarFallback className="text-[11px] font-medium bg-muted text-muted-foreground">
                                {getInitials(entry.name)}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("text-sm truncate min-w-0", isYou && "font-medium")}>
                              {isYou ? 'You' : entry.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Questions Count */}
                    <div className="text-right flex items-center gap-2 flex-shrink-0">
                      {!entryIsFriend && !isYou && (
                        <button
                          onClick={() => handleSendRequest(entry.user_id)}
                          disabled={sendingTo === entry.user_id}
                          className={cn("opacity-0 group-hover:opacity-100 text-[10px] font-medium hover:underline transition-opacity", currentSubject === "english" ? "text-amber-500" : "text-primary")}
                        >
                          + Add
                        </button>
                      )}
                      <div className="w-10 text-right">
                        <span className={cn(
                          "text-xs tabular-nums tracking-tight",
                          (isTopThree || isYou) ? "font-semibold" : "text-muted-foreground"
                        )}>
                          {entry.correct_count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

      </div>

      {/* Add Friend Modal */}
      <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter username or email..."
                value={friendSearchQuery}
                onChange={(e) => setFriendSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : friendSearchResults.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friendSearchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(user.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.full_name || 'Anonymous'}</div>
                      {user.email && (
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(user.user_id)}
                      disabled={sendingTo === user.user_id}
                    >
                      {sendingTo === user.user_id ? "..." : <UserPlus className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : friendSearchQuery.length >= 2 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">No users found</p>
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">Start typing to search</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
