-- Migration: Add password column to students table for student authentication
ALTER TABLE students ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Set default password 'aa' for all existing students
UPDATE students SET password = 'aa' WHERE password IS NULL;

-- Optionally, make password non-nullable (after verifying all records have a value)
-- ALTER TABLE students ALTER COLUMN password SET NOT NULL;
