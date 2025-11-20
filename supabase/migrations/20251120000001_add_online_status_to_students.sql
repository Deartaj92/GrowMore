-- Migration: add_online_status_to_students
-- Date: 2025-11-20

-- Up -------------------------------------------------------------
ALTER TABLE students
ADD COLUMN IF NOT EXISTS last_online TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS app_version TEXT;

-- Down -----------------------------------------------------------
-- ALTER TABLE students
-- DROP COLUMN IF EXISTS app_version,
-- DROP COLUMN IF EXISTS is_online,
-- DROP COLUMN IF EXISTS last_online;
