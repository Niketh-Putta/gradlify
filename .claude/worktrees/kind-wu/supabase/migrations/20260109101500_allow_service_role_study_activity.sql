-- Allow service_role inserts so the landing-page function can log anonymous visits
CREATE POLICY "allow service_role insert" ON public.study_activity
FOR INSERT
TO service_role
WITH CHECK (auth.role() = 'service_role');
