type KeyFn<T> = (item: T) => string;

const shuffleInPlace = <T,>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const groupBy = <T,>(items: T[], keyFn: KeyFn<T>): Map<string, T[]> => {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = buckets.get(key);
    if (existing) {
      existing.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }
  return buckets;
};

const roundRobin = <T,>(buckets: Map<string, T[]>, targetCount?: number): T[] => {
  const keys = shuffleInPlace(Array.from(buckets.keys()));
  const active = [...keys];
  const result: T[] = [];

  let cursor = 0;
  while (active.length > 0 && (targetCount == null || result.length < targetCount)) {
    const idx = cursor % active.length;
    const key = active[idx];
    const bucket = buckets.get(key);
    const next = bucket?.shift();
    if (next != null) result.push(next);
    if (!bucket || bucket.length === 0) {
      active.splice(idx, 1);
    } else {
      cursor += 1;
    }
  }

  return result;
};

const roundRobinWithCap = <T,>(
  buckets: Map<string, T[]>,
  targetCount: number,
  maxPerBucket: number
): T[] => {
  const keys = shuffleInPlace(Array.from(buckets.keys()));
  const active = [...keys];
  const result: T[] = [];
  const counts = new Map<string, number>();

  let cursor = 0;
  while (active.length > 0 && result.length < targetCount) {
    const idx = cursor % active.length;
    const key = active[idx];
    const bucket = buckets.get(key);
    const taken = counts.get(key) ?? 0;

    if (!bucket || bucket.length === 0) {
      active.splice(idx, 1);
      continue;
    }

    if (taken >= maxPerBucket && active.length > 1) {
      cursor += 1;
      continue;
    }

    const next = bucket.shift();
    if (next != null) {
      result.push(next);
      counts.set(key, taken + 1);
    }

    if (bucket.length === 0) {
      active.splice(idx, 1);
    } else {
      cursor += 1;
    }
  }

  return result;
};

export const buildBalancedMix = <T,>(
  items: T[],
  targetCount: number,
  topicKey: KeyFn<T>,
  subtopicKey?: KeyFn<T>
): T[] => {
  if (items.length === 0) return [];

  const topicBuckets = groupBy(items, topicKey);
  const perTopicOrdered = new Map<string, T[]>();

  for (const [topic, topicItems] of topicBuckets.entries()) {
    const bucketKey = subtopicKey
      ? (item: T) => `${topic}::${subtopicKey(item)}`
      : () => topic;
    const subBuckets = groupBy(topicItems, bucketKey);
    for (const bucket of subBuckets.values()) {
      shuffleInPlace(bucket);
    }
    perTopicOrdered.set(topic, roundRobin(subBuckets));
  }

  const cappedTarget = Math.min(targetCount, items.length);
  const topicMax = Math.ceil(cappedTarget / perTopicOrdered.size);

  return roundRobinWithCap(perTopicOrdered, cappedTarget, topicMax);
};
