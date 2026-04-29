CREATE OR REPLACE FUNCTION public.get_leaderboard_filler_profiles(
  p_track public.user_track,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  founder_track text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    COALESCE(p.full_name, split_part(u.email, '@', 1), 'Learner') AS name,
    p.avatar_url,
    p.founder_track
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE COALESCE(p.track, 'gcse'::public.user_track) = p_track
  ORDER BY md5(p.user_id::text || '-leaderboard-fill')
  LIMIT GREATEST(COALESCE(p_limit, 100), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_filler_profiles(public.user_track, integer) TO authenticated;
