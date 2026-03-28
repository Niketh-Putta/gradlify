
-- Enable RLS on the backup table
ALTER TABLE public.exam_questions_backup_2025_11_19 ENABLE ROW LEVEL SECURITY;

-- Add restrictive policy (only service role can access backup tables)
CREATE POLICY "Only service role can access backup"
ON public.exam_questions_backup_2025_11_19
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
;
