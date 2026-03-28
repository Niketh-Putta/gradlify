-- Add unique constraint for subtopic progress (handle existing constraint gracefully)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subtopic_progress_user_subtopic_unique'
    ) THEN
        ALTER TABLE subtopic_progress 
        ADD CONSTRAINT subtopic_progress_user_subtopic_unique 
        UNIQUE (user_id, subtopic_id);
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

-- Create stable upsert function
CREATE OR REPLACE FUNCTION upsert_subtopic_progress(p_subtopic_id uuid, p_score int)
RETURNS TABLE (user_id uuid, subtopic_id uuid, score int, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  INSERT INTO subtopic_progress (user_id, subtopic_id, score)
  VALUES (uid, p_subtopic_id, p_score)
  ON CONFLICT (user_id, subtopic_id) DO UPDATE SET
    score = EXCLUDED.score,
    updated_at = now();
  
  RETURN QUERY
    SELECT sp.user_id, sp.subtopic_id, sp.score, sp.updated_at
    FROM subtopic_progress sp
    WHERE sp.user_id = uid AND sp.subtopic_id = p_subtopic_id;
END $$;