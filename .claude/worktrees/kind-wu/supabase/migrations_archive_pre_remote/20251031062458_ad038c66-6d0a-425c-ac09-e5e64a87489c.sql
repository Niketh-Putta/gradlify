-- Add auto_readiness column to user_settings if not exists
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS auto_readiness boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_settings.auto_readiness IS 'Controls whether AI automatically updates readiness scores based on practice/mock performance';