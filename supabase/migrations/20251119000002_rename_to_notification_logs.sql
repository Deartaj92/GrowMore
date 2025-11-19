-- Migration: rename_attendance_logs_to_notification_logs
-- Date: 2025-11-19

-- Up -------------------------------------------------------------

-- 1. Rename the table
ALTER TABLE IF EXISTS attendance_notification_logs RENAME TO notification_logs;

-- 2. Rename the unique index
ALTER INDEX IF EXISTS attendance_notification_logs_unique RENAME TO notification_logs_unique;

-- 3. Update the trigger and function names for consistency
-- Drop the old trigger (it is attached to the table, so we use the new table name if the rename happened, or we can just drop it by name on the new table)
DROP TRIGGER IF EXISTS trg_attendance_notification_logs_updated_at ON notification_logs;

-- Drop the old function
DROP FUNCTION IF EXISTS update_attendance_notification_logs_updated_at();

-- Create the new function
CREATE OR REPLACE FUNCTION update_notification_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger
CREATE TRIGGER trg_notification_logs_updated_at
  BEFORE UPDATE ON notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_logs_updated_at();

-- Down -----------------------------------------------------------
-- Revert changes
-- DROP TRIGGER IF EXISTS trg_notification_logs_updated_at ON notification_logs;
-- DROP FUNCTION IF EXISTS update_notification_logs_updated_at();
-- ALTER INDEX IF EXISTS notification_logs_unique RENAME TO attendance_notification_logs_unique;
-- ALTER TABLE IF EXISTS notification_logs RENAME TO attendance_notification_logs;
-- -- Restore old trigger/function...
