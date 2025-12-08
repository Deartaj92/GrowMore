-- Migration: add_notification_channel_to_staff
-- Date: 2025-02-09
-- Description: Adds notification_channel column to staff table to allow staff to choose between WhatsApp and SMS notifications

-- Up -------------------------------------------------------------
DO $$
BEGIN
  -- Create enum type if it doesn't already exist (should already exist from students migration)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_channel'
  ) THEN
    CREATE TYPE notification_channel AS ENUM ('whatsapp', 'sms');
  END IF;
END$$;

-- Add column to staff table
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS notification_channel notification_channel NOT NULL DEFAULT 'whatsapp';

-- Down ------------------------------------------------------------
-- To rollback, drop the column (but not the type as it may be used by students table)
-- ALTER TABLE staff DROP COLUMN IF EXISTS notification_channel;

