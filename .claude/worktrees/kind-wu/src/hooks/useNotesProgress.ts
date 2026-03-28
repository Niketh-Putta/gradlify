import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveUserTrack } from '@/lib/track';
import { getTrackSections } from '@/lib/trackCurriculum';
import notesData from '@/data/edexcel_gcse_notes.json';
import { useAppContext } from '@/hooks/useAppContext';
import { isAbortLikeError } from '@/lib/errors';

export function useNotesProgress() {
  const { user, profile } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === '11plus';
  const trackSections = getTrackSections(userTrack);
  const gcseTopicCount = useMemo(
    () => Object.values(notesData).reduce((sum, section) => sum + (Array.isArray(section) ? section.length : 0), 0),
    [],
  );
  const elevenPlusSubtopicCount = useMemo(
    () => trackSections.reduce((sum, section) => sum + section.subtopics.length, 0),
    [trackSections],
  );
  const totalNotes = isElevenPlus ? elevenPlusSubtopicCount : gcseTopicCount;
  const notesLabel = isElevenPlus ? 'Mini-topics' : 'Topics';
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotesProgress = async () => {
      if (!user?.id) {
        setCompletedCount(0);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('notes_progress')
          .select('topic_slug, done')
          .eq('user_id', user.id)
          .eq('done', true);

        if (error) throw error;

        const uniqueSlugs = new Set(
          (data ?? []).map((item) => String(item.topic_slug || '').trim()).filter(Boolean),
        );
        setCompletedCount(uniqueSlugs.size);
      } catch (error) {
        if (isAbortLikeError(error)) return;
        console.error('Error fetching notes progress:', error);
        setCompletedCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotesProgress();
  }, [user?.id]);

  const progressPercentage = totalNotes > 0 ? Math.round((completedCount / totalNotes) * 100) : 0;

  return {
    completedCount,
    totalNotes,
    notesLabel,
    progressPercentage,
    loading,
  };
}
