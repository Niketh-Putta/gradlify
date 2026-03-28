-- Create table to track AI inference requests for rate limiting
CREATE TABLE IF NOT EXISTS public.ai_inference_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  question_length integer NOT NULL
);

-- Create index for efficient rate limit queries
CREATE INDEX idx_ai_inference_requests_user_time 
  ON public.ai_inference_requests(user_id, requested_at DESC);

-- Enable RLS
ALTER TABLE public.ai_inference_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
  ON public.ai_inference_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (used by edge function)
CREATE POLICY "Service role can insert requests"
  ON public.ai_inference_requests
  FOR INSERT
  WITH CHECK (true);

-- Auto-cleanup function to remove old requests (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_inference_requests
  WHERE requested_at < now() - interval '1 hour';
END;
$$;;
