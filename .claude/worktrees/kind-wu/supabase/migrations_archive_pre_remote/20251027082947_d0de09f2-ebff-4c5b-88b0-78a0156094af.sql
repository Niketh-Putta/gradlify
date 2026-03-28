-- Fix search_profiles to use NULL-safe comparison for Preview mode
CREATE OR REPLACE FUNCTION public.search_profiles(q text)
RETURNS TABLE(
  user_id uuid,
  name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) as name,
    u.email,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id IS DISTINCT FROM auth.uid()
    AND (
      COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) ILIKE '%' || q || '%' 
      OR u.email ILIKE '%' || q || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;