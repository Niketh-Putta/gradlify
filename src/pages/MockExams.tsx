import { useState, useEffect, useRef, useMemo } from 'react';
import { PremiumLoader } from '@/components/PremiumLoader';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, BookOpen, Play, ArrowLeft, ArrowRight, History, Calculator, Check, Lock, Crown, X, Languages, SpellCheck, PenTool, Sparkles } from "lucide-react";
import { PremiumPaywall } from "@/components/PremiumPaywall";
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "sonner";
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePremium } from "@/hooks/usePremium";
import { useSubject } from "@/contexts/SubjectContext";
import { MockExamHistory } from '@/components/MockExamHistory';
import { PremiumUpgradeButton } from "@/components/PremiumUpgradeButton";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { getTrackPracticeSections, getTrackLabel, TrackSection } from '@/lib/trackCurriculum';
import { expandQuestionTypesForDb, expandSubtopicIdsForDb } from '@/lib/subtopicIdUtils';
import { PracticeLimitModal } from '@/components/PracticeLimitModal';
import { getExamBoardSubtitle } from '@/lib/examBoard';
import { FREE_CHALLENGE_LIMIT } from '@/lib/limits';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import { resolveUserTrack } from '@/lib/track';
import { is11Plus, isGCSE } from '@/lib/track-config';

type ExamTier = 'higher' | 'foundation';
type PaperType = 'calculator' | 'non-calculator';
type ExamMode = 'practice' | 'mock-exam' | 'challenge';

const ELEVEN_PLUS_DIFFICULTY_OPTIONS: Array<{ value: 'fluency' | 'application' | 'reasoning' | 'mixed'; label: string }> = [
  { value: 'fluency', label: 'Fluency (Level 1)' },
  { value: 'application', label: 'Application (Level 2)' },
  { value: 'reasoning', label: 'Reasoning (Level 3)' },
  { value: 'mixed', label: 'Mixed' },
];

const getElevenPlusDifficultyRange = (selection: string): { min: number | null; max: number | null } => {
  if (selection === 'fluency') return { min: 1, max: 1 };
  if (selection === 'application') return { min: 2, max: 2 };
  if (selection === 'reasoning') return { min: 3, max: 3 };
  return { min: null, max: null };
};

const getTopicIcon = (topicId: string, subject: string) => {
  if (subject === 'english') {
    if (topicId === 'Comprehension') return BookOpen;
    if (topicId === 'SPaG') return SpellCheck;
    if (topicId === 'Vocabulary') return Languages;
    return PenTool;
  }
  // Maths icons
  if (topicId === 'Number & Arithmetic' || topicId === 'Number') return Calculator;
  if (topicId === 'Algebra & Ratio' || topicId === 'Algebra') return BookOpen;
  if (topicId === 'Geometry & Measures' || topicId === 'Geometry') return PenTool;
  return BookOpen;
};

export default function MockExams({ forcedSubject }: { forcedSubject?: 'maths' | 'english' }) {
  const { currentSubject: contextSubject } = useSubject();
  const location = useLocation();
  const pathSubject = location.pathname.includes('/mocks/english') ? 'english' : 
                      location.pathname.includes('/mocks/maths') ? 'maths' : undefined;
  const currentSubject = forcedSubject || pathSubject || contextSubject;

  let user = null;
  let profile = null;
  try {
    const context = useAppContext();
    user = context.user;
    profile = context.profile;
  } catch { /* intentionally left empty */ }

  const resolvedTrack = resolveUserTrack(profile?.track ?? null);
  const userTrack = is11Plus ? '11plus' : (isGCSE ? 'gcse' : resolvedTrack);
  const isElevenPlus = userTrack === '11plus';
  const isEnglish = currentSubject === 'english';
  
  const availableSections = useMemo(() => {
    const sections = getTrackPracticeSections(userTrack, currentSubject);
    return sections.filter(s => s.key !== "writing");
  }, [userTrack, currentSubject]);
  
  const navigate = useNavigate();
  const { isPremium, canStartMockExam, canStartChallengeSession, dailyMockUses, dailyMockLimit, dailyChallengeUses, dailyChallengeLimit, refreshUsage, canUse10Questions, canUse20Questions, canUse30Questions, canUse40Questions, canUseFullPaper, incrementMockUsage } = usePremium(userTrack, currentSubject);
  const challengeLimitForDisplay = dailyChallengeLimit ?? FREE_CHALLENGE_LIMIT;

  const [examMode, setExamMode] = useState<ExamMode>('practice');
  const [tierSelection, setTierSelection] = useState<'foundation' | 'higher' | 'both'>('both');
  const [calcSelection, setCalcSelection] = useState<'calculator' | 'non-calculator' | 'both'>('both');
  const [elevenPlusDifficulty, setElevenPlusDifficulty] = useState<'fluency' | 'application' | 'reasoning' | 'mixed'>('mixed');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [subtopicCounts, setSubtopicCounts] = useState<Record<string, number>>({});
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [showMockDialog, setShowMockDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const [selectedQuestionCount, setSelectedQuestionCount] = useState<10 | 20 | 30 | 40 | 50>(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (availableSections.length > 0) {
      setSelectedTopics([availableSections[0].id]);
    }
  }, [availableSections]);

  useEffect(() => {
    if (currentSubject === 'english' && examMode === 'challenge') {
      setExamMode('practice');
    }
  }, [currentSubject, examMode]);


  useEffect(() => {
    if (isElevenPlus) setCalcSelection('non-calculator');
  }, [isElevenPlus]);

  // Always refresh usage data when this page mounts so the 0/1 counter is accurate
  useEffect(() => {
    refreshUsage();
  }, []);

  useEffect(() => {
    const fetchSubtopicCounts = async () => {
      if (selectedTopics.length === 0) {
        setSubtopicCounts({});
        return;
      }

      setSubtopicsLoading(true);
      try {
        const dbTier = isElevenPlus ? ['11+ Standard'] : (tierSelection === 'both' ? ['Foundation Tier', 'Higher Tier'] : [tierSelection === 'higher' ? 'Higher Tier' : 'Foundation Tier']);
        const dbCalculator = isElevenPlus ? ['Non-Calculator'] : (calcSelection === 'both' ? ['Calculator', 'Non-Calculator'] : [calcSelection === 'calculator' ? 'Calculator' : 'Non-Calculator']);
        const difficultyRange = isElevenPlus ? getElevenPlusDifficultyRange(elevenPlusDifficulty) : { min: null, max: null };

        const jobs = availableSections.filter(s => selectedTopics.includes(s.id)).flatMap(s => 
          s.subtopics.map(st => ({ topicId: s.id, sectionKey: s.key, subtopicKey: st.key }))
        );

        const results = await Promise.all(jobs.map(async ({ topicId, sectionKey, subtopicKey }) => {
          const subtopicId = `${sectionKey}|${subtopicKey}`;
          const isEng = currentSubject === 'english';
          
          let query = supabase.from((isEng ? 'english_passages' : 'exam_questions') as any)
            .select('id', { count: 'exact', head: true })
            .eq('track', userTrack);
            
          if (isEng) {
            query = query.eq('sectionId', topicId.toLowerCase());
            // Map subtopicKey to exact strings used in python: 'fiction', 'non_fiction', 'poetry', 'spelling', etc.
            query = query.eq('subtopic', subtopicKey.replace('-', '_').toLowerCase());
          } else {
            const questionTypes = expandQuestionTypesForDb(topicId);
            const subtopicFilter = expandSubtopicIdsForDb(subtopicId);
            query = query.in('question_type', questionTypes.length > 0 ? questionTypes : [topicId])
                         .in('subtopic', subtopicFilter.length > 0 ? subtopicFilter : [subtopicId]);
                         
            if (dbTier.length === 1) query = query.eq('tier', dbTier[0]); else query = query.in('tier', dbTier);
            if (dbCalculator.length === 1) query = query.eq('calculator', dbCalculator[0]); else query = query.in('calculator', dbCalculator);
          }

          if (difficultyRange.min != null) query = query.gte('difficulty', difficultyRange.min);
          if (difficultyRange.max != null) query = query.lte('difficulty', difficultyRange.max);

          const { count, error } = await query;
          if (error) console.error(error);
          return [subtopicId, count || 0] as const;
        }));

        setSubtopicCounts(Object.fromEntries(results));
      } catch (e) {
        console.error(e);
      } finally {
        setSubtopicsLoading(false);
      }
    };
    fetchSubtopicCounts();
  }, [selectedTopics, tierSelection, calcSelection, elevenPlusDifficulty, userTrack, availableSections, isElevenPlus, currentSubject]);

  useEffect(() => {
    const fetchTopicCounts = async () => {
      try {
        const dbTier = isElevenPlus ? ['11+ Standard'] : (tierSelection === 'both' ? ['Foundation Tier', 'Higher Tier'] : [tierSelection === 'higher' ? 'Higher Tier' : 'Foundation Tier']);
        const dbCalculator = isElevenPlus ? ['Non-Calculator'] : (calcSelection === 'both' ? ['Calculator', 'Non-Calculator'] : [calcSelection === 'calculator' ? 'Calculator' : 'Non-Calculator']);
        const difficultyRange = isElevenPlus ? getElevenPlusDifficultyRange(elevenPlusDifficulty) : { min: null, max: null };

        const results = await Promise.all(availableSections.map(async s => {
          const isEng = currentSubject === 'english';
          let query = supabase.from((isEng ? 'english_passages' : 'exam_questions') as any)
            .select('id', { count: 'exact', head: true })
            .eq('track', userTrack);

          if (isEng) {
            query = query.eq('sectionId', s.id.toLowerCase());
          } else {
            const questionTypes = expandQuestionTypesForDb(s.id);
            query = query.in('question_type', questionTypes.length > 0 ? questionTypes : [s.id]);
            if (dbTier.length === 1) query = query.eq('tier', dbTier[0]); else query = query.in('tier', dbTier);
            if (dbCalculator.length === 1) query = query.eq('calculator', dbCalculator[0]); else query = query.in('calculator', dbCalculator);
          }

          if (difficultyRange.min != null) query = query.gte('difficulty', difficultyRange.min);
          if (difficultyRange.max != null) query = query.lte('difficulty', difficultyRange.max);

          const { count } = await query;
          let finalCount = count || 0;
          
          if (isElevenPlus && currentSubject !== 'english') {
            const hardcodedTotals: Record<string, number> = {
              "Number & Arithmetic": 800,
              "Algebra & Ratio": 360,
              "Geometry & Measures": 500,
              "Statistics & Data": 300,
              "Problem Solving": 180
            };
            if (hardcodedTotals[s.id]) {
              finalCount = elevenPlusDifficulty === 'mixed' ? hardcodedTotals[s.id] : Math.floor(hardcodedTotals[s.id] / 3);
            }
          }
          
          return [s.id, finalCount] as const;
        }));
        setTopicCounts(Object.fromEntries(results));
      } catch (e) { /* intentionally left empty */ }
    };
    fetchTopicCounts();
  }, [availableSections, tierSelection, calcSelection, elevenPlusDifficulty, userTrack, isElevenPlus, currentSubject]);

  const toggleTopic = (id: string) => setSelectedTopics(p => p.includes(id) ? p.filter(t => t !== id) : [...p, id]);
  const toggleAllTopics = () => setSelectedTopics(selectedTopics.length === availableSections.length ? [] : availableSections.map(s => s.id));


  const startPractice = () => {
    const tiers = isElevenPlus ? ['11plus-standard'] : (tierSelection === 'both' ? ['foundation', 'higher'] : [tierSelection]);
    const paperTypes = isElevenPlus ? ['non-calculator'] : (calcSelection === 'both' ? ['calculator', 'non-calculator'] : [calcSelection]);
    const params = new URLSearchParams({
      tier: tiers.join(','),
      paperType: paperTypes.join(','),
      topics: selectedTopics.join(','),
      mode: 'practice',
      ...(isElevenPlus ? { track: '11plus' } : {}),
      subject: currentSubject
    });

    if (selectedSubtopics.length > 0) params.set('subtopic', selectedSubtopics.join(','));
    if (isElevenPlus) {
      const { min, max } = getElevenPlusDifficultyRange(elevenPlusDifficulty);
      if (min) params.set('difficultyMin', min.toString());
      if (max) params.set('difficultyMax', max.toString());
    }
    if (currentSubject === 'english') {
      navigate(`/english-demo?${params.toString()}`);
    } else {
      navigate(`/mock-exam?${params.toString()}`);
    }
  };



  const startMockExam = () => {
    if (!isPremium && selectedTopics.length > 1) {
      toast.error('Free mock exams are restricted to a single topic. Upgrade to access full multi-section exams.');
      setShowPaywall(true);
      return;
    }

    if (!canStartMockExam) {
      toast.error('You have reached the limit for the free version. Upgrade for more.');
      setShowPaywall(true);
      return;
    }
    if (currentSubject === 'english') {
      confirmMockExam();
    } else {
      setShowMockDialog(true);
    }
  };

  const confirmMockExam = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      if (!isPremium) {
        const result = await incrementMockUsage(10);
        
        if (!result.allowed) {
          toast.error(result.message || "Usage limit reached.");
          setShowPaywall(true);
          setLoading(false);
          return;
        }
      }

      const tiers = isElevenPlus ? ['11plus-standard'] : (tierSelection === 'both' ? ['foundation', 'higher'] : [tierSelection]);
      const paperTypes = isElevenPlus ? ['non-calculator'] : (calcSelection === 'both' ? ['calculator', 'non-calculator'] : [calcSelection]);
      
      const params = new URLSearchParams({
        tier: tiers.join(','),
        paperType: paperTypes.join(','),
        track: isElevenPlus ? '11plus' : userTrack,
        topics: selectedTopics.join(','),
        mode: 'mock',
        questions: currentSubject === 'english' ? '50' : selectedQuestionCount.toString(),
        subject: currentSubject
      });
      if (selectedSubtopics.length > 0) params.set('subtopic', selectedSubtopics.join(','));
      if (isElevenPlus) {
        const { min, max } = getElevenPlusDifficultyRange(elevenPlusDifficulty);
        if (min) params.set('difficultyMin', min.toString());
        if (max) params.set('difficultyMax', max.toString());
      }
      if (currentSubject === 'english') {
        params.set('mode', 'mock-exam'); // EnglishSplitViewDemo expects mock-exam
        navigate(`/english-demo?${params.toString()}`);
      } else {
        navigate(`/mock-exam?${params.toString()}`);
      }
      setShowMockDialog(false);
      toast.success('Mock exam started!');
    } catch (err) {
      console.error('Error starting mock:', err);
      toast.error('Could not start mock exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTotalEstimatedQuestions = () => {
    if (selectedSubtopics.length > 0) {
      return selectedSubtopics.reduce((sum, id) => sum + (subtopicCounts[id] ?? 0), 0);
    }
    return selectedTopics.reduce((sum, id) => sum + (topicCounts[id] ?? 0), 0);
  };

  const getModeLabel = () => {
    if (examMode === 'practice') return 'Practice';
    if (examMode === 'challenge') return 'Challenge Questions';
    return 'Mock Exam';
  };

  const getCalcLabel = () => isElevenPlus ? 'No Calculator' : (calcSelection === 'both' ? 'Adaptive' : (calcSelection === 'calculator' ? 'Calculator' : 'No Calculator'));
  const getTierLabel = () => isElevenPlus ? elevenPlusDifficulty.charAt(0).toUpperCase() + elevenPlusDifficulty.slice(1) : (tierSelection === 'both' ? 'Mixed' : tierSelection.charAt(0).toUpperCase() + tierSelection.slice(1));
  const getTopicsLabel = () => selectedTopics.length === 0 ? 'No topics' : (selectedTopics.length === availableSections.length ? 'All Topics' : `${selectedTopics.length} Topics`);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><PremiumLoader /></div>;

  return (
    <div className={cn("min-h-screen bg-background", isEnglish ? "theme-english" : "theme-maths")}>
      <div className="max-w-[800px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <header className="flex items-end justify-between mb-8 sm:mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                isEnglish ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
              )}>
                {getTrackLabel(userTrack, currentSubject)}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              <span className={cn(
                "bg-clip-text text-transparent",
                isEnglish
                  ? "bg-gradient-to-br from-slate-900 via-slate-800 to-amber-600 dark:from-white dark:to-amber-400"
                  : "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-600 dark:from-white dark:to-blue-400"
              )}>
                {isEnglish ? 'English ' : 'Maths '}Mock Exams & Practice
              </span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Configure your perfect session</p>
          </div>
          {user && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-11 h-11 rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center shadow-sm">
                  <History className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh]">
                <DialogHeader><DialogTitle>Session History</DialogTitle></DialogHeader>
                <MockExamHistory userId={user.id} />
              </DialogContent>
            </Dialog>
          )}
        </header>

        {/* Clean, High-Contrast 'White Space' Design Banner */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white dark:bg-slate-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.05)] mb-20 transition-all duration-500">
          <div className="relative z-10 p-12 flex flex-col md:flex-row items-center justify-between gap-12 sm:gap-20">
            {/* Left: Usage Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  isEnglish ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-primary shadow-[0_0_8px_rgba(37,99,235,0.6)]"
                )} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                  {isPremium ? 'Premium Active' : 'Daily Allowance'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white font-serif">
                  {isPremium ? (
                    'Unlimited'
                  ) : (
                    <>
                      {`${dailyMockUses}/${dailyMockLimit}`}
                      <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 ml-3 italic">
                        { dailyMockUses === 0 ? 'available today' : 'used today' }
                      </span>
                    </>
                  )}
                </h3>
              </div>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest opacity-80 pt-2">
                Mock exam attempts
              </p>
            </div>
            
            {/* Right: CTA & Benefits */}
            {!isPremium && (
              <div className="shrink-0 w-full md:w-auto flex flex-col items-center gap-6">
                <PremiumUpgradeButton 
                  className={cn(
                    "w-full md:w-auto px-10 h-13 text-[10px] font-black uppercase tracking-[0.35em] transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl border backdrop-blur-xl",
                    isEnglish 
                      ? "bg-gradient-to-br from-amber-500/20 to-orange-500/5 border-amber-500/30 text-amber-600 shadow-[0_8px_32px_0_rgba(245,158,11,0.15)] hover:from-amber-500/30 hover:to-orange-500/15" 
                      : "bg-gradient-to-br from-primary/20 to-indigo-500/5 border-primary/30 text-primary shadow-[0_8px_32px_0_rgba(37,99,235,0.15)] hover:from-primary/30 hover:to-indigo-500/15"
                  )}
                  label="Upgrade to Unlimited"
                />
                
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-10">
                    {[
                      'full question set',
                      'unlimited mocks',
                    ].map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center border shrink-0",
                          isEnglish ? "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-500/20" : "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-500/20"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", isEnglish ? "bg-amber-500" : "bg-primary")} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center border shrink-0",
                      isEnglish ? "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-500/20" : "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-500/20"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", isEnglish ? "bg-amber-500" : "bg-primary")} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">larger mocks</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8 sm:space-y-10 pb-16">
          <section>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest flex items-center gap-2 mb-4"><Play className="h-3.5 w-3.5" />Session Mode</h2>
            <RadioGroup 
              value={examMode} 
              onValueChange={(val) => {
                setExamMode(val as ExamMode);
              }} 
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {[
                { id: 'practice', label: 'Practice Mode', sub: 'Learn at your own pace', icon: BookOpen },
                { id: 'mock-exam', label: 'Mock Exam', sub: 'Timed session, exam format', icon: Timer }
              ].filter(m => !(currentSubject === 'english' && m.id === 'challenge')).map((m) => (
                <Label key={m.id} htmlFor={m.id} className={cn("flex flex-col gap-1 p-4 rounded-2xl border transition-all cursor-pointer relative", examMode === m.id ? (currentSubject === 'english' ? "border-amber-500 bg-amber-500/5 shadow-sm" : "border-primary bg-primary/5 shadow-sm") : (currentSubject === 'english' ? "border-amber-500/20 bg-card hover:bg-amber-500/5" : "border-primary/20 bg-card hover:bg-primary/5"))}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{m.label}</span>
                    <RadioGroupItem value={m.id} id={m.id} className="sr-only" />
                    <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center", examMode === m.id ? (currentSubject === 'english' ? "border-amber-500 bg-amber-500 text-white" : "border-primary bg-primary text-white") : (currentSubject === 'english' ? "border-amber-500/30" : "border-primary/30"))}>
                      {examMode === m.id && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.sub}</span>
                </Label>
              ))}
            </RadioGroup>

            {currentSubject === 'english' && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex gap-3 items-start">
                    <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Practice Workflow</p>
                      <p className="text-xs text-amber-800/70 dark:text-amber-400/70 leading-relaxed">
                        Instant feedback with tutor notes. Change answers until right. Only first attempts count for ranking.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Timer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Mock Environment</p>
                      <p className="text-xs text-amber-800/70 dark:text-amber-400/70 leading-relaxed">
                        Uninterrupted timed completion. See standardised scores and cross-examine all explanations at the end.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {isElevenPlus ? (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Difficulty</h2>
                <div className="grid grid-cols-2 gap-2">
                  {ELEVEN_PLUS_DIFFICULTY_OPTIONS.map((opt) => {
                    const isDisabled = false;
                    const isActive = elevenPlusDifficulty === opt.value;
                    
                    return (
                      <button 
                        key={opt.value} 
                        onClick={() => !isDisabled && setElevenPlusDifficulty(opt.value)} 
                        disabled={isDisabled}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all", 
                          isDisabled 
                            ? (currentSubject === 'english' ? "opacity-40 cursor-not-allowed bg-amber-500/5 text-amber-600/50 border-amber-500/20" : "opacity-40 cursor-not-allowed bg-primary/5 text-primary/50 border-primary/20")
                            : isActive 
                              ? (currentSubject === 'english' ? "border-amber-500 bg-amber-500/5 text-amber-600" : "border-primary bg-primary/5 text-primary")
                              : (currentSubject === 'english' ? "border-amber-500/30 bg-card text-amber-600/70 hover:bg-amber-500/5" : "border-primary/30 bg-card text-primary/70 hover:bg-primary/5")
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tier</h2>
                <div className="grid grid-cols-3 gap-2">
                  {['foundation', 'higher', 'both'].map((t) => (
                    <button key={t} onClick={() => setTierSelection(t as any)} className={cn("px-2 py-2.5 rounded-xl border text-[11px] font-semibold transition-all capitalize", tierSelection === t ? (currentSubject === 'english' ? "border-amber-500 bg-amber-500/5 text-amber-600" : "border-primary bg-primary/5 text-primary") : (currentSubject === 'english' ? "border-amber-500/30 bg-card text-amber-600/70 hover:bg-amber-500/5" : "border-primary/30 bg-card text-primary/70 hover:bg-primary/5"))}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!isElevenPlus && (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Calculator</h2>
                <div className="grid grid-cols-3 gap-2">
                  {['calculator', 'non-calculator', 'both'].map((p) => (
                    <button key={p} onClick={() => setCalcSelection(p as any)} className={cn("px-2 py-2.5 rounded-xl border text-[11px] font-semibold transition-all capitalize", calcSelection === p ? (currentSubject === 'english' ? "border-amber-500 bg-amber-500/5 text-amber-600" : "border-primary bg-primary/5 text-primary") : (currentSubject === 'english' ? "border-amber-500/30 bg-card text-amber-600/70 hover:bg-amber-500/5" : "border-primary/30 bg-card text-primary/70 hover:bg-primary/5"))}>
                      {p.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Topics</h2>
              <button onClick={toggleAllTopics} className={cn("text-[10px] font-bold hover:underline", currentSubject === 'english' ? "text-amber-600" : "text-primary")}>{selectedTopics.length === availableSections.length ? 'Deselect all' : 'Select all'}</button>
            </div>

            {currentSubject === 'english' && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Exam Structure</p>
                  <p className="text-xs text-amber-800/70 dark:text-amber-400/70 leading-relaxed">
                    English sessions are divided into <strong>Passages</strong>. Each passage contains exactly <strong>10 sub-questions</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSections.map((section) => {
                const isSelected = selectedTopics.includes(section.id);
                const count = topicCounts[section.id] ?? 0;
                const Icon = getTopicIcon(section.id, currentSubject);
                const color = section.color;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => toggleTopic(section.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                      isSelected ? "shadow-sm" : (isEnglish ? "border-amber-500/20 bg-card hover:bg-amber-500/5 opacity-60" : "border-primary/20 bg-card hover:bg-primary/5 opacity-60")
                    )}
                    style={{ borderColor: isSelected ? color : undefined, backgroundColor: isSelected ? `${color}10` : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: `${color}15`, color: color }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block">{section.label}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold" style={{ color: color }}>
                            {currentSubject === 'english' 
                              ? `${count} Passages (${count * 10} Questions)` 
                              : `${count} Questions`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? (isEnglish ? "bg-amber-500 border-amber-500 text-white" : "bg-primary border-primary text-white") : (isEnglish ? "border-amber-500/30" : "border-primary/30"))}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedTopics.length > 0 && examMode !== 'challenge' && (
            <section className={cn("bg-muted/20 rounded-2xl p-5 border-2", currentSubject === 'english' ? "border-amber-500/40" : "border-border/60")}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Advanced Filter (Subtopics)</h3>
                <span className="text-[10px] text-muted-foreground italic">Optional</span>
              </div>
              <div className="space-y-8">
                {availableSections.filter(s => selectedTopics.includes(s.id) && s.subtopics.length > 0).map(section => (
                  <div key={section.id} className="space-y-3">
                    <p className="text-[11px] font-bold text-foreground/70 flex items-center gap-2" style={{ color: section.color }}>
                      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                      {section.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {section.subtopics.map(st => {
                        const subtopicId = `${section.key}|${st.key}`;
                        const isSelected = selectedSubtopics.includes(subtopicId);
                        let count = subtopicCounts[subtopicId] ?? 0;
                        
                        // Force subtopic UI numbers to evenly equal the parent section count
                        if (isElevenPlus && currentSubject !== 'english') {
                          count = Math.floor((topicCounts[section.id] ?? 0) / section.subtopics.length);
                        }
                        
                        return (
                          <button
                            key={subtopicId}
                            onClick={() => {
                              if (examMode === 'practice') {
                                setSelectedSubtopics(prev => {
                                  // Clear ONLY the subtopics belonging to this specific parent category (e.g. SPaG)
                                  const isolatedFromThisSection = prev.filter(id => !id.startsWith(section.key + '|'));
                                  return isSelected ? isolatedFromThisSection : [...isolatedFromThisSection, subtopicId];
                                });
                              } else {
                                setSelectedSubtopics(p => isSelected ? p.filter(id => id !== subtopicId) : [...p, subtopicId]);
                              }
                            }}
                            className={cn(
                              "group flex items-center gap-2.5 px-3.5 py-2 rounded-[1rem] border-[1.5px] text-xs font-bold transition-all duration-300 ease-out", 
                              isSelected 
                                ? "text-white scale-[1.03] shadow-md ring-2 ring-offset-2 ring-offset-background" 
                                : (isEnglish ? "bg-card/50 text-muted-foreground hover:bg-amber-500/5 hover:border-amber-500/50 border-amber-500/20 hover:scale-[1.02]" : "bg-card/50 text-muted-foreground hover:bg-primary/5 hover:border-primary/50 border-primary/20 hover:scale-[1.02]")
                            )}
                            style={{ 
                              backgroundColor: isSelected ? section.color : undefined, 
                              borderColor: isSelected ? section.color : undefined,
                              '--ring-color': section.color
                            } as React.CSSProperties}
                          >
                            <span className="tracking-wide">{st.name}</span>
                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", isSelected ? "bg-black/20 text-white border-white/20" : "bg-foreground/5 dark:bg-white/10 text-muted-foreground border-border/50")}>
                              {currentSubject === 'english' ? `${count} Passages` : count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {availableSections.filter(s => selectedTopics.includes(s.id) && s.subtopics.length === 0).map(section => (
                  <div key={section.id} className="flex items-center gap-2">
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                    <span className="text-[11px] font-bold" style={{ color: section.color }}>{section.label}</span>
                    <span className="text-[10px] text-muted-foreground/60 italic ml-1">- no subtopics</span>
                  </div>
                ))}
              </div>
              {selectedSubtopics.length > 0 && <button onClick={() => setSelectedSubtopics([])} className={cn("mt-6 text-[10px] font-bold text-muted-foreground flex items-center gap-1.5", currentSubject === 'english' ? "hover:text-amber-500" : "hover:text-primary")}><X className="h-3 w-3" />Reset filters</button>}
            </section>
          )}

          <div className="fixed bottom-[84px] lg:bottom-6 left-0 lg:left-16 right-0 z-40 flex justify-center pointer-events-none px-4 sm:px-0">
            <div className={cn("w-full max-w-[600px] pointer-events-auto transition-all duration-500 ease-out", selectedTopics.length > 0 ? "translate-y-0 opacity-100" : "translate-y-14 opacity-0 pointer-events-none")}>
              <div className="relative">
              {/* Soft lift shadow that adapts to themes */}
              <div className="absolute inset-x-10 -bottom-2 h-6 blur-xl rounded-full bg-black/5 dark:bg-black/40" />

              {/* Light frosted glass card replacing muddy inline rgba wrappers */}
              <div
                className={cn(
                  "relative flex items-center gap-4 px-4 py-3 rounded-2xl backdrop-blur-2xl transition-all duration-300",
                  "bg-white/80 dark:bg-slate-900/70 border-[1.5px]",
                  isEnglish ? "border-amber-500/30 dark:border-amber-500/20 shadow-[0_8px_30px_-5px_rgba(245,158,11,0.15)] dark:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.1)]" : "border-primary/30 dark:border-primary/20 shadow-[0_8px_30px_-5px_rgba(59,130,246,0.15)] dark:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.1)]"
                )}
              >
                {/* Icon box - tinted intelligently for both modes */}
                <div
                  className={cn("shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors", isEnglish ? "bg-amber-500/10 dark:bg-amber-500/20" : "bg-primary/10 dark:bg-primary/20")}
                >
                  <Play className={cn("h-4 w-4 transition-colors", currentSubject === 'english' ? "text-amber-600 dark:text-amber-400" : "text-primary dark:text-blue-400")} />
                </div>

                {/* Text - Adaptive contrast tokens instead of static slates */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                    {getTopicsLabel()} · {currentSubject === 'english' 
                      ? `~${getTotalEstimatedQuestions()} Passages (${getTotalEstimatedQuestions() * 10} Qs)` 
                      : `~${getTotalEstimatedQuestions()} questions`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {getModeLabel()} &nbsp;·&nbsp; {getTierLabel()} &nbsp;·&nbsp; {getCalcLabel()}
                  </p>
                </div>

                {/* Glowing CTA - Elite Button */}
                <Button
                   onClick={examMode === 'practice' ? startPractice : startMockExam}
                  disabled={selectedTopics.length === 0 || loading}
                  className="shrink-0 h-10 px-5 rounded-xl font-semibold text-[13px] border-0 transition-all duration-200 active:scale-[0.97] text-white"
                  style={currentSubject === 'english' ? {
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 0 0 1px rgba(245,158,11,0.2), 0 4px 16px rgba(245,158,11,0.3)',
                  } : {
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                    boxShadow: '0 0 0 1px hsl(var(--primary) / 0.2), 0 4px 16px hsl(var(--primary) / 0.3)',
                  }}
                >
                  {loading ? 'Starting...' : 'Start Session'}
                  {!loading && <ArrowRight className="h-3.5 w-3.5 ml-1.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>

        <Dialog open={showMockDialog} onOpenChange={setShowMockDialog}>
          <DialogContent className="max-w-md rounded-[2rem] p-6 sm:p-8 border-white/20 bg-[#F2F2F7] dark:bg-slate-900 backdrop-blur-2xl shadow-2xl overflow-y-auto max-h-[90dvh] md:max-h-[85vh] ring-1 ring-black/5">
            <div className="space-y-6 sm:space-y-8">
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Mock Exam Settings</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-foreground/50 mt-1 font-medium">Select your preferred session length.</DialogDescription>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                {[
                  { count: 10, label: 'Standard', sub: '10 Qs', desc: 'Quick focus', allowed: canUse10Questions },
                  { count: 20, label: 'Extended', sub: '20 Qs', desc: 'Comprehensive practice', allowed: canUse20Questions },
                  { count: 30, label: 'Intensive', sub: '30 Qs', desc: 'Deep-dive revision', allowed: canUse30Questions },
                  { count: 40, label: 'Advanced', sub: '40 Qs', desc: 'Extended deep-dive mock simulation', allowed: canUse40Questions },
                  { count: 50, label: 'Full Paper', sub: '50 Qs', desc: 'Complete exam simulation', allowed: canUseFullPaper }
                ].map((pkg) => {
                  const isSelected = selectedQuestionCount === pkg.count;
                  const isEnglish = currentSubject === 'english';
                  
                  return (
                    <button 
                      key={pkg.count} 
                      disabled={!pkg.allowed}
                      onClick={() => pkg.allowed && setSelectedQuestionCount(pkg.count as any)} 
                      className={cn(
                        "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden",
                        isSelected 
                          ? (isEnglish ? "border-amber-500 bg-white shadow-xl shadow-amber-500/10 scale-[1.02]" : "border-primary bg-white shadow-xl shadow-primary/10 scale-[1.02]")
                          : pkg.allowed 
                            ? "border-transparent bg-white hover:bg-white/80" 
                            : "opacity-40 cursor-not-allowed grayscale"
                      )}
                    >
                      <div className="text-left relative z-10">
                        <p className={cn("font-bold text-base transition-colors", isSelected ? (isEnglish ? "text-amber-600" : "text-primary") : "text-foreground")}>
                          {pkg.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {pkg.sub} &nbsp;·&nbsp; {(!pkg.allowed && pkg.count >= 20) ? "Upgrade plan for longer mocks" : pkg.desc}
                        </p>
                      </div>
                      
                      <div className="relative z-10">
                        {isSelected ? (
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-white shadow-md animate-in zoom-in-50",
                            isEnglish ? "bg-amber-500" : "bg-primary"
                          )}>
                            <Check className="h-4 w-4 stroke-[3px]" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-slate-200 bg-white" />
                        )}
                      </div>

                      {/* Subtle gradient overlay for selected */}
                      {isSelected && (
                        <div className={cn(
                          "absolute inset-0 opacity-[0.03] pointer-events-none",
                          isEnglish ? "bg-amber-500" : "bg-primary"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>

              {!isPremium && selectedQuestionCount > 10 && (
                <div className={cn(
                  "p-5 rounded-2xl border animate-in fade-in slide-in-from-bottom-2 duration-300",
                  currentSubject === 'english' ? "bg-amber-500/5 border-amber-500/10" : "bg-primary/5 border-primary/10"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className={cn("h-4 w-4", currentSubject === 'english' ? "text-amber-600" : "text-primary")} />
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", currentSubject === 'english' ? "text-amber-600" : "text-primary")}>Ultra Feature</p>
                  </div>
                  <p className="text-[11px] text-foreground/60 leading-relaxed font-bold mb-4">Upgrade for full 50-question paper sessions.</p>
                  <PremiumUpgradeButton className="w-full h-10 rounded-xl text-xs font-black shadow-none" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowMockDialog(false)}
                  className="h-14 rounded-2xl text-[15px] font-bold text-slate-500 bg-white hover:bg-slate-50 border-0 transition-all active:scale-[0.98]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmMockExam} 
                  disabled={!isPremium && selectedQuestionCount > 10}
                  className={cn(
                    "h-14 rounded-2xl text-[15px] font-bold text-white shadow-2xl transition-all active:scale-[0.98] border-0",
                    currentSubject === 'english' 
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" 
                      : "bg-primary hover:bg-blue-600 shadow-primary/30"
                  )}
                >
                  Confirm & Start
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        <PremiumPaywall 
          open={showPaywall} 
          onOpenChange={setShowPaywall} 
          title="Daily Limit Reached" 
          description="Upgrade to unlock unlimited mock exams, full question sets, and advanced analytics." 
        />
      </div>
    </div>
  );
}
