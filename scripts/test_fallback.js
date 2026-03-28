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
  const topicList = ["Number & Arithmetic", "Algebra"];
  
  let fallbackQuery = supabase
    .from("exam_questions")
    .select("id, question, correct_answer, wrong_answers, all_answers, question_type, subtopic, difficulty, marks, estimated_time_sec, tier, calculator, image_url, image_alt, explanation");
  
  fallbackQuery = dbTier.length === 1 ? fallbackQuery.eq("tier", dbTier[0]) : fallbackQuery.in("tier", dbTier);
  fallbackQuery = dbCalculator.length === 1 ? fallbackQuery.eq("calculator", dbCalculator[0]) : fallbackQuery.in("calculator", dbCalculator);

  if (topicList && topicList.length === 1) fallbackQuery = fallbackQuery.eq("question_type", topicList[0]);
  else if (topicList && topicList.length > 1) fallbackQuery = fallbackQuery.in("question_type", topicList);
  
  fallbackQuery = fallbackQuery.eq("track", "11plus");
  
  const excludeIds = ["a06bf969-62fe-4bbf-a51b-9630a040a660"];
  if (excludeIds.length > 0) {
    const quotedIds = excludeIds.map((id) => `"${id}"`).join(',');
    fallbackQuery = fallbackQuery.not("id", "in", `(${quotedIds})`);
  }

  const result = await fallbackQuery.limit(36);
  console.log("Error:", result.error);
  console.log("Data count:", result.data ? result.data.length : null);
}
run();
