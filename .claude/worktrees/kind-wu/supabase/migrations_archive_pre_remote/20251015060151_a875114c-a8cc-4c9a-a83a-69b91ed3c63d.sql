-- Add DELETE policy for subtopic_progress table
-- Users should be able to delete their own progress records

CREATE POLICY "delete_own_progress"
ON public.subtopic_progress
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);