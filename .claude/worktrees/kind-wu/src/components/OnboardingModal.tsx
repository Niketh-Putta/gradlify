import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { PremiumUpgradeButton } from '@/components/PremiumUpgradeButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check, Sparkles, X } from 'lucide-react';
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

type OnboardingAnswers = {
  preferredTrack?: string;
  preferredName?: string;
  examBoard?: string;
  yearGroup?: string;
  targetSchools?: string[];
  examFormat?: string;
  confidenceAreas?: string[];
  studyFrequency?: string;
  goalLevel?: string;
  focusPreference?: string;
  studyTime?: string;
  currentGrade?: string;
  targetGrade?: string;
};

type StepKey = keyof OnboardingAnswers;

type Step =
  | {
      kind: 'text';
      key: StepKey;
      title: string;
      description?: string;
      placeholder?: string;
      maxLength?: number;
    }
  | {
      kind: 'options';
      key: StepKey;
      title: string;
      description?: string;
      options: string[];
    }
  | {
      kind: 'multi-options';
      key: StepKey;
      title: string;
      description?: string;
      options: string[];
    }
  | {
      kind: 'search-multi';
      key: StepKey;
      title: string;
      description?: string;
      options: string[];
      placeholder?: string;
    };

const UNSURE = 'Unsure';

const TRACK_STEP: Step = {
  kind: 'options',
  key: 'preferredTrack',
  title: 'Which are you preparing for:',
  description: 'Choose your maths track.',
  options: ['11+ Maths', 'GCSE Maths'],
};

const ELEVEN_PLUS_SCHOOLS = [
  'Queen Elizabeth’s School, Barnet',
  'The Henrietta Barnett School',
  'St Olave’s Grammar School',
  'Latymer School',
  'Wilson’s School',
  'Sutton Grammar School',
  'Tiffin School',
  'Tiffin Girls’ School',
  'Nonsuch High School for Girls',
  'Wallington County Grammar School',
  'Wallington High School for Girls',
  'Kendrick School',
  'Reading School',
  'Colyton Grammar School',
  'King Edward VI Camp Hill School for Boys',
  'King Edward VI Camp Hill School for Girls',
];

const GCSE_STEPS: Step[] = [
  {
    kind: 'text',
    key: 'preferredName',
    title: 'What should Gradlify call you?',
    description: 'Your preferred name or nickname.',
    placeholder: 'e.g. Sam, Alex, Jess…',
    maxLength: 24,
  },
  {
    kind: 'options',
    key: 'examBoard',
    title: 'Which Maths exam board do you do?',
    description: 'Pick the one you’re currently studying for.',
    options: ['Edexcel', 'AQA', 'OCR', 'IGCSE', UNSURE],
  },
  {
    kind: 'options',
    key: 'yearGroup',
    title: 'What year group are you in?',
    description: 'This helps tailor difficulty and pacing.',
    options: ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13', 'Teacher', UNSURE],
  },
  {
    kind: 'options',
    key: 'studyTime',
    title: 'How long can you study Maths per day?',
    description: 'A realistic estimate is best.',
    options: ['10 min', '20 min', '30 min', '45 min', '60 min', '90+ min', UNSURE],
  },
  {
    kind: 'options',
    key: 'currentGrade',
    title: 'What grade are you at right now?',
    description: 'GCSE 1–9 (or choose Unsure).',
    options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'U', UNSURE],
  },
  {
    kind: 'options',
    key: 'targetGrade',
    title: 'What grade are you aiming for?',
    description: 'Pick your goal grade.',
    options: ['4', '5', '6', '7', '8', '9', UNSURE],
  },
];

const ELEVEN_PLUS_STEPS: Step[] = [
  {
    kind: 'text',
    key: 'preferredName',
    title: 'What should Gradlify call you?',
    description: 'Your preferred name or nickname.',
    placeholder: 'e.g. Sam, Alex, Jess…',
    maxLength: 24,
  },
  {
    kind: 'options',
    key: 'yearGroup',
    title: 'What year are you currently in?',
    description: 'If a parent is filling this out, choose the child’s year group.',
    options: ['Year 4', 'Year 5', 'Year 6', 'Teacher', 'Parent', UNSURE],
  },
  {
    kind: 'search-multi',
    key: 'targetSchools',
    title: 'Which schools are you preparing for?',
    description: 'You can select more than one.',
    options: ELEVEN_PLUS_SCHOOLS,
    placeholder: 'Search schools...',
  },
  {
    kind: 'options',
    key: 'examFormat',
    title: 'Do you know which exam board your schools use?',
    options: ['GL Assessment', 'CEM', 'Not sure'],
  },
  {
    kind: 'multi-options',
    key: 'confidenceAreas',
    title: 'Which areas feel hardest right now?',
    description: 'Select any that apply.',
    options: [
      'Arithmetic speed',
      'Fractions & percentages',
      'Word problems',
      'Angles & geometry',
      'Data & probability',
      'Multi-step reasoning',
    ],
  },
  {
    kind: 'options',
    key: 'studyFrequency',
    title: 'How often do you plan to practise?',
    options: [
      '1 time per week',
      '2 times per week',
      '3 times per week',
      '4 times per week',
      '5 times per week',
      '6 times per week',
      '7 times per week',
    ],
  },
  {
    kind: 'options',
    key: 'goalLevel',
    title: 'What level are you aiming for?',
    options: ['Just pass', 'Strong performance', 'Top 10%', 'Competitive selective score'],
  },
  {
    kind: 'options',
    key: 'focusPreference',
    title: 'What do you want to improve most right now?',
    options: ['Speed', 'Accuracy', 'Both equally'],
  },
];

interface OnboardingModalProps {
  isOpen: boolean;
  userId: string;
  tier?: string;
  premiumTrack?: 'gcse' | '11plus' | 'eleven_plus' | null;
  founderTrack?: 'competitor' | 'founder' | null;
  initialAnswers?: Partial<OnboardingAnswers>;
  onCompleted: () => void;
}

type Phase = 'questions' | 'generating' | 'upsell';

const GENERATING_TOTAL_MS = 9000;
const GCSE_GENERATING_CHECKLIST: string[] = [
  "Analysing your maths strengths and weaknesses",
  "Reviewing your current and target grade",
  "Mapping topics to your exam board specification",
  "Prioritising the highest-impact subtopics",
  "Building a personalised revision schedule",
  "Generating practice recommendations and next steps",
];

const ELEVEN_PLUS_GENERATING_CHECKLIST: string[] = [
  "Analysing your 11+ profile and target schools",
  "Mapping likely exam format (GL/CEM) coverage",
  "Prioritising arithmetic, reasoning, and word-problem gaps",
  "Building a weekly 11+ practice plan",
  "Preparing sprint-ready mock and challenge focus",
  "Generating your next best 11+ actions",
];

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function OnboardingModal({ isOpen, userId, tier, premiumTrack, founderTrack, initialAnswers, onCompleted }: OnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({ ...(initialAnswers || {}) });
  const [schoolQuery, setSchoolQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>('questions');
  const [generatingChecklist, setGeneratingChecklist] = useState<string[]>([]);
  const [generatingCheckedCount, setGeneratingCheckedCount] = useState(0);
  const sprintCopy = getSprintUpgradeCopy();

  // Keep the dialog open through the generating/upsell phases even if the profile
  // updates in realtime (e.g. onboarding_completed_at gets set).
  const dialogOpen = isOpen || phase === 'generating' || phase === 'upsell';

  const selectedTrackLabel = answers.preferredTrack;
  const steps = useMemo<Step[]>(
    () => [TRACK_STEP, ...(selectedTrackLabel === '11+ Maths' ? ELEVEN_PLUS_STEPS : GCSE_STEPS)],
    [selectedTrackLabel]
  );
  const step = steps[stepIndex];
  const selected = answers[step.key];
  const isLast = stepIndex === steps.length - 1;
  const selectedTrack = answers.preferredTrack === 'GCSE Maths' ? 'gcse' : '11plus';
  const normalizedPremiumTrack = premiumTrack === 'eleven_plus' ? '11plus' : premiumTrack ?? null;
  const hasPremiumForSelectedTrack = tier === 'premium' && (
    normalizedPremiumTrack ? normalizedPremiumTrack === selectedTrack : selectedTrack === 'gcse'
  );

  const canContinue = useMemo(() => {
    if (step.kind === 'text') return (typeof selected === 'string' ? selected.trim() : '').length > 0;
    if (step.kind === 'multi-options' || step.kind === 'search-multi') return Array.isArray(selected) && selected.length > 0;
    return Boolean(selected);
  }, [selected, step]);

  const progressValue = useMemo(() => ((stepIndex + 1) / steps.length) * 100, [stepIndex]);

  const generatingProgress = useMemo(() => {
    if (generatingChecklist.length <= 0) return 0;
    return Math.min(1, Math.max(0, generatingCheckedCount / generatingChecklist.length));
  }, [generatingChecklist.length, generatingCheckedCount]);

  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dialogOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
    setSchoolQuery('');
    setPhase('questions');
  }, [isOpen]);

  useEffect(() => {
    setSchoolQuery('');
  }, [stepIndex]);

  useEffect(() => {
    if (stepIndex > steps.length - 1) {
      setStepIndex(Math.max(0, steps.length - 1));
    }
  }, [stepIndex, steps.length]);

  useEffect(() => {
    if (phase !== 'generating') return;

    const checklist = selectedTrack === '11plus' ? ELEVEN_PLUS_GENERATING_CHECKLIST : GCSE_GENERATING_CHECKLIST;
    const items = shuffle(checklist).slice(0, 6);
    setGeneratingChecklist(items);
    setGeneratingCheckedCount(0);

    // Make the checkmarks feel more like "real" AI work: some steps tick quickly,
    // others pause longer, while still finishing within the overall generating window.
    const timeouts: number[] = [];
    const count = items.length;
    const targetSum = Math.floor(GENERATING_TOTAL_MS * 0.78);
    const minDelta = 260;

    const baseWeights = Array.from({ length: count }, (_, i) => 0.75 + i * 0.22);
    const jittered = baseWeights.map((w) => w * (0.75 + Math.random() * 0.6));
    const sumWeights = jittered.reduce((a, b) => a + b, 0);

    let deltas = jittered.map((w) => Math.round((w / sumWeights) * targetSum));
    deltas = deltas.map((d) => Math.max(minDelta, d));

    let diff = targetSum - deltas.reduce((a, b) => a + b, 0);
    let guard = 0;
    while (diff !== 0 && guard < 800) {
      guard += 1;
      const idx = Math.floor(Math.random() * deltas.length);
      const step = Math.sign(diff) * Math.min(Math.abs(diff), 60);
      const next = deltas[idx] + step;
      if (next >= minDelta) {
        deltas[idx] = next;
        diff -= step;
      }
    }

    let elapsed = 0;
    for (let i = 0; i < count; i += 1) {
      elapsed += deltas[i];
      timeouts.push(
        window.setTimeout(() => {
          setGeneratingCheckedCount((prev) => Math.max(prev, i + 1));
        }, elapsed)
      );
    }

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [phase, selectedTrack]);

  const choose = (value: string) => {
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
  };

  const toggleMulti = (value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[step.key]) ? (prev[step.key] as string[]) : [];
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [step.key]: next };
    });
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const goNext = () => {
    if (!canContinue) return;
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const handleFinish = async () => {
    if (!canContinue) return;
    setSaving(true);
    setPhase('generating');
    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, GENERATING_TOTAL_MS));

      const payload = {
        onboarding: answers,
        onboarding_completed_at: new Date().toISOString(),
        track: selectedTrack,
      };

      const savePromise = supabase
        .from('profiles')
        .update(payload as never)
        .eq('user_id', userId);

      const [{ error }] = await Promise.all([savePromise, minDelay]);

      if (error) throw error;

      if (hasPremiumForSelectedTrack || founderTrack === 'founder') {
        toast.success('All set! Your study plan is ready.');
        setPhase('questions');
        setStepIndex(0);
        onCompleted();
        return;
      }

      // Non-premium users: show paywall/upsell after generating.
      setPhase('upsell');
    } catch (err) {
      console.error('Onboarding save failed:', err);
      toast.error('Could not save your answers. Please try again.');
      setPhase('questions');
    } finally {
      setSaving(false);
    }
  };

  const dismissUpsell = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Onboarding is already considered complete once the questions are finished.
      // Keep this idempotent in case onboarding_completed_at wasn't set for some reason.
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() } as never)
        .eq('user_id', userId);

      if (error) throw error;
      setPhase('questions');
      setStepIndex(0);
      onCompleted();
    } catch (err) {
      console.error('Onboarding completion failed:', err);
      toast.error('Could not finish setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isUpsell = phase === 'upsell';
  const premiumBenefits = selectedTrack === '11plus'
    ? [
        { title: 'Unlimited 11+ mock exams', desc: 'for sustained exam practice' },
        { title: 'Unlimited 11+ challenge sessions', desc: 'to build speed and confidence' },
        { title: 'Targeted 11+ weak-area drills', desc: 'based on your hardest topics' },
        { title: 'School-style question coverage', desc: 'across key GL/CEM formats' },
        { title: 'Sprint leaderboard advantage', desc: 'more attempts means more scoring chances' },
        { title: 'Clear readiness tracking', desc: 'so you know what to fix next' },
        { title: 'Structured weekly study plan', desc: 'aligned to your 11+ goals' },
        { title: 'Priority access to new 11+ tools', desc: 'as Gradlify keeps improving' },
      ]
    : [
        { title: 'Real exam-style mocks', desc: 'with timed conditions' },
        { title: "Know what’s holding you back", desc: 'with targeted insights' },
        { title: 'A daily revision plan', desc: 'focused on weak areas' },
        { title: 'Topic-by-topic breakdown', desc: 'to fix your weaknesses' },
        { title: "Know when you’re exam-ready", desc: 'and what to do next' },
        { title: 'Exam-ready notes', desc: 'with visual memory cues' },
        { title: 'Performance analytics', desc: 'to track real progress' },
        { title: 'Early access to new tools', desc: 'as Gradlify improves' },
      ];

  return (
    <DialogPrimitive.Root open={dialogOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4',
            isUpsell ? 'max-w-2xl sm:max-w-3xl' : 'max-w-lg',
            isUpsell ? 'p-0' : 'p-4 sm:p-6',
            'border bg-background shadow-lg rounded-2xl sm:w-full',
            isUpsell ? 'h-[min(760px,92dvh)] overflow-hidden' : 'max-h-[90vh] overflow-y-auto overflow-x-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
          // Make it unremovable: no outside click / escape close.
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {phase === 'questions' && (
            <div key="questions" className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <DialogTitle className="text-xl sm:text-2xl font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent">
                      Let’s set up your study plan
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Answer a few quick questions to personalise recommendations.
                    </DialogDescription>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={progressValue} className="h-2" />
                </div>
              </DialogHeader>

              <div className="mt-4">
                <div className="text-base sm:text-lg font-semibold text-foreground">{step.title}</div>
                {step.description ? (
                  <div className="mt-1 text-sm text-muted-foreground">{step.description}</div>
                ) : null}

                {step.kind === 'text' ? (
                  <div className="mt-4">
                    <Input
                      value={typeof selected === 'string' ? selected : ''}
                      onChange={(e) => choose(e.target.value)}
                      placeholder={step.placeholder}
                      maxLength={step.maxLength}
                      autoFocus
                      disabled={saving}
                      className="h-12"
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      This helps us personalise your experience.
                    </div>
                  </div>
                ) : step.kind === 'options' ? (
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {step.options.map((opt) => {
                      const active = opt === selected;
                      const isTrackStep = step.key === 'preferredTrack';
                      const isElevenPlusOption = isTrackStep && opt === '11+ Maths';
                      return (
                        <Button
                          key={opt}
                          type="button"
                          variant={active ? 'default' : 'outline'}
                          className={
                            active
                              ? 'justify-start bg-gradient-primary text-primary-foreground border-0 shadow-glow'
                              : 'justify-start'
                          }
                          onClick={() => choose(opt)}
                          disabled={saving}
                        >
                          <span className="flex flex-col items-start gap-0.5 text-left">
                            <span>{opt}</span>
                            {isElevenPlusOption ? (
                              <span className={cn(
                                'text-[11px] font-medium',
                                active ? 'text-primary-foreground/90' : 'text-primary'
                              )}>
                                Sprint with cash prizes of £100 starting soon!!
                              </span>
                            ) : null}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : step.kind === 'multi-options' ? (
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {step.options.map((opt) => {
                      const selectedValues = Array.isArray(selected) ? selected : [];
                      const active = selectedValues.includes(opt);
                      return (
                        <Button
                          key={opt}
                          type="button"
                          variant={active ? 'default' : 'outline'}
                          className={
                            active
                              ? 'justify-start bg-gradient-primary text-primary-foreground border-0 shadow-glow'
                              : 'justify-start'
                          }
                          onClick={() => toggleMulti(opt)}
                          disabled={saving}
                        >
                          {opt}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Input
                      value={schoolQuery}
                      onChange={(e) => setSchoolQuery(e.target.value)}
                      placeholder={step.placeholder || 'Search...'}
                      disabled={saving}
                      className="h-11"
                    />

                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(selected) ? selected : []).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleMulti(item)}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          disabled={saving}
                        >
                          {item}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-background/80 p-2">
                      {step.options
                        .filter((opt) => opt.toLowerCase().includes(schoolQuery.toLowerCase()))
                        .filter((opt) => !(Array.isArray(selected) ? selected : []).includes(opt))
                        .map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60"
                            onClick={() => toggleMulti(opt)}
                            disabled={saving}
                          >
                            {opt}
                          </button>
                        ))}
                      {step.options.filter((opt) => opt.toLowerCase().includes(schoolQuery.toLowerCase())).length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No schools found.</div>
                      ) : null}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <Button type="button" variant="ghost" onClick={goBack} disabled={saving || stepIndex === 0}>
                    Back
                  </Button>

                  {isLast ? (
                    <Button type="button" onClick={handleFinish} disabled={saving || !canContinue}>
                      {saving ? 'Saving…' : 'Finish'}
                    </Button>
                  ) : (
                    <Button type="button" onClick={goNext} disabled={saving || !canContinue}>
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === 'generating' && (
            <div key="generating" className="py-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div className="text-sm font-medium text-foreground">
                      {AI_FEATURE_ENABLED ? 'Gradlify AI' : 'Gradlify'}
                    </div>
                  </div>
                  <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">
                    Generating your personalised maths study recommendations
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {AI_FEATURE_ENABLED
                      ? 'Gradlify AI is analysing your profile and building your next steps.'
                      : 'We are analysing your profile and building your next steps.'}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-6">
                <div className="relative h-20 w-20 shrink-0">
                  <div
                    className="absolute inset-0 rounded-full bg-gradient-gradlify opacity-25 blur-md"
                    style={{ animation: 'aiGlow 2.4s ease-in-out infinite' }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ animation: 'aiSpin 1.6s linear infinite' }}
                    aria-hidden="true"
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 90deg, hsl(var(--primary)) 0deg, rgba(0,0,0,0) 140deg, hsl(var(--primary)) 260deg, rgba(0,0,0,0) 360deg)',
                        opacity: 0.35,
                      }}
                    />
                  </div>

                  <svg className="relative h-full w-full" viewBox="0 0 100 100" aria-label="Progress">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeOpacity="0.35"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={(1 - generatingProgress) * 2 * Math.PI * 42}
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 420ms ease' }}
                    />
                  </svg>

                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ animation: 'aiOrbit 1.9s ease-in-out infinite' }}
                    aria-hidden="true"
                  >
                    <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary shadow-glow" />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {generatingChecklist.map((text, idx) => {
                    const done = idx < generatingCheckedCount;
                    return (
                      <div
                        key={`${text}-${idx}`}
                        className={cn(
                          'flex items-center gap-3 text-sm',
                          done ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full border',
                            done ? 'bg-primary/10 border-primary/20' : 'bg-muted/40 border-border/40'
                          )}
                          aria-hidden="true"
                        >
                          {done ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 animate-pulse" />
                          )}
                        </span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <style>{`
                @keyframes aiSpin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }

                @keyframes aiOrbit {
                  0% { transform: rotate(0deg); opacity: 0.6; }
                  50% { opacity: 1; }
                  100% { transform: rotate(360deg); opacity: 0.6; }
                }

                @keyframes aiGlow {
                  0% { opacity: 0.16; transform: scale(0.96); }
                  50% { opacity: 0.34; transform: scale(1.04); }
                  100% { opacity: 0.16; transform: scale(0.96); }
                }
              `}</style>
            </div>
          )}

          {phase === 'upsell' && (
            <div key="upsell" className="h-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="relative h-full overflow-y-auto overscroll-contain rounded-2xl bg-gradient-card">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at 18% 20%, rgba(110, 129, 255, 0.18) 0%, rgba(110, 129, 255, 0) 45%), radial-gradient(circle at 82% 32%, rgba(167, 97, 255, 0.14) 0%, rgba(167, 97, 255, 0) 52%), radial-gradient(circle at 50% 85%, rgba(110, 129, 255, 0.12) 0%, rgba(110, 129, 255, 0) 55%)',
                  }}
                  aria-hidden="true"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={dismissUpsell}
                  aria-label="Close"
                  className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="relative min-h-full p-3 sm:p-7 flex flex-col">
                  <div className="flex items-start justify-between gap-3 sm:gap-6">
                    <div className="pr-20 sm:pr-40">
                      <DialogTitle className="text-xl sm:text-4xl font-bold tracking-tight text-primary leading-tight">
                        {selectedTrack === '11plus'
                          ? "Boost your 11+ performance"
                          : sprintCopy.isActive
                            ? "Stay competitive this sprint"
                            : "Boost your exam grades"}
                        <br />
                        with Gradlify Premium
                      </DialogTitle>
                      <DialogDescription className="mt-1.5 text-xs sm:text-base text-muted-foreground">
                        {selectedTrack === '11plus'
                          ? 'Your 11+ recommendations are ready. Unlock Premium to action them with unlimited practice.'
                          : AI_FEATURE_ENABLED
                            ? 'Gradlify AI has generated your maths AI study recommendations.'
                            : 'Gradlify has generated your maths study recommendations.'}
                      </DialogDescription>
                    </div>

                    <div
                      className="absolute right-3 top-3 sm:right-6 sm:top-6 pointer-events-none select-none"
                      aria-hidden="true"
                    >
                      <div className="relative overflow-hidden rounded-2xl">
                        <img
                          src="/rocket.png"
                          alt=""
                          className="h-14 w-14 sm:h-36 sm:w-36 object-contain opacity-95"
                        />
                        {/* Fade edges so it blends into the header */}
                        <div className="absolute inset-0 bg-gradient-to-l from-background/40 via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/25 via-transparent to-transparent" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-primary/10 border border-border/40 p-2 sm:p-5 flex flex-col">
                    <div className="pr-1">
                      <div className="text-xs sm:text-sm font-semibold text-foreground">
                        {selectedTrack === '11plus' ? 'Your 11+ premium advantages:' : sprintCopy.listTitle}
                      </div>

                      <div className="mt-2 flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-foreground">
                        <span
                          className="mt-0.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20"
                          aria-hidden="true"
                        >
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </span>
                        <div className="font-medium leading-tight">
                          {selectedTrack === '11plus'
                            ? 'Unlimited 11+ practice tailored to your selected goals'
                            : AI_FEATURE_ENABLED
                              ? 'Unlimited AI practice tailored to your exam board'
                              : 'Unlimited practice tailored to your exam board'}
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {premiumBenefits.map((f) => (
                          <div
                            key={f.title}
                            className="flex flex-row items-start gap-2 sm:gap-3 rounded-xl border border-border/40 bg-background/70 p-2 sm:p-3 w-full"
                          >
                            <span
                              className="mt-0.5 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shrink-0"
                              aria-hidden="true"
                            >
                              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                            </span>
                            <div className="min-w-0 w-full">
                              <div className="text-[11px] sm:text-sm font-semibold text-foreground leading-snug">{f.title}</div>
                              <div className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground leading-snug hidden sm:block">{f.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="sticky bottom-0 z-20 mt-2 shrink-0 bg-gradient-to-t from-background/90 via-background/65 to-transparent px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                      <div className="w-full flex justify-center">
                        <div className="w-full max-w-xs">
                          <PremiumUpgradeButton size="compact" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
