import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Flag, ChevronLeft, ChevronRight, Check, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppContext } from "@/hooks/useAppContext";
import { resolveUserTrack } from "@/lib/track";
import { usePremium } from "@/hooks/usePremium";
import { useSubject } from "@/contexts/SubjectContext";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import MathText from '@/components/MathText';
import RichQuestionContent, { normalizeNewlines } from '@/components/RichQuestionContent';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';
import { areMathEquivalent, uniqueMathAnswers } from '@/lib/areMathEquivalent';
import { sanitizeAnswerSet } from '@/lib/answerSanitizer';
import { resolveQuestionImageUrl } from '@/lib/resolveQuestionImageUrl';
import { formatExplanation } from '@/lib/formatExplanation';
import { expandQuestionTypesForDb, expandSubtopicIdsForDb } from '@/lib/subtopicIdUtils';
import { getTopicAndSubtopicLabels, getTrackTopicLabel } from '@/lib/subtopicDisplay';
import { buildBalancedMix } from '@/lib/questionMix';
import { parseMultipartQuestion, MultipartQuestion } from '@/lib/multipart';
import { TOPIC_SUBTOPICS, getTopicSubtopicKeys } from '@/lib/topicConstants';
import { parseDbArray } from '@/lib/parseDbArray';

interface ExamQuestion {
  id: string;
  question: string;
  correct_answer: string;
  all_answers: string[];
  question_type: string;
  subtopic?: string;
  tier: string;
  calculator: string;
  difficulty?: number;
  marks?: number;
  estimated_time_sec?: number;
  index: number;
  image_url?: string;
  image_alt?: string;
  explanation?: string;
  multipart?: MultipartQuestion | null;
}

type AnswerValue = string | string[];

type DbExamQuestionRow = {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers?: unknown;
  all_answers?: unknown;
  question_type: string;
  subtopic?: string | null;
  difficulty?: number | null;
  marks?: number | null;
  estimated_time_sec?: number | null;
  tier: string;
  calculator: string;
  image_url?: string | null;
  image_alt?: string | null;
  explanation?: string | null;
};

const parseArray = (value: unknown): string[] => {
  return parseDbArray(value).map(String);
};

const parseAnswerArray = (value: AnswerValue | undefined): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value) return [value];
  return [];
};

const getQuestionMarks = (question: ExamQuestion): number => {
  const base = typeof question.marks === 'number' && Number.isFinite(question.marks) ? question.marks : 1;
  if (question.multipart) return Math.max(base, question.multipart.parts.length);
  return base;
};

const getDisplayDifficultyLevel = (difficulty?: number): 1 | 2 | 3 | null => {
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) return null;
  return Math.max(1, Math.min(3, Math.round(difficulty))) as 1 | 2 | 3;
};

const getDifficultyTagClass = (level: 1 | 2 | 3): string => {
  if (level === 1) return 'border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (level === 2) return 'border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-rose-300/40 bg-rose-500/10 text-rose-700 dark:text-rose-300';
};

const getQuestionDifficultyWeight = (difficulty?: number): number => {
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) return 2;
  return Math.max(1, Math.min(4, Math.round(difficulty)));
};

const parseTierSelection = (raw: string, isElevenPlus: boolean): string[] => {
  if (isElevenPlus) return ['11+ Standard'];
  const parts = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (parts.includes('both') || parts.includes('mixed') || parts.includes('adaptive')) {
    return ['Foundation Tier', 'Higher Tier'];
  }
  if (parts.includes('higher') || parts.includes('higher tier')) return ['Higher Tier'];
  if (parts.includes('foundation') || parts.includes('foundation tier')) return ['Foundation Tier'];
  return ['Higher Tier'];
};

const parsePaperTypeSelection = (raw: string, isElevenPlus: boolean): string[] => {
  if (isElevenPlus) return ['Non-Calculator'];
  const parts = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (parts.includes('both') || parts.includes('mixed') || parts.includes('adaptive')) {
    return ['Calculator', 'Non-Calculator'];
  }
  if (parts.includes('calculator') || parts.includes('with')) return ['Calculator'];
  if (parts.includes('non-calculator') || parts.includes('noncalc') || parts.includes('non-calc') || parts.includes('without')) {
    return ['Non-Calculator'];
  }
  return ['Calculator'];
};

const formatTier = (raw: string, isElevenPlus: boolean): string => {
  if (isElevenPlus) return '11+ Standard';
  const tiers = parseTierSelection(raw, false);
  if (tiers.length > 1) return 'Mixed Tier';
  return tiers[0] ?? 'Higher Tier';
};

const formatPaperType = (raw: string, isElevenPlus: boolean): string => {
  if (isElevenPlus) return 'Non-Calculator';
  const papers = parsePaperTypeSelection(raw, false);
  if (papers.length > 1) return 'Mixed Paper';
  return papers[0] ?? 'Calculator';
};

const formatRemainderAnswer = (ans: string) => {
  if (typeof ans !== 'string') return ans;
  return ans.replace(/^(\d+)\s*R\s*(\d+)$/i, "$1 remainder $2");
};

const TOPIC_MAPPING: Record<string, string> = {
  number: 'Number',
  algebra: 'Algebra',
  'ratio and proportion': 'Ratio & Proportion',
  'ratio & proportion': 'Ratio & Proportion',
  ratio: 'Ratio & Proportion',
  geometry: 'Geometry & Measures',
  'geometry & measures': 'Geometry & Measures',
  'geometry and measures': 'Geometry & Measures',
  probability: 'Probability',
  statistics: 'Statistics',
};

const normalizeTopicName = (topic: string) => {
  const normalized = TOPIC_MAPPING[topic.toLowerCase()];
  return normalized || topic;
};

export default function MockExamPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const context = useAppContext();
  const userTrack = resolveUserTrack(context.profile?.track ?? null);
  const user = context?.user || null;
  const { canStartMockExam, refreshUsage } = usePremium();
  const { currentSubject } = useSubject();
  
  // Extract exam parameters from URL
  const tier = searchParams.get('tier') || 'higher';
  const paperType = searchParams.get('paperType') || 'calculator';
  const topics = searchParams.get('topics') || 'Number';
  const mode = searchParams.get('mode') || 'mock';
  const isPractice = mode === 'practice';
  const questionsCount = parseInt(searchParams.get('questions') || '10');
  const initialDurationMinutes = parseInt(searchParams.get('duration') || '15');
  const subtopicParam = searchParams.get('subtopic') || '';
  const difficultyMinParam = searchParams.get('difficultyMin') || '';
  const difficultyMaxParam = searchParams.get('difficultyMax') || '';
  
  // State
  const [view, setView] = useState<'exam' | 'results'>('exam');
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [partIndices, setPartIndices] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [timeLeft, setTimeLeft] = useState(initialDurationMinutes * 60);
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const timeLeftRef = useRef(timeLeft);
  const handleSubmitRef = useRef<() => Promise<void> | void>(() => {});
  const loadKeyRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const [results, setResults] = useState<{
    score: number;
    total: number;
    percentage: number;
    grade: string;
    topicBreakdown: Record<string, { earned: number; total: number }>;
    showGrade: boolean;
    avgLevel: number;
  } | null>(null);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const parseAnswerArray = (value: AnswerValue | undefined): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value) return [value];
    return [];
  };

  const getQuestionPartIndex = (questionId: string, partsLength: number): number => {
    const raw = partIndices[questionId] ?? 0;
    return Math.max(0, Math.min(partsLength - 1, raw));
  };

  const setQuestionPartIndex = (questionId: string, index: number) => {
    setPartIndices(prev => ({ ...prev, [questionId]: index }));
  };

  const getQuestionAnswerState = (q: ExamQuestion) => {
    const userAnswers = parseAnswerArray(answers[q.id]);
    const parts = q.multipart?.parts ?? [];
    const hasAny = userAnswers.length > 0 && userAnswers.some(Boolean);
    const isComplete = q.multipart
      ? parts.every((_, idx) => Boolean(userAnswers[idx]))
      : typeof answers[q.id] === 'string' && answers[q.id] !== '';
    return { hasAny, isComplete, userAnswers };
  };

  const getQuestionCorrectCount = useCallback((q: ExamQuestion, userAnswers?: string[]) => {
    const answersList = userAnswers ?? parseAnswerArray(answers[q.id]);
    if (!q.multipart) {
      return answersList[0] && areMathEquivalent(answersList[0], q.correct_answer) ? 1 : 0;
    }
    return q.multipart.parts.reduce((acc, part, idx) => {
      const answer = answersList[idx];
      if (answer && areMathEquivalent(answer, part.correct_answer)) return acc + 1;
      return acc;
    }, 0);
  }, [answers]);

  const serializeUserAnswer = useCallback((q: ExamQuestion): string | null => {
    const value = answers[q.id];
    if (Array.isArray(value)) {
      const hasAny = value.some((item) => item && String(item).trim());
      return hasAny ? JSON.stringify(value) : null;
    }
    if (typeof value === 'string' && value.trim()) return value;
    return null;
  }, [answers]);

  // Fetch exam questions
  useEffect(() => {
    const fetchQuestions = async () => {
      const loadKey = [
        tier,
        paperType,
        topics,
        mode,
        questionsCount,
        subtopicParam,
        difficultyMinParam,
        difficultyMaxParam,
      ].join('|');
      if (loadKeyRef.current === loadKey) {
        setLoading(false);
        return;
      }
      if (isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        let session = sessionData.session;
        if (!session) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          session = refreshData.session;
        }
        if (!session) {
          setLoading(false);
          toast.error("Please sign in to start a mock exam.");
          navigate('/auth');
          return;
        }

        if (!canStartMockExam) {
          toast.error("Daily mock exam limit reached.");
          setLoading(false);
          navigate('/mocks');
          return;
        }
        
        const isAuthed = true;
        
        const rawTopicList = topics
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        const topicList = rawTopicList.length === 0 || rawTopicList.some(t => t.toLowerCase() === 'all')
          ? (userTrack === '11plus'
              ? ['Number', 'Algebra', 'Geometry & Measures', 'Statistics', 'Problem Solving']
              : ['Number', 'Algebra', 'Geometry & Measures', 'Probability', 'Statistics', 'Ratio & Proportion'])
          : rawTopicList;
        const questionTypes = Array.from(
          new Set(
            topicList.flatMap((t) => expandQuestionTypesForDb(normalizeTopicName(t)))
          )
        );
        const useTiers = parseTierSelection(tier, userTrack === '11plus');
        const useCalc = parsePaperTypeSelection(paperType, userTrack === '11plus');

        const allocateEvenly = (total: number, buckets: number): number[] => {
          if (buckets <= 0) return [];
          const base = Math.floor(total / buckets);
          const remainder = total % buckets;
          return Array.from({ length: buckets }, (_, idx) => base + (idx < remainder ? 1 : 0));
        };

        const selectedSubtopicKeys = subtopicParam && subtopicParam !== 'all'
          ? Array.from(
              new Set(
                subtopicParam
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            )
          : [];

        const multiSelectedSubtopics = selectedSubtopicKeys.length > 1;
        const perKeyTargets = multiSelectedSubtopics
          ? allocateEvenly(questionsCount, selectedSubtopicKeys.length)
          : [];

        const combos = useTiers.flatMap((tierValue) => useCalc.map((calcValue) => ({ tierValue, calcValue })));
        const combinations = Math.max(1, combos.length);
        const questionsPerCombo = Math.ceil(questionsCount / combinations);

        const wantsAllSubtopics = !subtopicParam || subtopicParam === 'all';
        // In "All" mode, fetch a larger pool to avoid DB ordering bias into only a few subtopics.
        const poolTotalTarget = Math.max(questionsCount * 8, questionsCount * combinations * 2);
        const poolPerComboTarget = Math.max(questionsPerCombo, Math.ceil(poolTotalTarget / combinations));
        
        const allQuestions: DbExamQuestionRow[] = [];
        const excludeIds: string[] = [];
        
        const difficultyMinRaw = Number.parseInt(difficultyMinParam, 10);
        const difficultyMaxRaw = Number.parseInt(difficultyMaxParam, 10);
        const difficultyMin = Number.isFinite(difficultyMinRaw) ? Math.max(1, Math.min(4, difficultyMinRaw)) : null;
        const difficultyMax = Number.isFinite(difficultyMaxRaw) ? Math.max(1, Math.min(4, difficultyMaxRaw)) : null;

        const fetchForCombo = async (opts: {
          tierValue: string;
          calcValue: string;
          subtopics: string[] | null;
          take: number;
        }): Promise<DbExamQuestionRow[]> => {
          const { tierValue, calcValue, subtopics, take } = opts;
          if (take <= 0) return [];

          const limit = Math.max(take * 4, take);

          if (isAuthed) {
            const { data, error } = await supabase.rpc('fetch_exam_questions_v3' as any, {
              p_tiers: [tierValue],
              p_calculators: [calcValue],
              p_question_types: questionTypes.length > 0
                ? questionTypes
                : ['Number', 'Algebra', 'Geometry & Measures', 'Probability', 'Statistics', 'Ratio & Proportion'],
              p_subtopics: subtopics,
              p_difficulty_min: difficultyMin,
              p_difficulty_max: difficultyMax,
              p_exclude_ids: excludeIds,
              p_limit: limit,
            });

            if (!error && data && (data as any[]).length > 0) {
              return (data as unknown as DbExamQuestionRow[]).slice(0, take);
            }
          }

          let query = supabase
            .from('exam_questions')
            .select('id, question, correct_answer, wrong_answers, all_answers, question_type, subtopic, difficulty, marks, estimated_time_sec, tier, calculator, image_url, image_alt, explanation')
            .in('question_type', questionTypes.length > 0
              ? questionTypes
              : ['Number', 'Algebra', 'Geometry & Measures', 'Probability', 'Statistics', 'Ratio & Proportion'])
            .eq('tier', tierValue)
            .eq('calculator', calcValue);

          if (subtopics && subtopics.length === 1) query = query.eq('subtopic', subtopics[0]);
          else if (subtopics && subtopics.length > 1) query = query.in('subtopic', subtopics);

          if (difficultyMin != null) query = query.gte('difficulty', difficultyMin);
          if (difficultyMax != null) query = query.lte('difficulty', difficultyMax);
          // TRACK FILTER - Ensures separation between GCSE and 11+
          query = query.eq('track', userTrack);

          if (excludeIds.length > 0) {
            const quotedIds = excludeIds.map((id) => `"${id}"`).join(',');
            query = query.not('id', 'in', `(${quotedIds})`);
          }

          const { data, error } = await query.limit(limit);
          if (!error && data && data.length > 0) {
            return (data as DbExamQuestionRow[]).slice(0, take);
          }

          return [];
        };

        if (multiSelectedSubtopics) {
          const wantedPerKey = perKeyTargets;
          const candidatesByKey = new Map<string, string[]>();
          for (const key of selectedSubtopicKeys) {
            candidatesByKey.set(
              key,
              Array.from(new Set(expandSubtopicIdsForDb(key).map((s) => String(s).trim()).filter(Boolean)))
            );
          }

          const perKeyPerCombo = new Map<string, number[]>();
          selectedSubtopicKeys.forEach((key, idx) => {
            perKeyPerCombo.set(key, allocateEvenly(wantedPerKey[idx] ?? 0, combinations));
          });

          for (let comboIdx = 0; comboIdx < combos.length; comboIdx += 1) {
            const { tierValue, calcValue } = combos[comboIdx];
            for (const key of selectedSubtopicKeys) {
              const take = perKeyPerCombo.get(key)?.[comboIdx] ?? 0;
              const subtopics = candidatesByKey.get(key) ?? null;
              const picked = await fetchForCombo({ tierValue, calcValue, subtopics: subtopics && subtopics.length > 0 ? subtopics : null, take });
              if (picked.length > 0) {
                allQuestions.push(...picked);
                for (const q of picked) excludeIds.push(q.id);
              }
            }
          }

          // Best-effort top-up to hit exact quotas (still respecting tier/calc filters).
          const candidateToKey = new Map<string, string>();
          for (const key of selectedSubtopicKeys) {
            for (const cand of candidatesByKey.get(key) ?? []) {
              if (!candidateToKey.has(cand)) candidateToKey.set(cand, key);
            }
          }
          const countPerKey = (): Map<string, number> => {
            const counts = new Map<string, number>();
            for (const key of selectedSubtopicKeys) counts.set(key, 0);
            for (const q of allQuestions) {
              const sub = q.subtopic ? String(q.subtopic) : '';
              const key = sub ? candidateToKey.get(sub) : undefined;
              if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            return counts;
          };

          let counts = countPerKey();
          for (let idx = 0; idx < selectedSubtopicKeys.length; idx += 1) {
            const key = selectedSubtopicKeys[idx];
            const want = wantedPerKey[idx] ?? 0;
            let have = counts.get(key) ?? 0;
            let missing = Math.max(0, want - have);
            if (missing === 0) continue;

            const subtopics = candidatesByKey.get(key) ?? null;
            for (let comboIdx = 0; comboIdx < combos.length && missing > 0; comboIdx += 1) {
              const { tierValue, calcValue } = combos[comboIdx];
              const picked = await fetchForCombo({ tierValue, calcValue, subtopics: subtopics && subtopics.length > 0 ? subtopics : null, take: missing });
              if (picked.length > 0) {
                allQuestions.push(...picked);
                for (const q of picked) excludeIds.push(q.id);
                missing -= picked.length;
              }
            }
            counts = countPerKey();
            have = counts.get(key) ?? 0;
            if (have < want) {
              toast.error('Not enough questions available to create an even mix across the selected subtopics.');
              return;
            }
          }
        } else {
          for (const tierValue of useTiers) {
            for (const calcValue of useCalc) {
              const union = subtopicParam && subtopicParam !== 'all'
                ? Array.from(
                    new Set(
                      subtopicParam
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .flatMap((s) => expandSubtopicIdsForDb(s))
                    )
                  )
                : null;

              const take = union ? questionsPerCombo : poolPerComboTarget;
              const picked = await fetchForCombo({ tierValue, calcValue, subtopics: union, take });
              if (picked.length > 0) {
                allQuestions.push(...picked);
                for (const q of picked) excludeIds.push(q.id);
              }
            }
          }
        }
        
        if (allQuestions.length === 0) {
          toast.error("No questions found for the selected criteria");
          return;
        }
        
        const deduped = Array.from(new Map(allQuestions.map((q) => [q.id, q])).values());
        const mixSubtopicKey = (q: DbExamQuestionRow) => {
          const base = q.subtopic || "Unknown";
          if (useTiers.length > 1 || useCalc.length > 1) {
            return `${base}::${q.tier || "UnknownTier"}::${q.calculator || "UnknownCalc"}`;
          }
          return base;
        };

        let mixedQuestions = buildBalancedMix(
          deduped,
          questionsCount,
          (q) => q.question_type || "Mixed",
          mixSubtopicKey
        );

        if (multiSelectedSubtopics) {
          const candidatesByKey = new Map<string, Set<string>>();
          for (const key of selectedSubtopicKeys) {
            candidatesByKey.set(key, new Set(expandSubtopicIdsForDb(key)));
          }

          const byKey = selectedSubtopicKeys.map((key) => {
            const set = candidatesByKey.get(key) ?? new Set<string>();
            const items = deduped.filter((q) => q.subtopic != null && set.has(String(q.subtopic)));
            // shuffle
            for (let i = items.length - 1; i > 0; i -= 1) {
              const j = Math.floor(Math.random() * (i + 1));
              [items[i], items[j]] = [items[j], items[i]];
            }
            return items;
          });

          const sliced = byKey.map((arr, idx) => arr.slice(0, perKeyTargets[idx] ?? 0));
          if (sliced.some((arr, idx) => arr.length < (perKeyTargets[idx] ?? 0))) {
            toast.error('Not enough questions available to create an even mix across the selected subtopics.');
            return;
          }

          // Randomize the order questions appear (so it doesn't always cycle subtopics
          // in the same order), while keeping a near-even quota per subtopic.
          const schedule: number[] = [];
          for (let bucketIdx = 0; bucketIdx < sliced.length; bucketIdx += 1) {
            const quota = perKeyTargets[bucketIdx] ?? 0;
            for (let j = 0; j < quota; j += 1) schedule.push(bucketIdx);
          }
          for (let i = schedule.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [schedule[i], schedule[j]] = [schedule[j], schedule[i]];
          }

          const cursors = sliced.map(() => 0);
          const randomized: DbExamQuestionRow[] = [];
          for (const bucketIdx of schedule) {
            const nextIdx = cursors[bucketIdx];
            const arr = sliced[bucketIdx];
            if (nextIdx < arr.length) {
              randomized.push(arr[nextIdx]);
              cursors[bucketIdx] = nextIdx + 1;
            }
          }

          mixedQuestions = randomized.slice(0, questionsCount);
        }

        if (wantsAllSubtopics && !multiSelectedSubtopics) {
          const toUiSubtopicKey = (raw?: string | null): string | null => {
            const value = String(raw ?? '').trim();
            if (!value) return null;
            if (value.includes('|')) {
              const [topicKeyRaw, subKeyRaw] = value.split('|');
              const topicKey = (topicKeyRaw || '').trim().toLowerCase();
              const subKey = (subKeyRaw || '').trim();
              return topicKey && subKey ? `${topicKey}|${subKey}` : null;
            }
            if (value.includes('.')) {
              const [topicKeyRaw, subKeyRaw] = value.split('.');
              const topicKey = (topicKeyRaw || '').trim().toLowerCase();
              const subKey = (subKeyRaw || '').trim();
              return topicKey && subKey ? `${topicKey}|${subKey}` : null;
            }
            // UUID -> try map back to UI keys when known
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
              const expanded = expandSubtopicIdsForDb(value);
              const ui = expanded.find((s) => typeof s === 'string' && s.includes('|'));
              if (ui) {
                const [topicKeyRaw, subKeyRaw] = ui.split('|');
                const topicKey = (topicKeyRaw || '').trim().toLowerCase();
                const subKey = (subKeyRaw || '').trim();
                return topicKey && subKey ? `${topicKey}|${subKey}` : null;
              }
            }
            return null;
          };

          const topicIdToTopicKey = (rawTopic: string): (keyof typeof TOPIC_SUBTOPICS) | null => {
            const v = String(rawTopic ?? '').trim().toLowerCase();
            if (!v) return null;
            if (v in TOPIC_SUBTOPICS) return v as keyof typeof TOPIC_SUBTOPICS;
            if (v.includes('ratio')) return 'ratio';
            if (v.includes('geometry')) return 'geometry';
            if (v.includes('probability')) return 'probability';
            if (v.includes('statistics')) return 'statistics';
            if (v.includes('algebra')) return 'algebra';
            if (v.includes('number')) return 'number';
            return null;
          };

          const selectedTopicKeys = rawTopicList.length === 0 || rawTopicList.some((t) => t.toLowerCase() === 'all')
            ? (Object.keys(TOPIC_SUBTOPICS) as (keyof typeof TOPIC_SUBTOPICS)[])
            : (Array.from(new Set(rawTopicList.map(topicIdToTopicKey).filter(Boolean))) as (keyof typeof TOPIC_SUBTOPICS)[]);

          const desiredMiniKeys = selectedTopicKeys.flatMap((k) => getTopicSubtopicKeys(k));
          if (desiredMiniKeys.length > 0 && deduped.length > 0) {
            const buckets = new Map<string, DbExamQuestionRow[]>();
            for (const q of deduped) {
              const key = toUiSubtopicKey(q.subtopic);
              if (!key) continue;
              const arr = buckets.get(key);
              if (arr) arr.push(q);
              else buckets.set(key, [q]);
            }

            // Shuffle each bucket to reduce repeats.
            for (const bucket of buckets.values()) {
              for (let i = bucket.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
              }
            }

            const coverageOrder = [...desiredMiniKeys];
            for (let i = coverageOrder.length - 1; i > 0; i -= 1) {
              const j = Math.floor(Math.random() * (i + 1));
              [coverageOrder[i], coverageOrder[j]] = [coverageOrder[j], coverageOrder[i]];
            }

            const coverageTarget = Math.min(questionsCount, coverageOrder.length);
            const coveragePicked: DbExamQuestionRow[] = [];
            const usedIds = new Set<string>();

            for (const key of coverageOrder) {
              if (coveragePicked.length >= coverageTarget) break;
              const bucket = buckets.get(key);
              const next = bucket?.find((qq) => !usedIds.has(qq.id));
              if (!next) continue;
              coveragePicked.push(next);
              usedIds.add(next.id);
            }

            // Fill the remainder using the existing balancer.
            const remainingPool = deduped.filter((q) => !usedIds.has(q.id));
            const fill = buildBalancedMix(
              remainingPool,
              Math.max(0, questionsCount - coveragePicked.length),
              (q) => q.question_type || 'Mixed',
              mixSubtopicKey
            );

            const combined = [...coveragePicked, ...fill].slice(0, questionsCount);
            for (let i = combined.length - 1; i > 0; i -= 1) {
              const j = Math.floor(Math.random() * (i + 1));
              [combined[i], combined[j]] = [combined[j], combined[i]];
            }

            mixedQuestions = combined;

            if (coverageOrder.length > questionsCount) {
              toast.message('Session too short to include every mini subtopic; showing the widest spread possible.');
            }
          }
        }

        const finalQuestions = mixedQuestions.map((q, index) => {
            const rawMultipart = parseMultipartQuestion(String(q.question || ""));
            const multipart = rawMultipart
              ? {
                  stem: rawMultipart.stem,
                  parts: rawMultipart.parts.map((part) => {
                    const options = part.all_answers && part.all_answers.length > 0
                      ? part.all_answers
                      : uniqueMathAnswers([part.correct_answer, ...part.wrong_answers]).sort(() => Math.random() - 0.5);
                    const sanitized = sanitizeAnswerSet({
                      options,
                      correct: String(part.correct_answer || ""),
                      questionType: q.question_type,
                      subtopic: q.subtopic,
                    });
                    return { ...part, correct_answer: sanitized.correct, all_answers: sanitized.options };
                  })
                }
              : null;

            const wrongAnswers = parseArray(q.wrong_answers);

            let allAnswers = parseArray(q.all_answers);
            if (allAnswers.length === 0 && !multipart) {
              allAnswers = uniqueMathAnswers([String(q.correct_answer || ''), ...wrongAnswers]);
            }

            const sanitized = sanitizeAnswerSet({
              options: allAnswers,
              correct: String(q.correct_answer || ''),
              questionType: q.question_type,
              subtopic: q.subtopic,
            });
            allAnswers = uniqueMathAnswers(sanitized.options);
            
            const shuffledAnswers = multipart ? [] : [...allAnswers].sort(() => Math.random() - 0.5);
            
            const baseMarks = typeof q.marks === 'number' && Number.isFinite(q.marks) ? q.marks : undefined;
            const computedMarks = multipart
              ? Math.max(baseMarks ?? 1, multipart.parts.length)
              : baseMarks;

            return {
              ...q,
              question: multipart ? (multipart.stem ?? "") : q.question,
              correct_answer: formatRemainderAnswer(sanitized.correct),
              all_answers: shuffledAnswers.map(formatRemainderAnswer),
              index: index + 1,
              image_url: undefined, // Explicitly disabled diagrams for maths questions
              marks: computedMarks,
              multipart
            };
          });

        setExamQuestions(finalQuestions);
        loadKeyRef.current = loadKey;

        const totalTimeSec = finalQuestions.reduce((sum, q) => {
          const est = typeof q.estimated_time_sec === 'number' && Number.isFinite(q.estimated_time_sec)
            ? q.estimated_time_sec
            : 60;
          return sum + est;
        }, 0);
        if (totalTimeSec > 0) {
          setDurationMinutes(Math.max(1, Math.ceil(totalTimeSec / 60)));
          setTimeLeft(totalTimeSec);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast.error("Failed to load questions");
      } finally {
        isLoadingRef.current = false;
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [tier, paperType, topics, questionsCount, subtopicParam, difficultyMinParam, difficultyMaxParam, canStartMockExam, navigate, refreshUsage]);

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeLeft <= 60) return "timer-critical";
    if (timeLeft <= 300) return "timer-warning";
    return "timer-normal";
  };

  const handleSelectAnswer = (answer: string) => {
    const currentQ = examQuestions[currentIndex];
    if (!currentQ) return;
    if (currentQ.multipart) {
      const partIndex = getQuestionPartIndex(currentQ.id, currentQ.multipart.parts.length);
      setAnswers(prev => {
        const existing = prev[currentQ.id];
        const next = Array.isArray(existing) ? [...existing] : [];
        next[partIndex] = answer;
        return { ...prev, [currentQ.id]: next };
      });
      return;
    }
    setAnswers(prev => ({ ...prev, [currentQ.id]: answer }));
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    let earnedMarks = 0;
    let totalMarks = 0;
    let weightedEarned = 0;
    let weightedTotal = 0;
    const topicBreakdown: Record<string, { earned: number; total: number }> = {};
    
    examQuestions.forEach(q => {
      const topic = getTrackTopicLabel({
        track: userTrack,
        questionType: q.question_type || 'Unknown',
        subtopicId: q.subtopic ?? null,
        fallbackTopic: topics,
      }) || 'Unknown';
      if (!topicBreakdown[topic]) topicBreakdown[topic] = { earned: 0, total: 0 };

      const marks = getQuestionMarks(q);
      totalMarks += marks;
      topicBreakdown[topic].total += marks;

      const correctCount = getQuestionCorrectCount(q);
      const earned = q.multipart
        ? Math.round((correctCount / q.multipart.parts.length) * marks)
        : correctCount > 0 ? marks : 0;

      const difficultyWeight = getQuestionDifficultyWeight(q.difficulty);
      weightedTotal += marks * difficultyWeight;
      weightedEarned += earned * difficultyWeight;

      if (earned > 0) {
        earnedMarks += earned;
        topicBreakdown[topic].earned += earned;
      }
    });

    // Display score percentage from awarded marks, not weighted difficulty.
    const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
    let grade = "1";
    if (percentage >= 90) grade = "9";
    else if (percentage >= 80) grade = "8";
    else if (percentage >= 70) grade = "7";
    else if (percentage >= 60) grade = "6";
    else if (percentage >= 50) grade = "5";
    else if (percentage >= 40) grade = "4";
    else if (percentage >= 30) grade = "3";
    else if (percentage >= 20) grade = "2";
    
    const showGrade = userTrack !== '11plus';
    const avgLevel = totalMarks > 0 ? weightedTotal / totalMarks : 0;
    setResults({ score: earnedMarks, total: totalMarks, percentage, grade, topicBreakdown, showGrade, avgLevel });
    setView('results');
    
    // Confetti
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    // Save to database if authenticated
    if (user) {
      try {
        const totalMarksForAttempt = totalMarks;
        const earnedMarksForAttempt = earnedMarks;
        
        // Try to update an existing 'started' attempt (created when the mock was launched)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: existingAttempt } = await supabase
          .from('mock_attempts')
          .select('id')
          .eq('user_id', user.id)
          .eq('mode', mode)
          .eq('status', 'started')
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let attempt: any = null;
        if (existingAttempt) {
          // Update the existing 'started' row with final results
          const { data } = await supabase.from('mock_attempts')
            .update({
              title: `${formatTier(tier, userTrack === '11plus')} - ${formatPaperType(paperType, userTrack === '11plus')}`,
              duration_minutes: durationMinutes,
              total_marks: totalMarksForAttempt,
              score: earnedMarksForAttempt,
              status: 'completed'
            })
            .eq('id', existingAttempt.id)
            .select()
            .single();
          attempt = data;
        } else {
          // Fallback: insert a new row (e.g. premium users who skip the limit check)
          const { data } = await supabase.from('mock_attempts').insert({
            user_id: user.id,
            track: userTrack,
            title: `${formatTier(tier, userTrack === '11plus')} - ${formatPaperType(paperType, userTrack === '11plus')}`,
            mode,
            duration_minutes: durationMinutes,
            total_marks: totalMarksForAttempt,
            score: earnedMarksForAttempt,
            status: 'completed'
          }).select().single();
          attempt = data;
        }

        if (attempt) {
          const questionsToInsert = examQuestions.map((q, idx) => ({
            attempt_id: attempt.id,
            idx: idx + 1,
            exam_question_id: q.id,
            prompt: q.question,
            topic: q.question_type,
            marks: getQuestionMarks(q),
            awarded_marks: (() => {
              const correctCount = getQuestionCorrectCount(q);
              if (q.multipart) {
                return Math.round((correctCount / q.multipart.parts.length) * getQuestionMarks(q));
              }
              return correctCount > 0 ? getQuestionMarks(q) : 0;
            })(),
            user_answer: serializeUserAnswer(q),
            correct_answer: q.multipart
              ? {
                  type: "multipart",
                  stem: q.question,
                  parts: q.multipart.parts.map((part) => ({
                    label: part.label ?? null,
                    prompt: part.prompt,
                    correct_answer: part.correct_answer,
                    all_answers: part.all_answers ?? [],
                  }))
                }
              : { answer: q.correct_answer }
          }));

          await supabase.from('mock_questions').insert(questionsToInsert);
        }
      } catch (error) {
        console.error('Error saving attempt:', error);
      }
    }
  }, [
    durationMinutes,
    examQuestions,
    getQuestionCorrectCount,
    mode,
    paperType,
    serializeUserAnswer,
    tier,
    topics,
    user,
    userTrack,
  ]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Timer — disabled in practice mode
  useEffect(() => {
    if (isPractice || view !== 'exam' || loading || examQuestions.length === 0 || timeLeftRef.current <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          timeLeftRef.current = 0;
          void handleSubmitRef.current();
          return 0;
        }
        const next = prev - 1;
        timeLeftRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view, loading, examQuestions.length]);

  const currentQuestion = examQuestions[currentIndex];
  const currentDifficultyLevel = getDisplayDifficultyLevel(currentQuestion?.difficulty);
  const letters = ["A", "B", "C", "D", "E", "F"];
  const multipartParts = currentQuestion?.multipart?.parts ?? null;
  const currentPartIndex = multipartParts
    ? getQuestionPartIndex(currentQuestion.id, multipartParts.length)
    : 0;
  const currentPart = multipartParts ? multipartParts[currentPartIndex] : null;
  const currentPartLabel = currentPart?.label ?? (currentQuestion?.multipart ? `Part ${String.fromCharCode(65 + currentPartIndex)}` : null);
  const currentAnswers = currentPart?.all_answers ?? currentQuestion?.all_answers ?? [];
  const currentSelectedAnswer = (() => {
    if (!currentQuestion) return null;
    const stored = answers[currentQuestion.id];
    if (Array.isArray(stored)) return stored[currentPartIndex] ?? null;
    return stored ?? null;
  })();
  const multipartPartsCount = multipartParts?.length ?? 0;
  const hasMoreParts = Boolean(currentQuestion?.multipart && currentPartIndex < multipartPartsCount - 1);

  const { topicLabel, subtopicLabel } = getTopicAndSubtopicLabels({
    questionType: currentQuestion?.question_type ?? null,
    subtopicId: currentQuestion?.subtopic ?? null,
    fallbackTopic: topics,
  });

  const questionTierLabel = (() => {
    const raw = String(currentQuestion?.tier ?? '').trim();
    if (!raw) return null;
    if (raw.toLowerCase().includes('foundation')) return 'Foundation';
    if (raw.toLowerCase().includes('higher')) return 'Higher';
    return raw;
  })();

const questionCalculatorLabel = (() => {
    const raw = String(currentQuestion?.calculator ?? '').trim();
    if (!raw) return null;
    if (raw.toLowerCase().includes('non')) return 'Non-calc';
    if (raw.toLowerCase().includes('calc')) return 'Calc';
    return raw;
  })();

  const tagBaseClass =
    'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border';
  const tagStyles = {
    subtopic: 'bg-sky-500/15 text-sky-700 border-sky-500/20 dark:text-sky-200',
    calculator: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-200',
    tier: 'bg-violet-500/15 text-violet-700 border-violet-500/20 dark:text-violet-200',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (examQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card rounded-2xl p-6 border border-border text-center">
          <h2 className="text-lg font-semibold mb-2">No Questions Available</h2>
          <p className="text-muted-foreground mb-4">We couldn't find any questions matching the selected criteria. This might be a temporary issue with the question database.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/mocks')} className="btn-exam-secondary px-4 py-2">
              Back to Setup
            </button>
            <button onClick={() => window.location.reload()} className="btn-exam-primary px-4 py-2">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results View
  if (view === 'results' && results) {
    const gridColsClass = results.showGrade ? 'grid-cols-3' : 'grid-cols-2';
    const avgLevelLabel = results.avgLevel.toFixed(2);
    return (
      <div className="max-w-2xl mx-auto px-4 w-full pb-8">
        <div className="text-center py-8 fade-up fade-up-1">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 mb-5 shadow-lg">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-foreground">Exam Complete</h1>
          <p className="text-sm text-muted-foreground">Here's your performance analysis</p>
        </div>

        <div className={`grid ${gridColsClass} gap-3 mb-5 fade-up fade-up-2`}>
          <div className="card rounded-2xl p-4 text-center glow-subtle border border-border">
            <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Score</p>
            <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">{results.percentage}%</p>
            <p className="text-xs mt-1 text-muted-foreground">{results.score} of {results.total} marks</p>
          </div>
          {results.showGrade ? (
            <div className="card rounded-2xl p-4 text-center border border-border">
              <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Grade</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{results.grade}</p>
              <p className="text-xs mt-1 text-muted-foreground">
                {results.percentage >= 60 ? "Strong Pass" : results.percentage >= 40 ? "Pass" : "Needs Work"}
              </p>
            </div>
          ) : (
            <div className="card rounded-2xl p-4 text-center border border-border">
              <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Difficulty</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{avgLevelLabel}</p>
              <p className="text-xs mt-1 text-muted-foreground">Average level of selected questions</p>
            </div>
          )}
          <div className="card rounded-2xl p-4 text-center border border-border">
            <p className="badge text-[10px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Time</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{formatTime(durationMinutes * 60 - timeLeft)}</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {Math.round((durationMinutes * 60 - timeLeft) / examQuestions.length)}s avg
            </p>
          </div>
        </div>

        <div className="card rounded-2xl p-5 mb-4 border border-border fade-up fade-up-3">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Topic Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(results.topicBreakdown).map(([topic, { earned, total }]) => {
              const pct = Math.round((earned / total) * 100);
              const isStrong = pct >= 70;
              const needsFocus = pct < 50;
              
              return (
                <div key={topic}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{topic}</span>
                      {isStrong && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">Strong</span>
                      )}
                      {needsFocus && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 bg-amber-500/10">Needs focus</span>
                      )}
                    </div>
                    <span className={cn("text-sm font-semibold", isStrong ? "text-emerald-500" : needsFocus ? "text-amber-500" : "text-primary")}>
                      {earned}/{total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", isStrong ? "bg-emerald-500" : needsFocus ? "bg-amber-500" : "bg-gradient-to-r from-primary to-violet-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card rounded-2xl p-5 mb-5 border border-border fade-up fade-up-4">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Question Review</h3>
          <div className="space-y-2">
            {examQuestions.map((q, idx) => {
              const { userAnswers } = getQuestionAnswerState(q);
              const correctCount = getQuestionCorrectCount(q, userAnswers);
              const isCorrect = q.multipart
                ? correctCount === q.multipart.parts.length
                : correctCount > 0;
              const isExpanded = expandedQuestion === q.id;
              return (
                <div key={q.id} className="overflow-hidden rounded-xl">
                  <button
                    type="button"
                    onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                    className={cn(
                      "review-item w-full flex items-center justify-between p-3 text-left transition-all duration-200",
                      isCorrect ? "bg-muted/50" : "bg-red-500/5 border border-red-200 dark:border-red-500/30",
                      isExpanded ? "rounded-t-xl" : "rounded-xl hover:translate-x-1"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"
                      )}>
                        {isCorrect ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Q{idx + 1}: {getTrackTopicLabel({
                            track: userTrack,
                            questionType: q.question_type,
                            subtopicId: q.subtopic ?? null,
                            fallbackTopic: topics,
                          }) ?? q.question_type}
                        </p>
                        <p className="text-xs mt-0.5 text-muted-foreground">{isCorrect ? "Correct" : "Review recommended"}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )} />
                  </button>

                  {isExpanded && (
                    <div className={cn(
                      "p-4 border-t animate-in slide-in-from-top-2 duration-200",
                      isCorrect ? "bg-muted/30 border-border" : "bg-red-500/5 border-red-200 dark:border-red-500/30"
                    )}>
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Question</p>
                        <div className="text-sm text-foreground">
                          <RichQuestionContent text={q.question} className="space-y-2" />
                        </div>
                      </div>

                      {q.image_url && (
                        <div className="mb-4">
                          <div className="question-image-shell">
                            <ImageWithFallback
                              src={resolveQuestionImageUrl(q.image_url, q.question)}
                              alt={q.image_alt || "Question diagram"}
                              className="question-image-media"
                            />
                          </div>
                        </div>
                      )}

                      {q.multipart ? (
                        <div className="space-y-4 mb-4">
                          {q.multipart.parts.map((part, partIndex) => {
                            const partLabel = part.label ?? `Part ${String.fromCharCode(65 + partIndex)}`;
                            const partAnswers = part.all_answers ?? [];
                            const userAnswer = userAnswers[partIndex];
                            return (
                              <div key={`${q.id}-part-${partIndex}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                                  {partLabel}
                                </div>
                                <div className="text-sm text-foreground mb-3">
                                  <RichQuestionContent text={part.prompt} className="space-y-1" />
                                </div>
                                <div className="space-y-2">
                                  {partAnswers.map((option, optIdx) => {
                                    const isThisCorrect = option === part.correct_answer || areMathEquivalent(option, part.correct_answer);
                                    const isUser = !!userAnswer && (option === userAnswer || areMathEquivalent(option, userAnswer));
                                    return (
                                      <div
                                        key={optIdx}
                                        className={cn(
                                          "flex items-center gap-3 p-2.5 rounded-lg text-sm",
                                          isThisCorrect && "bg-emerald-500/10 border border-emerald-500/30",
                                          isUser && !isThisCorrect && "bg-red-500/10 border border-red-500/30",
                                          !isThisCorrect && !isUser && "bg-muted/50"
                                        )}
                                      >
                                        <span className={cn(
                                          "w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold",
                                          isThisCorrect && "bg-emerald-500 text-white",
                                          isUser && !isThisCorrect && "bg-red-500 text-white",
                                          !isThisCorrect && !isUser && "bg-muted-foreground/20 text-muted-foreground"
                                        )}>
                                          {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        <span className={cn(
                                          "flex-1",
                                          isThisCorrect && "text-emerald-600 dark:text-emerald-400 font-medium",
                                          isUser && !isThisCorrect && "text-red-600 dark:text-red-400"
                                        )}>
                                          <MathText text={option} />
                                        </span>
                                        {isThisCorrect && <Check className="w-4 h-4 text-emerald-500" />}
                                        {isUser && !isThisCorrect && <X className="w-4 h-4 text-red-500" />}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-4 pt-3 border-t border-border mt-3">
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Your answer: </span>
                                    <span className={cn("font-medium", userAnswer ? "text-emerald-500" : "text-red-500")}>
                                      {userAnswer ? <MathText text={userAnswer} /> : "Not answered"}
                                    </span>
                                  </div>
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Correct: </span>
                                    <span className="font-medium text-emerald-500">
                                      <MathText text={part.correct_answer} />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Options</p>
                          <div className="space-y-2">
                            {(q.all_answers || []).map((option, optIdx) => {
                              const isThisCorrect = option === q.correct_answer || areMathEquivalent(option, q.correct_answer);
                              const userAnswer = userAnswers[0];
                              const isUser = !!userAnswer && (option === userAnswer || areMathEquivalent(option, userAnswer));
                              return (
                                <div
                                  key={optIdx}
                                  className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-lg text-sm",
                                    isThisCorrect && "bg-emerald-500/10 border border-emerald-500/30",
                                    isUser && !isThisCorrect && "bg-red-500/10 border border-red-500/30",
                                    !isThisCorrect && !isUser && "bg-muted/50"
                                  )}
                                >
                                  <span className={cn(
                                    "w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold",
                                    isThisCorrect && "bg-emerald-500 text-white",
                                    isUser && !isThisCorrect && "bg-red-500 text-white",
                                    !isThisCorrect && !isUser && "bg-muted-foreground/20 text-muted-foreground"
                                  )}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className={cn(
                                    "flex-1",
                                    isThisCorrect && "text-emerald-600 dark:text-emerald-400 font-medium",
                                    isUser && !isThisCorrect && "text-red-600 dark:text-red-400"
                                  )}>
                                    <MathText text={option} />
                                  </span>
                                  {isThisCorrect && <Check className="w-4 h-4 text-emerald-500" />}
                                  {isUser && !isThisCorrect && <X className="w-4 h-4 text-red-500" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!q.multipart && (
                        <div className="flex items-center gap-4 pt-3 border-t border-border">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Your answer: </span>
                            <span className={cn("font-medium", isCorrect ? "text-emerald-500" : "text-red-500")}>
                              {userAnswers[0] ? <MathText text={userAnswers[0]} /> : "Not answered"}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Correct: </span>
                            <span className="font-medium text-emerald-500">
                              <MathText text={q.correct_answer} />
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Explanation</p>
                        <div className="text-sm text-foreground leading-relaxed bg-muted/30 border border-border rounded-lg p-3">
                          {q.explanation ? (
                            <div className="space-y-2 break-words">
                              <RichQuestionContent text={formatExplanation(q.explanation)} className="space-y-2" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No explanation available for this question yet.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="fade-up fade-up-5">
          <button onClick={() => navigate('/mocks')} className="w-full ripple py-3.5 btn-exam-primary rounded-xl font-semibold text-sm">
            Return to Practice
          </button>
        </div>
      </div>
    );
  }

  // Exam View
  return (
    <div className="max-w-2xl mx-auto px-4 w-full pt-2 pb-8">
      {/* Header */}
      {!isPractice && (
        <div className="py-4 fade-up fade-up-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowExitModal(true)}
                className="p-1.5 -ml-1.5 rounded-lg transition-all duration-200 hover:bg-muted hover:scale-105 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-foreground">{currentIndex + 1}</span>
                <span className="text-sm text-muted-foreground">of {examQuestions.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200",
                flagged.size > 0 ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
              )}>
                <Flag className="w-3.5 h-3.5" fill={flagged.size > 0 ? "currentColor" : "none"} />
                <span className="text-xs font-medium">{flagged.size} flagged</span>
              </div>
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all", getTimerClass())}>
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={cn("text-sm font-semibold", timeLeft <= 60 ? "text-red-500" : timeLeft <= 300 ? "text-amber-500" : "text-foreground")}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / examQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Question Navigation */}
      {!isPractice && (
        <div className="card rounded-2xl p-3 mb-4 border border-border fade-up fade-up-2">
          <div className="flex flex-wrap gap-1.5">
            {examQuestions.map((_, idx) => {
              const navQuestion = examQuestions[idx];
              const { hasAny, isComplete } = getQuestionAnswerState(navQuestion);
              const isAnswered = hasAny;
              const isFlagged = flagged.has(idx);
              const isCurrent = idx === currentIndex;
              
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "q-nav-btn w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-110 active:scale-95",
                    isCurrent && "bg-gradient-to-r from-primary to-violet-500 text-white shadow-md",
                    isFlagged && !isCurrent && "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-400/40",
                    isComplete && !isCurrent && !isFlagged && "bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-400/40",
                    isAnswered && !isComplete && !isCurrent && !isFlagged && "bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-400/40",
                    !isAnswered && !isCurrent && !isFlagged && "bg-muted text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Card */}
      {currentQuestion && (
        <div className="card rounded-2xl mb-4 overflow-hidden border border-border glow-subtle fade-up fade-up-3">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Question {currentIndex + 1}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", currentSubject === 'english' ? "border-amber-500/20 bg-amber-500/10 text-amber-500" : "border-primary/20 bg-primary/10 text-primary")}>
                  {currentQuestion ? getQuestionMarks(currentQuestion) : 1} mark{currentQuestion && getQuestionMarks(currentQuestion) === 1 ? "" : "s"}
                </span>
                {currentDifficultyLevel && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getDifficultyTagClass(currentDifficultyLevel)}`}>
                    lvl {currentDifficultyLevel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {subtopicLabel && (
                  <span className={`${tagBaseClass} ${tagStyles.subtopic} max-w-[200px] truncate`}>
                    {subtopicLabel}
                  </span>
                )}
                {questionCalculatorLabel && questionCalculatorLabel !== 'Non-calc' && (
                  <span className={`${tagBaseClass} ${tagStyles.calculator}`}>
                    {questionCalculatorLabel}
                  </span>
                )}
                {questionTierLabel && questionTierLabel !== '11+ Standard' && (
                  <span className={`${tagBaseClass} ${tagStyles.tier}`}>
                    {questionTierLabel}
                  </span>
                )}
                <button 
                  onClick={toggleFlag}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 border",
                    flagged.has(currentIndex) 
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-500" 
                      : "border-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Flag className="w-4 h-4" fill={flagged.has(currentIndex) ? "currentColor" : "none"} />
                  <span className="text-xs font-medium">{flagged.has(currentIndex) ? "Flagged" : "Flag"}</span>
                </button>
              </div>
            </div>

            {currentQuestion.question && (
              <div className="text-lg sm:text-xl font-medium leading-relaxed mb-5 text-foreground">
                <RichQuestionContent text={currentQuestion.question} className="space-y-2" />
              </div>
            )}

            {currentPart && (
              <div className="mb-5 rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  <span>{currentPartLabel}</span>
                  <span>{currentPartIndex + 1}/{currentQuestion.multipart?.parts.length}</span>
                </div>
                <div className="text-sm sm:text-base text-foreground">
                  <RichQuestionContent text={currentPart.prompt} className="space-y-2" />
                </div>
              </div>
            )}

            {currentQuestion.image_url && (
              <div className="mb-6">
                <div className="question-image-shell">
                  <ImageWithFallback
                    src={currentQuestion.image_url}
                    alt={currentQuestion.image_alt || "Question diagram"}
                    className="question-image-media"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {(() => {
                const correctAnswer = currentPart?.correct_answer ?? currentQuestion.correct_answer;
                const hasAnswered = currentSelectedAnswer !== null && currentSelectedAnswer !== undefined;
                const practiceAnswered = isPractice && hasAnswered;
                return currentAnswers.map((answer, idx) => {
                  const isSelected = currentSelectedAnswer === answer;
                  const isCorrect = answer === correctAnswer;
                  const showCorrect = practiceAnswered && isCorrect;
                  const showWrong = practiceAnswered && isSelected && !isCorrect;
                  return (
                    <button
                      key={idx}
                      onClick={() => !practiceAnswered && handleSelectAnswer(answer)}
                      disabled={practiceAnswered}
                      className={cn(
                        "option-card w-full text-left p-4 rounded-xl transition-all duration-200 border",
                        showCorrect
                          ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                          : showWrong
                          ? "border-red-500 bg-red-500/10 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                          : isSelected 
                          ? "border-primary bg-gradient-to-r from-primary/10 to-violet-500/10 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]" 
                          : "border-border bg-card hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-violet-500/5 hover:translate-x-1",
                        practiceAnswered && !isSelected && !isCorrect && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex-shrink-0 w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all duration-200",
                          showCorrect
                            ? "bg-emerald-500 text-white border-transparent"
                            : showWrong
                            ? "bg-red-500 text-white border-transparent"
                            : isSelected 
                            ? "bg-gradient-to-r from-primary to-violet-500 text-white border-transparent" 
                            : "border-border text-muted-foreground"
                        )}>
                          {showCorrect ? '✓' : showWrong ? '✗' : letters[idx]}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          <MathText text={answer} />
                        </span>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Practice mode: show explanation inline after answering */}
            {isPractice && currentSelectedAnswer != null && currentQuestion.explanation && (
              <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-5 fade-up">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">Explanation</div>
                <div className="text-sm leading-relaxed text-foreground">
                  <RichQuestionContent text={formatExplanation(currentQuestion.explanation)} className="space-y-2" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 fade-up fade-up-4">
        <button 
          onClick={() => {
            if (currentQuestion?.multipart && currentPartIndex > 0) {
              setQuestionPartIndex(currentQuestion.id, currentPartIndex - 1);
              return;
            }
            setCurrentIndex(Math.max(0, currentIndex - 1));
          }}
          disabled={currentIndex === 0 && (!currentQuestion?.multipart || currentPartIndex === 0)}
          className="flex-1 py-3 text-sm font-medium btn-exam-secondary rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          {currentQuestion?.multipart && currentPartIndex > 0 ? "Previous Part" : "Previous"}
        </button>
        {currentIndex === examQuestions.length - 1 ? (
          <button 
            onClick={() => {
              if (hasMoreParts && currentQuestion) {
                setQuestionPartIndex(currentQuestion.id, currentPartIndex + 1);
                return;
              }
              handleSubmit();
            }}
            className="ripple flex-1 py-3 btn-exam-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            {hasMoreParts ? "Next Part" : "Submit Exam"}
          </button>
        ) : (
          <button 
            onClick={() => {
              if (hasMoreParts && currentQuestion) {
                setQuestionPartIndex(currentQuestion.id, currentPartIndex + 1);
                return;
              }
              setCurrentIndex(Math.min(examQuestions.length - 1, currentIndex + 1));
            }}
            className="ripple flex-1 py-3 btn-exam-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            {hasMoreParts ? "Next Part" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in" onClick={() => setShowExitModal(false)} />
          <div className="relative card border border-border rounded-2xl p-6 max-w-sm w-full scale-in bg-card shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">End examination?</h3>
            <p className="text-sm mb-6 text-muted-foreground">Your progress will be lost and cannot be recovered. Are you sure you want to exit?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowExitModal(false)} className="py-3 btn-exam-secondary rounded-xl text-sm font-semibold">
                Continue Exam
              </button>
              <button onClick={() => navigate('/mocks')} className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]">
                End Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
