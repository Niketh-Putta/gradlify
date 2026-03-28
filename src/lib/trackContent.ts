import { TOPIC_CONFIG } from "@/lib/topicConstants";
import { UserTrack } from "@/lib/track";

const TOPIC_NAMES = Object.fromEntries(
  (Object.entries(TOPIC_CONFIG) as [string, { name: string }][])
    .map(([key, config]) => [key, config.name])
);

const TRACK_TOPIC_NAME_OVERRIDES: Record<UserTrack, Record<string, string>> = {
  gcse: TOPIC_NAMES,
  '11plus': {
    number: 'Number & Arithmetic',
    algebra: 'Algebra & Problem Solving',
    ratio: 'Ratio & Proportion',
    geometry: 'Shape & Space',
    probability: 'Probability & Chance',
    statistics: 'Data & Statistics',
  },
};

const TRACK_COPY: Record<UserTrack, { newUserMessage: string; readinessLabel: string }> = {
  gcse: {
    newUserMessage: "Let's start your journey to GCSE success. Begin with some practice questions!",
    readinessLabel: 'Your readiness across all 6 GCSE Mathematics topics',
  },
  '11plus': {
    newUserMessage: "Let's start your journey to 11+ success. Begin with some practice questions!",
    readinessLabel: 'Your readiness across all 6 11+ Mathematics topics',
  },
};

export function getTrackCopy(track: UserTrack) {
  return TRACK_COPY[track] ?? TRACK_COPY.gcse;
}

export function getTopicLabel(track: UserTrack, topicKey: string) {
  return (
    TRACK_TOPIC_NAME_OVERRIDES[track]?.[topicKey] ??
    TOPIC_CONFIG[topicKey as keyof typeof TOPIC_CONFIG]?.name ??
    topicKey
  );
}
