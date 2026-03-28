import { supabase } from '@/integrations/supabase/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadScores, saveScore } from '@/lib/readinessApi';
import { isAbortLikeError } from '@/lib/errors';

type Pending = { v: number; ts: number };

interface ReadinessState {
  scores: Record<string, number>;     // "algebra|quadratics" -> 37
  pending: Record<string, Pending>;   // in-flight saves
  loading: boolean;
  loadedForUserId?: string;
  setLocal: (k: string, v: number) => void;
  commit: (userId: string, k: string, v: number) => Promise<void>;
  hydrate: (userId: string) => Promise<void>;
  refreshScore: (k: string) => Promise<void>;
  reset: () => void;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const useReadinessStore = create<ReadinessState>()(
  persist(
    (set, get) => ({
      scores: {},
      pending: {},
      loading: false,
      loadedForUserId: undefined,

      setLocal: (k: string, v: number) => set(s => ({ 
        scores: { ...s.scores, [k]: clamp(v) } 
      })),

      commit: async (userId, k, v) => {
        const [topic, subtopic] = k.split('|');
        const originalValue = get().scores[k];
        
        try {
          await saveScore(topic, subtopic, v);
        } catch (error) {
          if (isAbortLikeError(error)) return;
          console.error('Error saving progress:', error);
          // Rollback to original value on error
          set(s => ({ 
            scores: { ...s.scores, [k]: originalValue ?? 0 } 
          }));
        }
      },

      hydrate: async (userId: string) => {
        const { loadedForUserId } = get();
        
        // Skip if already loaded for this user
        if (loadedForUserId === userId) return;

        set({ loading: true });

        try {
          const scores = await loadScores();
          set({ 
            scores, 
            loading: false, 
            loadedForUserId: userId 
          });
        } catch (error) {
          if (isAbortLikeError(error)) {
            set({ loading: false });
            return;
          }
          console.error('Error loading readiness data:', error);
          set({ loading: false });
        }
      },

      refreshScore: async (k: string) => {
        const [topic, subtopic] = k.split('|');
        try {
          // Get current user from Supabase auth
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from('subtopic_progress')
            .select('score')
            .eq('user_id', user.id)
            .eq('topic_key', topic)
            .eq('subtopic_key', subtopic)
            .single();

          if (error) throw error;
          
          if (data) {
            set(s => ({ 
              scores: { ...s.scores, [k]: data.score } 
            }));
          }
        } catch (error) {
          if (isAbortLikeError(error)) return;
          console.error('Error refreshing score:', error);
        }
      },

      reset: () => {
        set({ 
          scores: {}, 
          pending: {},
          loading: false, 
          loadedForUserId: undefined 
        });
      }
    }),
    {
      name: 'readiness-store',
      partialize: (state) => ({ 
        scores: state.scores,
        loadedForUserId: state.loadedForUserId
      })
    }
  )
);
