-- Fix get_readiness_overview to calculate overall average from all topics in readiness_history
CREATE OR REPLACE FUNCTION public.get_readiness_overview()
 RETURNS TABLE(topic text, readiness numeric, last_updated timestamp with time zone, overall_average numeric, tracking_mode tracking_mode)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tracking tracking_mode;
  v_overall numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's tracking mode
  SELECT us.tracking INTO v_tracking
  FROM user_settings us
  WHERE us.user_id = auth.uid();
  
  v_tracking := COALESCE(v_tracking, 'auto');

  -- Calculate overall average from latest readiness per topic in readiness_history
  WITH latest_per_topic AS (
    SELECT DISTINCT ON (rh.topic)
      rh.topic,
      rh.readiness_after as readiness
    FROM readiness_history rh
    WHERE rh.user_id = auth.uid()
    ORDER BY rh.topic, rh.created_at DESC
  )
  SELECT COALESCE(ROUND(AVG(lpt.readiness), 1), 0) INTO v_overall
  FROM latest_per_topic lpt;

  -- Return topic-level data with overall average from latest readiness_history
  RETURN QUERY
  WITH latest_per_topic AS (
    SELECT DISTINCT ON (rh.topic)
      rh.topic,
      rh.readiness_after as readiness,
      rh.created_at as last_updated
    FROM readiness_history rh
    WHERE rh.user_id = auth.uid()
    ORDER BY rh.topic, rh.created_at DESC
  )
  SELECT 
    lpt.topic,
    lpt.readiness,
    lpt.last_updated,
    v_overall AS overall_average,
    v_tracking AS tracking_mode
  FROM latest_per_topic lpt
  ORDER BY lpt.topic;
END;
$function$;