export function elevenPlusReadinessLabel(readiness: number) {
  if (readiness < 40) return 'Emerging';
  if (readiness < 60) return 'Developing';
  if (readiness < 75) return 'Strong';
  if (readiness < 85) return 'Competitive';
  return 'Selective-ready';
}

export function nextElevenPlusBand(readiness: number) {
  if (readiness < 40) return 'Developing';
  if (readiness < 60) return 'Strong';
  if (readiness < 75) return 'Competitive';
  if (readiness < 85) return 'Selective-ready';
  return 'Maintain Selective-ready';
}
