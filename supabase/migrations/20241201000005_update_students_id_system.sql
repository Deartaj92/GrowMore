-- Migration to update students table for school-specific IDs
-- Step 1: Drop the existing primary key constraint
ALTER TABLE students DROP CONSTRAINT students_pkey;

-- Step 2: Change the id column from SERIAL to INTEGER
ALTER TABLE students ALTER COLUMN id TYPE INTEGER;
ALTER TABLE students ALTER COLUMN id DROP DEFAULT;

-- Step 3: Add the new primary key constraint
ALTER TABLE students ADD CONSTRAINT students_pkey PRIMARY KEY (id, school_id);

-- Step 4: Add unique constraint for school-specific student IDs
ALTER TABLE students ADD CONSTRAINT students_id_school_unique UNIQUE(id, school_id);

-- Step 5: Create function to get next student ID for a school
CREATE OR REPLACE FUNCTION get_next_student_id(school_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the highest existing student ID for this school
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id
  FROM students 
  WHERE students.school_id = get_next_student_id.school_id;
  
  RETURN next_id;
END;
$$ LANGUAGE plpgsql; 