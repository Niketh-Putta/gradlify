import { useEffect } from 'react';
import { useSubject } from "@/contexts/SubjectContext";
import ExamReadinessDashboard from '@/components/ExamReadinessDashboard';
import TrackingModeSettings from '@/components/TrackingModeSettings';
import { useAppContext } from '@/hooks/useAppContext';
import { resolveUserTrack } from '@/lib/track';
import { getTrackLabel } from '@/lib/trackCurriculum';

export default function ExamReadiness() {
  const { currentSubject } = useSubject();
  const { user, profile } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);

  useEffect(() => {
    if (!user) {
      window.location.href = '/auth';
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 md:py-8 max-w-7xl">
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            {getTrackLabel(userTrack, currentSubject)}
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{currentSubject === 'english' ? 'English ' : 'Maths '}Exam Readiness</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            Track your preparation progress across all 11+ {currentSubject === 'english' ? 'English' : 'maths'} sections
          </p>
        </div>

        {/* Settings */}
        <TrackingModeSettings />

        {/* Dashboard */}
        <ExamReadinessDashboard />
      </div>
    </div>
  );
}
