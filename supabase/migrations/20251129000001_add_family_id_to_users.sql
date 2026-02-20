-- Add family_id column to users table to link parent families to user accounts
-- This enables parents to receive notifications via their linked user accounts

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);

-- Add comment to document the purpose
COMMENT ON COLUMN public.users.family_id IS 'Links parent families to user accounts for notification purposes';

