-- Migration: Add parent targeting support to announcements table
-- This adds fields to support targeting announcements to parents/families

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS family_id BIGINT,
ADD COLUMN IF NOT EXISTS family_ids BIGINT[];

-- Add comment to document the purpose
COMMENT ON COLUMN public.announcements.family_id IS 'Target a specific parent family (for single parent targeting)';
COMMENT ON COLUMN public.announcements.family_ids IS 'Target multiple parent families (for multi parent targeting)';

-- Update audience_group to support 'parents' and 'all_users' (which includes students, staff, and parents)
-- Note: The constraint is not enforced at DB level, but the application will use these values:
-- 'students' | 'staff' | 'parents' | 'students_staff' | 'all_users'

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS announcements_family_idx ON public.announcements(family_id) WHERE family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS announcements_family_ids_idx ON public.announcements USING GIN(family_ids) WHERE family_ids IS NOT NULL;

