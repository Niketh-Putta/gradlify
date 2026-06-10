-- Protein Tracker: profiles, meal logs, scan feedback, RLS, founder unlimited scans

CREATE TABLE IF NOT EXISTS public.protein_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  daily_goal_g numeric(6, 2) NOT NULL DEFAULT 150 CHECK (daily_goal_g >= 50 AND daily_goal_g <= 400),
  weight_kg numeric(5, 2) CHECK (weight_kg IS NULL OR (weight_kg >= 30 AND weight_kg <= 300)),
  activity_level text NOT NULL DEFAULT 'moderate'
    CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'athlete')),
  is_premium boolean NOT NULL DEFAULT false,
  unlimited_scans boolean NOT NULL DEFAULT false,
  streak_count integer NOT NULL DEFAULT 0 CHECK (streak_count >= 0),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protein_meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  food_name text NOT NULL,
  food_category text,
  portion_g numeric(8, 2) CHECK (portion_g IS NULL OR portion_g >= 0),
  protein_g numeric(8, 2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  confidence numeric(4, 3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  is_food boolean NOT NULL DEFAULT true,
  image_url text,
  ai_raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protein_scan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  meal_log_id uuid REFERENCES public.protein_meal_logs (id) ON DELETE SET NULL,
  corrected_food_name text,
  corrected_protein_g numeric(8, 2) CHECK (corrected_protein_g IS NULL OR corrected_protein_g >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS protein_meal_logs_user_created_idx
  ON public.protein_meal_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS protein_scan_feedback_user_created_idx
  ON public.protein_scan_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS protein_scan_feedback_meal_log_idx
  ON public.protein_scan_feedback (meal_log_id);

CREATE OR REPLACE FUNCTION public.protein_profiles_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protein_profiles_updated_at ON public.protein_profiles;
CREATE TRIGGER protein_profiles_updated_at
  BEFORE UPDATE ON public.protein_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protein_profiles_set_updated_at();

-- Founder / premium unlimited scan gate (used by edge functions and client)
CREATE OR REPLACE FUNCTION public.protein_user_has_unlimited_scans(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pp.unlimited_scans OR pp.is_premium
      FROM public.protein_profiles pp
      WHERE pp.user_id = p_user_id
    ),
    (
      SELECT lower(u.email) = 'nikhath13@gmail.com'
      FROM auth.users u
      WHERE u.id = p_user_id
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.protein_user_has_unlimited_scans(uuid) TO authenticated;

-- Grant founder unlimited scans + premium
INSERT INTO public.protein_profiles (user_id, daily_goal_g, is_premium, unlimited_scans)
SELECT id, 150, true, true
FROM auth.users
WHERE lower(email) = 'nikhath13@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET is_premium = true,
    unlimited_scans = true,
    updated_at = now();

ALTER TABLE public.protein_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protein_meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protein_scan_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own protein profile" ON public.protein_profiles;
CREATE POLICY "Users can view their own protein profile"
ON public.protein_profiles FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own protein profile" ON public.protein_profiles;
CREATE POLICY "Users can insert their own protein profile"
ON public.protein_profiles FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own protein profile" ON public.protein_profiles;
CREATE POLICY "Users can update their own protein profile"
ON public.protein_profiles FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own protein meal logs" ON public.protein_meal_logs;
CREATE POLICY "Users can view their own protein meal logs"
ON public.protein_meal_logs FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own protein meal logs" ON public.protein_meal_logs;
CREATE POLICY "Users can insert their own protein meal logs"
ON public.protein_meal_logs FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own protein meal logs" ON public.protein_meal_logs;
CREATE POLICY "Users can update their own protein meal logs"
ON public.protein_meal_logs FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own protein meal logs" ON public.protein_meal_logs;
CREATE POLICY "Users can delete their own protein meal logs"
ON public.protein_meal_logs FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own protein scan feedback" ON public.protein_scan_feedback;
CREATE POLICY "Users can view their own protein scan feedback"
ON public.protein_scan_feedback FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own protein scan feedback" ON public.protein_scan_feedback;
CREATE POLICY "Users can insert their own protein scan feedback"
ON public.protein_scan_feedback FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.protein_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protein_meal_logs TO authenticated;
GRANT SELECT, INSERT ON public.protein_scan_feedback TO authenticated;
