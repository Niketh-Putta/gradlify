-- 1. Update subtopic_progress table structure
-- First ensure we have the right columns (subtopic_id instead of separate topic_key/subtopic_key)
ALTER TABLE subtopic_progress DROP CONSTRAINT IF EXISTS subtopic_progress_user_subtopic_unique;

-- Add subtopic_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subtopic_progress' AND column_name = 'subtopic_id') THEN
        ALTER TABLE subtopic_progress ADD COLUMN subtopic_id uuid;
        
        -- Migrate existing data: create UUIDs from topic_key.subtopic_key combinations
        UPDATE subtopic_progress 
        SET subtopic_id = gen_random_uuid()
        WHERE subtopic_id IS NULL;
        
        -- Make subtopic_id not null
        ALTER TABLE subtopic_progress ALTER COLUMN subtopic_id SET NOT NULL;
    END IF;
END $$;

-- Add unique constraint
ALTER TABLE subtopic_progress 
ADD CONSTRAINT subtopic_progress_user_subtopic_unique UNIQUE (user_id, subtopic_id);

-- Drop old RLS policies if they exist
DROP POLICY IF EXISTS "User can manage own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "read own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "upsert own progress" ON subtopic_progress;
DROP POLICY IF EXISTS "update own progress" ON subtopic_progress;

-- Create new RLS policies
CREATE POLICY "read own" ON subtopic_progress 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own" ON subtopic_progress 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own" ON subtopic_progress 
FOR UPDATE USING (auth.uid() = user_id);

-- Create stable upsert function
CREATE OR REPLACE FUNCTION upsert_subtopic_progress(p_subtopic_id uuid, p_score int)
RETURNS TABLE (subtopic_id uuid, score int, updated_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO subtopic_progress (user_id, subtopic_id, score)
  VALUES (auth.uid(), p_subtopic_id, p_score)
  ON CONFLICT (user_id, subtopic_id) DO UPDATE
    SET score = EXCLUDED.score, updated_at = now();
    
  RETURN QUERY
    SELECT sp.subtopic_id, sp.score, sp.updated_at
    FROM subtopic_progress sp
    WHERE sp.user_id = auth.uid() AND sp.subtopic_id = p_subtopic_id;
END $$;