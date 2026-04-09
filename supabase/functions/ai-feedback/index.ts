import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { AI_FEATURE_ENABLED } from "../shared/featureFlags.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  attempt_id: z.string().uuid({ message: "Invalid attempt ID format" })
});

type MockAttemptRow = {
  total_marks: number;
  score: number;
  [key: string]: unknown;
};

type MockQuestionRow = {
  topic: string;
  awarded_marks: number | null;
  marks: number | null;
  [key: string]: unknown;
};

serve(async (req) => {
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
    const body = await req.json();
    const { attempt_id } = requestSchema.parse(body);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if feedback already exists
    const { data: existingFeedback, error: checkError } = await supabase
      .from('ai_feedback')
      .select('*')
      .eq('attempt_id', attempt_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing feedback:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing feedback' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingFeedback) {
      return new Response(
        JSON.stringify({ feedback: existingFeedback.feedback_json }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch mock attempt data
    const { data: attempt, error: attemptError } = await supabase
      .from('mock_attempts')
      .select('*')
      .eq('id', attempt_id)
      .single();

    if (attemptError || !attempt) {
      console.error('Error fetching attempt:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Mock attempt not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch questions and answers
    const { data: questions, error: questionsError } = await supabase
      .from('mock_questions')
      .select('*')
      .eq('attempt_id', attempt_id)
      .order('idx');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const attemptRow = attempt as MockAttemptRow;
    const questionRows = (questions ?? []) as MockQuestionRow[];

    // Calculate statistics
    const totalQuestions = questionRows.length;
    const totalMarks = attemptRow.total_marks;
    const scoredMarks = attemptRow.score;
    const overallAccuracy = Math.round((scoredMarks / totalMarks) * 100);

    // Calculate topic-wise accuracy
    const topicStats: Record<string, { scored: number; total: number; questions: MockQuestionRow[] }> = {};
    
    questionRows.forEach((q) => {
      if (!topicStats[q.topic]) {
        topicStats[q.topic] = { scored: 0, total: 0, questions: [] };
      }
      topicStats[q.topic].scored += q.awarded_marks || 0;
      topicStats[q.topic].total += q.marks || 0;
      topicStats[q.topic].questions.push(q);
    });

    const topicAccuracy = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      accuracy: Math.round((stats.scored / stats.total) * 100),
      scored: stats.scored,
      total: stats.total
    }));

    // Identify weak topics (< 60% accuracy)
    const weakTopics = topicAccuracy.filter(t => t.accuracy < 60).map(t => t.topic);

    // Prepare data summary for AI
    const dataSummary = {
      overall_score: `${scoredMarks}/${totalMarks} (${overallAccuracy}%)`,
      topic_performance: topicAccuracy,
      weak_topics: weakTopics,
      total_questions: totalQuestions,
      sample_mistakes: questions
        .filter(q => (q.awarded_marks || 0) < q.marks)
        .slice(0, 5)
        .map(q => ({
          topic: q.topic,
          subtopic: q.subtopic,
          user_answer: q.user_answer,
          correct_answer: q.correct_answer,
          marks_lost: q.marks - (q.awarded_marks || 0)
        }))
    };

    // Call OpenAI API
    const systemPrompt = `You are an expert GCSE Mathematics tutor providing personalized feedback. Analyze the student's mock exam performance and provide actionable insights in JSON format.`;
    
    const userPrompt = `A student completed a GCSE Mathematics mock exam with the following results:

${JSON.stringify(dataSummary, null, 2)}

Provide detailed feedback in the following JSON structure:
{
  "summary": {
    "overall_score": "string (e.g., '45/80 (56%)')",
    "performance_level": "string (e.g., 'Grade 5 standard')",
    "topic_accuracy": [{"topic": "string", "accuracy": number, "status": "strong/moderate/weak"}]
  },
  "strengths": ["string - specific things the student did well"],
  "weaknesses": [{"area": "string", "note": "string - brief explanation"}],
  "explanations": [
    {
      "topic": "string",
      "common_mistake": "string",
      "worked_example": {
        "question": "string",
        "step_by_step": ["string - each step"],
        "answer": "string"
      }
    }
  ],
  "recommendations": ["string - specific topics to practice"]
}

Keep explanations clear and concise. Focus on the weakest topics.`;

    console.log('Calling Gemini API...');
    const openaiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${openaiApiKey}`, {
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
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('Gemini API error:', openaiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate AI feedback', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const feedbackText = openaiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const feedbackJson = JSON.parse(feedbackText || '{}');

    console.log('Generated feedback successfully');

    // Save feedback to database
    const { error: insertError } = await supabase
      .from('ai_feedback')
      .insert({
        attempt_id,
        feedback_json: feedbackJson,
        model: 'gpt-4o-mini'
      });

    if (insertError) {
      console.error('Error saving feedback:', insertError);
      // Still return the feedback even if save fails
    }

    return new Response(
      JSON.stringify({ feedback: feedbackJson }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-feedback function:', error);
    
    // Return generic error to client, log details server-side
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid request data'
      : 'An error occurred generating feedback';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: error instanceof z.ZodError ? 400 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
