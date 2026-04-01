import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapCell {
  day: string;
  hourBlock: string;
  score: number; // 0-100
}

export interface EnergyHeatmap {
  cells: HeatmapCell[];
  insights: string[];
  sparkline: number[]; // last 7 days accuracy
}

export function useEnergyHeatmap() {
  const [data, setData] = useState<EnergyHeatmap | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch ALL mindprint events for cumulative heatmap (no limit, no date filter)
      // This ensures historical data is never lost
      const { data: events } = await supabase
        .from('mindprint_events')
        .select('created_at, correct')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!events || events.length === 0) {
        // No data yet - show empty state
        setData({
          cells: [],
          insights: ['Complete more questions to see your energy patterns'],
          sparkline: [],
        });
        setLoading(false);
        return;
      }

      // Build heatmap
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const hourBlocks = ['6-9', '9-12', '12-15', '15-18', '18-21', '21-24'];
      
      const cellStats: Record<string, { correct: number; total: number }> = {};

      events.forEach(event => {
        const date = new Date(event.created_at);
        const jsDay = date.getDay(); // 0=Sunday, 1=Monday, etc.
        // Convert to Monday=0 format
        const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
        const dayOfWeek = days[dayIndex];
        const hour = date.getHours();
        
        let hourBlock = '6-9';
        if (hour >= 9 && hour < 12) hourBlock = '9-12';
        else if (hour >= 12 && hour < 15) hourBlock = '12-15';
        else if (hour >= 15 && hour < 18) hourBlock = '15-18';
        else if (hour >= 18 && hour < 21) hourBlock = '18-21';
        else if (hour >= 21 || hour < 6) hourBlock = '21-24';

        const key = `${dayOfWeek}-${hourBlock}`;
        if (!cellStats[key]) {
          cellStats[key] = { correct: 0, total: 0 };
        }
        cellStats[key].total++;
        if (event.correct) cellStats[key].correct++;
      });

      const cells: HeatmapCell[] = [];
      days.forEach(day => {
        hourBlocks.forEach(hourBlock => {
          const key = `${day}-${hourBlock}`;
          const stats = cellStats[key];
          // Only calculate score if there's data, otherwise use -1 to indicate no data
          const score = stats ? Math.round((stats.correct / stats.total) * 100) : -1;
          cells.push({ day, hourBlock, score });
        });
      });

      // Calculate sparkline (last 7 days)
      const sparkline: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayEvents = events.filter(e => {
          const eventDate = new Date(e.created_at);
          return eventDate.toDateString() === date.toDateString();
        });
        
        if (dayEvents.length > 0) {
          const correct = dayEvents.filter(e => e.correct).length;
          sparkline.push(Math.round((correct / dayEvents.length) * 100));
        } else {
          sparkline.push(0);
        }
      }

      // Generate insights
      const insights: string[] = [];
      const cellsWithData = cells.filter(c => c.score >= 0);
      
      if (cellsWithData.length > 0) {
        const bestPerformance = cellsWithData.reduce((best, cell) => 
          cell.score > best.score ? cell : best
        );
        insights.push(`Peak performance: ${bestPerformance.day} ${bestPerformance.hourBlock}`);
      } else {
        insights.push('Complete more questions to see your peak hours');
      }

      setData({ cells, insights, sparkline });
    } catch (error) {
      console.error('Error in useEnergyHeatmap:', error);
      setData({
        cells: [],
        insights: ['Error loading energy data'],
        sparkline: [],
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
