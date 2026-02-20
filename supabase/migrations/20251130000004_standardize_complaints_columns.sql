-- Standardize complaints table columns to match suggestions table
-- Rename resolved_by, resolved_at, resolution_notes to reviewed_by, reviewed_at, review_notes

-- Add new columns
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Migrate data from old columns to new columns
UPDATE complaints
SET 
  reviewed_by = resolved_by,
  reviewed_at = resolved_at,
  review_notes = resolution_notes
WHERE resolved_by IS NOT NULL OR resolved_at IS NOT NULL OR resolution_notes IS NOT NULL;

-- Drop old columns
ALTER TABLE complaints
  DROP COLUMN IF EXISTS resolved_by,
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS resolution_notes;

-- Create index for reviewed_by
CREATE INDEX IF NOT EXISTS idx_complaints_reviewed_by ON complaints(reviewed_by);


