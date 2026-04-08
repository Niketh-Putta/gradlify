-- Fix for publicly accessible table security vulnerability reported by Supabase Advisor
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to support_requests" ON public.support_requests;
CREATE POLICY "Allow public insert to support_requests"
ON public.support_requests
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admins to read support_requests" ON public.support_requests;
CREATE POLICY "Allow admins to read support_requests"
ON public.support_requests
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) = true);
