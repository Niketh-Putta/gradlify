import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { planId } = await req.json();
    
    if (!planId) {
      throw new Error("Plan ID is required");
    }

    // Get the study plan and its days
    const { data: planData, error: planError } = await supabase
      .from('study_plans')
      .select(`
        *,
        study_plan_days (*)
      `)
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError) throw planError;
    if (!planData) throw new Error("Study plan not found");

    console.log('Generating sessions for plan:', planData.id);

    // Calculate weeks until exam
    const exam = new Date(planData.exam_date);
    const now = new Date();
    const weeksUntil = Math.max(1, Math.ceil((exam.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    
    const topics = planData.focus_topics?.length ? planData.focus_topics : [
      'Number', 'Algebra', 'Ratio & Proportion', 'Geometry & Measures', 'Probability', 'Statistics'
    ];

    const subtopics = {
      'Number': ['Integers', 'Fractions', 'Decimals', 'Percentages', 'Powers & Roots'],
      'Algebra': ['Expressions', 'Equations', 'Inequalities', 'Graphs', 'Sequences'],
      'Ratio & Proportion': ['Ratios', 'Scale Factors', 'Direct Proportion', 'Inverse Proportion'],
      'Geometry & Measures': ['Shapes', 'Area & Perimeter', 'Volume', 'Angles', 'Transformations'],
      'Probability': ['Basic Probability', 'Tree Diagrams', 'Venn Diagrams'],
      'Statistics': ['Data Collection', 'Averages', 'Graphs & Charts', 'Correlation']
    };

    // Create a mapping of weekday to time windows
    const dayTimeMap = new Map();
    for (const planDay of planData.study_plan_days) {
      if (planDay.enabled) {
        dayTimeMap.set(planDay.weekday, {
          start_time: planDay.start_time,
          end_time: planDay.end_time
        });
      }
    }

    if (dayTimeMap.size === 0) {
      throw new Error("No enabled days found in study plan");
    }

    const sessions = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow
    
    for (let week = 0; week < weeksUntil && sessions.length < weeksUntil * planData.sessions_per_week; week++) {
      let sessionsThisWeek = 0;
      
      for (let day = 0; day < 7 && sessionsThisWeek < planData.sessions_per_week; day++) {
        const dayOfWeek = currentDate.getDay();
        const timeWindow = dayTimeMap.get(dayOfWeek);
        
        if (timeWindow && sessionsThisWeek < planData.sessions_per_week) {
          const topic = topics[sessions.length % topics.length];
          const topicSubtopics = subtopics[topic] || [topic];
          const subtopic = topicSubtopics[Math.floor(sessions.length / topics.length) % topicSubtopics.length];
          
          // Create timestamps for starts_at and ends_at
          const startDateTime = new Date(currentDate);
          const [startHour, startMinute] = timeWindow.start_time.split(':').map(Number);
          startDateTime.setHours(startHour, startMinute, 0, 0);
          
          const endDateTime = new Date(startDateTime);
          endDateTime.setMinutes(endDateTime.getMinutes() + planData.minutes_per_session);
          
          sessions.push({
            user_id: user.id,
            plan_id: planData.id,
            starts_at: startDateTime.toISOString(),
            ends_at: endDateTime.toISOString(),
            topic,
            subtopic,
            goal: `Practice ${subtopic} - ${topic}`,
            status: 'planned'
          });
          
          sessionsThisWeek++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`Generated ${sessions.length} sessions`);

    // Insert sessions (upsert to avoid duplicates)
    const { error: insertError } = await supabase
      .from('study_sessions')
      .upsert(sessions, { 
        onConflict: 'user_id,starts_at',
        ignoreDuplicates: false 
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true, 
      sessionsCreated: sessions.length,
      weeksPlanned: weeksUntil 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating study plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
