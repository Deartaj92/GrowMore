-- Migration: Disable row-level security on special_fines and remove policies

-- IMPORTANT: Review before running in production. This will disable RLS for the table and remove any policies.

ALTER TABLE public.special_fines
  DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'special_fines' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.special_fines;', r.policyname);
  END LOOP;
END$$;
