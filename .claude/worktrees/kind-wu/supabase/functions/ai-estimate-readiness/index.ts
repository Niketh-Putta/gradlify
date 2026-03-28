import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AI_FEATURE_ENABLED } from "../shared/featureFlags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EstimateRequest {
  user_id: string;
  topic: string;
}

interface EstimateResponse {
  after: number;
  reasoning?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!AI_FEATURE_ENABLED) {
    return new Response(
      JSON.stringify({ error: "Feature unavailable" }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { user_id, topic }: EstimateRequest = await req.json();

    if (!user_id || !topic) {
      throw new Error("user_id and topic are required");
    }

    // Get current readiness for this topic
    const { data: currentReadiness } = await supabaseClient
      .from("v_topic_readiness")
      .select("readiness")
      .eq("user_id", user_id)
      .eq("topic", topic)
      .maybeSingle();

    const before = currentReadiness?.readiness || 0;

    // Get recent practice results for this topic (last 30 days, excluding mock difficulty)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentResults } = await supabaseClient
      .from("practice_results")
      .select("attempts, correct, difficulty, created_at")
      .eq("user_id", user_id)
      .eq("topic", topic)
      .neq("difficulty", "mock")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get recent completed mock attempts (last 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: mockAttempts, error: mockErr } = await supabaseClient
      .from("mock_attempts")
      .select("id, score, total_marks, created_at")
      .eq("user_id", user_id)
      .eq("status", "completed")
      .gte("created_at", sixtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10);
    
    console.log('[AI-Estimate] Mock attempts found:', mockAttempts?.length || 0, 'error:', mockErr);

    // For each mock attempt, get questions for this specific topic
    const mockTopicScores: Array<{ correct: number; total: number }> = [];
    if (mockAttempts && mockAttempts.length > 0) {
      console.log(`[AI-Estimate] Processing ${mockAttempts.length} mock attempts for ${topic}`);
      for (const attempt of mockAttempts) {
        const { data: questions } = await supabaseClient
          .from("mock_questions")
          .select("topic, marks, awarded_marks")
          .eq("attempt_id", attempt.id)
          .eq("topic", topic);

        if (questions && questions.length > 0) {
          const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
          const awardedMarks = questions.reduce((sum, q) => sum + (q.awarded_marks || 0), 0);
          console.log(`[AI-Estimate] Attempt ${attempt.id}: ${awardedMarks}/${totalMarks} marks for ${topic}`);
          mockTopicScores.push({
            correct: awardedMarks,
            total: totalMarks,
          });
        }
      }
    }
    console.log('[AI-Estimate] mockTopicScores:', mockTopicScores);

    // Calculate practice accuracy
    let totalAttempts = 0;
    let totalCorrect = 0;
    let practiceAccuracy = 0;

    if (recentResults && recentResults.length > 0) {
      recentResults.forEach((result) => {
        totalAttempts += result.attempts || 0;
        totalCorrect += result.correct || 0;
      });
      practiceAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) : 0;
    }

    // Calculate mock exam accuracy from completed mock attempts
    let mockAccuracy = 0;
    if (mockTopicScores.length > 0) {
      const totalCorrectMock = mockTopicScores.reduce((sum, m) => sum + m.correct, 0);
      const totalPossibleMock = mockTopicScores.reduce((sum, m) => sum + m.total, 0);
      mockAccuracy = totalPossibleMock > 0 ? (totalCorrectMock / totalPossibleMock) : 0;
    }

    // Simple AI estimation algorithm
    // Mock exams are weighted MORE heavily (70%) as they're comprehensive assessments
    // Practice questions are weighted less (30%) as they're more isolated
    const hasMockData = mockAccuracy > 0;
    const hasPracticeData = practiceAccuracy > 0;
    
    let combinedAccuracy = 0;
    if (hasMockData && hasPracticeData) {
      // Both data sources: weight mocks significantly more
      combinedAccuracy = (mockAccuracy * 0.7) + (practiceAccuracy * 0.3);
    } else if (hasMockData) {
      // Only mock data: trust it highly (95% confidence)
      combinedAccuracy = mockAccuracy * 0.95;
    } else if (hasPracticeData) {
      // Only practice data: be more conservative (75% confidence)
      combinedAccuracy = practiceAccuracy * 0.75;
    } else {
      // No data available
      return new Response(
        JSON.stringify({
          after: before,
          reasoning: "No recent activity data available for this topic",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to 0-100 scale
    let targetReadiness = combinedAccuracy * 100;
    console.log(`[AI-Estimate] Combined accuracy: ${(combinedAccuracy * 100).toFixed(1)}%, target before momentum: ${targetReadiness.toFixed(1)}`);

    // Apply momentum: if improving, boost slightly; if declining, reduce slightly
    if (before > 0) {
      const delta = targetReadiness - before;
      if (delta > 0) {
        targetReadiness = before + (delta * 0.7); // Gradual increase
      } else {
        targetReadiness = before + (delta * 0.5); // Gradual decrease
      }
    }

    // Clamp to [0, 100]
    const after = Math.max(0, Math.min(100, Math.round(targetReadiness)));
    console.log(`[AI-Estimate] Final readiness: ${before} -> ${after} for ${topic}`);

    // Generate detailed reasoning
    const mockCount = mockTopicScores.length;
    const practiceCount = recentResults?.length || 0;
    
    let reasoning = `Based on`;
    if (hasPracticeData) {
      reasoning += ` ${practiceCount} practice session${practiceCount !== 1 ? 's' : ''} (${(practiceAccuracy * 100).toFixed(1)}% accuracy)`;
    }
    if (hasMockData) {
      if (hasPracticeData) reasoning += ` and`;
      reasoning += ` ${mockCount} mock exam${mockCount !== 1 ? 's' : ''} (${(mockAccuracy * 100).toFixed(1)}% accuracy)`;
    }
    reasoning += `. AI estimates readiness at ${after}%.`;

    const response: EstimateResponse = {
      after,
      reasoning,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error estimating readiness:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        after: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
