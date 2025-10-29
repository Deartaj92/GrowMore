-- Add total_marks column to class_subjects table
-- This allows different classes to have different total marks for the same subject

-- Add the column with a default value of 100
ALTER TABLE class_subjects 
ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 100;

-- Add a check constraint to ensure marks are positive
ALTER TABLE class_subjects 
ADD CONSTRAINT check_total_marks_positive 
CHECK (total_marks > 0);

-- Update existing records to have default marks if they don't have any
UPDATE class_subjects 
SET total_marks = 100 
WHERE total_marks IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE class_subjects 
ALTER COLUMN total_marks SET NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN class_subjects.total_marks IS 'Total marks for this subject in this class (can vary by class)';
