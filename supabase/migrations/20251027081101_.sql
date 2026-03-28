-- Drop the view that exposes auth.users
DROP VIEW IF EXISTS public.connect_public_profiles;

-- Update the RPC to query tables directly (safer approach)
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
  -- Query auth.users safely within the SECURITY DEFINER function
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) as name,
    u.email,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) ILIKE '%' || q || '%' 
      OR u.email ILIKE '%' || q || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT 20;
END;
$$;

-- Ensure execute permissions are granted
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;;
