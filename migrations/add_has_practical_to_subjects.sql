-- Migration: Add has_practical column to subjects table
-- This migration adds a boolean field to track if a subject has practical components

-- Add the has_practical column to the subjects table
ALTER TABLE subjects 
ADD COLUMN has_practical BOOLEAN DEFAULT FALSE NOT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN subjects.has_practical IS 'Indicates whether the subject includes practical/lab work components';

-- Optional: Update existing subjects that might have practical components
-- You can uncomment and modify these based on your existing data
-- UPDATE subjects SET has_practical = TRUE WHERE name ILIKE '%science%' OR name ILIKE '%chemistry%' OR name ILIKE '%physics%' OR name ILIKE '%computer%' OR name ILIKE '%lab%';

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subjects' AND column_name = 'has_practical';
