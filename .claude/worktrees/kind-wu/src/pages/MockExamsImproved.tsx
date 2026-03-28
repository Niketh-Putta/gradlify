import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Timer, Brain, Clock, Lock, BookOpen, FileText } from "lucide-react";
import { useAppContext } from '@/hooks/useAppContext';
import { usePremium } from '@/hooks/usePremium';
import MockExamSessionNew from '@/components/exam/MockExamSessionNew';
import { cn } from '@/lib/utils';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

const topics = ['Number', 'Algebra', 'Ratio & Proportion', 'Geometry & Measures', 'Probability', 'Statistics'];

export default function MockExamsImproved() {
  const { user } = useAppContext();
  const { canStartMockExam, dailyMockUses, dailyMockLimit, isPremium } = usePremium();
  const [view, setView] = useState<'start' | 'exam'>('start');
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  
  // Form state
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedTiers, setSelectedTiers] = useState<string[]>(['foundation']);
  const [selectedCalculators, setSelectedCalculators] = useState<string[]>(['calculator']);
  const [length, setLength] = useState<number>(10);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');

  const canStartMock = () => {
    if (!user) {
      const guestUsage = parseInt(localStorage.getItem('guestMockUsage') || '0');
      return guestUsage < 1;
    }
    return canStartMockExam;
  };

  const handleStartExam = () => {
    if (!isPremium && length > 10) {
      setLength(10);
    }
    setShowSetupDialog(false);
    setView('exam');
  };

  if (view === 'exam') {
    return (
      <MockExamSessionNew
        onBack={() => setView('start')}
        settings={{
          tiers: selectedTiers,
          calculators: selectedCalculators,
          length,
          mode,
          topic: selectedTopic || undefined,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{user ? 'Mock Exams' : 'Trial Mock'}</h1>
        <p className="text-muted-foreground text-sm">
          {user
            ? AI_FEATURE_ENABLED
              ? 'Test your knowledge with AI-generated GCSE Maths questions'
              : 'Test your knowledge with GCSE Maths questions'
            : 'Try 1 free mock exam • Sign up for 2 daily mock exams'}
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="space-y-4">
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogTrigger asChild>
            <button className="group w-full text-left card-exam-glow rounded-2xl p-4 sm:p-6 transition-all hover:border-primary/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-lg transition-shadow">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-base font-semibold text-foreground">Mock Exam</h2>
                  </div>
                  <p className="text-sm mb-4 text-muted-foreground">Simulate real exam conditions with timed questions and performance analysis</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg gradient-bg-subtle-exam text-primary">Timed</span>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg gradient-bg-subtle-exam text-primary">Full analysis</span>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg gradient-bg-subtle-exam text-primary">
                      {AI_FEATURE_ENABLED ? 'AI grading' : 'Detailed grading'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </DialogTrigger>
          
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Mock Exam Setup
              </DialogTitle>
              <DialogDescription>
                Choose your exam settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {!canStartMock() && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium text-sm">{user ? 'Daily Limit Reached' : 'Trial Complete'}</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {user 
                      ? `You've used ${dailyMockUses} out of ${dailyMockLimit} mock exams today.`
                      : `Sign up to get 2 mock exams daily!`
                    }
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tier</Label>
                  <div className="space-y-2">
                    {['foundation', 'higher'].map((t) => (
                      <div key={t} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`tier-${t}`}
                          checked={selectedTiers.includes(t)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedTiers([...selectedTiers, t]);
                            else setSelectedTiers(selectedTiers.filter(x => x !== t));
                          }}
                        />
                        <Label htmlFor={`tier-${t}`} className="cursor-pointer font-normal text-sm capitalize">
                          {t}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Paper Type</Label>
                  <div className="space-y-2">
                    {['calculator', 'non-calculator'].map((c) => (
                      <div key={c} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`calc-${c}`}
                          checked={selectedCalculators.includes(c)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedCalculators([...selectedCalculators, c]);
                            else setSelectedCalculators(selectedCalculators.filter(x => x !== c));
                          }}
                        />
                        <Label htmlFor={`calc-${c}`} className="cursor-pointer font-normal text-sm capitalize">
                          {c.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Choose Exam Length</Label>
                <p className="text-xs text-muted-foreground mb-3">Select the number of questions for your mock exam. The timer is calculated from the selected questions.</p>
                <div className="space-y-2">
                  {[
                    { value: 10, label: "10 Questions", premium: false },
                    { value: 20, label: "20 Questions", premium: true },
                    { value: 30, label: "30 Questions", premium: true },
                    { value: 50, label: "Full Paper (50 Questions)", premium: true },
                  ].map((option) => {
                    const isSelected = length === option.value;
                    const isDisabled = option.premium && !isPremium;
                    
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setLength(option.value as any)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ease-out text-left",
                          "transform active:scale-[0.98]",
                          isSelected 
                            ? "border-primary bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/5 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]" 
                            : "border-border hover:border-primary/40 hover:bg-muted/50",
                          isDisabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                          isSelected 
                            ? "border-primary bg-primary scale-110" 
                            : "border-muted-foreground/40 bg-transparent"
                        )}>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white animate-scale-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm transition-colors duration-200",
                            isSelected ? "text-foreground" : "text-foreground/80"
                          )}>
                            {option.label}
                          </p>
                          {option.premium && !isPremium && (
                            <p className="text-xs text-muted-foreground">Premium only</p>
                          )}
                        </div>
                        {option.premium && !isPremium && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Premium
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <button 
                onClick={handleStartExam}
                disabled={!canStartMock() || selectedTiers.length === 0 || selectedCalculators.length === 0}
                className="btn-exam-primary w-full"
              >
                {canStartMock() ? 'Start Exam' : 'Limit Reached'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
