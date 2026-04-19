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

// Leaderboard functions - uses correct answers from all sources (practice, mocks, extreme)
export async function getLeaderboard(
  period: 'day' | 'week' | 'month',
  scope: 'global' | 'friends',
  track?: 'gcse' | '11plus'
): Promise<LeaderboardEntry[]> {
  const rpcName = scope === 'global' ? 'get_leaderboard_correct_global' : 'get_leaderboard_correct_friends';
  const resolvedTrack = track ?? await getUserTrack();

  const attempts = [
    { p_period: period },
  ] as const;

  let data: LeaderboardEntry[] | null = null;
  let error: unknown = null;
  if (!isLeaderboardRpcKnownMissing()) {
    for (const params of attempts) {
      const result = await supabase.rpc(rpcName, params) as {
        data: LeaderboardEntry[] | null;
        error: unknown;
      };
      data = normalizeLeaderboardData(result.data);
      error = result.error;
      if (!error) {
        clearLeaderboardRpcMissing();
        break;
      }
    }
  } else {
    const legacy = await supabase.rpc('get_leaderboard', {
      p_period: period,
      p_scope: scope,
    }) as { data: LeaderboardEntry[] | null; error: unknown };
    data = normalizeLeaderboardData(legacy.data);
    error = legacy.error;
    if (!legacy.error) {
      clearLeaderboardRpcMissing();
    }
  }

  if (error) {
    if (isAbortLikeError(error)) {
      return [];
    }
    if (isFunctionMissingError(error)) {
      markLeaderboardRpcMissing();
      const legacy = await supabase.rpc('get_leaderboard', {
        p_period: period,
        p_scope: scope,
      }) as { data: LeaderboardEntry[] | null; error: unknown };
      if (!legacy.error) {
        data = normalizeLeaderboardData(legacy.data);
        error = null;
        clearLeaderboardRpcMissing();
      } else if (!isFunctionMissingError(legacy.error)) {
        console.error('Error fetching legacy leaderboard:', legacy.error);
        throw legacy.error;
      } else {
        return [];
      }
    }
    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  const entries = (data || []).filter((entry) => entry.correct_count > 0);
  const filteredEntries = resolvedTrack === '11plus'
    ? entries.filter((entry) => !(entry.user_id ?? '').startsWith('bot-'))
    : entries;
  if (scope === 'global') {
    return addSyntheticLearners(filteredEntries, period);
  }
  return rankLeaderboardEntries(filteredEntries);
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

const SYNTHETIC_LEARNERS = [
  "Kavita S.",
  "ishaan_reddy",
  "ZoyaKhan",
  "Dev Patel",
  "Ananya Gupta",
  "samuel_okoro",
  "ElenaV",
  "Marcus B",
  "Priyanka N",
  "omar.h",
  "RachelGreen",
  "Arjun Malhotra",
  "sarah_jones",
  "Mohammad Ali",
  "Lara Silva",
  "nathan-lee",
  "SophiaChen",
  "AhmedF",
  "Clara M",
  "vikram.singh",
  "MayaDesai",
  "Liam Wilson",
  "Fatima Z",
  "ethan_walker",
  "Noah M.",
  "Amira Rahman",
  "NiyaGirish",
  "mohammedzuhr",
  "Lara_Nasc",
  "Salma B",
  "tariq_anas",
  "Keiko Kondo",
  "aaliyah_shah",
  "Omar Mendez",
  "Rhea Kapoor",
  "Yusuf T",
  "Matteo F",
  "isla_muthoni",
  "Qin Zhou",
  "nayanika_p",
  "Sergei I.",
  "Zoe Abboud",
  "Alem P",
  "Iyano Estrada",
];

const BOT_SCORE_START = 0;
const BOT_SCORE_STEP = 0;
const BOT_SCORE_MIN = 0;
const BOT_SCORE_BONUS_MIN = 0;
const BOT_SCORE_BONUS_MAX = 0;
const BOT_RANDOM_POINTS_MIN = 0;
const BOT_RANDOM_POINTS_MAX = 0;
// One-time bump applied to each bot (fixed values, generated once).
const BOT_ONE_TIME_BONUS = [
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
];
// Extra random bumps for ~half the bots (14-80). Zero means no extra bump.
const BOT_HALF_RANDOM_BONUS = [
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
];

const BOT_PERIOD_SEED = {
  day: 13,
  week: 37,
  month: 91,
} as const;

function buildSyntheticEntries(period: 'day' | 'week' | 'month'): LeaderboardEntry[] {
  const scale = getPeriodScale(period);
  return SYNTHETIC_LEARNERS.map((handle, index) => {
    const baseScore = getSyntheticScore(handle, index);
    const periodRandom = getDeterministicRandom(handle, index, period);
    const maxAdd = period === 'day'
      ? Math.round(baseScore * 0.05)
      : period === 'week'
        ? Math.round(baseScore * 0.1)
        : Math.round(baseScore * 0.2);
    const scaledScore = Math.max(
      0,
      Math.min(baseScore, Math.round((baseScore * scale) + Math.min(periodRandom, maxAdd)))
    );
    return {
      rank: 0,
      user_id: `bot-${handle}`,
      name: handle,
      avatar_url: null,
      correct_count: scaledScore,
      is_self: false,
      founder_track: null,
    };
  });
}

const BOT_BASE_SCORES = SYNTHETIC_LEARNERS.map((_, index) => {
  return 0;
});

function getBotBonus(handle: string, index: number) {
  return 0;
}

const BOT_FIXED_SCORES: Record<string, number> = {
};

function getPeriodScale(period: 'day' | 'week' | 'month') {
  if (period === 'day') return 0.12;
  if (period === 'week') return 0.45;
  return 1;
}

function getDeterministicRandom(handle: string, index: number, period: 'day' | 'week' | 'month') {
  const seedBase = [...handle].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = seedBase + (index + 1) * 97 + BOT_PERIOD_SEED[period];
  const range = BOT_RANDOM_POINTS_MAX - BOT_RANDOM_POINTS_MIN + 1;
  return BOT_RANDOM_POINTS_MIN + (seed % range);
}

function getSyntheticScore(handle: string, index: number) {
  const fixedScore = BOT_FIXED_SCORES[handle];
  if (typeof fixedScore === "number") {
    return fixedScore;
  }
  const seed = [...handle].reduce((acc, char) => acc + char.charCodeAt(0), index);
  const variation = (seed % 11) - 5; // range -5..+5
  const bonus = getBotBonus(handle, index);
  const oneTimeBonus = BOT_ONE_TIME_BONUS[index] ?? 0;
  const halfBonus = BOT_HALF_RANDOM_BONUS[index] ?? 0;
  const randomPoints = BOT_RANDOM_POINTS_MIN + (seed % (BOT_RANDOM_POINTS_MAX - BOT_RANDOM_POINTS_MIN + 1));
  if (index === 1) {
    return 207 + bonus + oneTimeBonus + halfBonus + randomPoints;
  }
  if (index === 2) {
    return 176 + bonus + oneTimeBonus + halfBonus + randomPoints;
  }
  return Math.max(
    BOT_SCORE_MIN,
    (BOT_BASE_SCORES[index] ?? BOT_SCORE_MIN) + variation + bonus + oneTimeBonus + halfBonus + randomPoints
  );
}

function addSyntheticLearners(existing: LeaderboardEntry[], period: 'day' | 'week' | 'month'): LeaderboardEntry[] {
  const syntheticEntries = buildSyntheticEntries(period);

  const combined = [...existing, ...syntheticEntries];
  combined.sort((a, b) => b.correct_count - a.correct_count);

  return combined.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
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

export function getSyntheticLeaderboardEntries(period: 'day' | 'week' | 'month'): LeaderboardEntry[] {
  return buildSyntheticEntries(period);
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
  if (receiverId.startsWith("bot-")) {
    return { id: -1, status: "sent" };
  }
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
