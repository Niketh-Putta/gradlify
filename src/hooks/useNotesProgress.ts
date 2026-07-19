import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveUserTrack } from '@/lib/track';
import { countCompletedNotesInCurriculum, getValidNoteSlugs } from '@/lib/notesProgress';
import { useAppContext } from '@/hooks/useAppContext';
import { useSubject } from '@/contexts/SubjectContext';
import { isAbortLikeError } from '@/lib/errors';

export function useNotesProgress() {
  const { user, profile } = useAppContext();
  const { currentSubject } = useSubject();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === '11plus';
  const subject = currentSubject === 'english' ? 'english' : 'maths';

  const validSlugs = useMemo(
    () => getValidNoteSlugs(userTrack, subject),
    [userTrack, subject],
  );
  const totalNotes = validSlugs.size;
  const notesLabel = isElevenPlus ? 'Mini-topics' : 'Topics';

  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchNotesProgress = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setCompletedCount(0);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);

      try {
        const { data, error } = await supabase
          .from('notes_progress')
          .select('topic_slug, done')
          .eq('user_id', user.id)
          .eq('done', true);

        if (error) throw error;

        const doneSlugs = (data ?? [])
          .map((item) => String(item.topic_slug || '').trim())
          .filter(Boolean);

        // Only count notes that belong to the current track/subject curriculum.
        // Prevents GCSE leftovers showing as 49/16 on 11+.
        const inCurriculum = countCompletedNotesInCurriculum(doneSlugs, validSlugs);
        if (!cancelled) {
          setCompletedCount(Math.min(inCurriculum, validSlugs.size));
        }
      } catch (error) {
        if (isAbortLikeError(error)) return;
        console.error('Error fetching notes progress:', error);
        if (!cancelled) setCompletedCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchNotesProgress();
    return () => {
      cancelled = true;
    };
  }, [user?.id, validSlugs]);

  const progressPercentage =
    totalNotes > 0 ? Math.min(100, Math.round((completedCount / totalNotes) * 100)) : 0;

  return {
    completedCount,
    totalNotes,
    notesLabel,
    progressPercentage,
    loading,
  };
}
