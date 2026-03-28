-- Fix the subtopic_progress table for persistence hotfix
-- Work with existing structure and add what's needed

-- Drop existing constraints if they exist
ALTER TABLE subtopic_progress DROP CONSTRAINT IF EXISTS subtopic_progress_user_subtopic_unique;

-- Add unique constraint on existing columns (user_id, topic_key, subtopic_key)
ALTER TABLE subtopic_progress 
ADD CONSTRAINT subtopic_progress_user_subtopic_unique UNIQUE (user_id, topic_key, subtopic_key);

-- Drop old RLS policies if they exist
DROP POLICY IF EXISTS "User can manage own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "read own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "upsert own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "update own progress" ON subtopic_progress;

-- Create new simplified RLS policies
CREATE POLICY "read own" ON subtopic_progress 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own" ON subtopic_progress 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own" ON subtopic_progress 
FOR UPDATE USING (auth.uid() = user_id);

-- Create stable upsert function that works with existing structure
CREATE OR REPLACE FUNCTION upsert_subtopic_progress(p_topic_key text, p_subtopic_key text, p_score int)
RETURNS TABLE (topic_key text, subtopic_key text, score int, updated_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO subtopic_progress (user_id, topic_key, subtopic_key, score)
  VALUES (auth.uid(), p_topic_key, p_subtopic_key, p_score)
  ON CONFLICT (user_id, topic_key, subtopic_key) DO UPDATE
    SET score = EXCLUDED.score,
        last_updated = now();
    
  RETURN QUERY
    SELECT sp.topic_key, sp.subtopic_key, sp.score, sp.last_updated as updated_at
    FROM subtopic_progress sp
    WHERE sp.user_id = auth.uid() 
      AND sp.topic_key = p_topic_key 
      AND sp.subtopic_key = p_subtopic_key;
END $$;