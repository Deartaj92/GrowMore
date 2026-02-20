-- ALTER TABLE QUERIES FOR EXISTING EXAMINATIONS TABLE
-- Use these queries if you already have the examinations table and need to modify it
-- Run these queries in order to update your existing database schema

-- 1. Add passing_marks column to existing examinations table
ALTER TABLE examinations 
ADD COLUMN IF NOT EXISTS passing_marks DECIMAL(5,2) DEFAULT 40.00;

-- 2. Add constraint for passing_marks range (0-100%)
-- First, try to drop the constraint if it exists (ignore error if it doesn't exist)
ALTER TABLE examinations DROP CONSTRAINT IF EXISTS check_passing_marks_range;

-- Then add the constraint
ALTER TABLE examinations 
ADD CONSTRAINT check_passing_marks_range 
CHECK (passing_marks >= 0 AND passing_marks <= 100);

-- 3. Remove weightage column from examinations table (if it exists)
ALTER TABLE examinations 
DROP COLUMN IF EXISTS weightage;

-- 4. Remove weightage column from exam_subjects table (if it exists)
ALTER TABLE exam_subjects 
DROP COLUMN IF EXISTS weightage;

-- 5. Update existing examinations to have default passing marks if NULL
UPDATE examinations 
SET passing_marks = 40.00 
WHERE passing_marks IS NULL;

-- 6. Optional: Update existing examinations with specific passing marks based on exam type
-- You can customize these values according to your school's requirements
UPDATE examinations 
SET passing_marks = 50.00 
WHERE exam_type = 'Final' AND passing_marks = 40.00;

UPDATE examinations 
SET passing_marks = 35.00 
WHERE exam_type = 'Monthly Test' AND passing_marks = 40.00;

UPDATE examinations 
SET passing_marks = 30.00 
WHERE exam_type = 'Quiz' AND passing_marks = 40.00;

-- 7. Verify the changes
SELECT 
    id, 
    name, 
    exam_type, 
    passing_marks,
    status 
FROM examinations 
ORDER BY id;
