const PARTNER_REF_LABELS: Record<string, string> = {
  PRLC: 'Pinner Road Learning Centre',
  EPS: 'Eleven Plus Success',
  FRENCHIEMUMMY: 'The Frenchie Mummy',
  '11PLUSHUB': '11 Plus Hub',
  MTM: 'Mock Test Masters',
  MATHSAURUS: 'Mathsaurus',
  TDTUTORING: 'TD Tutoring',
  KINLEARNING: 'Kin Learning',
  GEEKSCHOOL: 'Geek School',
  HTC: 'Harrow Tuition Centre',
  HONESTMUM: 'Honest Mum',
  BABYONBOARD: 'A Baby on Board',
  TUTORS11: "Tutor's 11 Plus",
  WILLOW: 'Willow Plus Tuition',
  SLOUGHTUITION: 'Slough Tuition Centre',
};

export function getPartnerReferralLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return PARTNER_REF_LABELS[normalized] ?? null;
}

export function readStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem('gradlify:pendingReferral') ?? 'null');
    const code = typeof parsed?.code === 'string' ? parsed.code : '';
    return code.replace(/[^a-z0-9]/gi, '').toUpperCase() || null;
  } catch {
    return null;
  }
}
