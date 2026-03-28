export type AppTrack = '11PLUS' | 'GCSE';

export const APP_TRACK: AppTrack = '11PLUS';

export const is11Plus = true;
export const isGCSE = false;

export function getAppTrackLabel() {
  return '11+';
}
