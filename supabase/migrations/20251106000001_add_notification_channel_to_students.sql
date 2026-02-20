-- Migration: add_notification_channel_to_students
-- Date: 2025-11-06

-- Up -------------------------------------------------------------
DO $$
BEGIN
  -- Create enum type if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_channel'
  ) THEN
    CREATE TYPE notification_channel AS ENUM ('whatsapp', 'sms');
  END IF;
END$$;

-- Add column to students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS notification_channel notification_channel NOT NULL DEFAULT 'whatsapp';

-- Down ------------------------------------------------------------
-- To rollback, drop the column and type (if no longer used)
-- Note: Dropping the type will fail if other columns depend on it.
-- Execute cautiously in non-production environments.

-- ALTER TABLE students DROP COLUMN IF EXISTS notification_channel;
-- DROP TYPE IF EXISTS notification_channel;



