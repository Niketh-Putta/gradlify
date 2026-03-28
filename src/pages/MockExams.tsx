import { useState, useEffect, useRef } from 'react';
import { PremiumLoader } from '@/components/PremiumLoader';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, BookOpen, Play, ArrowLeft, ArrowRight, History, Calculator, Check, Lock, Crown, X } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePremium } from '@/hooks/usePremium';
import { MockExamHistory } from '@/components/MockExamHistory';
import { PremiumUpgradeButton } from "@/components/PremiumUpgradeButton";
import { ChallengeLimitModal } from "@/components/ChallengeLimitModal";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { TOPIC_SUBTOPICS } from '@/lib/topicConstants';
import { expandQuestionTypesForDb, expandSubtopicIdsForDb } from '@/lib/subtopicIdUtils';
import { getExamBoardSubtitle } from '@/lib/examBoard';
import { FREE_CHALLENGE_LIMIT } from '@/lib/limits';
import MultipartPracticePanel from '@/components/experimental/MultipartPracticePanel';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import { resolveUserTrack } from '@/lib/track';
import { is11Plus, isGCSE } from '@/lib/track-config';
import { getTrackLabel } from '@/lib/trackCurriculum';

type ExamTier = 'higher' | 'foundation';
type PaperType = 'calculator' | 'non-calculator';
type ExamMode = 'practice' | 'mock-exam' | 'challenge';

type TopicCatalog = Record<string, { name: string; subtopics: Array<{ key: string; name: string }> }>;

const GCSE_TOPICS = [
  { id: 'Number', label: 'Number' },
  { id: 'Algebra', label: 'Algebra' },
  { id: 'Ratio & Proportion', label: 'Ratio & Proportion' },
  { id: 'Geometry & Measures', label: 'Geometry' },
  { id: 'Probability', label: 'Probability' },
  { id: 'Statistics', label: 'Statistics' },
];

const GCSE_TOPIC_ID_TO_KEY: Record<string, string> = {
  'Number': 'number',
  'Algebra': 'algebra',
  'Ratio & Proportion': 'ratio',
  'Geometry & Measures': 'geometry',
  'Probability': 'probability',
  'Statistics': 'statistics',
};

const ELEVEN_PLUS_TOPICS = [
  { id: 'Number & Arithmetic', label: 'Number & Arithmetic' },
  { id: 'Algebra & Ratio', label: 'Algebra & Ratio' },
  { id: 'Geometry & Measures', label: 'Geometry & Measures' },
  { id: 'Statistics & Data', label: 'Statistics & Data' },
  { id: 'Problem Solving & Strategies', label: 'Problem Solving & Strategies' },
];

const ELEVEN_PLUS_TOPIC_ID_TO_KEY: Record<string, string> = {
  'Number & Arithmetic': 'number',
  'Algebra & Ratio': 'algebra',
  'Geometry & Measures': 'geometry',
  'Statistics & Data': 'stats',
  'Problem Solving & Strategies': 'strategies',
};

const ELEVEN_PLUS_TOPIC_SUBTOPICS: TopicCatalog = {
  number: {
    name: 'Number & Arithmetic',
    subtopics: [
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
  },
  algebra: {
    name: 'Algebra & Ratio',
    subtopics: [
      { key: 'ratio', name: 'Ratio (Sharing & Simplifying)' },
      { key: 'proportion', name: 'Proportion (Recipes & Costs)' },
      { key: 'basics', name: 'Algebra Basics (Expressions)' },
      { key: 'substitution', name: 'Substitution' },
      { key: 'equations', name: 'Solving Equations' },
      { key: 'sequences', name: 'Sequences & Nth Term' },
    ],
  },
  geometry: {
    name: 'Geometry & Measures',
    subtopics: [
      { key: '2d-3d-shapes', name: '2D & 3D Shapes' },
      { key: 'angles', name: 'Angles & Parallel Lines' },
      { key: 'perimeter-area', name: 'Perimeter & Area' },
      { key: 'volume-surface-area', name: 'Volume & Surface Area' },
      { key: 'measures', name: 'Measures, Time & Speed' },
      { key: 'coordinates', name: 'Coordinates & Transformations' },
    ],
  },
  stats: {
    name: 'Statistics & Data',
    subtopics: [
      { key: 'data-handling', name: 'Data Handling (Mean, Median, Mode, Range)' },
      { key: 'charts-graphs', name: 'Charts & Graphs (Bar, Line, Pie)' },
      { key: 'probability', name: 'Probability' },
    ],
  },
  strategies: {
    name: 'Problem Solving & Strategies',
    subtopics: [
      { key: 'word-problems', name: 'Word Problems (RUCSAC)' },
      { key: 'logic', name: 'Logic & Reasoning' },
      { key: 'estimation', name: 'Estimation & Checking' },
    ],
  },
};

type ElevenPlusDifficultySelection = 'fluency' | 'application' | 'reasoning' | 'mixed';

const ELEVEN_PLUS_DIFFICULTY_OPTIONS: Array<{ value: ElevenPlusDifficultySelection; label: string }> = [
  { value: 'fluency', label: 'Fluency (Level 1)' },
  { value: 'application', label: 'Application (Level 2)' },
  { value: 'reasoning', label: 'Reasoning (Level 3)' },
  { value: 'mixed', label: 'Mixed' },
];

const getElevenPlusDifficultyRange = (selection: ElevenPlusDifficultySelection): { min: number | null; max: number | null } => {
  if (selection === 'fluency') return { min: 1, max: 1 };
  if (selection === 'application') return { min: 2, max: 2 };
  if (selection === 'reasoning') return { min: 3, max: 3 };
  return { min: null, max: null };
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

export default function MockExams() {
  // Safely get user context
  let user = null;
  let profile = null;
  try {
    const context = useAppContext();
    user = context.user;
    profile = context.profile;
  } catch {
    // Not authenticated
  }
  const resolvedTrack = resolveUserTrack(profile?.track ?? null);
  const userTrack = is11Plus ? '11plus' : (isGCSE ? 'gcse' : resolvedTrack);
  const isElevenPlus = userTrack === '11plus';
  const topics = userTrack === '11plus' ? ELEVEN_PLUS_TOPICS : GCSE_TOPICS;
  const TOPIC_ID_TO_KEY = userTrack === '11plus' ? ELEVEN_PLUS_TOPIC_ID_TO_KEY : GCSE_TOPIC_ID_TO_KEY;
  const TOPIC_CATALOG: TopicCatalog =
    userTrack === '11plus'
      ? ELEVEN_PLUS_TOPIC_SUBTOPICS
      : (TOPIC_SUBTOPICS as unknown as TopicCatalog);
  
  const navigate = useNavigate();
  const { canUse10Questions, canUse20Questions, canUse30Questions, canUseFullPaper, isPremium, canStartMockExam, canStartChallengeSession, dailyMockUses, dailyMockLimit, remainingMockUses, dailyChallengeUses, dailyChallengeLimit, refreshUsage } = usePremium(userTrack);
  const challengeLimitForDisplay = dailyChallengeLimit ?? FREE_CHALLENGE_LIMIT;
  const challengeDisplayUses = Math.min(dailyChallengeUses, challengeLimitForDisplay);
  const renderDotRow = (used: number, limit: number, maxVisible: number) => {
    if (!Number.isFinite(limit) && limit !== Infinity) return null;
    if (limit <= 0 || maxVisible <= 0) return null;
    if (!Number.isFinite(limit)) return null;
    const dotCount = Math.min(limit, maxVisible);
    if (dotCount <= 0) return null;
    const filledDots = Math.min(used, dotCount);
    return (
      <div className="flex gap-1">
        {Array.from({ length: dotCount }, (_, index) => (
          <span
            key={`limit-dot-${limit}-${index}`}
            className={cn(
              'h-2.5 w-2.5 rounded-full border transition-colors',
              index < filledDots ? 'bg-primary border-primary' : 'bg-muted border-border/40'
            )}
          />
        ))}
      </div>
    );
  };
  const mockDots = renderDotRow(dailyMockUses, dailyMockLimit, 2);
  const challengeDots = renderDotRow(challengeDisplayUses, challengeLimitForDisplay, 8);
  
  const [guestMockUsage, setGuestMockUsage] = useState(0);
  
  useEffect(() => {
    refreshUsage?.();
    const handleUsageUpdate = () => refreshUsage?.();
    if (typeof window !== "undefined") {
      window.addEventListener("mockUsageUpdated", handleUsageUpdate);
      window.addEventListener("challengeUsageUpdated", handleUsageUpdate);
    }
    if (!user) {
      const usage = parseInt(localStorage.getItem('guestMockUsage') || '0');
      setGuestMockUsage(usage);
      
      const handleStorageChange = () => {
        const newUsage = parseInt(localStorage.getItem('guestMockUsage') || '0');
        setGuestMockUsage(newUsage);
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('guestMockUsageChanged', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('guestMockUsageChanged', handleStorageChange);
        window.removeEventListener("mockUsageUpdated", handleUsageUpdate);
        window.removeEventListener("challengeUsageUpdated", handleUsageUpdate);
      };
    }
    return () => {
      window.removeEventListener("mockUsageUpdated", handleUsageUpdate);
      window.removeEventListener("challengeUsageUpdated", handleUsageUpdate);
    };
  }, [user, refreshUsage]);
  
  // Selection state with localStorage persistence
  const [tierSelection, setTierSelection] = useState<'foundation' | 'higher' | 'both'>(() => {
    const saved = localStorage.getItem('mockExamTiers');
    if (saved) {
      const tiers = JSON.parse(saved);
      if (tiers.length === 2) return 'both';
      return tiers[0] || 'higher';
    }
    return 'both';
  });
  
  const [calcSelection, setCalcSelection] = useState<'calculator' | 'non-calculator' | 'both'>(() => {
    const saved = localStorage.getItem('mockExamPaperTypes');
    if (saved) {
      const types = JSON.parse(saved);
      if (types.length === 2) return 'both';
      return types[0] || 'calculator';
    }
    return 'both';
  });
  const [elevenPlusDifficulty, setElevenPlusDifficulty] = useState<ElevenPlusDifficultySelection>(() => {
    const saved = localStorage.getItem('mockExam11PlusDifficulty');
    if (saved === 'fluency' || saved === 'application' || saved === 'reasoning' || saved === 'mixed') return saved;
    return 'mixed';
  });
  
  const [examMode, setExamMode] = useState<ExamMode>(() => {
    const saved = localStorage.getItem('mockExamMode');
    if (!saved) return 'practice';
    const parsed = JSON.parse(saved);
    return parsed === 'mock-exam' || parsed === 'challenge' ? parsed : 'practice';
  });
  
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem('mockExamTopics');
    return saved ? JSON.parse(saved) : ['Number'];
  });

  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>(() => {
    const savedMulti = localStorage.getItem('mockExamSubtopics');
    if (savedMulti) {
      try {
        const parsed = JSON.parse(savedMulti);
        if (Array.isArray(parsed)) return normalizeSubtopicSelection(parsed.filter((x) => typeof x === 'string'));
      } catch {
        // ignore
      }
    }

    const legacy = localStorage.getItem('mockExamSubtopic');
    if (legacy && legacy !== 'all') return normalizeSubtopicSelection([legacy]);
    return [];
  });
  const [subtopicCounts, setSubtopicCounts] = useState<Record<string, number>>({});
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  
  const [showMockDialog, setShowMockDialog] = useState(false);
  const [showMockLimitModal, setShowMockLimitModal] = useState(false);
  const [showChallengeLimitModal, setShowChallengeLimitModal] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<10 | 20 | 30 | 50>(10);
  const [loading, setLoading] = useState(false);
  const [elevenPlusChallengeCount, setElevenPlusChallengeCount] = useState<number | null>(null);

  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const subtopicCountCacheRef = useRef(new Map<string, Record<string, number>>());
  
  // Save to localStorage
  useEffect(() => {
    const tiers = tierSelection === 'both' ? ['foundation', 'higher'] : [tierSelection];
    localStorage.setItem('mockExamTiers', JSON.stringify(tiers));
  }, [tierSelection]);
  
  useEffect(() => {
    const types = calcSelection === 'both' ? ['calculator', 'non-calculator'] : [calcSelection];
    localStorage.setItem('mockExamPaperTypes', JSON.stringify(types));
  }, [calcSelection]);

  useEffect(() => {
    if (!isElevenPlus) return;
    setCalcSelection('non-calculator');
  }, [isElevenPlus]);

  useEffect(() => {
    localStorage.setItem('mockExam11PlusDifficulty', elevenPlusDifficulty);
  }, [elevenPlusDifficulty]);
  
  useEffect(() => {
    localStorage.setItem('mockExamMode', JSON.stringify(examMode));
  }, [examMode]);
  
  useEffect(() => {
    localStorage.setItem('mockExamTopics', JSON.stringify(selectedTopics));
  }, [selectedTopics]);

  useEffect(() => {
    const allowed = new Set(topics.map((topic) => topic.id));
    setSelectedTopics((prev) => {
      const filtered = prev.filter((topic) => allowed.has(topic));
      if (filtered.length > 0) return filtered;
      return topics[0] ? [topics[0].id] : [];
    });
  }, [userTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('mockExamSubtopics', JSON.stringify(selectedSubtopics));
    // Legacy compatibility (single value)
    localStorage.setItem('mockExamSubtopic', selectedSubtopics[0] ?? 'all');
  }, [selectedSubtopics]);

  useEffect(() => {
    if (!isElevenPlus) {
      setElevenPlusChallengeCount(null);
      return;
    }

    let isActive = true;

    const fetchChallengeCount = async () => {
      const { count, error } = await supabase
        .from('extreme_questions')
        .select('id', { count: 'exact', head: true })
        .eq('track', '11plus');

      if (!isActive) return;
      if (error) return;

      setElevenPlusChallengeCount(count ?? 0);
    };

    fetchChallengeCount();

    return () => {
      isActive = false;
    };
  }, [isElevenPlus]);

  useEffect(() => {
    if (selectedTopics.length === 0) {
      setSelectedSubtopics([]);
      return;
    }

    const allowedTopicKeys = new Set(
      selectedTopics
        .map((t) => TOPIC_ID_TO_KEY[t])
        .filter((k): k is string => Boolean(k))
    );

    setSelectedSubtopics((prev) => normalizeSubtopicSelection(prev).filter((id) => allowedTopicKeys.has((id.split('|')[0] || '').trim())));
  }, [examMode, selectedTopics]);

  useEffect(() => {
    const fetchSubtopicCounts = async () => {
      if (selectedTopics.length === 0) {
        setSubtopicCounts({});
        return;
      }

      const topicsToCount = selectedTopics
        .map((topicId) => {
          const topicKey = TOPIC_ID_TO_KEY[topicId];
          const topic = topicKey ? TOPIC_CATALOG[topicKey] : undefined;
          return topic && topicKey ? { topicId, topicKey, topic } : null;
        })
        .filter((x): x is { topicId: string; topicKey: string; topic: { name: string; subtopics: Array<{ key: string; name: string }> } } => Boolean(x));

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
      const difficultyRange = isElevenPlus ? getElevenPlusDifficultyRange(elevenPlusDifficulty) : { min: null, max: null };

      const cacheKey = JSON.stringify({
        track: userTrack,
        tiers: dbTier,
        calculators: dbCalculator,
        difficulty: difficultyRange,
        topics: [...selectedTopics].sort(),
      });

      const cached = subtopicCountCacheRef.current.get(cacheKey);
      if (cached) {
        setSubtopicCounts(cached);
        return;
      }

      setSubtopicsLoading(true);
      try {
        const jobs = topicsToCount.flatMap(({ topicId, topicKey, topic }) =>
          topic.subtopics.map((st) => ({
            topicId,
            subtopicId: `${topicKey}|${st.key}`,
          }))
        );

        const results = await Promise.all(
          jobs.map(async ({ topicId, subtopicId }) => {
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
            if (difficultyRange.min != null) query = query.gte('difficulty', difficultyRange.min);
            if (difficultyRange.max != null) query = query.lte('difficulty', difficultyRange.max);
            query = query.eq('track', userTrack);

            const { count, error } = await query;
            if (error) throw error;
            if (!isElevenPlus || (count || 0) > 0) {
              return [subtopicId, count || 0] as const;
            }

            // Legacy 11+ rows can keep subtopic values but drift in question_type labels.
            let fallbackQuery = supabase
              .from('exam_questions')
              .select('id', { count: 'exact', head: true })
              .in('subtopic', subtopicFilter);
            fallbackQuery = dbTier.length === 1 ? fallbackQuery.eq('tier', dbTier[0]) : fallbackQuery.in('tier', dbTier);
            fallbackQuery = dbCalculator.length === 1 ? fallbackQuery.eq('calculator', dbCalculator[0]) : fallbackQuery.in('calculator', dbCalculator);
            if (difficultyRange.min != null) fallbackQuery = fallbackQuery.gte('difficulty', difficultyRange.min);
            if (difficultyRange.max != null) fallbackQuery = fallbackQuery.lte('difficulty', difficultyRange.max);
            fallbackQuery = fallbackQuery.eq('track', userTrack);

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
  }, [selectedTopics, examMode, tierSelection, calcSelection, isElevenPlus, userTrack, elevenPlusDifficulty]);

  useEffect(() => {
    const fetchCounts = async () => {
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
      const difficultyRange = isElevenPlus ? getElevenPlusDifficultyRange(elevenPlusDifficulty) : { min: null, max: null };

      const countForTopic = async (topicId: string) => {
        const questionTypes = expandQuestionTypesForDb(topicId);
        let query = supabase
          .from('exam_questions')
          .select('id', { count: 'exact', head: true })
          .in('question_type', questionTypes.length > 0 ? questionTypes : [topicId]);

        if (dbTier.length === 1) query = query.eq('tier', dbTier[0]);
        else query = query.in('tier', dbTier);

        if (dbCalculator.length === 1) query = query.eq('calculator', dbCalculator[0]);
        else query = query.in('calculator', dbCalculator);
        if (difficultyRange.min != null) query = query.gte('difficulty', difficultyRange.min);
        if (difficultyRange.max != null) query = query.lte('difficulty', difficultyRange.max);
        query = query.eq('track', userTrack);

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      };

      try {
        const results = await Promise.all(topics.map(async (t) => [t.id, await countForTopic(t.id)] as const));
        setTopicCounts(Object.fromEntries(results));
      } catch {
        setTopicCounts({});
      }
    };

    const timer = window.setTimeout(() => {
      void fetchCounts();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [tierSelection, calcSelection, examMode, isElevenPlus, userTrack, elevenPlusDifficulty]);

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(t => t !== topicId)
        : [...prev, topicId]
    );
  };

  const toggleAllTopics = () => {
    if (selectedTopics.length === topics.length) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(topics.map(t => t.id));
    }
  };

  const startPractice = () => {
    const normalizedSubtopics = normalizeSubtopicSelection(selectedSubtopics);
    const tiers = isElevenPlus ? ['11plus-standard'] : (tierSelection === 'both' ? ['foundation', 'higher'] : [tierSelection]);
    const paperTypes = isElevenPlus ? ['non-calculator'] : (calcSelection === 'both' ? ['calculator', 'non-calculator'] : [calcSelection]);
    const params = new URLSearchParams({
      tier: tiers.join(','),
      paperType: paperTypes.join(','),
      topics: selectedTopics.join(','),
      mode: 'practice',
      ...(isElevenPlus ? { track: '11plus' } : {}),
    });

    if (normalizedSubtopics.length > 0) {
      params.set('subtopic', normalizedSubtopics.join(','));
    }
    if (isElevenPlus) {
      if (elevenPlusDifficulty === 'fluency') {
        params.set('difficultyMin', '1');
        params.set('difficultyMax', '1');
      } else if (elevenPlusDifficulty === 'application') {
        params.set('difficultyMin', '2');
        params.set('difficultyMax', '2');
      } else if (elevenPlusDifficulty === 'reasoning') {
        params.set('difficultyMin', '3');
        params.set('difficultyMax', '3');
      }
    }
    navigate(`/practice-page?${params.toString()}`);
  };

  const startChallengeSession = () => {
    if (!canStartChallengeSession) {
      setShowChallengeLimitModal(true);
      return;
    }
    const params = new URLSearchParams({
      mode: 'extreme',
      topics: selectedTopics.join(','),
      ...(isElevenPlus ? { track: '11plus' } : {}),
    });
    navigate(`/practice-page?${params.toString()}`);
  };

  const startMockExam = () => {
    if (mockLimited) {
      setShowMockLimitModal(true);
      return;
    }
    setShowMockDialog(true);
  };

  const confirmMockExam = async () => {
    if (!canStartMockExam) {
      setShowMockLimitModal(true);
      setShowMockDialog(false);
      return;
    }

    const tiers = isElevenPlus ? ['11plus-standard'] : (tierSelection === 'both' ? ['foundation', 'higher'] : [tierSelection]);
    const paperTypes = isElevenPlus ? ['non-calculator'] : (calcSelection === 'both' ? ['calculator', 'non-calculator'] : [calcSelection]);
    const normalizedSubtopics = normalizeSubtopicSelection(selectedSubtopics);
    
    const params = new URLSearchParams({
      tier: tiers.join(','),
      paperType: paperTypes.join(','),
      topics: selectedTopics.join(','),
      mode: 'mock',
      questions: selectedQuestionCount.toString(),
      ...(isElevenPlus ? { track: '11plus' } : {}),
    });
    if (normalizedSubtopics.length > 0) {
      params.set('subtopic', normalizedSubtopics.join(','));
    }
    if (isElevenPlus) {
      if (elevenPlusDifficulty === 'fluency') {
        params.set('difficultyMin', '1');
        params.set('difficultyMax', '1');
      } else if (elevenPlusDifficulty === 'application') {
        params.set('difficultyMin', '2');
        params.set('difficultyMax', '2');
      } else if (elevenPlusDifficulty === 'reasoning') {
        params.set('difficultyMin', '3');
        params.set('difficultyMax', '3');
      }
    }
    navigate(`/mock-exam?${params.toString()}`);
    setShowMockDialog(false);
        toast.success('Mock exam started!');
  };

  // Calculate estimated questions
  const getEstimatedQuestions = () => {
    // If one or more specific mini-subtopics are selected, estimate from those counts.
    // (If none are selected, the UI means "All" for the chosen topics.)
    if (selectedSubtopics.length > 0) {
      return selectedSubtopics.reduce((sum, subtopicId) => sum + (subtopicCounts[subtopicId] ?? 0), 0);
    }

    return selectedTopics.reduce((sum, topicId) => sum + (topicCounts[topicId] ?? 0), 0);
  };

  const getFixedTopicCount = (topicId: string, rawCount: number): number => {
    if (isElevenPlus && topicId === 'Algebra & Ratio') return 360;
    return rawCount;
  };

  const getTopicDisplayCount = (topicId: string): number => {
    const topicKey = TOPIC_ID_TO_KEY[topicId];
    const topic = topicKey ? TOPIC_CATALOG[topicKey] : undefined;
    if (!topic || !topicKey) return getFixedTopicCount(topicId, topicCounts[topicId] ?? 0);

    const subtopicIds = topic.subtopics.map((st) => `${topicKey}|${st.key}`);
    const hasAllSubtopicCounts = subtopicIds.length > 0 && subtopicIds.every((id) => subtopicCounts[id] != null);
    if (hasAllSubtopicCounts) {
      return getFixedTopicCount(topicId, subtopicIds.reduce((sum, id) => sum + (subtopicCounts[id] ?? 0), 0));
    }

    return getFixedTopicCount(topicId, topicCounts[topicId] ?? 0);
  };

  const canStart = selectedTopics.length > 0;
  const mockLimited = examMode === 'mock-exam' && !canStartMockExam;
  const challengeLimited = examMode === 'challenge' && !canStartChallengeSession;

  // Summary tags
  const getModeLabel = () => {
    if (examMode === 'practice') return 'Practice';
    if (examMode === 'challenge') return 'Challenge Questions';
    return 'Mock Exam';
  };

  const getCalcLabel = () => {
    if (isElevenPlus) return 'No Calculator';
    if (calcSelection === 'calculator') return 'Calculator';
    if (calcSelection === 'non-calculator') return 'No Calculator';
    return 'Adaptive';
  };

  const getTierLabel = () => {
    if (isElevenPlus) {
      if (elevenPlusDifficulty === 'fluency') return 'Fluency (Level 1)';
      if (elevenPlusDifficulty === 'application') return 'Application (Level 2)';
      if (elevenPlusDifficulty === 'reasoning') return 'Reasoning (Level 3)';
      return 'Mixed';
    }
    if (tierSelection === 'foundation') return 'Foundation';
    if (tierSelection === 'higher') return 'Higher';
    return 'Mixed';
  };

  const getTopicsLabel = () => {
    if (selectedTopics.length === 0) return 'No topics';
    if (selectedTopics.length === topics.length) return 'All topics';
    return `${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PremiumLoader />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
        {/* Header */}
        <header className="flex items-center justify-between mb-10 sm:mb-14">
          <div>
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary mb-2">
              {getTrackLabel(userTrack)}
            </span>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Mock Exams & Practice</h1>
            <span className="text-xs sm:text-sm text-muted-foreground">Configure your session</span>
          </div>
          
          {user && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center shadow-sm">
                  <History className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Mock Exam History</DialogTitle>
                  <DialogDescription>
                    {AI_FEATURE_ENABLED
                      ? 'View your previous mock exams and AI feedback'
                      : 'View your previous mock exams'}
                  </DialogDescription>
                </DialogHeader>
                <MockExamHistory userId={user.id} />
              </DialogContent>
            </Dialog>
          )}
        </header>

        {/* Usage Card */}
        <div className="bg-card border border-border/40 rounded-2xl p-4 sm:p-5 mb-10 sm:mb-14 shadow-sm space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Daily mock exams and challenge questions
              </h4>
              <span className="text-xs text-muted-foreground">
                {(mockLimited || challengeLimited) ? 'Limit reached' : 'Resets at midnight'}
              </span>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.36em] text-muted-foreground">
                Mocks
              </p>
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
              <p className="text-[11px] uppercase tracking-[0.36em] text-muted-foreground">
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
          <p className="text-xs text-muted-foreground">
            Daily limits reset every 24 hours
          </p>
        </div>

        <MultipartPracticePanel userEmail={user?.email ?? null} />

        {/* Step 1: Session Type */}
        <section className="mb-10 sm:mb-14">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">Step 1</span>
          </div>
          <h2 className="text-xl sm:text-[22px] font-semibold text-foreground tracking-tight mb-1.5">Session Type</h2>
          <p className="text-sm text-muted-foreground mb-6">Choose how you'd like to practice today</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { mode: 'practice' as ExamMode, icon: BookOpen, title: 'Practice', desc: 'Self-paced learning' },
              { mode: 'mock-exam' as ExamMode, icon: Timer, title: 'Mock Exam', desc: 'Timed conditions' },
              { mode: 'challenge' as ExamMode, icon: Crown, title: 'Challenge Questions', desc: 'Hardest mixed questions' },
            ].map((item) => (
              <button
                key={item.mode}
                onClick={() => setExamMode(item.mode)}
                className={cn(
                  "relative bg-card border rounded-xl p-5 text-left transition-all duration-200 flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0 shadow-sm",
                  examMode === item.mode 
                    ? "border-primary bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.12)]" 
                    : "border-border/40 hover:border-border hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                  examMode === item.mode 
                    ? "bg-primary/10 text-primary" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="sm:mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-foreground mb-0.5 tracking-tight">
                      {item.title}
                    </h3>
                    {item.mode === 'challenge' && isElevenPlus && elevenPlusChallengeCount != null && (
                      <Badge variant="outline" className="text-[11px] normal-case px-2 py-0.5 tracking-tight">
                        {elevenPlusChallengeCount} question{elevenPlusChallengeCount === 1 ? '' : 's'} available
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground">{item.desc}</p>
                </div>
                <div className={cn(
                  "absolute top-3.5 right-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  examMode === item.mode 
                    ? "bg-primary border-primary" 
                    : "border-border"
                )}>
                  {examMode === item.mode && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Constraints */}
        {examMode !== 'challenge' && (
        <section className="mb-10 sm:mb-14 transition-opacity">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">Step 2</span>
          </div>
          <h2 className="text-xl sm:text-[22px] font-semibold text-foreground tracking-tight mb-1.5">Constraints</h2>
          <p className="text-sm text-muted-foreground mb-6">Set your exam parameters</p>
          
          <div className={cn("grid grid-cols-1 gap-6", !isElevenPlus && "sm:grid-cols-2")}>
            {!isElevenPlus && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Calculator</div>
                <div className="flex gap-2">
                  {[
                    { value: 'non-calculator' as const, label: 'Without' },
                    { value: 'calculator' as const, label: 'With' },
                    { value: 'both' as const, label: 'Adaptive' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setCalcSelection(item.value)}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm",
                        calcSelection === item.value
                          ? "bg-card border-primary text-foreground shadow-[0_2px_12px_hsl(var(--primary)/0.12)] border"
                          : "bg-card border border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">{isElevenPlus ? 'Difficulty' : 'Tier'}</div>
              <div className={cn("transition-all duration-200", isElevenPlus ? "grid grid-cols-2 gap-3" : "flex gap-2")}>
                {(isElevenPlus
                  ? ELEVEN_PLUS_DIFFICULTY_OPTIONS.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setElevenPlusDifficulty(item.value)}
                        className={cn(
                          "rounded-2xl px-3 py-2 text-[12px] leading-snug font-semibold text-center shadow-sm transition-all duration-200",
                          elevenPlusDifficulty === item.value
                            ? "bg-card border-primary text-foreground shadow-[0_2px_12px_hsl(var(--primary)/0.12)] border"
                            : "bg-card border border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30",
                        )}
                      >
                        {item.label}
                      </button>
                    ))
                  : [
                      { value: 'foundation' as const, label: 'Foundation' },
                      { value: 'higher' as const, label: 'Higher' },
                      { value: 'both' as const, label: 'Mixed' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setTierSelection(item.value)}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center justify-center shadow-sm",
                          tierSelection === item.value
                            ? "bg-card border-primary text-foreground shadow-[0_2px_12px_hsl(var(--primary)/0.12)] border"
                            : "bg-card border border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30",
                        )}
                      >
                        {item.label}
                      </button>
                    )))}
              </div>
            </div>
          </div>

        </section>
        )}

        {/* Step 3: Topics */}
        {examMode !== 'challenge' && (
        <section className="mb-10 sm:mb-14 transition-opacity">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">Step 3</span>
          </div>
          <h2 className="text-xl sm:text-[22px] font-semibold text-foreground tracking-tight mb-1.5">Content</h2>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">Select topics to include in your session</p>
            <button 
              onClick={toggleAllTopics}
              className="text-[13px] text-primary font-medium hover:opacity-70 transition-opacity"
            >
              {selectedTopics.length === topics.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={cn(
                  "inline-flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-full transition-all duration-200 shadow-sm",
                  selectedTopics.includes(topic.id)
                    ? "bg-card border-primary shadow-[0_2px_12px_hsl(var(--primary)/0.12)] border"
                    : "bg-card border border-border/40 hover:border-border hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                <div className={cn(
                  "w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all",
                  selectedTopics.includes(topic.id)
                    ? "bg-primary border-primary"
                    : "border-border"
                )}>
                  {selectedTopics.includes(topic.id) && (
                    <Check className="h-2.5 w-2.5 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">{topic.label}</span>
                <span className="text-xs text-muted-foreground/70 font-medium ml-0.5">{getTopicDisplayCount(topic.id)}</span>
              </button>
            ))}
          </div>

          {/* Subtopics */}
          {selectedTopics.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Subtopic</div>
              {(() => {
                const topicsToRender = selectedTopics
                  .map((topicId) => {
                    const topicKey = TOPIC_ID_TO_KEY[topicId];
                    const topic = topicKey ? TOPIC_CATALOG[topicKey] : undefined;
                    return topic && topicKey ? { topicId, topicKey, topic } : null;
                  })
                  .filter((x): x is { topicId: string; topicKey: string; topic: { name: string; subtopics: Array<{ key: string; name: string }> } } => Boolean(x));

                if (topicsToRender.length === 0) return null;

                const toggleSubtopic = (subtopicId: string) => {
                  setSelectedSubtopics((prev) => {
                    const next = new Set(prev);
                    if (next.has(subtopicId)) next.delete(subtopicId);
                    else next.add(subtopicId);
                    return Array.from(next);
                  });
                };

                const toggleAllSubtopicsForTopic = (topicKey: string, topic: { name: string; subtopics: Array<{ key: string; name: string }> }) => {
                  const allIds = topic.subtopics.map((st) => `${topicKey}|${st.key}`);
                  setSelectedSubtopics((prev) => {
                    // NOTE: In this UI, an empty array means "All".
                    // If user clicks "Select all" for a specific topic while "All" is active,
                    // we interpret it as starting a specific selection for that topic.
                    const next = new Set(prev.length === 0 ? [] : prev);
                    const allSelected = allIds.every((id) => next.has(id));
                    if (allSelected) {
                      for (const id of allIds) next.delete(id);
                    } else {
                      for (const id of allIds) next.add(id);
                    }
                    return Array.from(next);
                  });
                };

                const isAll = selectedSubtopics.length === 0;
                const allCount = selectedTopics.reduce((sum, topicId) => sum + getTopicDisplayCount(topicId), 0);

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

                    {topicsToRender.map(({ topicKey, topic }) => (
                      <div key={topicKey} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
                            {topic.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAllSubtopicsForTopic(topicKey, topic)}
                            className={cn(
                              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors',
                              // Highlight if all mini subtopics for this topic are currently selected (and not in "All" mode).
                              selectedSubtopics.length > 0 && topic.subtopics.every((st) => selectedSubtopics.includes(`${topicKey}|${st.key}`))
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card border-border/40 text-foreground hover:border-border'
                            )}
                            disabled={subtopicsLoading}
                            title={`Select all ${topic.name} mini subtopics`}
                          >
                            {selectedSubtopics.length > 0 && topic.subtopics.every((st) => selectedSubtopics.includes(`${topicKey}|${st.key}`))
                              ? 'Deselect all'
                              : 'Select all'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.subtopics.map((st) => {
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
        </section>
        )}

        {/* Summary Panel */}
        <section className="bg-card border border-border/40 rounded-2xl p-6 sm:p-7 shadow-md">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/40">
            <h3 className="text-[15px] font-semibold text-foreground">Session Summary</h3>
            <span className="text-[13px] text-muted-foreground font-medium">
              {examMode === 'challenge'
                ? 'Challenge question stream'
                : examMode === 'mock-exam' 
                ? `${Math.max(1, Math.floor(getEstimatedQuestions() / 80))} exam${Math.floor(getEstimatedQuestions() / 80) > 1 ? 's' : ''} available`
                : `~${getEstimatedQuestions()} questions`
              }
            </span>
          </div>
          
          <div className="sm:flex sm:items-end sm:justify-between sm:gap-6">
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-0">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                {getModeLabel()}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                <Calculator className="h-3 w-3" />
                {getCalcLabel()}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                {getTierLabel()}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                {getTopicsLabel()}
              </span>
            </div>
            
            {examMode === 'practice' ? (
              user ? (
                <Button
                  onClick={startPractice}
                  disabled={!canStart || loading}
                  className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-primary/15"
                >
                  <span>Start Session</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <span>Sign Up for More</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )
            ) : examMode === 'challenge' ? (
              user ? (
                <Button
                  onClick={startChallengeSession}
                  disabled={loading}
                  className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-primary/15"
                >
                  <span>Start Challenge</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <span>Sign Up for More</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )
            ) : (
              <>
                {!user && guestMockUsage >= 1 ? (
                  <Button
                    onClick={() => navigate('/auth')}
                    className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    <span>Sign Up for More</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={startMockExam}
                      disabled={!canStart || loading}
                      className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-primary/15"
                    >
                      <span>Start Session</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Dialog open={showMockDialog} onOpenChange={setShowMockDialog}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Choose Exam Length</DialogTitle>
                          <DialogDescription>
                            Select the number of questions for your mock exam. The timer will be calculated from the selected questions.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                          <RadioGroup value={selectedQuestionCount.toString()} onValueChange={(value) => setSelectedQuestionCount(parseInt(value) as 10 | 20 | 30 | 50)}>
                            {[
                              { value: 10, label: '10 Questions', free: true },
                              { value: 20, label: '20 Questions', canUse: canUse20Questions },
                              { value: 30, label: '30 Questions', canUse: canUse30Questions },
                              { value: 50, label: 'Full Paper (50 Questions)', canUse: canUseFullPaper },
                            ].map((option) => {
                              const isAvailable = option.free || option.canUse;
                              return (
                                <div 
                                  key={option.value}
                                  className={cn(
                                    "flex items-center space-x-3 p-4 rounded-xl border transition-colors",
                                    isAvailable 
                                      ? "hover:bg-muted/50 cursor-pointer" 
                                      : "opacity-60 cursor-not-allowed bg-muted/30"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value={option.value.toString()} id={`q${option.value}`} disabled={!isAvailable} />
                                    {!isAvailable && <Lock className="h-4 w-4 text-muted-foreground" />}
                                  </div>
                                  <Label htmlFor={`q${option.value}`} className={cn("flex-1", isAvailable ? "cursor-pointer" : "cursor-not-allowed")}>
                                    <div className="font-medium">{option.label}</div>
                                    {!isAvailable && (
                                      <div className="text-sm text-muted-foreground">
                                        Premium Only
                                      </div>
                                    )}
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                          
                          <Button
                            onClick={confirmMockExam}
                            className="w-full h-12 bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/30 mt-4"
                          >
                            Start Mock Exam
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </>
            )}
          </div>
        </section>


        {/* Upgrade paywall */}
        {showMockLimitModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 sm:p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mock-limit-title"
            aria-describedby="mock-limit-description"
            onClick={() => setShowMockLimitModal(false)}
          >
            <div
              className="relative w-full max-w-[460px] sm:max-w-2xl max-h-[66vh] overflow-y-auto rounded-xl sm:rounded-[28px] border border-slate-200 bg-white p-3 sm:p-6 shadow-2xl shadow-black/20"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowMockLimitModal(false)}
                className="absolute right-2 top-2 sm:right-4 sm:top-4 rounded-full bg-slate-100 p-1 sm:p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <div className="text-center">
                <p className="text-[10px] sm:text-[13px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-slate-400 mb-1 sm:mb-2">Mock exams</p>
                <h3 id="mock-limit-title" className="text-base sm:text-2xl font-semibold text-slate-900">
                  Daily mock limit reached
                </h3>
                <p
                  id="mock-limit-description"
                  className="mt-1 sm:mt-2 text-[11px] sm:text-sm text-slate-500 max-w-xl mx-auto leading-snug sm:leading-relaxed"
                >
                  Start Your 3 Day Free Trial for more mock exams today and keep practising under timed conditions.
                </p>
              </div>

              <div className="mt-3 sm:mt-6 grid gap-2.5 sm:gap-4 sm:grid-cols-2">
                <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
                  <p className="text-xs sm:text-lg font-semibold text-slate-800 mb-2 sm:mb-4 text-center">Free</p>
                  <ul className="space-y-1.5 sm:space-y-3 text-[11px] sm:text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                      2 mock exams per day
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                      Timed mock conditions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                      {AI_FEATURE_ENABLED ? 'AI grading after submission' : 'Detailed grading after submission'}
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg sm:rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-500/20 via-purple-200/70 to-purple-50 p-3 sm:p-5">
                  <p className="text-xs sm:text-lg font-semibold text-purple-700 mb-2 sm:mb-4 text-center flex items-center justify-center gap-1">
                    <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                    Premium
                  </p>
                  <ul className="space-y-1.5 sm:space-y-3 text-[11px] sm:text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                      Unlimited mock exams
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                      {AI_FEATURE_ENABLED ? 'Deep AI insights and readiness analytics' : 'Deep insights and readiness analytics'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                      Priority access to new practice material
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-3 sm:mt-6">
                <PremiumUpgradeButton
                  label="Start 3 Day Free Trial"
                  size="compact"
                  className="w-full justify-center"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowMockLimitModal(false)}
                  className="mt-2 sm:mt-3 w-full h-8 sm:h-10 text-[11px] sm:text-sm text-slate-500 hover:text-slate-700"
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        )}

        <ChallengeLimitModal
          open={showChallengeLimitModal}
          onOpenChange={setShowChallengeLimitModal}
          onComeBack={() => setShowChallengeLimitModal(false)}
        />

        {/* Footer */}
        <footer className="text-center mt-12 pt-6">
          <p className="text-xs text-muted-foreground/60">
            {getExamBoardSubtitle((profile?.onboarding as any)?.examBoard)} · Gradlify © 2024
          </p>
        </footer>
      </div>
    </div>
  );
}
