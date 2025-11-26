-- Add family_recipient_id column to notifications table to support parent/family notifications
-- This allows notifications to be sent directly to families without requiring a user account

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS family_recipient_id INTEGER REFERENCES families(id) ON DELETE CASCADE;

-- Make recipient_id nullable to support family-only notifications
ALTER TABLE public.notifications 
ALTER COLUMN recipient_id DROP NOT NULL;

-- Create index for faster family notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_family_recipient_id ON public.notifications(family_recipient_id);

-- Add check constraint to ensure at least one recipient is specified
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_recipient_check 
CHECK (recipient_id IS NOT NULL OR family_recipient_id IS NOT NULL);

-- Add comment to document the purpose
COMMENT ON COLUMN public.notifications.family_recipient_id IS 'Links notifications directly to parent families for leave request notifications and other family-specific notifications';

