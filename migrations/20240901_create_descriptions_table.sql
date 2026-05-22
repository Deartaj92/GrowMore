-- Migration: Create descriptions table for special fines description management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- ensure UUID generation

CREATE TABLE IF NOT EXISTS public.descriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Optional: enable Row Level Security if your project uses it
-- ALTER TABLE public.descriptions ENABLE ROW LEVEL SECURITY;

-- Optional: add a policy to allow all authenticated users (adjust as needed)
-- CREATE POLICY "allow_all" ON public.descriptions FOR ALL USING (auth.role() <> 'anonymous');
