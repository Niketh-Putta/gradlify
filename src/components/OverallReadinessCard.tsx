import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverallReadiness } from '@/hooks/useOverallReadiness';
import { getReadinessHistory, type ReadinessHistory } from '@/lib/readinessApi';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import { isAbortLikeError } from '@/lib/errors';
import { elevenPlusReadinessLabel, nextElevenPlusBand } from '@/lib/readinessHelpers';
import { useSubject } from '@/contexts/SubjectContext';
import { cn } from '@/lib/utils';

interface OverallReadinessCardProps {
  userId?: string;
  trackKey?: string | null;
  className?: string;
  id?: string;
  'data-animate'?: boolean;
  onClick?: () => void;
  currentGrade?: string;
  targetGrade?: string;
  overallOverride?: number;
  loadingOverride?: boolean;
}

export function OverallReadinessCard({
  userId,
  trackKey,
  className,
  id,
  'data-animate': dataAnimate,
  onClick,
  currentGrade,
  targetGrade,
  overallOverride,
  loadingOverride,
}: OverallReadinessCardProps) {
  const { overall, loading: overallLoading } = useOverallReadiness(userId, trackKey);
  const { currentSubject } = useSubject();
  const [latestChange, setLatestChange] = useState<ReadinessHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const displayOverall = Number.isFinite(overallOverride) ? Number(overallOverride) : overall;
  const displayOverallLoading = loadingOverride ?? overallLoading;
  const normalizedTrack = String(trackKey ?? '').trim().toLowerCase();
  const isElevenPlusTrack =
    normalizedTrack === '11plus' ||
    normalizedTrack === '11+' ||
    normalizedTrack === 'eleven_plus' ||
    normalizedTrack === 'eleven plus';
  const currentReadinessBand = isElevenPlusTrack ? elevenPlusReadinessLabel(displayOverall) : null;
  const nextReadinessBand = isElevenPlusTrack ? nextElevenPlusBand(displayOverall) : null;

  useEffect(() => {
    const loadLatestChange = async () => {
      try {
        setLoadingHistory(true);
        const history = await getReadinessHistory();
        if (history.length > 0) {
          setLatestChange(history[0]);
        }
      } catch (error) {
        if (isAbortLikeError(error)) return;
        console.error('Failed to load readiness history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (userId) {
      loadLatestChange();
    }
  }, [userId]);

  const getReadinessLabel = (score: number): string => {
    if (score >= 80) return 'ready';
    if (score >= 60) return 'ready';
    if (score >= 40) return 'ready';
    return 'ready';
  };

  const getColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const meter = useMemo(() => {
    const clamped = Number.isFinite(displayOverall) ? Math.min(100, Math.max(0, displayOverall)) : 0;
    // Keep the marker inside the pill at the ends.
    const marker = Math.min(98, Math.max(2, clamped));
    return { clamped, marker };
  }, [displayOverall]);

  const gauge = useMemo(() => {
    const clamped = Number.isFinite(displayOverall) ? Math.min(100, Math.max(0, displayOverall)) : 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - clamped / 100);
    return { clamped, radius, circumference, dashOffset };
  }, [displayOverall]);

  const formatSource = (reason: string): string => {
    if (reason === 'auto:update') return 'via Practice';
    if (reason === 'manual:update') return 'via Manual Update';
    if (reason === 'mock') return 'via Mock Exam';
    if (reason === 'ai_inference') return AI_FEATURE_ENABLED ? 'via AI Chat' : 'via Practice';
    return reason;
  };

  if (displayOverallLoading || loadingHistory) {
    return (
      <Card className={className} id={id} data-animate={dataAnimate}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`${className} ${onClick ? 'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]' : ''}`} 
      id={id} 
      data-animate={dataAnimate}
      onClick={onClick}
    >
      <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg md:text-xl">Overall Exam Readiness</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {isElevenPlusTrack
            ? `Your average selective readiness across all 11+ ${currentSubject === 'english' ? 'English' : 'Maths'} sections`
            : `Your average readiness across all GCSE ${currentSubject === 'english' ? 'English' : 'Maths'} topics`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3">
        <div className="space-y-3 sm:space-y-4">
          {/* Readiness Meter (stylised pill) */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="min-w-[92px]">
              <div className={cn(
                 "text-3xl sm:text-4xl font-bold font-gradlify bg-clip-text text-transparent leading-none",
                 currentSubject === 'english' ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-gradlify"
              )}>
                {meter.clamped.toFixed(0)}%
              </div>
              <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {getReadinessLabel(meter.clamped)}
              </div>
            </div>

            <div className="flex-1">
              <div className="relative h-7 sm:h-8 rounded-full bg-muted/40 border border-border/40 overflow-hidden shadow-card">
                {/* Subtle tick marks */}
                <div className="absolute inset-0 flex justify-between px-3 opacity-50">
                  <div className="w-px h-full bg-border/60" />
                  <div className="w-px h-full bg-border/40" />
                  <div className="w-px h-full bg-border/60" />
                  <div className="w-px h-full bg-border/40" />
                  <div className="w-px h-full bg-border/60" />
                </div>

                {/* Fill */}
                <div
                  className={cn(
                     "absolute left-0 top-0 h-full rounded-full shadow-glow transition-all duration-700 ease-out",
                     currentSubject === 'english' ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-gradlify"
                  )}
                  style={{ width: `${meter.clamped}%` }}
                >
                  {/* Shine */}
                  <div className={cn(
                     "absolute inset-0 bg-gradient-to-r from-transparent to-transparent",
                     currentSubject === 'english' ? "via-amber-500/20" : "via-primary/20"
                  )} />
                </div>

                {/* Marker */}
                <div
                  className={cn(
                     "absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-background border shadow-sm",
                     currentSubject === 'english' ? "border-amber-500/40" : "border-primary/40"
                  )}
                  style={{ left: `calc(${meter.marker}% - 0.5rem)` }}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-2 flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {!isElevenPlusTrack && (currentGrade || targetGrade) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              {currentGrade && (
                <span>
                  Current grade:{' '}
                  <span className="font-semibold text-foreground">{currentGrade}</span>
                </span>
              )}
              {targetGrade && (
                <span>
                  Target grade:{' '}
                  <span className="font-semibold text-foreground">{targetGrade}</span>
                </span>
              )}
            </div>
          )}

          {isElevenPlusTrack && currentReadinessBand && nextReadinessBand && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <span>
                Current band:{' '}
                <span className="font-semibold text-foreground">{currentReadinessBand}</span>
              </span>
              <span>
                Next band:{' '}
                <span className="font-semibold text-foreground">
                  {nextReadinessBand === 'Maintain Selective-ready' ? 'Selective-ready' : nextReadinessBand}
                </span>
              </span>
            </div>
          )}

          {/* Latest Change Info */}
          {latestChange && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="font-medium">Latest:</span>
              <span className="font-semibold text-foreground">{latestChange.topic}</span>
              
              {latestChange.change !== null && latestChange.change !== 0 && (
                <div className={`flex items-center gap-0.5 sm:gap-1 font-semibold ${
                  latestChange.change > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {latestChange.change > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3" />
                      <span>+{latestChange.change.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3" />
                      <span>{latestChange.change.toFixed(1)}%</span>
                    </>
                  )}
                </div>
              )}
              
              {(latestChange.change === null || latestChange.change === 0) && (
                <div className="flex items-center gap-0.5 sm:gap-1 text-muted-foreground">
                  <Minus className="h-3 w-3" />
                  <span>0%</span>
                </div>
              )}
              
              <span>{formatSource(latestChange.reason)}</span>
              <span>{formatDistanceToNow(new Date(latestChange.created_at), { addSuffix: true })}</span>
            </div>
          )}

          {!latestChange && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              No recent updates — complete practice to see changes
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
