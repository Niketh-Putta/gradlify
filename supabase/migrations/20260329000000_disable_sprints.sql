-- Disable sprint logic globally to simplify leaderboards and ensure all practice counts.
CREATE OR REPLACE FUNCTION public.is_sprint_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false;
$$;

GRANT EXECUTE ON FUNCTION public.is_sprint_active() TO authenticated, anon;
