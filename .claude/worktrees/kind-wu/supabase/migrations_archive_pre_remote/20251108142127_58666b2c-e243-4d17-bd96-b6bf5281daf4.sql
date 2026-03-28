
-- Enable realtime for readiness_history table
ALTER TABLE public.readiness_history REPLICA IDENTITY FULL;

-- Add readiness_history to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.readiness_history;
