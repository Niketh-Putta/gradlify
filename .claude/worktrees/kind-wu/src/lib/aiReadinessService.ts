import { supabase } from '@/integrations/supabase/client';
import debounce from 'lodash.debounce';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

interface AIEstimateResult {
  after: number;
  reasoning?: string;
}

// Topic mapping: normalize various topic names to canonical format
const TOPIC_MAPPING: Record<string, string> = {
  'number': 'Number',
  'algebra': 'Algebra',
  'ratio and proportion': 'Ratio & Proportion',
  'ratio & proportion': 'Ratio & Proportion',
  'ratio': 'Ratio & Proportion',
  'geometry': 'Geometry',
  'geometry & measures': 'Geometry',
  'geometry and measures': 'Geometry',
  'probability': 'Probability',
  'statistics': 'Statistics',
};

function normalizeTopicName(topic: string): string {
  const normalized = TOPIC_MAPPING[topic.toLowerCase()];
  return normalized || topic;
}

async function callAIEstimator(userId: string, topic: string): Promise<AIEstimateResult> {
  if (!AI_FEATURE_ENABLED) {
    return { after: 0 };
  }
  try {
    const { data, error } = await supabase.functions.invoke('ai-estimate-readiness', {
      body: { user_id: userId, topic },
    });

    if (error) throw error;

    return data as AIEstimateResult;
  } catch (error) {
    console.error('AI estimator failed:', error);
    // Fallback: no change
    return { after: 0 };
  }
}

async function getCurrentTopicReadiness(userId: string, topic: string): Promise<number> {
  const { data } = await supabase
    .from('v_topic_readiness')
    .select('readiness')
    .eq('user_id', userId)
    .eq('topic', topic)
    .maybeSingle();

  return data?.readiness || 0;
}

async function logReadinessChange(
  topic: string,
  before: number,
  after: number,
  reason: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('log_readiness_change', {
      p_topic: topic,
      p_before: before,
      p_after: after,
      p_reason: reason,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to log readiness change:', error);
    return false;
  }
}

// Debounced update to handle rapid successive calls
const debouncedUpdate = debounce(
  async (userId: string, topic: string, reason: string) => {
    const normalizedTopic = normalizeTopicName(topic);
    const before = await getCurrentTopicReadiness(userId, normalizedTopic);
    
    // Call AI estimator
    const estimate = await callAIEstimator(userId, normalizedTopic);
    
    // Always log practice/mock activities, even if readiness doesn't change
    // This ensures users can see their activity in Recent Activity
    if (estimate.after > 0) {
      const after = estimate.after !== before ? estimate.after : before;
      await logReadinessChange(normalizedTopic, before, after, reason);
    }
  },
  2000, // 2 second debounce
  { leading: false, trailing: true }
);

/**
 * Trigger AI readiness update for a topic after practice/mock completion
 */
export async function triggerAIReadinessUpdate(
  userId: string,
  topic: string,
  source: 'practice' | 'mock'
): Promise<void> {
  // Check if user has auto_readiness enabled
  const { data: settings } = await supabase
    .from('user_settings')
    .select('auto_readiness')
    .eq('user_id', userId)
    .maybeSingle();

  if (!settings?.auto_readiness) {
    return; // Auto update disabled
  }

  const reason = source === 'practice' ? 'practice' : 'mock';
  debouncedUpdate(userId, topic, reason);
}

/**
 * Hook into practice completion
 */
export async function onPracticeComplete(
  userId: string,
  topic: string
): Promise<void> {
  await triggerAIReadinessUpdate(userId, topic, 'practice');
}

/**
 * Hook into mock completion
 */
export async function onMockComplete(
  userId: string,
  topic: string
): Promise<void> {
  await triggerAIReadinessUpdate(userId, topic, 'mock');
}
