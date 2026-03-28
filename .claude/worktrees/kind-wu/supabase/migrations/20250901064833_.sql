-- Ensure unique progress per user/subtopic + fast reads
CREATE UNIQUE INDEX IF NOT EXISTS uq_progress_user_subtopic
  ON subtopic_progress(user_id, topic_key, subtopic_key);

CREATE INDEX IF NOT EXISTS idx_progress_user_updated
  ON subtopic_progress(user_id, last_updated DESC);

-- Row Level Security (drop existing policies first to avoid conflicts)
DROP POLICY IF EXISTS "own_read" ON subtopic_progress;
DROP POLICY IF EXISTS "own_update" ON subtopic_progress;
DROP POLICY IF EXISTS "own_upsert" ON subtopic_progress;

-- Create comprehensive policy for all operations
CREATE POLICY "User can manage own progress"
ON subtopic_progress FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());;
