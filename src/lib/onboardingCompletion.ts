import { is11Plus } from '@/lib/track-config';

const hasString = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const hasArray = (value: unknown) => Array.isArray(value) && value.length > 0;

export function hasCompletedElevenPlusOnboarding(onboarding?: Record<string, unknown>) {
  if (!onboarding) return false;
  return (
    hasString(onboarding.preferredName) &&
    hasString(onboarding.yearGroup) &&
    hasArray(onboarding.targetSchools) &&
    hasString(onboarding.examFormat) &&
    hasArray(onboarding.englishWeaknesses) &&
    hasArray(onboarding.mathsWeaknesses) &&
    hasString(onboarding.studyFrequency) &&
    hasString(onboarding.goalLevel) &&
    hasString(onboarding.focusPreference)
  );
}

export function hasCompletedGcseOnboarding(onboarding?: Record<string, unknown>) {
  if (!onboarding) return false;
  const requiredKeys = [
    'preferredName',
    'examBoard',
    'yearGroup',
    'studyTime',
    'currentGrade',
    'targetGrade',
  ];
  return requiredKeys.every((key) => hasString(onboarding[key]));
}

export function hasCompletedOnboardingForApp(
  onboarding?: Record<string, unknown>,
  profileTrack?: string | null,
) {
  const trackIs11Plus =
    is11Plus ||
    profileTrack === '11plus' ||
    profileTrack === 'eleven_plus' ||
    import.meta.env.VITE_APP_TRACK === '11PLUS';

  return trackIs11Plus
    ? hasCompletedElevenPlusOnboarding(onboarding)
    : hasCompletedGcseOnboarding(onboarding);
}
