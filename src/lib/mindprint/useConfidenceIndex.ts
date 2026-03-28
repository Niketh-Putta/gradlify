import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConfidenceIndex {
  confidentCorrect: number;
  confidentWrong: number;
  unsureCorrect: number;
  unsureWrong: number;
  confidenceAccuracy: number; // 0-1
  summary: string;
}

export function useConfidenceIndex() {
  const [data, setData] = useState<ConfidenceIndex | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch mindprint summary
      const { data: summary } = await supabase
        .from('mindprint_summary')
        .select('*')
        .eq('user_id', user.id)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      // Fetch events with confidence data (last 200 rows)
      const { data: events } = await supabase
        .from('mindprint_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!events || events.length === 0) {
        setData({
          confidentCorrect: 0,
          confidentWrong: 0,
          unsureCorrect: 0,
          unsureWrong: 0,
          confidenceAccuracy: 0,
          summary: 'Not enough confidence data yet',
        });
        setLoading(false);
        return;
      }

      const stats = {
        confidentCorrect: 0,
        confidentWrong: 0,
        unsureCorrect: 0,
        unsureWrong: 0,
      };

      events.forEach(event => {
        if (event.confidence === 'confident') {
          if (event.correct) stats.confidentCorrect++;
          else stats.confidentWrong++;
        } else if (event.confidence === 'unsure') {
          if (event.correct) stats.unsureCorrect++;
          else stats.unsureWrong++;
        }
      });

      const confidenceAccuracy = summary?.confidence_accuracy || 0;
      
      // Calculate underestimation/overestimation
      const unsureRate = stats.unsureCorrect / (stats.unsureCorrect + stats.unsureWrong || 1);
      const confidentRate = stats.confidentCorrect / (stats.confidentCorrect + stats.confidentWrong || 1);
      const diff = Math.round((unsureRate - confidentRate) * 100);

      let summary_text = 'Your confidence matches your performance';
      if (diff > 5) {
        summary_text = `You underestimate yourself by ${diff}%`;
      } else if (diff < -5) {
        summary_text = `You overestimate yourself by ${Math.abs(diff)}%`;
      }

      setData({
        ...stats,
        confidenceAccuracy,
        summary: summary_text,
      });
    } catch (error) {
      console.error('Error in useConfidenceIndex:', error);
      setData({
        confidentCorrect: 0,
        confidentWrong: 0,
        unsureCorrect: 0,
        unsureWrong: 0,
        confidenceAccuracy: 0,
        summary: 'Error loading confidence data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, refresh };
}
