import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeOverallReadinessFromTopics } from '@/lib/readinessUtils';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import { isAbortLikeError } from '@/lib/errors';

// Canonical topics in fixed order
const CANONICAL_TOPICS = [
  'Number',
  'Algebra',
  'Ratio & Proportion',
  'Geometry',
  'Probability',
  'Statistics'
] as const;

const normalizeTopicName = (topic: string): (typeof CANONICAL_TOPICS)[number] | null => {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'number') return 'Number';
  if (normalized === 'algebra') return 'Algebra';
  if (normalized === 'ratio & proportion' || normalized === 'ratio and proportion' || normalized === 'ratio') {
    return 'Ratio & Proportion';
  }
  if (
    normalized === 'geometry' ||
    normalized === 'geometry & measures' ||
    normalized === 'geometry and measures'
  ) {
    return 'Geometry';
  }
  // "Problem Solving / Exam Preparation" is intentionally not assessed as readiness.
  if (
    normalized === 'problem solving' ||
    normalized === 'problem-solving' ||
    normalized === 'problem solving & strategies' ||
    normalized === 'exam preparation'
  ) {
    return null;
  }
  if (normalized === 'probability') return 'Probability';
  if (normalized === 'statistics') return 'Statistics';
  return null;
};

const normalizeTrack = (track?: string | null): 'gcse' | '11plus' => {
  if (!track) return 'gcse';
  const normalized = String(track).trim().toLowerCase();
  if (normalized === '11+' || normalized === '11 plus' || normalized === 'eleven plus') return '11plus';
  if (normalized === '11plus' || normalized === 'eleven_plus') return '11plus';
  return 'gcse';
};

const trackMatches = (rowTrack: string | null | undefined, resolvedTrack: 'gcse' | '11plus') => {
  if (resolvedTrack === '11plus') return rowTrack === '11plus' || rowTrack === 'eleven_plus';
  return rowTrack === 'gcse' || rowTrack == null;
};

interface TopicReadiness {
  topic: string;
  readiness: number;
  created_at: string;
}

interface TopicLastChange {
  topic: string;
  delta: number;
  reason: string;
  created_at: string;
  readiness_before: number;
  readiness_after: number;
}

interface ReadinessHistory {
  id: number;
  topic: string;
  readiness_before: number;
  readiness_after: number;
  change: number;
  reason: string;
  created_at: string;
  source_id?: string | null;
  track?: 'gcse' | '11plus';
}

interface AIReadinessEvent {
  id: number;
  topic: string;
  correct: boolean;
  model_reasoning: string | null;
  created_at: string;
}

export function useReadiness(userId?: string, trackKey?: string | null) {
  const [overall, setOverall] = useState<number>(0);
  const [topics, setTopics] = useState<TopicReadiness[]>([]);
  const [lastChanges, setLastChanges] = useState<Map<string, TopicLastChange>>(new Map());
  const [history, setHistory] = useState<ReadinessHistory[]>([]);
  const [latestChange, setLatestChange] = useState<ReadinessHistory | null>(null);
  const [latestAIEvent, setLatestAIEvent] = useState<AIReadinessEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoReadiness, setAutoReadiness] = useState<boolean>(false);
  const resolvedTrack = normalizeTrack(trackKey);

  // Merge fetched topics with canonical list
  const mergeTopics = useCallback((fetchedTopics: TopicReadiness[]): TopicReadiness[] => {
    const topicsMap = new Map<string, TopicReadiness>();

    fetchedTopics.forEach((topic) => {
      const normalized = normalizeTopicName(topic.topic);
      if (!normalized) return;
      topicsMap.set(normalized, {
        ...topic,
        topic: normalized,
      });
    });

    return CANONICAL_TOPICS.map(topic => ({
      topic,
      readiness: topicsMap.get(topic)?.readiness || 0,
      created_at: topicsMap.get(topic)?.created_at || new Date().toISOString(),
    }));
  }, []);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchLastChangeRows = useCallback(async () => {
    const base = supabase
      .from('v_topic_last_change' as never)
      .select('*')
      .eq('user_id', userId);
    if (resolvedTrack === '11plus') {
      return base.eq('track', '11plus');
    }
    return base.or('track.eq.gcse,track.is.null');
  }, [userId, resolvedTrack]);

  const fetchHistoryRows = useCallback(async (limit: number) => {
    const base = supabase
      .from('readiness_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (resolvedTrack === '11plus') {
      return base.eq('track', '11plus');
    }
    return base.or('track.eq.gcse,track.is.null');
  }, [userId, resolvedTrack]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const fetchTopicRows = async () => {
        let result = await supabase
          .from('v_topic_readiness')
          .select('*')
          .eq('user_id', userId)
          .filter('track', 'eq', resolvedTrack)
          .order('topic');

        if (result.error && /column .*track does not exist/i.test(result.error.message ?? '')) {
          result = await supabase
            .from('v_topic_readiness')
            .select('*')
            .eq('user_id', userId)
            .order('topic');
        }

        return result;
      };

      const [
        settingsResult,
        topicsResult,
        lastChangesResult,
        historyResult,
      ] = await Promise.all([
        supabase
          .from('user_settings')
          .select('auto_readiness')
          .eq('user_id', userId)
          .maybeSingle(),
        fetchTopicRows(),
        fetchLastChangeRows(),
        fetchHistoryRows(10),
      ]);

      if (settingsResult.error) throw settingsResult.error;
      if (topicsResult.error) throw topicsResult.error;
      if (lastChangesResult.error) throw lastChangesResult.error;
      if (historyResult.error) throw historyResult.error;

      if (settingsResult.data) {
        setAutoReadiness(settingsResult.data.auto_readiness || false);
      }

      const mergedTopics = mergeTopics((topicsResult.data as TopicReadiness[]) || []);
      setTopics(mergedTopics);
      setOverall(computeOverallReadinessFromTopics(mergedTopics));

      const lastChangeRows = (lastChangesResult.data ?? []) as TopicLastChange[];
      const changesMap = new Map(
        lastChangeRows
          .map((change) => {
            const normalized = normalizeTopicName(change.topic);
            return normalized ? [normalized, { ...change, topic: normalized }] as const : null;
          })
          .filter((entry): entry is [string, TopicLastChange] => Boolean(entry))
      );
      setLastChanges(changesMap);

      const historyRows = ((historyResult.data ?? []) as ReadinessHistory[]).filter((entry) =>
        trackMatches(entry.track, resolvedTrack)
      );
      setHistory(historyRows);
      setLatestChange(historyRows.length > 0 ? historyRows[0] : null);
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error('Error loading readiness data:', error);
      toast.error('Failed to load readiness data');
    } finally {
      setLoading(false);
    }
  }, [userId, mergeTopics, resolvedTrack, fetchHistoryRows, fetchLastChangeRows]);

  // Debounced refresh function
  const debouncedRefresh = useCallback(async () => {
    if (!userId) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const fetchTopicRows = async () => {
          let result = await supabase
            .from('v_topic_readiness')
            .select('*')
            .eq('user_id', userId)
            .filter('track', 'eq', resolvedTrack)
            .order('topic');

          if (result.error && /column .*track does not exist/i.test(result.error.message ?? '')) {
            result = await supabase
              .from('v_topic_readiness')
              .select('*')
              .eq('user_id', userId)
              .order('topic');
          }

          return result;
        };

        const [
          topicsResult,
          lastChangesResult,
          latestHistoryResult,
        ] = await Promise.all([
          fetchTopicRows(),
          fetchLastChangeRows(),
          fetchHistoryRows(1),
        ]);

        const mergedTopics = mergeTopics((topicsResult.data as TopicReadiness[]) || []);
        setTopics(mergedTopics);
        setOverall(computeOverallReadinessFromTopics(mergedTopics));

        const lastChangeRows = (lastChangesResult.data ?? []) as TopicLastChange[];
        if (lastChangeRows.length) {
          const changesMap = new Map(
            lastChangeRows
              .map((change) => {
                const normalized = normalizeTopicName(change.topic);
                return normalized ? [normalized, { ...change, topic: normalized }] as const : null;
              })
              .filter((entry): entry is [string, TopicLastChange] => Boolean(entry))
          );
          setLastChanges(changesMap);
        }

        const latestRows = ((latestHistoryResult.data ?? []) as ReadinessHistory[]).filter((entry) =>
          trackMatches(entry.track, resolvedTrack)
        );
        if (latestRows.length > 0) {
          setLatestChange(latestRows[0]);
        }
      } catch (error) {
        if (isAbortLikeError(error)) return;
        console.error('Error refreshing readiness:', error);
      }
    }, 300);
  }, [userId, mergeTopics, resolvedTrack, fetchHistoryRows, fetchLastChangeRows]);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, loadData, resolvedTrack]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    // Subscribe to readiness_history INSERT events
    const historyChannel = supabase
      .channel('history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'readiness_history',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newEntry = payload.new as ReadinessHistory;
          if (!trackMatches(newEntry.track, resolvedTrack)) return;
          console.log('[Readiness] New history entry received:', {
            topic: newEntry.topic,
            reason: newEntry.reason,
            before: newEntry.readiness_before,
            after: newEntry.readiness_after,
            change: newEntry.change,
            created_at: newEntry.created_at,
          });
          
          // Add to history
          setHistory((prev) => [newEntry, ...prev.slice(0, 9)]);
          
          // Trigger debounced refresh of topics and overall
          debouncedRefresh();
          
          // Show toast for auto updates
          if (newEntry.reason === 'ai_inference') {
            const change = newEntry.change || 0;
            const sign = change > 0 ? '+' : '';
            const autoLabel = AI_FEATURE_ENABLED ? 'AI' : 'Auto';
            toast.success(
              `${autoLabel} updated ${newEntry.topic}: ${sign}${change.toFixed(1)}%`,
              { duration: 4000 }
            );
          }
        }
      )
      .subscribe();

    // Subscribe to AI events
    const aiChannel = supabase
      .channel('ai-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_readiness_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newEvent = payload.new as AIReadinessEvent;
          setLatestAIEvent(newEvent);
        }
      )
      .subscribe();

    // Subscribe to user_settings changes
    const settingsChannel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newAutoReadiness = payload.new.auto_readiness;
          if (newAutoReadiness !== undefined) {
            setAutoReadiness(newAutoReadiness);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(aiChannel);
      supabase.removeChannel(settingsChannel);
      
      // Clear debounce timer on cleanup
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [userId, mergeTopics, debouncedRefresh, resolvedTrack]);

  // Manual progress update
  const logChange = useCallback(
    async (topic: string, before: number, after: number, reason: string) => {
      if (!userId) return;

      try {
        const { error } = await supabase.rpc('log_readiness_change', {
          p_topic: topic,
          p_before: before,
          p_after: after,
          p_reason: reason,
        });

        if (error) throw error;

        toast.success('Progress updated successfully');
        return true;
      } catch (error) {
        console.error('Error logging change:', error);
        toast.error('Failed to update progress');
        return false;
      }
    },
    [userId]
  );

  // Toggle auto readiness
  const toggleAutoReadiness = useCallback(async () => {
    if (!userId) return;

    const newValue = !autoReadiness;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          auto_readiness: newValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setAutoReadiness(newValue);
      const autoLabel = AI_FEATURE_ENABLED ? 'AI' : 'Auto';
      toast.success(`${autoLabel} auto-update ${newValue ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error('Error toggling auto readiness:', error);
      toast.error('Failed to update setting');
      return false;
    }
  }, [userId, autoReadiness]);

  return {
    overall,
    topics,
    lastChanges,
    history,
    latestChange,
    latestAIEvent,
    loading,
    autoReadiness,
    logChange,
    toggleAutoReadiness,
    clearAIEvent: () => setLatestAIEvent(null),
    refresh: loadData,
  };
}
