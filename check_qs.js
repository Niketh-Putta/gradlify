import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function check() {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('topic, subtopic')
    .eq('track', '11plus')

  if (error) {
    console.error(error)
    return
  }
  
  const counts = {}
  for (const q of data) {
    const key = `${q.topic} -> ${q.subtopic}`
    counts[key] = (counts[key] || 0) + 1
  }
  
  console.log("Question counts in DB:")
  for (const [k, v] of Object.entries(counts)) {
    console.log(`${k}: ${v}`)
  }
}
check()
