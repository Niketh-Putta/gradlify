import { useEffect } from 'react';
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";
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
          <span className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold mb-3",
            currentSubject === 'english' 
              ? "border-amber-500/25 bg-amber-500/10 text-amber-600" 
              : "border-primary/25 bg-primary/10 text-primary"
          )}>
            {getTrackLabel(userTrack, currentSubject)}
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            <span className={cn(
              "bg-clip-text text-transparent transform-gpu",
              currentSubject === "english" 
                ? "bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 dark:from-white dark:via-slate-200 dark:to-amber-500" 
                : "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 dark:from-white dark:via-slate-200 dark:to-blue-500"
            )}>
              {currentSubject === 'english' ? 'English ' : 'Maths '}Exam Readiness
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 max-w-2xl">
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
