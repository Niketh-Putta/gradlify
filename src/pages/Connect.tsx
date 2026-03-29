import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getLeaderboard,
  getMyGlobalOptIn,
  setGlobalOptIn,
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
import { Search, Plus, Eye, EyeOff, Users, X, Check, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/hooks/useAppContext";
import { resolveUserTrack } from "@/lib/track";

type Period = 'day' | 'week' | 'month';
type Scope = 'global' | 'friends';

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);

const getWeekRange = () => {
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay();
  const diff = (day + 6) % 7;
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
};

const padTime = (value: number) => String(value).padStart(2, "0");

export default function Connect() {
  const { profile } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const [period, setPeriod] = useState<Period>('month');
  const [scope, setScope] = useState<Scope>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalOptIn, setGlobalOptInState] = useState(true);
  const [optInLoading, setOptInLoading] = useState(false);
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
  const myEntry = leaderboard.find(e => e.is_self);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [friendsData, requestsData, optIn] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getMyGlobalOptIn()
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
      setGlobalOptInState(optIn);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  const loadLeaderboard = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const data = await getLeaderboard(period, scope, userTrack);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [period, scope, userTrack]);

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

  // Poll leaderboard every 60s to keep scores fresh without UI flicker.
  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadLeaderboard({ silent: true });
    }, 60000);
    return () => clearInterval(intervalId);
  }, [loadLeaderboard]);

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

  const loadGlobalOptIn = async () => {
    try {
      const optIn = await getMyGlobalOptIn();
      setGlobalOptInState(optIn);
    } catch (error) {
      console.error('Failed to load global opt-in status:', error);
    }
  };

  const handleGlobalOptInToggle = async () => {
    const newValue = !globalOptIn;
    setOptInLoading(true);
    try {
      await setGlobalOptIn(newValue);
      setGlobalOptInState(newValue);
      toast({
        title: newValue ? "Visible on leaderboard" : "Hidden from leaderboard",
        description: newValue
          ? "Your correct answers are now visible to everyone."
          : "Your correct answers are now only visible to friends.",
      });
      if (scope === 'global') {
        await loadLeaderboard({ silent: true });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update privacy settings.",
        variant: "destructive",
      });
    } finally {
      setOptInLoading(false);
    }
  };

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

  // Realtime updates
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const handleRealtimeUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadLeaderboard({ silent: true });
      }, 500);
    };

    const practiceChannel = supabase
      .channel('leaderboard_practice_results')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'practice_results' }, handleRealtimeUpdate)
      .subscribe();

    const mockChannel = supabase
      .channel('leaderboard_mock_attempts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_attempts' }, handleRealtimeUpdate)
      .subscribe();

    const friendChannel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadData())
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(practiceChannel);
      supabase.removeChannel(mockChannel);
      supabase.removeChannel(friendChannel);
    };
  }, [loadData, loadLeaderboard]);

  // Filter leaderboard by search
  const filteredLeaderboard = searchQuery
    ? leaderboard.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : leaderboard;

  const periodLabels: Record<Period, string> = {
    day: 'today',
    week: 'this week',
    month: 'this month',
  };

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

  const periodDescriptor = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      const { start, end } = getWeekRange();
      return `Weekly leaderboard (Mon–Sun ${formatDate(start)} – ${formatDate(end)})`;
    }
    if (period === "month") {
      const { start, end } = getMonthRange();
      return `Monthly leaderboard: ${formatDate(start)} – ${formatDate(end)}`;
    }
    return `Daily leaderboard (${formatDate(now)})`;
  }, [period]);

  const displayLeaderboard = filteredLeaderboard;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-3 sm:py-4 h-full flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="mb-2 sm:mb-3 flex-shrink-0 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent tracking-tight">Connect</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs font-light mt-0.5 truncate">Ranked by correct answers</p>
            <p className="text-muted-foreground text-[10px] sm:text-xs font-light truncate">{periodDescriptor}</p>
          </div>

          {/* Your Position */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-baseline gap-0.5 justify-end">
                <span className="text-[10px] text-muted-foreground">#</span>
                <span className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                  {globalOptIn && myEntry ? myEntry.rank : '—'}
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">{periodLabels[period]}</div>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-medium flex-shrink-0">
              You
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Actions Row - Compact on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-shrink-0 animate-fade-in flex-wrap" style={{ animationDelay: '0.05s' }}>
        {/* Visibility Toggle */}
        <button
          onClick={handleGlobalOptInToggle}
          disabled={optInLoading}
          className="flex items-center gap-1.5 py-1 sm:py-1.5 px-2 sm:px-2.5 rounded-lg text-xs bg-muted/60"
        >
          {globalOptIn ? (
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
          ) : (
            <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
          )}
          <div 
            className={cn(
              "w-6 h-3.5 sm:w-7 sm:h-4 rounded-full relative transition-colors flex-shrink-0",
              globalOptIn ? "bg-gradient-to-r from-primary to-indigo-500" : "bg-border"
            )}
          >
            <div 
              className={cn(
                "absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white top-0.5 transition-transform shadow-sm",
                globalOptIn ? "translate-x-3 sm:translate-x-3.5" : "translate-x-0.5"
              )}
            />
          </div>
        </button>

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
              <span className="bg-gradient-to-r from-primary to-indigo-500 text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[14px] text-center">
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
                    className="flex-1 py-1 rounded-md text-[9px] sm:text-[10px] font-medium h-auto bg-gradient-to-r from-primary to-indigo-500 hover:opacity-90"
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
      <div className="flex items-center gap-2 sm:gap-4 mb-1.5 sm:mb-2 flex-shrink-0 animate-fade-in" style={{ animationDelay: '0.08s' }}>
        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setScope('global')}
            className={cn(
              "text-[11px] sm:text-xs font-medium pb-1 border-b-2 transition-colors",
              scope === 'global' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setScope('friends')}
            className={cn(
              "text-[11px] sm:text-xs font-medium pb-1 border-b-2 transition-colors",
              scope === 'friends' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            Friends
          </button>
        </nav>

        <div className="flex-1" />

        {/* Time Period Filters */}
        <div className="flex items-center p-0.5 rounded-xl sm:rounded-2xl bg-muted/60">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-medium rounded-lg sm:rounded-xl transition-all",
                period === p
                  ? "bg-gradient-to-r from-primary to-indigo-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === 'day' ? 'D' : p === 'week' ? 'W' : 'M'}
            </button>
          ))}
        </div>

        {/* Search - Icon only on mobile */}
        <div className="relative">
          <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-[10px] sm:text-xs py-1 sm:py-1.5 pl-6 sm:pl-7 pr-2 sm:pr-3 rounded-full w-16 sm:w-24 h-6 sm:h-7 bg-muted/60 border-border/50 focus-visible:ring-primary"
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
      <section
        className="overflow-y-auto leaderboard-scroll animate-fade-in h-[560px]"
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
        ) : displayLeaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-xs">No results found</p>
          </div>
        ) : (
          displayLeaderboard.map((entry, index) => {
            const isTopThree = entry.rank <= 3;
            const isYou = entry.is_self;
            const entryIsFriend = isFriend(entry.user_id);
            const canRemoveFriend = scope === 'friends' && entryIsFriend && !isYou;

            return (
              <div
                key={entry.user_id}
                className={cn(
                  "leaderboard-row py-2.5 mx-[-10px] px-2.5 rounded-xl transition-colors group",
                  entry.rank <= 10 && "top-ten-highlight",
                  index > 0 && "border-t border-border/50",
                  isYou && "bg-primary/5 border-l-2 border-l-primary ml-[-12px] pl-3",
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
                        isYou && "bg-gradient-to-br from-primary to-indigo-500",
                        entryIsFriend && !isYou && "ring-2 ring-offset-2 ring-offset-background ring-indigo-500"
                      )}>
                        {isYou ? (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-500 text-white text-[11px] font-medium">
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
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-primary font-medium hover:underline transition-opacity"
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
