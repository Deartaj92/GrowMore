-- Add is_read column to leave_requests, complaints, and suggestions tables
-- This allows tracking which items have been read by administrators

-- Add is_read to leave_requests table
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Add is_read to complaints table
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Add is_read to suggestions table
ALTER TABLE suggestions
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_is_read ON leave_requests(school_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_complaints_is_read ON complaints(school_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_suggestions_is_read ON suggestions(school_id, is_read) WHERE is_read = false;
