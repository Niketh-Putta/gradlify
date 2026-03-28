import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { computeOverallReadinessFromTopics } from '@/lib/readinessUtils';
import { isAbortLikeError } from '@/lib/errors';

const CANONICAL_TOPICS = [
  'Number',
  'Algebra',
  'Ratio & Proportion',
  'Geometry',
  'Probability',
  'Statistics'
] as const;

type TopicReadiness = {
  topic: string;
  readiness: number;
};

const normalizeTrack = (track?: string | null): 'gcse' | '11plus' =>
  track === '11plus' || track === 'eleven_plus' ? '11plus' : 'gcse';

export function useOverallReadiness(userId?: string, trackKey?: string | null) {
  const [overall, setOverall] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const resolveTrack = useCallback(async (): Promise<'gcse' | '11plus'> => {
    if (trackKey) return normalizeTrack(trackKey);
    if (!userId) return 'gcse';

    const { data } = await supabase
      .from('profiles')
      .select('track')
      .eq('user_id', userId)
      .maybeSingle();

    return normalizeTrack((data as { track?: string | null } | null)?.track ?? null);
  }, [trackKey, userId]);

  const refreshReadiness = useCallback(async () => {
    if (!userId) {
      setOverall(0);
      setLoading(false);
      return;
    }

    try {
      const resolvedTrack = await resolveTrack();
      const runQuery = async (withTrack: boolean) => {
        let query = supabase
          .from('v_topic_readiness')
          .select('*')
          .eq('user_id', userId)
          .order('topic');

        if (withTrack) {
          query = query.filter('track', 'eq', resolvedTrack);
        }

        return query;
      };

      let { data: topicsData, error } = await runQuery(true);
      if (error && /column .*track does not exist/i.test(error.message ?? '')) {
        ({ data: topicsData, error } = await runQuery(false));
      }
      if (error) throw error;

      const topics = (topicsData as TopicReadiness[]) || [];
      const merged = CANONICAL_TOPICS.map((topic) => {
        const match = topics.find((t) => t.topic === topic);
        return {
          topic,
          readiness: match ? match.readiness : 0,
        };
      });

      setOverall(computeOverallReadinessFromTopics(merged));
    } catch (error) {
      if (isAbortLikeError(error)) return;
      console.error('Error fetching overall readiness:', error);
      setOverall(0);
    } finally {
      setLoading(false);
    }
  }, [userId, resolveTrack]);

  useEffect(() => {
    // Track switch must reset readiness state
    setOverall(0);
    setLoading(true);
    refreshReadiness();

    if (!userId) return;

    const channel = supabase
      .channel('readiness-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'readiness_history',
          filter: `user_id=eq.${userId}`
        },
        () => {
          refreshReadiness();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshReadiness, userId, trackKey]);

  useEffect(() => {
    const handleTrackSwitched = () => {
      // Track switch must reset readiness state
      setOverall(0);
      setLoading(true);
      void refreshReadiness();
    };
    window.addEventListener('track-switched', handleTrackSwitched);
    return () => {
      window.removeEventListener('track-switched', handleTrackSwitched);
    };
  }, [refreshReadiness]);

  return { overall, loading, refresh: refreshReadiness };
}
