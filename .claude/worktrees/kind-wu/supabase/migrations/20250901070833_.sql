-- Fix function search path security issue
CREATE OR REPLACE FUNCTION upsert_subtopic_progress(p_topic_key text, p_subtopic_key text, p_score int)
RETURNS TABLE (user_id uuid, topic_key text, subtopic_key text, score int, last_updated timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  INSERT INTO subtopic_progress (user_id, topic_key, subtopic_key, score)
  VALUES (uid, p_topic_key, p_subtopic_key, p_score)
  ON CONFLICT (user_id, topic_key, subtopic_key) DO UPDATE SET
    score = EXCLUDED.score,
    last_updated = now();
  
  RETURN QUERY
    SELECT sp.user_id, sp.topic_key, sp.subtopic_key, sp.score, sp.last_updated
    FROM subtopic_progress sp
    WHERE sp.user_id = uid AND sp.topic_key = p_topic_key AND sp.subtopic_key = p_subtopic_key;
END $$;;
