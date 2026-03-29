import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Timer, BookOpen, Play, ArrowLeft, ArrowRight, History, Calculator, Check, Lock, Crown, X, Languages, SpellCheck, PenTool } from "lucide-react";
import { useSubject } from '@/contexts/SubjectContext';
import { resolveUserTrack } from '@/lib/track';
import { useAppContext } from '@/hooks/useAppContext';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTrackSections, TrackSection } from '@/lib/trackCurriculum';
import { expandQuestionTypesForDb, expandSubtopicIdsForDb } from '@/lib/subtopicIdUtils';
import PracticeSessionNew from '@/components/exam/PracticeSessionNew';
import MultipartPracticePanel from "@/components/experimental/MultipartPracticePanel";
import { EnglishSplitViewDemo } from "@/pages/EnglishSplitViewDemo";
import { PracticeLimitModal } from '@/components/PracticeLimitModal';

type CalcSelection = 'calculator' | 'non-calculator' | 'both';
type TierSelection = 'foundation' | 'higher' | 'both';
type DifficultySelection = 'fluency' | 'application' | 'reasoning' | 'mixed';

interface PracticePageProps {
  forcedSubject?: 'maths' | 'english';
}

const getTopicIcon = (topicId: string, subject: string) => {
  if (subject === 'english') {
    if (topicId === 'Comprehension') return BookOpen;
    if (topicId === 'SPaG') return SpellCheck;
    if (topicId === 'Vocabulary') return Languages;
    return PenTool;
  }
  if (topicId === 'Number & Arithmetic' || topicId === 'Number') return Calculator;
  if (topicId === 'Algebra & Ratio' || topicId === 'Algebra') return BookOpen;
  if (topicId === 'Geometry & Measures' || topicId === 'Geometry') return PenTool;
  return BookOpen;
};

export default function PracticePage({ forcedSubject }: PracticePageProps) {
  const { currentSubject: contextSubject } = useSubject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const pathSubject = location.pathname.includes('/practice/english') ? 'english' : 
                      location.pathname.includes('/practice/maths') ? 'maths' : undefined;
  
  const currentSubject = forcedSubject || pathSubject || contextSubject;
  const themeColor = currentSubject === 'english' ? '#10b981' : '#3b82f6';

  let user = null;
  let userTrack: 'gcse' | '11plus' = 'gcse';
  try {
    const context = useAppContext();
    user = context.user;
    userTrack = resolveUserTrack(context.profile?.track ?? null);
  } catch { }

  const trackParam = searchParams.get('track');
  const isElevenPlus = trackParam === '11plus' || userTrack === '11plus';
  const activeTrack: 'gcse' | '11plus' = isElevenPlus ? '11plus' : 'gcse';
  const { refreshUsage } = usePremium(activeTrack);
  const availableSections = useMemo(() => {
    const sections = getTrackSections(activeTrack, currentSubject);
    return sections.filter(s => s.key !== "writing");
  }, [activeTrack, currentSubject]);
  
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultySelection>('mixed');
  const [tierSelection, setTierSelection] = useState<TierSelection>('both');
  const [calcSelection, setCalcSelection] = useState<CalcSelection>('both');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [subtopicCounts, setSubtopicCounts] = useState<Record<string, number>>({});
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  const [showPracticeLimitModal, setShowPracticeLimitModal] = useState(false);

  useEffect(() => {
    if (availableSections.length > 0) {
      setSelectedTopics([availableSections[0].id]);
      setSelectedSubtopics([]);
    }
  }, [availableSections]);

  const startPractice = () => {
    const getDifficultyRange = (level: DifficultySelection) => {
      const max = isElevenPlus ? 3 : 4;
      switch (level) {
        case 'fluency': return { min: 1, max: 1 };
        case 'application': return { min: 2, max: 2 };
        case 'reasoning': return { min: 3, max: 3 };
        default: return { min: 1, max };
      }
    };
    const { min, max } = getDifficultyRange(difficultyLevel);

    const params = new URLSearchParams({
      tier: isElevenPlus ? '11plus-standard' : tierSelection,
      paperType: isElevenPlus ? 'non-calculator' : calcSelection,
      topics: selectedTopics.join(','),
      mode: 'practice',
      difficultyMin: min.toString(),
      difficultyMax: max.toString(),
      ...(isElevenPlus ? { track: '11plus' } : {}),
      subject: currentSubject
    });
    if (selectedSubtopics.length > 0) params.set('subtopic', selectedSubtopics.join(','));
    navigate(`/practice-page?${params.toString()}`);
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => {
      const isSelected = prev.includes(topicId);
      if (isSelected) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== topicId);
      }
      return [...prev, topicId];
    });
  };

  useEffect(() => {
    const fetchSubtopicCounts = async () => {
      if (selectedTopics.length === 0) {
        setSubtopicCounts({});
        return;
      }
      setSubtopicsLoading(true);
      try {
        const sectionsToCount = availableSections.filter(s => selectedTopics.includes(s.id));
        const dbTier = isElevenPlus ? ['11+ Standard'] : (tierSelection === 'both' ? ['Foundation Tier', 'Higher Tier'] : [tierSelection === 'higher' ? 'Higher Tier' : 'Foundation Tier']);
        const dbCalculator = isElevenPlus ? ['Non-Calculator'] : (calcSelection === 'both' ? ['Calculator', 'Non-Calculator'] : [calcSelection === 'calculator' ? 'Calculator' : 'Non-Calculator']);

        const subtopicJobs = sectionsToCount.flatMap(section => section.subtopics.map(st => ({ topicId: section.id, sectionKey: section.key, subtopicKey: st.key })));
        const results = await Promise.all(subtopicJobs.map(async ({ topicId, sectionKey, subtopicKey }) => {
          const subtopicId = `${sectionKey}|${subtopicKey}`;
          const questionTypes = expandQuestionTypesForDb(topicId);
          const subtopicCandidates = expandSubtopicIdsForDb(subtopicId);
          const subtopicFilter = subtopicCandidates.length > 0 ? subtopicCandidates : [subtopicId];
          let query = supabase.from('exam_questions').select('id', { count: 'exact', head: true }).in('question_type', questionTypes.length > 0 ? questionTypes : [topicId]).in('subtopic', subtopicFilter).eq('track', activeTrack);
          query = dbTier.length === 1 ? query.eq('tier', dbTier[0]) : query.in('tier', dbTier);
          query = dbCalculator.length === 1 ? query.eq('calculator', dbCalculator[0]) : query.in('calculator', dbCalculator);
          const { count } = await query;
          return [subtopicId, count || 0] as const;
        }));
        setSubtopicCounts(Object.fromEntries(results));
      } catch (e) {
        setSubtopicCounts({});
      } finally {
        setSubtopicsLoading(false);
      }
    };
    fetchSubtopicCounts();
  }, [selectedTopics, tierSelection, calcSelection, activeTrack, isElevenPlus, availableSections]);

  const hasParams = !!(searchParams.get('topics') || searchParams.get('questionIds') || searchParams.get('mode'));
  if (hasParams) {
    if (currentSubject === 'english') return <EnglishSplitViewDemo />;
    return <PracticeSessionNew />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-slate-50/30 min-h-screen">
      <header className="mb-12">
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">{currentSubject === 'english' ? 'English ' : 'Maths '}Practice</h1>
        <p className="text-slate-500">Configure your session for maximum performance</p>
      </header>

      <MultipartPracticePanel userEmail={user?.email ?? null} />

      <section className="mt-12 space-y-12 pb-32">
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: themeColor }}>Step 2</span>
            <h2 className="text-2xl font-serif font-bold text-slate-800">Difficulty</h2>
            <p className="text-sm text-slate-500">Choose the cognitive challenge level</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'fluency', label: 'Fluency', level: '1' },
              { id: 'application', label: 'Application', level: '2' },
              { id: 'reasoning', label: 'Reasoning', level: '3' },
              { id: 'mixed', label: 'Mixed', level: null }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setDifficultyLevel(item.id as any)}
                className={cn(
                  'relative px-4 py-6 rounded-2xl border-2 font-bold text-sm transition-all text-center flex flex-col items-center justify-center gap-1',
                  difficultyLevel === item.id 
                    ? 'bg-white shadow-sm border-blue-500 text-slate-800' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                )}
                style={{ borderColor: difficultyLevel === item.id ? themeColor : undefined }}
              >
                <span>{item.label}</span>
                {item.level && <span className="text-[10px] font-normal opacity-70">Level {item.level}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: themeColor }}>Step 3</span>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-800">Content</h2>
                <p className="text-sm text-slate-500">Select topics to include in your session</p>
              </div>
              <button 
                onClick={() => setSelectedTopics(availableSections.map(t => t.id))}
                className="text-[11px] font-bold hover:underline"
                style={{ color: themeColor }}
              >
                Select all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableSections.map(section => {
              const isSelected = selectedTopics.includes(section.id);
              const totalCount = section.subtopics.reduce((sum, st) => sum + (subtopicCounts[`${section.key}|${st.key}`] || 0), 0);
              const Icon = getTopicIcon(section.id, currentSubject);
              const color = section.color;

              return (
                <div 
                  key={section.id}
                  onClick={() => toggleTopic(section.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                    isSelected ? "bg-white shadow-sm" : "bg-card border-slate-100 hover:border-slate-200 opacity-60"
                  )}
                  style={{ borderColor: isSelected ? color : 'transparent' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: `${color}15`, color: color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <span className={cn("font-bold text-sm block", isSelected ? "text-slate-800" : "text-slate-500")}>{section.label}</span>
                    <span className="text-[10px] font-black opacity-30 group-hover:opacity-100 transition-opacity" style={{ color: isSelected ? color : undefined }}>{totalCount} Questions</span>
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "text-white" : "border-slate-300 bg-white"
                  )} style={{ backgroundColor: isSelected ? color : undefined, borderColor: isSelected ? color : undefined }}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTopics.length > 0 && currentSubject !== 'english' && (
            <div className="space-y-12 pt-6">
              {availableSections.filter(s => selectedTopics.includes(s.id)).map(section => (
                <div key={section.key} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400 flex items-center gap-2">
                       <div className="w-1 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                       {section.label}
                    </h3>
                    <button 
                      className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const ids = section.subtopics.map(st => `${section.key}|${st.key}`);
                        setSelectedSubtopics(prev => Array.from(new Set([...prev, ...ids])));
                      }}
                    >
                      Select all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.subtopics.map((st) => {
                      const subtopicId = `${section.key}|${st.key}`;
                      const count = subtopicCounts[subtopicId] ?? 0;
                      const active = selectedSubtopics.includes(subtopicId);
                      return (
                        <button
                          key={subtopicId}
                          type="button"
                          onClick={() => setSelectedSubtopics(p => active ? p.filter(id => id !== subtopicId) : [...p, subtopicId])}
                          className={cn(
                            'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-xs font-bold transition-all',
                            active
                              ? 'bg-white shadow-sm'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          )}
                          style={{ borderColor: active ? section.color : undefined }}
                        >
                          <span className={cn("max-w-[180px] truncate", active && "text-slate-800")}>{st.name}</span>
                          <span className={cn('text-xs font-black', active ? 'text-primary' : 'text-slate-200')} style={{ color: active ? section.color : undefined }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Card */}
        <div className="mt-16 p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: themeColor }} />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-8">
              <div>
                <h3 className="text-2xl font-serif font-bold mb-1">Session Summary</h3>
                <p className="text-slate-400 text-sm">Review focus areas and generate questions</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-bold" style={{ color: themeColor }}>
                  ~{Object.entries(subtopicCounts).reduce((sum, [id, count]) => {
                    if (selectedSubtopics.length === 0) return sum + count;
                    return selectedSubtopics.includes(id) ? sum + count : sum;
                  }, 0)}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Questions</p>
              </div>
            </div>
            <Button 
               onClick={startPractice} 
               className="w-full py-7 rounded-2xl text-white font-black text-lg shadow-xl transition-all active:scale-[0.98] border-0"
               style={{ backgroundColor: themeColor }}
            >
              Generate Practice Session
            </Button>
          </div>
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

