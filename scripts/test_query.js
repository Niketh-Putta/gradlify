import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('fetch_exam_questions_v3', {
    p_tiers: ["11+ Standard"],
    p_calculators: ["Non-Calculator"],
    p_question_types: ["Geometry & Measures"],
    p_subtopics: ["geometry|2d-3d-shapes", "geometry.2d-3d-shapes", "geometry,2d-3d-shapes"],
    p_difficulty_min: 1,
    p_difficulty_max: 3,
    p_track: "11plus",
    p_exclude_ids: null,
    p_limit: 20
  });

  console.log("RPC Error:", error);
  console.log("RPC Data count:", data ? data.length : 0);
  
  const { data: q1, error: e1 } = await supabase.from("exam_questions")
    .select("id, subtopic, difficulty, tier, question_type, track")
    .eq("track", "11plus")
    .limit(5);
    
  console.log("SELECT Error:", e1);
  console.log("SELECT First matched rows:", q1);
    
  console.log("SELECT Error:", e1);
  console.log("SELECT First matched rows:", q1);
}

run();
