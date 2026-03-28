import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envStr = fs.readFileSync(".env", "utf-8");
const env = {};
envStr.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const dbTier = ["11+ Standard"];
  const dbCalculator = ["Non-Calculator"];
  const topicList = ["Number & Arithmetic", "Algebra & Ratio"];
  
  let query = supabase
    .from("exam_questions")
    .select("id, question_type, tier")
    .eq("tier", dbTier[0])
    .eq("calculator", dbCalculator[0])
    .in("question_type", topicList)
    .eq("track", "11plus");
    
  const { data, error, status, statusText } = await query.limit(5);
  console.log("Status:", status, statusText);
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : "null");
  console.log("Data:", data);
}

run();
