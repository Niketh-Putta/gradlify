import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { useSubject } from "@/contexts/SubjectContext";
import { useReadiness } from '@/hooks/useReadiness';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { expandSubtopicIdsForDb } from '@/lib/subtopicIdUtils';
import { resolveUserTrack } from '@/lib/track';
import { buildTrackReadinessRows, getTrackSections } from '@/lib/trackCurriculum';
import { AIExplainerModal } from '@/components/readiness/AIExplainerModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { PremiumAnalyticsDashboard } from '@/components/readiness/PremiumAnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
// Removed getExamBoardSubtitle
import { TOPIC_SUBTOPICS } from '@/lib/topicConstants';
import { computeReadinessGrades } from '@/lib/readinessGrades';
import { elevenPlusReadinessLabel, nextElevenPlusBand } from '@/lib/readinessHelpers';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

function formatPercentValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
}

function formatPercent(value: number | null): string {
  const formatted = formatPercentValue(value);
  return formatted === '—' ? formatted : `${formatted}%`;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
}

type PracticeRecommendation = {
  topic: string;
  subtopic?: string;
  subtopic_title: string;
  title: string;
  rationale: string;
  focus: string;
  estimated_time_min: number;
  readiness_gain_pct: number;
  marks_at_stake: number;
  question_type: string;
  question_ids: string[];
  created_at?: string;
};

type QuickWin = {
  topic: string;
  name: string;
  questionType: string;
  subtopicId: string;
  questionIds: string[];
  score: number;
  marks: number | null;
  timeMin: number | null;
  questions: number;
  progressScore: number;
  accuracyPercent: number | null;
  attempts: number;
};

type SubtopicCandidate = {
  topicKey: string;
  subtopicKey: string;
  subtopicId: string;
  title: string;
  score: number;
  updatedAt: string | null;
  attempted: boolean;
};

type RecommendationMetrics = {
  questionCount: number;
  totalMarks: number | null;
  totalTimeMin: number | null;
  maxReadinessGain: number | null;
};

const TOPIC_MARKS_WEIGHT: Record<string, number> = {
  Number: 18,
  Algebra: 24,
  'Ratio & Proportion': 15,
  Geometry: 20,
  Probability: 12,
  Statistics: 10,
};

const MAX_TOPIC_MARKS_WEIGHT = Math.max(...Object.values(TOPIC_MARKS_WEIGHT));

const TOPIC_KEY_TO_QUESTION_TYPE: Record<string, string> = {
  number: 'Number',
  algebra: 'Algebra',
  ratio: 'Ratio & Proportion',
  geometry: 'Geometry & Measures',
  probability: 'Probability',
  statistics: 'Statistics',
};

const QUESTION_TYPE_TO_TOPIC_KEY: Record<string, keyof typeof TOPIC_SUBTOPICS> = {
  'Number': 'number',
  'Algebra': 'algebra',
  'Ratio & Proportion': 'ratio',
  'Geometry & Measures': 'geometry',
  'Probability': 'probability',
  'Statistics': 'statistics',
};

const QUESTION_TYPE_TO_DISPLAY_TOPIC: Record<string, string> = {
  'Number': 'Number',
  'Algebra': 'Algebra',
  'Ratio & Proportion': 'Ratio & Proportion',
  'Geometry & Measures': 'Geometry',
  'Probability': 'Probability',
  'Statistics': 'Statistics',
  'Problem Solving': 'Problem Solving',
};

const normalizeQuestionType = (topic: string): string => {
  const key = topic.trim().toLowerCase();
  if (key === 'geometry' || key === 'geometry & measures' || key === 'geometry and measures') return 'Geometry & Measures';
  if (key === 'ratio' || key === 'ratio & proportion' || key === 'ratio and proportion') return 'Ratio & Proportion';
  if (key === 'number') return 'Number';
  if (key === 'algebra') return 'Algebra';
  if (key === 'probability') return 'Probability';
  if (key === 'statistics') return 'Statistics';
  return topic;
};

const normalizePracticeDisplayTopic = (topic: string): string => {
  const normalized = normalizeQuestionType(topic);
  return QUESTION_TYPE_TO_DISPLAY_TOPIC[normalized] || normalized;
};

const ELEVEN_PLUS_QUESTION_TYPES = [
  'Number',
  'Algebra',
  'Geometry & Measures',
  'Statistics',
  'Problem Solving',
] as const;

const CANONICAL_TOPICS = Array.from(new Set([
  ...Object.values(TOPIC_KEY_TO_QUESTION_TYPE),
  ...ELEVEN_PLUS_QUESTION_TYPES,
]));

const normalizePracticeTopic = (topic?: string | null): string | null => {
  const normalized = topic?.trim().toLowerCase();
  if (!normalized) return null;
  const exact = CANONICAL_TOPICS.find((candidate) => candidate.toLowerCase() === normalized);
  if (exact) return exact;
  const partial = CANONICAL_TOPICS.find((candidate) => normalized.includes(candidate.toLowerCase()));
  return partial || null;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const QUICK_WIN_HISTORY_KEY = 'gradlify:readiness:last-quick-win';
const RECENT_SUBTOPIC_HISTORY_KEY = 'gradlify:readiness:recent-subtopics';
const RECENT_SUBTOPIC_HISTORY_LIMIT = 8;

const buildWinKey = (questionIds: string[]) =>
  questionIds
    .map((id) => String(id).trim())
    .filter(Boolean)
    .sort()
    .join('|');

const ReadinessArrow = ({
  orientation,
  label,
  subject = 'maths'
}: {
  orientation: 'horizontal' | 'vertical';
  label: string;
  subject?: 'maths' | 'english';
}) => {
  const isVertical = orientation === 'vertical';
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-2">
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-[0.2em] text-center",
        subject === 'english' ? "text-amber-600/80 dark:text-amber-500/80" : "text-blue-600/80 dark:text-blue-500/80"
      )}>{label}</span>
      <div
        className={`relative rounded-full overflow-visible ${isVertical ? 'w-1 h-20' : 'w-24 sm:w-32 h-1'}`}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full dark:opacity-60",
            isVertical
              ? (subject === 'english' ? "bg-gradient-to-b from-border via-amber-400 to-amber-500" : "bg-gradient-to-b from-border via-blue-400 to-blue-500")
              : (subject === 'english' ? "bg-gradient-to-r from-border via-amber-400 to-amber-500" : "bg-gradient-to-r from-border via-blue-400 to-blue-500")
          )}
        />
        <div
          className={cn(
            `absolute ${isVertical ? '-bottom-3.5 left-1/2 -translate-x-1/2' : '-right-3.5 top-1/2 -translate-y-1/2'} h-0 w-0 z-10`,
            subject === 'english' ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
          )}
          style={
            isVertical
              ? { borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: subject === 'english' ? '12px solid #f59e0b' : '12px solid #3b82f6' }
              : { borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: subject === 'english' ? '14px solid #f59e0b' : '14px solid #3b82f6' }
          }
          aria-hidden="true"
        />
        <div
          className={cn(
            `absolute ${isVertical ? 'left-1/2 -translate-x-1/2 top-0' : '-top-[0.15rem]'} rounded-full`,
            subject === 'english' ? "bg-gradient-to-r from-transparent via-amber-300 to-transparent" : "bg-gradient-to-r from-transparent via-blue-300 to-transparent"
          )}
          style={{
            animation: 'travelLight 2.5s ease-in-out infinite',
            ...(isVertical ? { width: '0.25rem', height: '80%' } : { width: '70%', height: '0.4rem' }),
            filter: 'blur(1px)'
          }}
        />
      </div>
    </div>
  );
};

const SELECTIVE_TRACK_BANDS = [
  'Emerging',
  'Developing',
  'Strong',
  'Competitive',
  'Selective-ready',
] as const;

const applyExecutedFilter = (wins: QuickWin[], executedKey: string | null) => {
  return wins;
};

const readRecentSubtopics = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(RECENT_SUBTOPIC_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch (err) {
    console.warn('Failed to read recent subtopics:', err);
    return [];
  }
};

const writeRecentSubtopics = (items: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_SUBTOPIC_HISTORY_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to write recent subtopics:', err);
  }
};

const recordRecentSubtopic = (subtopicId: string | null) => {
  if (!subtopicId) return;
  const existing = readRecentSubtopics();
  const next = [subtopicId, ...existing.filter((item) => item !== subtopicId)];
  writeRecentSubtopics(next.slice(0, RECENT_SUBTOPIC_HISTORY_LIMIT));
};

const computeStreaksFromDates = (dates: Date[]) => {
  const unique = Array.from(new Set(dates.map(d => new Date(d).toDateString())));
  const set = new Set(unique);

  // Current streak from today backwards
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (set.has(d.toDateString())) streak++;
    else break;
  }

  // Best streak across all known dates
  const sorted = unique
    .map(s => new Date(s))
    .sort((a, b) => a.getTime() - b.getTime());
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const diffDays = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      run = diffDays === 1 ? run + 1 : 1;
    }
    best = Math.max(best, run);
  }

  return { streak, best };
};

// Priority calculation based on readiness
const getPriority = (readiness: number): { label: string; color: string } => {
  if (readiness < 35) return { label: 'High', color: 'text-red-500 dark:text-red-400' };
  if (readiness < 60) return { label: 'Medium', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Low', color: 'text-muted-foreground' };
};

// Progress bar color based on readiness
const getBarColor = (readiness: number): string => {
  if (readiness < 35) return 'bg-red-500';
  if (readiness < 60) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const applyTrackFilter = (builder: any, userTrack: string): any => {
  if (userTrack === '11plus') {
    return builder.eq('track', '11plus');
  }
  return builder.or('track.eq.gcse,track.is.null');
};

export function SubjectReadinessView({ subject }: { subject: 'english' | 'maths' }) {
  const { user, profile } = useAppContext();
  const navigate = useNavigate();
  const userTrack = resolveUserTrack(profile?.track ?? null);

  const {
    overall,
    topics,
    lastChanges,
    history,
    latestChange,
    latestAIEvent,
    loading,
    clearAIEvent,
  } = useReadiness(user?.id, userTrack, subject);
  const topicsForUi = useMemo(
    () => buildTrackReadinessRows(userTrack, topics, subject),
    [userTrack, topics, subject]
  );
  const displayTopics = userTrack === '11plus' ? topicsForUi : topics;

  const [startingRecommendationPractice, setStartingRecommendationPractice] = useState(false);
  const [recommendation, setRecommendation] = useState<PracticeRecommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [quickWins, setQuickWins] = useState<QuickWin[]>([]);
  const [executedQuickWinKey, setExecutedQuickWinKey] = useState<string | null>(null);
  const executedQuickWinKeyRef = useRef<string | null>(null);
  const lastQuickWinCandidatesRef = useRef<QuickWin[]>([]);
  const [topicPracticeStats, setTopicPracticeStats] = useState<Record<string, { correct: number; attempts: number }>>({});
  const [subtopicProgressById, setSubtopicProgressById] = useState<Record<string, { score: number; updatedAt: string | null }>>({});
  const [recommendationMetrics, setRecommendationMetrics] = useState<RecommendationMetrics | null>(null);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    weekQuestions: 0,
    accuracy: 0,
    weekAccuracyChange: 0,
    mockExams: 0,
    monthMockChange: 0,
    avgDailyHours: 0,
    avgDailyChange: 0,
    streak: 0,
    bestStreak: 0,
    lastPracticeAt: null as string | null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(QUICK_WIN_HISTORY_KEY);
    if (stored) {
      setExecutedQuickWinKey(stored);
    }
  }, []);

  // Fetch additional stats
  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      // Fetch practice results for stats
      const practiceQuery = applyTrackFilter(
        supabase
          .from('practice_results')
          .select('topic, correct, attempts, created_at')
          .eq('user_id', user.id),
        userTrack
      );
      const { data: practiceData } = await practiceQuery;

      // Fetch mock attempts
      const mockQuery = applyTrackFilter(
        supabase
          .from('mock_attempts')
          .select('id, created_at, status, score, total_marks')
          .eq('user_id', user.id)
          .eq('status', 'completed'),
        userTrack
      );
      const { data: mockData } = await mockQuery;

      const mockAttemptIds = (mockData || [])
        .map((attempt: any) => attempt.id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

      let mockQuestionData: Array<{ attempt_id: string; marks: number | null; awarded_marks: number | null }> = [];
      if (mockAttemptIds.length > 0) {
        const { data } = await supabase
          .from('mock_questions')
          .select('attempt_id, marks, awarded_marks')
          .in('attempt_id', mockAttemptIds);
        mockQuestionData = (data || []) as Array<{ attempt_id: string; marks: number | null; awarded_marks: number | null }>;
      }

      // Fetch study activity
      const { data: activityData } = await supabase
        .from('study_activity')
        .select('minutes, activity_date')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false })
        .limit(30);

      {
        const allPracticeRows = practiceData || [];
        
        const isEnglish = subject === 'english';
        // Filter practice rows dynamically by current subject so readiness dashboard is perfectly isolated
        const practiceRows = allPracticeRows.filter((row: any) => {
          if (!row.topic) return false;
          const t = String(row.topic).toLowerCase();
          const isEng = t.includes('english') || t.includes('verbal') || t.includes('comprehension') || t.includes('vocabulary') || t.includes('grammar') || t.includes('spelling') || t.includes('spag');
          return isEnglish ? isEng : !isEng;
        });

        const mockRows = mockData || [];
        const attemptCreatedAt = new Map<string, Date>();
        mockRows.forEach((attempt: any) => {
          const created = new Date(attempt.created_at);
          if (!Number.isNaN(created.getTime()) && attempt.id) {
            attemptCreatedAt.set(String(attempt.id), created);
          }
        });

        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(today.getDate() - 14);
        const monthAgo = new Date();
        monthAgo.setDate(today.getDate() - 30);

        const weekPracticeRows = practiceRows.filter((row: any) => new Date(row.created_at) >= weekAgo);
        const prevWeekPracticeRows = practiceRows.filter((row: any) => {
          const created = new Date(row.created_at);
          return created < weekAgo && created >= twoWeeksAgo;
        });

        const mockQuestionRowsWithDate = mockQuestionData
          .map((row) => ({
            ...row,
            created_at: attemptCreatedAt.get(row.attempt_id) || null,
          }))
          .filter((row) => row.created_at !== null) as Array<{
            attempt_id: string;
            marks: number | null;
            awarded_marks: number | null;
            created_at: Date;
          }>;

        const weekMockQuestionRows = mockQuestionRowsWithDate.filter((row) => row.created_at >= weekAgo);
        const prevWeekMockQuestionRows = mockQuestionRowsWithDate.filter(
          (row) => row.created_at < weekAgo && row.created_at >= twoWeeksAgo
        );

        const practiceCorrect = practiceRows.reduce((sum: number, row: any) => sum + Number(row.correct || 0), 0);
        const practiceAttempts = practiceRows.reduce((sum: number, row: any) => sum + Number(row.attempts || 0), 0);
        const mockCorrect = mockQuestionRowsWithDate.reduce((sum, row) => sum + Number(row.awarded_marks || 0), 0);
        const mockAttempts = mockQuestionRowsWithDate.reduce((sum, row) => sum + Number(row.marks || 0), 0);

        const weekPracticeCorrect = weekPracticeRows.reduce((sum: number, row: any) => sum + Number(row.correct || 0), 0);
        const weekPracticeAttempts = weekPracticeRows.reduce((sum: number, row: any) => sum + Number(row.attempts || 0), 0);
        const weekMockCorrect = weekMockQuestionRows.reduce((sum, row) => sum + Number(row.awarded_marks || 0), 0);
        const weekMockAttempts = weekMockQuestionRows.reduce((sum, row) => sum + Number(row.marks || 0), 0);

        const prevWeekPracticeCorrect = prevWeekPracticeRows.reduce((sum: number, row: any) => sum + Number(row.correct || 0), 0);
        const prevWeekPracticeAttempts = prevWeekPracticeRows.reduce((sum: number, row: any) => sum + Number(row.attempts || 0), 0);
        const prevWeekMockCorrect = prevWeekMockQuestionRows.reduce((sum, row) => sum + Number(row.awarded_marks || 0), 0);
        const prevWeekMockAttempts = prevWeekMockQuestionRows.reduce((sum, row) => sum + Number(row.marks || 0), 0);

        const totalCorrect = practiceCorrect + mockCorrect;
        const totalAttempts = practiceAttempts + mockAttempts;
        const weekCorrect = weekPracticeCorrect + weekMockCorrect;
        const weekAttempts = weekPracticeAttempts + weekMockAttempts;
        const prevWeekCorrect = prevWeekPracticeCorrect + prevWeekMockCorrect;
        const prevWeekAttempts = prevWeekPracticeAttempts + prevWeekMockAttempts;

        const totalQuestions = practiceRows.length + mockQuestionRowsWithDate.length;
        const weekQuestions = weekPracticeRows.length + weekMockQuestionRows.length;
        const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
        const weekAccuracy = weekAttempts > 0 ? Math.round((weekCorrect / weekAttempts) * 100) : 0;
        const prevWeekAccuracy = prevWeekAttempts > 0 ? Math.round((prevWeekCorrect / prevWeekAttempts) * 100) : 0;
        const monthMocks = mockRows.filter((attempt: any) => new Date(attempt.created_at) >= monthAgo).length;

        // Topic-level accuracy for quick wins (uses same readiness topic labels)
        const topicMap: Record<string, { correct: number; attempts: number }> = {};
        practiceRows.forEach((r: any) => {
          const t = String(r.topic || '').trim();
          if (!t) return;
          const normalized = normalizePracticeDisplayTopic(t);
          if (!topicMap[normalized]) topicMap[normalized] = { correct: 0, attempts: 0 };
          topicMap[normalized].correct += Number(r.correct || 0);
          topicMap[normalized].attempts += Number(r.attempts || 0);
        });
        setTopicPracticeStats(topicMap);

        // Streak/best streak based on practice + mock activity dates
        const practiceDates = practiceRows
          .map((row: any) => new Date(row.created_at))
          .filter((date: Date) => !Number.isNaN(date.getTime()));
        const mockDates = mockRows
          .map((row: any) => new Date(row.created_at))
          .filter((date: Date) => !Number.isNaN(date.getTime()));
        const activityDates = [...practiceDates, ...mockDates];
        const { streak, best } = computeStreaksFromDates(activityDates);
        const lastPracticeAt = activityDates.length
          ? new Date(Math.max(...activityDates.map((date) => date.getTime()))).toISOString()
          : null;

        setStats((prev) => ({
          ...prev,
          totalQuestions,
          weekQuestions,
          accuracy,
          weekAccuracyChange: weekAccuracy - prevWeekAccuracy,
          mockExams: mockRows.length,
          monthMockChange: monthMocks,
          streak,
          bestStreak: best,
          lastPracticeAt,
        }));
      }

      if (activityData && activityData.length > 0) {
        const buildDailyAverage = (offsetDays: number) => {
          const dayTotals = new Map<string, number>();
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          for (let i = 0; i < 7; i += 1) {
            const d = new Date(start);
            d.setDate(d.getDate() - offsetDays - i);
            dayTotals.set(d.toDateString(), 0);
          }

          activityData.forEach((a: any) => {
            const day = new Date(a.activity_date);
            if (Number.isNaN(day.getTime())) return;
            const key = day.toDateString();
            if (!dayTotals.has(key)) return;
            dayTotals.set(key, (dayTotals.get(key) || 0) + Number(a.minutes || 0));
          });

          const totalMinutes = Array.from(dayTotals.values()).reduce((sum, v) => sum + v, 0);
          return totalMinutes / 7 / 60;
        };

        const lastWeekAvg = buildDailyAverage(0);
        const prevWeekAvg = buildDailyAverage(7);

        setStats(prev => ({
          ...prev,
          avgDailyHours: Math.round(lastWeekAvg * 10) / 10,
          avgDailyChange: Math.round((lastWeekAvg - prevWeekAvg) * 10) / 10,
        }));
      }
    };

    fetchStats();
  }, [user?.id, userTrack]);

  useEffect(() => {
    if (!user) {
      window.location.href = '/auth';
    }
  }, [user]);

  // Find lowest readiness topic for AI recommendation
  const lowestTopic = useMemo(() => {
    if (!displayTopics.length) return null;
    return displayTopics.reduce((min, t) => t.readiness < min.readiness ? t : min, displayTopics[0]);
  }, [displayTopics]);

  const isElevenPlusTrack = userTrack === '11plus';
  const elevenPlusReadinessBand = isElevenPlusTrack ? elevenPlusReadinessLabel(overall) : null;
  const elevenPlusNextBand = isElevenPlusTrack ? nextElevenPlusBand(overall) : null;
  const highlightTargetBand =
    isElevenPlusTrack && elevenPlusNextBand === 'Maintain Selective-ready'
      ? 'Selective-ready'
      : elevenPlusNextBand;
  const accuracyPct = isElevenPlusTrack ? clamp(Math.round(stats.accuracy), 0, 100) : 0;
  // Calculate a reasonable speed score based on practice streaks or use a default baseline, as true speed metrics require time logs per attempt
  const speedPct = isElevenPlusTrack ? clamp(Math.round(40 + (stats.bestStreak * 5)), 0, 100) : 0;
  const coveragePct = isElevenPlusTrack && displayTopics.length
    ? Math.round((displayTopics.filter((topic) => topic.readiness >= 50).length / displayTopics.length) * 100)
    : 0;

  // AI recommendation is derived locally from live readiness + progress.

  const onboarding = (profile?.onboarding as any) || {};
  const onboardingCurrent = typeof onboarding.currentGrade === 'string' ? onboarding.currentGrade.trim() : undefined;
  const onboardingTarget = typeof onboarding.targetGrade === 'string' ? onboarding.targetGrade.trim() : undefined;

  const { displayCurrentGrade, displayPotentialGrade, gradeGain } = computeReadinessGrades({
    overallReadiness: overall,
    lowestTopicReadiness: lowestTopic?.readiness || 0,
    onboardingCurrentGrade: onboardingCurrent,
    onboardingTargetGrade: onboardingTarget,
  });

  const marksGap = useMemo(() => {
    if (!displayTopics.length) return 0;
    return displayTopics.reduce((sum, t) => {
      const weight = TOPIC_MARKS_WEIGHT[t.topic] ?? 0;
      const readiness = clamp(t.readiness, 0, 100);
      return sum + (weight * (1 - readiness / 100));
    }, 0);
  }, [displayTopics]);

  const recommendationTopicReadiness = useMemo(() => {
    if (!recommendation) return null;
    const normalized = normalizeQuestionType(recommendation.topic);
    const match = topics.find((t) => normalizeQuestionType(t.topic) === normalized);
    return match ? match.readiness : null;
  }, [recommendation, topics]);

  const resolveRecommendationSubtopicId = (rec: PracticeRecommendation | null): string | null => {
    if (!rec) return null;
    if (rec.subtopic) return rec.subtopic;

    const topicKey = QUESTION_TYPE_TO_TOPIC_KEY[rec.question_type];
    const title = rec.subtopic_title?.trim();
    if (!topicKey || !title) return null;

    const category = TOPIC_SUBTOPICS[topicKey as keyof typeof TOPIC_SUBTOPICS];
    const match = category?.subtopics?.find((s) => s.name === title);
    return match ? `${topicKey}|${match.key}` : null;
  };

  const recommendationSubtopicId = useMemo(
    () => resolveRecommendationSubtopicId(recommendation),
    [recommendation],
  );

  const recommendationSubtopicProgress = useMemo(() => {
    if (!recommendationSubtopicId) return null;
    return subtopicProgressById[recommendationSubtopicId] || null;
  }, [recommendationSubtopicId, subtopicProgressById]);

  const recommendationTopicPracticeStats = useMemo(() => {
    if (!recommendation) return null;
    return topicPracticeStats[recommendation.topic] || null;
  }, [recommendation, topicPracticeStats]);

  useEffect(() => {
    if (!recommendation?.question_ids?.length) {
      setRecommendationMetrics(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const ids = (recommendation.question_ids || []).map((id: any) => String(id)).filter(Boolean);
        if (ids.length === 0) {
          if (!cancelled) setRecommendationMetrics(null);
          return;
        }

        const { data, error } = await supabase
          .from('exam_questions')
          .select('id, marks, estimated_time_sec, difficulty')
          .in('id', ids);

        if (error) throw error;
        if (cancelled) return;

        const questions = data || [];
        const questionCount = questions.length;
        const markValues = questions.map((q: any) => Number(q.marks)).filter((n: number) => Number.isFinite(n));
        const timeValues = questions.map((q: any) => Number(q.estimated_time_sec)).filter((n: number) => Number.isFinite(n));

        const marksComplete = questionCount > 0 && markValues.length === questionCount;
        const timeComplete = questionCount > 0 && timeValues.length === questionCount;

        const totalMarks = marksComplete ? markValues.reduce((sum: number, n: number) => sum + n, 0) : null;
        const totalTimeMin = timeComplete
          ? Math.max(1, Math.round(timeValues.reduce((sum: number, n: number) => sum + n, 0) / 60))
          : null;

        const maxReadinessGainRaw = questions.reduce((sum: number, q: any) => {
          const raw = Number(q.difficulty);
          const diff = Number.isFinite(raw) ? clamp(raw, 1, 4) : 3;
          return sum + (10 * (diff / 3));
        }, 0);
        const topicReadiness = recommendationTopicReadiness;
        const maxReadinessGain = topicReadiness === null
          ? null
          : Math.max(0, Math.min(100 - topicReadiness, Math.round(maxReadinessGainRaw * 10) / 10));

        setRecommendationMetrics({
          questionCount,
          totalMarks,
          totalTimeMin,
          maxReadinessGain,
        });
      } catch (err) {
        console.error('Failed to compute recommendation metrics:', err);
        if (!cancelled) setRecommendationMetrics(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [recommendation?.question_ids, recommendationTopicReadiness]);

  // Quick wins (real): derived from weakest subtopics that have enough questions available.
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const run = async () => {
      setRecommendationLoading(true);
      try {
        const [{ data: catalog }, { data: progress }, { data: practiceData }] = await Promise.all([
          supabase
            .from('topic_catalog')
            .select('topic_key, subtopic_key, title, order_index')
            .order('topic_key', { ascending: true })
            .order('order_index', { ascending: true }),
          supabase
            .from('subtopic_progress')
            .select('topic_key, subtopic_key, score, updated_at')
            .eq('user_id', user.id),
          applyTrackFilter(
            supabase
              .from('practice_results')
              .select('topic, attempts, correct')
              .eq('user_id', user.id),
            userTrack
          ),
        ]);

        if (cancelled) return;

        const recentSubtopics = readRecentSubtopics();
        const recentSubtopicSet = new Set(recentSubtopics);
        const recentTopicSet = new Set(
          recentSubtopics
            .map((id) => String(id).split('|')[0])
            .filter(Boolean),
        );

        const progressMap = new Map(
          (progress || []).map((p) => [`${p.topic_key}|||${p.subtopic_key}`, {
            score: Number(p.score || 0),
            updatedAt: p.updated_at ? String(p.updated_at) : null,
          }]),
        );

        const progressById: Record<string, { score: number; updatedAt: string | null }> = {};
        (progress || []).forEach((p) => {
          const topicKey = String(p.topic_key || '').trim();
          const subtopicKey = String(p.subtopic_key || '').trim();
          if (!topicKey || !subtopicKey) return;
          progressById[`${topicKey}|${subtopicKey}`] = {
            score: Number(p.score || 0),
            updatedAt: p.updated_at ? String(p.updated_at) : null,
          };
        });
        setSubtopicProgressById(progressById);

        const practiceStatsByTopic = (practiceData || []).reduce((acc: Record<string, { attempts: number; correct: number }>, row) => {
          const topicLabel = normalizePracticeDisplayTopic(String(row?.topic || ''));
          if (!topicLabel) return acc;
          const attempts = Number(row?.attempts) || 0;
          const correct = Number(row?.correct) || 0;
          if (attempts <= 0) return acc;
          const previous = acc[topicLabel] || { attempts: 0, correct: 0 };
          previous.attempts += attempts;
          previous.correct += correct;
          acc[topicLabel] = previous;
          return acc;
        }, {});

        const candidates = (catalog || [])
          .map((c: any) => {
            const title = String(c.title || '').trim();
            const topicKey = String(c.topic_key || '').trim();
            const subtopicKey = String(c.subtopic_key || '').trim();
            if (!title || !topicKey || !subtopicKey) return null;
            const progressEntry = progressMap.get(`${topicKey}|||${subtopicKey}`);
            const score = progressEntry?.score ?? 0;
            return {
              topicKey,
              subtopicKey,
              subtopicId: `${topicKey}|${subtopicKey}`,
              title,
              score,
              updatedAt: progressEntry?.updatedAt ?? null,
              attempted: Boolean(progressEntry),
            } as SubtopicCandidate;
          })
          .filter(Boolean) as SubtopicCandidate[];

        const topicReadinessByKey: Record<string, number> = {};
        topics.forEach((topic) => {
          const topicKey = QUESTION_TYPE_TO_TOPIC_KEY[normalizeQuestionType(topic.topic) as keyof typeof QUESTION_TYPE_TO_TOPIC_KEY];
          if (topicKey) {
            topicReadinessByKey[topicKey] = clamp(Number(topic.readiness || 0), 0, 100);
          }
        });

        const candidatesByTopic = new Map<string, SubtopicCandidate[]>();
        candidates.forEach((candidate) => {
          if (!candidatesByTopic.has(candidate.topicKey)) {
            candidatesByTopic.set(candidate.topicKey, []);
          }
          candidatesByTopic.get(candidate.topicKey)?.push(candidate);
        });

        const candidateSort = (a: SubtopicCandidate, b: SubtopicCandidate) => {
          const aScore = a.attempted ? a.score : -1;
          const bScore = b.attempted ? b.score : -1;
          if (aScore !== bScore) return aScore - bScore;
          if (a.updatedAt && b.updatedAt) {
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          }
          if (a.updatedAt) return -1;
          if (b.updatedAt) return 1;
          return a.title.localeCompare(b.title);
        };

        candidatesByTopic.forEach((list) => list.sort(candidateSort));

        const topicMeta = Object.keys(TOPIC_KEY_TO_QUESTION_TYPE)
          .map((topicKey) => {
            const readiness = topicReadinessByKey[topicKey] ?? 55;
            const list = candidatesByTopic.get(topicKey) || [];
            const unattemptedCount = list.filter((item) => !item.attempted).length;
            const recentPenalty = recentTopicSet.has(topicKey) ? 6 : 0;
            const questionType = TOPIC_KEY_TO_QUESTION_TYPE[topicKey];
            const displayTopic = questionType ? (QUESTION_TYPE_TO_DISPLAY_TOPIC[questionType] || questionType) : topicKey;
            const marksWeight = TOPIC_MARKS_WEIGHT[displayTopic] ?? 0;
            const marksBias = marksWeight / MAX_TOPIC_MARKS_WEIGHT;
            const priority = readiness - (unattemptedCount > 0 ? 8 : 0) + recentPenalty - marksBias * 4;
            return { topicKey, readiness, priority };
          })
          .sort((a, b) => a.priority - b.priority);

        const topicOrder = topicMeta.map((item) => item.topicKey);

        const buildCandidateQueue = (excludeSet: Set<string>, limit: number) => {
          const queue = new Map<string, SubtopicCandidate[]>();
          topicOrder.forEach((topicKey) => {
            const list = candidatesByTopic.get(topicKey) || [];
            queue.set(topicKey, list.filter((item) => !excludeSet.has(item.subtopicId)));
          });

          const ordered: SubtopicCandidate[] = [];
          while (ordered.length < limit) {
            let added = false;
            for (const topicKey of topicOrder) {
              const next = queue.get(topicKey)?.shift();
              if (next) {
                ordered.push(next);
                added = true;
                if (ordered.length >= limit) break;
              }
            }
            if (!added) break;
          }
          return ordered;
        };

        const fetchQuestionPack = async (questionType: string, subtopicId: string) => {
          const { data: qs } = await supabase
            .from('exam_questions')
            .select('id, estimated_time_sec, marks, difficulty')
            .eq('question_type', questionType)
            .in('subtopic', expandSubtopicIdsForDb(subtopicId))
            .eq('track', userTrack)
            .order('id', { ascending: true })
            .limit(7);

          const questionIds = (qs || []).map((q: any) => String(q.id)).filter(Boolean);
          if (questionIds.length < 1) return null;

          const timeValues = (qs || [])
            .map((q: any) => Number(q.estimated_time_sec))
            .filter((n: number) => Number.isFinite(n));

          const markValues = (qs || [])
            .map((q: any) => Number(q.marks))
            .filter((n: number) => Number.isFinite(n));

          const questions = questionIds.length;
          const timeMin = timeValues.length === questions
            ? Math.max(1, Math.round(timeValues.reduce((a: number, b: number) => a + b, 0) / 60))
            : null;
          const totalMarks = markValues.length === questions
            ? markValues.reduce((a: number, b: number) => a + b, 0)
            : null;

          return { questionIds, timeMin, totalMarks, questions };
        };

        const buildRecommendationFromCandidates = async (excludeSet: Set<string>) => {
          const queue = buildCandidateQueue(excludeSet, 40);
          const MAX_TOTAL_CHECKS = 24;
          const MAX_TOPIC_CHECKS = 4;
          const TARGET_VIABLE = 10;
          const topicChecks = new Map<string, number>();
          let totalChecks = 0;

          const viable: Array<{
            candidate: SubtopicCandidate;
            pack: { questionIds: string[]; timeMin: number | null; totalMarks: number | null; questions: number };
            questionType: string;
            displayTopic: string;
          }> = [];

          for (const candidate of queue) {
            if (totalChecks >= MAX_TOTAL_CHECKS || viable.length >= TARGET_VIABLE) break;
            const checksForTopic = topicChecks.get(candidate.topicKey) ?? 0;
            if (checksForTopic >= MAX_TOPIC_CHECKS) continue;

            topicChecks.set(candidate.topicKey, checksForTopic + 1);
            totalChecks += 1;

            const questionType = TOPIC_KEY_TO_QUESTION_TYPE[candidate.topicKey];
            if (!questionType) continue;
            const pack = await fetchQuestionPack(questionType, candidate.subtopicId);
            if (!pack) continue;

            const displayTopic = QUESTION_TYPE_TO_DISPLAY_TOPIC[questionType] || questionType;
            viable.push({ candidate, pack, questionType, displayTopic });
          }

          if (viable.length === 0) return null;

          const viableCounts = viable.reduce<Record<string, number>>((acc, entry) => {
            acc[entry.candidate.topicKey] = (acc[entry.candidate.topicKey] ?? 0) + 1;
            return acc;
          }, {});
          const topicsWithViable = Math.max(1, Object.keys(viableCounts).length);
          const avgViablePerTopic = viable.length / topicsWithViable;

          const scored = viable
            .map((entry) => {
              const topicReadiness = topicReadinessByKey[entry.candidate.topicKey] ?? 55;
              const readinessGap = clamp(100 - topicReadiness, 0, 100);
              const subtopicGap = entry.candidate.attempted
                ? clamp(100 - entry.candidate.score, 0, 100)
                : Math.max(35, Math.round(readinessGap * 0.6));

              const practiceStat = practiceStatsByTopic[entry.displayTopic];
              const attempts = practiceStat?.attempts ?? 0;
              const accuracyPercent = attempts > 0
                ? (practiceStat!.correct / attempts) * 100
                : null;
              const accuracyPenalty = accuracyPercent !== null && attempts >= 8
                ? Math.max(0, (accuracyPercent - 72) * 0.5)
                : 0;

              const recencyPenalty = recentSubtopicSet.has(entry.candidate.subtopicId)
                ? 28
                : recentTopicSet.has(entry.candidate.topicKey)
                  ? 12
                  : 0;

              const marksWeight = TOPIC_MARKS_WEIGHT[entry.displayTopic] ?? 0;
              const marksBias = marksWeight / MAX_TOPIC_MARKS_WEIGHT;

              const availabilityPenalty = (viableCounts[entry.candidate.topicKey] ?? 0) > avgViablePerTopic
                ? ((viableCounts[entry.candidate.topicKey] ?? 0) - avgViablePerTopic) * 2.5
                : 0;

              const score =
                readinessGap * 0.55 +
                subtopicGap * 0.35 +
                marksBias * 10 -
                accuracyPenalty -
                recencyPenalty -
                availabilityPenalty;

              return { entry, score };
            })
            .sort((a, b) => b.score - a.score);

          const best = scored[0]?.entry;
          if (!best) return null;

          const title = `${best.displayTopic}: ${best.candidate.title}`;

          return {
            recommendation: {
              topic: best.displayTopic,
              subtopic: best.candidate.subtopicId,
              subtopic_title: best.candidate.title,
              title,
              rationale: 'Targeting gaps in your readiness data.',
              focus: best.candidate.title,
              estimated_time_min: best.pack.timeMin ?? 0,
              readiness_gain_pct: 0,
              marks_at_stake: best.pack.totalMarks ?? 0,
              question_type: best.questionType,
              question_ids: best.pack.questionIds,
              created_at: new Date().toISOString(),
            } as PracticeRecommendation,
            subtopicId: best.candidate.subtopicId,
          };
        };

        let recommendationResult = await buildRecommendationFromCandidates(recentSubtopicSet);
        if (!recommendationResult) {
          recommendationResult = await buildRecommendationFromCandidates(new Set());
        }

        if (!cancelled) {
          setRecommendation(recommendationResult?.recommendation ?? null);
        }

        const wins: QuickWin[] = [];
        const executedKey = executedQuickWinKeyRef.current;
        const usedSubtopics = new Set<string>();
        const winQueue = buildCandidateQueue(recentSubtopicSet, 50);

        for (const candidate of winQueue) {
          if (wins.length >= 3) break;
          if (usedSubtopics.has(candidate.subtopicId)) continue;

          const questionType = TOPIC_KEY_TO_QUESTION_TYPE[candidate.topicKey];
          if (!questionType) continue;
          const displayTopic = QUESTION_TYPE_TO_DISPLAY_TOPIC[questionType] || questionType;
          const pack = await fetchQuestionPack(questionType, candidate.subtopicId);
          if (!pack) continue;

          const packKey = buildWinKey(pack.questionIds);

          const practiceStat = practiceStatsByTopic[displayTopic];
          const attempts = practiceStat?.attempts ?? 0;
          const accuracyPercent = practiceStat?.attempts
            ? Math.round((practiceStat.correct / practiceStat.attempts) * 100)
            : null;
          const readinessScore = Math.max(candidate.score, accuracyPercent ?? 0);
          if (readinessScore >= 85 && attempts >= 10) continue;

          wins.push({
            topic: displayTopic,
            name: candidate.title,
            questionType,
            subtopicId: candidate.subtopicId,
            questionIds: pack.questionIds,
            score: readinessScore,
            marks: pack.totalMarks,
            timeMin: pack.timeMin,
            questions: pack.questions,
            progressScore: candidate.score,
            accuracyPercent,
            attempts,
          });

          usedSubtopics.add(candidate.subtopicId);
        }

        if (wins.length === 0) {
          const fallbackWinQueue = buildCandidateQueue(new Set(), 50);
          usedSubtopics.clear();
          
          for (const candidate of fallbackWinQueue) {
            if (wins.length >= 3) break;
            if (usedSubtopics.has(candidate.subtopicId)) continue;
  
            const questionType = TOPIC_KEY_TO_QUESTION_TYPE[candidate.topicKey];
            if (!questionType) continue;
            const displayTopic = QUESTION_TYPE_TO_DISPLAY_TOPIC[questionType] || questionType;
            const pack = await fetchQuestionPack(questionType, candidate.subtopicId);
            if (!pack) continue;
  
            const packKey = buildWinKey(pack.questionIds);
  
            const practiceStat = practiceStatsByTopic[displayTopic];
            const attempts = practiceStat?.attempts ?? 0;
            const accuracyPercent = practiceStat?.attempts
              ? Math.round((practiceStat.correct / practiceStat.attempts) * 100)
              : null;
            const readinessScore = Math.max(candidate.score, accuracyPercent ?? 0);
            if (readinessScore >= 85 && attempts >= 10) continue;
  
            wins.push({
              topic: displayTopic,
              name: candidate.title,
              questionType,
              subtopicId: candidate.subtopicId,
              questionIds: pack.questionIds,
              score: readinessScore,
              marks: pack.totalMarks,
              timeMin: pack.timeMin,
              questions: pack.questions,
              progressScore: candidate.score,
              accuracyPercent,
              attempts,
            });
  
            usedSubtopics.add(candidate.subtopicId);
          }
        }

        if (!cancelled) {
          lastQuickWinCandidatesRef.current = wins;
          const key = executedQuickWinKeyRef.current;
          setQuickWins(applyExecutedFilter(wins, key));
          if (recommendationResult?.subtopicId) {
            recordRecentSubtopic(recommendationResult.subtopicId);
          }
        }
      } catch (err) {
        console.error('Failed to compute quick wins:', err);
        if (!cancelled) {
          setQuickWins([]);
          setRecommendation(null);
        }
      } finally {
        if (!cancelled) setRecommendationLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, latestChange?.created_at, topics, userTrack]);

  useEffect(() => {
    executedQuickWinKeyRef.current = executedQuickWinKey;
    const candidates = lastQuickWinCandidatesRef.current;
    if (!candidates.length) return;
    setQuickWins(applyExecutedFilter(candidates, executedQuickWinKey));
  }, [executedQuickWinKey]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8 sm:py-14">
        <div className="space-y-14">
          <div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-48 mt-2" />
          </div>
          <Skeleton className="h-[280px] rounded-3xl" />
          <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
            <Skeleton className="h-[500px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </div>
    );
  }

  const startRecommendationPractice = async () => {
    if (!recommendation) {
      toast.error('Recommendation is not ready yet. Please try again.');
      return;
    }

    setStartingRecommendationPractice(true);
    try {
      const params = new URLSearchParams();

      // IMPORTANT: use question_type (the exact main topic) so we don't accidentally
      // include a broad/cross-topic label in `recommendation.topic`.
      params.set('topics', recommendation.question_type);
      // Use adaptive/mixed filters by default so recommendations never "blank out"
      // due to an overly narrow default (e.g., higher+calculator only).
      params.set('tier', 'both');
      params.set('paperType', 'both');
      params.set('mode', 'practice');

      if (recommendationSubtopicId) {
        params.set('subtopic', recommendationSubtopicId);
      }

      const ids = (recommendation.question_ids || []).map((id: any) => String(id)).filter(Boolean);
      if (ids.length > 0) {
        params.set('questionIds', ids.join(','));
      }

      recordRecentSubtopic(recommendationSubtopicId);
      navigate(`/practice-page?${params.toString()}`);
    } catch (err) {
      console.error('Failed to start recommended practice pack:', err);
      toast.error('Failed to start practice. Please try again.');
    } finally {
      setStartingRecommendationPractice(false);
    }
  };

  const startQuickWinPractice = async (win: QuickWin) => {
    if (!win.questionIds.length) return;
    const params = new URLSearchParams({
      topics: win.questionType,
      tier: 'both',
      paperType: 'both',
      mode: 'practice',
      questionIds: win.questionIds.join(','),
    });
    const executedKey = buildWinKey(win.questionIds);
    if (typeof window !== 'undefined' && executedKey) {
      window.localStorage.setItem(QUICK_WIN_HISTORY_KEY, executedKey);
    }
    recordRecentSubtopic(win.subtopicId);
    setExecutedQuickWinKey(executedKey);
    setQuickWins((prev) => prev.filter((item) => buildWinKey(item.questionIds) !== executedKey));
    navigate(`/practice-page?${params.toString()}`);
  };

  const recommendationSubtopicScore = recommendationSubtopicProgress
    ? Number(recommendationSubtopicProgress.score)
    : null;
  const recommendationSubtopicUpdated = recommendationSubtopicProgress?.updatedAt
    ? formatDistanceToNow(new Date(recommendationSubtopicProgress.updatedAt), { addSuffix: false })
    : null;
  const recommendationTopicAccuracy = recommendationTopicPracticeStats?.attempts
    ? Math.round((recommendationTopicPracticeStats.correct / recommendationTopicPracticeStats.attempts) * 100)
    : null;

  const recommendationReason = (() => {
    if (recommendationSubtopicScore === null) {
      return 'No score recorded yet for this subtopic, so this pack will establish a baseline.';
    }

    if (recommendationTopicReadiness !== null && recommendationSubtopicScore < recommendationTopicReadiness) {
      const diff = Math.round((recommendationTopicReadiness - recommendationSubtopicScore) * 10) / 10;
      return `This subtopic sits ${diff}% below your topic readiness.`;
    }

    if (recommendationSubtopicScore < 70) {
      return `This subtopic is currently at ${recommendationSubtopicScore}%, leaving clear room to improve.`;
    }

    return `This subtopic is at ${recommendationSubtopicScore}%, so polishing it can unlock extra marks.`;
  })();

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-10 py-6 sm:py-14">
      <header className="mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 print-header">
        <div>
          <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight text-foreground mb-3 leading-tight">
            {subject === 'english' ? 'English' : 'Mathematics'} Exam Readiness
          </h1>
          <div className={cn(
             "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wide uppercase",
             subject === 'english' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-primary/10 border-primary/20 text-primary"
          )}>
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            11+ {subject === 'english' ? 'English' : 'Mathematics'}
          </div>
        </div>
      </header>

      {/* Grade Progression Section */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-6 sm:mb-8">
          <div className="text-[12px] font-bold tracking-[0.2em] uppercase text-primary/80 mb-2">
            {isElevenPlusTrack ? 'Selective Progress' : 'Exam Trajectory'}
          </div>
          <div className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-snug max-w-2xl">
            {isElevenPlusTrack ? `Your trajectory towards elite selective standards in ${subject === 'english' ? 'English' : 'Mathematics'}.` : 'Your predicted grade progression towards the final exam.'}
          </div>
        </div>

        <div className="py-4 sm:py-5 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
          {/* Current Level Box */}
          <div className={cn(
            "bg-card rounded-[32px] px-6 sm:px-10 py-10 sm:py-12 text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-lg relative overflow-hidden group shadow-sm ring-1 ring-inset",
            subject === 'english' ? "ring-amber-500/20" : "ring-blue-500/20"
          )}>
            <div className={cn(
               "absolute top-0 right-0 w-32 h-32 blur-[40px] rounded-full pointer-events-none opacity-20 transition-opacity group-hover:opacity-40",
               subject === 'english' ? "bg-amber-400" : "bg-blue-400"
            )} />
            <div className="relative z-10">
              <div className={cn(
                 "inline-flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full mb-6 border shadow-sm backdrop-blur-sm transition-colors",
                 subject === 'english' 
                   ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                   : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  subject === 'english' ? "bg-amber-500" : "bg-blue-500"
                )} />
                {isElevenPlusTrack ? 'Current Level' : 'Current Grade'}
              </div>
              <div className={`font-black tracking-tighter text-foreground leading-tight pb-2 mb-2 ${isElevenPlusTrack ? 'text-5xl sm:text-[56px]' : 'text-6xl sm:text-[80px]'}`}>
                {isElevenPlusTrack ? elevenPlusReadinessBand : displayCurrentGrade}
              </div>
              <div className="text-[14px] sm:text-[15px] text-muted-foreground tracking-tight font-medium max-w-[260px] mx-auto">
                {isElevenPlusTrack ? 'Synthesized from your accuracy, speed & syllabus coverage.' : 'Based on your recent module assessments.'}
              </div>
              
              {isElevenPlusTrack && (
                <div className="mt-8 pt-6 border-t border-border/80 flex flex-wrap justify-center gap-6 sm:gap-8">
                  <div className="flex flex-col items-center group/stat">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 transition-colors group-hover/stat:text-foreground">Accuracy</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-black text-foreground">{accuracyPct}</span>
                      <span className={cn("text-xs font-bold", subject === 'english' ? "text-amber-600" : "text-blue-600")}>%</span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex flex-col items-center group/stat">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 transition-colors group-hover/stat:text-foreground">Speed Index</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-black text-foreground">{speedPct}</span>
                      <span className={cn("text-xs font-bold", subject === 'english' ? "text-amber-600" : "text-blue-600")}>%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Separation Arrow */}
          <div className="flex items-center justify-center gap-2 py-4 md:py-0">
            {isElevenPlusTrack ? (
              <ReadinessArrow orientation="horizontal" label={`Trajectory`} />
            ) : gradeGain > 0 ? (
              <>
                <div className="hidden md:flex">
                  <ReadinessArrow orientation="horizontal" label={`+${gradeGain} ${gradeGain > 1 ? 'Grades' : 'Grade'}`} />
                </div>
                <div className="flex md:hidden">
                  <ReadinessArrow orientation="vertical" label={`+${gradeGain} ${gradeGain > 1 ? 'Grades' : 'Grade'}`} />
                </div>
              </>
            ) : (
              <div className="h-12 w-full" />
            )}
          </div>

          {/* Target Level Box */}
          <div className={cn(
             "bg-card rounded-[32px] px-6 sm:px-10 py-10 sm:py-12 text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-lg relative overflow-hidden group shadow-md ring-1 ring-inset",
             subject === 'english' ? "ring-amber-500/40" : "ring-blue-500/40"
          )}>
            <div className={cn(
               "absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
               subject === 'english' ? "from-transparent to-amber-500/5" : "from-transparent to-blue-500/5"
            )} />
            <div className={cn(
               "absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-[60px] pointer-events-none opacity-40 transition-opacity group-hover:opacity-60",
               subject === 'english' ? "bg-amber-400/40" : "bg-blue-400/40"
            )} />
            
            <div className="relative z-10">
              <div className={cn(
                "inline-flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full mb-6 border shadow-sm backdrop-blur-md",
                subject === 'english' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
              )}>
                <span className={cn(
                   "w-1.5 h-1.5 rounded-full animate-pulse",
                   subject === 'english' ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                )} />
                {isElevenPlusTrack ? 'Target Level' : 'Maximum Potential'}
              </div>
              <div className={`font-black tracking-tighter text-foreground leading-tight pb-3 -mb-2 px-4 -mx-4 drop-shadow-sm ${isElevenPlusTrack ? 'text-5xl sm:text-[60px]' : 'text-6xl sm:text-[80px]'}`}>
                {isElevenPlusTrack && elevenPlusNextBand ? elevenPlusNextBand : displayPotentialGrade}
              </div>
              <div className="text-[14px] sm:text-[15px] text-muted-foreground tracking-tight font-medium max-w-[260px] mx-auto">
                {isElevenPlusTrack ? 'The standard commonly required for grammar & independent schools.' : 'Your peak achievement assuming consistent progress.'}
              </div>
            </div>
          </div>
        </div>

        {isElevenPlusTrack ? (
          <div className="mt-8 sm:mt-10">
            <div className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground text-center mb-3">
              Selective Readiness Bands
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              {SELECTIVE_TRACK_BANDS.map((band, index) => {
                const isCurrentBand = band === elevenPlusReadinessBand;
                const isTargetBand = band === highlightTargetBand;
                const pillClass = [
                  'px-3 py-1 text-xs font-semibold rounded-full transition-all border',
                  isCurrentBand
                    ? (subject === 'english' ? 'bg-amber-500 text-white border-amber-500' : 'bg-primary text-white border-primary')
                    : isTargetBand
                      ? (subject === 'english' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-primary/10 text-primary border-primary/30')
                      : 'bg-card text-muted-foreground border-border/60',
                ].join(' ');
                return (
                  <Fragment key={band}>
                    <span className={pillClass}>{band}</span>
                    {index < SELECTIVE_TRACK_BANDS.length - 1 && (
                      <span className="hidden sm:inline-block text-xs text-muted-foreground px-1">→</span>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 mt-8 sm:mt-10">
            <div className="text-center">
              <div className="text-[15px] font-semibold text-foreground mb-1">6 weeks</div>
              <div className="text-xs text-muted-foreground">Plan length</div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-[15px] font-semibold text-foreground mb-1">{formatNumber(marksGap)} marks</div>
              <div className="text-xs text-muted-foreground">Marks gap</div>
            </div>
          </div>
        )}
      </section>

      {/* AI Recommendation Hero Card */}
      {AI_FEATURE_ENABLED && !recommendationLoading && (
        <section className="mb-12 sm:mb-16 print-hidden">
          <div className="relative overflow-hidden bg-foreground rounded-3xl p-6 sm:p-10 lg:p-14 shadow-2xl border border-border/50">
            {/* Premium Background Glow Effect */}
            <div className={cn(
               "absolute top-0 right-0 -mt-20 -mr-20 w-64 sm:w-96 h-64 sm:h-96 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none",
               subject === 'english' ? "bg-amber-500/30 sm:bg-amber-500/40" : "bg-primary/30 sm:bg-primary/40"
            )} />
            <div className={cn(
               "absolute bottom-0 left-0 -mb-20 -ml-20 w-64 sm:w-96 h-64 sm:h-96 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none",
               subject === 'english' ? "bg-yellow-500/20 sm:bg-yellow-500/30" : "bg-accent/20 sm:bg-accent/30"
            )} />
            
            <div className="relative z-10 w-full lg:w-4/5 xl:w-3/4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-background/10 border border-background/20 text-[11px] sm:text-xs font-semibold tracking-wide text-background uppercase backdrop-blur-md self-start">
                  <span className={cn(
                     "w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full animate-[pulse_2s_ease-in-out_infinite]",
                     subject === 'english' ? "bg-amber-400" : "bg-primary"
                  )} />
                  Your AI Tutor's Focus Plan
                </div>
                {recommendation?.created_at && (
                  <span className="text-xs font-medium text-background/60">
                    Curated {formatDistanceToNow(new Date(recommendation.created_at), { addSuffix: false })} ago
                  </span>
                )}
              </div>

              {recommendation ? (
                <>
                  <div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-background mb-4 sm:mb-6 leading-[1.1] text-balance">
                      Focus on <span className={cn(
                        "text-transparent bg-clip-text",
                        subject === 'english' ? "bg-gradient-to-r from-amber-400 to-amber-200" : "bg-gradient-to-r from-primary-foreground to-primary-foreground/70"
                      )}>{recommendation.title.split(': ')[1] || recommendation.title}</span>
                    </h2>
                    <p className="text-[17px] sm:text-xl text-background/80 mb-8 sm:mb-10 max-w-2xl leading-relaxed font-medium">
                      {recommendationReason} This is currently the biggest bottleneck in your readiness progression.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
                    <div className="bg-background/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-background/10 text-left">
                      <div className="text-[10px] sm:text-sm font-medium text-background/60 mb-1 lg:whitespace-nowrap">Subtopic Score</div>
                      <div className="text-xl sm:text-[28px] font-semibold text-background leading-none">
                        {formatPercent(recommendationSubtopicScore)}
                      </div>
                    </div>
                    <div className="bg-background/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-background/10 text-left">
                      <div className="text-[10px] sm:text-sm font-medium text-background/60 mb-1 lg:whitespace-nowrap">Topical Readiness</div>
                      <div className="text-xl sm:text-[28px] font-semibold text-background leading-none">
                        {formatPercent(recommendationTopicReadiness)}
                      </div>
                    </div>
                    <div className="bg-background/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-background/10 text-left">
                      <div className="text-[10px] sm:text-sm font-medium text-background/60 mb-1 lg:whitespace-nowrap">Time Estimate</div>
                      <div className="text-xl sm:text-[28px] font-semibold text-background leading-none">
                        {recommendationMetrics?.totalTimeMin !== null && recommendationMetrics?.totalTimeMin !== undefined
                          ? `${recommendationMetrics.totalTimeMin} min`
                          : '—'}
                      </div>
                    </div>
                    <div className={cn(
                       "backdrop-blur-md rounded-2xl p-4 sm:p-5 border relative overflow-hidden group text-left",
                       subject === 'english' ? "bg-amber-500/20 border-amber-500/30" : "bg-primary/20 border-primary/30"
                    )}>
                      <div className={cn(
                         "absolute inset-0 transition-colors",
                         subject === 'english' ? "bg-amber-500/10 group-hover:bg-amber-500/20" : "bg-primary/10 group-hover:bg-primary/20"
                      )} />
                      <div className="relative z-10">
                        <div className={cn(
                           "text-[10px] sm:text-sm font-medium mb-1 lg:whitespace-nowrap",
                           subject === 'english' ? "text-amber-100/80" : "text-primary-foreground/80"
                        )}>Score Boost</div>
                        <div className={cn(
                           "text-xl sm:text-[28px] font-semibold leading-none",
                           subject === 'english' ? "text-amber-100" : "text-primary-foreground"
                        )}>
                          {recommendationMetrics?.maxReadinessGain !== null && recommendationMetrics?.maxReadinessGain !== undefined
                            ? `+${formatPercentValue(recommendationMetrics.maxReadinessGain)}%`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={startRecommendationPractice}
                    disabled={startingRecommendationPractice}
                    size="lg"
                    className={cn(
                       "w-full sm:w-auto h-[56px] sm:h-[60px] px-8 sm:px-12 text-[15px] sm:text-[17px] font-semibold rounded-xl transition-all hover:scale-[1.02] ring-1",
                       subject === 'english'
                         ? "bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_-15px_rgba(245,158,11,0.5)] ring-amber-500/20"
                         : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)] ring-primary-foreground/20"
                    )}
                  >
                    Start 10-Minute Sprint
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2.5 sm:ml-3 w-4 h-4 sm:w-5 sm:h-5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-background mb-4 sm:mb-6 leading-[1.1] text-balance">
                      Establish Your <span className={cn(
                        "text-transparent bg-clip-text",
                        subject === 'english' ? "bg-gradient-to-r from-amber-400 to-amber-200" : "bg-gradient-to-r from-primary to-primary/70"
                      )}>Baseline</span>
                    </h2>
                    <p className="text-[17px] sm:text-xl text-background/80 mb-8 sm:mb-10 max-w-2xl leading-relaxed font-medium">
                      Your AI Tutor needs a bit more data to curate your personalized action plan. Take a quick diagnostic assessment to unlock your first targeted 10-minute fix.
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate(`/practice-page?mode=exam&tier=${isElevenPlusTrack ? '11plus-standard' : 'both'}&paperType=${isElevenPlusTrack ? 'non-calculator' : 'both'}&topics=${isElevenPlusTrack ? encodeURIComponent('Number & Arithmetic,Algebra & Ratio,Geometry & Measures,Statistics & Data,Problem Solving & Strategies') : 'all'}&title=Baseline+Assessment${isElevenPlusTrack ? '&track=11plus' : ''}`)}
                    size="lg"
                    className={cn(
                       "w-full sm:w-auto h-[56px] sm:h-[60px] px-8 sm:px-12 text-[15px] sm:text-[17px] font-semibold rounded-xl transition-all hover:scale-[1.02] ring-1",
                       subject === 'english'
                         ? "bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_-15px_rgba(245,158,11,0.5)] ring-amber-500/20"
                         : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)] ring-primary-foreground/20"
                    )}
                  >
                    Start Baseline Assessment
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2.5 sm:ml-3 w-4 h-4 sm:w-5 sm:h-5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="w-full mt-4 sm:mt-8 pb-24">
        <PremiumAnalyticsDashboard 
          displayTopics={displayTopics}
          accuracyPct={accuracyPct}
          speedPct={speedPct}
          profileName={(profile as any)?.full_name || (profile as any)?.username || 'Student'}
          subject={subject}
        />
      </div>

      {/* AI Explainer Modal */}
      {AI_FEATURE_ENABLED ? (
        <AIExplainerModal event={latestAIEvent} onClose={clearAIEvent} />
      ) : null}

      {/* Topic Timeline Drawer */}
      {/* Custom animation for traveling light */}
      <style>{`
        }
      `}</style>
      </div>

    </>
  );
}

export function Readiness() {
  const { user } = useAppContext();
  const { currentSubject } = useSubject();

  if (!user) return null;

  return (
    <div className="bg-background min-h-screen">
      <div className="py-4 sm:py-8">
        <SubjectReadinessView subject={currentSubject as 'english' | 'maths'} />
      </div>
    </div>
  );
}
