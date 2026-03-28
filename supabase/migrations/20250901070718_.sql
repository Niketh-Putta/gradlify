-- Add unique constraint for subtopic progress using correct column names
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subtopic_progress_user_subtopic_unique'
    ) THEN
        ALTER TABLE subtopic_progress 
        ADD CONSTRAINT subtopic_progress_user_subtopic_unique 
        UNIQUE (user_id, topic_key, subtopic_key);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE subtopic_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "read own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "upsert own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "update own progress" ON subtopic_progress;

-- Create new policies
CREATE POLICY "read own progress"
ON subtopic_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "upsert own progress"
ON subtopic_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own progress"
ON subtopic_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Create stable upsert function using correct column structure
CREATE OR REPLACE FUNCTION upsert_subtopic_progress(p_topic_key text, p_subtopic_key text, p_score int)
RETURNS TABLE (user_id uuid, topic_key text, subtopic_key text, score int, last_updated timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  INSERT INTO subtopic_progress (user_id, topic_key, subtopic_key, score, last_updated)
  VALUES (uid, p_topic_key, p_subtopic_key, p_score, now())
  ON CONFLICT (user_id, topic_key, subtopic_key) DO UPDATE SET
    score = EXCLUDED.score,
    last_updated = now();
  
  RETURN QUERY
    SELECT sp.user_id, sp.topic_key, sp.subtopic_key, sp.score, sp.last_updated
    FROM subtopic_progress sp
    WHERE sp.user_id = uid AND sp.topic_key = p_topic_key AND sp.subtopic_key = p_subtopic_key;
END $$;;
