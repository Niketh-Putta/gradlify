import { supabase } from '@/integrations/supabase/client';
import { useReadinessStore } from '@/lib/stores/useReadinessStore';
import { toast } from 'sonner';

const key = (topic: string, subtopic: string) => `${topic}|${subtopic}`;

const timers: Record<string, ReturnType<typeof setTimeout>> = {};
const lastSent: Record<string, number> = {};   // epoch ms "version"
const aborters: Record<string, AbortController> = {};

// Preview fallback UID when no session exists
const PREVIEW_FALLBACK_UID = '55db63bd-8f36-4793-999c-7900e63a6e6d';

/**
 * Get the current session user ID, or fallback to preview UID
 */
export async function getSessionUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || PREVIEW_FALLBACK_UID;
}

// New Exam Readiness API Types
export type TrackingMode = 'auto' | 'manual';
type UserTrack = 'gcse' | '11plus';

export interface TopicReadiness {
  topic: string;
  readiness: number;
  last_updated: string;
  overall_average: number;
  tracking_mode: TrackingMode;
}

export interface ReadinessHistory {
  id: number;
  user_id: string;
  topic: string;
  readiness_before: number | null;
  readiness_after: number;
  change: number | null;
  reason: string;
  source_id: string | null;
  created_at: string;
}

async function getCurrentTrack(userId: string): Promise<UserTrack> {
  const { data } = await supabase
    .from('profiles')
    .select('track')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.track === '11plus' || data?.track === 'eleven_plus' ? '11plus' : 'gcse';
}

export async function saveScore(topic: string, subtopic: string, raw: number): Promise<void> {
  const k = key(topic, subtopic);
  const v = Math.max(0, Math.min(100, Math.round(raw)));
  const ts = Date.now();

  lastSent[k] = ts;                       // mark this write as newest
  if (timers[k]) clearTimeout(timers[k]); // debounce
  if (aborters[k]) aborters[k].abort();   // cancel older request

  // optimistic: UI already updated via setLocal in onChange
  return new Promise<void>((resolve, reject) => {
    timers[k] = setTimeout(async () => {
      const ac = new AbortController();
      aborters[k] = ac;

      try {
        // Get current user from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Use direct upsert with proper conflict resolution
        const { error } = await supabase
          .from('subtopic_progress')
          .upsert({
            user_id: user.id,
            topic_key: topic,
            subtopic_key: subtopic,
            score: v
          }, { 
            onConflict: 'user_id,topic_key,subtopic_key' 
          });

        // If a *newer* write has been queued since this request started, do nothing.
        if (ts < (lastSent[k] ?? 0)) return resolve();

        if (error === null) {
          toast.success("Saved");
          // Update store with the value we intended to save
          useReadinessStore.setState(s => ({
            scores: { ...s.scores, [k]: v },
            pending: { ...s.pending, [k]: { v: v, ts } }
          }));
          resolve();
        } else {
          toast.error("Failed to save: " + error.message);
          reject(error);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return resolve();
        reject(error);
      }
    }, 300); // 300ms debounce feels good for sliders
  });
}

export async function loadScores(): Promise<Record<string, number>> {
  // Get current user from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  
  const { data, error } = await supabase
    .from('subtopic_progress')
    .select('topic_key, subtopic_key, score')
    .eq('user_id', user.id);

  if (error) throw error;

  const scores: Record<string, number> = {};
  data?.forEach(item => {
    const k = key(item.topic_key, item.subtopic_key);
    scores[k] = item.score;
  });

  return scores;
}

// New Exam Readiness API Functions

/**
 * Set user's tracking mode (auto or manual)
 */
export async function setTrackingMode(mode: TrackingMode): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase.rpc('set_tracking_mode', { mode });
  
  if (error) {
    throw new Error(`Failed to set tracking mode: ${error.message}`);
  }
}

/**
 * Manually set readiness for a topic (manual mode only)
 */
export async function manualSetReadiness(topic: string, readiness: number): Promise<void> {
  if (readiness < 0 || readiness > 100) {
    throw new Error('Readiness must be between 0 and 100');
  }

  const userId = await getSessionUserId();
  const { error } = await supabase.rpc('manual_set_readiness', {
    p_topic: topic,
    p_readiness: readiness
  });
  
  if (error) {
    throw new Error(`Failed to set readiness: ${error.message}`);
  }
}

/**
 * Get readiness overview for all topics
 */
export async function getReadinessOverview(): Promise<TopicReadiness[]> {
  try {
    const { data, error } = await supabase.rpc('get_readiness_overview');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('RPC readiness overview failed, falling back to view query', error);
    return fallbackReadinessOverview();
  }
}

async function fallbackReadinessOverview(): Promise<TopicReadiness[]> {
  const userId = await getSessionUserId();

  const { data: topics, error: topicsError } = await supabase
    .from('v_topic_readiness')
    .select('topic, readiness, created_at')
    .eq('user_id', userId)
    .order('topic', { ascending: true });

  if (topicsError) {
    throw new Error(`Failed to query readiness view: ${topicsError.message}`);
  }

  const total = topics?.reduce((acc, row) => acc + Number(row.readiness ?? 0), 0) ?? 0;
  const overallAverage = topics && topics.length > 0 ? Number((total / topics.length).toFixed(1)) : 0;

  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select('tracking')
    .eq('user_id', userId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(`Failed to fetch tracking mode: ${settingsError.message}`);
  }

  const tracking_mode = settings?.tracking ?? 'auto';

  return (topics || []).map((row) => ({
    topic: row.topic,
    readiness: row.readiness,
    last_updated: row.created_at,
    overall_average: overallAverage,
    tracking_mode,
  }));
}

/**
 * Get readiness history for a specific topic
 */
export async function getReadinessHistory(topic?: string): Promise<ReadinessHistory[]> {
  const userId = await getSessionUserId();
  const track = await getCurrentTrack(userId);
  let query = supabase
    .from('readiness_history')
    .select('*')
    .eq('user_id', userId)
    // TRACK ISOLATION — Prevents GCSE activity affecting 11+ readiness
    .filter('track', 'eq', track)
    .order('created_at', { ascending: false })
    .limit(50);

  if (topic) {
    query = query.eq('topic', topic);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch readiness history: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get user's current tracking mode
 */
export async function getTrackingMode(): Promise<TrackingMode> {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from('user_settings')
    .select('tracking')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    throw new Error(`Failed to fetch tracking mode: ${error.message}`);
  }
  
  return data?.tracking || 'auto';
}

/**
 * Insert a practice result (will trigger auto-update if in auto mode)
 */
export async function insertPracticeResult(params: {
  topic: string;
  attempts: number;
  correct: number;
  difficulty?: string;
  sessionId?: string;
  startedAt?: Date;
  finishedAt?: Date;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const userId = await getSessionUserId();

  const { error } = await supabase
    .from('practice_results')
    .insert({
      user_id: userId,
      topic: params.topic,
      attempts: params.attempts,
      correct: params.correct,
      difficulty: params.difficulty,
      session_id: params.sessionId,
      started_at: params.startedAt?.toISOString(),
      finished_at: params.finishedAt?.toISOString(),
      meta: params.meta
    });
  
  if (error) {
    throw new Error(`Failed to insert practice result: ${error.message}`);
  }
}
