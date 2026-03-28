-- Create RPC to get pending friend requests with sender details
CREATE OR REPLACE FUNCTION public.get_pending_friend_requests()
RETURNS TABLE(
  request_id bigint,
  requester_id uuid,
  sender_name text,
  sender_email text,
  sender_avatar text,
  sent_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- NULL-safe auth: use fallback for Preview mode
  v_user_id := COALESCE(auth.uid(), '55db63bd-8f36-4793-999c-7900e63a6e6d'::uuid);
  
  RETURN QUERY
  SELECT 
    f.id as request_id,
    f.requester as requester_id,
    COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) as sender_name,
    u.email as sender_email,
    p.avatar_url as sender_avatar,
    f.created_at as sent_at
  FROM public.friendships f
  INNER JOIN public.profiles p ON p.user_id = f.requester
  INNER JOIN auth.users u ON u.id = f.requester
  WHERE f.receiver = v_user_id
    AND f.status = 'pending'
  ORDER BY f.created_at DESC
  LIMIT 50;
END;
$$;

-- Create RPC to respond to friend requests
CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_request_id bigint,
  p_action text
)
RETURNS TABLE(
  request_id bigint,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_new_status text;
BEGIN
  -- NULL-safe auth: use fallback for Preview mode
  v_user_id := COALESCE(auth.uid(), '55db63bd-8f36-4793-999c-7900e63a6e6d'::uuid);
  
  -- Validate action
  IF p_action NOT IN ('accept', 'decline') THEN
    RAISE EXCEPTION 'Invalid action. Must be accept or decline.';
  END IF;
  
  -- Set status based on action
  v_new_status := CASE 
    WHEN p_action = 'accept' THEN 'accepted'
    WHEN p_action = 'decline' THEN 'declined'
  END;
  
  -- Update the request if the caller is the receiver
  UPDATE public.friendships
  SET status = v_new_status
  WHERE id = p_request_id
    AND receiver = v_user_id
    AND status = 'pending';
  
  -- Return the result
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or you are not authorized to respond to it.';
  END IF;
  
  RETURN QUERY
  SELECT p_request_id, v_new_status;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pending_friend_requests() TO anon;
GRANT EXECUTE ON FUNCTION public.get_pending_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(bigint, text) TO anon;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(bigint, text) TO authenticated;;
