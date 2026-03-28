-- Insert admin role for niketh13putta@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('55db63bd-8f36-4793-999c-7900e63a6e6d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;