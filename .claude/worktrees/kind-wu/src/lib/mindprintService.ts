import { supabase } from '@/integrations/supabase/client';

/**
 * Insert a mindprint event for tracking user learning patterns
 * This should be called every time a user answers a question
 */
export async function insertMindprintEvent({
  questionId,
  correct,
  timeSpent,
  topic,
  difficulty = 3,
  mode,
  confidence = 'confident',
  wrongReason = null,
}: {
  questionId: string;
  correct: boolean;
  timeSpent: number | null;
  topic: string;
  difficulty?: number;
  mode: 'practice' | 'mock';
  confidence?: 'confident' | 'unsure';
  wrongReason?: 'careless_error' | 'concept_gap' | 'misread_question' | null;
}) {
  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Mindprint] No authenticated user, skipping event insertion');
      return;
    }

    // Insert event
    const { error } = await supabase
      .from('mindprint_events')
      .insert({
        user_id: user.id,
        question_id: questionId,
        correct,
        time_spent: timeSpent,
        topic,
        difficulty,
        mode,
        confidence,
        wrong_reason: wrongReason,
      });

    if (error) {
      console.error('[Mindprint] Failed to insert event:', error);
    } else {
      console.log('[Mindprint] Event inserted:', { questionId, correct, topic, mode });
    }
  } catch (error) {
    console.error('[Mindprint] Error inserting event:', error);
  }
}

/**
 * Generate mindprint summary using AI analysis
 * This should be called when user clicks "Generate Insights"
 */
export async function generateMindprintSummary(userId: string) {
  try {
    console.log('[Mindprint] Calling Edge Function...');
    
    // Get authenticated session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No authenticated session');
    }

    console.log('[Mindprint] Session found, user_id:', session.user.id);

    // Call edge function with JWT
    const { data, error } = await supabase.functions.invoke('generate-mindprint-summary', {
      body: { user_id: session.user.id },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('[Mindprint] Edge Function Error:', error);
      throw error;
    }
    
    console.log('[Mindprint] Edge Function Response:', data);
    
    // Check for insufficient data response
    if (data && data.error === 'INSUFFICIENT_DATA') {
      throw new Error(data.message || 'Not enough data to generate insights');
    }

    // Fetch the updated summary from the database
    console.log('[Mindprint] Fetching updated summary from database...');
    const { data: summary, error: fetchError } = await supabase
      .from('mindprint_summary')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (fetchError) {
      console.error('[Mindprint] Fetch Error:', fetchError);
      throw fetchError;
    }

    console.log('[Mindprint] Fetched Updated Summary:', summary);
    
    return summary;
  } catch (error) {
    console.error('[Mindprint] Failed to generate summary:', error);
    throw error;
  }
}
