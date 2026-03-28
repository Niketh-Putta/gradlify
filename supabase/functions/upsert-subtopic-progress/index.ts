import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // Get the session or user object
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { items } = await req.json();
    
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid items array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert each item
    for (const item of items) {
      const { topic_key, subtopic_key, score } = item;
      
      if (!topic_key || !subtopic_key || typeof score !== 'number') {
        continue;
      }

      await supabaseClient
        .from('subtopic_progress')
        .upsert({
          user_id: user.id,
          topic_key,
          subtopic_key,
          score: Math.max(0, Math.min(100, Math.round(score))),
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'user_id,topic_key,subtopic_key' 
        });
    }

    // Return fresh data
    const { data, error } = await supabaseClient
      .from('subtopic_progress')
      .select('topic_key, subtopic_key, score, last_updated')
      .eq('user_id', user.id)
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Error fetching updated progress:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch updated progress' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to map format
    const map: Record<string, number> = {};
    data?.forEach(d => {
      const key = `${d.topic_key}.${d.subtopic_key}`;
      map[key] = d.score;
    });

    return new Response(
      JSON.stringify({
        map,
        updatedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in upsert-subtopic-progress:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});