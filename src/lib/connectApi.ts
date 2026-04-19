import { supabase } from "@/integrations/supabase/client";
import { isAbortLikeError } from "@/lib/errors";
import {
  clearLeaderboardRpcMissing,
  isFunctionMissingError,
  isLeaderboardRpcKnownMissing,
  markLeaderboardRpcMissing,
} from "@/lib/schemaCompatibility";

const PREVIEW_FALLBACK_UID = "55db63bd-8f36-4793-999c-7900e63a6e6d";

async function getSessionUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || PREVIEW_FALLBACK_UID;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  correct_count: number;
  is_self: boolean;
  founder_track?: 'competitor' | 'founder' | null;
}

export interface SprintTopEntry {
  rank: number;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  correct_count: number;
  captured_at: string;
}

export interface Friendship {
  id: number;
  requester: string;
  receiver: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  receiver_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface PendingFriendRequest {
  request_id: number;
  requester_id: string;
  sender_name: string;
  sender_email: string;
  sender_avatar: string | null;
  sent_at: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

async function getUserTrack(): Promise<'gcse' | '11plus'> {
  const userId = await getSessionUserId();
  if (!userId || userId === PREVIEW_FALLBACK_UID) return 'gcse';
  const { data } = await supabase
    .from('profiles')
    .select('track')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.track === '11plus' ? '11plus' : 'gcse';
}

type SearchProfileRow = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  [key: string]: unknown;
};

type PendingRequestRow = {
  request_id: number;
  sender_id: string;
  sender_name: string;
  sender_email: string | null;
  sent_at: string;
  [key: string]: unknown;
};

const normalizeLeaderboardData = (rows: unknown): LeaderboardEntry[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const score =
      Number(item.correct_count ?? item.total_questions ?? item.points ?? 0) || 0;
    return {
      rank: Number(item.rank ?? index + 1) || index + 1,
      user_id: String(item.user_id ?? ''),
      name: String(item.name ?? item.display_name ?? item.email ?? 'Learner'),
      avatar_url: typeof item.avatar_url === 'string' ? item.avatar_url : null,
      correct_count: score,
      is_self: Boolean(item.is_self),
      founder_track:
        item.founder_track === 'founder' || item.founder_track === 'competitor'
          ? (item.founder_track as 'founder' | 'competitor')
          : null,
    };
  });
};

// Leaderboard functions - uses persistent leaderboard_score updated only by mocks
export async function getLeaderboard(
  period: 'day' | 'week' | 'month',
  scope: 'global' | 'friends',
  track?: 'gcse' | '11plus'
): Promise<LeaderboardEntry[]> {
  const rpcName = scope === 'global' ? 'get_leaderboard_correct_global' : 'get_leaderboard_correct_friends';
  const resolvedTrack = track ?? await getUserTrack();

  try {
    const { data, error } = await supabase.rpc(rpcName, { p_period: period }) as {
      data: LeaderboardEntry[] | null;
      error: unknown;
    };

    if (!error && data) {
      const entries = normalizeLeaderboardData(data) || [];
      return rankLeaderboardEntries(entries);
    }
    
    // IF RPC FAILS (likely due to missing migration), FALLBACK TO RAW CALCULATION
    console.warn('Leaderboard RPC failed, falling back to raw calculation...', error);
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    // Use April 19 8pm as the start for the sprint if it's the current sprint
    const sprintStart = new Date('2026-04-19T20:00:00Z');
    
    // Fetch all scored mocks since sprint start
    const { data: mocks, error: mockError } = await supabase
      .from('mock_attempts')
      .select('user_id, score, track')
      .gte('created_at', sprintStart.toISOString())
      .in('status', ['scored', 'completed', 'submitted'])
      .eq('track', resolvedTrack);

    if (mockError || !mocks) return [];

    const uids = [...new Set(mocks.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, founder_track')
      .in('user_id', uids);

    const profMap = new Map();
    profiles?.forEach(p => profMap.set(p.user_id, p));

    const userScores = new Map();
    mocks.forEach(m => {
      const current = userScores.get(m.user_id) || 0;
      userScores.set(m.user_id, current + (m.score || 0));
    });

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const entries: LeaderboardEntry[] = Array.from(userScores.entries()).map(([uid, score]) => {
      const p = profMap.get(uid);
      return {
        user_id: uid,
        name: p?.full_name || 'Anonymous',
        avatar_url: p?.avatar_url || null,
        correct_count: score,
        is_self: uid === currentUser?.id,
        rank: 0,
        founder_track: p?.founder_track || null
      };
    }).filter(e => e.correct_count > 0);

    return rankLeaderboardEntries(entries);
  } catch (err) {
    console.error('Final fallback error:', err);
    return [];
  }
}

export async function getSprintTop10(sprintId: string): Promise<SprintTopEntry[]> {
  const { data, error } = await supabase.rpc('get_sprint_top10', {
    p_sprint_id: sprintId,
  }) as { data: SprintTopEntry[] | null; error: unknown };

  if (error) {
    console.error('Error fetching sprint top 10:', error);
    return [];
  }

  return data || [];
}

export async function captureSprintTop10IfDue(sprintId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('capture_sprint_top10_if_due', {
    p_sprint_id: sprintId,
  }) as { data: boolean | null; error: unknown };

  if (error) {
    console.error('Error capturing sprint top 10:', error);
    return false;
  }

  return Boolean(data);
}

function rankLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.correct_count !== a.correct_count) {
      return b.correct_count - a.correct_count;
    }
    const nameComparison = String(a.name ?? '').localeCompare(String(b.name ?? ''));
    if (nameComparison !== 0) {
      return nameComparison;
    }
    if (a.user_id && b.user_id) {
      return a.user_id.localeCompare(b.user_id);
    }
    return 0;
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export async function getMyGlobalOptIn(): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_my_global_opt_in');

  if (error) {
    console.error('Error fetching global opt-in status:', error);
    return false;
  }

  return data || false;
}

export async function setGlobalOptIn(optIn: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_global_opt_in', {
    p_opt_in: optIn
  });

  if (error) {
    console.error('Error setting global opt-in status:', error);
    throw error;
  }
}

// Study activity functions
export async function trackStudyActivity(minutes: number, activityDate?: Date) {
  const userId = await getSessionUserId();
  
  const { error } = await supabase
    .from('study_activity')
    .insert({
      user_id: userId,
      minutes,
      activity_date: activityDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    });

  if (error) {
    console.error('Error tracking study activity:', error);
    throw error;
  }
}

// Friendship functions
export async function searchUsers(query: string): Promise<UserProfile[]> {
  if (!query.trim()) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_profiles', { 
    q: query.trim() 
  }) as { data: SearchProfileRow[] | null; error: unknown };

  if (error) {
    console.error('Error searching users:', error);
    throw error;
  }

  return (data || []).map(profile => ({
    user_id: profile.user_id,
    full_name: profile.name,
    avatar_url: profile.avatar_url,
    email: profile.email
  }));
}

export async function sendFriendRequest(receiverId: string) {
  const { data, error } = await supabase.rpc('send_friend_request' as never, {
    p_receiver: receiverId
  }) as { data: { id: number; status: string } | null; error: unknown };

  if (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }

  return data;
}

export async function respondToFriendRequest(
  requestId: number,
  action: 'accept' | 'decline'
): Promise<void> {
  const { error } = await supabase
    .rpc('respond_friend_request', {
      p_request_id: requestId,
      p_action: action
    });

  if (error) {
    console.error('Error responding to friend request:', error);
    throw error;
  }
}

export async function removeFriend(friendshipId: number) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}

export async function getPendingRequests(): Promise<PendingFriendRequest[]> {
  const { data, error } = await supabase
    .rpc('get_pending_friend_requests') as { data: PendingRequestRow[] | null; error: unknown };

  if (error) {
    console.error('Error fetching pending requests:', error);
    throw error;
  }

  return (data || []).map(req => ({
    request_id: req.request_id,
    requester_id: req.sender_id,
    sender_name: req.sender_name,
    sender_email: req.sender_email,
    sender_avatar: null,
    sent_at: req.sent_at
  }));
}

export async function getFriends(): Promise<Friendship[]> {
  const userId = await getSessionUserId();

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester.eq.${userId},receiver.eq.${userId}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching friends:', error);
    throw error;
  }

  if (!friendships || friendships.length === 0) return [];

  // Fetch profiles separately
  const userIds = [...new Set(friendships.flatMap(f => [f.requester, f.receiver]))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name:full_name, avatar_url:avatar_url')
    .in('user_id', userIds) as { data: UserProfile[] | null; error: unknown };

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  return friendships.map(f => ({
    ...f,
    status: f.status as 'pending' | 'accepted' | 'declined',
    requester_profile: profileMap.get(f.requester) ? {
      full_name: profileMap.get(f.requester)!.full_name || 'Anonymous',
      avatar_url: profileMap.get(f.requester)!.avatar_url
    } : undefined,
    receiver_profile: profileMap.get(f.receiver) ? {
      full_name: profileMap.get(f.receiver)!.full_name || 'Anonymous',
      avatar_url: profileMap.get(f.receiver)!.avatar_url
    } : undefined
  }));
}
