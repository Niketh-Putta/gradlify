-- Grant admin role to teacher_test@gradlify.com
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id for the email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'teacher_test@gradlify.com';

  -- If user exists, insert admin role (if not already exists)
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user %', v_user_id;
  ELSE
    RAISE NOTICE 'User with email teacher_test@gradlify.com not found';
  END IF;
END $$;