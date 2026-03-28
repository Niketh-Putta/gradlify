import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_FEATURE_ENABLED } from "../shared/featureFlags.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (!AI_FEATURE_ENABLED) {
    return new Response(
      JSON.stringify({ error: "Feature unavailable" }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Step 1: Load environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAIKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    console.log("[MINDPRINT] Loaded OpenAI key:", openAIKey ? "✓" : "✗ (will use fallback)");

    // Step 2: Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("[MINDPRINT] Auth error:", userError);
      throw new Error("Unauthorized");
    }

    console.log(`[MINDPRINT] Authenticated user: ${user.id}`);

    // Step 3: Fetch mindprint events
    const { data: events, error: eventsError } = await supabase
      .from('mindprint_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (eventsError) {
      console.error("[MINDPRINT] Database error:", eventsError);
      throw eventsError;
    }

    console.log(`[MINDPRINT] Fetched events: ${events?.length || 0}`);

    if (!events || events.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'INSUFFICIENT_DATA',
          message: 'You have not completed enough practice for the mindprint to generate, try completing a few more questions',
          events_count: events?.length || 0,
          required_count: 10
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Aggregate statistics
    console.log("[MINDPRINT] Aggregating stats...");

    const stats = {
      total: events.length,
      correct: 0,
      accuracy_by_topic: {} as Record<string, { correct: number, total: number }>,
      energy_by_hour: {} as Record<string, { correct: number, total: number }>,
      mistake_types: {} as Record<string, number>,
      confidence_data: {
        confident_correct: 0,
        confident_wrong: 0,
        unsure_correct: 0,
        unsure_wrong: 0
      },
      total_time_spent: 0,
      time_count: 0
    };

    events.forEach(event => {
      if (event.correct) stats.correct++;

      // Accuracy by topic
      if (event.topic) {
        if (!stats.accuracy_by_topic[event.topic]) {
          stats.accuracy_by_topic[event.topic] = { correct: 0, total: 0 };
        }
        stats.accuracy_by_topic[event.topic].total++;
        if (event.correct) stats.accuracy_by_topic[event.topic].correct++;
      }

      // Energy by hour (UTC)
      if (event.created_at) {
        const hour = new Date(event.created_at).getUTCHours();
        const hourBlock = `${Math.floor(hour / 3) * 3}-${Math.floor(hour / 3) * 3 + 3}`;
        if (!stats.energy_by_hour[hourBlock]) {
          stats.energy_by_hour[hourBlock] = { correct: 0, total: 0 };
        }
        stats.energy_by_hour[hourBlock].total++;
        if (event.correct) stats.energy_by_hour[hourBlock].correct++;
      }

      // Mistake types
      if (!event.correct && event.wrong_reason) {
        stats.mistake_types[event.wrong_reason] = (stats.mistake_types[event.wrong_reason] || 0) + 1;
      }

      // Confidence accuracy
      if (event.confidence === 'confident') {
        if (event.correct) stats.confidence_data.confident_correct++;
        else stats.confidence_data.confident_wrong++;
      } else if (event.confidence === 'unsure') {
        if (event.correct) stats.confidence_data.unsure_correct++;
        else stats.confidence_data.unsure_wrong++;
      }

      // Time tracking
      if (event.time_spent && typeof event.time_spent === 'number') {
        stats.total_time_spent += event.time_spent;
        stats.time_count++;
      }
    });

    const avgTimeSpent = stats.time_count > 0 
      ? Math.round(stats.total_time_spent / stats.time_count) 
      : 0;

    const overallAccuracy = stats.total > 0 
      ? Math.round((stats.correct / stats.total) * 100) 
      : 0;

    // Calculate top errors
    const topErrorsList = Object.entries(stats.mistake_types)
      .map(([type, count]) => ({
        type,
        percentage: stats.total - stats.correct > 0 
          ? Math.round((count / (stats.total - stats.correct)) * 100) 
          : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    // Calculate peak hours
    const peakHourEntry = Object.entries(stats.energy_by_hour)
      .filter(([, data]) => data.total > 0)
      .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))[0];
    
    const peakHours = peakHourEntry ? peakHourEntry[0] : 'Not enough data';

    // Calculate confidence accuracy
    const totalConfident = stats.confidence_data.confident_correct + stats.confidence_data.confident_wrong;
    const confidenceAccuracy = totalConfident > 0 
      ? stats.confidence_data.confident_correct / totalConfident 
      : 0;

    console.log("[MINDPRINT] Aggregated stats:", {
      total: stats.total,
      correct: stats.correct,
      accuracy: overallAccuracy,
      avgTime: avgTimeSpent,
      topErrors: topErrorsList.length,
      peakHours
    });

    // Step 5: Generate AI summary
    let aiSummary = 'Keep practicing regularly to build your confidence and improve your skills!';

    if (openAIKey) {
      console.log("[MINDPRINT] Calling OpenAI...");
      
      const systemPrompt = `You are Gradlify's Cognitive AI. Analyze learning data and provide a personalized 2-3 sentence insight focusing on strengths and actionable improvements.`;

      const userPrompt = `Student Performance:
- Total questions: ${stats.total}
- Accuracy: ${overallAccuracy}%
- Average time: ${avgTimeSpent}s
- Peak performance: ${peakHours} UTC
- Top mistakes: ${topErrorsList.map(e => `${e.type} (${e.percentage}%)`).join(', ')}
- Confidence accuracy: ${Math.round(confidenceAccuracy * 100)}%

Topics:
${Object.entries(stats.accuracy_by_topic).map(([topic, data]) => 
  `- ${topic}: ${Math.round((data.correct / data.total) * 100)}% (${data.total} questions)`
).join('\n')}

Provide personalized insight in 2-3 sentences.`;

      try {
        const openAIResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${openAIKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              { role: 'user', parts: [{ text: userPrompt }] }
            ],
            generationConfig: {
              maxOutputTokens: 150,
              temperature: 0.7,
            },
          }),
        });

        if (!openAIResponse.ok) {
          const errorText = await openAIResponse.text();
          console.error('[MINDPRINT] Gemini error:', openAIResponse.status, errorText);
        } else {
          const aiData = await openAIResponse.json();
          const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) aiSummary = text.trim();
          console.log('[MINDPRINT] Generated AI summary');
        }
      } catch (aiError) {
        console.error('[MINDPRINT] OpenAI call failed:', aiError);
        // Continue with fallback summary
      }
    }

    // Step 6: Prepare final insights
    const finalInsights = {
      efficiency_score: overallAccuracy,
      peak_hours: peakHours,
      top_errors: topErrorsList,
      confidence_accuracy: Math.round(confidenceAccuracy * 100) / 100,
      ai_summary: aiSummary,
      last_updated: new Date().toISOString()
    };

    console.log("[MINDPRINT] Final insights:", finalInsights);

    // Step 7: Save to database
    const { error: upsertError } = await supabase
      .from('mindprint_summary')
      .upsert({
        user_id: user.id,
        efficiency_score: finalInsights.efficiency_score,
        peak_hours: finalInsights.peak_hours,
        top_errors: finalInsights.top_errors,
        confidence_accuracy: finalInsights.confidence_accuracy,
        ai_summary: finalInsights.ai_summary,
        last_updated: finalInsights.last_updated
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[MINDPRINT] Upsert error:', upsertError);
      throw upsertError;
    }

    console.log('[MINDPRINT] Saved summary successfully');

    // Step 8: Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        summary: finalInsights,
        events_analyzed: events.length 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[MINDPRINT] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
