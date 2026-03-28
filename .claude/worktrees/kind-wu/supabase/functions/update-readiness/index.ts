import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizeCanonicalTopic = (raw: string): string => {
  const t = String(raw ?? '').trim();
  const lower = t.toLowerCase();

  if (lower === 'number') return 'Number';
  if (lower === 'algebra') return 'Algebra';
  if (lower === 'probability') return 'Probability';
  if (lower === 'statistics') return 'Statistics';

  if (
    lower === 'ratio' ||
    lower === 'ratio & proportion' ||
    lower === 'ratio and proportion'
  ) {
    return 'Ratio & Proportion';
  }

  if (
    lower === 'geometry' ||
    lower === 'geometry & measures' ||
    lower === 'geometry and measures'
  ) {
    return 'Geometry & Measures';
  }

  // Fall back to input; the DB check constraint will reject if invalid.
  return t;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input with zod
    const requestSchema = z.object({
      user_id: z.string().uuid(),
      topic: z.string().min(1),
      difficulty: z.number().int().min(1).max(4),
      correct: z.boolean(),
      timestamp: z.string().optional(),
    });

    let validatedInput;
    try {
      const rawBody = await req.json();
      validatedInput = requestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorMessage = validationError.errors[0]?.message || 'Invalid input';
        console.error('Validation error:', errorMessage);
        return new Response(
          JSON.stringify({ ok: false, message: errorMessage }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw validationError;
    }

    const { user_id, topic: rawTopic, difficulty, correct, timestamp } = validatedInput;
    const topic = normalizeCanonicalTopic(rawTopic);

    // Verify user_id matches authenticated user
    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ ok: false, message: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing readiness update for user ${user_id}, topic: ${topic}, correct: ${correct}, difficulty: ${difficulty}`);

    // Check if user has auto_readiness enabled
    const { data: settings } = await supabase
      .from('user_settings')
      .select('auto_readiness')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!settings?.auto_readiness) {
      console.log('Auto readiness disabled for user');
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'Auto readiness disabled',
          updated: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current readiness
    const { data: currentReadiness } = await supabase
      .from('v_topic_readiness')
      .select('readiness')
      .eq('user_id', user_id)
      .eq('topic', topic)
      .maybeSingle();

    const before = currentReadiness?.readiness || 0;

    // Calculate delta based on correctness and difficulty
    const baseDelta = correct ? 10 : -5;
    const difficultyMultiplier = difficulty / 3.0;
    const delta = baseDelta * difficultyMultiplier;

    // Calculate new readiness (clamped 0-100)
    const after = Math.max(0, Math.min(100, before + delta));

    console.log(`Readiness update: ${before} -> ${after} (delta: ${delta})`);

    // Log the readiness change - insert directly instead of using RPC to avoid auth.uid() issues
    const { error: logError } = await supabase
      .from('readiness_history')
      .insert({
        user_id: user_id,
        topic: topic,
        readiness_before: before,
        readiness_after: after,
        reason: 'practice',
      });

    if (logError) {
      console.error('Error logging readiness change:', logError);
      throw logError;
    }

    console.log('Readiness change logged successfully');

    // Fetch updated readiness_scores for the user
    const { data: readinessScores, error: fetchError } = await supabase
      .from('readiness_scores')
      .select('*')
      .eq('user_id', user_id);

    if (fetchError) {
      console.error('Error fetching readiness_scores:', fetchError);
    }

    console.log('Updated readiness_scores:', readinessScores);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Readiness updated successfully',
        updated: true,
        before,
        after,
        delta: after - before,
        readiness_scores: readinessScores || []
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
