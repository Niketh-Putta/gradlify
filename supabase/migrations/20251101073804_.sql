-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_auto_readiness_from_mock ON mock_attempts;
DROP FUNCTION IF EXISTS auto_readiness_from_mock();

-- Create improved function that maps mock results to canonical GCSE topics
CREATE OR REPLACE FUNCTION auto_readiness_from_mock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_topic text;
  v_before numeric := 0;
  v_after numeric := 0;
  v_topic_marks numeric := 0;
  v_topic_awarded numeric := 0;
  v_score_pct numeric := 0;
  topic_rec record;
BEGIN
  -- Only run when a mock is completed
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed') THEN

    -- Loop through each canonical topic and calculate readiness
    FOR topic_rec IN 
      SELECT 
        mq.topic,
        SUM(mq.marks) as total_marks,
        SUM(mq.awarded_marks) as total_awarded
      FROM mock_questions mq
      WHERE mq.attempt_id = NEW.id
        AND mq.topic IS NOT NULL
        AND mq.topic IN ('Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics')
      GROUP BY mq.topic
      HAVING SUM(mq.marks) > 0
    LOOP
      v_topic := topic_rec.topic;
      v_topic_marks := topic_rec.total_marks;
      v_topic_awarded := topic_rec.total_awarded;
      
      -- Calculate percentage for this topic
      v_score_pct := (v_topic_awarded / v_topic_marks) * 100;
      
      -- Get last readiness for this topic
      SELECT readiness INTO v_before
      FROM public.v_topic_readiness
      WHERE user_id = NEW.user_id AND topic = v_topic
      ORDER BY created_at DESC
      LIMIT 1;
      
      v_before := COALESCE(v_before, 0);
      
      -- Blend: 60% new score, 40% previous
      v_after := ROUND(0.6 * v_score_pct + 0.4 * v_before, 1);
      
      -- Log the change for this topic
      INSERT INTO public.readiness_history(
        user_id, topic, readiness_before, readiness_after, reason, source_id
      ) VALUES (
        NEW.user_id, v_topic, v_before, v_after, 'mock', NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trg_auto_readiness_from_mock
  AFTER INSERT OR UPDATE ON mock_attempts
  FOR EACH ROW
  EXECUTE FUNCTION auto_readiness_from_mock();

COMMENT ON FUNCTION auto_readiness_from_mock IS 'Updates readiness per canonical topic based on mock question results';;
