import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { AI_FEATURE_ENABLED } from "../shared/featureFlags.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const parseUserAnswerValue = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      if (value.trim()) return [value];
    }
  }
  return [];
};

const requestSchema = z.object({
  attemptId: z.string().uuid({ message: "Invalid attempt ID format" }),
  examBoard: z.string().optional()
});

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
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) throw new Error("Missing Authorization header");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey
    );

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const body = await req.json();
    const { attemptId, examBoard } = requestSchema.parse(body);
    const boardLabel = examBoard && examBoard !== "Unsure" ? `${examBoard} ` : "";
    
    console.log(`Submitting mock exam ${attemptId} for user ${user.id}`);

    // Verify attempt ownership before scoring
    const { data: attemptRow, error: attemptError } = await supabase
      .from('mock_attempts')
      .select('id')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attemptRow) throw new Error("Mock attempt not found");

    // Get questions for this attempt
    const { data: questions, error: questionsError } = await supabase
      .from('mock_questions')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('idx', { ascending: true });

    if (questionsError) throw questionsError;

    let totalScore = 0;
    const gradedQuestions = [];

    // Grade each question with user_answer
    for (const question of questions) {
      const correctPayload = question.correct_answer;
      if (correctPayload && typeof correctPayload === 'object' && Array.isArray(correctPayload.parts)) {
        const parts = correctPayload.parts as Array<{ correct_answer?: string }>;
        const userAnswers = parseUserAnswerValue(question.user_answer);
        const correctCount = parts.reduce((acc, part, idx) => {
          const expected = (part?.correct_answer ?? '').toString().trim();
          const actual = (userAnswers[idx] ?? '').toString().trim();
          if (expected && actual && expected === actual) return acc + 1;
          return acc;
        }, 0);

        const maxMarks = typeof question.marks === 'number' ? question.marks : parts.length;
        const awardedMarks = Math.max(0, Math.min(maxMarks, Math.round((correctCount / parts.length) * maxMarks)));

        await supabaseAdmin
          .from('mock_questions')
          .update({ awarded_marks: awardedMarks })
          .eq('id', question.id);

        totalScore += awardedMarks;
        gradedQuestions.push({
          ...question,
          awarded_marks: awardedMarks,
          rationale: 'Auto-marked multipart question',
          multipart: {
            stem: correctPayload.stem ?? null,
            parts,
          },
        });
        continue;
      }

      if (question.user_answer && question.user_answer.trim()) {
        try {
          const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
          const gradeResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: `You are a GCSE ${boardLabel}Maths marker. Mark strictly to the scheme, award partial marks where appropriate. Return only JSON.` }] },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `Question:
${question.prompt}

Mark scheme (bullets):
${JSON.stringify(question.mark_scheme)}

Max marks: ${question.marks}
Student answer:
${question.user_answer}

Return JSON:
{ "awarded": number (0..marks), "rationale": "short feedback" }` }]
                }
              ],
              generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.2,
                responseMimeType: "application/json"
              }
            }),
          });

          const gradeData = await gradeResponse.json();
          let grading;
          
          try {
            const feedbackText = gradeData.candidates?.[0]?.content?.parts?.[0]?.text;
            grading = JSON.parse(feedbackText || '{}');
          } catch (e) {
            // Fallback if parsing fails
            grading = { awarded: 0, rationale: "Unable to grade automatically" };
          }

          const awardedMarks = Math.max(0, Math.min(question.marks, grading.awarded || 0));
          
          // Update question with awarded marks
          await supabaseAdmin
            .from('mock_questions')
            .update({ awarded_marks: awardedMarks })
            .eq('id', question.id);

          totalScore += awardedMarks;
          gradedQuestions.push({
            ...question,
            awarded_marks: awardedMarks,
            rationale: grading.rationale
          });
        } catch (error) {
          console.error(`Error grading question ${question.id}:`, error);
          // Give 0 marks if grading fails
          gradedQuestions.push({
            ...question,
            awarded_marks: 0,
            rationale: "Auto-grading failed"
          });
        }
      } else {
        // No answer provided
        gradedQuestions.push({
          ...question,
          awarded_marks: 0,
          rationale: "No answer provided"
        });
      }
    }

    // Update attempt with final score
    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('mock_attempts')
      .update({ 
        score: totalScore,
        status: 'scored'
      })
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;
    
    console.log('Successfully marked attempt as completed');

    // Generate topic breakdown for display
    const topicBreakdown = {};
    gradedQuestions.forEach(q => {
      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { earned: 0, total: 0 };
      }
      topicBreakdown[q.topic].earned += q.awarded_marks;
      topicBreakdown[q.topic].total += q.marks;
    });

    // Trigger AI readiness updates for all topics covered in this mock exam
    // Normalize topic names to canonical set used by readiness views
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

    const normalizeTopic = (t: string): string => TOPIC_MAPPING[t.toLowerCase()] || t;

    // INSERT MINDPRINT EVENTS for each question
    for (const question of gradedQuestions) {
      const topic = normalizeTopic(question.topic);
      const isCorrect = question.awarded_marks === question.marks;
      
      await supabase
        .from('mindprint_events')
        .insert({
          user_id: user.id,
          question_id: question.question_id || question.id,
          correct: isCorrect,
          time_spent: null,
          topic,
          difficulty: 3,
          mode: 'mock',
          confidence: 'confident',
          wrong_reason: !isCorrect ? 'concept_gap' : null,
        });
    }

    const topicsInExam = new Set(questions.map(q => normalizeTopic(q.topic)));
    console.log(`Triggering AI readiness updates for topics: ${Array.from(topicsInExam).join(', ')}`);
    
    for (const rawTopic of topicsInExam) {
      const topic = normalizeTopic(rawTopic);
      try {
        // Get current readiness before AI estimate
        const { data: currentReadiness } = await supabase
          .from('v_topic_readiness')
          .select('readiness')
          .eq('user_id', user.id)
          .eq('topic', topic)
          .maybeSingle();
        
        const readinessBefore = currentReadiness?.readiness || 0;
        
        // Call AI estimator and get the new readiness value
        const { data: aiEstimate, error: aiError } = await supabase.functions.invoke('ai-estimate-readiness', {
          body: { user_id: user.id, topic }
        });

        let readinessAfter = readinessBefore;
        if (aiError) {
          console.error(`AI estimate failed for ${topic}:`, aiError);
          // Fallback: log activity with no change so Recent Activity still shows Mock completion
        } else if (aiEstimate && typeof aiEstimate.after === 'number' && aiEstimate.after > 0) {
          readinessAfter = aiEstimate.after;
        }

        console.log(`AI readiness for ${topic}: ${readinessBefore}% → ${readinessAfter}%`);

        // Always log an entry so mocks appear in Recent Activity, even if no change
        const { error: logError } = await supabase.rpc('log_readiness_change', {
          p_topic: topic,
          p_before: readinessBefore,
          p_after: readinessAfter,
          p_reason: 'mock'
        });

        if (logError) {
          console.error(`Failed to log readiness change for ${topic}:`, logError);
        } else {
          console.log(`Logged readiness for ${topic} (Mock)`);
        }
      } catch (error) {
        console.error(`Failed to update AI readiness for ${topic}:`, error);
        // Continue with other topics even if one fails
      }
    }

    return new Response(JSON.stringify({ 
      attempt: updatedAttempt,
      questions: gradedQuestions,
      topicBreakdown
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error submitting mock exam:', error);
    
    // Return generic error to client, log details server-side
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid request data'
      : 'An error occurred processing your submission';
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error instanceof z.ZodError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
