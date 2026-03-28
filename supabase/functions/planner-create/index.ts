import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

    // Validate input with zod
    const timeWindowSchema = z.object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format (HH:MM)' }),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format (HH:MM)' })
    });

    const requestSchema = z.object({
      examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date format (YYYY-MM-DD)' }),
      sessionsPerWeek: z.number().int().min(1).max(7),
      sessionMinutes: z.number().int().min(15).max(240),
      preferredDays: z.array(z.string()).optional(),
      timeWindows: z.record(z.string(), timeWindowSchema),
      focusTopics: z.array(z.string()).optional()
    });

    let validatedInput;
    try {
      const rawBody = await req.json();
      validatedInput = requestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorMessage = validationError.errors[0]?.message || 'Invalid input';
        console.error('Validation error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw validationError;
    }

    const {
      examDate,
      sessionsPerWeek,
      sessionMinutes,
      preferredDays,
      timeWindows,
      focusTopics
    } = validatedInput;

    console.log('Creating study plan:', { 
      examDate, 
      sessionsPerWeek, 
      sessionMinutes, 
      preferredDays,
      timeWindows,
      focusTopics 
    });

    // Validate input
    if (!examDate || !sessionsPerWeek || !sessionMinutes) {
      throw new Error("Missing required fields: examDate, sessionsPerWeek, sessionMinutes");
    }

    if (!timeWindows || Object.keys(timeWindows).length === 0) {
      throw new Error("At least one day must be selected with time windows");
    }

    // Create or update study plan
    const { data: planData, error: planError } = await supabase
      .from('study_plans')
      .upsert({
        user_id: user.id,
        exam_date: examDate,
        sessions_per_week: sessionsPerWeek,
        minutes_per_session: sessionMinutes,
        focus_topics: focusTopics?.length ? focusTopics : [
          'Number', 'Algebra', 'Ratio & Proportion', 'Geometry & Measures', 'Probability', 'Statistics'
        ]
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (planError) throw planError;
    if (!planData) throw new Error("Failed to create study plan");

    console.log('Created plan:', planData.id);

    // Delete existing plan days for this plan
    await supabase
      .from('study_plan_days')
      .delete()
      .eq('plan_id', planData.id);

    // Create new plan days based on time windows
    const planDays = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const [dayName, timeWindow] of Object.entries(timeWindows)) {
      const weekdayIndex = dayNames.indexOf(dayName);
      if (weekdayIndex >= 0 && timeWindow && timeWindow.start && timeWindow.end) {
        planDays.push({
          plan_id: planData.id,
          weekday: weekdayIndex,
          start_time: timeWindow.start,
          end_time: timeWindow.end,
          enabled: true
        });
      }
    }

    if (planDays.length > 0) {
      const { error: daysError } = await supabase
        .from('study_plan_days')
        .insert(planDays);

      if (daysError) throw daysError;
    }

    console.log(`Created ${planDays.length} plan days`);

    return new Response(JSON.stringify({
      success: true,
      planId: planData.id,
      daysCreated: planDays.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating study plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});