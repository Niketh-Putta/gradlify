import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { LogoMark } from '@/components/LogoMark';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ArrowRight, Check, ChevronDown, Loader2, Sparkles, X } from 'lucide-react';
import { AI_FEATURE_ENABLED, EXAM_READINESS_ENABLED, ULTRA_PLAN_ENABLED } from '@/lib/featureFlags';
import { is11Plus as is11PlusApp } from '@/lib/track-config';
import { UK_SECONDARY_SCHOOLS } from '@/lib/schools';
import { useNavigate } from 'react-router-dom';
import { startPremiumCheckout } from '@/lib/checkout';
import { PREMIUM_PRICING, ULTRA_PRICING, formatGbp } from '@/lib/pricing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type OnboardingAnswers = {
  preferredTrack?: string;
  preferredName?: string;
  examBoard?: string;
  yearGroup?: string;
  targetSchools?: string[];
  examFormat?: string;
  englishWeaknesses?: string[];
  mathsWeaknesses?: string[];
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

const ELEVEN_PLUS_SCHOOLS = UK_SECONDARY_SCHOOLS;

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
    description: 'GCSE 1-9 (or choose Unsure).',
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
    options: ['Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Teacher', 'Parent', UNSURE],
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
    options: ['GL', 'CEM', 'ISEB', 'Unsure'],
  },
  {
    kind: 'multi-options',
    key: 'englishWeaknesses',
    title: 'Which English areas feel hardest?',
    description: 'Select any that apply.',
    options: [
      'Comprehension',
      'SPaG',
      'Vocabulary',
      'Creative Writing',
    ],
  },
  {
    kind: 'multi-options',
    key: 'mathsWeaknesses',
    title: 'Which Maths areas feel hardest?',
    description: 'Select any that apply.',
    options: [
      'Arithmetic',
      'Fractions & Percentages',
      'Word Problems',
      'Geometry',
      'Data & Probability',
      'Non-Verbal Reasoning',
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
  continuePath?: string;
  skipUpsell?: boolean;
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

type CheckoutPlan = 'lifetime' | 'ultra' | 'ultra_annual';

function PlanCheckoutButton({
  planType,
  className,
  children,
}: {
  planType: 'premium' | 'ultra';
  className?: string;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      if (planType === 'ultra') {
        await startPremiumCheckout('ultra');
      } else {
        await startPremiumCheckout('lifetime');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      const message = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      disabled={loading}
      onClick={handleCheckout}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting checkout...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function OnboardingModal({ isOpen, userId, tier, premiumTrack, founderTrack, initialAnswers, onCompleted, continuePath = '/home', skipUpsell = false }: OnboardingModalProps) {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({ ...(initialAnswers || {}) });
  const [schoolQuery, setSchoolQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>('questions');
  const [generatingChecklist, setGeneratingChecklist] = useState<string[]>([]);
  const [generatingCheckedCount, setGeneratingCheckedCount] = useState(0);

  // Keep the dialog open through the generating/upsell phases even if the profile
  // updates in realtime (e.g. onboarding_completed_at gets set).
  const dialogOpen = isOpen || phase === 'generating' || phase === 'upsell';

  const is11Plus = is11PlusApp || import.meta.env.VITE_APP_TRACK === '11PLUS';
  const steps = useMemo<Step[]>(
    () => (is11Plus ? ELEVEN_PLUS_STEPS : GCSE_STEPS),
    [is11Plus]
  );
  const step = steps[stepIndex];
  const selected = answers[step.key];
  const isLast = stepIndex === steps.length - 1;
  const selectedTrack = is11Plus ? '11plus' : 'gcse';
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

      toast.success('All set! Your study plan is ready.');
      if (skipUpsell) {
        setPhase('questions');
        setStepIndex(0);
        onCompleted();
        navigate(continuePath, { replace: true });
        return;
      }
      setPhase('upsell');
      return;
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
      navigate(continuePath, { replace: true });
    } catch (err) {
      console.error('Onboarding completion failed:', err);
      toast.error('Could not finish setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isUpsell = phase === 'upsell';
  const handleQuestionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    if (saving || !canContinue) return;

    event.preventDefault();
    if (isLast) {
      void handleFinish();
    } else {
      goNext();
    }
  };

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
            isUpsell ? 'max-w-5xl' : 'max-w-lg',
            isUpsell ? 'p-0' : 'p-4 sm:p-6',
            'border bg-background shadow-lg sm:w-full',
            isUpsell ? 'h-[min(680px,96dvh)] overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem]' : 'max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl',
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
            <div
              key="questions"
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
              onKeyDown={handleQuestionKeyDown}
            >
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
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {schoolQuery.trim() ? (
                            <button
                              type="button"
                              className="w-full text-left font-medium text-primary hover:underline"
                              onClick={() => {
                                toggleMulti(schoolQuery.trim());
                                setSchoolQuery('');
                              }}
                              disabled={saving}
                            >
                              Add custom school: "{schoolQuery.trim()}"
                            </button>
                          ) : (
                            "No schools found."
                          )}
                        </div>
                      ) : (
                        schoolQuery.trim() && 
                        !step.options.some(opt => opt.toLowerCase() === schoolQuery.trim().toLowerCase()) && 
                        !(Array.isArray(selected) ? selected : []).some(s => s.toLowerCase() === schoolQuery.trim().toLowerCase()) ? (
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted/60"
                            onClick={() => {
                              toggleMulti(schoolQuery.trim());
                              setSchoolQuery('');
                            }}
                            disabled={saving}
                          >
                            + Add custom: "{schoolQuery.trim()}"
                          </button>
                        ) : null
                      )}
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
                    Generating your personalised maths and english study recommendations
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
              <div className="relative h-full overflow-hidden rounded-[1.5rem] bg-[#fffdf7] sm:rounded-[1.75rem]">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 14% 12%, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0) 38%), radial-gradient(circle at 90% 22%, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0) 42%), linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,253,247,0))',
                  }}
                  aria-hidden="true"
                />

                <div className="relative flex h-full min-h-0 flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:p-6">
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <LogoMark size={28} variant="light" />
                          <span className="text-base font-semibold text-slate-950">Gradlify</span>
                        </div>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                          Trusted by hundreds
                        </span>
                      </div>
                      <DialogTitle className="mt-3 max-w-2xl font-gradlify text-xl font-medium leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
                        Your personalised study plan is ready
                      </DialogTitle>
                      <DialogDescription className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
                        Unlock more mocks, deeper analytics, higher limits, and live support when you are ready.
                      </DialogDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={dismissUpsell}
                      disabled={saving}
                      className="h-8 shrink-0 self-start rounded-full px-3 text-xs font-medium text-blue-700 hover:bg-blue-50 hover:text-blue-800 sm:self-auto"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Continuing...
                        </>
                      ) : (
                        <>
                          Continue for now
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  <div className={cn("grid min-h-0 flex-1 gap-2 sm:gap-3 lg:gap-4", ULTRA_PLAN_ENABLED ? "grid-cols-2" : "grid-cols-1")}>
                    {ULTRA_PLAN_ENABLED && (
                    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] border border-amber-400/40 bg-[#0c0d14] p-2 text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:p-4">
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle at 84% 8%, rgba(126,34,206,0.28), transparent 34%), radial-gradient(circle at 12% 92%, rgba(245,158,11,0.18), transparent 38%)',
                        }}
                        aria-hidden="true"
                      />
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <h3 className="font-gradlify text-lg font-medium text-amber-200 sm:text-3xl">Ultra</h3>
                        <span className="rounded-full border border-amber-400/60 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-200 sm:px-3 sm:py-1.5 sm:text-xs">
                          1-to-1 Live
                        </span>
                      </div>

                      <div className="relative z-10 mt-5 sm:mt-6">
                        <div className="flex items-end gap-2">
                          <span className="font-gradlify text-3xl font-semibold text-white sm:text-5xl lg:text-6xl">£{ULTRA_PRICING.monthly}</span>
                          <span className="pb-1 text-[10px] font-medium text-amber-100/70 sm:pb-1.5 sm:text-base">/month</span>
                        </div>
                        <p className="mt-2 max-w-md text-[11px] font-medium leading-4 text-amber-50/80 sm:mt-3 sm:text-base sm:leading-6">
                          Everything in Premium <span className="text-amber-300">+</span> weekly live human tutoring.
                        </p>
                      </div>

                      <div className="relative z-10 mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                        {[
                          'All Premium features unlocked',
                          'Weekly live 1-to-1 tutoring sessions',
                          'Personalised Sprint Plans',
                          'Direct access to Founders & Tutors',
                        ].map((feature) => (
                          <div key={feature} className="flex items-start gap-1.5 text-[10px] font-medium text-stone-100 sm:gap-2.5 sm:text-sm">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-300 text-amber-300 sm:h-6 sm:w-6">
                              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </span>
                            <span className="leading-5 sm:leading-6">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <div className="relative z-10 mt-auto pt-4">
                        <PlanCheckoutButton
                          planType="ultra"
                          className="h-9 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] font-semibold text-slate-950 shadow-[0_14px_30px_rgba(245,158,11,0.22)] hover:from-amber-300 hover:to-orange-400 sm:h-11 sm:text-sm"
                        >
                          Start your Ultra trial
                          <ArrowRight className="h-4 w-4" />
                        </PlanCheckoutButton>
                        <p className="mt-2 text-center text-xs font-medium text-amber-100/55">Cancel anytime</p>
                      </div>
                    </section>
                    )}

                    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] border border-orange-400/70 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 p-2 text-white shadow-[0_18px_42px_rgba(248,113,22,0.18)] sm:p-4">
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <h3 className="font-gradlify text-lg font-medium sm:text-3xl">Premium</h3>
                        <span className="rounded-full border border-white/45 bg-white/10 px-2 py-1 text-[10px] font-medium sm:px-3 sm:py-1.5 sm:text-xs">
                          Best for exams
                        </span>
                      </div>

                      <div className="relative z-10 mt-5 sm:mt-6">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-gradlify text-3xl font-semibold text-white tabular-nums sm:text-5xl lg:text-6xl">
                            {formatGbp(PREMIUM_PRICING.lifetime)}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                            lifetime
                          </span>
                        </div>
                        <p className="mt-2 max-w-md text-[11px] font-medium leading-4 text-white/90 sm:mt-3 sm:text-base sm:leading-6">
                          More mocks, deeper analytics, higher limits — pay once, keep Premium forever.
                        </p>
                      </div>

                      <div className="relative z-10 mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                        {[
                          'Full timed mock exams',
                          EXAM_READINESS_ENABLED ? 'Deeper readiness analytics' : 'Detailed mock analytics',
                          'Higher explanation limits',
                          'Priority support',
                        ].map((feature) => (
                          <div key={feature} className="flex items-start gap-1.5 text-[10px] font-medium sm:gap-2.5 sm:text-sm">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white text-white sm:h-6 sm:w-6">
                              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </span>
                            <span className="leading-5 sm:leading-6">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <div className="relative z-10 mt-auto pt-4">
                        <PlanCheckoutButton
                          planType="premium"
                          className="h-9 w-full rounded-full bg-white text-[10px] font-semibold text-orange-700 shadow-[0_14px_30px_rgba(194,65,12,0.16)] hover:bg-white/92 sm:h-11 sm:text-sm"
                        >
                          Get Lifetime Premium · {formatGbp(PREMIUM_PRICING.lifetime)}
                          <ArrowRight className="h-4 w-4" />
                        </PlanCheckoutButton>
                      </div>
                    </section>
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
