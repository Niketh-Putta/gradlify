import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { UserTrack, resolveUserTrack } from '@/lib/track';

export type OnboardingAnswers = {
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

const UNSURE = 'Unsure';

const EXAM_BOARDS = ['Edexcel', 'AQA', 'OCR', UNSURE] as const;
const YEAR_GROUPS = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13', 'Teacher', UNSURE] as const;
const STUDY_TIMES = ['10 min', '20 min', '30 min', '45 min', '60 min', '90+ min', UNSURE] as const;
const CURRENT_GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'U', UNSURE] as const;
const TARGET_GRADES = ['4', '5', '6', '7', '8', '9', UNSURE] as const;
const ELEVEN_PLUS_YEAR_GROUPS = ['Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Teacher', 'Parent', 'Unsure'] as const;
const ELEVEN_PLUS_EXAM_FORMATS = ['GL Assessment', 'CEM', 'Not sure'] as const;
const ELEVEN_PLUS_CONFIDENCE_AREAS = [
  'Arithmetic speed',
  'Fractions & percentages',
  'Word problems',
  'Angles & geometry',
  'Data & probability',
  'Multi-step reasoning',
] as const;
const ELEVEN_PLUS_STUDY_FREQUENCY = [
  '1 time per week',
  '2 times per week',
  '3 times per week',
  '4 times per week',
  '5 times per week',
  '6 times per week',
  '7 times per week',
] as const;
const ELEVEN_PLUS_GOAL_LEVELS = ['Just pass', 'Strong performance', 'Top 10%', 'Competitive selective score'] as const;
const ELEVEN_PLUS_FOCUS = ['Speed', 'Accuracy', 'Both equally'] as const;
const ELEVEN_PLUS_SCHOOLS = [
  "Queen Elizabeth's School, Barnet",
  'The Henrietta Barnett School',
  "St Olave's Grammar School",
  'Latymer School',
  "Wilson's School",
  'Sutton Grammar School',
  'Tiffin School',
  "Tiffin Girls' School",
  'Nonsuch High School for Girls',
  'Wallington County Grammar School',
  'Wallington High School for Girls',
  'Kendrick School',
  'Reading School',
  'Colyton Grammar School',
  'King Edward VI Camp Hill School for Boys',
  'King Edward VI Camp Hill School for Girls',
] as const;

interface EditOnboardingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialOnboarding?: Partial<OnboardingAnswers>;
  track?: UserTrack | null;
  onSaved?: () => void;
}

export function EditOnboardingDetailsModal({
  open,
  onOpenChange,
  userId,
  initialOnboarding,
  track,
  onSaved,
}: EditOnboardingDetailsModalProps) {
  const [saving, setSaving] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [elevenPlusPage, setElevenPlusPage] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<OnboardingAnswers>({ ...(initialOnboarding || {}) });
  const activeTrack = resolveUserTrack(track ?? null);
  const isElevenPlus = activeTrack === '11plus';

  useEffect(() => {
    if (!open) return;
    setDraft({ ...(initialOnboarding || {}) });
    setSchoolQuery('');
    setElevenPlusPage(1);
  }, [open, initialOnboarding]);

  const preferredNameValue = (draft.preferredName || '').trim();

  const canSave = useMemo(() => {
    if (saving) return false;
    if (isElevenPlus) {
      return Boolean(
        preferredNameValue.length > 0 ||
        draft.yearGroup ||
        draft.examFormat ||
        draft.studyFrequency ||
        draft.goalLevel ||
        draft.focusPreference ||
        (draft.targetSchools && draft.targetSchools.length > 0) ||
        (draft.confidenceAreas && draft.confidenceAreas.length > 0)
      );
    }
    return Boolean(
      preferredNameValue.length > 0 ||
      draft.examBoard ||
      draft.yearGroup ||
      draft.studyTime ||
      draft.currentGrade ||
      draft.targetGrade
    );
  }, [draft, isElevenPlus, preferredNameValue.length, saving]);

  const canContinueElevenPlusPage1 = useMemo(() => {
    return Boolean(
      draft.yearGroup ||
      draft.examFormat ||
      (draft.targetSchools && draft.targetSchools.length > 0) ||
      (draft.confidenceAreas && draft.confidenceAreas.length > 0)
    );
  }, [draft]);

  const canFinishElevenPlusPage2 = useMemo(() => {
    return Boolean(draft.studyFrequency || draft.goalLevel || draft.focusPreference);
  }, [draft.goalLevel, draft.focusPreference, draft.studyFrequency]);

  const updateDraft = (key: keyof OnboardingAnswers, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMultiValue = (key: 'targetSchools' | 'confidenceAreas', value: string) => {
    setDraft((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload: OnboardingAnswers = {
        ...draft,
        preferredName: preferredNameValue,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding: payload } as never)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Updated your study profile.');
      onOpenChange(false);
      onSaved?.();
      window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
    } catch (err) {
      console.error('Failed to update onboarding details:', err);
      toast.error('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
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
            'fixed left-[50%] top-[50%] z-50 w-[calc(100%-1.5rem)] max-w-2xl translate-x-[-50%] translate-y-[-50%]',
            'border bg-background shadow-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="p-4 sm:p-6 overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Edit your study profile</DialogTitle>
              <DialogDescription className="mt-1">
                {isElevenPlus
                  ? 'Update your 11+ starter answers. These are used to personalise your 11+ experience.'
                  : 'Update your GCSE starter answers. These are used to personalise your experience.'}
              </DialogDescription>
            </DialogHeader>

            {isElevenPlus && (
              <div className="mt-4 rounded-xl border border-border/60 bg-primary/5 px-3 py-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-primary">11+ starter answers</span>
                  <span className="text-muted-foreground">Step {elevenPlusPage} of 2</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted/60">
                  <div className={cn('h-full rounded-full bg-primary transition-all', elevenPlusPage === 1 ? 'w-1/2' : 'w-full')} />
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              {isElevenPlus ? (
                <>
                  {elevenPlusPage === 1 ? (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-2">
                        <Label htmlFor="elevenPlusPreferredName">Preferred name</Label>
                        <Input
                          id="elevenPlusPreferredName"
                          value={draft.preferredName || ''}
                          onChange={(e) => updateDraft('preferredName', e.target.value)}
                          placeholder="e.g. Sam"
                          maxLength={24}
                          disabled={saving}
                        />
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-3">
                        <div className="space-y-2">
                          <Label>Year group</Label>
                          <Select value={draft.yearGroup || ''} onValueChange={(v) => updateDraft('yearGroup', v)} disabled={saving}>
                            <SelectTrigger className="bg-card border-border/40">
                              <SelectValue placeholder="Select year group" />
                            </SelectTrigger>
                            <SelectContent>
                              {ELEVEN_PLUS_YEAR_GROUPS.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Exam format</Label>
                          <Select value={draft.examFormat || ''} onValueChange={(v) => updateDraft('examFormat', v)} disabled={saving}>
                            <SelectTrigger className="bg-card border-border/40">
                              <SelectValue placeholder="Select exam format" />
                            </SelectTrigger>
                            <SelectContent>
                              {ELEVEN_PLUS_EXAM_FORMATS.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-2">
                        <Label>Target schools</Label>
                        <Input
                          value={schoolQuery}
                          onChange={(e) => setSchoolQuery(e.target.value)}
                          placeholder="Search schools..."
                          disabled={saving}
                        />
                        <div className="flex flex-wrap gap-2">
                          {(draft.targetSchools || []).map((school) => (
                            <button
                              key={school}
                              type="button"
                              onClick={() => toggleMultiValue('targetSchools', school)}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                              disabled={saving}
                            >
                              {school}
                              <X className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                        <div className="max-h-36 overflow-y-auto rounded-lg border border-border/60 bg-background/80 p-2">
                          {ELEVEN_PLUS_SCHOOLS
                            .filter((opt) => opt.toLowerCase().includes(schoolQuery.toLowerCase()))
                            .filter((opt) => !(draft.targetSchools || []).includes(opt))
                            .map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleMultiValue('targetSchools', opt)}
                                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60"
                                disabled={saving}
                              >
                                {opt}
                              </button>
                            ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-2">
                        <Label>Confidence areas (select any)</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {ELEVEN_PLUS_CONFIDENCE_AREAS.map((area) => {
                            const active = (draft.confidenceAreas || []).includes(area);
                            return (
                              <Button
                                key={area}
                                type="button"
                                variant={active ? 'default' : 'outline'}
                                className={active ? 'justify-start bg-gradient-primary text-primary-foreground border-0' : 'justify-start'}
                                onClick={() => toggleMultiValue('confidenceAreas', area)}
                                disabled={saving}
                              >
                                {area}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-3">
                        <div className="space-y-2">
                          <Label>Study frequency</Label>
                          <Select value={draft.studyFrequency || ''} onValueChange={(v) => updateDraft('studyFrequency', v)} disabled={saving}>
                            <SelectTrigger className="bg-card border-border/40">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {ELEVEN_PLUS_STUDY_FREQUENCY.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Goal level</Label>
                          <Select value={draft.goalLevel || ''} onValueChange={(v) => updateDraft('goalLevel', v)} disabled={saving}>
                            <SelectTrigger className="bg-card border-border/40">
                              <SelectValue placeholder="Select goal level" />
                            </SelectTrigger>
                            <SelectContent>
                              {ELEVEN_PLUS_GOAL_LEVELS.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Focus preference</Label>
                          <Select value={draft.focusPreference || ''} onValueChange={(v) => updateDraft('focusPreference', v)} disabled={saving}>
                            <SelectTrigger className="bg-card border-border/40">
                              <SelectValue placeholder="Select focus" />
                            </SelectTrigger>
                            <SelectContent>
                              {ELEVEN_PLUS_FOCUS.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="preferredName">Preferred name</Label>
                    <Input
                      id="preferredName"
                      value={draft.preferredName || ''}
                      onChange={(e) => updateDraft('preferredName', e.target.value)}
                      placeholder="e.g. Sam"
                      maxLength={24}
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Exam board</Label>
                      <Select value={draft.examBoard || ''} onValueChange={(v) => updateDraft('examBoard', v)} disabled={saving}>
                        <SelectTrigger className="bg-card border-border/40">
                          <SelectValue placeholder="Select exam board" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXAM_BOARDS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Year group</Label>
                      <Select value={draft.yearGroup || ''} onValueChange={(v) => updateDraft('yearGroup', v)} disabled={saving}>
                        <SelectTrigger className="bg-card border-border/40">
                          <SelectValue placeholder="Select year group" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAR_GROUPS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Daily study time</Label>
                      <Select value={draft.studyTime || ''} onValueChange={(v) => updateDraft('studyTime', v)} disabled={saving}>
                        <SelectTrigger className="bg-card border-border/40">
                          <SelectValue placeholder="Select study time" />
                        </SelectTrigger>
                        <SelectContent>
                          {STUDY_TIMES.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Current grade</Label>
                        <Select value={draft.currentGrade || ''} onValueChange={(v) => updateDraft('currentGrade', v)} disabled={saving}>
                          <SelectTrigger className="bg-card border-border/40">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENT_GRADES.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Target grade</Label>
                        <Select value={draft.targetGrade || ''} onValueChange={(v) => updateDraft('targetGrade', v)} disabled={saving}>
                          <SelectTrigger className="bg-card border-border/40">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGET_GRADES.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="w-full sm:w-auto">
                Cancel
              </Button>
              {isElevenPlus && elevenPlusPage === 1 ? (
                <Button
                  type="button"
                  onClick={() => setElevenPlusPage(2)}
                  disabled={!canContinueElevenPlusPage1 || saving}
                  className="w-full sm:w-auto"
                >
                  Continue
                </Button>
              ) : (
                <>
                  {isElevenPlus && elevenPlusPage === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setElevenPlusPage(1)}
                      disabled={saving}
                      className="w-full sm:w-auto"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isElevenPlus && elevenPlusPage === 2 ? (!canSave || !canFinishElevenPlusPage2) : !canSave}
                    className="w-full sm:w-auto"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
