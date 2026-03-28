import { create } from 'zustand';

type ReadinessState = {
  bySubtopic: Record<string, number>; // "topic_key.subtopic_key" -> 0..100
  byTopic: Record<string, number>; // topic_key -> average %
  overall: number; // overall average %
  lastSavedAt?: string;
  isHydrated: boolean;
  loading: boolean;
  saving: boolean;
  setBySubtopic: (map: Record<string, number>) => void;
  setSubtopicScore: (id: string, score: number) => void;
  setSavedAt: (iso?: string) => void;
  setHydrated: (hydrated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  recalculate: () => void;
  reset: () => void;
};

const TOPIC_CONFIG = {
  number: { name: 'Number' },
  algebra: { name: 'Algebra' },
  ratio: { name: 'Ratio & Proportion' },
  geometry: { name: 'Geometry & Measures' },
  probability: { name: 'Probability' },
  statistics: { name: 'Statistics' }
};

export const useReadiness = create<ReadinessState>((set, get) => ({
  bySubtopic: {},
  byTopic: {},
  overall: 0,
  isHydrated: false,
  loading: false,
  saving: false,
  setBySubtopic: (bySubtopic) => set({ bySubtopic }),
  setSubtopicScore: (id, score) => set((state) => ({ 
    bySubtopic: { ...state.bySubtopic, [id]: score } 
  })),
  setSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  setHydrated: (isHydrated) => set({ isHydrated }),
  setLoading: (loading) => set({ loading }),
  setSaving: (saving) => set({ saving }),
  recalculate: () => {
    const state = get();
    const topicTotals: Record<string, { sum: number; count: number }> = {};
    
    // Group subtopics by topic and calculate averages
    Object.entries(state.bySubtopic).forEach(([key, score]) => {
      const [topicKey] = key.split('.');
      if (!topicTotals[topicKey]) {
        topicTotals[topicKey] = { sum: 0, count: 0 };
      }
      topicTotals[topicKey].sum += score;
      topicTotals[topicKey].count += 1;
    });
    
    const byTopic: Record<string, number> = {};
    Object.entries(topicTotals).forEach(([topicKey, { sum, count }]) => {
      byTopic[topicKey] = count > 0 ? Math.round(sum / count) : 0;
    });
    
    // Calculate overall average from all subtopics
    const subtopicScores = Object.values(state.bySubtopic);
    const overall = subtopicScores.length > 0 
      ? Math.round(subtopicScores.reduce((sum, score) => sum + score, 0) / subtopicScores.length)
      : 0;
      
    set({ byTopic, overall });
  },
  reset: () => set({ 
    bySubtopic: {}, 
    byTopic: {}, 
    overall: 0, 
    isHydrated: false, 
    loading: false, 
    saving: false,
    lastSavedAt: undefined 
  }),
}));