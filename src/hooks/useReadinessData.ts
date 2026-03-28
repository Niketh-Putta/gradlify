import { useEffect, useMemo, useCallback } from 'react';
import { useReadiness } from '@/lib/stores/readiness';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';
import { isAbortLikeError } from '@/lib/errors';

export function useReadinessData(userId?: string) {
  const { 
    bySubtopic, 
    byTopic,
    overall,
    setBySubtopic, 
    isHydrated, 
    setHydrated, 
    loading, 
    setLoading,
    saving,
    setSaving,
    setSubtopicScore,
    setSavedAt,
    recalculate,
    reset
  } = useReadiness();

  // Reset store when user changes
  useEffect(() => {
    if (!userId) {
      reset();
      return;
    }
  }, [userId, reset]);

  // Load data from database
  const loadFromDB = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subtopic_progress')
        .select('topic_key, subtopic_key, score')
        .eq('user_id', userId);

      if (!error && data) {
        const newMap: Record<string, number> = {};
        data.forEach(d => {
          const key = `${d.topic_key}.${d.subtopic_key}`;
          newMap[key] = d.score;
        });
        setBySubtopic(newMap);
        // Recalculate will be triggered by the store after setBySubtopic
      }
      setHydrated(true);
    } catch (error) {
      if (isAbortLikeError(error)) {
        setHydrated(true);
        return;
      }
      console.error('Error loading readiness data:', error);
      toast.error('Failed to load readiness data');
      setHydrated(true);
    } finally {
      setLoading(false);
    }
  }, [setBySubtopic, setHydrated, setLoading]);

  // Hydrate data once per user
  useEffect(() => {
    if (!userId) return;
    
    if (!isHydrated) {
      loadFromDB(userId);
    }
  }, [userId, isHydrated, loadFromDB]);

  // Recalculate derived values when subtopic data changes
  useEffect(() => {
    if (isHydrated) {
      recalculate();
    }
  }, [bySubtopic, isHydrated, recalculate]);

  // Debounced save function using new RPC
  const saveProgress = useMemo(() => 
    debounce(async (topicKey: string, subtopicKey: string, score: number, originalScore: number) => {
      if (!userId) return;

      setSaving(true);
      try {
        const { data, error } = await supabase.rpc('upsert_subtopic_progress', {
          p_topic_key: topicKey,
          p_subtopic_key: subtopicKey, 
          p_score: Math.max(0, Math.min(100, Math.round(score)))
        });

        if (error) {
          // Rollback on error
          setSubtopicScore(`${topicKey}.${subtopicKey}`, originalScore);
          throw error;
        }

        setSavedAt(new Date().toISOString());
        toast.success('Saved', { 
          duration: 2000,
          position: 'bottom-right'
        });
      } catch (error) {
        if (isAbortLikeError(error)) return;
        console.error('Error saving progress:', error);
        toast.error('Failed to save progress');
      } finally {
        setSaving(false);
      }
    }, 300), 
    [userId, setSubtopicScore, setSavedAt, setSaving]
  );

  // Handler for slider changes with optimistic updates
  const updateScore = (key: string, score: number) => {
    const [topicKey, subtopicKey] = key.split('.');
    const originalScore = bySubtopic[key] || 0;
    
    // Optimistic update
    setSubtopicScore(key, score);
    
    // Save to database with rollback capability
    saveProgress(topicKey, subtopicKey, score, originalScore);
  };

  return { 
    loading, 
    saving,
    bySubtopic, 
    byTopic,
    overall,
    isHydrated, 
    updateScore,
    loadFromDB: () => userId ? loadFromDB(userId) : Promise.resolve()
  };
}
