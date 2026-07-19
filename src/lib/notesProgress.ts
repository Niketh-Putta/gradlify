import notesData from '@/data/edexcel_gcse_notes.json';
import { getTrackSections, type TrackSection } from '@/lib/trackCurriculum';
import type { UserTrack } from '@/lib/track';

type NotesTopic = { slug?: string };

/** Valid note topic_slugs for the active track + subject (denominator + filter for completed). */
export function getValidNoteSlugs(
  track: UserTrack,
  subject: 'maths' | 'english' = 'maths',
): Set<string> {
  if (track === '11plus') {
    const sections = getTrackSections(track, subject);
    return new Set(
      sections.flatMap((section: TrackSection) =>
        section.subtopics.map((subtopic) => `${section.key}-${subtopic.key}`),
      ),
    );
  }

  const slugs = new Set<string>();
  Object.values(notesData as Record<string, NotesTopic[]>).forEach((topics) => {
    if (!Array.isArray(topics)) return;
    topics.forEach((topic) => {
      const slug = String(topic?.slug || '').trim();
      if (slug) slugs.add(slug);
    });
  });
  return slugs;
}

export function countCompletedNotesInCurriculum(
  doneSlugs: Iterable<string>,
  validSlugs: Set<string>,
): number {
  let count = 0;
  for (const slug of doneSlugs) {
    const key = String(slug || '').trim();
    if (key && validSlugs.has(key)) count += 1;
  }
  return count;
}
