import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MistakeGene {
  type: string;
  frequencyPct: number;
  trend: 'up' | 'down' | 'stable';
  example: string;
}

export function useMistakeGenome() {
  const [data, setData] = useState<MistakeGene[]>([]);
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

      if (summary?.top_errors && Array.isArray(summary.top_errors)) {
        // Fetch the last 200 events to get examples for each error type
        const { data: events } = await supabase
          .from('mindprint_events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(200);

        type TopError = { type?: string; percentage?: number; [key: string]: unknown };
        const topErrors = summary.top_errors as TopError[];
        const genes: MistakeGene[] = topErrors.map((error, index: number) => {
          const errorType = error.type || 'Unknown Error';
          // Find an example from events for this error type
          const exampleEvent = events?.find(e => 
            !e.correct && e.wrong_reason === errorType
          );
          
          return {
            type: errorType,
            frequencyPct: Math.round(error.percentage || 0),
            trend: index === 0 ? 'up' : index === 1 ? 'stable' : 'down',
            example: exampleEvent?.wrong_reason || errorType,
          };
        });
        setData(genes);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Error in useMistakeGenome:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, refresh };
}
