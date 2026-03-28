-- Enable Row Level Security on topic_catalog
ALTER TABLE public.topic_catalog ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read the topic catalog (it's static reference data)
CREATE POLICY "Anyone can view topic catalog" 
ON public.topic_catalog 
FOR SELECT 
USING (true);