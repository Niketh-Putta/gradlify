import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { count, error } = await supabase
    .from("exam_questions")
    .select("*", { count: "exact", head: true })
    .eq("track", "11plus");
  console.log("Total 11plus:", count);
  
  const { data, error: err2 } = await supabase
    .from("exam_questions")
    .select("question_type")
    .eq("track", "11plus");
    
  if (data) {
     const split = {};
     data.forEach(d => {
       split[d.question_type] = (split[d.question_type] || 0) + 1;
     });
     console.log("Topic split:", split);
  }
}
run();
