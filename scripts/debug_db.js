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
  const { data, error } = await supabase.from("exam_questions")
    .select("track, tier, calculator, question_type, subtopic, difficulty")
    .eq("track", "11plus")
    .limit(10);
  console.log("DB Sample 11plus rows:", data);
  console.log("Error:", error);
}

run();
