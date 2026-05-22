-- Migration: Add school_id column to specialfines_descriptions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.specialfines_descriptions
  ADD COLUMN IF NOT EXISTS school_id integer;

-- Optionally, you could add a foreign key constraint if the schools table exists:
-- ALTER TABLE public.specialfines_descriptions
--   ADD CONSTRAINT fk_specialfines_descriptions_school
--   FOREIGN KEY (school_id) REFERENCES public.schools(id);
