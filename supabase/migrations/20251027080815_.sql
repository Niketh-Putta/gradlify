-- Create a read-only view that safely exposes public profile information
CREATE OR REPLACE VIEW public.connect_public_profiles AS
SELECT 
  p.user_id,
  COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) as name,
  u.email,
  p.avatar_url,
  p.created_at
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.user_id;

-- Create a SECURITY DEFINER RPC for searching profiles
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
  -- Return top 20 matching users, excluding the current user
  RETURN QUERY
  SELECT 
    cpp.user_id,
    cpp.name,
    cpp.email,
    cpp.avatar_url,
    cpp.created_at
  FROM public.connect_public_profiles cpp
  WHERE cpp.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      cpp.name ILIKE '%' || q || '%' 
      OR cpp.email ILIKE '%' || q || '%'
    )
  ORDER BY cpp.created_at DESC
  LIMIT 20;
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;;
