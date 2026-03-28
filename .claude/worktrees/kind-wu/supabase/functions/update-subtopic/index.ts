import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const updateSchema = z.object({
      topic_key: z.string().min(1).max(50),
      subtopic_key: z.string().min(1).max(50),
      score: z.number().int().min(0).max(100)
    });

    const requestSchema = z.object({
      updates: z.array(updateSchema).min(1).max(100)
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

    const { updates } = validatedInput;

    console.log(`Processing ${updates.length} updates for user: ${user.id}`);

    // Process updates with idempotent upserts
    const results = [];
    for (const update of updates) {
      const { topic_key, subtopic_key, score } = update;

      // Idempotent upsert with composite conflict resolution
      const { error } = await supabase
        .from('subtopic_progress')
        .upsert({ 
          user_id: user.id,
          topic_key,
          subtopic_key,
          score: Math.min(100, Math.max(0, score)), // Clamp between 0-100
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'user_id,topic_key,subtopic_key',
          ignoreDuplicates: false 
        });

      results.push({ 
        topic_key, 
        subtopic_key, 
        success: !error,
        error: error?.message 
      });

      if (error) {
        console.error(`Failed to update ${topic_key}.${subtopic_key}:`, error);
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully updated ${successCount}/${updates.length} subtopics`);

    // After writes, refetch fresh progress data for read-after-write consistency
    const { data: topicCatalog } = await supabase
      .from('topic_catalog')
      .select('topic_key, subtopic_key, title, order_index')
      .order('order_index');

    const { data: subtopicProgress } = await supabase
      .from('subtopic_progress')
      .select('topic_key, subtopic_key, score, last_updated')
      .eq('user_id', user.id);

    // Group by topics and calculate averages
    type SubtopicSummary = {
      subtopic_key: string;
      title: string;
      score: number;
      order_index: number;
      last_updated: string | null;
    };

    type TopicSummary = {
      topic_key: string;
      topic_name: string;
      subtopics: SubtopicSummary[];
      average_score: number;
    };

    const topicMap = new Map<string, TopicSummary>();
    
    if (topicCatalog) {
      for (const item of topicCatalog) {
        if (!topicMap.has(item.topic_key)) {
          topicMap.set(item.topic_key, {
            topic_key: item.topic_key,
            topic_name: getTopicName(item.topic_key),
            subtopics: [],
            average_score: 0
          });
        }
        
        const userProgress = subtopicProgress?.find(
          p => p.topic_key === item.topic_key && p.subtopic_key === item.subtopic_key
        );
        
        const topicEntry = topicMap.get(item.topic_key);
        if (topicEntry) {
          topicEntry.subtopics.push({
            subtopic_key: item.subtopic_key,
            title: item.title,
            score: userProgress?.score || 0,
            order_index: item.order_index,
            last_updated: userProgress?.last_updated || null,
          });
        }
      }
    }

    // Calculate topic averages
    const topics = Array.from(topicMap.values()).map(topic => ({
      ...topic,
      average_score: topic.subtopics.length > 0 
        ? Math.round(topic.subtopics.reduce((sum: number, sub) => sum + sub.score, 0) / topic.subtopics.length)
        : 0
    }));

    const overallReadiness = topics.length > 0 
      ? Math.round(topics.reduce((sum, topic) => sum + topic.average_score, 0) / topics.length)
      : 0;

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: `Updated ${successCount} subtopics successfully`,
        results,
        // Return fresh data for immediate UI updates
        data: {
          topics,
          overall: overallReadiness,
          updatedAt: new Date().toISOString()
        }
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

function getTopicName(topicKey: string): string {
  const topicNames: Record<string, string> = {
    number: 'Number',
    algebra: 'Algebra', 
    ratio: 'Ratio & Proportion',
    geometry: 'Geometry & Measures',
    probability: 'Probability',
    statistics: 'Statistics'
  };
  return topicNames[topicKey] || topicKey;
}
