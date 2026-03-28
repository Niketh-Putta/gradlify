-- Study Plan sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  minutes INT NOT NULL,
  topic TEXT NOT NULL,           -- one of: Number, Algebra, Ratio & Proportion, Geometry & Measures, Probability, Statistics
  subtopic TEXT,                 -- optional subtopic name (Edexcel-aligned)
  goal TEXT,                     -- e.g. "Practice fraction decimals", "Past paper Qs: Indices"
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned' | 'done' | 'skipped'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner write" ON study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mock exam attempts & questions
CREATE TABLE IF NOT EXISTS mock_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,             -- 'mini' | 'topic' | 'full'
  title TEXT NOT NULL,            -- e.g. "Mini Mock (10 Q)", or "Topic Mock: Algebra"
  total_marks INT NOT NULL,
  score INT DEFAULT 0,
  duration_minutes INT DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'in_progress',  -- 'in_progress' | 'submitted' | 'scored'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mock_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON mock_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner write" ON mock_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS mock_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES mock_attempts(id) ON DELETE CASCADE,
  idx INT NOT NULL,                         -- 1..N
  topic TEXT NOT NULL,
  subtopic TEXT,
  prompt TEXT NOT NULL,                     -- markdown/KaTeX friendly
  marks INT NOT NULL DEFAULT 1,
  correct_answer JSONB,                     -- structured for auto-marking
  mark_scheme JSONB,                        -- array of marking bullets
  user_answer TEXT,                         -- raw user text
  awarded_marks INT DEFAULT 0
);

ALTER TABLE mock_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON mock_questions FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM mock_attempts WHERE id = attempt_id)
);
CREATE POLICY "owner write" ON mock_questions FOR ALL USING (
  auth.uid() = (SELECT user_id FROM mock_attempts WHERE id = attempt_id)
) WITH CHECK (
  auth.uid() = (SELECT user_id FROM mock_attempts WHERE id = attempt_id)
);