import { useState, useEffect, useRef, useMemo } from 'react';
import { PremiumLoader } from '@/components/PremiumLoader';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, BookOpen, Play, ArrowLeft, ArrowRight, History, Calculator, Check, Lock, Crown, X, Languages, SpellCheck, PenTool } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "sonner";
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePremium } from "@/hooks/usePremium";
import { useSubject } from "@/contexts/SubjectContext";
import { MockExamHistory } from '@/components/MockExamHistory';
import { PremiumUpgradeButton } from "@/components/PremiumUpgradeButton";
import { ChallengeLimitModal } from "@/components/ChallengeLimitModal";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { getTrackSections, getTrackLabel, TrackSection } from '@/lib/trackCurriculum';
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
  } catch { }

  const resolvedTrack = resolveUserTrack(profile?.track ?? null);
  const userTrack = is11Plus ? '11plus' : (isGCSE ? 'gcse' : resolvedTrack);
  const isElevenPlus = userTrack === '11plus';
  
  const availableSections = useMemo(() => {
    const sections = getTrackSections(userTrack, currentSubject);
    return sections.filter(s => s.key !== "writing");
  }, [userTrack, currentSubject]);
  
  const navigate = useNavigate();
  const { isPremium, canStartMockExam, canStartChallengeSession, dailyMockUses, dailyMockLimit, dailyChallengeUses, dailyChallengeLimit, refreshUsage, canUse10Questions, canUse20Questions, canUse30Questions, canUseFullPaper } = usePremium(userTrack);
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
  const [showMockLimitModal, setShowMockLimitModal] = useState(false);
  const [showChallengeLimitModal, setShowChallengeLimitModal] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<10 | 20 | 30 | 50>(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (availableSections.length > 0) {
      setSelectedTopics([availableSections[0].id]);
    }
  }, [availableSections]);

  useEffect(() => {
    if (isElevenPlus) setCalcSelection('non-calculator');
  }, [isElevenPlus]);

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
          const questionTypes = expandQuestionTypesForDb(topicId);
          const subtopicFilter = expandSubtopicIdsForDb(subtopicId);
          
          let query = supabase.from('exam_questions').select('id', { count: 'exact', head: true })
            .in('question_type', questionTypes.length > 0 ? questionTypes : [topicId])
            .in('subtopic', subtopicFilter.length > 0 ? subtopicFilter : [subtopicId])
            .eq('track', userTrack);

          if (dbTier.length === 1) query = query.eq('tier', dbTier[0]); else query = query.in('tier', dbTier);
          if (dbCalculator.length === 1) query = query.eq('calculator', dbCalculator[0]); else query = query.in('calculator', dbCalculator);
          if (difficultyRange.min != null) query = query.gte('difficulty', difficultyRange.min);
          if (difficultyRange.max != null) query = query.lte('difficulty', difficultyRange.max);

          const { count } = await query;
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
  }, [selectedTopics, tierSelection, calcSelection, elevenPlusDifficulty, userTrack, availableSections, isElevenPlus]);

  useEffect(() => {
    const fetchTopicCounts = async () => {
      try {
        const dbTier = isElevenPlus ? ['11+ Standard'] : (tierSelection === 'both' ? ['Foundation Tier', 'Higher Tier'] : [tierSelection === 'higher' ? 'Higher Tier' : 'Foundation Tier']);
        const dbCalculator = isElevenPlus ? ['Non-Calculator'] : (calcSelection === 'both' ? ['Calculator', 'Non-Calculator'] : [calcSelection === 'calculator' ? 'Calculator' : 'Non-Calculator']);
        const difficultyRange = isElevenPlus ? getElevenPlusDifficultyRange(elevenPlusDifficulty) : { min: null, max: null };

        const results = await Promise.all(availableSections.map(async s => {
          const questionTypes = expandQuestionTypesForDb(s.id);
          let query = supabase.from('exam_questions').select('id', { count: 'exact', head: true })
            .in('question_type', questionTypes.length > 0 ? questionTypes : [s.id])
            .eq('track', userTrack);

          if (dbTier.length === 1) query = query.eq('tier', dbTier[0]); else query = query.in('tier', dbTier);
          if (dbCalculator.length === 1) query = query.eq('calculator', dbCalculator[0]); else query = query.in('calculator', dbCalculator);
          if (difficultyRange.min != null) query = query.gte('difficulty', difficultyRange.min);
          if (difficultyRange.max != null) query = query.lte('difficulty', difficultyRange.max);

          const { count } = await query;
          return [s.id, count || 0] as const;
        }));
        setTopicCounts(Object.fromEntries(results));
      } catch (e) { }
    };
    fetchTopicCounts();
  }, [availableSections, tierSelection, calcSelection, elevenPlusDifficulty, userTrack, isElevenPlus]);

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
    navigate(`/practice/${currentSubject}?${params.toString()}`);
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
      subject: currentSubject
    });
    navigate(`/practice/${currentSubject}?${params.toString()}`);
  };

  const startMockExam = () => {
    if (!canStartMockExam) {
      setShowMockLimitModal(true);
      return;
    }
    setShowMockDialog(true);
  };

  const confirmMockExam = async () => {
    const tiers = isElevenPlus ? ['11plus-standard'] : (tierSelection === 'both' ? ['foundation', 'higher'] : [tierSelection]);
    const paperTypes = isElevenPlus ? ['non-calculator'] : (calcSelection === 'both' ? ['calculator', 'non-calculator'] : [calcSelection]);
    
    const params = new URLSearchParams({
      tier: tiers.join(','),
      paperType: paperTypes.join(','),
      track: isElevenPlus ? '11plus' : userTrack,
      topics: selectedTopics.join(','),
      mode: 'mock',
      questions: selectedQuestionCount.toString(),
      subject: currentSubject
    });
    if (selectedSubtopics.length > 0) params.set('subtopic', selectedSubtopics.join(','));
    if (isElevenPlus) {
      const { min, max } = getElevenPlusDifficultyRange(elevenPlusDifficulty);
      if (min) params.set('difficultyMin', min.toString());
      if (max) params.set('difficultyMax', max.toString());
    }
    navigate(`/mock-exam?${params.toString()}`);
    setShowMockDialog(false);
    toast.success('Mock exam started!');
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
    <div className="min-h-screen bg-background">
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-40">
        <header className="flex items-center justify-between mb-10 sm:mb-14">
          <div>
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary mb-2">
              {getTrackLabel(userTrack, currentSubject)}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{currentSubject === 'english' ? 'English ' : 'Maths '}Mock Exams & Practice</h1>
            <span className="text-xs sm:text-sm text-muted-foreground">Configure your perfect session</span>
          </div>
          {user && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center shadow-sm">
                  <History className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh]">
                <DialogHeader><DialogTitle>Session History</DialogTitle></DialogHeader>
                <MockExamHistory userId={user.id} />
              </DialogContent>
            </Dialog>
          )}
        </header>

        <div className="bg-card border border-border/40 rounded-2xl p-4 sm:p-5 mb-10 sm:mb-14 shadow-sm space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground"><Timer className="h-4 w-4" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  {examMode === 'challenge' 
                    ? (isPremium ? 'Unlimited Challenge Questions' : `${dailyChallengeUses}/${challengeLimitForDisplay} Challenges Used`)
                    : (isPremium ? 'Unlimited Mock Exams' : `${dailyMockUses}/${dailyMockLimit} Mocks Used`)}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{isPremium ? 'Premium' : 'Free Tier'}</span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500 rounded-full", (examMode === 'challenge' ? dailyChallengeUses/challengeLimitForDisplay : dailyMockUses/dailyMockLimit) > 0.8 ? "bg-warning" : "bg-primary")} 
                  style={{ width: `${isPremium ? 0 : (examMode === 'challenge' ? (dailyChallengeUses/challengeLimitForDisplay) : (dailyMockUses/dailyMockLimit)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          {!isPremium && <PremiumUpgradeButton className="w-full h-9 text-xs" />}
        </div>

        <div className="space-y-10 sm:space-y-12 pb-32">
          <section>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest flex items-center gap-2 mb-4"><Play className="h-3.5 w-3.5" />Session Mode</h2>
            <RadioGroup value={examMode} onValueChange={(val) => setExamMode(val as ExamMode)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'practice', label: 'Practice Mode', sub: 'Learn at your own pace', icon: BookOpen },
                { id: 'mock-exam', label: 'Mock Exam', sub: 'Timed session, exam format', icon: Timer },
                { id: 'challenge', label: 'Challenge Session', sub: 'Hardest questions only', icon: Crown }
              ].map((m) => (
                <Label key={m.id} htmlFor={m.id} className={cn("flex flex-col gap-1 p-4 rounded-2xl border transition-all cursor-pointer relative", examMode === m.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 bg-card hover:bg-muted/30")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{m.label}</span>
                    <RadioGroupItem value={m.id} id={m.id} className="sr-only" />
                    <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center", examMode === m.id ? "border-primary bg-primary text-white" : "border-muted")}>
                      {examMode === m.id && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.sub}</span>
                </Label>
              ))}
            </RadioGroup>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {isElevenPlus ? (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Difficulty</h2>
                <div className="grid grid-cols-2 gap-2">
                  {ELEVEN_PLUS_DIFFICULTY_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setElevenPlusDifficulty(opt.value)} className={cn("px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all", elevenPlusDifficulty === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30")}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tier</h2>
                <div className="grid grid-cols-3 gap-2">
                  {['foundation', 'higher', 'both'].map((t) => (
                    <button key={t} onClick={() => setTierSelection(t as any)} className={cn("px-2 py-2.5 rounded-xl border text-[11px] font-semibold transition-all capitalize", tierSelection === t ? "border-primary bg-primary/5 text-primary" : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30")}>
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
                    <button key={p} onClick={() => setCalcSelection(p as any)} className={cn("px-2 py-2.5 rounded-xl border text-[11px] font-semibold transition-all capitalize", calcSelection === p ? "border-primary bg-primary/5 text-primary" : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30")}>
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
              <button onClick={toggleAllTopics} className="text-[10px] font-bold text-primary hover:underline">{selectedTopics.length === availableSections.length ? 'Deselect all' : 'Select all'}</button>
            </div>
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
                      isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 bg-card hover:bg-muted/30 opacity-60"
                    )}
                    style={{ borderColor: isSelected ? color : undefined, backgroundColor: isSelected ? `${color}10` : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: `${color}15`, color: color }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block">{section.label}</span>
                        {isSelected && <span className="text-[10px] font-bold" style={{ color: color }}>{count} Questions</span>}
                      </div>
                    </div>
                    <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary text-white" : "border-muted")}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedTopics.length > 0 && examMode !== 'challenge' && (
            <section className="bg-muted/20 rounded-2xl p-5 border border-dashed border-border/60">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Advanced Filter (Subtopics)</h3>
                <span className="text-[10px] text-muted-foreground italic">Optional</span>
              </div>
              <div className="space-y-8">
                {availableSections.filter(s => selectedTopics.includes(s.id)).map(section => (
                  <div key={section.id} className="space-y-3">
                    <p className="text-[11px] font-bold text-foreground/70 flex items-center gap-2" style={{ color: section.color }}>
                      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                      {section.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {section.subtopics.map(st => {
                        const subtopicId = `${section.key}|${st.key}`;
                        const isSelected = selectedSubtopics.includes(subtopicId);
                        const count = subtopicCounts[subtopicId] ?? 0;
                        return (
                          <button
                            key={subtopicId}
                            onClick={() => setSelectedSubtopics(p => isSelected ? p.filter(id => id !== subtopicId) : [...p, subtopicId])}
                            className={cn("group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all", isSelected ? "text-white" : "bg-card text-muted-foreground hover:border-primary/50")}
                            style={{ backgroundColor: isSelected ? section.color : undefined, borderColor: isSelected ? section.color : undefined }}
                          >
                            {st.name}
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", isSelected ? "bg-black/10 text-white" : "bg-muted text-muted-foreground")}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {selectedSubtopics.length > 0 && <button onClick={() => setSelectedSubtopics([])} className="mt-6 text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1.5"><X className="h-3 w-3" />Reset filters</button>}
            </section>
          )}

          <div className="fixed bottom-6 left-0 lg:left-16 right-0 z-[60] flex justify-center pointer-events-none px-4 sm:px-0">
            <div className={cn("w-full max-w-[600px] pointer-events-auto transition-all duration-500 ease-out", selectedTopics.length > 0 ? "translate-y-0 opacity-100" : "translate-y-14 opacity-0 pointer-events-none")}>
              <div className="relative">
              {/* Soft lift shadow */}
              <div className="absolute inset-x-10 -bottom-2 h-6 blur-xl rounded-full" style={{ background: 'rgba(0,0,0,0.1)' }} />

              {/* Light frosted glass card */}
              <div
                className="relative flex items-center gap-4 px-4 py-3 rounded-[1.25rem]"
                style={{
                  background: 'rgba(255,255,255,0.45)', // Slightly more transparent
                  backdropFilter: 'blur(30px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
                }}
              >
                {/* Icon box — tinted with primary color */}
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'hsl(var(--primary) / 0.1)' }}
                >
                  <Play className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">
                    {getTopicsLabel()} · ~{getTotalEstimatedQuestions()} questions
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {getModeLabel()} &nbsp;·&nbsp; {getTierLabel()} &nbsp;·&nbsp; {getCalcLabel()}
                  </p>
                </div>

                {/* Glowing CTA — the hero element */}
                <Button
                  onClick={examMode === 'practice' ? startPractice : (examMode === 'challenge' ? startChallengeSession : startMockExam)}
                  disabled={selectedTopics.length === 0 || loading}
                  className="shrink-0 h-10 px-5 rounded-[0.85rem] font-semibold text-[13px] border-0 transition-all duration-200 active:scale-[0.97] text-white"
                  style={examMode === 'challenge' ? {
                    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                    boxShadow: '0 0 0 1px rgba(245,158,11,0.3), 0 4px 16px rgba(245,158,11,0.45), 0 8px 32px rgba(245,158,11,0.25)',
                    color: '#451a03',
                  } : {
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                    boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3), 0 4px 16px hsl(var(--primary) / 0.4), 0 8px 32px hsl(var(--primary) / 0.2)',
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
          <DialogContent className="max-w-sm sm:max-w-md rounded-3xl">
            <DialogHeader><DialogTitle>Mock Exam Settings</DialogTitle><DialogDescription>Choose session length</DialogDescription></DialogHeader>
            <div className="py-6 space-y-4">
              {[
                { count: 10, label: 'Standard', sub: '10 Qs', allowed: canUse10Questions },
                { count: 20, label: 'Extended', sub: '20 Qs', allowed: canUse20Questions },
                { count: 30, label: 'Intensive', sub: '30 Qs', allowed: canUse30Questions },
                { count: 50, label: 'Full Paper', sub: '50 Qs', allowed: canUseFullPaper }
              ].map((pkg) => (
                <button key={pkg.count} onClick={() => pkg.allowed && setSelectedQuestionCount(pkg.count as any)} className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", selectedQuestionCount === pkg.count ? "border-primary bg-primary/5" : pkg.allowed ? "border-border bg-card hover:border-primary/30" : "opacity-40 cursor-not-allowed")}>
                  <div className="text-left"><p className="font-bold text-sm">{pkg.label}</p><p className="text-xs text-muted-foreground">{pkg.sub}</p></div>
                  {!pkg.allowed && <Lock className="h-4 w-4 text-muted-foreground" />}{selectedQuestionCount === pkg.count && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
              {!isPremium && selectedQuestionCount > 10 && <div className="p-4 rounded-xl bg-primary/5 border border-primary/20"><p className="text-xs font-bold text-primary mb-1">Premium Feature</p><p className="text-[10px] text-muted-foreground mb-3">Upgrade to access full papers.</p><PremiumUpgradeButton className="h-7 text-[10px]" /></div>}
            </div>
            <div className="flex flex-col gap-2"><Button onClick={confirmMockExam} className="h-12 rounded-xl font-bold" disabled={!isPremium && selectedQuestionCount > 10}>Confirm & Start</Button><Button variant="ghost" onClick={() => setShowMockDialog(false)}>Cancel</Button></div>
          </DialogContent>
        </Dialog>

        <ChallengeLimitModal open={showChallengeLimitModal} onOpenChange={setShowChallengeLimitModal} />
        <div className="hidden"><PracticeLimitModal open={showMockLimitModal} onOpenChange={setShowMockLimitModal} onComeBack={() => setShowMockLimitModal(false)} /></div>
      </div>
    </div>
  );
}
