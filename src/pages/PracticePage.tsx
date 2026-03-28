import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PracticeSessionNew from '@/components/exam/PracticeSessionNew';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/hooks/usePremium';
import { cn } from '@/lib/utils';
import { TOPIC_SUBTOPICS } from '@/lib/topicConstants';
import { expandQuestionTypesForDb, expandSubtopicIdsForDb } from '@/lib/subtopicIdUtils';
import { FREE_CHALLENGE_LIMIT } from '@/lib/limits';
import MultipartPracticePanel from '@/components/experimental/MultipartPracticePanel';
import { useAppContext } from '@/hooks/useAppContext';
import { resolveUserTrack } from '@/lib/track';
import { is11Plus, isGCSE } from '@/lib/track-config';
import { PracticeLimitModal } from '@/components/PracticeLimitModal';

const topicsList = [
  { id: 'Number', label: 'Number' },
  { id: 'Algebra', label: 'Algebra' },
  { id: 'Ratio & Proportion', label: 'Ratio & Proportion' },
  { id: 'Geometry & Measures', label: 'Geometry & Measures' },
  { id: 'Probability', label: 'Probability' },
  { id: 'Statistics', label: 'Statistics' },
];
const topicsList11Plus = [
  { id: 'Number & Arithmetic', label: 'Number & Arithmetic' },
  { id: 'Algebra & Ratio', label: 'Algebra & Ratio' },
  { id: 'Geometry & Measures', label: 'Geometry & Measures' },
  { id: 'Statistics & Data', label: 'Statistics & Data' },
  { id: 'Problem Solving & Strategies', label: 'Problem Solving & Strategies' },
];

const TOPIC_ID_TO_KEY: Record<string, keyof typeof TOPIC_SUBTOPICS> = {
  'Number': 'number',
  'Algebra': 'algebra',
  'Ratio & Proportion': 'ratio',
  'Geometry & Measures': 'geometry',
  'Probability': 'probability',
  'Statistics': 'statistics',
};
const TOPIC_ID_TO_SUBTOPIC_PREFIX_11PLUS: Record<string, string> = {
  'Number & Arithmetic': 'number',
  'Algebra & Ratio': 'algebra',
  'Geometry & Measures': 'geometry',
  'Statistics & Data': 'stats',
  'Problem Solving & Strategies': 'strategies',
};
const ELEVEN_PLUS_SUBTOPICS: Record<string, Array<{ key: string; name: string }>> = {
  number: [
    { key: 'place-value', name: 'Place Value & Rounding' },
    { key: 'negatives', name: 'Negative Numbers' },
    { key: 'addition-subtraction', name: 'Addition & Subtraction' },
    { key: 'multiplication-division', name: 'Multiplication & Division' },
    { key: 'bidmas', name: 'Order of Operations (BIDMAS)' },
    { key: 'factors-multiples-primes', name: 'Factors, Multiples & Primes' },
    { key: 'powers', name: 'Powers & Roots (Squares/Cubes)' },
    { key: 'fractions', name: 'Fractions (Basics & Operations)' },
    { key: 'decimals-percentages', name: 'Decimals & Percentages' },
  ],
  algebra: [
    { key: 'ratio', name: 'Ratio (Sharing & Simplifying)' },
    { key: 'proportion', name: 'Proportion (Recipes & Costs)' },
    { key: 'basics', name: 'Algebra Basics (Expressions)' },
    { key: 'substitution', name: 'Substitution' },
    { key: 'equations', name: 'Equations' },
    { key: 'sequences', name: 'Sequences & Nth Term' },
  ],
  geometry: [
    { key: '2d-3d-shapes', name: '2D & 3D Shapes' },
    { key: 'angles', name: 'Angles & Parallel Lines' },
    { key: 'perimeter-area', name: 'Perimeter & Area' },
    { key: 'volume-surface-area', name: 'Volume & Surface Area' },
    { key: 'measures', name: 'Measures, Time & Speed' },
    { key: 'coordinates', name: 'Coordinates & Transformations' },
  ],
  stats: [
    { key: 'data-handling', name: 'Data Handling (Mean, Median...)' },
    { key: 'charts-graphs', name: 'Charts & Graphs (Bar, Line...)' },
    { key: 'probability', name: 'Probability' },
  ],
  strategies: [
    { key: 'word-problems', name: 'Word Problems (RUCSAC)' },
    { key: 'logic', name: 'Logic & Reasoning' },
    { key: 'estimation', name: 'Estimation & Checking' },
  ],
};

const canonicalizeSubtopicId = (raw: string): string => {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  const normalized = value
    .replace(/^geometry\|shapes$/i, 'geometry|2d-3d-shapes')
    .replace(/^geometry,shapes$/i, 'geometry|2d-3d-shapes')
    .replace(/^geometry\.shapes$/i, 'geometry|2d-3d-shapes')
    .replace(/^geometry\|measures-time$/i, 'geometry|measures')
    .replace(/^geometry,measures-time$/i, 'geometry|measures')
    .replace(/^geometry\.measures-time$/i, 'geometry|measures')
    .replace(/^geometry\|volume$/i, 'geometry|volume-surface-area')
    .replace(/^geometry,volume$/i, 'geometry|volume-surface-area')
    .replace(/^geometry\.volume$/i, 'geometry|volume-surface-area')
    .replace(/^data\|handling$/i, 'stats|data-handling')
    .replace(/^data,handling$/i, 'stats|data-handling')
    .replace(/^data\.handling$/i, 'stats|data-handling')
    .replace(/^data\|charts$/i, 'stats|charts-graphs')
    .replace(/^data,charts$/i, 'stats|charts-graphs')
    .replace(/^data\.charts$/i, 'stats|charts-graphs')
    .replace(/^data\|probability$/i, 'stats|probability')
    .replace(/^data,probability$/i, 'stats|probability')
    .replace(/^data\.probability$/i, 'stats|probability');
  if (normalized.includes('|')) return normalized;
  const match = normalized.match(/^([^,]+),([^,]+)$/);
  if (match) return `${match[1].trim()}|${match[2].trim()}`;
  return normalized;
};

const normalizeSubtopicSelection = (items: string[]): string[] =>
  Array.from(
    new Set(
      items
        .map((x) => canonicalizeSubtopicId(String(x)))
        .filter((x) => x.includes('|'))
    )
  );

type CalcSelection = 'calculator' | 'non-calculator' | 'both';
type TierSelection = 'foundation' | 'higher' | 'both';

const calcOptions: Array<{ value: CalcSelection; label: string }> = [
  { value: 'calculator', label: 'With' },
  { value: 'non-calculator', label: 'Without' },
  { value: 'both', label: 'Adaptive' },
];

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  let user = null;
  let userTrack: 'gcse' | '11plus' = 'gcse';
  try {
    const context = useAppContext();
    user = context.user;
    userTrack = resolveUserTrack(context.profile?.track ?? null);
  } catch {
    // Not authenticated
  }
  const trackParam = searchParams.get('track');
  const userTrackFromProfile = userTrack;
  const effectiveTrack: 'gcse' | '11plus' = is11Plus ? '11plus' : (isGCSE ? 'gcse' : (trackParam === '11plus' ? '11plus' : userTrackFromProfile));
  const { isPremium, dailyUses, dailyLimit, dailyMockUses, dailyMockLimit, dailyChallengeUses, dailyChallengeLimit, refreshUsage } = usePremium(effectiveTrack);
  const isElevenPlus = effectiveTrack === '11plus';
  const activeTrack: 'gcse' | '11plus' = isElevenPlus ? '11plus' : 'gcse';
  const availableTopics = isElevenPlus ? topicsList11Plus : topicsList;
  useEffect(() => {
    refreshUsage?.();
    const handleUsageUpdate = () => {
      refreshUsage?.();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mockUsageUpdated", handleUsageUpdate);
      window.addEventListener("challengeUsageUpdated", handleUsageUpdate);
      return () => {
        window.removeEventListener("mockUsageUpdated", handleUsageUpdate);
        window.removeEventListener("challengeUsageUpdated", handleUsageUpdate);
      };
    }
  }, [refreshUsage]);
  const challengeLimitForDisplay = dailyChallengeLimit ?? FREE_CHALLENGE_LIMIT;
  const challengeDisplayUses = Math.min(dailyChallengeUses, challengeLimitForDisplay);
  const renderDotRow = (used: number, limit: number, maxVisible: number) => {
    if (!Number.isFinite(limit) || limit <= 0 || maxVisible <= 0) return null;
    const dotCount = Math.min(limit, maxVisible);
    if (dotCount <= 0) return null;
    const filledDots = Math.min(used, dotCount);
    return (
      <div className="flex gap-1">
        {Array.from({ length: dotCount }, (_, index) => (
          <span
            key={`limit-dot-${limit}-${index}`}
            className={cn(
              'h-2.5 w-2.5 rounded-full transition-colors',
              index < filledDots ? 'bg-primary' : 'bg-border/40'
            )}
          />
        ))}
      </div>
    );
  };
  const mockDots = renderDotRow(dailyMockUses, dailyMockLimit, 3);
  const challengeDots = renderDotRow(challengeDisplayUses, challengeLimitForDisplay, 8);
  const practiceDots = Number.isFinite(dailyLimit)
    ? renderDotRow(dailyUses, dailyLimit, Math.min(5, dailyLimit))
    : null;
  const practiceLimited = !isPremium && Number.isFinite(dailyLimit) && dailyUses >= dailyLimit;

  // If query params already specify mode/topics/etc, render session directly
  const hasParams = !!(searchParams.get('topics') || searchParams.get('questionIds') || searchParams.get('mode'));
  
  const [tierSelection, setTierSelection] = useState<TierSelection>(() => {
    const saved = localStorage.getItem('practiceTiers');
    if (saved) {
      const tiers = JSON.parse(saved);
      if (tiers.length === 2) return 'both';
      return tiers[0] || 'higher';
    }
    return 'both';
  });

  const [calcSelection, setCalcSelection] = useState<CalcSelection>(() => {
    const saved = localStorage.getItem('practicePaperTypes');
    if (saved) {
      const types = JSON.parse(saved);
      if (types.length === 2) return 'both';
      return types[0] || 'calculator';
    }
    return 'both';
  });

  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem('practiceTopics');
    return saved ? JSON.parse(saved) : [isElevenPlus ? 'Number' : 'Number'];
  });

  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>(() => {
    const savedMulti = localStorage.getItem('practiceSubtopics');
    if (savedMulti) {
      try {
        const parsed = JSON.parse(savedMulti);
        if (Array.isArray(parsed)) return normalizeSubtopicSelection(parsed.filter((x) => typeof x === 'string'));
      } catch {
        // ignore
      }
    }

    const legacy = localStorage.getItem('practiceSubtopic');
    if (legacy && legacy !== 'all') return normalizeSubtopicSelection([legacy]);
    return [];
  });
  const [subtopicCounts, setSubtopicCounts] = useState<Record<string, number>>({});
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  const subtopicCountCacheRef = useRef(new Map<string, Record<string, number>>());
  const [showPracticeLimitModal, setShowPracticeLimitModal] = useState(false);

  useEffect(() => { localStorage.setItem('practiceTiers', JSON.stringify(tierSelection === 'both' ? ['foundation','higher'] : [tierSelection])); }, [tierSelection]);
  useEffect(() => { localStorage.setItem('practicePaperTypes', JSON.stringify(calcSelection === 'both' ? ['calculator','non-calculator'] : [calcSelection])); }, [calcSelection]);
  useEffect(() => { localStorage.setItem('practiceTopics', JSON.stringify(selectedTopics)); }, [selectedTopics]);
  useEffect(() => {
    const allowed = new Set(availableTopics.map((topic) => topic.id));
    setSelectedTopics((prev) => {
      const filtered = prev.filter((topic) => allowed.has(topic));
      return filtered.length > 0 ? filtered : [availableTopics[0]?.id || 'Number'];
    });
  }, [availableTopics]);
  useEffect(() => {
    localStorage.setItem('practiceSubtopics', JSON.stringify(selectedSubtopics));
    // Legacy compatibility (single value)
    localStorage.setItem('practiceSubtopic', selectedSubtopics[0] ?? 'all');
  }, [selectedSubtopics]);

  useEffect(() => {
    if (selectedTopics.length === 0) {
      setSelectedSubtopics([]);
      return;
    }

    if (isElevenPlus) {
      const allowedTopicKeys = new Set(
        selectedTopics
          .map((topicId) => TOPIC_ID_TO_SUBTOPIC_PREFIX_11PLUS[topicId])
          .filter(Boolean)
      );
      setSelectedSubtopics((prev) => normalizeSubtopicSelection(prev).filter((id) => allowedTopicKeys.has((id.split('|')[0] || '').trim())));
      return;
    }

    const allowedTopicKeys = new Set(
      selectedTopics
        .map((t) => TOPIC_ID_TO_KEY[t])
        .filter((k): k is keyof typeof TOPIC_SUBTOPICS => Boolean(k))
    );
    setSelectedSubtopics((prev) => normalizeSubtopicSelection(prev).filter((id) => allowedTopicKeys.has((id.split('|')[0] || '') as keyof typeof TOPIC_SUBTOPICS)));
  }, [isElevenPlus, selectedTopics]);

  useEffect(() => {
    const fetchSubtopicCounts = async () => {
      if (selectedTopics.length === 0) {
        setSubtopicCounts({});
        return;
      }

      const topicsToCount = isElevenPlus
        ? selectedTopics
            .map((topicId) => {
              const topicKey = TOPIC_ID_TO_SUBTOPIC_PREFIX_11PLUS[topicId];
              const topic = topicKey ? ELEVEN_PLUS_SUBTOPICS[topicKey] : undefined;
              return topic && topicKey ? { topicId, topicKey, topic } : null;
            })
            .filter((x): x is { topicId: string; topicKey: string; topic: Array<{ key: string; name: string }> } => Boolean(x))
        : selectedTopics
            .map((topicId) => {
              const topicKey = TOPIC_ID_TO_KEY[topicId];
              const topic = topicKey ? TOPIC_SUBTOPICS[topicKey] : undefined;
              return topic && topicKey ? { topicId, topicKey, topic: topic.subtopics } : null;
            })
            .filter((x): x is { topicId: string; topicKey: string; topic: Array<{ key: string; name: string }> } => Boolean(x));

      if (topicsToCount.length === 0) {
        setSubtopicCounts({});
        return;
      }

      const dbTier = isElevenPlus
        ? ['11+ Standard']
        : tierSelection === 'both'
          ? ['Foundation Tier', 'Higher Tier']
          : tierSelection === 'higher'
            ? ['Higher Tier']
            : ['Foundation Tier'];
      const dbCalculator = isElevenPlus
        ? ['Non-Calculator']
        : calcSelection === 'both'
          ? ['Calculator', 'Non-Calculator']
          : calcSelection === 'calculator'
            ? ['Calculator']
            : ['Non-Calculator'];

      setSubtopicsLoading(true);
      try {
        const cacheKey = JSON.stringify({
          track: activeTrack,
          topics: [...selectedTopics].sort(),
          tier: [...dbTier].sort(),
          calculator: [...dbCalculator].sort(),
          isElevenPlus,
        });
        const cached = subtopicCountCacheRef.current.get(cacheKey);
        if (cached) {
          setSubtopicCounts(cached);
          return;
        }

        const subtopicJobs = topicsToCount.flatMap(({ topicId, topicKey, topic }) =>
          topic.map((st) => ({
            topicId,
            subtopicId: `${topicKey}|${st.key}`,
          }))
        );

        const results = await Promise.all(
          subtopicJobs.map(async ({ topicId, subtopicId }) => {
            const questionTypes = expandQuestionTypesForDb(topicId);
            const subtopicCandidates = expandSubtopicIdsForDb(subtopicId);
            const subtopicFilter = subtopicCandidates.length > 0 ? subtopicCandidates : [subtopicId];

            let query = supabase
              .from('exam_questions')
              .select('id', { count: 'exact', head: true })
              .in('question_type', questionTypes.length > 0 ? questionTypes : [topicId])
              .in('subtopic', subtopicFilter);

            query = dbTier.length === 1 ? query.eq('tier', dbTier[0]) : query.in('tier', dbTier);
            query = dbCalculator.length === 1 ? query.eq('calculator', dbCalculator[0]) : query.in('calculator', dbCalculator);
            // TRACK FILTER — Ensures separation between GCSE and 11+
            query = query.eq('track', activeTrack);

            const { count, error } = await query;
            if (error) throw error;

            if (!isElevenPlus || (count || 0) > 0) {
              return [subtopicId, count || 0] as const;
            }

            // Legacy 11+ rows can have subtopic matches but drifted question_type labels.
            let fallbackQuery = supabase
              .from('exam_questions')
              .select('id', { count: 'exact', head: true })
              .in('subtopic', subtopicFilter);
            fallbackQuery = dbTier.length === 1 ? fallbackQuery.eq('tier', dbTier[0]) : fallbackQuery.in('tier', dbTier);
            fallbackQuery = dbCalculator.length === 1 ? fallbackQuery.eq('calculator', dbCalculator[0]) : fallbackQuery.in('calculator', dbCalculator);
            fallbackQuery = fallbackQuery.eq('track', activeTrack);

            const { count: fallbackCount, error: fallbackError } = await fallbackQuery;
            if (fallbackError) throw fallbackError;

            return [subtopicId, fallbackCount || 0] as const;
          })
        );

        const nextCounts = Object.fromEntries(results);
        subtopicCountCacheRef.current.set(cacheKey, nextCounts);
        setSubtopicCounts(nextCounts);
      } catch {
        setSubtopicCounts({});
      } finally {
        setSubtopicsLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchSubtopicCounts();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [selectedTopics, tierSelection, calcSelection, activeTrack, isElevenPlus]);

  const toggleTopic = (topicId: string) => setSelectedTopics(prev => prev.includes(topicId) ? prev.filter(t=>t!==topicId) : [...prev, topicId]);

  const startPractice = () => {
    if (practiceLimited) {
      setShowPracticeLimitModal(true);
      return;
    }
    const normalizedSubtopics = normalizeSubtopicSelection(selectedSubtopics);
    const params = new URLSearchParams({
      tier: isElevenPlus ? '11plus-standard' : tierSelection,
      paperType: isElevenPlus ? 'non-calculator' : calcSelection,
      topics: selectedTopics.join(','),
      mode: 'practice',
      ...(isElevenPlus ? { track: '11plus' } : {}),
    });
    if (normalizedSubtopics.length > 0) params.set('subtopic', normalizedSubtopics.join(','));
    navigate(`/practice-page?${params.toString()}`);
  };

  if (hasParams) return <PracticeSessionNew />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Start Practice</h1>
        <p className="text-sm text-muted-foreground">Choose topics and subtopic</p>
      </header>
      <MultipartPracticePanel userEmail={user?.email ?? null} />
      <div className="mb-6 space-y-4 rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="text-sm font-semibold text-foreground">
          Daily practice, mock exams and challenge questions
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Mocks</p>
            <p className="text-lg font-semibold text-foreground">
              {isPremium ? 'Unlimited' : `${dailyMockUses}/${dailyMockLimit}`}
            </p>
          </div>
          {mockDots && (
            <div className="flex-shrink-0">
              {mockDots}
            </div>
          )}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Challenge questions
            </p>
            <p className="text-lg font-semibold text-foreground">
              {isPremium ? 'Unlimited' : `${challengeDisplayUses}/${challengeLimitForDisplay}`}
            </p>
          </div>
          {challengeDots && (
            <div className="flex-shrink-0">
              {challengeDots}
            </div>
          )}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Practice questions
            </p>
            <p className="text-lg font-semibold text-foreground">
              {isPremium ? 'Unlimited' : `${dailyUses}/${dailyLimit}`}
            </p>
          </div>
          {practiceDots && (
            <div className="flex-shrink-0">
              {practiceDots}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Daily limits reset every 24 hours
        </p>
      </div>

      {isElevenPlus && (
        <div className="mb-8 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-6 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest mb-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Premium
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">11+ Scholarship Challenge</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[85%] mb-5">
              Take on the hardest independent school entrance questions. This mode tests your advanced reasoning skills with complex, multi-step word problems.
            </p>
            <Button 
              onClick={() => {
                if (!isPremium && challengeDisplayUses >= challengeLimitForDisplay) {
                   setShowPracticeLimitModal(true);
                   return;
                }
                navigate(`/practice-page?mode=extreme&track=11plus`);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-0 font-bold"
            >
              Start Scholarship Challenge
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-6">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Calculator</div>
          {isElevenPlus ? (
            <div className="inline-flex items-center rounded-full border border-border/40 bg-card px-4 py-2 text-sm">
              Non-Calculator
            </div>
          ) : (
            <div className="flex gap-2">
              {calcOptions.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setCalcSelection(item.value)}
                  className={cn('px-4 py-2 rounded-full border', calcSelection === item.value ? 'bg-card border-primary' : 'bg-card border-border/40')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Topics</div>
          <div className="flex flex-wrap gap-2">
            {availableTopics.map(t=> (
              <button key={t.id} onClick={()=>toggleTopic(t.id)} className={cn('px-4 py-2 rounded-full border', selectedTopics.includes(t.id)? 'bg-card border-primary':'bg-card border-border/40')}>{t.label}</button>
            ))}
          </div>
        </div>

        {selectedTopics.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Subtopic</div>
            {(() => {
              const topicsToRender = isElevenPlus
                ? selectedTopics
                    .map((topicId) => {
                      const topicKey = TOPIC_ID_TO_SUBTOPIC_PREFIX_11PLUS[topicId];
                      const subtopics = topicKey ? ELEVEN_PLUS_SUBTOPICS[topicKey] : undefined;
                      return subtopics && topicKey ? { topicId, topicKey, topicName: topicId, subtopics } : null;
                    })
                    .filter((x): x is { topicId: string; topicKey: string; topicName: string; subtopics: Array<{ key: string; name: string }> } => Boolean(x))
                : selectedTopics
                    .map((topicId) => {
                      const topicKey = TOPIC_ID_TO_KEY[topicId];
                      const topic = topicKey ? TOPIC_SUBTOPICS[topicKey] : undefined;
                      return topic && topicKey ? { topicId, topicKey, topicName: topic.name, subtopics: topic.subtopics } : null;
                    })
                    .filter((x): x is { topicId: string; topicKey: string; topicName: string; subtopics: Array<{ key: string; name: string }> } => Boolean(x));

              if (topicsToRender.length === 0) return null;

              const toggleSubtopic = (subtopicId: string) => {
                setSelectedSubtopics((prev) => {
                  const next = new Set(prev);
                  if (next.has(subtopicId)) next.delete(subtopicId);
                  else next.add(subtopicId);
                  return Array.from(next);
                });
              };

              const isAll = selectedSubtopics.length === 0;
              const allCount = Object.values(subtopicCounts).reduce((sum, n) => sum + n, 0);

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubtopics([])}
                      className={cn(
                        'inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium transition-colors',
                        isAll
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border/40 text-foreground hover:border-border'
                      )}
                      disabled={subtopicsLoading}
                    >
                      <span>All</span>
                      <span className={cn('text-[11px] font-semibold', isAll ? 'text-primary-foreground/90' : 'text-muted-foreground')}>{allCount}</span>
                    </button>
                  </div>

                  {topicsToRender.map(({ topicKey, topicName, subtopics }) => (
                    <div key={topicKey} className="space-y-2">
                      <div className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
                        {topicName}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subtopics.map((st) => {
                          const subtopicId = `${topicKey}|${st.key}`;
                          const count = subtopicCounts[subtopicId] ?? 0;
                          const active = selectedSubtopics.includes(subtopicId);
                          return (
                            <button
                              key={subtopicId}
                              type="button"
                              onClick={() => toggleSubtopic(subtopicId)}
                              className={cn(
                                'inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium transition-colors',
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-card border-border/40 text-foreground hover:border-border'
                              )}
                              disabled={subtopicsLoading}
                              title={st.name}
                            >
                              <span className="max-w-[220px] truncate">{st.name}</span>
                              <span className={cn('text-[11px] font-semibold', active ? 'text-primary-foreground/90' : 'text-muted-foreground')}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        <div className="pt-4">
          <Button onClick={startPractice} className="w-full">Start Practice</Button>
        </div>
      </section>
      <PracticeLimitModal
        open={showPracticeLimitModal}
        onOpenChange={(open) => setShowPracticeLimitModal(open)}
        onComeBack={() => setShowPracticeLimitModal(false)}
      />
    </div>
  );
}
