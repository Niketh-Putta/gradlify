import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MindprintOverview {
  efficiencyScore: number;
  peakHours: string;
  topError: string;
  updatedAt: string;
  lastAnswerCount: number;
  aiSummary?: string;
}

export function useMindprintOverview() {
  const [data, setData] = useState<MindprintOverview | null>(null);
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

      // Fetch event count
      const { count } = await supabase
        .from('mindprint_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (summary) {
        type TopError = { type?: string; [key: string]: unknown };
        const topErrors = summary.top_errors as TopError[] | null;
        const topError = topErrors && topErrors.length > 0
          ? topErrors[0].type ?? 'No errors yet'
          : 'No errors yet';

        const lastUpdated = summary.last_updated 
          ? getRelativeTime(new Date(summary.last_updated))
          : 'Never';

        setData({
          efficiencyScore: summary.efficiency_score || 0,
          peakHours: summary.peak_hours || 'Not enough data',
          topError,
          updatedAt: lastUpdated,
          lastAnswerCount: count || 0,
          aiSummary: summary.ai_summary || undefined,
        });
      } else {
        // No summary yet - show default state
        setData({
          efficiencyScore: 0,
          peakHours: 'Not enough data',
          topError: 'No data yet',
          updatedAt: 'Never',
          lastAnswerCount: count || 0,
          aiSummary: undefined,
        });
      }
    } catch (error) {
      console.error('Error in useMindprintOverview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, refresh };
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
