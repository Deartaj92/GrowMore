-- Migration: add_online_status_to_families
-- Date: 2025-11-27

-- Add online status columns to families table
ALTER TABLE families
ADD COLUMN IF NOT EXISTS last_online TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS app_version TEXT;

