-- Add password column to families table for family authentication
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'aa';

-- Set default password 'aa' for all existing families that don't have a password
UPDATE public.families SET password = 'aa' WHERE password IS NULL;
