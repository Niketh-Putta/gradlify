import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  getFriends,
  getPendingRequests,
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  Friendship,
  PendingFriendRequest,
  UserProfile
} from "@/lib/connectApi";
import { Search, UserPlus, Check, X, UserMinus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export function FriendsTab() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [optimisticRequests, setOptimisticRequests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getPendingRequests()
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
    } catch (error) {
      console.error('Failed to load friends data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load friends and requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription for friendships
  useEffect(() => {
    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          // Reload data on any friendship change
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        void handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleSendRequest = async (receiverId: string) => {
    setSendingTo(receiverId);
    // Optimistic update
    setOptimisticRequests(prev => new Set(prev).add(receiverId));
    const isBotRecipient = receiverId.startsWith("bot-");
    
    if (isBotRecipient) {
      toast({
        title: "Request sent",
        description: "Your friend request has been sent successfully",
      });
      setSearchResults(prev => prev.filter(u => u.user_id !== receiverId));
      setSearchQuery("");
      setSendingTo(null);
      return;
    }

    try {
      await sendFriendRequest(receiverId);
      
      toast({
        title: "Request sent",
        description: "Your friend request has been sent successfully",
      });
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.user_id !== receiverId));
      setSearchQuery("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again later";
      // Revert optimistic update
      setOptimisticRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(receiverId);
        return newSet;
      });
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
    
    // Optimistic update - remove from pending immediately
    const originalRequests = [...pendingRequests];
    setPendingRequests(prev => prev.filter(r => r.request_id !== requestId));
    
    try {
      await respondToFriendRequest(requestId, action);
      toast({
        title: action === 'accept' ? "Request accepted" : "Request declined",
        description: action === 'accept' ? "You are now friends!" : undefined,
      });
      // Reload to get updated friends list if accepted
      if (action === 'accept') {
        await loadData();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${action} friend request`;
      // Revert on error
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

  const handleRemove = async (id: number) => {
    try {
      await removeFriend(id);
      toast({ title: "Friend removed" });
      loadData();
    } catch (error) {
      toast({
        title: "Failed to remove friend",
        variant: "destructive"
      });
    }
  };

  // Check if user is already friend or has pending request
  const isUserUnavailable = (userId: string) => {
    const isFriend = friends.some(f => 
      f.requester === userId || f.receiver === userId
    );
    const hasPendingRequest = optimisticRequests.has(userId);
    return isFriend || hasPendingRequest;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Left Column: Find Friends */}
      <Card className="md:col-span-1 lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Find Friends
          </CardTitle>
          <CardDescription>Search for users by name or email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {searching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((user) => {
                const unavailable = isUserUnavailable(user.user_id);
                return (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {(user.full_name || 'U').substring(0, 2).toUpperCase()}
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
                      disabled={sendingTo === user.user_id || unavailable}
                    >
                      {sendingTo === user.user_id ? "Sending..." : unavailable ? "Added" : <UserPlus className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No users found
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Start typing to search for friends
            </div>
          )}
        </CardContent>
      </Card>

      {/* Middle Column: Friend Requests */}
      <Card className="md:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friend Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Pending requests from other users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4 md:p-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2 w-full md:w-auto">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No pending requests
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const sentAt = new Date(request.sent_at);
                const isNew = Date.now() - sentAt.getTime() < 48 * 60 * 60 * 1000;
                const displayName = request.sender_name || 'Deleted user';
                const initials = displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .substring(0, 2);
                const isDeleted = !request.sender_name;
                
                return (
                  <div
                    key={request.request_id}
                    className="rounded-2xl border border-border bg-card p-4 md:p-5 hover:bg-accent/30 transition-colors"
                    role="article"
                    aria-label={`Friend request from ${displayName}`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5">
                      {/* Avatar */}
                      <Avatar className={`h-10 w-10 shrink-0 ${isDeleted ? 'opacity-50' : ''}`}>
                        <AvatarImage src={request.sender_avatar || undefined} alt={`${displayName}'s avatar`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info Section */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 
                            className="text-base md:text-lg font-medium truncate max-w-[220px] md:max-w-[320px]" 
                            title={displayName}
                          >
                            {displayName}
                          </h4>
                          {isNew && !isDeleted && (
                            <Badge 
                              className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-blue-600/20 text-blue-300 border-0"
                              aria-label="New request"
                            >
                              New
                            </Badge>
                          )}
                        </div>
                        {request.sender_email && (
                          <p 
                            className="text-sm text-muted-foreground truncate max-w-[220px] md:max-w-[320px]"
                            title={request.sender_email}
                          >
                            {request.sender_email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Sent {formatDistanceToNow(sentAt, { addSuffix: true })}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 w-full md:w-auto md:ml-auto justify-end mt-3 md:mt-0">
                        <Button
                          size="sm"
                          onClick={() => handleRespond(request.request_id, 'accept')}
                          disabled={respondingTo === request.request_id || isDeleted}
                          className="gap-1.5 px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`Accept friend request from ${displayName}`}
                        >
                          {respondingTo === request.request_id ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              <span className="sr-only">Accepting...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" aria-hidden="true" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRespond(request.request_id, 'decline')}
                          disabled={respondingTo === request.request_id}
                          className="gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`Decline friend request from ${displayName}`}
                        >
                          {respondingTo === request.request_id ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              <span className="sr-only">Declining...</span>
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4" aria-hidden="true" />
                              Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Your Friends */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Friends
            {friends.length > 0 && (
              <Badge variant="secondary">{friends.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Connected friends</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No friends yet. Start by searching for users to connect with.
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friendship) => {
                const profile = friendship.requester_profile || friendship.receiver_profile;
                return (
                  <div
                    key={friendship.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{profile?.full_name || 'Anonymous'}</div>
                      <div className="text-xs text-muted-foreground">
                        Friends since {new Date(friendship.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(friendship.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
