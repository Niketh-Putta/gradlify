-- Create tracking mode enum
CREATE TYPE public.tracking_mode AS ENUM ('auto', 'manual');

-- User settings table
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking public.tracking_mode NOT NULL DEFAULT 'auto',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Practice results table
CREATE TABLE public.practice_results (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  correct integer NOT NULL CHECK (correct >= 0 AND correct <= attempts),
  difficulty text,
  session_id uuid,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  meta jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Topic readiness table
CREATE TABLE public.topic_readiness (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  readiness numeric(5,1) NOT NULL CHECK (readiness >= 0 AND readiness <= 100),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic)
);

-- Readiness history table (audit log)
CREATE TABLE public.readiness_history (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  readiness_before numeric(5,1),
  readiness_after numeric(5,1) NOT NULL,
  change numeric(6,1),
  reason text NOT NULL,
  source_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for practice_results
CREATE POLICY "Users can view their own practice results"
  ON public.practice_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice results"
  ON public.practice_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice results"
  ON public.practice_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice results"
  ON public.practice_results FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for topic_readiness
CREATE POLICY "Users can view their own readiness"
  ON public.topic_readiness FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readiness"
  ON public.topic_readiness FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own readiness"
  ON public.topic_readiness FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own readiness"
  ON public.topic_readiness FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for readiness_history (read-only for users)
CREATE POLICY "Users can view their own readiness history"
  ON public.readiness_history FOR SELECT
  USING (auth.uid() = user_id);

-- Recency factor function
CREATE OR REPLACE FUNCTION public.recency_factor(days_ago integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF days_ago <= 7 THEN
    RETURN 1.0;
  ELSIF days_ago <= 30 THEN
    RETURN 0.5;
  ELSE
    RETURN 0.2;
  END IF;
END;
$$;

-- Monthly sessions function
CREATE OR REPLACE FUNCTION public.monthly_sessions(p_user_id uuid, p_topic text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT session_id)::integer
  FROM practice_results
  WHERE user_id = p_user_id
    AND topic = p_topic
    AND created_at >= date_trunc('month', now())
    AND session_id IS NOT NULL;
$$;

-- Compute new readiness function
CREATE OR REPLACE FUNCTION public.compute_new_readiness(result_id bigint)
RETURNS TABLE(
  user_id uuid,
  topic text,
  previous_readiness numeric,
  new_readiness numeric,
  change numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_topic text;
  v_attempts integer;
  v_correct integer;
  v_created_at timestamp with time zone;
  v_accuracy numeric;
  v_recency numeric;
  v_consistency numeric;
  v_weighted numeric;
  v_prev_readiness numeric;
  v_new_readiness numeric;
  v_change numeric;
  v_days_ago integer;
  v_sessions integer;
BEGIN
  -- Get practice result data
  SELECT pr.user_id, pr.topic, pr.attempts, pr.correct, pr.created_at
  INTO v_user_id, v_topic, v_attempts, v_correct, v_created_at
  FROM practice_results pr
  WHERE pr.id = result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Result ID % not found', result_id;
  END IF;

  -- Get previous readiness (default to 0)
  SELECT tr.readiness INTO v_prev_readiness
  FROM topic_readiness tr
  WHERE tr.user_id = v_user_id AND tr.topic = v_topic;
  
  v_prev_readiness := COALESCE(v_prev_readiness, 0);

  -- Calculate accuracy
  v_accuracy := v_correct::numeric / v_attempts::numeric;

  -- Calculate recency
  v_days_ago := EXTRACT(day FROM now() - v_created_at)::integer;
  v_recency := recency_factor(v_days_ago);

  -- Calculate consistency
  v_sessions := monthly_sessions(v_user_id, v_topic);
  v_consistency := CASE WHEN v_sessions >= 4 THEN 1.0 ELSE 0.5 END;

  -- Calculate weighted score
  v_weighted := (v_accuracy * 0.7) + (v_recency * 0.2) + (v_consistency * 0.1);

  -- Calculate new readiness (60% previous, 40% new weighted)
  v_new_readiness := ROUND((0.6 * v_prev_readiness) + (0.4 * (v_weighted * 100)), 1);
  
  -- Ensure bounds
  v_new_readiness := GREATEST(0, LEAST(100, v_new_readiness));
  
  v_change := ROUND(v_new_readiness - v_prev_readiness, 1);

  RETURN QUERY SELECT v_user_id, v_topic, v_prev_readiness, v_new_readiness, v_change;
END;
$$;

-- Trigger function for automatic readiness updates
CREATE OR REPLACE FUNCTION public.practice_results_auto_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tracking tracking_mode;
  v_computed record;
BEGIN
  -- Check user's tracking mode
  SELECT tracking INTO v_tracking
  FROM user_settings
  WHERE user_id = NEW.user_id;
  
  -- Default to auto if no setting exists
  v_tracking := COALESCE(v_tracking, 'auto');

  -- Only process if auto mode
  IF v_tracking = 'auto' THEN
    -- Compute new readiness
    SELECT * INTO v_computed
    FROM compute_new_readiness(NEW.id);

    -- Upsert topic_readiness
    INSERT INTO topic_readiness (user_id, topic, readiness, updated_at)
    VALUES (v_computed.user_id, v_computed.topic, v_computed.new_readiness, now())
    ON CONFLICT (user_id, topic) DO UPDATE
      SET readiness = EXCLUDED.readiness,
          updated_at = EXCLUDED.updated_at;

    -- Insert readiness_history
    INSERT INTO readiness_history (
      user_id, topic, readiness_before, readiness_after, 
      change, reason, source_id, created_at
    ) VALUES (
      v_computed.user_id, v_computed.topic, v_computed.previous_readiness,
      v_computed.new_readiness, v_computed.change, 'auto:update', NEW.id, now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER practice_results_auto_update_trigger
  AFTER INSERT ON public.practice_results
  FOR EACH ROW
  EXECUTE FUNCTION public.practice_results_auto_update();

-- RPC: Set tracking mode
CREATE OR REPLACE FUNCTION public.set_tracking_mode(mode tracking_mode)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO user_settings (user_id, tracking, updated_at)
  VALUES (auth.uid(), mode, now())
  ON CONFLICT (user_id) DO UPDATE
    SET tracking = EXCLUDED.tracking,
        updated_at = EXCLUDED.updated_at;
END;
$$;

-- RPC: Manual set readiness
CREATE OR REPLACE FUNCTION public.manual_set_readiness(p_topic text, p_readiness numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_readiness numeric;
  v_change numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate readiness bounds
  IF p_readiness < 0 OR p_readiness > 100 THEN
    RAISE EXCEPTION 'Readiness must be between 0 and 100';
  END IF;

  -- Get previous readiness
  SELECT readiness INTO v_prev_readiness
  FROM topic_readiness
  WHERE user_id = auth.uid() AND topic = p_topic;
  
  v_prev_readiness := COALESCE(v_prev_readiness, 0);
  v_change := p_readiness - v_prev_readiness;

  -- Upsert topic_readiness
  INSERT INTO topic_readiness (user_id, topic, readiness, updated_at)
  VALUES (auth.uid(), p_topic, p_readiness, now())
  ON CONFLICT (user_id, topic) DO UPDATE
    SET readiness = EXCLUDED.readiness,
        updated_at = EXCLUDED.updated_at;

  -- Insert readiness_history
  INSERT INTO readiness_history (
    user_id, topic, readiness_before, readiness_after, 
    change, reason, created_at
  ) VALUES (
    auth.uid(), p_topic, v_prev_readiness, p_readiness, 
    v_change, 'manual:update', now()
  );
END;
$$;

-- RPC: Get readiness overview
CREATE OR REPLACE FUNCTION public.get_readiness_overview()
RETURNS TABLE(
  topic text,
  readiness numeric,
  last_updated timestamp with time zone,
  overall_average numeric,
  tracking_mode tracking_mode
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Calculate overall average
  SELECT COALESCE(ROUND(AVG(tr.readiness), 1), 0) INTO v_overall
  FROM topic_readiness tr
  WHERE tr.user_id = auth.uid();

  -- Return topic-level data with overall average
  RETURN QUERY
  SELECT 
    tr.topic,
    tr.readiness,
    tr.updated_at,
    v_overall AS overall_average,
    v_tracking AS tracking_mode
  FROM topic_readiness tr
  WHERE tr.user_id = auth.uid()
  ORDER BY tr.topic;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_practice_results_user_topic ON public.practice_results(user_id, topic);
CREATE INDEX idx_practice_results_created ON public.practice_results(created_at);
CREATE INDEX idx_practice_results_session ON public.practice_results(session_id);
CREATE INDEX idx_topic_readiness_user ON public.topic_readiness(user_id);
CREATE INDEX idx_readiness_history_user_topic ON public.readiness_history(user_id, topic);
CREATE INDEX idx_readiness_history_created ON public.readiness_history(created_at);;
