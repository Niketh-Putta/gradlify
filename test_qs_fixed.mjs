import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(url, key)

async function test() {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('id, question, image_url')
    .ilike('question', '%Find the surface area of a cube%')
    .limit(1)

  console.log(data, error)
}
test()
